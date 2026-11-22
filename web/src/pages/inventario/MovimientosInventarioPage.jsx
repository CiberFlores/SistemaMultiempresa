import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { ArrowDownRight, ArrowUpRight, ChevronDown, History, Search } from "lucide-react";

import useAuth from "../../hooks/useAuth";
import { db } from "../../services/firebase/firebaseConfig";
import { suscribirColeccionEmpresa } from "../../services/genericCrudService";

import "../../styles/roles-empresa.css";
import "../../styles/trabajadores-empresa.css";
import "../../styles/inventario-empresa.css";
import "../../styles/crud-generico.css";

const POR_PAGINA = 40;

const TIPOS = {
  VENTA: "Venta",
  COMPRA: "Compra",
  ENTRADA: "Entrada",
  SALIDA: "Salida",
  AJUSTE_POSITIVO: "Ajuste (sobraban)",
  AJUSTE_NEGATIVO: "Ajuste (faltaban)",
  BAJA_VENCIMIENTO: "Baja por vencimiento",
  DEVOLUCION: "Devolución",
  ANULACION_VENTA: "Venta anulada",
  REGULARIZACION: "Lote asignado"
};

const normalizar = (valor) =>
  String(valor ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

const cantidad = (valor) => Number(valor || 0).toLocaleString("es-BO", { maximumFractionDigits: 2 });

function etiquetaTipo(tipo) {
  return TIPOS[tipo] || String(tipo || "Movimiento").toLowerCase().replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

// Los códigos largos de ventas y compras se acortan para que se lean
function motivoLegible(motivo) {
  if (!motivo) return "—";
  return String(motivo).replace(/\b[A-Za-z0-9]{20}\b/g, (codigo) => `#${codigo.slice(0, 6)}`);
}

function fechaDe(fila) {
  const f = fila.fechaRegistro?.toDate?.();
  return f && !Number.isNaN(f.getTime()) ? f : null;
}

export default function MovimientosInventarioPage() {
  const { usuario } = useAuth();
  const empresaId = usuario?.empresaId;

  const [filas, setFilas] = useState([]);
  const [productos, setProductos] = useState(new Map());
  const [sucursales, setSucursales] = useState(new Map());
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [tipo, setTipo] = useState("");
  const [sucursalId, setSucursalId] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [limite, setLimite] = useState(POR_PAGINA);

  useEffect(() => {
    if (!empresaId) return undefined;

    let activo = true;

    const cancelar = suscribirColeccionEmpresa(
      "movimientosStock",
      empresaId,
      (datos) => {
        if (!activo) return;
        setFilas(datos);
        setCargando(false);
      },
      (error) => {
        console.error(error);
        if (activo) setCargando(false);
      }
    );

    const leer = (nombre) =>
      getDocs(query(collection(db, nombre), where("empresaId", "==", empresaId))).then(
        (resultado) => new Map(resultado.docs.map((d) => [d.id, { id: d.id, ...d.data() }]))
      );

    leer("productos")
      .then((mapa) => activo && setProductos(mapa))
      .catch(console.error);
    leer("sucursales")
      .then((mapa) => activo && setSucursales(mapa))
      .catch(console.error);

    return () => {
      activo = false;
      if (typeof cancelar === "function") cancelar();
    };
  }, [empresaId]);

  const tiposPresentes = useMemo(() => [...new Set(filas.map((f) => f.tipo).filter(Boolean))], [filas]);

  const filtradas = useMemo(() => {
    const texto = normalizar(busqueda);
    const inicio = desde ? new Date(`${desde}T00:00:00`) : null;
    const fin = hasta ? new Date(`${hasta}T23:59:59`) : null;

    return filas.filter((fila) => {
      if (tipo && fila.tipo !== tipo) return false;
      if (sucursalId && fila.sucursalId !== sucursalId) return false;

      const fecha = fechaDe(fila);
      if (inicio && fecha && fecha < inicio) return false;
      if (fin && fecha && fecha > fin) return false;

      if (!texto) return true;

      const producto = productos.get(fila.productoId);
      return [producto?.nombre, producto?.sku, fila.motivo, fila.numeroLote, etiquetaTipo(fila.tipo)].some((valor) =>
        normalizar(valor).includes(texto)
      );
    });
  }, [filas, tipo, sucursalId, desde, hasta, busqueda, productos]);

  const entradas = filtradas.reduce((total, f) => {
    const delta = Number(f.stockNuevo) - Number(f.stockAnterior);
    return delta > 0 ? total + delta : total;
  }, 0);
  const salidas = filtradas.reduce((total, f) => {
    const delta = Number(f.stockNuevo) - Number(f.stockAnterior);
    return delta < 0 ? total - delta : total;
  }, 0);

  const visibles = filtradas.slice(0, limite);
  const hayFiltros = Boolean(busqueda || tipo || sucursalId || desde || hasta);

  const limpiar = () => {
    setBusqueda("");
    setTipo("");
    setSucursalId("");
    setDesde("");
    setHasta("");
    setLimite(POR_PAGINA);
  };

  return (
    <div className="re inv">
      <header className="re-cabecera">
        <div>
          <h1>Movimientos de inventario</h1>
          <p>La historia de cada producto: qué entró, qué salió y por qué.</p>
        </div>
      </header>

      <section className="inv-metricas inv-metricas--tres" aria-label="Resumen">
        <article className="inv-metrica">
          <span className="inv-metrica__icono" aria-hidden="true">
            <History size={22} />
          </span>
          <div>
            <small>Movimientos</small>
            <strong>{filtradas.length.toLocaleString("es-BO")}</strong>
            <em>{hayFiltros ? "con los filtros" : "en total"}</em>
          </div>
        </article>
        <article className="inv-metrica">
          <span className="inv-metrica__icono" aria-hidden="true">
            <ArrowUpRight size={22} />
          </span>
          <div>
            <small>Unidades que entraron</small>
            <strong>{cantidad(entradas)}</strong>
            <em>compras y entradas</em>
          </div>
        </article>
        <article className="inv-metrica" data-tono="alerta">
          <span className="inv-metrica__icono" aria-hidden="true">
            <ArrowDownRight size={22} />
          </span>
          <div>
            <small>Unidades que salieron</small>
            <strong>{cantidad(salidas)}</strong>
            <em>ventas, bajas y retiros</em>
          </div>
        </article>
      </section>

      <div className="re-herramientas">
        <label className="re-busqueda">
          <Search size={19} aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar producto, lote o motivo…"
            aria-label="Buscar movimientos"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setLimite(POR_PAGINA);
            }}
          />
        </label>

        <label className="tr-selector">
          <select
            value={tipo}
            onChange={(e) => {
              setTipo(e.target.value);
              setLimite(POR_PAGINA);
            }}
            aria-label="Tipo de movimiento"
          >
            <option value="">Todos los movimientos</option>
            {tiposPresentes.map((valor) => (
              <option key={valor} value={valor}>
                {etiquetaTipo(valor)}
              </option>
            ))}
          </select>
          <ChevronDown size={17} aria-hidden="true" />
        </label>

        <label className="tr-selector">
          <select
            value={sucursalId}
            onChange={(e) => {
              setSucursalId(e.target.value);
              setLimite(POR_PAGINA);
            }}
            aria-label="Sucursal"
          >
            <option value="">Todas las sucursales</option>
            {[...sucursales.values()].map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
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
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </label>
        <label>
          <span>Hasta</span>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </label>
      </div>

      {cargando ? (
        <div className="re-vacio">Cargando movimientos…</div>
      ) : filtradas.length === 0 ? (
        <div className="re-vacio">
          <History size={34} />
          <strong>{filas.length === 0 ? "Todavía no hay movimientos" : "No encontramos movimientos"}</strong>
          <span>
            {filas.length === 0
              ? "Cada compra, venta o baja que hagas quedará anotada aquí."
              : "Prueba con otras fechas o limpia los filtros."}
          </span>
        </div>
      ) : (
        <section className="inv-bloque">
          <div className="inv-tabla-caja">
            <table className="inv-tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Movimiento</th>
                  <th>Producto</th>
                  <th>Sucursal</th>
                  <th className="inv-der">Cantidad</th>
                  <th className="inv-der">Stock</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((fila) => {
                  const producto = productos.get(fila.productoId);
                  const delta = Number(fila.stockNuevo) - Number(fila.stockAnterior);
                  const entra = delta > 0;
                  const fecha = fechaDe(fila);

                  return (
                    <tr key={fila.id}>
                      <td data-label="Fecha">
                        <div className="inv-celda">
                          <strong>{fecha ? fecha.toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</strong>
                          <small>{fecha ? fecha.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" }) : ""}</small>
                        </div>
                      </td>
                      <td data-label="Movimiento">
                        <span className="inv-pastilla" data-mov={delta === 0 ? "igual" : entra ? "entra" : "sale"}>
                          {etiquetaTipo(fila.tipo)}
                        </span>
                      </td>
                      <td data-label="Producto">
                        <div className="inv-celda">
                          <strong>{producto?.nombre || "Producto eliminado"}</strong>
                          <small>
                            {producto?.sku || ""}
                            {fila.numeroLote ? ` · Lote ${fila.numeroLote}` : ""}
                          </small>
                        </div>
                      </td>
                      <td data-label="Sucursal">{sucursales.get(fila.sucursalId)?.nombre || "—"}</td>
                      <td data-label="Cantidad" className="inv-der">
                        <strong className="inv-delta" data-mov={delta === 0 ? "igual" : entra ? "entra" : "sale"}>
                          {entra ? "+" : delta < 0 ? "−" : ""}
                          {cantidad(Math.abs(delta) || fila.cantidad)}
                        </strong>
                      </td>
                      <td data-label="Stock" className="inv-der">
                        <span className="inv-stock">
                          {cantidad(fila.stockAnterior)} → <b>{cantidad(fila.stockNuevo)}</b>
                        </span>
                      </td>
                      <td data-label="Motivo">{motivoLegible(fila.motivo)}</td>
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
    </div>
  );
}
