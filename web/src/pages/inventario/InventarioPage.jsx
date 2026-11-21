import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Boxes,
  CalendarDays, ClipboardCheck, RefreshCw, Search,
  ShieldAlert, SlidersHorizontal, Trash2, X
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import useAuth from "../../hooks/useAuth";
import {
  ajustarStock,
  darDeBajaLoteVencido,
  listarLotesInventario,
  obtenerCatalogosInventario,
  regularizarStockSinLote,
  suscribirInventario
} from "../../services/inventarioService";

// A. DATOS INICIALES
const formularioInicial = {
  sucursalId: "", productoId: "", tipo: "ENTRADA", cantidad: "", motivo: ""
};
const regularizacionInicial = {
  numeroLote: "", fechaVencimiento: "", cantidad: "",
  motivo: "Conteo fisico de existencias antiguas"
};
const ESTADOS = {
  VIGENTE: { texto: "VIGENTE", color: "#50e3b1", fondo: "rgba(45,212,160,.12)" },
  POR_VENCER: { texto: "POR VENCER", color: "#ffc36a", fondo: "rgba(255,186,80,.12)" },
  VENCIDO: { texto: "VENCIDO", color: "#ff777d", fondo: "rgba(255,95,110,.12)" },
  SIN_EXISTENCIAS: { texto: "SIN EXISTENCIAS", color: "#a6abc1", fondo: "rgba(166,171,193,.12)" },
  FECHA_INVALIDA: { texto: "FECHA INVALIDA", color: "#ff777d", fondo: "rgba(255,95,110,.12)" }
};

// B. FUNCIONES SENCILLAS
function hoyLocal() {
  const hoy = new Date();
  return [
    hoy.getFullYear(),
    String(hoy.getMonth() + 1).padStart(2, "0"),
    String(hoy.getDate()).padStart(2, "0")
  ].join("-");
}
function fechaValida(fecha) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || "")) return false;
  const convertida = new Date(`${fecha}T12:00:00Z`);
  return !Number.isNaN(convertida.getTime()) &&
    convertida.toISOString().slice(0, 10) === fecha;
}
function fechaVisible(fecha) {
  if (!fechaValida(fecha)) return "Sin fecha";
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
}
function cantidadVisible(valor) {
  return Number(valor || 0).toLocaleString("es-BO", { maximumFractionDigits: 2 });
}
function redondear(valor) {
  return Math.round((Number(valor) + Number.EPSILON) * 1000000) / 1000000;
}

