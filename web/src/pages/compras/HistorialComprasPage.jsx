import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { collection, getDocs, query, where } from "firebase/firestore";
import { ChevronDown, Eye, Plus, Receipt, Search, Truck, Wallet, X } from "lucide-react";

import useAuth from "../../hooks/useAuth";
import { db } from "../../services/firebase/firebaseConfig";
import { listarCompras } from "../../services/compraService";

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

const moneda = (valor) => `Bs ${Number(valor || 0).toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fechaDe = (valor) => {
  const fecha = valor?.toDate?.() || (valor ? new Date(valor) : null);
  return fecha && !Number.isNaN(fecha.getTime()) ? fecha : null;
};

function fechaCorta(texto) {
  if (!texto) return "";
  const [anio, mes, dia] = String(texto).split("-").map(Number);
  return new Date(anio, mes - 1, dia).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" });
}

const leer = (nombre, empresaId) =>
  getDocs(query(collection(db, nombre), where("empresaId", "==", empresaId))).then((resultado) =>
    resultado.docs.map((d) => ({ id: d.id, ...d.data() }))
  );

export default function HistorialComprasPage() {
  const { usuario } = useAuth();
  const empresaId = usuario?.empresaId;

  const [compras, setCompras] = useState([]);
  const [proveedores, setProveedores] = useState(new Map());
  const [sucursales, setSucursales] = useState(new Map());
  const [detalles, setDetalles] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const [metodo, setMetodo] = useState("");
  const [proveedorId, setProveedorId] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [limite, setLimite] = useState(POR_PAGINA);
  const [elegida, setElegida] = useState(null);

  const cargar = useCallback(async () => {
    if (!empresaId) return;
    setError("");

    try {
      const [lista, ps, ss, ds] = await Promise.all([
        listarCompras(empresaId),
        leer("proveedores", empresaId),
        leer("sucursales", empresaId),
        leer("detalleCompras", empresaId)
      ]);

      setCompras(lista);
      setProveedores(new Map(ps.map((p) => [p.id, p])));
      setSucursales(new Map(ss.map((s) => [s.id, s])));
      setDetalles(ds);
    } catch (e) {
      console.error(e);
      setError("No pudimos cargar tus compras. Revisa tu conexión e inténtalo otra vez.");
    } finally {
      setCargando(false);
    }
  }, [empresaId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const nombreProveedor = (id) => proveedores.get(id)?.nombre || "Proveedor eliminado";
  const nombreSucursal = (id) => sucursales.get(id)?.nombre || "—";

  const filtradas = useMemo(() => {
    const texto = normalizar(busqueda);
    const inicio = desde ? new Date(`${desde}T00:00:00`) : null;
    const fin = hasta ? new Date(`${hasta}T23:59:59`) : null;

    return compras.filter((compra) => {
      if (metodo && compra.metodoPago !== metodo) return false;
      if (proveedorId && compra.proveedorId !== proveedorId) return false;

      const fecha = fechaDe(compra.fechaRegistro);
      if (inicio && fecha && fecha < inicio) return false;
      if (fin && fecha && fecha > fin) return false;

      if (!texto) return true;

      const proveedor = proveedores.get(compra.proveedorId);
      return [compra.numeroDocumento, proveedor?.nombre, proveedor?.nit, nombreSucursal(compra.sucursalId), METODOS[compra.metodoPago]].some(
        (valor) => normalizar(valor).includes(texto)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compras, busqueda, metodo, proveedorId, desde, hasta, proveedores, sucursales]);

  const totalComprado = filtradas.reduce((suma, c) => suma + Number(c.total || 0), 0);
  const aCredito = filtradas.filter((c) => c.metodoPago === "CREDITO").reduce((suma, c) => suma + Number(c.total || 0), 0);
  const visibles = filtradas.slice(0, limite);
  const hayFiltros = Boolean(busqueda || metodo || proveedorId || desde || hasta);

  const lineasDe = (id) => detalles.filter((d) => d.compraId === id);

  const limpiar = () => {
    setBusqueda("");
    setMetodo("");
    setProveedorId("");
    setDesde("");
    setHasta("");
    setLimite(POR_PAGINA);
  };

  const reiniciarLimite = (fijar) => (e) => {
    fijar(e.target.value);
    setLimite(POR_PAGINA);
  };

  return (
    <div className="re inv">
      <header className="re-cabecera">
        <div>
          <h1>Historial de compras</h1>
          <p>Todo lo que compraste: a quién, cuándo, cuánto y qué lotes entraron.</p>
        </div>

        <Link to="/compras" className="re-boton">
          <Plus size={17} />
          Registrar compra
        </Link>
      </header>

      <section className="inv-metricas inv-metricas--tres co-metricas" aria-label="Resumen">
        <article className="inv-metrica">
          <span className="inv-metrica__icono" aria-hidden="true">
            <Receipt size={22} />
          </span>
          <div>
            <small>Compras</small>
            <strong>{filtradas.length.toLocaleString("es-BO")}</strong>
            <em>{hayFiltros ? "con los filtros" : "registradas"}</em>
          </div>
        </article>
        <article className="inv-metrica">
          <span className="inv-metrica__icono" aria-hidden="true">
            <Wallet size={22} />
          </span>
          <div>
            <small>Total comprado</small>
            <strong>{moneda(totalComprado)}</strong>
            <em>en este período</em>
          </div>
        </article>
        <article className="inv-metrica" data-tono={aCredito > 0 ? "alerta" : ""}>
          <span className="inv-metrica__icono" aria-hidden="true">
            <Truck size={22} />
          </span>
          <div>
            <small>A crédito</small>
            <strong>{moneda(aCredito)}</strong>
            <em>por pagar a proveedores</em>
          </div>
        </article>
      </section>

      <div className="re-herramientas">
        <label className="re-busqueda">
          <Search size={19} aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar proveedor, factura o sucursal…"
            aria-label="Buscar compras"
            value={busqueda}
            onChange={reiniciarLimite(setBusqueda)}
          />
        </label>

        <label className="tr-selector">
          <select value={proveedorId} onChange={reiniciarLimite(setProveedorId)} aria-label="Proveedor">
            <option value="">Todos los proveedores</option>
            {[...proveedores.values()]
              .sort((a, b) => String(a.nombre).localeCompare(String(b.nombre)))
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
          </select>
          <ChevronDown size={17} aria-hidden="true" />
        </label>

        <label className="tr-selector">
          <select value={metodo} onChange={reiniciarLimite(setMetodo)} aria-label="Forma de pago">
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
          <input type="date" value={desde} onChange={reiniciarLimite(setDesde)} />
        </label>
        <label>
          <span>Hasta</span>
          <input type="date" value={hasta} onChange={reiniciarLimite(setHasta)} />
        </label>
      </div>

      {error && (
        <div className="re-aviso re-aviso--error" role="alert">
          {error}
        </div>
      )}

      {cargando ? (
        <div className="re-vacio">Cargando compras…</div>
      ) : filtradas.length === 0 ? (
        <div className="re-vacio">
          <Receipt size={34} />
          <strong>{compras.length === 0 ? "Todavía no registraste compras" : "No encontramos compras"}</strong>
          <span>
            {compras.length === 0
              ? "Cuando registres tu primera compra, aparecerá aquí."
              : "Prueba con otras fechas o limpia los filtros."}
          </span>
          {compras.length === 0 && (
            <Link to="/compras" className="re-boton">
              Registrar la primera compra
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
                  <th>Proveedor</th>
                  <th>Factura</th>
                  <th>Sucursal</th>
                  <th>Pago</th>
                  <th className="inv-der">Total</th>
                  <th className="inv-der">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((compra) => {
                  const fecha = fechaDe(compra.fechaRegistro);

                  return (
                    <tr key={compra.id}>
                      <td data-label="Fecha">
                        <div className="inv-celda">
                          <strong>
                            {fecha ? fecha.toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                          </strong>
                          <small>{fecha ? fecha.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" }) : ""}</small>
                        </div>
                      </td>
                      <td data-label="Proveedor">
                        <div className="inv-celda">
                          <strong>{nombreProveedor(compra.proveedorId)}</strong>
                          <small>{proveedores.get(compra.proveedorId)?.nit ? `NIT ${proveedores.get(compra.proveedorId).nit}` : ""}</small>
                        </div>
                      </td>
                      <td data-label="Factura">{compra.numeroDocumento || "—"}</td>
                      <td data-label="Sucursal">{nombreSucursal(compra.sucursalId)}</td>
                      <td data-label="Pago">
                        <span className="co-pastilla-pago" data-metodo={compra.metodoPago}>
                          {METODOS[compra.metodoPago] || compra.metodoPago || "—"}
                        </span>
                      </td>
                      <td data-label="Total" className="inv-der">
                        <strong>{moneda(compra.total)}</strong>
                      </td>
                      <td data-label="Detalle" className="inv-der">
                        <button
                          type="button"
                          className="re-boton re-boton--suave re-boton--chico"
                          onClick={() => setElegida(compra)}
                          aria-label={`Ver el detalle de la compra a ${nombreProveedor(compra.proveedorId)}`}
                        >
                          <Eye size={15} />
                          Ver
                        </button>
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
          <motion.div
            className="re-fondo"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={() => setElegida(null)}
          >
            <motion.div
              className="re-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="co-detalle-titulo"
              initial={{ opacity: 0, scale: 0.96, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <header className="re-modal__cabecera">
                <div>
                  <h2 id="co-detalle-titulo">Compra a {nombreProveedor(elegida.proveedorId)}</h2>
                  <p>
                    {fechaDe(elegida.fechaRegistro)?.toLocaleString("es-BO", { dateStyle: "long", timeStyle: "short" }) || ""}
                    {elegida.numeroDocumento ? ` · Factura ${elegida.numeroDocumento}` : ""}
                  </p>
                </div>
                <button type="button" className="re-cerrar" onClick={() => setElegida(null)} aria-label="Cerrar">
                  <X size={18} />
                </button>
              </header>

              <div className="re-modal__cuerpo">
                <div className="co-detalle-resumen">
                  <div>
                    <small>Sucursal</small>
                    <strong>{nombreSucursal(elegida.sucursalId)}</strong>
                  </div>
                  <div>
                    <small>Forma de pago</small>
                    <strong>{METODOS[elegida.metodoPago] || elegida.metodoPago || "—"}</strong>
                  </div>
                </div>

                <div className="co-detalle-lineas">
                  {lineasDe(elegida.id).length === 0 ? (
                    <div className="re-vacio">No encontramos el detalle de esta compra.</div>
                  ) : (
                    lineasDe(elegida.id).map((linea) => (
                      <div className="co-linea" key={linea.id}>
                        <div className="co-linea__texto">
                          <strong>{linea.nombreProducto || "Producto"}</strong>
                          <span>
                            {Number(linea.cantidad || 0).toLocaleString("es-BO", { maximumFractionDigits: 2 })} ×{" "}
                            {moneda(linea.costoUnitario)}
                          </span>
                          {linea.numeroLote && (
                            <small>
                              Lote {linea.numeroLote}
                              {linea.fechaVencimiento ? ` · vence ${fechaCorta(linea.fechaVencimiento)}` : ""}
                            </small>
                          )}
                        </div>
                        <strong className="co-linea__subtotal">{moneda(linea.subtotal)}</strong>
                      </div>
                    ))
                  )}
                </div>

                {elegida.observaciones && (
                  <div className="co-detalle-resumen">
                    <div style={{ gridColumn: "1 / -1" }}>
                      <small>Notas</small>
                      <strong>{elegida.observaciones}</strong>
                    </div>
                  </div>
                )}

                <div className="co-total">
                  <span>Total de la compra</span>
                  <strong>{moneda(elegida.total)}</strong>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
