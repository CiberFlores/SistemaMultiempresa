import { useEffect, useMemo, useRef, useState } from "react";
import mensajeError from "../../utils/mensajeError";
import { Navigate } from "react-router-dom";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import {
  BellRing,
  Boxes,
  CalendarClock,
  Check,
  Download,
  House,
  LayoutGrid,
  LogOut,
  QrCode,
  ReceiptText,
  Search,
  Settings,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Trash2,
  Upload,
  Users,
  X,
  Zap
} from "lucide-react";

import useAuth from "../../hooks/useAuth";
import useMarcaEmpresa from "../../hooks/useMarcaEmpresa";
import { useColeccionesEmpresa } from "../../hooks/useColeccionesEmpresa";
import { cambiarQrActivo, quitarQrCobro, subirQrCobro } from "../../services/qrCobroService";
import { sonidoPop } from "../../utils/sonidos";

import Mantenimiento from "../common/Mantenimiento";
import useCompanyModules from "../../hooks/useCompanyModules";
import "../../styles/app-movil-go.css";

// ------------------------------------------------------------------
// Ayudas
// ------------------------------------------------------------------

const dinero = (valor) => {
  const n = Number(valor || 0);
  return `${n < 0 ? "−" : ""}Bs ${Math.abs(n).toLocaleString("es-BO", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

const cantidad = (valor) => Number(valor || 0).toLocaleString("es-BO", { maximumFractionDigits: 2 });

const normalizar = (v) =>
  String(v ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

const milis = (valor) => valor?.toMillis?.() || 0;
const inicioDia = (f) => new Date(f.getFullYear(), f.getMonth(), f.getDate());
const textoFecha = (f) =>
  [f.getFullYear(), String(f.getMonth() + 1).padStart(2, "0"), String(f.getDate()).padStart(2, "0")].join("-");

const METODOS = { EFECTIVO: "Efectivo", QR: "QR", TARJETA: "Tarjeta", TRANSFERENCIA: "Transferencia", CREDITO: "A crédito" };
const DIAS = ["D", "L", "M", "M", "J", "V", "S"];
const EN_LINEA_MS = 150000;

function hace(ms, ahora) {
  if (!ms) return "Nunca se conectó";
  const dif = Math.max(0, ahora - ms);
  if (dif < 60000) return "Hace un momento";
  if (dif < 3600000) return `Hace ${Math.floor(dif / 60000)} min`;
  if (dif < 86400000) return `Hace ${Math.floor(dif / 3600000)} h`;
  return `Hace ${Math.floor(dif / 86400000)} d`;
}

// Reloj que se actualiza solo, para "hace 5 min" y "en línea"
function useAhora(cadaMs = 30000) {
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), cadaMs);
    return () => clearInterval(id);
  }, [cadaMs]);

  return ahora;
}

// Número que sube hasta su valor (sin animación si la persona prefiere menos movimiento)
function useContador(meta, duracion = 700) {
  const [valor, setValor] = useState(meta);
  const actual = useRef(meta);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      actual.current = meta;
      const id = requestAnimationFrame(() => setValor(meta));
      return () => cancelAnimationFrame(id);
    }

    const desde = actual.current;
    const inicio = performance.now();
    let id;

    const paso = (t) => {
      const p = Math.min(1, (t - inicio) / duracion);
      const suave = 1 - Math.pow(1 - p, 3);
      const v = desde + (meta - desde) * suave;
      actual.current = v;
      setValor(v);
      if (p < 1) id = requestAnimationFrame(paso);
    };

    id = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(id);
  }, [meta, duracion]);

  return valor;
}

function Avatar({ nombre, logo, tamano = 40 }) {
  return (
    <span className="gx-avatar" style={{ width: tamano, height: tamano }}>
      {logo ? <img src={logo} alt="" /> : <b>{(nombre || "?").charAt(0).toUpperCase()}</b>}
    </span>
  );
}

const entrada = (i = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, delay: Math.min(i, 8) * 0.045, ease: [0.23, 1, 0.32, 1] }
});

// ------------------------------------------------------------------
// Aplicación
// ------------------------------------------------------------------

export default function MobileLayout() {
  const { usuario, cargando, cerrarSesion } = useAuth();
  const marca = useMarcaEmpresa();
  const modulos = useCompanyModules();

  const esDueno = usuario?.tipoUsuario === "ADMIN" && Boolean(usuario?.empresaId);
  const empresaId = esDueno ? usuario.empresaId : null;

  const { datos, cargando: cargandoDatos } = useColeccionesEmpresa(empresaId, [
    "productos",
    "inventarios",
    "ventas",
    "sucursales",
    "lotesInventario",
    "usuarios",
    "rolesEmpresa"
  ]);

  const [pagina, setPagina] = useState("inicio");
  const [sucursalId, setSucursalId] = useState("TODAS");
  const [hoja, setHoja] = useState(false);
  const [buscar, setBuscar] = useState("");
  const [consulta, setConsulta] = useState("");
  const [aviso, setAviso] = useState(null);
  const ahora = useAhora();

  const tema = marca.tema;

  const estilo = useMemo(
    () => ({
      "--gx-p": tema.primario,
      "--gx-s": tema.secundario,
      "--gx-bg": tema.fondo,
      "--gx-tx": tema.texto,
      "--gx-mu": tema.apagado,
      "--gx-on": tema.sobrePrimario,
      "--gx-card": tema.superficie,
      "--gx-card2": tema.superficie2,
      "--gx-line": tema.borde,
      "--gx-pl": tema.primarioLegible,
      "--gx-font": `"${marca.tipografia}", "Inter", system-ui, sans-serif`
    }),
    [tema, marca.tipografia]
  );

  const filtraSucursal = (x) => sucursalId === "TODAS" || x.sucursalId === sucursalId;

  // ---------------- Ventas ----------------
  const ventas = useMemo(
    () =>
      datos.ventas
        .filter(filtraSucursal)
        .map((v) => ({ ...v, fecha: v.fechaRegistro?.toDate?.() || null }))
        .filter((v) => v.fecha)
        .sort((a, b) => b.fecha - a.fecha),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [datos.ventas, sucursalId]
  );

  const resumenVentas = useMemo(() => {
    const hoy0 = inicioDia(new Date(ahora)).getTime();
    const dia = 86400000;
    const validas = ventas.filter((v) => v.estado !== "ANULADA");
    const suma = (lista) => lista.reduce((s, v) => s + Number(v.total || 0), 0);

    const deHoy = validas.filter((v) => v.fecha.getTime() >= hoy0);
    const deAyer = validas.filter((v) => v.fecha.getTime() >= hoy0 - dia && v.fecha.getTime() < hoy0);

    const semana = Array.from({ length: 7 }, (_, i) => {
      const desde = hoy0 - (6 - i) * dia;
      const dentro = validas.filter((v) => v.fecha.getTime() >= desde && v.fecha.getTime() < desde + dia);
      return { dia: DIAS[new Date(desde).getDay()], total: suma(dentro), esHoy: i === 6 };
    });

    const totalHoy = suma(deHoy);
    const totalAyer = suma(deAyer);

    return {
      deHoy,
      totalHoy,
      totalAyer,
      cambio: totalAyer > 0 ? Math.round(((totalHoy - totalAyer) / totalAyer) * 100) : null,
      semana,
      ultimas: ventas.slice(0, 3)
    };
  }, [ventas, ahora]);

  // ---------------- Stock y alertas ----------------
  const stock = useMemo(() => {
    const hoy = textoFecha(new Date(ahora));
    const productos = new Map(datos.productos.map((p) => [p.id, p]));
    const vendibles = new Map();
    const vencidos = new Map();
    const porVencer = new Map();

    datos.lotesInventario.forEach((lote) => {
      const disponible = Number(lote.cantidadDisponible || 0);
      if (disponible <= 0 || lote.estado !== "ACTIVO") return;

      const clave = `${lote.sucursalId}_${lote.productoId}`;
      const vencido = !lote.fechaVencimiento || lote.fechaVencimiento < hoy;
      (vencido ? vencidos : vendibles).set(clave, ((vencido ? vencidos : vendibles).get(clave) || 0) + disponible);

      if (!vencido) {
        const dias = Number(productos.get(lote.productoId)?.diasAlertaVencimiento || 15);
        const limite = new Date(ahora);
        limite.setDate(limite.getDate() + dias);
        if (lote.fechaVencimiento <= textoFecha(limite)) {
          porVencer.set(clave, (porVencer.get(clave) || 0) + disponible);
        }
      }
    });

    return datos.inventarios
      .filter(filtraSucursal)
      .map((inv) => {
        const producto = productos.get(inv.productoId);
        if (!producto) return null;

        const clave = `${inv.sucursalId}_${inv.productoId}`;
        const fisico = Math.max(0, Number(inv.stock || 0));
        const controla = producto.controlaVencimiento === true;
        const vendible = controla ? Math.min(fisico, vendibles.get(clave) || 0) : fisico;
        const vencido = controla ? vencidos.get(clave) || 0 : 0;
        const minimo = Number(producto.stockMinimo || 0);

        let estado = "NORMAL";
        if (vendible <= 0) estado = fisico > 0 && vencido > 0 ? "SOLO_VENCIDO" : "AGOTADO";
        else if (vendible <= minimo) estado = "BAJO";

        return {
          id: inv.id,
          producto,
          sucursalId: inv.sucursalId,
          vendible,
          vencido,
          minimo,
          porVencer: controla ? porVencer.get(clave) || 0 : 0,
          estado,
          tope: Math.max(minimo * 3, vendible, 1)
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.vendible - b.vendible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos.inventarios, datos.productos, datos.lotesInventario, sucursalId, ahora]);

  const nombreSucursal = (id) => datos.sucursales.find((x) => x.id === id)?.nombre || "Sucursal";

  // Un producto = una tarjeta. Con "Todas" las sucursales se suman; el detalle muestra cada una y sus lotes.
  const stockProductos = useMemo(() => {
    const hoy = textoFecha(new Date(ahora));
    const peso = { AGOTADO: 3, SOLO_VENCIDO: 2, BAJO: 1, NORMAL: 0 };

    const lotesPor = new Map();
    datos.lotesInventario
      .filter((l) => l.estado === "ACTIVO" && Number(l.cantidadDisponible) > 0 && filtraSucursal(l))
      .forEach((l) => {
        if (!lotesPor.has(l.productoId)) lotesPor.set(l.productoId, []);
        lotesPor.get(l.productoId).push({
          id: l.id,
          numero: l.numeroLote || "Sin número",
          vence: l.fechaVencimiento || "",
          cantidad: Number(l.cantidadDisponible),
          sucursalId: l.sucursalId,
          vencido: !l.fechaVencimiento || l.fechaVencimiento < hoy
        });
      });

    const porProducto = new Map();

    stock.forEach((fila) => {
      const sucursal = { id: fila.sucursalId, nombre: nombreSucursal(fila.sucursalId), vendible: fila.vendible, estado: fila.estado };
      const actual = porProducto.get(fila.producto.id);

      if (!actual) {
        porProducto.set(fila.producto.id, { ...fila, id: fila.producto.id, sucursales: [sucursal] });
        return;
      }

      actual.vendible += fila.vendible;
      actual.vencido += fila.vencido;
      actual.porVencer += fila.porVencer;
      actual.minimo += fila.minimo;
      actual.tope += fila.tope;
      if (peso[fila.estado] > peso[actual.estado]) actual.estado = fila.estado;
      actual.sucursales.push(sucursal);
    });

    return [...porProducto.values()]
      .map((r) => ({ ...r, lotes: (lotesPor.get(r.producto.id) || []).sort((a, b) => String(a.vence).localeCompare(String(b.vence))) }))
      .sort((a, b) => peso[b.estado] - peso[a.estado] || a.vendible - b.vendible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stock, datos.lotesInventario, datos.sucursales, sucursalId, ahora]);

  const alertas = useMemo(() => {
    const lista = [];
    const donde = (fila) => (datos.sucursales.length > 1 ? ` · ${nombreSucursal(fila.sucursalId)}` : "");

    stock.forEach((fila) => {
      if (fila.estado === "AGOTADO") lista.push({ clave: `A${fila.id}`, tipo: "peligro", titulo: `${fila.producto.nombre} se agotó`, detalle: `No queda stock para vender${donde(fila)}.` });
      else if (fila.estado === "SOLO_VENCIDO") lista.push({ clave: `V${fila.id}`, tipo: "peligro", titulo: `${fila.producto.nombre} solo tiene unidades vencidas`, detalle: `${cantidad(fila.vencido)} vencidas. Compra más${donde(fila)}.` });
      else if (fila.estado === "BAJO") lista.push({ clave: `B${fila.id}`, tipo: "alerta", titulo: `${fila.producto.nombre} se está acabando`, detalle: `Quedan ${cantidad(fila.vendible)}. El mínimo es ${cantidad(fila.minimo)}${donde(fila)}.` });

      if (fila.porVencer > 0) lista.push({ clave: `P${fila.id}`, tipo: "alerta", titulo: `${fila.producto.nombre} está por vencer`, detalle: `${cantidad(fila.porVencer)} unidades vencen pronto${donde(fila)}.` });
    });

    return lista;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stock, datos.sucursales]);

  // Suena y vibra cuando aparece una alerta nueva mientras la app está abierta
  const vistas = useRef(null);

  useEffect(() => {
    if (cargandoDatos) return;

    const claves = new Set(alertas.map((a) => a.clave));

    if (vistas.current) {
      const nueva = alertas.find((a) => !vistas.current.has(a.clave));

      if (nueva) {
        const id = requestAnimationFrame(() => setAviso(nueva));
        sonidoPop();
        navigator.vibrate?.([120, 60, 120]);

        if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.hidden) {
          navigator.serviceWorker?.ready
            .then((registro) => registro.showNotification(`${marca.appNombre}: ${nueva.titulo}`, { body: nueva.detalle, icon: undefined }))
            .catch(() => {});
        }

        vistas.current = claves;
        return () => cancelAnimationFrame(id);
      }
    }

    vistas.current = claves;
    return undefined;
  }, [alertas, cargandoDatos, marca.appNombre]);

  useEffect(() => {
    if (!aviso) return undefined;
    const id = setTimeout(() => setAviso(null), 6000);
    return () => clearTimeout(id);
  }, [aviso]);

  // ---------------- Equipo ----------------
  const nombreRol = (id) => datos.rolesEmpresa.find((r) => r.id === id)?.nombre || "Trabajador";

  const equipo = useMemo(() => {
    return datos.usuarios
      .filter((u) => u.tipoUsuario === "TRABAJADOR" && u.estado === true)
      .map((u) => {
        const ultima = milis(u.ultimaActividad);
        const enLinea = u.conectado === true && ahora - ultima < EN_LINEA_MS;
        return { ...u, ultima, enLinea, vendiendo: enLinea && u.enPos === true };
      })
      .sort((a, b) => Number(b.vendiendo) - Number(a.vendiendo) || Number(b.enLinea) - Number(a.enLinea) || b.ultima - a.ultima);
  }, [datos.usuarios, ahora]);

  const conectados = equipo.filter((u) => u.enLinea).length;

  // ---------------- Navegación ----------------
  const cambiar = (id) => {
    setPagina(id);
    window.scrollTo(0, 0);
  };

  if (cargando) {
    return (
      <div className="gx gx-cargando" style={estilo}>
        <span className="gx-girando" aria-hidden="true" />
        <p>Abriendo tu app…</p>
      </div>
    );
  }

  if (!usuario) return <Navigate to="/login" replace />;
  if (!esDueno) return <Navigate to="/sin-permiso" replace />;

  const hayVariasSucursales = datos.sucursales.length > 1;

  const barraSucursal = hayVariasSucursales && ["inicio", "ventas", "stock"].includes(pagina) && (
    <div className="gx-chips" role="radiogroup" aria-label="Sucursal">
      {[{ id: "TODAS", nombre: "Todas" }, ...datos.sucursales].map((s) => (
        <button key={s.id} type="button" role="radio" aria-checked={sucursalId === s.id} data-on={sucursalId === s.id} onClick={() => setSucursalId(s.id)}>
          {s.nombre}
        </button>
      ))}
    </div>
  );

  const paginas = {
    inicio: (
      <Inicio
        marca={marca}
        resumen={resumenVentas}
        alertas={alertas}
        conectados={conectados}
        totalEquipo={equipo.length}
        equipo={equipo}
        ir={cambiar}
        abrirAlertas={() => setHoja(true)}
        stockEnRiesgo={stockProductos.filter((f) => f.estado !== "NORMAL")}
        cargando={cargandoDatos}
      />
    ),
    ventas: <Ventas ventas={ventas} sucursales={datos.sucursales} ahora={ahora} />,
    stock: <Stock key={consulta} filas={stockProductos} consulta={consulta} />,
    equipo: <Equipo equipo={equipo} nombreRol={nombreRol} ahora={ahora} />,
    ajustes: <Ajustes marca={marca} usuario={usuario} empresaId={empresaId} salir={async () => { await cerrarSesion(); }} />
  };

  const MODULO_DE = { inicio: "DASHBOARD", ventas: "VENTAS", stock: "INVENTARIO", equipo: "USUARIOS" };
  for (const [clave, codigo] of Object.entries(MODULO_DE)) {
    if (!modulos.isEnabled(codigo)) paginas[clave] = <Mantenimiento nombre={modulos.nombreDe(codigo)} />;
  }

  const NAV = [
    ["inicio", "Inicio", House],
    ["ventas", "Ventas", ReceiptText],
    ["stock", "Stock", Boxes],
    ["equipo", "Equipo", Users],
    ["ajustes", "Ajustes", Settings]
  ];

  return (
    <div className="gx" style={estilo}>
      <header className="gx-cabecera">
        <span className="gx-cabecera__aro gx-cabecera__aro--uno" aria-hidden="true" />
        <span className="gx-cabecera__aro gx-cabecera__aro--dos" aria-hidden="true" />

        <div className="gx-cabecera__fila">
          <Avatar nombre={marca.nombre} logo={marca.logoUrl} tamano={52} />
          <div className="gx-cabecera__texto">
            <span>Hola, {(usuario.nombreCompleto || "dueño").split(" ")[0]}</span>
            <strong>{marca.appNombre}</strong>
          </div>
          <button type="button" className="gx-campana" onClick={() => setHoja(true)} aria-label={alertas.length ? `Alertas, ${alertas.length} nuevas` : "Alertas"}>
            <BellRing size={21} />
            {alertas.length > 0 && <i>{alertas.length > 9 ? "9+" : alertas.length}</i>}
          </button>
        </div>

        <form
          className="gx-busqueda"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            setConsulta(buscar.trim());
            cambiar("stock");
          }}
        >
          <Search size={19} aria-hidden="true" />
          <input type="search" placeholder="Buscar un producto…" aria-label="Buscar un producto" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
        </form>
      </header>

      <main className="gx-contenido">
        {barraSucursal}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={pagina} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}>
            {paginas[pagina]}
          </motion.div>
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {aviso && (
          <motion.button
            type="button"
            className="gx-toast"
            data-tipo={aviso.tipo}
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            onClick={() => {
              setAviso(null);
              cambiar("stock");
            }}
          >
            <TriangleAlert size={20} aria-hidden="true" />
            <span>
              <b>{aviso.titulo}</b>
              <small>{aviso.detalle}</small>
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {hoja && (
          <motion.div className="gx-fondo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setHoja(false)}>
            <motion.section
              className="gx-hoja"
              role="dialog"
              aria-modal="true"
              aria-label="Alertas"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <span className="gx-hoja__asa" aria-hidden="true" />
              <header>
                <h2>Alertas</h2>
                <button type="button" onClick={() => setHoja(false)} aria-label="Cerrar">
                  <X size={20} />
                </button>
              </header>
              {alertas.length === 0 ? (
                <p className="gx-vacio">Todo en orden. Te avisamos aquí cuando algo se esté acabando o por vencer.</p>
              ) : (
                <ul className="gx-lista">
                  {alertas.map((a) => (
                    <li key={a.clave} className="gx-alerta" data-tipo={a.tipo}>
                      <TriangleAlert size={20} aria-hidden="true" />
                      <span>
                        <b>{a.titulo}</b>
                        <small>{a.detalle}</small>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="gx-nav" aria-label="Secciones">
        <LayoutGroup>
          {NAV.map(([id, titulo, Icono]) => (
            <button key={id} type="button" data-on={pagina === id} aria-current={pagina === id ? "page" : undefined} onClick={() => cambiar(id)}>
              {pagina === id && <motion.span layoutId="gx-pastilla" className="gx-nav__pastilla" transition={{ type: "spring", duration: 0.4, bounce: 0.18 }} />}
              <Icono size={22} aria-hidden="true" />
              <span>{titulo}</span>
              {id === "stock" && alertas.length > 0 && <i aria-hidden="true" />}
              {id === "equipo" && conectados > 0 && <em aria-hidden="true">{conectados}</em>}
            </button>
          ))}
        </LayoutGroup>
      </nav>
    </div>
  );
}

// ------------------------------------------------------------------
// Pantallas
// ------------------------------------------------------------------

// Curva suave por los puntos (Catmull-Rom convertida a Bézier)
function curva(puntos) {
  if (puntos.length < 2) return "";

  let d = `M ${puntos[0].x} ${puntos[0].y}`;

  for (let i = 0; i < puntos.length - 1; i++) {
    const p0 = puntos[i - 1] || puntos[i];
    const p1 = puntos[i];
    const p2 = puntos[i + 1];
    const p3 = puntos[i + 2] || p2;

    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }

  return d;
}

function Grafico({ semana }) {
  const ancho = 320;
  const alto = 110;
  const maximo = Math.max(1, ...semana.map((d) => d.total));

  const puntos = semana.map((d, i) => ({
    x: 12 + (i * (ancho - 24)) / (semana.length - 1),
    y: alto - 14 - (d.total / maximo) * (alto - 34)
  }));

  const linea = curva(puntos);
  const area = `${linea} L ${puntos[puntos.length - 1].x} ${alto} L ${puntos[0].x} ${alto} Z`;
  const hoy = puntos[puntos.length - 1];

  return (
    <div className="gx-grafico" role="img" aria-label="Ventas de los últimos 7 días">
      <svg viewBox={`0 0 ${ancho} ${alto}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="gx-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.38" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path className="gx-grafico__area" d={area} fill="url(#gx-area)" />
        <path className="gx-grafico__linea" d={linea} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" pathLength="1" />
        <circle className="gx-grafico__punto" cx={hoy.x} cy={hoy.y} r="6" fill="currentColor" />
        <circle className="gx-grafico__halo" cx={hoy.x} cy={hoy.y} r="11" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
      <div className="gx-grafico__dias" aria-hidden="true">
        {semana.map((d, i) => (
          <span key={i} data-hoy={d.esHoy}>
            {d.dia}
          </span>
        ))}
      </div>
    </div>
  );
}