// C. PAGINA PRINCIPAL
export default function InventarioPage() {
  const { usuario } = useAuth();
  const empresaId = usuario?.empresaId;
  const solicitudLotes = useRef(0);

  const [inventarios, setInventarios] = useState([]);
  const [productos, setProductos] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [lotes, setLotes] = useState([]);

  const [busqueda, setBusqueda] = useState("");
  const [filtroSucursal, setFiltroSucursal] = useState("");
  const [busquedaLotes, setBusquedaLotes] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroSucursalLotes, setFiltroSucursalLotes] = useState("");

  const [cargando, setCargando] = useState(true);
  const [cargandoLotes, setCargandoLotes] = useState(true);
  const [lotesCargados, setLotesCargados] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState("");
  const [errorModal, setErrorModal] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [mostrarMovimiento, setMostrarMovimiento] = useState(false);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [loteBaja, setLoteBaja] = useState(null);
  const [cantidadBaja, setCantidadBaja] = useState("");
  const [motivoBaja, setMotivoBaja] = useState("Retiro de productos vencidos");

  // NUEVO: MODAL PARA ASIGNAR LOTES A EXISTENCIAS ANTIGUAS
  const [filaRegularizacion, setFilaRegularizacion] = useState(null);
  const [regularizacion, setRegularizacion] = useState(regularizacionInicial);

  // D. ACTUALIZAR LOTES SIN REINICIAR LA PAGINA
  const cargarLotes = useCallback(async () => {
    if (!empresaId) return;
    const solicitud = ++solicitudLotes.current;
    setCargandoLotes(true);
    setLotesCargados(false);
    try {
      const datos = await listarLotesInventario(empresaId);
      if (solicitud !== solicitudLotes.current) return;
      setLotes(datos);
      setLotesCargados(true);
    } catch (error) {
      console.error(error);
      if (solicitud === solicitudLotes.current) {
        setErrorGeneral(error.message || "No se pudieron cargar los lotes de Firestore.");
        setLotesCargados(false);
      }
      throw error;
    } finally {
      if (solicitud === solicitudLotes.current) setCargandoLotes(false);
    }
  }, [empresaId]);

  // E. CARGAR EXISTENCIAS, PRODUCTOS Y SUCURSALES
  useEffect(() => {
    if (!empresaId) {
      setCargando(false);
      setCargandoLotes(false);
      return;
    }
    let activo = true;
    setCargando(true);
    setInventarios([]);
    setProductos([]);
    setSucursales([]);
    setLotes([]);
    setErrorGeneral("");

    const cancelar = suscribirInventario(
      empresaId,
      (datos) => {
        if (!activo) return;
        setInventarios(datos);
        setCargando(false);
      },
      (error) => {
        console.error(error);
        if (!activo) return;
        setCargando(false);
        setErrorGeneral("No se pudieron cargar las existencias.");
      }
    );

    obtenerCatalogosInventario(empresaId)
      .then((datos) => {
        if (!activo) return;
        setProductos(datos.productos || []);
        setSucursales(datos.sucursales || []);
      })
      .catch((error) => {
        console.error(error);
        if (activo) setErrorGeneral("No se pudieron cargar productos y sucursales.");
      });

    cargarLotes().catch(() => {});

    return () => {
      activo = false;
      solicitudLotes.current += 1;
      if (typeof cancelar === "function") cancelar();
    };
  }, [empresaId, cargarLotes]);

  async function actualizarDatos() {
    setErrorGeneral("");
    try {
      const datos = await obtenerCatalogosInventario(empresaId);
      setProductos(datos.productos || []);
      setSucursales(datos.sucursales || []);
      await cargarLotes();
    } catch (error) {
      console.error(error);
      setErrorGeneral(error.message || "No se pudo actualizar el inventario.");
    }
  }

  // F. PREPARAR EXISTENCIAS Y LOTES POR PRODUCTO/SUCURSAL
  const productosPorId = useMemo(() => new Map(
    productos.map((producto) => [producto.id, producto])
  ), [productos]);
  const sucursalesPorId = useMemo(() => new Map(
    sucursales.map((sucursal) => [sucursal.id, sucursal])
  ), [sucursales]);

  const totalesPorClave = useMemo(() => {
    const mapa = new Map();
    const hoy = hoyLocal();
    for (const lote of lotes) {
      const cantidad = Number(lote.cantidadDisponible || 0);
      if (!Number.isFinite(cantidad) || cantidad <= 0) continue;
      const clave = `${lote.sucursalId}_${lote.productoId}`;
      const fila = mapa.get(clave) || { enLotes: 0, vendible: 0, vencido: 0 };
      // Incluimos TODOS los lotes existentes para no regularizar dos veces.
      fila.enLotes += cantidad;
      if (lote.estado === "ACTIVO" && fechaValida(lote.fechaVencimiento)) {
        if (lote.fechaVencimiento < hoy) fila.vencido += cantidad;
        else fila.vendible += cantidad;
      }
      mapa.set(clave, fila);
    }
    return mapa;
  }, [lotes]);

  const filas = useMemo(() => inventarios
    .map((inventario) => {
      const producto = productosPorId.get(inventario.productoId);
      const sucursal = sucursalesPorId.get(inventario.sucursalId);
      const controla = producto?.controlaVencimiento === true;
      const fisico = Number(inventario.stock || 0);
      const resumen = totalesPorClave.get(
        `${inventario.sucursalId}_${inventario.productoId}`
      ) || { enLotes: 0, vendible: 0, vencido: 0 };
      const descuadre = controla && lotesCargados &&
        resumen.enLotes > fisico + 0.000001;
      return {
        ...inventario, producto, sucursal, fisico,
        controlaVencimiento: controla,
        vendible: controla
          ? (lotesCargados ? Math.max(0, Math.min(fisico, resumen.vendible)) : null)
          : fisico,
        vencido: controla ? resumen.vencido : 0,
        sinLote: controla && lotesCargados
          ? redondear(Math.max(0, fisico - resumen.enLotes))
          : null,
        descuadre
      };
    })
    .filter((fila) => {
      if (filtroSucursal && fila.sucursalId !== filtroSucursal) return false;
      const texto = busqueda.toLowerCase().trim();
      return [fila.producto?.nombre, fila.producto?.sku, fila.sucursal?.nombre]
        .some((valor) => String(valor || "").toLowerCase().includes(texto));
    }), [inventarios, productosPorId, sucursalesPorId, totalesPorClave,
    lotesCargados, filtroSucursal, busqueda]);

  const lotesFiltrados = useMemo(() => lotes.filter((lote) => {
    if (filtroSucursalLotes && lote.sucursalId !== filtroSucursalLotes) return false;
    if (filtroEstado && lote.estadoVencimiento !== filtroEstado) return false;
    const texto = busquedaLotes.toLowerCase().trim();
    return [
      productosPorId.get(lote.productoId)?.nombre,
      lote.nombreProducto, lote.sku, lote.numeroLote,
      sucursalesPorId.get(lote.sucursalId)?.nombre
    ].some((valor) => String(valor || "").toLowerCase().includes(texto));
  }), [lotes, filtroSucursalLotes, filtroEstado, busquedaLotes,
    productosPorId, sucursalesPorId]);

  const stockTotal = inventarios.reduce(
    (total, inventario) => total + Number(inventario.stock || 0), 0
  );
  const stockBajo = inventarios.filter((inventario) =>
    Number(inventario.stock || 0) <=
      Number(productosPorId.get(inventario.productoId)?.stockMinimo || 0)
  ).length;
  const lotesVencidos = lotes.filter((lote) => lote.estadoVencimiento === "VENCIDO");
  const lotesPorVencer = lotes.filter((lote) => lote.estadoVencimiento === "POR_VENCER");
  const unidadesVencidas = lotesVencidos.reduce(
    (suma, lote) => suma + Number(lote.cantidadDisponible || 0), 0
  );
  const sinLoteTotal = filas.reduce((suma, fila) => suma + (fila.sinLote || 0), 0);
  const productosSinVencimiento = productos.filter(
    (producto) => producto.controlaVencimiento !== true
  );

  // G. AJUSTES DE STOCK PARA PRODUCTOS SIN VENCIMIENTO
  function abrirMovimiento(inventario = null) {
    if (inventario?.controlaVencimiento) {
      verLotes(inventario);
      return;
    }
    setErrorModal("");
    setFormulario({
      sucursalId: inventario?.sucursalId || "",
      productoId: inventario?.productoId || "",
      tipo: "ENTRADA", cantidad: "", motivo: ""
    });
    setMostrarMovimiento(true);
  }

  async function registrarMovimiento(evento) {
    evento.preventDefault();
    if (guardando) return;
    setGuardando(true);
    setErrorModal("");
    try {
      await ajustarStock({
        empresaId, ...formulario, usuarioId: usuario.uid
      });
      setMostrarMovimiento(false);
      setFormulario(formularioInicial);
      setMensaje("Movimiento de inventario registrado correctamente.");
    } catch (error) {
      console.error(error);
      setErrorModal(error.message || "No se pudo registrar el movimiento.");
    } finally {
      setGuardando(false);
    }
  }

  function verLotes(inventario) {
    setBusquedaLotes(inventario.producto?.nombre || "");
    setFiltroSucursalLotes(inventario.sucursalId);
    setFiltroEstado("");
    document.getElementById("seccion-lotes")?.scrollIntoView({ behavior: "smooth" });
  }

  // H. NUEVO: REGULARIZAR STOCK ANTIGUO SIN AUMENTAR EXISTENCIAS
  function abrirRegularizacion(fila) {
    setMensaje("");
    setErrorModal("");
    if (!lotesCargados || fila.sinLote === null) {
      setErrorGeneral("Primero carga correctamente los lotes.");
      return;
    }
    if (!fila.controlaVencimiento || fila.descuadre || fila.sinLote <= 0) {
      setErrorGeneral("Este producto no tiene existencias sin lote que regularizar.");
      return;
    }
    setFilaRegularizacion(fila);
    setRegularizacion(regularizacionInicial);
  }

  async function guardarRegularizacion(evento) {
    evento.preventDefault();
    if (guardando || !filaRegularizacion) return;
    setErrorModal("");

    const qty = Number(regularizacion.cantidad);
    const codigo = regularizacion.numeroLote.trim().toUpperCase();
    const fecha = regularizacion.fechaVencimiento;
    const motivo = regularizacion.motivo.trim();
    if (!codigo || codigo.length > 60) {
      setErrorModal("Escribe un número de lote entre 1 y 60 caracteres.");
      return;
    }
    if (!fechaValida(fecha)) {
      setErrorModal("La fecha del lote no es válida.");
      return;
    }
    if (!Number.isFinite(qty) || qty <= 0 ||
        qty > Number(filaRegularizacion.sinLote) + 0.000001) {
      setErrorModal(`Solo puedes regularizar hasta ${cantidadVisible(filaRegularizacion.sinLote)} unidades.`);
      return;
    }
    if (motivo.length < 5) {
      setErrorModal("Escribe un motivo de al menos 5 caracteres.");
      return;
    }

    const vencido = fecha < hoyLocal();
    const pregunta =
      `¿Confirmas asignar ${cantidadVisible(qty)} unidades físicas al lote ${codigo}?\n` +
      `Vencimiento: ${fechaVisible(fecha)}.\n\n` +
      "No se agregará stock: solo se identificarán existencias anteriores." +
      (vencido ? "\n\nATENCIÓN: este lote ya está vencido y no será vendible." : "");
    if (!window.confirm(pregunta)) return;

    setGuardando(true);
    try {
      await regularizarStockSinLote({
        empresaId,
        sucursalId: filaRegularizacion.sucursalId,
        productoId: filaRegularizacion.productoId,
        numeroLote: codigo,
        fechaVencimiento: fecha,
        cantidad: qty,
        motivo,
        usuarioId: usuario.uid
      });
      setFilaRegularizacion(null);
      setRegularizacion(regularizacionInicial);
      setMensaje(
        `Lote ${codigo} registrado con ${cantidadVisible(qty)} unidades existentes. El stock físico no aumentó.`
      );
      // La consulta se actualiza, pero no se vuelve a crear el lote.
      await cargarLotes();
    } catch (error) {
      console.error(error);
      setErrorModal(error.message || "No se pudo regularizar el lote.");
    } finally {
      setGuardando(false);
    }
  }

  // I. DAR DE BAJA UN LOTE VENCIDO
  function abrirBaja(lote) {
    if (lote.estadoVencimiento !== "VENCIDO" || Number(lote.cantidadDisponible) <= 0) return;
    setLoteBaja(lote);
    setCantidadBaja(String(lote.cantidadDisponible));
    setMotivoBaja("Retiro de productos vencidos");
    setErrorModal("");
  }

  async function confirmarBaja(evento) {
    evento.preventDefault();
    if (!loteBaja || guardando) return;
    setErrorModal("");
    const qty = Number(cantidadBaja);
    if (!Number.isFinite(qty) || qty <= 0 || qty > Number(loteBaja.cantidadDisponible)) {
      setErrorModal("La cantidad debe ser mayor que cero y no superar el stock del lote.");
      return;
    }
    if (motivoBaja.trim().length < 5) {
      setErrorModal("Escribe el motivo de la baja (mínimo 5 caracteres).");
      return;
    }
    if (!window.confirm(
      `¿Confirmas retirar ${cantidadVisible(qty)} unidades del lote ${loteBaja.numeroLote}?\nEsta operación descuenta stock y registra un movimiento.`
    )) return;

    setGuardando(true);
    try {
      await darDeBajaLoteVencido({
        empresaId, loteId: loteBaja.id, cantidad: qty,
        motivo: motivoBaja.trim(), usuarioId: usuario.uid
      });
      setLoteBaja(null);
      setMensaje(`Se retiraron ${cantidadVisible(qty)} unidades del lote ${loteBaja.numeroLote}.`);
      await cargarLotes();
    } catch (error) {
      console.error(error);
      setErrorModal(error.message || "No se pudo registrar la baja.");
    } finally {
      setGuardando(false);
    }
  }

  // J. INTERFAZ
  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1>Inventario</h1>
          <p>Existencias físicas, lotes, vencimientos y regularización por sucursal.</p>
        </div>
        <motion.button className="admin-primary-button" type="button"
          onClick={() => abrirMovimiento()} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <SlidersHorizontal size={18} /> Ajustar stock
        </motion.button>
      </div>

      {mensaje && <div className="admin-message success" style={{ marginBottom: 16 }}>{mensaje}</div>}
      {errorGeneral && <div className="admin-message error" style={{ marginBottom: 16 }}>{errorGeneral}</div>}

      <section className="admin-inventory-metrics">
        <article><Boxes size={21} /><div><span>Registros</span><strong>{inventarios.length}</strong></div></article>
        <article><ArrowDownToLine size={21} /><div><span>Stock físico</span><strong>{cantidadVisible(stockTotal)}</strong></div></article>
        <article className={stockBajo > 0 ? "warning" : ""}>
          <ArrowUpFromLine size={21} /><div><span>Stock bajo</span><strong>{stockBajo}</strong></div>
        </article>
        <article className={sinLoteTotal > 0 ? "warning" : ""}>
          <ClipboardCheck size={21} />
          <div><span>Unidades sin lote</span><strong>{lotesCargados ? cantidadVisible(sinLoteTotal) : "..."}</strong></div>
        </article>
      </section>

      {/* EXISTENCIAS POR SUCURSAL */}
      <section className="admin-card" style={{ marginTop: 20 }}>
        <div className="admin-card-header">
          <h2>Existencias por sucursal</h2>
          <p>Regularizar no aumenta stock. Las unidades sin lote no pueden venderse si el producto controla vencimientos.</p>
        </div>
        <div className="admin-toolbar admin-toolbar-wrap">
          <div className="admin-search">
            <Search size={18} />
            <input placeholder="Buscar producto, SKU o sucursal..." value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)} />
          </div>
          <select className="admin-filter-select" value={filtroSucursal}
            onChange={(e) => setFiltroSucursal(e.target.value)}>
            <option value="">Todas las sucursales</option>
            {sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </div>
        {cargando ? (
          <div className="admin-loading-box"><Boxes size={25} /> Cargando inventario...</div>
        ) : filas.length === 0 ? (
          <div className="admin-empty admin-empty-column"><Boxes size={35} /><strong>Sin existencias para mostrar.</strong></div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead><tr>
                <th>PRODUCTO</th><th>SUCURSAL</th><th>FÍSICO</th>
                <th>VENDIBLE</th><th>SIN LOTE</th><th>MÍNIMO</th><th>ACCIONES</th>
              </tr></thead>
              <tbody>
                {filas.map((fila) => (
                  <tr key={fila.id}>
                    <td><strong>{fila.producto?.nombre || "Producto"}</strong>
                      <div style={{ opacity: .65, fontSize: 11 }}>{fila.producto?.sku || "-"}</div>
                    </td>
                    <td>{fila.sucursal?.nombre || "Sucursal"}</td>
                    <td><strong>{cantidadVisible(fila.fisico)}</strong></td>
                    <td><strong style={{ color: fila.controlaVencimiento ? "#50e3b1" : "inherit" }}>
                      {fila.vendible === null ? "..." : cantidadVisible(fila.vendible)}
                    </strong></td>
                    <td>
                      {!fila.controlaVencimiento ? "No aplica" : fila.descuadre ? (
                        <span style={{ color: "#ff777d" }}>DESCUADRE</span>
                      ) : fila.sinLote === null ? "..." : (
                        <span style={{ color: fila.sinLote > 0 ? "#ffc36a" : "#50e3b1" }}>
                          {cantidadVisible(fila.sinLote)}
                        </span>
                      )}
                    </td>
                    <td>{cantidadVisible(fila.producto?.stockMinimo || 0)}</td>
                    <td>
                      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                        {fila.controlaVencimiento ? (
                          <>
                            <button type="button" className="admin-mini-button" onClick={() => verLotes(fila)}>Ver lotes</button>
                            {fila.sinLote > 0 && !fila.descuadre && (
                              <button type="button" className="admin-mini-button"
                                onClick={() => abrirRegularizacion(fila)} disabled={!lotesCargados || guardando}
                                style={{ color: "#ffc36a", borderColor: "rgba(255,195,106,.4)" }}>
                                <ClipboardCheck size={14} /> Regularizar
                              </button>
                            )}
                          </>
                        ) : (
                          <button type="button" className="admin-mini-button"
                            onClick={() => abrirMovimiento(fila)}>Ajustar</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* LOTES Y VENCIMIENTOS */}
      <section id="seccion-lotes" className="admin-card"
        style={{ marginTop: 22, scrollMarginTop: 24 }}>
        <div className="admin-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div>
            <h2><CalendarDays size={20} style={{ verticalAlign: "middle", marginRight: 8, color: "#a38aff" }} />Control de vencimientos</h2>
            <p>Lotes reales de compras y regularizaciones. La fecha de referencia del catálogo no reemplaza la del lote.</p>
          </div>
          <button type="button" className="admin-secondary-button" onClick={actualizarDatos}
            disabled={cargandoLotes || guardando}>
            <RefreshCw size={16} /> Actualizar
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Lotes registrados", valor: lotes.length, color: "#b9a1ff" },
            { label: "Lotes vencidos", valor: lotesVencidos.length, color: "#ff777d" },
            { label: "Por vencer", valor: lotesPorVencer.length, color: "#ffc36a" },
            { label: "Unidades vencidas", valor: cantidadVisible(unidadesVencidas), color: "#ff777d" }
          ].map((item) => (
            <div key={item.label} style={{ background: "rgba(111,84,219,.10)", border: "1px solid rgba(155,123,255,.25)", borderRadius: 14, padding: 16 }}>
              <span style={{ opacity: .75, fontSize: 12 }}>{item.label}</span>
              <div style={{ fontSize: 26, fontWeight: 800, color: item.color }}>
                {lotesCargados ? item.valor : "..."}
              </div>
            </div>
          ))}
        </div>
        <div style={{ background: "rgba(145,115,255,.09)", border: "1px solid rgba(145,115,255,.24)", borderRadius: 12, padding: 12, marginBottom: 18, fontSize: 12, lineHeight: 1.7 }}>
          <ShieldAlert size={16} style={{ verticalAlign: "middle", marginRight: 8 }} />
          <strong>Importante:</strong> Regularizar significa identificar unidades que ya existen físicamente: no genera compras ni suma stock.
          Utiliza únicamente números de lote y fechas reales verificadas. Un lote vencido no será vendible y podrá darse de baja.
        </div>
        <div className="admin-toolbar admin-toolbar-wrap" style={{ marginBottom: 14 }}>
          <div className="admin-search"><Search size={18} />
            <input placeholder="Buscar producto o lote..." value={busquedaLotes}
              onChange={(e) => setBusquedaLotes(e.target.value)} />
          </div>
          <select className="admin-filter-select" value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADOS).map(([clave, estado]) =>
              <option key={clave} value={clave}>{estado.texto}</option>
            )}
          </select>
          <select className="admin-filter-select" value={filtroSucursalLotes}
            onChange={(e) => setFiltroSucursalLotes(e.target.value)}>
            <option value="">Todas las sucursales</option>
            {sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </div>
        {cargandoLotes ? (
          <div className="admin-loading-box">Cargando lotes...</div>
        ) : !lotesCargados ? (
          <div className="admin-message error">No se pudieron consultar los lotes. Pulsa Actualizar y revisa los permisos.</div>
        ) : lotesFiltrados.length === 0 ? (
          <div className="admin-empty admin-empty-column"><CalendarDays size={34} />
            <strong>No hay lotes para mostrar.</strong>
            <span>Los lotes se crean desde Compras o mediante regularización de existencias anteriores.</span>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead><tr>
                <th>PRODUCTO</th><th>LOTE</th><th>SUCURSAL</th><th>VENCIMIENTO</th>
                <th>DISPONIBLE</th><th>RETIRADO</th><th>ESTADO</th><th>ACCIÓN</th>
              </tr></thead>
              <tbody>
                {lotesFiltrados.map((lote) => {
                  const estilo = ESTADOS[lote.estadoVencimiento] || ESTADOS.FECHA_INVALIDA;
                  return (
                    <tr key={lote.id}>
                      <td><strong>{productosPorId.get(lote.productoId)?.nombre || lote.nombreProducto || "Producto"}</strong></td>
                      <td><span className="admin-code-chip">{lote.numeroLote || "-"}</span></td>
                      <td>{sucursalesPorId.get(lote.sucursalId)?.nombre || "Sucursal"}</td>
                      <td>{fechaVisible(lote.fechaVencimiento)}</td>
                      <td><strong>{cantidadVisible(lote.cantidadDisponible)}</strong></td>
                      <td>{cantidadVisible(lote.cantidadRetirada)}</td>
                      <td><span style={{ color: estilo.color, background: estilo.fondo,
                        padding: "6px 9px", borderRadius: 8, fontSize: 11, fontWeight: 750, whiteSpace: "nowrap" }}>
                        {estilo.texto}
                      </span></td>
                      <td>{lote.estadoVencimiento === "VENCIDO" &&
                          Number(lote.cantidadDisponible) > 0 ? (
                        <button type="button" className="admin-mini-button"
                          onClick={() => abrirBaja(lote)} disabled={guardando}
                          style={{ color: "#ff8589", borderColor: "rgba(255,100,110,.35)" }}>
                          <Trash2 size={14} /> Dar de baja
                        </button>
                      ) : <span style={{ opacity: .6, fontSize: 12 }}>Sin acción</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* MODALES */}
      <AnimatePresence>
        {mostrarMovimiento && (
          <motion.div className="admin-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="admin-modal" initial={{ opacity: 0, y: 20, scale: .96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}>
              <div className="admin-modal-header">
                <div><h2>Movimiento de inventario</h2>
                  <p>Solo para productos sin control de vencimiento.</p></div>
                <button type="button" disabled={guardando} onClick={() => setMostrarMovimiento(false)}><X size={20} /></button>
              </div>
              <form onSubmit={registrarMovimiento}>
                <div className="admin-form-grid">
                  <div className="admin-form-group"><label>Sucursal *</label>
                    <select required value={formulario.sucursalId}
                      onChange={(e) => setFormulario((f) => ({ ...f, sucursalId: e.target.value }))}>
                      <option value="">Seleccionar</option>
                      {sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                    </select>
                  </div>
                  <div className="admin-form-group"><label>Producto *</label>
                    <select required value={formulario.productoId}
                      onChange={(e) => setFormulario((f) => ({ ...f, productoId: e.target.value }))}>
                      <option value="">Seleccionar</option>
                      {productosSinVencimiento.map((p) =>
                        <option key={p.id} value={p.id}>{p.sku} - {p.nombre}</option>
                      )}
                    </select>
                  </div>
                  <div className="admin-form-group"><label>Tipo *</label>
                    <select value={formulario.tipo}
                      onChange={(e) => setFormulario((f) => ({ ...f, tipo: e.target.value }))}>
                      <option value="ENTRADA">Entrada</option>
                      <option value="SALIDA">Salida</option>
                      <option value="AJUSTE_POSITIVO">Ajuste positivo</option>
                      <option value="AJUSTE_NEGATIVO">Ajuste negativo</option>
                    </select>
                  </div>
                  <div className="admin-form-group"><label>Cantidad *</label>
                    <input type="number" required min="0.01" step="0.01"
                      value={formulario.cantidad}
                      onChange={(e) => setFormulario((f) => ({ ...f, cantidad: e.target.value }))} />
                  </div>
                  <div className="admin-form-group full"><label>Motivo</label>
                    <textarea value={formulario.motivo}
                      onChange={(e) => setFormulario((f) => ({ ...f, motivo: e.target.value }))} />
                  </div>
                </div>
                {errorModal && <div className="admin-message error">{errorModal}</div>}
                <div className="admin-modal-footer">
                  <button type="button" className="admin-secondary-button" disabled={guardando}
                    onClick={() => setMostrarMovimiento(false)}>Cancelar</button>
                  <button type="submit" className="admin-primary-button" disabled={guardando}>
                    {guardando ? "Procesando..." : "Registrar movimiento"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* NUEVO: FORMULARIO DE REGULARIZACIÓN */}
        {filaRegularizacion && (
          <motion.div className="admin-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="admin-modal" initial={{ opacity: 0, y: 20, scale: .96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}>
              <div className="admin-modal-header">
                <div><h2><ClipboardCheck size={20} style={{ verticalAlign: "middle", marginRight: 8, color: "#ffc36a" }} />Regularizar stock sin lote</h2>
                  <p>Asigna un lote real a existencias anteriores sin sumar unidades.</p></div>
                <button type="button" disabled={guardando} onClick={() => setFilaRegularizacion(null)}><X size={20} /></button>
              </div>
              <form onSubmit={guardarRegularizacion}>
                <div style={{ padding: 14, borderRadius: 12, background: "rgba(255,186,80,.08)",
                  border: "1px solid rgba(255,186,80,.28)", marginBottom: 16 }}>
                  <strong>{filaRegularizacion.producto?.nombre || "Producto"}</strong>
                  <div style={{ fontSize: 13, marginTop: 5 }}>
                    Sucursal: {filaRegularizacion.sucursal?.nombre || "Sucursal"}
                  </div>
                  <div style={{ fontSize: 13, marginTop: 5 }}>
                    Stock físico: <b>{cantidadVisible(filaRegularizacion.fisico)}</b>
                    {" · "}Pendiente sin lote: <b style={{ color: "#ffc36a" }}>{cantidadVisible(filaRegularizacion.sinLote)}</b>
                  </div>
                </div>
                <div className="admin-form-grid">
                  <div className="admin-form-group"><label>Número de lote real *</label>
                    <input required maxLength={60} placeholder="Ej.: L001-2026"
                      value={regularizacion.numeroLote}
                      onChange={(e) => setRegularizacion((f) => ({ ...f, numeroLote: e.target.value }))} />
                  </div>
                  <div className="admin-form-group"><label>Vencimiento real *</label>
                    <input required type="date" value={regularizacion.fechaVencimiento}
                      onChange={(e) => setRegularizacion((f) => ({ ...f, fechaVencimiento: e.target.value }))} />
                  </div>
                  <div className="admin-form-group full"><label>Cantidad a asociar (máximo {cantidadVisible(filaRegularizacion.sinLote)}) *</label>
                    <input required type="number" min="0.01" step="0.01"
                      max={filaRegularizacion.sinLote}
                      value={regularizacion.cantidad}
                      onChange={(e) => setRegularizacion((f) => ({ ...f, cantidad: e.target.value }))} />
                  </div>
                  <div className="admin-form-group full"><label>Motivo / origen del lote *</label>
                    <textarea required minLength={5} value={regularizacion.motivo}
                      onChange={(e) => setRegularizacion((f) => ({ ...f, motivo: e.target.value }))} />
                  </div>
                </div>
                {regularizacion.fechaVencimiento &&
                  fechaValida(regularizacion.fechaVencimiento) &&
                  regularizacion.fechaVencimiento < hoyLocal() && (
                  <div className="admin-message error">
                    <AlertTriangle size={16} /> Esta fecha ya venció. El lote se registrará, pero sus unidades no podrán venderse.
                  </div>
                )}
                {errorModal && <div className="admin-message error">{errorModal}</div>}
                <div className="admin-modal-footer">
                  <button type="button" className="admin-secondary-button" disabled={guardando}
                    onClick={() => setFilaRegularizacion(null)}>Cancelar</button>
                  <button type="submit" className="admin-primary-button" disabled={guardando}>
                    {guardando ? "Guardando..." : "Registrar lote existente"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* BAJA DE LOTE VENCIDO */}
        {loteBaja && (
          <motion.div className="admin-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="admin-modal" initial={{ opacity: 0, y: 20, scale: .96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}>
              <div className="admin-modal-header">
                <div><h2><Trash2 size={20} style={{ verticalAlign: "middle", marginRight: 8, color: "#ff777d" }} />Dar de baja lote vencido</h2>
                  <p>Descuenta el stock físico y guarda el movimiento.</p></div>
                <button type="button" disabled={guardando} onClick={() => setLoteBaja(null)}><X size={20} /></button>
              </div>
              <form onSubmit={confirmarBaja}>
                <div style={{ padding: 14, borderRadius: 12, background: "rgba(255,95,110,.09)",
                  border: "1px solid rgba(255,95,110,.24)", marginBottom: 16 }}>
                  <strong>{productosPorId.get(loteBaja.productoId)?.nombre || loteBaja.nombreProducto}</strong>
                  <div style={{ fontSize: 13, marginTop: 6 }}>
                    Lote: {loteBaja.numeroLote} · Venció: {fechaVisible(loteBaja.fechaVencimiento)}
                  </div>
                  <div style={{ fontSize: 13, marginTop: 6 }}>
                    Unidades pendientes de retirar: <b>{cantidadVisible(loteBaja.cantidadDisponible)}</b>
                  </div>
                </div>
                <div className="admin-form-grid">
                  <div className="admin-form-group full"><label>Cantidad a retirar *</label>
                    <input required type="number" min="0.01" step="0.01"
                      max={loteBaja.cantidadDisponible} value={cantidadBaja}
                      onChange={(e) => setCantidadBaja(e.target.value)} />
                  </div>
                  <div className="admin-form-group full"><label>Motivo de baja *</label>
                    <textarea required minLength={5} value={motivoBaja}
                      onChange={(e) => setMotivoBaja(e.target.value)} />
                  </div>
                </div>
                {errorModal && <div className="admin-message error">{errorModal}</div>}
                <div className="admin-modal-footer">
                  <button type="button" className="admin-secondary-button" disabled={guardando}
                    onClick={() => setLoteBaja(null)}>Cancelar</button>
                  <button type="submit" className="admin-primary-button" disabled={guardando}>
                    <Trash2 size={16} /> {guardando ? "Retirando..." : "Confirmar baja"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
