import { useEffect, useMemo, useState } from "react";
import { Ban, Eye, FileText, RefreshCw, X } from "lucide-react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where
} from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import useAuth from "../../hooks/useAuth";
import { db } from "../../services/firebase/firebaseConfig";
import { anularVenta, listarVentas } from "../../services/ventaService";
import { registrarAuditoria } from "../../services/auditService";
import AdvancedFilterBar from "../../components/filters/AdvancedFilterBar";

const dateOf = (v) => v?.toDate?.() || (v ? new Date(v) : null);

export default function VentasPage() {
  const { usuario } = useAuth();
  const [rows, setRows] = useState([]);
  const [clientes, setClientes] = useState({});
  const [detalles, setDetalles] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("TODOS");
  const [method, setMethod] = useState("TODOS");
  const [clientFilter, setClientFilter] = useState("TODOS");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [minTotal, setMinTotal] = useState("");
  const [maxTotal, setMaxTotal] = useState("");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!usuario?.empresaId) return;
    setLoading(true);
    const [ventas, cs, ds] = await Promise.all([
      listarVentas(usuario.empresaId),
      getDocs(query(collection(db, "clientes"), where("empresaId", "==", usuario.empresaId))),
      getDocs(query(collection(db, "detalleVentas"), where("empresaId", "==", usuario.empresaId)))
    ]);
    setRows(ventas);
    setClientes(Object.fromEntries(cs.docs.map((d) => [d.id, { id: d.id, ...d.data() }])));
    setDetalles(ds.docs.map((d) => ({ id: d.id, ...d.data() })));
    setLoading(false);
  };

  useEffect(() => { load().catch(console.error); }, [usuario?.empresaId]);

  const filtered = useMemo(() => rows.filter((r) => {
    const q = search.toLowerCase();
    const client = clientes[r.clienteId];
    const searchOk = !q || [r.id, client?.nombre, client?.documento, r.metodoPago, r.estado, r.usuarioId, r.sucursalId]
      .some((v) => String(v || "").toLowerCase().includes(q));
    const d = dateOf(r.fechaRegistro);
    const fromOk = !from || !d || d >= new Date(`${from}T00:00:00`);
    const toOk = !to || !d || d <= new Date(`${to}T23:59:59`);
    const total = Number(r.total || 0);
    const minOk = minTotal === "" || total >= Number(minTotal);
    const maxOk = maxTotal === "" || total <= Number(maxTotal);
    const clientOk = clientFilter === "TODOS" || (clientFilter === "FINAL" ? !r.clienteId : r.clienteId === clientFilter);
    return searchOk && (status === "TODOS" || r.estado === status) && (method === "TODOS" || r.metodoPago === method) && clientOk && fromOk && toOk && minOk && maxOk;
  }), [rows, clientes, search, status, method, clientFilter, from, to, minTotal, maxTotal]);

  const saleDetails = (saleId) => detalles.filter((d) => d.ventaId === saleId);

  const annul = async (r) => {
    if (!window.confirm(`¿Anular la venta ${r.id}? El stock será restaurado y se registrará la reversión.`)) return;
    try {
      await anularVenta({ ventaId: r.id, empresaId: usuario.empresaId, usuarioId: usuario.uid });
      await registrarAuditoria({ empresaId: usuario.empresaId, usuarioId: usuario.uid, usuarioNombre: usuario.nombreCompleto || usuario.correo || "", accion: "ANULAR_VENTA", modulo: "ventas", entidad: "venta", entidadId: r.id, detalle: `Anuló venta por ${Number(r.total || 0).toFixed(2)}` });
      setSelected(null);
      await load();
    } catch (e) { alert(e.message || "No se pudo anular."); }
  };

 // ==========================================
// HU-18 - COMPROBANTE DE VENTA PROFESIONAL
// ==========================================