function Inicio({ marca, resumen, alertas, conectados, totalEquipo, equipo, ir, abrirAlertas, cargando, stockEnRiesgo }) {
  const total = useContador(resumen.totalHoy);
  const sube = resumen.cambio !== null && resumen.cambio >= 0;

  const atajos = [
    { id: "ventas", titulo: "Ventas", icono: ReceiptText, accion: () => ir("ventas") },
    { id: "stock", titulo: "Stock", icono: Boxes, accion: () => ir("stock") },
    { id: "equipo", titulo: "Equipo", icono: Users, accion: () => ir("equipo"), cuenta: conectados },
    { id: "alertas", titulo: "Alertas", icono: BellRing, accion: abrirAlertas, cuenta: alertas.length, peligro: true },
    { id: "qr", titulo: "Mi QR", icono: QrCode, accion: () => ir("ajustes") }
  ];

  return (
    <div className="gx-pantalla">
      <div className="gx-atajos" role="list">
        {atajos.map((a, i) => (
          <motion.button key={a.id} type="button" role="listitem" className="gx-atajo" onClick={a.accion} {...entrada(i)}>
            <span>
              <a.icono size={24} aria-hidden="true" />
              {a.cuenta > 0 && <i data-peligro={a.peligro}>{a.cuenta > 9 ? "9+" : a.cuenta}</i>}
            </span>
            <small>{a.titulo}</small>
          </motion.button>
        ))}
      </div>

      <motion.section className="gx-hero" {...entrada(2)}>
        <div className="gx-hero__arriba">
          <small>Vendido hoy</small>
          <span className="gx-hero__en-vivo">
            <i className="gx-vivo" aria-hidden="true" /> En vivo
          </span>
        </div>
        <strong>{dinero(Math.round(total * 100) / 100)}</strong>

        <p className="gx-hero__cambio">
          {resumen.cambio === null ? (
            <span>{resumen.totalHoy > 0 ? "Ayer no hubo ventas" : "Aún sin ventas hoy"}</span>
          ) : (
            <span>
              {sube ? <TrendingUp size={16} aria-hidden="true" /> : <TrendingDown size={16} aria-hidden="true" />}
              {Math.abs(resumen.cambio)}% {sube ? "más" : "menos"} que ayer
            </span>
          )}
        </p>

        <Grafico semana={resumen.semana} />
      </motion.section>

      <div className="gx-tres">
        <motion.div className="gx-mini" {...entrada(3)}>
          <small>Ventas hoy</small>
          <strong>{cargando ? "…" : resumen.deHoy.length}</strong>
        </motion.div>
        <motion.div className="gx-mini" {...entrada(4)}>
          <small>En línea</small>
          <strong>
            {conectados}
            <span>/{totalEquipo}</span>
          </strong>
        </motion.div>
        <motion.div className="gx-mini" data-alerta={stockEnRiesgo.length > 0} {...entrada(5)}>
          <small>Por acabarse</small>
          <strong>{stockEnRiesgo.length}</strong>
        </motion.div>
      </div>

      {alertas.length > 0 ? (
        <motion.button type="button" className="gx-ticket" data-tipo="peligro" onClick={abrirAlertas} {...entrada(6)}>
          <span className="gx-ticket__icono">
            <TriangleAlert size={24} aria-hidden="true" />
          </span>
          <span className="gx-ticket__texto">
            <b>{alertas.length === 1 ? "1 alerta de stock" : `${alertas.length} alertas de stock`}</b>
            <small>{alertas[0].titulo}</small>
          </span>
          <span className="gx-ticket__ver">Ver</span>
        </motion.button>
      ) : (
        <motion.div className="gx-ticket" data-tipo="ok" {...entrada(6)}>
          <span className="gx-ticket__icono">
            <Check size={24} aria-hidden="true" />
          </span>
          <span className="gx-ticket__texto">
            <b>Todo en orden</b>
            <small>Tu stock está bien por ahora.</small>
          </span>
        </motion.div>
      )}

      {stockEnRiesgo.length > 0 && (
        <motion.section className="gx-seccion" {...entrada(7)}>
          <header>
            <h2>Se está acabando</h2>
            <button type="button" onClick={() => ir("stock")}>
              Ver todo
            </button>
          </header>
          <div className="gx-carrusel">
            {stockEnRiesgo.slice(0, 8).map((f) => (
              <button key={f.id} type="button" className="gx-tarjeta-mini" data-estado={f.estado} onClick={() => ir("stock")}>
                <span className="gx-tarjeta-mini__foto">
                  {f.producto.imagenUrl ? <img src={f.producto.imagenUrl} alt="" loading="lazy" /> : <b>{(f.producto.nombre || "?").charAt(0).toUpperCase()}</b>}
                </span>
                <b>{f.producto.nombre}</b>
                <small>{f.estado === "AGOTADO" ? "Agotado" : `Quedan ${cantidad(f.vendible)}`}</small>
              </button>
            ))}
          </div>
        </motion.section>
      )}

      <motion.section className="gx-seccion" {...entrada(8)}>
        <header>
          <h2>Últimas ventas</h2>
          <button type="button" onClick={() => ir("ventas")}>
            Ver todas
          </button>
        </header>
        {resumen.ultimas.length === 0 ? (
          <p className="gx-vacio">Cuando tu equipo venda, aparecerá aquí al instante.</p>
        ) : (
          <ul className="gx-lista">
            {resumen.ultimas.map((v) => (
              <li key={v.id} className="gx-fila">
                <span className="gx-fila__icono">
                  <ReceiptText size={18} aria-hidden="true" />
                </span>
                <span className="gx-fila__texto">
                  <b>{v.clienteNombre || "Consumidor final"}</b>
                  <small>
                    {v.fecha.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" })} · {METODOS[v.metodoPago] || v.metodoPago}
                  </small>
                </span>
                <strong>{dinero(v.total)}</strong>
              </li>
            ))}
          </ul>
        )}
      </motion.section>

      {equipo.some((u) => u.enLinea) && (
        <motion.section className="gx-seccion" {...entrada(9)}>
          <header>
            <h2>Tu equipo ahora</h2>
            <button type="button" onClick={() => ir("equipo")}>
              Ver equipo
            </button>
          </header>
          <div className="gx-equipo-mini">
            {equipo
              .filter((u) => u.enLinea)
              .map((u) => (
                <button key={u.id} type="button" onClick={() => ir("equipo")} aria-label={`${u.nombreCompleto}, ${u.vendiendo ? "vendiendo" : "en línea"}`}>
                  <Avatar nombre={u.nombreCompleto} tamano={52} />
                  <i data-vendiendo={u.vendiendo} aria-hidden="true" />
                  <small>{(u.nombreCompleto || "").split(" ")[0]}</small>
                </button>
              ))}
          </div>
        </motion.section>
      )}

      <p className="gx-pie">
        <span className="gx-vivo" aria-hidden="true" /> {marca.nombre} · datos en vivo
      </p>
    </div>
  );
}

function Ventas({ ventas, sucursales, ahora }) {
  const [periodo, setPeriodo] = useState("HOY");

  const lista = useMemo(() => {
    const hoy0 = inicioDia(new Date(ahora)).getTime();
    const limite = periodo === "HOY" ? hoy0 : periodo === "SEMANA" ? hoy0 - 6 * 86400000 : new Date(new Date(ahora).getFullYear(), new Date(ahora).getMonth(), 1).getTime();
    return ventas.filter((v) => v.fecha.getTime() >= limite);
  }, [ventas, periodo, ahora]);

  const validas = lista.filter((v) => v.estado !== "ANULADA");
  const total = validas.reduce((s, v) => s + Number(v.total || 0), 0);
  const nombreSucursal = (id) => sucursales.find((s) => s.id === id)?.nombre || "";

  return (
    <div className="gx-pantalla">
      <h1 className="gx-titulo">Mis ventas</h1>

      <div className="gx-chips" role="radiogroup" aria-label="Período">
        {[["HOY", "Hoy"], ["SEMANA", "7 días"], ["MES", "Este mes"]].map(([id, texto]) => (
          <button key={id} type="button" role="radio" aria-checked={periodo === id} data-on={periodo === id} onClick={() => setPeriodo(id)}>
            {texto}
          </button>
        ))}
      </div>

      <motion.section className="gx-resumen" key={periodo} {...entrada(0)}>
        <div>
          <small>Vendido</small>
          <strong>{dinero(total)}</strong>
        </div>
        <div>
          <small>Ventas</small>
          <strong>{validas.length}</strong>
        </div>
      </motion.section>

      {lista.length === 0 ? (
        <p className="gx-vacio">No hay ventas en este período.</p>
      ) : (
        <ul className="gx-lista">
          {lista.slice(0, 60).map((v, i) => (
            <motion.li key={v.id} className="gx-fila" data-anulada={v.estado === "ANULADA"} {...entrada(i)}>
              <span className="gx-fila__icono">
                <ReceiptText size={18} aria-hidden="true" />
              </span>
              <span className="gx-fila__texto">
                <b>{v.clienteNombre || "Consumidor final"}</b>
                <small>
                  {v.fecha.toLocaleDateString("es-BO", { day: "2-digit", month: "short" })} {v.fecha.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" })} · {METODOS[v.metodoPago] || v.metodoPago}
                  {nombreSucursal(v.sucursalId) ? ` · ${nombreSucursal(v.sucursalId)}` : ""}
                </small>
              </span>
              <strong>{v.estado === "ANULADA" ? "Anulada" : dinero(v.total)}</strong>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}

function fechaCorta(texto) {
  if (!texto) return "Sin fecha";
  const [anio, mes, dia] = String(texto).split("-").map(Number);
  return new Date(anio, mes - 1, dia).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" });
}

function Stock({ filas, consulta = "" }) {
  const [abierto, setAbierto] = useState(null);
  const [filtro, setFiltro] = useState("TODOS");
  const detalle = filas.find((f) => f.id === abierto) || null;
  const [busqueda, setBusqueda] = useState(consulta);

  const visibles = filas.filter((f) => {
    if (filtro === "ALERTA" && f.estado === "NORMAL" && f.porVencer === 0) return false;
    if (filtro === "VENCER" && f.porVencer === 0) return false;
    const t = normalizar(busqueda);
    return !t || normalizar(f.producto.nombre).includes(t) || normalizar(f.producto.sku).includes(t);
  });

  const alertas = filas.filter((f) => f.estado !== "NORMAL").length;
  const unidades = filas.reduce((s, f) => s + f.vendible, 0);

  const ETIQUETA = { AGOTADO: "Agotado", SOLO_VENCIDO: "Vencido", BAJO: "Por acabarse", NORMAL: "Disponible" };

  return (
    <div className="gx-pantalla">
      <h1 className="gx-titulo">Mi stock</h1>

      <section className="gx-tres">
        <div className="gx-mini">
          <small>Productos</small>
          <strong>{filas.length}</strong>
        </div>
        <div className="gx-mini">
          <small>Unidades</small>
          <strong>{cantidad(unidades)}</strong>
        </div>
        <div className="gx-mini" data-alerta={alertas > 0}>
          <small>Por acabarse</small>
          <strong>{alertas}</strong>
        </div>
      </section>

      <label className="gx-buscar">
        <Search size={18} aria-hidden="true" />
        <input type="search" placeholder="Buscar producto…" aria-label="Buscar producto" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
      </label>

      <div className="gx-chips" role="radiogroup" aria-label="Filtro">
        {[
          ["TODOS", "Todos", LayoutGrid],
          ["ALERTA", "Por acabarse", TriangleAlert],
          ["VENCER", "Por vencer", CalendarClock]
        ].map(([id, texto, Icono]) => (
          <button key={id} type="button" role="radio" aria-checked={filtro === id} data-on={filtro === id} onClick={() => setFiltro(id)}>
            <Icono size={16} aria-hidden="true" />
            {texto}
          </button>
        ))}
      </div>

      {visibles.length === 0 ? (
        <p className="gx-vacio">{filas.length === 0 ? "Registra una compra para que entren tus primeros productos." : "No encontramos productos con ese filtro."}</p>
      ) : (
        <ul className="gx-rejilla">
          {visibles.map((f, i) => (
            <motion.li
              key={f.id}
              className="gx-producto"
              data-estado={f.estado}
              role="button"
              tabIndex={0}
              aria-label={`Ver el detalle de ${f.producto.nombre}`}
              onClick={() => setAbierto(f.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setAbierto(f.id);
                }
              }}
              {...entrada(i)}
            >
              <span className="gx-producto__foto">
                {f.producto.imagenUrl ? <img src={f.producto.imagenUrl} alt="" loading="lazy" /> : <b>{(f.producto.nombre || "?").charAt(0).toUpperCase()}</b>}
                <em>{ETIQUETA[f.estado]}</em>
              </span>
              <span className="gx-producto__texto">
                <b>{f.producto.nombre}</b>
                <span className="gx-nivel" aria-hidden="true">
                  <i style={{ "--w": `${Math.min(100, (f.vendible / f.tope) * 100)}%` }} />
                </span>
                <span className="gx-producto__pie">
                  <strong>{Number(f.producto.precioVenta) > 0 ? dinero(f.producto.precioVenta) : "—"}</strong>
                  <small>{cantidad(f.vendible)} u.</small>
                </span>
                {f.sucursales.length > 1 && <small className="gx-producto__sucursales">En {f.sucursales.length} sucursales</small>}
                {f.porVencer > 0 && (
                  <small className="gx-producto__vence">
                    <CalendarClock size={12} aria-hidden="true" /> {cantidad(f.porVencer)} por vencer
                  </small>
                )}
              </span>
            </motion.li>
          ))}
        </ul>
      )}
      <AnimatePresence>
        {detalle && (
          <motion.div className="gx-fondo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAbierto(null)}>
            <motion.section
              className="gx-hoja"
              role="dialog"
              aria-modal="true"
              aria-label={detalle.producto.nombre}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <span className="gx-hoja__asa" aria-hidden="true" />
              <header>
                <h2>{detalle.producto.nombre}</h2>
                <button type="button" onClick={() => setAbierto(null)} aria-label="Cerrar">
                  <X size={20} />
                </button>
              </header>

              <div className="gx-detalle__foto">
                {detalle.producto.imagenUrl ? <img src={detalle.producto.imagenUrl} alt="" /> : <b>{(detalle.producto.nombre || "?").charAt(0).toUpperCase()}</b>}
              </div>

              <div className="gx-detalle__cifras">
                <div>
                  <small>Para vender</small>
                  <strong>{cantidad(detalle.vendible)}</strong>
                </div>
                <div>
                  <small>Precio</small>
                  <strong>{Number(detalle.producto.precioVenta) > 0 ? dinero(detalle.producto.precioVenta) : "—"}</strong>
                </div>
                <div>
                  <small>Vencidas</small>
                  <strong data-alerta={detalle.vencido > 0}>{cantidad(detalle.vencido)}</strong>
                </div>
              </div>

              <h3 className="gx-detalle__titulo">Por sucursal</h3>
              <ul className="gx-lista">
                {detalle.sucursales.map((suc) => (
                  <li key={suc.id} className="gx-detalle__fila" data-estado={suc.estado}>
                    <span>{suc.nombre}</span>
                    <b>{cantidad(suc.vendible)} u.</b>
                  </li>
                ))}
              </ul>

              <h3 className="gx-detalle__titulo">Lotes</h3>
              {detalle.lotes.length === 0 ? (
                <p className="gx-ayuda">{detalle.producto.controlaVencimiento ? "No quedan lotes con unidades." : "Este producto no vence, así que no se maneja por lotes."}</p>
              ) : (
                <ul className="gx-lista">
                  {detalle.lotes.map((l) => (
                    <li key={l.id} className="gx-detalle__fila" data-vencido={l.vencido}>
                      <span>
                        <b>Lote {l.numero}</b>
                        <small>
                          {l.vencido ? "Venció" : "Vence"} el {fechaCorta(l.vence)}
                          {detalle.sucursales.length > 1 ? ` · ${detalle.sucursales.find((x) => x.id === l.sucursalId)?.nombre || ""}` : ""}
                        </small>
                      </span>
                      <b>{cantidad(l.cantidad)} u.</b>
                    </li>
                  ))}
                </ul>
              )}
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Equipo({ equipo, nombreRol, ahora }) {
  const conectados = equipo.filter((u) => u.enLinea).length;

  return (
    <div className="gx-pantalla">
      <h1 className="gx-titulo">Mi equipo</h1>

      <section className="gx-resumen">
        <div>
          <small>En línea</small>
          <strong>{conectados}</strong>
        </div>
        <div>
          <small>Trabajadores</small>
          <strong>{equipo.length}</strong>
        </div>
      </section>

      {equipo.length === 0 ? (
        <p className="gx-vacio">Aún no tienes trabajadores activos. Créalos desde el panel web.</p>
      ) : (
        <ul className="gx-lista">
          {equipo.map((u, i) => (
            <motion.li key={u.id} className="gx-persona" data-linea={u.enLinea} {...entrada(i)}>
              <span className="gx-persona__avatar">
                <Avatar nombre={u.nombreCompleto} tamano={48} />
                <i data-on={u.enLinea} data-vendiendo={u.vendiendo} aria-hidden="true" />
              </span>
              <span className="gx-fila__texto">
                <b>{u.nombreCompleto}</b>
                <small>{nombreRol(u.rolId)}</small>
              </span>
              <span className="gx-persona__estado" data-vendiendo={u.vendiendo} data-on={u.enLinea}>
                {u.vendiendo ? (
                  <>
                    <Zap size={14} aria-hidden="true" /> Vendiendo
                  </>
                ) : u.enLinea ? (
                  "En línea"
                ) : (
                  hace(u.ultima, ahora)
                )}
              </span>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Ajustes({ marca, usuario, empresaId, salir }) {
  const entradaArchivo = useRef(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [confirmaQuitar, setConfirmaQuitar] = useState(false);
  const [permiso, setPermiso] = useState(() => (typeof Notification === "undefined" ? "no-soportado" : Notification.permission));

  const hayQr = Boolean(marca.qrUrl);

  async function elegirArchivo(evento) {
    const archivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!archivo) return;

    setError("");
    setOk("");

    if (!["image/jpeg", "image/png", "image/webp"].includes(archivo.type)) {
      setError("Sube la foto del QR en JPG, PNG o WEBP.");
      return;
    }

    if (archivo.size > 20 * 1024 * 1024) {
      setError("La imagen pesa demasiado. Usa una de menos de 20 MB.");
      return;
    }

    setSubiendo(true);

    try {
      await subirQrCobro(empresaId, archivo);
      setOk("Listo: tu QR ya se muestra en caja cuando pagan con QR.");
      sonidoPop();
    } catch (e) {
      console.error(e);
      setError(mensajeError(e, "No pudimos subir el QR. Inténtalo otra vez."));
    } finally {
      setSubiendo(false);
    }
  }

  async function alternar() {
    setError("");
    try {
      await cambiarQrActivo(empresaId, !marca.qrActivo);
    } catch (e) {
      console.error(e);
      setError("No pudimos cambiar el estado del QR.");
    }
  }

  async function quitar() {
    if (!confirmaQuitar) {
      setConfirmaQuitar(true);
      setTimeout(() => setConfirmaQuitar(false), 4000);
      return;
    }

    setConfirmaQuitar(false);
    setError("");

    try {
      await quitarQrCobro(empresaId);
      setOk("Quitaste tu QR. En caja ya no se muestra.");
    } catch (e) {
      console.error(e);
      setError("No pudimos quitar el QR. Inténtalo otra vez.");
    }
  }

  async function activarAvisos() {
    if (typeof Notification === "undefined") return;
    setPermiso(await Notification.requestPermission());
  }

  return (
    <div className="gx-pantalla">
      <h1 className="gx-titulo">Ajustes</h1>

      <motion.section className="gx-perfil" {...entrada(0)}>
        <Avatar nombre={marca.nombre} logo={marca.logoUrl} tamano={64} />
        <span>
          <b>{marca.nombre}</b>
          <small>{usuario.nombreCompleto}</small>
          <small>{usuario.correo || usuario.email}</small>
        </span>
      </motion.section>

      <motion.section className="gx-bloque" {...entrada(1)}>
        <h2>
          <QrCode size={18} aria-hidden="true" /> Mi QR de cobro
        </h2>
        <p className="gx-ayuda">Súbelo una vez. Cuando tu equipo cobre con QR, el cliente lo ve en la pantalla de caja. Si la foto es grande, se reduce sola.</p>

        <div className="gx-qr">
          <div className="gx-qr__vista" data-vacio={!hayQr} data-apagado={hayQr && !marca.qrActivo}>
            {hayQr ? <img src={marca.qrUrl} alt="Tu QR de cobro" /> : <QrCode size={44} aria-hidden="true" />}
            {subiendo && <span className="gx-girando" aria-label="Subiendo" />}
          </div>

          <div className="gx-qr__acciones">
            <input ref={entradaArchivo} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={elegirArchivo} />
            <button type="button" className="gx-boton" onClick={() => entradaArchivo.current?.click()} disabled={subiendo}>
              <Upload size={18} aria-hidden="true" />
              {subiendo ? "Subiendo…" : hayQr ? "Cambiar QR" : "Subir mi QR"}
            </button>

            {hayQr && (
              <>
                <label className="gx-interruptor">
                  <input type="checkbox" checked={marca.qrActivo} onChange={alternar} />
                  <span aria-hidden="true" />
                  <b>Mostrar en caja</b>
                </label>
                <button type="button" className="gx-boton gx-boton--suave" data-peligro={confirmaQuitar} onClick={quitar}>
                  <Trash2 size={17} aria-hidden="true" />
                  {confirmaQuitar ? "Toca otra vez para quitar" : "Quitar QR"}
                </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <p className="gx-mensaje" data-tipo="error" role="alert">
            {error}
          </p>
        )}
        {ok && (
          <p className="gx-mensaje" data-tipo="ok" role="status">
            <Check size={16} aria-hidden="true" /> {ok}
          </p>
        )}
      </motion.section>

      <motion.section className="gx-bloque" {...entrada(2)}>
        <h2>
          <BellRing size={18} aria-hidden="true" /> Avisos en el teléfono
        </h2>
        {permiso === "granted" ? (
          <p className="gx-mensaje" data-tipo="ok">
            <Check size={16} aria-hidden="true" /> Activados. Te avisamos cuando algo se esté acabando.
          </p>
        ) : permiso === "denied" ? (
          <p className="gx-ayuda">Los bloqueaste en el navegador. Puedes activarlos desde los permisos del sitio.</p>
        ) : permiso === "no-soportado" ? (
          <p className="gx-ayuda">Este teléfono no permite avisos desde el navegador. Igual verás las alertas dentro de la app.</p>
        ) : (
          <>
            <p className="gx-ayuda">Recibe un aviso cuando se acabe un producto mientras la app esté en segundo plano.</p>
            <button type="button" className="gx-boton gx-boton--suave" onClick={activarAvisos}>
              <Download size={17} aria-hidden="true" /> Activar avisos
            </button>
          </>
        )}
      </motion.section>

      <motion.button type="button" className="gx-salir" onClick={salir} {...entrada(3)}>
        <LogOut size={19} aria-hidden="true" />
        Cerrar sesión
      </motion.button>
    </div>
  );
}
