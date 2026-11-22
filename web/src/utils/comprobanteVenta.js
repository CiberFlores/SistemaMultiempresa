import { derivarTema, IDENTIDAD_BASE } from "./identidadEmpresa";

// Comprobante de venta imprimible (hoja A4 o ticket de 80 mm).
// Toma el logo, el nombre y los colores de la empresa en el momento de imprimir,
// así que siempre refleja la identidad vigente.

function escapar(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, (caracter) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[caracter]);
}

function dinero(valor) {
  const numero = Number(valor);

  return Number.isFinite(numero)
    ? numero.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "0,00";
}

// Solo imágenes web: https o del propio sitio
function logoSeguro(url) {
  if (!url) return "";

  try {
    const direccion = new URL(url, window.location.origin);

    return direccion.protocol === "https:" || direccion.origin === window.location.origin
      ? direccion.href
      : "";
  } catch {
    return "";
  }
}

// Una fila de datos: etiqueta a la izquierda y valor a la derecha
function fila(etiqueta, valor) {
  if (!valor) return "";

  return `<div class="dato"><span>${escapar(etiqueta)}</span><strong>${escapar(valor)}</strong></div>`;
}

export function construirComprobante({
  venta,
  productos = [],
  empresa = {},
  personalizacion = {},
  sucursal = {},
  cliente = null,
  vendedor = "",
  fecha = null
}) {
  const identidad = {
    ...IDENTIDAD_BASE,
    colorPrimario: personalizacion.colorPrimario || empresa.identidad?.colorPrimario || IDENTIDAD_BASE.colorPrimario,
    colorSecundario: personalizacion.colorSecundario || empresa.identidad?.colorSecundario || IDENTIDAD_BASE.colorSecundario,
    fondo: personalizacion.fondo || empresa.identidad?.fondo || IDENTIDAD_BASE.fondo,
    tipografia: personalizacion.tipografia || empresa.identidad?.tipografia || IDENTIDAD_BASE.tipografia
  };
  const tema = derivarTema(identidad);

  const nombreEmpresa =
    personalizacion.nombreVisual ||
    empresa.nombreComercial ||
    empresa.nombre ||
    empresa.razonSocial ||
    "Empresa";

  const logo = logoSeguro(personalizacion.logoUrl || empresa.logoUrl || empresa.logo || "");
  const direccion = sucursal.direccion || empresa.direccion || empresa.direccionFiscal || "";
  const telefono = empresa.telefono || empresa.celular || "";

  const numero = venta.numeroComprobante || venta.codigo || venta.id;
  const fechaTexto = fecha ? fecha.toLocaleString("es-BO") : "-";

  const nombreCliente = cliente?.nombre || venta.clienteNombre || "Consumidor final";
  const documentoCliente = cliente?.documento || cliente?.nit || venta.clienteDocumento || "";

  const anulada = venta.estado === "ANULADA";

  const filas = productos
    .map((producto, indice) => {
      const cantidad = Number(producto.cantidad || 0);
      const precio = Number(producto.precioUnitario || 0);
      const subtotal = producto.subtotal != null ? Number(producto.subtotal) : cantidad * precio;

      return `<tr>
        <td><span class="n">${indice + 1}</span>${escapar(producto.nombreProducto || producto.productoId || "Producto")}</td>
        <td class="num">${cantidad}</td>
        <td class="num">${dinero(precio)}</td>
        <td class="num fuerte">${dinero(subtotal)}</td>
      </tr>`;
    })
    .join("");

  const tipografia = String(identidad.tipografia || "Inter").replace(/[^\w\s-]/g, "");
  const fuenteUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(tipografia)}:wght@400;600;700;800&display=swap`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Comprobante ${escapar(numero)} · ${escapar(nombreEmpresa)}</title>
<link rel="stylesheet" href="${fuenteUrl}">
<style id="pagina">@page { size: A4; margin: 12mm; }</style>
<style>
  :root {
    --primario: ${tema.primario};
    --secundario: ${tema.secundario};
    --sobre: ${tema.sobrePrimario};
    --tinta: #1b1722;
    --apagado: #6d6676;
    --linea: #e8e4ec;
    --suave: #f6f4f8;
    --fuente: "${escapar(tipografia)}", "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
  }

  * { box-sizing: border-box; margin: 0; }

  html, body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  body {
    min-height: 100vh;
    padding: 24px 16px 48px;
    background: #ebe8ef;
    color: var(--tinta);
    font-family: var(--fuente);
    font-size: 14px;
    line-height: 1.45;
  }

  /* ---------- Barra de impresión (no se imprime) ---------- */
  .barra {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    width: min(794px, 100%);
    margin: 0 auto 18px;
    padding: 12px 16px;
    border-radius: 16px;
    background: #fff;
    box-shadow: 0 8px 24px -16px rgba(30, 20, 40, 0.4);
  }

  .barra strong { display: block; font-size: 15px; }
  .barra small { color: var(--apagado); }
  .botones { display: flex; gap: 8px; flex-wrap: wrap; }

  .boton {
    min-height: 40px;
    padding: 0 16px;
    border: 1px solid var(--linea);
    border-radius: 12px;
    background: #fff;
    color: var(--tinta);
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }

  .boton.activo { border-color: var(--primario); box-shadow: inset 0 0 0 1px var(--primario); }
  .boton.principal { border-color: transparent; background: var(--primario); color: var(--sobre); }

  /* ---------- Hoja ---------- */
  .hoja {
    width: min(794px, 100%);
    margin: 0 auto;
    overflow: hidden;
    border-radius: 20px;
    background: #fff;
    box-shadow: 0 20px 50px -24px rgba(30, 20, 40, 0.5);
  }

  .cabecera {
    position: relative;
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 30px 36px;
    background: var(--primario);
    color: var(--sobre);
  }

  .cabecera::after {
    content: "";
    position: absolute;
    right: 0; bottom: 0; left: 0;
    height: 6px;
    background: var(--secundario);
  }

  .logo {
    flex: none;
    display: grid;
    place-items: center;
    width: 84px; height: 84px;
    padding: 10px;
    border-radius: 20px;
    background: #fff;
    color: var(--primario);
    font-size: 34px;
    font-weight: 800;
  }

  .logo img { width: 100%; height: 100%; object-fit: contain; }

  .empresa h1 { font-size: 26px; line-height: 1.1; letter-spacing: -0.01em; }
  .empresa p { margin-top: 4px; font-size: 13px; opacity: 0.9; }

  .tipo {
    margin-left: auto;
    text-align: right;
  }

  .tipo small { display: block; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; opacity: 0.85; }
  .tipo strong { display: block; font-size: 22px; letter-spacing: 0.04em; }
  .tipo span { display: block; margin-top: 4px; font-size: 12px; opacity: 0.85; }

  .cuerpo { padding: 30px 36px 12px; }

  .sello {
    display: inline-block;
    margin-bottom: 16px;
    padding: 6px 14px;
    border: 2px solid #d6334a;
    border-radius: 10px;
    color: #d6334a;
    font-weight: 800;
    letter-spacing: 0.1em;
    transform: rotate(-3deg);
  }

  .tarjetas {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  .tarjeta {
    padding: 16px 18px;
    border-radius: 16px;
    background: var(--suave);
  }

  .tarjeta h3 {
    margin-bottom: 10px;
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--primario);
  }

  .dato { display: flex; justify-content: space-between; gap: 12px; padding: 4px 0; }
  .dato span { color: var(--apagado); }
  .dato strong { text-align: right; }

  table { width: 100%; margin-top: 22px; border-collapse: collapse; }

  thead th {
    padding: 12px 10px;
    background: var(--primario);
    color: var(--sobre);
    font-size: 11px;
    letter-spacing: 0.1em;
    text-align: left;
    text-transform: uppercase;
    box-shadow: 1px 0 0 var(--primario);
  }

  thead th:first-child { border-radius: 12px 0 0 12px; }
  thead th:last-child { border-radius: 0 12px 12px 0; }

  tbody td { padding: 13px 10px; border-bottom: 1px solid var(--linea); }
  tbody tr:nth-child(even) td { background: color-mix(in srgb, var(--primario) 4%, white); }

  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .fuerte { font-weight: 800; }
  th.num { text-align: right; }

  .n {
    display: inline-grid;
    place-items: center;
    width: 22px; height: 22px;
    margin-right: 10px;
    border-radius: 7px;
    background: color-mix(in srgb, var(--primario) 14%, white);
    color: var(--primario);
    font-size: 11px;
    font-weight: 800;
  }

  .totales { margin-top: 20px; margin-left: auto; width: min(340px, 100%); }
  .totales .dato { padding: 6px 4px; }

  .total {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 10px;
    padding: 18px 22px;
    border-radius: 16px;
    background: var(--primario);
    color: var(--sobre);
    box-shadow: inset 0 -5px 0 var(--secundario);
  }

  .total span { font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; }
  .total strong { font-size: 28px; letter-spacing: -0.02em; }

  .pie {
    margin-top: 28px;
    padding: 22px 36px 28px;
    border-top: 1px dashed var(--linea);
    text-align: center;
  }

  .pie strong { display: block; font-size: 17px; color: var(--primario); }
  .pie p { margin-top: 6px; font-size: 12px; color: var(--apagado); }

  /* ---------- Ticket de 80 mm ---------- */
  body.ticket { padding-top: 16px; }
  body.ticket .hoja { width: 80mm; border-radius: 0; box-shadow: none; }
  body.ticket .barra { width: 80mm; }
  body.ticket .cabecera { flex-direction: column; gap: 8px; padding: 14px 10px; text-align: center; }
  body.ticket .logo { width: 58px; height: 58px; padding: 6px; border-radius: 14px; font-size: 24px; }
  body.ticket .empresa h1 { font-size: 17px; }
  body.ticket .tipo { margin: 0; text-align: center; }
  body.ticket .tipo strong { font-size: 15px; }
  body.ticket .cuerpo { padding: 12px 10px 4px; }
  body.ticket .tarjetas { grid-template-columns: 1fr; gap: 8px; }
  body.ticket .tarjeta { padding: 10px 12px; border-radius: 10px; }
  body.ticket body, body.ticket { font-size: 12px; }
  body.ticket table { margin-top: 12px; }
  body.ticket thead th { padding: 8px 4px; font-size: 9px; }
  body.ticket tbody td { padding: 8px 4px; }
  body.ticket .n { display: none; }
  body.ticket .total { padding: 12px 14px; }
  body.ticket .total strong { font-size: 20px; }
  body.ticket .pie { margin-top: 14px; padding: 14px 10px 18px; }

  @media (max-width: 640px) {
    .cabecera { flex-wrap: wrap; padding: 22px 18px; }
    .tipo { margin-left: 0; text-align: left; }
    .cuerpo { padding: 20px 18px 8px; }
    .tarjetas { grid-template-columns: 1fr; }
  }

  @media print {
    body { padding: 0; background: #fff; }
    .barra { display: none; }
    .hoja { width: 100%; border-radius: 0; box-shadow: none; }
    body.ticket .hoja { width: 80mm; }
    tr { break-inside: avoid; }
  }
</style>
</head>
<body>

<div class="barra">
  <div>
    <strong>Comprobante de venta</strong>
    <small>Elige el formato y luego imprime o guarda en PDF.</small>
  </div>
  <div class="botones">
    <button class="boton activo" id="btnA4" type="button">Hoja A4</button>
    <button class="boton" id="btnTicket" type="button">Ticket 80 mm</button>
    <button class="boton principal" id="btnImprimir" type="button">Imprimir / Guardar PDF</button>
  </div>
</div>

<main class="hoja">
  <header class="cabecera">
    <div class="logo">${logo ? `<img src="${escapar(logo)}" alt="" onerror="this.replaceWith(document.createTextNode('${escapar(nombreEmpresa.charAt(0).toUpperCase())}'))">` : escapar(nombreEmpresa.charAt(0).toUpperCase())}</div>
    <div class="empresa">
      <h1>${escapar(nombreEmpresa)}</h1>
      ${empresa.nit ? `<p>NIT ${escapar(empresa.nit)}</p>` : ""}
      ${direccion ? `<p>${escapar(direccion)}</p>` : ""}
      ${telefono ? `<p>Tel. ${escapar(telefono)}</p>` : ""}
    </div>
    <div class="tipo">
      <small>Documento comercial</small>
      <strong>VENTA</strong>
      <span>N.º ${escapar(String(numero).slice(0, 12))}</span>
    </div>
  </header>

  <section class="cuerpo">
    ${anulada ? `<div class="sello">VENTA ANULADA</div>` : ""}

    <div class="tarjetas">
      <div class="tarjeta">
        <h3>Venta</h3>
        ${fila("Fecha", fechaTexto)}
        ${fila("Sucursal", sucursal.nombre || sucursal.codigo || "")}
        ${fila("Pago", venta.metodoPago || "")}
        ${fila("Atendió", vendedor)}
      </div>
      <div class="tarjeta">
        <h3>Cliente</h3>
        ${fila("Nombre", nombreCliente)}
        ${fila("Carnet / NIT", documentoCliente)}
        ${fila("Teléfono", cliente?.telefono || "")}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Producto</th>
          <th class="num">Cant.</th>
          <th class="num">Precio</th>
          <th class="num">Subtotal</th>
        </tr>
      </thead>
      <tbody>${filas || `<tr><td colspan="4">Sin detalle de productos.</td></tr>`}</tbody>
    </table>

    <div class="totales">
      <div class="dato"><span>Subtotal</span><strong>Bs ${dinero(venta.subtotal)}</strong></div>
      <div class="dato"><span>Descuento</span><strong>− Bs ${dinero(venta.descuento)}</strong></div>
      <div class="total"><span>Total pagado</span><strong>Bs ${dinero(venta.total)}</strong></div>
    </div>
  </section>

  <footer class="pie">
    <strong>¡Gracias por tu compra!</strong>
    <p>Conserva este comprobante como respaldo. Documento comercial, no constituye factura fiscal.</p>
  </footer>
</main>

<script>
  (function () {
    var estilo = document.getElementById("pagina");
    var a4 = document.getElementById("btnA4");
    var ticket = document.getElementById("btnTicket");

    function formato(esTicket) {
      document.body.classList.toggle("ticket", esTicket);
      a4.classList.toggle("activo", !esTicket);
      ticket.classList.toggle("activo", esTicket);
      estilo.textContent = esTicket
        ? "@page { size: 80mm auto; margin: 4mm; }"
        : "@page { size: A4; margin: 12mm; }";
    }

    a4.addEventListener("click", function () { formato(false); });
    ticket.addEventListener("click", function () { formato(true); });
    document.getElementById("btnImprimir").addEventListener("click", function () { window.print(); });
  })();
</script>
</body>
</html>`;
}