const receipt = async (r) => {

  // ABRIR VENTANA DEL COMPROBANTE
  const ventana = window.open(
    "",
    "_blank",
    "width=1000,height=900"
  );

  if (!ventana) {
    alert("Permite las ventanas emergentes para ver el comprobante.");
    return;
  }

  ventana.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Preparando comprobante</title>
    </head>
    <body style="
      background:#101125;
      color:white;
      font-family:Arial;
      display:flex;
      align-items:center;
      justify-content:center;
      height:90vh;
    ">
      <h2>Preparando comprobante...</h2>
    </body>
    </html>
  `);

  ventana.document.close();

  try {

    // ======================================
    // 1. OBTENER DATOS DE LA VENTA
    // ======================================

    const cliente = clientes[r.clienteId];

    const productosVenta = saleDetails(r.id);

    // ======================================
    // 2. OBTENER EMPRESA Y SUCURSAL
    // ======================================

    // ESTAS CONSULTAS SON SOLO DE LECTURA
    // SI UNA NO ESTA PERMITIDA, CONTINUAMOS
    // SIN MODIFICAR LOS DATOS DE LA VENTA

    const resultados = await Promise.allSettled([

      getDoc(
        doc(db, "empresas", usuario.empresaId)
      ),

      r.sucursalId
        ? getDoc(doc(db, "sucursales", r.sucursalId))
        : Promise.resolve(null)

    ]);

    const empresaSnapshot =
      resultados[0].status === "fulfilled"
        ? resultados[0].value
        : null;

    const sucursalSnapshot =
      resultados[1].status === "fulfilled"
        ? resultados[1].value
        : null;

    const empresa = empresaSnapshot?.exists()
      ? empresaSnapshot.data()
      : {};

    const sucursal = sucursalSnapshot?.exists()
      ? sucursalSnapshot.data()
      : {};

    // ======================================
    // 3. DATOS COMERCIALES
    // ======================================

    const nombreEmpresa =
      empresa.nombreComercial ||
      empresa.nombre ||
      empresa.razonSocial ||
      usuario.empresaNombre ||
      "Empresa";

    const nitEmpresa =
      empresa.nit ||
      empresa.nitEmpresa ||
      "";

    const direccionEmpresa =
      sucursal.direccion ||
      empresa.direccion ||
      empresa.direccionFiscal ||
      "";

    const telefonoEmpresa =
      empresa.telefono ||
      empresa.celular ||
      "";

    const nombreSucursal =
      sucursal.nombre ||
      sucursal.codigo ||
      "";

    const logoEmpresa =
      empresa.logoUrl ||
      empresa.logo ||
      empresa.imagenUrl ||
      "";

    // ======================================
    // 4. FORMATEAR DATOS
    // ======================================

    const fecha = dateOf(r.fechaRegistro)
      ?.toLocaleString("es-BO") || "-";

    const numeroComprobante =
      r.numeroComprobante ||
      r.codigo ||
      r.id;

    const nombreCliente =
      cliente?.nombre ||
      "Consumidor final";

    const documentoCliente =
      cliente?.documento ||
      cliente?.nit ||
      "";

    const nombreVendedor =
      r.usuarioNombre ||
      r.vendedorNombre ||
      "";

    const dinero = (valor) => {

      const numero = Number(valor);

      return Number.isFinite(numero)
        ? numero.toLocaleString("es-BO", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })
        : "0,00";

    };

    // EVITAR QUE LOS DATOS MODIFIQUEN EL HTML
    const escapar = (valor) => {

      return String(valor ?? "").replace(
        /[&<>"']/g,
        (caracter) => ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;"
        })[caracter]
      );

    };

    // SOLO PERMITIR DIRECCIONES DE IMAGEN WEB
    let logoSeguro = "";

    if (logoEmpresa) {

      try {

        const url = new URL(logoEmpresa, window.location.origin);

        if (
          url.protocol === "https:" ||
          url.origin === window.location.origin
        ) {
          logoSeguro = url.href;
        }

      } catch {
        logoSeguro = "";
      }

    }

    // ======================================
    // 5. GENERAR FILAS DE PRODUCTOS
    // ======================================

    const filasProductos = productosVenta.map(
      (producto, indice) => {

        const cantidad = Number(producto.cantidad || 0);

        const precio = Number(
          producto.precioUnitario || 0
        );

        const subtotalProducto =
          producto.subtotal != null
            ? Number(producto.subtotal)
            : cantidad * precio;

        return `
          <tr>

            <td>
              <span class="numero-item">
                ${indice + 1}.
              </span>

              <strong>
                ${escapar(
                  producto.nombreProducto ||
                  producto.productoId ||
                  "Producto"
                )}
              </strong>
            </td>

            <td class="numero">
              ${cantidad}
            </td>

            <td class="numero">
              ${dinero(precio)}
            </td>

            <td class="numero destacado">
              ${dinero(subtotalProducto)}
            </td>

          </tr>
        `;

      }
    ).join("");

    const tablaProductos = filasProductos || `
      <tr>
        <td colspan="4" class="sin-productos">
          No se encontraron detalles de esta venta.
        </td>
      </tr>
    `;

    // ======================================
    // 6. CREAR COMPROBANTE
    // ======================================

    const html = `
<!DOCTYPE html>
<html lang="es">

<head>

<meta charset="UTF-8">

<meta name="viewport"
content="width=device-width, initial-scale=1.0">

<title>
  Comprobante ${escapar(numeroComprobante)}
</title>

<style id="pageRule">
  @page {
    size: A4;
    margin: 12mm;
  }
</style>

<style>

/* ======================================
   DISEÑO GENERAL
====================================== */

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 28px;

  background: #0c0d1b;

  font-family:
    "Segoe UI",
    Arial,
    sans-serif;

  color: #1c2035;
}

