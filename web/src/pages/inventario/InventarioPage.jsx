import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import mensajeError from "../../utils/mensajeError";
import {
  AlertTriangle,
  Boxes,
  CalendarClock,
  Check,
  ChevronDown,
  ClipboardCheck,
  Info,
  Layers,
  PackageX,
  RefreshCw,
  Search,
  ShoppingBag,
  Trash2,
  X
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";

import useAuth from "../../hooks/useAuth";
import useConfirmar from "../../hooks/useConfirmar";
import {
  ajustarStock,
  darDeBajaLoteVencido,
  listarLotesInventario,
  obtenerCatalogosInventario,
  regularizarStockSinLote,
  suscribirInventario
} from "../../services/inventarioService";
import { sonidoExito } from "../../utils/sonidos";

import "../../styles/roles-empresa.css";
import "../../styles/trabajadores-empresa.css";
import "../../styles/inventario-empresa.css";

// ==========================================
// A. DATOS INICIALES
// ==========================================

const formularioInicial = {
  sucursalId: "",
  productoId: "",
  tipo: "SALIDA",
  cantidad: "",
  motivo: ""
};

const regularizacionInicial = {
  numeroLote: "",
  fechaVencimiento: "",
  cantidad: "",
  motivo: "Conteo fisico de existencias antiguas"
};

const ESTADOS = {
  VIGENTE: "Vigente",
  POR_VENCER: "Por vencer",
  VENCIDO: "Vencido",
  SIN_EXISTENCIAS: "Agotado",
  FECHA_INVALIDA: "Fecha inválida"
};

// El stock NUNCA entra desde aquí: las entradas se hacen en Compras.
const TIPOS = [
  { valor: "SALIDA", texto: "Retiro (rotura, pérdida o uso propio)" },
  { valor: "AJUSTE_NEGATIVO", texto: "Corrección del conteo (faltan unidades)" }
];

// ==========================================
// B. FUNCIONES SENCILLAS
// ==========================================

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
  return !Number.isNaN(convertida.getTime()) && convertida.toISOString().slice(0, 10) === fecha;
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

function normalizar(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// ==========================================
// C. PÁGINA PRINCIPAL
// ==========================================

export default function InventarioPage() {
  const { usuario } = useAuth();
  const confirmar = useConfirmar();
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
  const [catalogosListos, setCatalogosListos] = useState(false);
  const [lotesCargados, setLotesCargados] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState("");
  const [errorModal, setErrorModal] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [mostrarMovimiento, setMostrarMovimiento] = useState(false);
  const [filaMovimiento, setFilaMovimiento] = useState(null);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [loteBaja, setLoteBaja] = useState(null);
  const [cantidadBaja, setCantidadBaja] = useState("");
  const [motivoBaja, setMotivoBaja] = useState("Retiro de productos vencidos");

  // Asignar lotes a existencias antiguas
  const [filaRegularizacion, setFilaRegularizacion] = useState(null);
  const [regularizacion, setRegularizacion] = useState(regularizacionInicial);

  // ------------------------------------------
  // D. Actualizar lotes sin reiniciar la página
  // ------------------------------------------
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
        setErrorGeneral(mensajeError(error, "No se pudieron cargar los lotes."));
        setLotesCargados(false);
      }
      throw error;
    } finally {
      if (solicitud === solicitudLotes.current) setCargandoLotes(false);
    }
  }, [empresaId]);

  // ------------------------------------------
  // E. Cargar existencias, productos y sucursales
  // ------------------------------------------
  useEffect(() => {
    if (!empresaId) return undefined;

    let activo = true;

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
        setCatalogosListos(true);
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

  useEffect(() => {
    if (!mensaje) return undefined;
    const temporizador = setTimeout(() => setMensaje(""), 5000);
    return () => clearTimeout(temporizador);
  }, [mensaje]);

  async function actualizarDatos() {
    setErrorGeneral("");
    try {
      const datos = await obtenerCatalogosInventario(empresaId);
      setProductos(datos.productos || []);
      setSucursales(datos.sucursales || []);
      await cargarLotes();
    } catch (error) {
      console.error(error);
      setErrorGeneral(mensajeError(error, "No se pudo actualizar el inventario."));
    }
  }

  // ------------------------------------------
  // F. Preparar existencias y lotes por producto/sucursal
  // ------------------------------------------
  const productosPorId = useMemo(() => new Map(productos.map((producto) => [producto.id, producto])), [productos]);
  const sucursalesPorId = useMemo(() => new Map(sucursales.map((sucursal) => [sucursal.id, sucursal])), [sucursales]);

  const totalesPorClave = useMemo(() => {
    const mapa = new Map();
    const hoy = hoyLocal();
    for (const lote of lotes) {
      const cantidad = Number(lote.cantidadDisponible || 0);
      if (!Number.isFinite(cantidad) || cantidad <= 0) continue;
      const clave = `${lote.sucursalId}_${lote.productoId}`;
      const fila = mapa.get(clave) || { enLotes: 0, vendible: 0, vencido: 0 };
      // Se incluyen TODOS los lotes existentes para no regularizar dos veces.
      fila.enLotes += cantidad;
      if (lote.estado === "ACTIVO" && fechaValida(lote.fechaVencimiento)) {
        if (lote.fechaVencimiento < hoy) fila.vencido += cantidad;
        else fila.vendible += cantidad;
      }
      mapa.set(clave, fila);
    }
    return mapa;
  }, [lotes]);

  // Existencias de productos que ya no existen (o están desactivados): no se muestran
  const filasBase = useMemo(
    () =>
      inventarios
        .map((inventario) => {
          const producto = productosPorId.get(inventario.productoId);
          const sucursal = sucursalesPorId.get(inventario.sucursalId);
          const controla = producto?.controlaVencimiento === true;
          const fisico = Number(inventario.stock || 0);
          const resumen = totalesPorClave.get(`${inventario.sucursalId}_${inventario.productoId}`) || {
            enLotes: 0,
            vendible: 0,
            vencido: 0
          };
          const descuadre = controla && lotesCargados && resumen.enLotes > fisico + 0.000001;
          return {
            ...inventario,
            producto,
            sucursal,
            fisico,
            controlaVencimiento: controla,
            vendible: controla ? (lotesCargados ? Math.max(0, Math.min(fisico, resumen.vendible)) : null) : fisico,
            vencido: controla ? resumen.vencido : 0,
            sinLote: controla && lotesCargados ? redondear(Math.max(0, fisico - resumen.enLotes)) : null,
            descuadre
          };
        })
        .filter((fila) => !catalogosListos || fila.producto),
    [inventarios, productosPorId, sucursalesPorId, totalesPorClave, lotesCargados, catalogosListos]
  );

  const ocultas = catalogosListos ? inventarios.length - filasBase.length : 0;

  const filas = useMemo(
    () =>
      filasBase.filter((fila) => {
        if (filtroSucursal && fila.sucursalId !== filtroSucursal) return false;
        const texto = normalizar(busqueda);
        return (
          !texto ||
          [fila.producto?.nombre, fila.producto?.sku, fila.sucursal?.nombre].some((valor) =>
            normalizar(valor).includes(texto)
          )
        );
      }),
    [filasBase, filtroSucursal, busqueda]
  );

  const lotesVisibles = useMemo(
    () => lotes.filter((lote) => !catalogosListos || productosPorId.has(lote.productoId)),
    [lotes, productosPorId, catalogosListos]
  );

  const lotesFiltrados = useMemo(
    () =>
      lotesVisibles.filter((lote) => {
        if (filtroSucursalLotes && lote.sucursalId !== filtroSucursalLotes) return false;
        if (filtroEstado && lote.estadoVencimiento !== filtroEstado) return false;
        const texto = normalizar(busquedaLotes);
        return (
          !texto ||
          [
            productosPorId.get(lote.productoId)?.nombre,
            lote.nombreProducto,
            lote.sku,
            lote.numeroLote,
            sucursalesPorId.get(lote.sucursalId)?.nombre
          ].some((valor) => normalizar(valor).includes(texto))
        );
      }),
    [lotesVisibles, filtroSucursalLotes, filtroEstado, busquedaLotes, productosPorId, sucursalesPorId]
  );

  const stockTotal = filasBase.reduce((total, fila) => total + fila.fisico, 0);
  const stockBajo = filasBase.filter((fila) => fila.fisico <= Number(fila.producto?.stockMinimo || 0)).length;
  const lotesVencidos = lotesVisibles.filter((lote) => lote.estadoVencimiento === "VENCIDO");
  const lotesPorVencer = lotesVisibles.filter((lote) => lote.estadoVencimiento === "POR_VENCER");
  const unidadesVencidas = lotesVencidos.reduce((suma, lote) => suma + Number(lote.cantidadDisponible || 0), 0);

  // Stock actual del producto elegido en el formulario de movimiento
  const stockElegido = useMemo(() => {
    if (!formulario.sucursalId || !formulario.productoId) return null;
    const fila = inventarios.find(
      (item) => item.sucursalId === formulario.sucursalId && item.productoId === formulario.productoId
    );
    return Number(fila?.stock || 0);
  }, [formulario.sucursalId, formulario.productoId, inventarios]);

  // ------------------------------------------
  // G. Ajustes de stock para productos sin vencimiento
  // ------------------------------------------
  function abrirMovimiento(inventario) {
    if (!inventario) return;
    if (inventario.controlaVencimiento) {
      verLotes(inventario);
      return;
    }
    setErrorModal("");
    setFilaMovimiento(inventario);
    setFormulario({
      sucursalId: inventario.sucursalId,
      productoId: inventario.productoId,
      tipo: "SALIDA",
      cantidad: "",
      motivo: ""
    });
    setMostrarMovimiento(true);
  }

  const cantidadMovimiento = Number(formulario.cantidad);
  const saleStock = formulario.tipo === "SALIDA" || formulario.tipo === "AJUSTE_NEGATIVO";
  const sinStockSuficiente = saleStock && stockElegido !== null && cantidadMovimiento > stockElegido;

  async function registrarMovimiento(evento) {
    evento.preventDefault();
    if (guardando) return;
    setErrorModal("");

    if (!Number.isFinite(cantidadMovimiento) || cantidadMovimiento <= 0) {
      setErrorModal("Escribe una cantidad mayor que cero.");
      return;
    }

    if (sinStockSuficiente) {
      setErrorModal(`Solo hay ${cantidadVisible(stockElegido)} unidades. No puedes retirar más.`);
      return;
    }

    if (formulario.motivo.trim().length < 5) {
      setErrorModal("Cuenta qué pasó (mínimo 5 letras). Así queda claro por qué baja el stock.");
      return;
    }

    setGuardando(true);
    try {
      await ajustarStock({ empresaId, ...formulario, usuarioId: usuario.uid });
      setMostrarMovimiento(false);
      setFilaMovimiento(null);
      setFormulario(formularioInicial);
      setMensaje("Listo: el stock se descontó y quedó registrado en Movimientos.");
      sonidoExito();
    } catch (error) {
      console.error(error);
      setErrorModal(mensajeError(error, "No se pudo registrar el movimiento."));
    } finally {
      setGuardando(false);
    }
  }

  function verLotes(inventario) {
    setBusquedaLotes(inventario.producto?.nombre || "");
    setFiltroSucursalLotes(inventario.sucursalId);
    setFiltroEstado("");
    document.getElementById("seccion-lotes")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
    });
  }

  // ------------------------------------------
  // H. Regularizar stock antiguo sin aumentar existencias
  // ------------------------------------------
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
    if (!Number.isFinite(qty) || qty <= 0 || qty > Number(filaRegularizacion.sinLote) + 0.000001) {
      setErrorModal(`Solo puedes regularizar hasta ${cantidadVisible(filaRegularizacion.sinLote)} unidades.`);
      return;
    }
    if (motivo.length < 5) {
      setErrorModal("Escribe un motivo de al menos 5 caracteres.");
      return;
    }

    const vencido = fecha < hoyLocal();
    const confirmado = await confirmar({
      titulo: "Asignar lote",
      mensaje:
        `Vas a asignar ${cantidadVisible(qty)} unidades al lote ${codigo}, que vence el ${fechaVisible(fecha)}. ` +
        "No se agrega stock: solo se identifican existencias anteriores." +
        (vencido ? " Ojo: ese lote ya venció y no se podrá vender." : ""),
      accion: "Asignar lote",
      peligro: vencido
    });
    if (!confirmado) return;

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
      setMensaje(`Lote ${codigo} registrado con ${cantidadVisible(qty)} unidades. El stock físico no cambió.`);
      sonidoExito();
      await cargarLotes();
    } catch (error) {
      console.error(error);
      setErrorModal(mensajeError(error, "No se pudo regularizar el lote."));
    } finally {
      setGuardando(false);
    }
  }

  // ------------------------------------------
  // I. Dar de baja un lote vencido
  // ------------------------------------------
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
      setErrorModal("La cantidad debe ser mayor que cero y no superar lo que queda del lote.");
      return;
    }
    if (motivoBaja.trim().length < 5) {
      setErrorModal("Escribe el motivo de la baja (mínimo 5 letras).");
      return;
    }

    const confirmado = await confirmar({
      titulo: "Dar de baja",
      mensaje: `Se retirarán ${cantidadVisible(qty)} unidades del lote ${loteBaja.numeroLote}. Se descuentan del stock y queda registrado.`,
      accion: "Dar de baja",
      peligro: true
    });
    if (!confirmado) return;

    setGuardando(true);
    try {
      await darDeBajaLoteVencido({
        empresaId,
        loteId: loteBaja.id,
        cantidad: qty,
        motivo: motivoBaja.trim(),
        usuarioId: usuario.uid
      });
      setLoteBaja(null);
      setMensaje(`Se retiraron ${cantidadVisible(qty)} unidades del lote ${loteBaja.numeroLote}.`);
      sonidoExito();
      await cargarLotes();
    } catch (error) {
      console.error(error);
      setErrorModal(mensajeError(error, "No se pudo registrar la baja."));
    } finally {
      setGuardando(false);
    }
  }

  // Escape cierra la ventana abierta
  useEffect(() => {
    if (!mostrarMovimiento && !loteBaja && !filaRegularizacion) return undefined;

    const alTeclear = (evento) => {
      if (evento.key !== "Escape" || guardando) return;
      setMostrarMovimiento(false);
      setLoteBaja(null);
      setFilaRegularizacion(null);
    };

    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [mostrarMovimiento, loteBaja, filaRegularizacion, guardando]);

  // ------------------------------------------
  // J. Interfaz
  // ------------------------------------------
  const metricas = [
    { titulo: "Unidades en stock", valor: cantidadVisible(stockTotal), nota: `${filasBase.length} registros`, icono: Boxes, tono: "" },
    {
      titulo: "Stock bajo",
      valor: stockBajo,
      nota: stockBajo ? "revisa y repone" : "todo en orden",
      icono: AlertTriangle,
      tono: stockBajo ? "alerta" : ""
    },
    {
      titulo: "Vencen pronto",
      valor: lotesPorVencer.length,
      nota: lotesPorVencer.length === 1 ? "lote" : "lotes",
      icono: CalendarClock,
      tono: lotesPorVencer.length ? "alerta" : ""
    },
    {
      titulo: "Vencidas",
      valor: cantidadVisible(unidadesVencidas),
      nota: unidadesVencidas ? "unidades por dar de baja" : "sin pérdidas",
      icono: PackageX,
      tono: unidadesVencidas ? "peligro" : ""
    }
  ];

  return (
    <div className="re inv">
      <header className="re-cabecera">
        <div>
          <h1>Inventario</h1>
          <p>Lo que tienes en cada sucursal, sus lotes y sus vencimientos.</p>
        </div>

        <div className="inv-acciones">
          <button type="button" className="re-boton re-boton--suave" onClick={actualizarDatos} disabled={cargandoLotes}>
            <RefreshCw size={17} className={cargandoLotes ? "pv-gira" : ""} />
            Actualizar
          </button>
          <Link to="/compras" className="re-boton">
            <ShoppingBag size={17} />
            Registrar compra
          </Link>
        </div>
      </header>

      {mensaje && (
        <div className="re-aviso re-aviso--ok" role="status">
          <Check size={18} />
          {mensaje}
        </div>
      )}

      {errorGeneral && (
        <div className="re-aviso re-aviso--error" role="alert">
          {errorGeneral}
        </div>
      )}

      <section className="inv-metricas" aria-label="Resumen">
        {metricas.map(({ titulo, valor, nota, icono: Icono, tono }) => (
          <article className="inv-metrica" data-tono={tono} key={titulo}>
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

      <div className="re-aviso inv-guia">
        <Info size={18} />
        <span>
          <b>El stock entra desde Compras</b>, eligiendo a tu proveedor (y el lote y la fecha de vencimiento si el producto
          vence). Aquí solo ves lo que hay y <b>retiras o das de baja</b> lo que se pierde o se vence.
        </span>
      </div>

      <section className="inv-bloque" aria-label="Existencias por sucursal">
        <header className="inv-bloque__cabecera">
          <div>
            <h2>
              <Boxes size={20} aria-hidden="true" /> Existencias por sucursal
            </h2>
            <p>Cuánto hay de cada producto. Los que tienen lotes se ajustan desde sus lotes.</p>
          </div>
        </header>

        <div className="re-herramientas">
          <label className="re-busqueda">
            <Search size={19} aria-hidden="true" />
            <input
              type="search"
              placeholder="Buscar producto, código o sucursal…"
              aria-label="Buscar en las existencias"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </label>

          <label className="tr-selector">
            <select value={filtroSucursal} onChange={(e) => setFiltroSucursal(e.target.value)} aria-label="Filtrar por sucursal">
              <option value="">Todas las sucursales</option>
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
            <ChevronDown size={17} aria-hidden="true" />
          </label>

          <span className="re-contador">
            {filas.length} {filas.length === 1 ? "registro" : "registros"}
          </span>
        </div>

        {cargando ? (
          <div className="re-vacio">Cargando existencias…</div>
        ) : filas.length === 0 ? (
          <div className="re-vacio">
            <Boxes size={34} />
            <strong>{filasBase.length === 0 ? "Todavía no hay existencias" : "No encontramos resultados"}</strong>
            <span>
              {filasBase.length === 0
                ? "Cuando registres una compra, tus productos aparecerán aquí con su stock."
                : "Prueba con otra búsqueda o cambia la sucursal."}
            </span>
          </div>
        ) : (
          <div className="inv-tabla-caja">
            <table className="inv-tabla">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Sucursal</th>
                  <th className="inv-der">Físico</th>
                  <th className="inv-der">Para vender</th>
                  <th className="inv-der">Sin lote</th>
                  <th className="inv-der">Mínimo</th>
                  <th className="inv-der">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((fila) => {
                  const bajo = fila.fisico <= Number(fila.producto?.stockMinimo || 0);

                  return (
                    <tr key={fila.id}>
                      <td data-label="Producto">
                        <div className="inv-celda">
                          <strong>{fila.producto?.nombre}</strong>
                          <small>
                            {fila.producto?.sku || "Sin código"}
                            {fila.controlaVencimiento && " · Por lotes"}
                          </small>
                        </div>
                      </td>
                      <td data-label="Sucursal">{fila.sucursal?.nombre || "Sucursal"}</td>
                      <td data-label="Físico" className="inv-der">
                        <strong data-bajo={bajo}>{cantidadVisible(fila.fisico)}</strong>
                        {bajo && <small className="inv-bajo">Stock bajo</small>}
                      </td>
                      <td data-label="Para vender" className="inv-der">
                        {fila.vendible === null ? "…" : cantidadVisible(fila.vendible)}
                        {fila.vencido > 0 && <small className="inv-vencido">{cantidadVisible(fila.vencido)} vencidas</small>}
                      </td>
                      <td data-label="Sin lote" className="inv-der">
                        {fila.controlaVencimiento ? (
                          fila.descuadre ? (
                            <span className="inv-pastilla" data-tono="peligro">
                              Revisar
                            </span>
                          ) : (
                            cantidadVisible(fila.sinLote || 0)
                          )
                        ) : (
                          <span className="inv-sin">No aplica</span>
                        )}
                      </td>
                      <td data-label="Mínimo" className="inv-der">
                        {cantidadVisible(fila.producto?.stockMinimo || 0)}
                      </td>
                      <td data-label="Acciones" className="inv-der">
                        <div className="inv-fila-acciones">
                          {fila.controlaVencimiento ? (
                            <>
                              <button type="button" className="re-boton re-boton--suave re-boton--chico" onClick={() => verLotes(fila)}>
                                <Layers size={15} />
                                Ver lotes
                              </button>
                              {fila.sinLote > 0 && !fila.descuadre && (
                                <button
                                  type="button"
                                  className="re-boton re-boton--suave re-boton--chico"
                                  onClick={() => abrirRegularizacion(fila)}
                                  title="Asignar lote a existencias antiguas"
                                >
                                  <ClipboardCheck size={15} />
                                  Asignar lote
                                </button>
                              )}
                            </>
                          ) : (
                            <button type="button" className="re-boton re-boton--suave re-boton--chico" onClick={() => abrirMovimiento(fila)}>
                              <PackageX size={15} />
                              Retirar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {ocultas > 0 && (
          <p className="inv-nota">
            <Info size={15} aria-hidden="true" /> Se ocultaron {ocultas} {ocultas === 1 ? "registro" : "registros"} de productos que ya
            no existen o están desactivados.
          </p>
        )}
      </section>

      <section className="inv-bloque" id="seccion-lotes" aria-label="Control de vencimientos">
        <header className="inv-bloque__cabecera">
          <div>
            <h2>
              <CalendarClock size={20} aria-hidden="true" /> Control de vencimientos
            </h2>
            <p>Cada compra crea un lote con su fecha. Se vende primero el que vence antes.</p>
          </div>
        </header>

        <div className="inv-resumen-lotes">
          <span>
            <b>{lotesVisibles.length}</b> lotes
          </span>
          <span data-tono="alerta" data-vacio={lotesPorVencer.length === 0}>
            <b>{lotesPorVencer.length}</b> por vencer
          </span>
          <span data-tono="peligro" data-vacio={lotesVencidos.length === 0}>
            <b>{lotesVencidos.length}</b> vencidos · {cantidadVisible(unidadesVencidas)} unidades
          </span>
        </div>

        <div className="re-herramientas">
          <label className="re-busqueda">
            <Search size={19} aria-hidden="true" />
            <input
              type="search"
              placeholder="Buscar producto o lote…"
              aria-label="Buscar lotes"
              value={busquedaLotes}
              onChange={(e) => setBusquedaLotes(e.target.value)}
            />
          </label>

          <label className="tr-selector">
            <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} aria-label="Filtrar por estado del lote">
              <option value="">Todos los estados</option>
              <option value="VIGENTE">Vigentes</option>
              <option value="POR_VENCER">Por vencer</option>
              <option value="VENCIDO">Vencidos</option>
              <option value="SIN_EXISTENCIAS">Agotados</option>
            </select>
            <ChevronDown size={17} aria-hidden="true" />
          </label>

          <label className="tr-selector">
            <select
              value={filtroSucursalLotes}
              onChange={(e) => setFiltroSucursalLotes(e.target.value)}
              aria-label="Filtrar lotes por sucursal"
            >
              <option value="">Todas las sucursales</option>
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
            <ChevronDown size={17} aria-hidden="true" />
          </label>

          {(busquedaLotes || filtroEstado || filtroSucursalLotes) && (
            <button
              type="button"
              className="re-chip"
              onClick={() => {
                setBusquedaLotes("");
                setFiltroEstado("");
                setFiltroSucursalLotes("");
              }}
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {cargandoLotes ? (
          <div className="re-vacio">Cargando lotes…</div>
        ) : !lotesCargados ? (
          <div className="re-aviso re-aviso--error">
            No se pudieron consultar los lotes. Pulsa «Actualizar» y revisa tus permisos.
          </div>
        ) : lotesFiltrados.length === 0 ? (
          <div className="re-vacio">
            <CalendarClock size={34} />
            <strong>No hay lotes para mostrar</strong>
            <span>Los lotes se crean al registrar una compra de un producto con vencimiento.</span>
          </div>
        ) : (
          <div className="inv-tabla-caja">
            <table className="inv-tabla">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Lote</th>
                  <th>Sucursal</th>
                  <th>Vence</th>
                  <th className="inv-der">Quedan</th>
                  <th className="inv-der">Retiradas</th>
                  <th>Estado</th>
                  <th className="inv-der">Acción</th>
                </tr>
              </thead>
              <tbody>
                {lotesFiltrados.map((lote) => {
                  const puedeBaja = lote.estadoVencimiento === "VENCIDO" && Number(lote.cantidadDisponible) > 0;

                  return (
                    <tr key={lote.id} data-estado={lote.estadoVencimiento}>
                      <td data-label="Producto">
                        <strong>{productosPorId.get(lote.productoId)?.nombre || lote.nombreProducto || "Producto"}</strong>
                      </td>
                      <td data-label="Lote">
                        <span className="inv-codigo">{lote.numeroLote || "—"}</span>
                      </td>
                      <td data-label="Sucursal">{sucursalesPorId.get(lote.sucursalId)?.nombre || "Sucursal"}</td>
                      <td data-label="Vence">{fechaVisible(lote.fechaVencimiento)}</td>
                      <td data-label="Quedan" className="inv-der">
                        <strong>{cantidadVisible(lote.cantidadDisponible)}</strong>
                      </td>
                      <td data-label="Retiradas" className="inv-der">
                        {cantidadVisible(lote.cantidadRetirada)}
                      </td>
                      <td data-label="Estado">
                        <span className="inv-pastilla" data-estado={lote.estadoVencimiento}>
                          {ESTADOS[lote.estadoVencimiento] || "—"}
                        </span>
                      </td>
                      <td data-label="Acción" className="inv-der">
                        {puedeBaja ? (
                          <button
                            type="button"
                            className="re-boton re-boton--suave re-boton--chico inv-baja"
                            onClick={() => abrirBaja(lote)}
                            disabled={guardando}
                          >
                            <Trash2 size={15} />
                            Dar de baja
                          </button>
                        ) : (
                          <span className="inv-sin">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <AnimatePresence>
        {mostrarMovimiento && filaMovimiento && (
          <motion.div className="re-fondo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => !guardando && setMostrarMovimiento(false)}>
            <motion.form
              className="re-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="inv-mov-titulo"
              initial={{ opacity: 0, scale: 0.96, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              onMouseDown={(e) => e.stopPropagation()}
              onSubmit={registrarMovimiento}
              noValidate
            >
              <header className="re-modal__cabecera">
                <div>
                  <h2 id="inv-mov-titulo">Retirar unidades</h2>
                  <p>Para lo que se rompe, se pierde o se usa. El stock nuevo entra por Compras.</p>
                </div>
                <button type="button" className="re-cerrar" onClick={() => setMostrarMovimiento(false)} aria-label="Cerrar" disabled={guardando}>
                  <X size={18} />
                </button>
              </header>

              <div className="re-modal__cuerpo">
                <div className="inv-resumen-fila">
                  <strong>{filaMovimiento.producto?.nombre || "Producto"}</strong>
                  <span>{filaMovimiento.sucursal?.nombre || "Sucursal"}</span>
                  <span>
                    Ahora hay <b>{cantidadVisible(stockElegido ?? filaMovimiento.fisico)}</b> unidades
                  </span>
                </div>

                <div className="re-campos">
                  <label className="re-campo">
                    <span className="re-etiqueta-campo">
                      Qué pasó <b>*</b>
                    </span>
                    <span className="tr-selector tr-selector--formulario">
                      <select
                        value={formulario.tipo}
                        onChange={(e) => setFormulario((f) => ({ ...f, tipo: e.target.value }))}
                        disabled={guardando}
                      >
                        {TIPOS.map((tipo) => (
                          <option key={tipo.valor} value={tipo.valor}>
                            {tipo.texto}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={17} aria-hidden="true" />
                    </span>
                  </label>

                  <label className="re-campo">
                    <span className="re-etiqueta-campo">
                      Cantidad a retirar <b>*</b>
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0.01"
                      step="0.01"
                      max={stockElegido ?? undefined}
                      value={formulario.cantidad}
                      onChange={(e) => setFormulario((f) => ({ ...f, cantidad: e.target.value }))}
                      aria-invalid={sinStockSuficiente}
                      disabled={guardando}
                      autoFocus
                    />
                    <small className="re-ayuda" data-error={sinStockSuficiente}>
                      {sinStockSuficiente
                        ? `Solo hay ${cantidadVisible(stockElegido)} unidades.`
                        : "No puede ser más de lo que hay."}
                    </small>
                  </label>
                </div>

                <label className="re-campo">
                  <span className="re-etiqueta-campo">
                    Motivo <b>*</b>
                  </span>
                  <textarea
                    className="inv-texto"
                    rows="3"
                    maxLength={200}
                    value={formulario.motivo}
                    onChange={(e) => setFormulario((f) => ({ ...f, motivo: e.target.value }))}
                    placeholder="Ej. se rompió una caja al descargar"
                    disabled={guardando}
                  />
                </label>

                {errorModal && (
                  <div className="re-aviso re-aviso--error" role="alert">
                    {errorModal}
                  </div>
                )}
              </div>

              <footer className="re-modal__pie">
                <button type="button" className="re-boton re-boton--suave" disabled={guardando} onClick={() => setMostrarMovimiento(false)}>
                  Cancelar
                </button>
                <button type="submit" className="re-boton" disabled={guardando}>
                  {guardando ? "Guardando…" : "Retirar del stock"}
                </button>
              </footer>
            </motion.form>
          </motion.div>
        )}

        {filaRegularizacion && (
          <motion.div className="re-fondo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => !guardando && setFilaRegularizacion(null)}>
            <motion.form
              className="re-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="inv-reg-titulo"
              initial={{ opacity: 0, scale: 0.96, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              onMouseDown={(e) => e.stopPropagation()}
              onSubmit={guardarRegularizacion}
              noValidate
            >
              <header className="re-modal__cabecera">
                <div>
                  <h2 id="inv-reg-titulo">Asignar lote a existencias</h2>
                  <p>Ponle lote y fecha real a unidades que ya tenías. No suma stock.</p>
                </div>
                <button type="button" className="re-cerrar" onClick={() => setFilaRegularizacion(null)} aria-label="Cerrar" disabled={guardando}>
                  <X size={18} />
                </button>
              </header>

              <div className="re-modal__cuerpo">
                <div className="inv-resumen-fila">
                  <strong>{filaRegularizacion.producto?.nombre || "Producto"}</strong>
                  <span>{filaRegularizacion.sucursal?.nombre || "Sucursal"}</span>
                  <span>
                    Físico <b>{cantidadVisible(filaRegularizacion.fisico)}</b> · Sin lote{" "}
                    <b>{cantidadVisible(filaRegularizacion.sinLote)}</b>
                  </span>
                </div>

                <div className="re-campos">
                  <label className="re-campo">
                    <span className="re-etiqueta-campo">
                      Número de lote <b>*</b>
                    </span>
                    <input
                      maxLength={60}
                      placeholder="Ej. L001-2026"
                      value={regularizacion.numeroLote}
                      onChange={(e) =>
                        setRegularizacion((f) => ({ ...f, numeroLote: e.target.value.toUpperCase().replace(/[^A-Z0-9-_/. ]/g, "") }))
                      }
                      disabled={guardando}
                      autoFocus
                    />
                  </label>

                  <label className="re-campo">
                    <span className="re-etiqueta-campo">
                      Fecha de vencimiento <b>*</b>
                    </span>
                    <input
                      type="date"
                      value={regularizacion.fechaVencimiento}
                      onChange={(e) => setRegularizacion((f) => ({ ...f, fechaVencimiento: e.target.value }))}
                      disabled={guardando}
                    />
                  </label>

                  <label className="re-campo">
                    <span className="re-etiqueta-campo">
                      Cantidad (máximo {cantidadVisible(filaRegularizacion.sinLote)}) <b>*</b>
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0.01"
                      step="0.01"
                      max={filaRegularizacion.sinLote}
                      value={regularizacion.cantidad}
                      onChange={(e) => setRegularizacion((f) => ({ ...f, cantidad: e.target.value }))}
                      disabled={guardando}
                    />
                  </label>
                </div>

                <label className="re-campo">
                  <span className="re-etiqueta-campo">
                    Motivo <b>*</b>
                  </span>
                  <textarea
                    className="inv-texto"
                    rows="3"
                    maxLength={200}
                    value={regularizacion.motivo}
                    onChange={(e) => setRegularizacion((f) => ({ ...f, motivo: e.target.value }))}
                    disabled={guardando}
                  />
                </label>

                {regularizacion.fechaVencimiento &&
                  fechaValida(regularizacion.fechaVencimiento) &&
                  regularizacion.fechaVencimiento < hoyLocal() && (
                    <div className="re-aviso re-aviso--error">
                      <AlertTriangle size={17} /> Esa fecha ya pasó. El lote se registra, pero sus unidades no se podrán vender.
                    </div>
                  )}

                {errorModal && (
                  <div className="re-aviso re-aviso--error" role="alert">
                    {errorModal}
                  </div>
                )}
              </div>

              <footer className="re-modal__pie">
                <button type="button" className="re-boton re-boton--suave" disabled={guardando} onClick={() => setFilaRegularizacion(null)}>
                  Cancelar
                </button>
                <button type="submit" className="re-boton" disabled={guardando}>
                  {guardando ? "Guardando…" : "Asignar lote"}
                </button>
              </footer>
            </motion.form>
          </motion.div>
        )}

        {loteBaja && (
          <motion.div className="re-fondo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => !guardando && setLoteBaja(null)}>
            <motion.form
              className="re-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="inv-baja-titulo"
              initial={{ opacity: 0, scale: 0.96, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              onMouseDown={(e) => e.stopPropagation()}
              onSubmit={confirmarBaja}
              noValidate
            >
              <header className="re-modal__cabecera">
                <div>
                  <h2 id="inv-baja-titulo">Dar de baja un lote vencido</h2>
                  <p>Se descuenta del stock y queda registrado quién lo retiró.</p>
                </div>
                <button type="button" className="re-cerrar" onClick={() => setLoteBaja(null)} aria-label="Cerrar" disabled={guardando}>
                  <X size={18} />
                </button>
              </header>

              <div className="re-modal__cuerpo">
                <div className="inv-resumen-fila inv-resumen-fila--peligro">
                  <strong>{productosPorId.get(loteBaja.productoId)?.nombre || loteBaja.nombreProducto}</strong>
                  <span>
                    Lote {loteBaja.numeroLote} · venció el {fechaVisible(loteBaja.fechaVencimiento)}
                  </span>
                  <span>
                    Quedan <b>{cantidadVisible(loteBaja.cantidadDisponible)}</b> unidades por retirar
                  </span>
                </div>

                <label className="re-campo">
                  <span className="re-etiqueta-campo">
                    Cantidad a retirar <b>*</b>
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    step="0.01"
                    max={loteBaja.cantidadDisponible}
                    value={cantidadBaja}
                    onChange={(e) => setCantidadBaja(e.target.value)}
                    disabled={guardando}
                    autoFocus
                  />
                  <small className="re-ayuda">Puedes retirar solo una parte si quieres.</small>
                </label>

                <label className="re-campo">
                  <span className="re-etiqueta-campo">
                    Motivo <b>*</b>
                  </span>
                  <textarea
                    className="inv-texto"
                    rows="3"
                    maxLength={200}
                    value={motivoBaja}
                    onChange={(e) => setMotivoBaja(e.target.value)}
                    disabled={guardando}
                  />
                </label>

                {errorModal && (
                  <div className="re-aviso re-aviso--error" role="alert">
                    {errorModal}
                  </div>
                )}
              </div>

              <footer className="re-modal__pie">
                <button type="button" className="re-boton re-boton--suave" disabled={guardando} onClick={() => setLoteBaja(null)}>
                  Cancelar
                </button>
                <button type="submit" className="re-boton" disabled={guardando}>
                  <Trash2 size={16} />
                  {guardando ? "Retirando…" : "Confirmar baja"}
                </button>
              </footer>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
