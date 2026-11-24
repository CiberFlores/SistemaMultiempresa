import { useCallback, useEffect, useMemo, useState } from "react";
import mensajeError from "../../utils/mensajeError";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { Ban, ChevronDown, Eye, FileText, Plus, Receipt, Search, ShoppingBag, TrendingUp, Wallet, X } from "lucide-react";

import useAuth from "../../hooks/useAuth";
import useConfirmar from "../../hooks/useConfirmar";
import { db } from "../../services/firebase/firebaseConfig";
import { anularVenta, listarVentas } from "../../services/ventaService";
import { registrarAuditoria } from "../../services/auditService";
import { construirComprobante } from "../../utils/comprobanteVenta";
import { sonidoClick, sonidoError, sonidoExito } from "../../utils/sonidos";

import "../../styles/roles-empresa.css";
import "../../styles/trabajadores-empresa.css";
import "../../styles/inventario-empresa.css";
import "../../styles/crud-generico.css";
import "../../styles/compras-empresa.css";

const POR_PAGINA = 30;

const METODOS = {
  EFECTIVO: "Efectivo",
  QR: "QR",
  TARJETA: "Tarjeta",
  TRANSFERENCIA: "Transferencia",
  CREDITO: "A crédito"
};

const normalizar = (valor) =>
  String(valor ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

const dinero = (valor) =>
  `Bs ${Number(valor || 0).toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fechaDe = (valor) => {
  const fecha = valor?.toDate?.() || (valor ? new Date(valor) : null);
  return fecha && !Number.isNaN(fecha.getTime()) ? fecha : null;
};

const leer = (nombre, empresaId) =>
  getDocs(query(collection(db, nombre), where("empresaId", "==", empresaId))).then((resultado) =>
    resultado.docs.map((d) => ({ id: d.id, ...d.data() }))
  );

export default function VentasPage() {
  const { usuario } = useAuth();
  const confirmar = useConfirmar();
  const empresaId = usuario?.empresaId;

  const [ventas, setVentas] = useState([]);
  const [clientes, setClientes] = useState(new Map());
  const [detalles, setDetalles] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState("");
  const [metodo, setMetodo] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [limite, setLimite] = useState(POR_PAGINA);
  const [elegida, setElegida] = useState(null);

  const cargar = useCallback(async () => {
    if (!empresaId) return;

    try {
      const [lista, ds, cs] = await Promise.all([
        listarVentas(empresaId),
        leer("detalleVentas", empresaId),
        leer("clientes", empresaId).catch(() => [])
      ]);

      setVentas(lista);
      setDetalles(ds);
      setClientes(new Map(cs.map((c) => [c.id, c])));
    } catch (e) {
      console.error(e);
      setError("No pudimos cargar tus ventas. Revisa tu conexión e inténtalo otra vez.");
    } finally {
      setCargando(false);
    }
  }, [empresaId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const nombreDe = (v) => clientes.get(v.clienteId)?.nombre || v.clienteNombre || "Consumidor final";
  const documentoDe = (v) => clientes.get(v.clienteId)?.documento || v.clienteDocumento || "";
  const lineasDe = (id) => detalles.filter((d) => d.ventaId === id);

  const filtradas = useMemo(() => {
    const texto = normalizar(busqueda);
    const inicio = desde ? new Date(`${desde}T00:00:00`) : null;
    const fin = hasta ? new Date(`${hasta}T23:59:59`) : null;

    return ventas.filter((venta) => {
      if (estado && venta.estado !== estado) return false;
      if (metodo && venta.metodoPago !== metodo) return false;

      const fecha = fechaDe(venta.fechaRegistro);
      if (inicio && fecha && fecha < inicio) return false;
      if (fin && fecha && fecha > fin) return false;

      if (!texto) return true;

      return [venta.id, nombreDe(venta), documentoDe(venta), METODOS[venta.metodoPago]].some((valor) =>
        normalizar(valor).includes(texto)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ventas, clientes, busqueda, estado, metodo, desde, hasta]);

  const activas = filtradas.filter((v) => v.estado !== "ANULADA");
  const totalVendido = activas.reduce((suma, v) => suma + Number(v.total || 0), 0);
  const promedio = activas.length ? totalVendido / activas.length : 0;
  const anuladas = filtradas.length - activas.length;
  const visibles = filtradas.slice(0, limite);
  const hayFiltros = Boolean(busqueda || estado || metodo || desde || hasta);

  const limpiar = () => {
    setBusqueda("");
    setEstado("");
    setMetodo("");
    setDesde("");
    setHasta("");
    setLimite(POR_PAGINA);
  };

  const cambiar = (fijar) => (e) => {
    fijar(e.target.value);
    setLimite(POR_PAGINA);
  };

  async function anular(venta) {
    const ok = await confirmar({
      titulo: "Anular esta venta",
      mensaje: `Se anulará la venta de ${dinero(venta.total)}. El stock vuelve a Existencias y la venta queda marcada como anulada.`,
      accion: "Anular venta",
      peligro: true
    });
    if (!ok) return;

    setError("");
    setAviso("");

    try {
      await anularVenta({ ventaId: venta.id, empresaId, usuarioId: usuario.uid });
      await registrarAuditoria({
        empresaId,
        usuarioId: usuario.uid,
        usuarioNombre: usuario.nombreCompleto || usuario.correo || "",
        accion: "ANULAR_VENTA",
        modulo: "ventas",
        entidad: "venta",
        entidadId: venta.id,
        detalle: `Anuló venta por ${Number(venta.total || 0).toFixed(2)}`
      }).catch(() => {});

      sonidoExito();
      setAviso("La venta quedó anulada y el stock volvió a Existencias.");
      setElegida(null);
      await cargar();
    } catch (e) {
      console.error(e);
      sonidoError();
      setError(mensajeError(e, "No pudimos anular la venta."));
    }
  }

  // Comprobante imprimible con el logo y los colores vigentes de la empresa.
  async function comprobante(venta) {
    const ventana = window.open("", "_blank", "width=1000,height=900");

    if (!ventana) {
      setError("Tu navegador bloqueó la ventana. Permite las ventanas emergentes para ver el comprobante.");
      return;
    }

    ventana.document.write(
      '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Preparando comprobante</title></head>' +
        '<body style="margin:0;display:grid;place-items:center;height:100vh;font-family:system-ui,sans-serif;background:#f4f2f6;color:#3a2a44">' +
        "<p>Preparando comprobante…</p></body></html>"
    );
    ventana.document.close();

    try {
      const lecturas = await Promise.allSettled([
        getDoc(doc(db, "empresas", empresaId)),
        getDoc(doc(db, "personalizacionesEmpresas", empresaId)),
        venta.sucursalId ? getDoc(doc(db, "sucursales", venta.sucursalId)) : Promise.resolve(null)
      ]);

      const dato = (i) =>
        lecturas[i].status === "fulfilled" && lecturas[i].value?.exists?.() ? lecturas[i].value.data() : {};

      const html = construirComprobante({
        venta,
        productos: lineasDe(venta.id),
        empresa: dato(0),
        personalizacion: dato(1),
        sucursal: dato(2),
        cliente: clientes.get(venta.clienteId) || null,
        vendedor: venta.usuarioNombre || venta.vendedorNombre || "",
        fecha: fechaDe(venta.fechaRegistro)
      });

      if (ventana.closed) return;
      ventana.document.open();
      ventana.document.write(html);
      ventana.document.close();
    } catch (e) {
      console.error(e);
      if (!ventana.closed) {
        ventana.document.body.innerHTML =
          '<div style="padding:40px;font-family:system-ui,sans-serif;text-align:center"><h2>No se pudo generar el comprobante</h2><p>Inténtalo de nuevo en unos segundos.</p></div>';
      }
    }
  }

  const metricas = [
    { titulo: "Ventas", valor: activas.length.toLocaleString("es-BO"), nota: "completadas", icono: ShoppingBag },
    { titulo: "Total vendido", valor: dinero(totalVendido), nota: "sin contar anuladas", icono: Wallet },
    { titulo: "Venta promedio", valor: dinero(promedio), nota: "por cada venta", icono: TrendingUp },
    { titulo: "Anuladas", valor: anuladas.toLocaleString("es-BO"), nota: "con stock devuelto", icono: Ban, tono: anuladas ? "alerta" : "" }
  ];

  return (
    <div className="re inv">
      <header className="re-cabecera">
        <div>
          <h1>Historial de ventas</h1>
          <p>Revisa cada venta, imprime su comprobante o anúlala si hubo un error.</p>
        </div>

        <Link to="/ventas/pos" className="re-boton">
          <Plus size={17} />
          Nueva venta
        </Link>
      </header>

      <section className="inv-metricas co-metricas" aria-label="Resumen">
        {metricas.map(({ titulo, valor, nota, icono: Icono, tono }) => (
          <article className="inv-metrica" key={titulo} data-tono={tono || undefined}>
            <span className="inv-metrica__icono" aria-hidden="true">
              <Icono size={22} />
            </span>
            <div>
              <small>{titulo}</small>
              <strong>{valor}</strong>
              <em>{nota}</em>
            </div>
          </article>
        ))}
      </section>

      <div className="re-herramientas">
        <label className="re-busqueda">
          <Search size={19} aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar por cliente, carnet o código…"
            aria-label="Buscar ventas"
            value={busqueda}
            onChange={cambiar(setBusqueda)}
          />
        </label>

        <label className="tr-selector">
          <select value={estado} onChange={cambiar(setEstado)} aria-label="Estado">
            <option value="">Todas las ventas</option>
            <option value="COMPLETADA">Completadas</option>
            <option value="ANULADA">Anuladas</option>
          </select>
          <ChevronDown size={17} aria-hidden="true" />
        </label>

        <label className="tr-selector">
          <select value={metodo} onChange={cambiar(setMetodo)} aria-label="Forma de pago">
            <option value="">Todas las formas de pago</option>
            {Object.entries(METODOS).map(([valor, texto]) => (
              <option key={valor} value={valor}>
                {texto}
              </option>
            ))}
          </select>
          <ChevronDown size={17} aria-hidden="true" />
        </label>

        {hayFiltros && (
          <button type="button" className="re-chip" onClick={limpiar}>
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="cg-rangos">
        <label>
          <span>Desde</span>
          <input type="date" value={desde} onChange={cambiar(setDesde)} />
        </label>
        <label>
          <span>Hasta</span>
          <input type="date" value={hasta} onChange={cambiar(setHasta)} />
        </label>
      </div>

      {aviso && (
        <div className="re-aviso re-aviso--ok" role="status">
          {aviso}
        </div>
      )}
      {error && (
        <div className="re-aviso re-aviso--error" role="alert">
          {error}
        </div>
      )}

      {cargando ? (
        <div className="re-vacio">Cargando ventas…</div>
      ) : filtradas.length === 0 ? (
        <div className="re-vacio">
          <Receipt size={34} />
          <strong>{ventas.length === 0 ? "Todavía no hay ventas" : "No encontramos ventas"}</strong>
          <span>
            {ventas.length === 0 ? "Cuando cobres en el punto de venta, aparecerán aquí." : "Prueba con otras fechas o limpia los filtros."}
          </span>
          {ventas.length === 0 && (
            <Link to="/ventas/pos" className="re-boton">
              Hacer la primera venta
            </Link>
          )}
        </div>
      ) : (
        <section className="inv-bloque">
          <div className="inv-tabla-caja">
            <table className="inv-tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Pago</th>
                  <th className="inv-der">Total</th>
                  <th>Estado</th>
                  <th className="inv-der">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((venta) => {
                  const fecha = fechaDe(venta.fechaRegistro);
                  const anulada = venta.estado === "ANULADA";

                  return (
                    <tr key={venta.id}>
                      <td data-label="Fecha">
                        <div className="inv-celda">
                          <strong>
                            {fecha ? fecha.toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                          </strong>
                          <small>{fecha ? fecha.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" }) : ""}</small>
                        </div>
                      </td>
                      <td data-label="Cliente">
                        <div className="inv-celda">
                          <strong>{nombreDe(venta)}</strong>
                          <small>{documentoDe(venta) ? `Carnet ${documentoDe(venta)}` : ""}</small>
                        </div>
                      </td>
                      <td data-label="Pago">
                        <span className="co-pastilla-pago" data-metodo={venta.metodoPago}>
                          {METODOS[venta.metodoPago] || venta.metodoPago || "—"}
                        </span>
                      </td>
                      <td data-label="Total" className="inv-der">
                        <div className="inv-celda" style={{ justifyItems: "end" }}>
                          <strong>{dinero(venta.total)}</strong>
                          {Number(venta.descuento || 0) > 0 && <small>Descuento {dinero(venta.descuento)}</small>}
                        </div>
                      </td>
                      <td data-label="Estado">
                        <span className="inv-pastilla" data-estado={anulada ? "VENCIDO" : "VIGENTE"}>
                          {anulada ? "Anulada" : "Completada"}
                        </span>
                      </td>
                      <td data-label="Acciones" className="inv-der">
                        <div className="inv-fila-acciones">
                          <button
                            type="button"
                            className="re-boton re-boton--suave re-boton--chico"
                            onClick={() => {
                              setElegida(venta);
                              sonidoClick();
                            }}
                          >
                            <Eye size={15} />
                            Ver
                          </button>
                          <button
                            type="button"
                            className="re-boton re-boton--suave re-boton--chico"
                            onClick={() => comprobante(venta)}
                            aria-label="Imprimir comprobante"
                          >
                            <FileText size={15} />
                            Comprobante
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filtradas.length > limite && (
            <button type="button" className="re-boton re-boton--suave cg-mas" onClick={() => setLimite((previo) => previo + POR_PAGINA)}>
              Mostrar más ({filtradas.length - limite} restantes)
            </button>
          )}
        </section>
      )}

      <AnimatePresence>
        {elegida && (
          <motion.div className="re-fondo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => setElegida(null)}>
            <motion.div
              className="re-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="vt-detalle-titulo"
              initial={{ opacity: 0, scale: 0.96, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <header className="re-modal__cabecera">
                <div>
                  <h2 id="vt-detalle-titulo">Venta a {nombreDe(elegida)}</h2>
                  <p>
                    {fechaDe(elegida.fechaRegistro)?.toLocaleString("es-BO", { dateStyle: "long", timeStyle: "short" }) || ""}
                    {elegida.estado === "ANULADA" ? " · Anulada" : ""}
                  </p>
                </div>
                <button type="button" className="re-cerrar" onClick={() => setElegida(null)} aria-label="Cerrar">
                  <X size={18} />
                </button>
              </header>

              <div className="re-modal__cuerpo">
                <div className="co-detalle-resumen">
                  <div>
                    <small>Carnet</small>
                    <strong>{documentoDe(elegida) || "—"}</strong>
                  </div>
                  <div>
                    <small>Forma de pago</small>
                    <strong>{METODOS[elegida.metodoPago] || elegida.metodoPago || "—"}</strong>
                  </div>
                </div>

                <div className="co-detalle-lineas">
                  {lineasDe(elegida.id).length === 0 ? (
                    <div className="re-vacio">No encontramos el detalle de esta venta.</div>
                  ) : (
                    lineasDe(elegida.id).map((linea) => (
                      <div className="co-linea" key={linea.id}>
                        <div className="co-linea__texto">
                          <strong>{linea.nombreProducto || "Producto"}</strong>
                          <span>
                            {Number(linea.cantidad || 0).toLocaleString("es-BO", { maximumFractionDigits: 2 })} × {dinero(linea.precioUnitario)}
                          </span>
                        </div>
                        <strong className="co-linea__subtotal">{dinero(linea.subtotal)}</strong>
                      </div>
                    ))
                  )}
                </div>

                <div className="co-detalle-resumen">
                  <div>
                    <small>Subtotal</small>
                    <strong>{dinero(elegida.subtotal)}</strong>
                  </div>
                  <div>
                    <small>Descuento por promociones</small>
                    <strong>{dinero(elegida.descuento)}</strong>
                  </div>
                </div>

                <div className="co-total">
                  <span>Total cobrado</span>
                  <strong>{dinero(elegida.total)}</strong>
                </div>
              </div>

              <footer className="re-modal__pie">
                <button type="button" className="re-boton re-boton--suave" onClick={() => comprobante(elegida)}>
                  <FileText size={16} />
                  Comprobante
                </button>
                {elegida.estado !== "ANULADA" && (
                  <button type="button" className="re-boton re-boton--peligro" onClick={() => anular(elegida)}>
                    <Ban size={16} />
                    Anular venta
                  </button>
                )}
              </footer>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