/* ======================================
   BARRA DE OPCIONES
====================================== */

.barra-herramientas {

  max-width: 820px;
  margin: 0 auto 24px;

  display: flex;
  align-items: center;
  justify-content: space-between;

  gap: 15px;
  flex-wrap: wrap;

  padding: 16px 20px;

  border: 1px solid #34325c;
  border-radius: 16px;

  background: #191a30;

  color: white;
}

.titulo-herramientas {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.titulo-herramientas strong {
  font-size: 16px;
}

.titulo-herramientas span {
  font-size: 12px;
  color: #a0a4c0;
}

.botones {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

button {
  border: none;
  border-radius: 9px;

  padding: 11px 15px;

  font-size: 12px;
  font-weight: 700;

  cursor: pointer;

  transition: 0.2s;
}

.boton-formato {
  background: #30304c;
  color: #c7c8dc;
}

.boton-formato.activo {
  background: #7354ec;
  color: white;
}

.boton-imprimir {

  background: linear-gradient(
    135deg,
    #8953f5,
    #4285ff
  );

  color: white;
}

button:hover {
  filter: brightness(1.12);
}

/* ======================================
   HOJA DEL COMPROBANTE
====================================== */

.comprobante {

  width: 100%;
  max-width: 820px;

  margin: auto;

  background: white;

  border-radius: 18px;

  overflow: hidden;

  box-shadow:
    0 20px 65px rgba(0,0,0,0.35);
}

/* ======================================
   ENCABEZADO
====================================== */

.encabezado {

  padding: 32px 36px;

  background: linear-gradient(
    135deg,
    #4e36ac,
    #7652e5,
    #3689ee
  );

  color: white;

  display: flex;
  justify-content: space-between;
  align-items: center;

  gap: 18px;
}

.empresa {

  display: flex;
  align-items: center;

  gap: 15px;

  min-width: 0;
}

.logo {

  width: 65px;
  height: 65px;

  flex-shrink: 0;

  display: flex;
  align-items: center;
  justify-content: center;

  border-radius: 16px;

  background: rgba(255,255,255,0.17);

  font-size: 26px;
  font-weight: 800;

  overflow: hidden;
}

.logo img {

  width: 100%;
  height: 100%;

  object-fit: contain;
}

.empresa h1 {

  margin: 0 0 6px;

  font-size: 23px;
  overflow-wrap: anywhere;
}

.empresa p {

  margin: 3px 0;

  font-size: 11px;
  opacity: 0.9;
}

.tipo-documento {

  text-align: right;
  flex-shrink: 0;
}

.tipo-documento span {

  display: block;

  font-size: 10px;
  letter-spacing: 2px;

  opacity: 0.85;
}

.tipo-documento strong {

  display: block;

  margin-top: 6px;

  font-size: 18px;
}

/* ======================================
   CONTENIDO
====================================== */

.contenido {
  padding: 32px 36px;
}

.titulo-comprobante {

  margin-bottom: 25px;
  padding-bottom: 18px;

  border-bottom: 1px solid #e6e6f1;
}

.titulo-comprobante h2 {

  margin: 0 0 8px;

  font-size: 25px;

  color: #24233f;
}

.titulo-comprobante p {

  margin: 0;

  font-size: 11px;

  color: #777b94;

  overflow-wrap: anywhere;
}

/* ======================================
   INFORMACIÓN
====================================== */

.informacion {

  display: grid;
  grid-template-columns: 1fr 1fr;

  gap: 16px;

  margin-bottom: 30px;
}

.bloque {

  padding: 18px;

  border: 1px solid #e7e8f3;
  border-radius: 13px;

  background: #fafaff;
}

.bloque h3 {

  margin: 0 0 15px;

  font-size: 12px;

  color: #7955dc;

  text-transform: uppercase;

  letter-spacing: 1px;
}

.dato {

  display: flex;
  justify-content: space-between;

  gap: 12px;

  margin: 10px 0;

  font-size: 12px;
}

.dato span {
  color: #85869e;
}

.dato strong {

  color: #272945;
  text-align: right;

  overflow-wrap: anywhere;
}

/* ======================================
   TABLA DE PRODUCTOS
====================================== */

.tabla {

  width: 100%;

  border-collapse: collapse;

  margin-bottom: 30px;

  font-size: 12px;
}

.tabla th {

  padding: 14px 10px;

  background: #f0ecff;

  color: #5d43bc;

  text-align: left;

  font-size: 10px;
  text-transform: uppercase;
}

.tabla td {

  padding: 15px 10px;

  border-bottom: 1px solid #eeeeF5;
}

.numero {
  text-align: right;
}

.destacado {
  font-weight: 800;
  color: #433b91;
}

.numero-item {
  margin-right: 5px;
  color: #a4a0bd;
}

.sin-productos {
  text-align: center;
  color: #999;
}

/* ======================================
   RESUMEN
====================================== */

.resumen {

  width: 100%;
  max-width: 300px;

  margin-left: auto;
}

.resumen-fila {

  display: flex;
  justify-content: space-between;

  gap: 10px;

  padding: 9px 0;

  font-size: 13px;
}

.resumen-fila span {
  color: #777b94;
}

.resumen-fila strong {
  color: #262843;
}

.total {

  margin-top: 12px;
  padding: 17px;

  display: flex;
  align-items: center;
  justify-content: space-between;

  gap: 10px;

  border-radius: 13px;

  background: linear-gradient(
    135deg,
    #6845d6,
    #4786ee
  );

  color: white;
}

.total span {
  font-size: 13px;
}

.total strong {
  font-size: 24px;
}

/* ======================================
   PIE
====================================== */

.pie {

  padding: 24px 36px;

  border-top: 1px solid #eeeeF5;

  background: #fafaff;

  text-align: center;
}

.pie h3 {

  margin: 0 0 8px;

  color: #6650c3;

  font-size: 15px;
}

.pie p {

  margin: 5px 0;

  color: #85869e;

  font-size: 11px;
}

.estado-anulada {
  color: #b91c1c;
  font-weight: 800;
}

.estado-completada {
  color: #07845c;
  font-weight: 800;
}

/* ======================================
   FORMATO TICKET
====================================== */

body.ticket {
  padding: 12px;
}

.ticket .comprobante {
  width: 80mm;
  max-width: 100%;
  border-radius: 0;
}

.ticket .encabezado {

  padding: 18px 12px;

  flex-direction: column;
  text-align: center;
}

.ticket .empresa {
  flex-direction: column;
}

.ticket .empresa h1 {
  font-size: 16px;
}

.ticket .logo {
  width: 48px;
  height: 48px;
}

.ticket .tipo-documento {
  text-align: center;
}

.ticket .contenido {
  padding: 15px 10px;
}

.ticket .informacion {
  grid-template-columns: 1fr;
  gap: 10px;
}

.ticket .bloque {
  padding: 10px;
}

.ticket .titulo-comprobante h2 {
  font-size: 18px;
}

.ticket .tabla {
  font-size: 9px;
}

.ticket .tabla th,
.ticket .tabla td {
  padding: 9px 3px;
}

.ticket .numero-item {
  display: none;
}

.ticket .total strong {
  font-size: 18px;
}

.ticket .pie {
  padding: 15px 10px;
}

/* ======================================
   IMPRESIÓN
====================================== */

@media print {

  body {
    background: white !important;
    padding: 0 !important;
  }

  .barra-herramientas {
    display: none !important;
  }

  .comprobante {

    width: 100% !important;
    max-width: none !important;

    border-radius: 0 !important;

    box-shadow: none !important;
  }

  .bloque,
  .tabla tr,
  .total {
    break-inside: avoid;
  }

  .encabezado,
  .total,
  .logo {

    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

}

</style>

</head>

<body>

<!-- ======================================
     HERRAMIENTAS
====================================== -->

<div class="barra-herramientas">

  <div class="titulo-herramientas">

    <strong>Comprobante de venta</strong>

    <span>
      Selecciona el formato que deseas imprimir.
    </span>

  </div>

  <div class="botones">

    <button
      id="a4Btn"
      class="boton-formato activo"
      onclick="cambiarFormato(false)"
    >
      Hoja A4
    </button>

    <button
      id="ticketBtn"
      class="boton-formato"
      onclick="cambiarFormato(true)"
    >
      Ticket 80 mm
    </button>

    <button
      class="boton-imprimir"
      onclick="window.print()"
    >
      Imprimir / Guardar PDF
    </button>

  </div>

</div>

<!-- ======================================
     COMPROBANTE
====================================== -->

<div class="comprobante">

  <header class="encabezado">

    <div class="empresa">

      <div class="logo">

        ${
          logoSeguro
            ? `<img
                src="${escapar(logoSeguro)}"
                alt="Logo de la empresa"
              >`
            : escapar(
                nombreEmpresa
                  .trim()
                  .charAt(0)
                  .toUpperCase() || "E"
              )
        }

      </div>

      <div>

        <h1>
          ${escapar(nombreEmpresa)}
        </h1>

        ${
          nitEmpresa
            ? `<p>NIT: ${escapar(nitEmpresa)}</p>`
            : ""
        }

        ${
          direccionEmpresa
            ? `<p>${escapar(direccionEmpresa)}</p>`
            : ""
        }

        ${
          telefonoEmpresa
            ? `<p>Tel: ${escapar(telefonoEmpresa)}</p>`
            : ""
        }

      </div>

    </div>

    <div class="tipo-documento">

      <span>
        DOCUMENTO COMERCIAL
      </span>

      <strong>
        VENTA
      </strong>

    </div>

  </header>

  <main class="contenido">

    <div class="titulo-comprobante">

      <h2>
        Comprobante de venta
      </h2>

      <p>
        N.º ${escapar(numeroComprobante)}
      </p>

    </div>

    <!-- INFORMACIÓN -->

    <section class="informacion">

      <div class="bloque">

        <h3>Información de venta</h3>

        <div class="dato">
          <span>Fecha</span>
          <strong>${escapar(fecha)}</strong>
        </div>

        <div class="dato">
          <span>Sucursal</span>
          <strong>
            ${escapar(nombreSucursal || "No disponible")}
          </strong>
        </div>

        <div class="dato">
          <span>Pago</span>
          <strong>
            ${escapar(r.metodoPago || "-")}
          </strong>
        </div>

        <div class="dato">
          <span>Estado</span>

          <strong class="${
            r.estado === "ANULADA"
              ? "estado-anulada"
              : "estado-completada"
          }">
            ${escapar(r.estado || "-")}
          </strong>

        </div>

        ${
          nombreVendedor
            ? `
              <div class="dato">
                <span>Vendedor</span>
                <strong>
                  ${escapar(nombreVendedor)}
                </strong>
              </div>
            `
            : ""
        }

      </div>

      <div class="bloque">

        <h3>Información del cliente</h3>

        <div class="dato">

          <span>Cliente</span>

          <strong>
            ${escapar(nombreCliente)}
          </strong>

        </div>

        ${
          documentoCliente
            ? `
              <div class="dato">

                <span>CI / NIT</span>

                <strong>
                  ${escapar(documentoCliente)}
                </strong>

              </div>
            `
            : ""
        }

        ${
          cliente?.telefono
            ? `
              <div class="dato">

                <span>Teléfono</span>

                <strong>
                  ${escapar(cliente.telefono)}
                </strong>

              </div>
            `
            : ""
        }

      </div>

    </section>

    <!-- PRODUCTOS -->

    <table class="tabla">

      <thead>

        <tr>

          <th>Producto</th>

          <th class="numero">
            Cant.
          </th>

          <th class="numero">
            Precio
          </th>

          <th class="numero">
            Subtotal
          </th>

        </tr>

      </thead>

      <tbody>

        ${tablaProductos}

      </tbody>

    </table>

    <!-- TOTALES -->

    <section class="resumen">

      <div class="resumen-fila">

        <span>Subtotal</span>

        <strong>
          Bs ${dinero(r.subtotal)}
        </strong>

      </div>

      <div class="resumen-fila">

        <span>Descuento</span>

        <strong>
          - Bs ${dinero(r.descuento)}
        </strong>

      </div>

      <div class="total">

        <span>
          TOTAL PAGADO
        </span>

        <strong>
          Bs ${dinero(r.total)}
        </strong>

      </div>

    </section>

  </main>

  <!-- PIE -->

  <footer class="pie">

    <h3>
      ¡Gracias por tu compra!
    </h3>

    <p>
      Conserva este comprobante como
      respaldo de tu compra.
    </p>

    <p>
      Comprobante comercial.
      No constituye una factura fiscal.
    </p>

  </footer>

</div>

<script>

function cambiarFormato(ticket) {

  document.body.classList.toggle(
    "ticket",
    ticket
  );

  document.getElementById("a4Btn")
    .classList.toggle("activo", !ticket);

  document.getElementById("ticketBtn")
    .classList.toggle("activo", ticket);

  document.getElementById("pageRule").textContent =
    ticket
      ? "@page { size: 80mm 200mm; margin: 4mm; }"
      : "@page { size: A4; margin: 12mm; }";

}

</script>

</body>
</html>
`;

    // ======================================
    // 7. MOSTRAR COMPROBANTE
    // ======================================

    if (ventana.closed) return;

    ventana.document.open();

    ventana.document.write(html);

    ventana.document.close();

  } catch (error) {

    console.error(
      "Error al generar comprobante:",
      error
    );

    if (!ventana.closed) {

      ventana.document.body.innerHTML = `
        <div style="
          padding:40px;
          font-family:Arial;
          text-align:center;
        ">
          <h2>No se pudo generar el comprobante</h2>

          <p>
            Revisa la consola del navegador.
          </p>
        </div>
      `;

    }

  }

};

  const clientOptions = Object.values(clientes).sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || ""))).map((c) => ({ value: c.id, label: c.nombre || c.documento || c.id }));

  return <div className="module-page">
    <div className="module-page-header"><div><span className="eyebrow">VENTAS</span><h1>Historial de ventas</h1><p>Consulta detalle, filtra por múltiples criterios, genera comprobantes y anula operaciones con reversión de stock.</p></div><button className="secondary-action" onClick={load}><RefreshCw size={16}/> Actualizar</button></div>
    <AdvancedFilterBar search={search} onSearch={setSearch} searchPlaceholder="Venta, cliente, documento, usuario, sucursal…" status={status} onStatus={setStatus} statusOptions={[{value:"TODOS",label:"Todos los estados"},{value:"COMPLETADA",label:"Completadas"},{value:"ANULADA",label:"Anuladas"}]} filters={[{key:"metodo",label:"Todos los métodos",value:method,onChange:setMethod,options:[{value:"EFECTIVO",label:"Efectivo"},{value:"QR",label:"QR"},{value:"TARJETA",label:"Tarjeta"},{value:"TRANSFERENCIA",label:"Transferencia"},{value:"CREDITO",label:"Crédito"}]},{key:"cliente",label:"Todos los clientes",value:clientFilter,onChange:setClientFilter,options:[{value:"FINAL",label:"Consumidor final"},...clientOptions]}]} onClear={()=>{setSearch("");setStatus("TODOS");setMethod("TODOS");setClientFilter("TODOS");setFrom("");setTo("");setMinTotal("");setMaxTotal("")}}/>
    <div className="report-date-row filter-range-grid"><label>Desde<input type="date" value={from} onChange={(e)=>setFrom(e.target.value)}/></label><label>Hasta<input type="date" value={to} onChange={(e)=>setTo(e.target.value)}/></label><label>Total mínimo<input type="number" min="0" step="0.01" value={minTotal} onChange={(e)=>setMinTotal(e.target.value)} placeholder="0.00"/></label><label>Total máximo<input type="number" min="0" step="0.01" value={maxTotal} onChange={(e)=>setMaxTotal(e.target.value)} placeholder="Sin límite"/></label></div>
    <section className="data-card glass-3d">{loading?<div className="empty-state">Cargando ventas…</div>:<div className="table-scroll"><table className="modern-table"><thead><tr><th>VENTA</th><th>CLIENTE</th><th>FECHA</th><th>MÉTODO</th><th>SUBTOTAL</th><th>DESC.</th><th>TOTAL</th><th>ESTADO</th><th>ACCIONES</th></tr></thead><tbody>{filtered.map((r)=><tr key={r.id}><td><code>{r.id.slice(0,10)}</code></td><td>{clientes[r.clienteId]?.nombre||"Consumidor final"}</td><td>{dateOf(r.fechaRegistro)?.toLocaleString()||"-"}</td><td>{r.metodoPago}</td><td>{Number(r.subtotal||0).toFixed(2)}</td><td>{Number(r.descuento||0).toFixed(2)}</td><td><strong>{Number(r.total||0).toFixed(2)}</strong></td><td><span className={`status-pill ${r.estado==="ANULADA"?"inactive":"active"}`}>{r.estado}</span></td><td><div className="row-actions"><button title="Ver detalle" onClick={()=>setSelected(r)}><Eye size={16}/></button><button title="Comprobante" onClick={()=>receipt(r)}><FileText size={16}/></button>{r.estado!=="ANULADA"&&<button className="danger" title="Anular" onClick={()=>annul(r)}><Ban size={16}/></button>}</div></td></tr>)}</tbody></table>{!filtered.length&&<div className="empty-state">Sin ventas para los filtros seleccionados.</div>}</div>}</section>

    <AnimatePresence>{selected&&<motion.div className="modal-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={()=>setSelected(null)}><motion.div className="modal-card modal-wide glass-3d" initial={{opacity:0,scale:.95,y:20}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:.97}} onMouseDown={(e)=>e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">DETALLE DE VENTA</span><h2>{selected.id}</h2></div><button onClick={()=>setSelected(null)}><X size={18}/></button></div><div className="detail-summary-grid"><div><span>Cliente</span><strong>{clientes[selected.clienteId]?.nombre||"Consumidor final"}</strong></div><div><span>Método</span><strong>{selected.metodoPago}</strong></div><div><span>Sucursal</span><strong>{selected.sucursalId||"-"}</strong></div><div><span>Usuario</span><strong>{selected.usuarioId||"-"}</strong></div></div><div className="table-scroll"><table className="modern-table"><thead><tr><th>PRODUCTO</th><th>CANTIDAD</th><th>PRECIO</th><th>SUBTOTAL</th></tr></thead><tbody>{saleDetails(selected.id).map((d)=><tr key={d.id}><td>{d.nombreProducto||d.productoId}</td><td>{d.cantidad}</td><td>{Number(d.precioUnitario||0).toFixed(2)}</td><td><strong>{Number(d.subtotal||0).toFixed(2)}</strong></td></tr>)}</tbody></table>{!saleDetails(selected.id).length&&<div className="empty-state">No se encontraron líneas de detalle.</div>}</div><div className="detail-totals"><span>Subtotal <strong>{Number(selected.subtotal||0).toFixed(2)}</strong></span><span>Descuento <strong>{Number(selected.descuento||0).toFixed(2)}</strong></span><span className="grand">Total <strong>{Number(selected.total||0).toFixed(2)}</strong></span></div><div className="modal-actions"><button className="secondary-action" onClick={()=>receipt(selected)}><FileText size={16}/> Imprimir comprobante</button>{selected.estado!=="ANULADA"&&<button className="danger-action" onClick={()=>annul(selected)}><Ban size={16}/> Anular venta</button>}</div></motion.div></motion.div>}</AnimatePresence>
  </div>;
}
