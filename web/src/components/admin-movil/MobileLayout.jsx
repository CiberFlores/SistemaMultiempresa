import { useEffect, useMemo, useState } from "react";

import {
  collection,
  onSnapshot,
  query,
  where
} from "firebase/firestore";

import {
  Navigate,
  useNavigate
} from "react-router-dom";

import {
  AlertTriangle,
  ArrowLeft,
  BellRing,
  Boxes,
  ChartNoAxesColumn,
  House,
  LogOut,
  PackagePlus,
  ReceiptText,
  Search,
  ShieldCheck,
  TrendingUp,
  UserRound
} from "lucide-react";

import useAuth from "../../hooks/useAuth";

import { db } from "../../services/firebase/firebaseConfig";

import "../../styles/admin_movil.css";


// ==========================================
// A. FUNCIONES AUXILIARES
// ==========================================

const dinero = (n) =>
  `Bs ${Number(n || 0).toLocaleString("es-BO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

const numero = (n) =>
  Number(n || 0).toLocaleString("es-BO", {
    maximumFractionDigits: 2
  });

const fechaDe = (v) => {
  if (!v) return null;

  const d =
    typeof v.toDate === "function"
      ? v.toDate()
      : new Date(v);

  return Number.isNaN(d.getTime()) ? null : d;
};

const diaLocal = (d = new Date()) => [
  d.getFullYear(),
  String(d.getMonth() + 1).padStart(2, "0"),
  String(d.getDate()).padStart(2, "0")
].join("-");

const diasHasta = (s) => {
  if (
    typeof s !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(s)
  ) {
    return null;
  }

  const [y, m, d] = s.split("-").map(Number);

  const fecha = new Date(Date.UTC(y, m - 1, d));

  if (fecha.toISOString().slice(0, 10) !== s) {
    return null;
  }

  return Math.round(
    (
      Date.parse(`${s}T00:00:00Z`) -
      Date.parse(`${diaLocal()}T00:00:00Z`)
    ) / 86400000
  );
};


// ==========================================
// B. APLICACION PRINCIPAL
// ==========================================

export default function MobileLayout() {

  const {
    usuario,
    cargando,
    cerrarSesion
  } = useAuth();

  const navigate = useNavigate();

  const empresaId =
    usuario?.tipoUsuario === "ADMIN"
      ? usuario.empresaId
      : null;


  // ========================================
  // ESTADOS
  // ========================================

  const [pagina, setPagina] = useState("inicio");

  const [sucursalId, setSucursalId] = useState("TODAS");

  const [busqueda, setBusqueda] = useState("");

  const [productos, setProductos] = useState([]);

  const [inventarios, setInventarios] = useState([]);

  const [ventas, setVentas] = useState([]);

  const [sucursales, setSucursales] = useState([]);

  const [lotes, setLotes] = useState([]);

  const [error, setError] = useState("");

  const [cargandoDatos, setCargandoDatos] = useState(true);


  // ========================================
  // C. ESCUCHAR FIREBASE EN TIEMPO REAL
  // ========================================

  useEffect(() => {

    if (!empresaId) {
      setCargandoDatos(false);
      return;
    }

    let activo = true;

    setCargandoDatos(true);
    setError("");

    setProductos([]);
    setInventarios([]);
    setVentas([]);
    setSucursales([]);
    setLotes([]);

    const pendientes = new Set([
      "productos",
      "inventarios",
      "ventas",
      "sucursales",
      "lotesInventario"
    ]);


    function escuchar(nombre, actualizar) {

      const consulta = query(
        collection(db, nombre),
        where("empresaId", "==", empresaId)
      );

      return onSnapshot(

        consulta,

        (snapshot) => {

          if (!activo) return;

          const registros = snapshot.docs.map(
            (documento) => ({
              id: documento.id,
              ...documento.data()
            })
          );

          actualizar(registros);

          pendientes.delete(nombre);

          if (pendientes.size === 0) {
            setCargandoDatos(false);
          }

        },

        (err) => {

          if (!activo) return;

          console.error(
            `Arca Nova GO / ${nombre}`,
            err
          );

          setError(
            `No se pudo consultar ${nombre}: ${err.message}`
          );

          pendientes.delete(nombre);

          setCargandoDatos(false);

        }

      );

    }


    const cancelar = [

      escuchar("productos", setProductos),

      escuchar("inventarios", setInventarios),

      escuchar("ventas", setVentas),

      escuchar("sucursales", setSucursales),

      escuchar("lotesInventario", setLotes)

    ];


    return () => {

      activo = false;

      cancelar.forEach(
        (funcion) => funcion()
      );

    };

  }, [empresaId]);


  // ========================================
  // D. OBTENER TODOS LOS PRODUCTOS ACTIVOS
  // ========================================

  const activos = useMemo(() => {

    return productos

      .filter(
        (producto) =>
          producto.estado === "ACTIVO"
      )

      .sort(
        (a, b) =>
          String(a.nombre || "").localeCompare(
            String(b.nombre || "")
          )
      );

  }, [productos]);


  // ========================================
  // E. CREAR MAPAS
  // ========================================

  const productosMap = useMemo(
    () => new Map(
      activos.map(
        (producto) => [
          producto.id,
          producto
        ]
      )
    ),
    [activos]
  );


  const sucursalesMap = useMemo(
    () => new Map(
      sucursales.map(
        (sucursal) => [
          sucursal.id,
          sucursal.nombre
        ]
      )
    ),
    [sucursales]
  );


  // ========================================
  // F. CALCULAR LOTES VIGENTES
  // ========================================

  const vigentesPorClave = useMemo(() => {

    const mapa = new Map();

    for (const lote of lotes) {

      const dias = diasHasta(
        lote.fechaVencimiento
      );

      if (
        lote.estado !== "ACTIVO" ||
        dias === null ||
        dias < 0
      ) {
        continue;
      }

      const cantidad = Number(
        lote.cantidadDisponible || 0
      );

      if (
        !Number.isFinite(cantidad) ||
        cantidad <= 0
      ) {
        continue;
      }

      const clave =
        `${lote.sucursalId}_${lote.productoId}`;

      mapa.set(
        clave,
        (mapa.get(clave) || 0) + cantidad
      );

    }

    return mapa;

  }, [lotes]);


  // ========================================
  // G. PREPARAR EXISTENCIAS
  // ========================================

  const existencias = useMemo(() => {

    return inventarios

      .map((inventario) => {

        const producto = productosMap.get(
          inventario.productoId
        );

        if (!producto) return null;

        const fisico = Math.max(
          0,
          Number(inventario.stock || 0)
        );

        const clave =
          `${inventario.sucursalId}_${inventario.productoId}`;


        // PRODUCTOS CON VENCIMIENTO

        const vendible =
          producto.controlaVencimiento === true

            ? Math.min(
                fisico,
                Math.max(
                  0,
                  vigentesPorClave.get(clave) || 0
                )
              )

            : fisico;


        return {

          ...inventario,

          producto,

          fisico,

          vendible,

          tieneRegistro: true,

          nombreSucursal:
            sucursalesMap.get(inventario.sucursalId) ||
            "Sucursal"

        };

      })

      .filter(Boolean);

  }, [
    inventarios,
    productosMap,
    vigentesPorClave,
    sucursalesMap
  ]);


  // ========================================
  // H. CATALOGO COMPLETO
  // ========================================

  // IMPORTANTE:
  // MOSTRAMOS TODOS LOS PRODUCTOS ACTIVOS.
  // NO SOLO LOS QUE TIENEN INVENTARIO.

  const catalogo = useMemo(() => {

    const filas = [];


    // TODAS LAS SUCURSALES

    if (sucursalId === "TODAS") {

      const conInventario = new Set();

      existencias.forEach((item) => {

        filas.push(item);

        conInventario.add(
          item.productoId
        );

      });


      // AGREGAR PRODUCTOS SIN STOCK

      activos

        .filter(
          (producto) =>
            !conInventario.has(producto.id)
        )

        .forEach((producto) => {

          filas.push({

            id: `sin-stock-${producto.id}`,

            productoId: producto.id,

            sucursalId: null,

            nombreSucursal:
              "Sin inventario registrado",

            producto,

            fisico: 0,

            vendible: 0,

            tieneRegistro: false

          });

        });

    } else {

      // UNA SUCURSAL ESPECIFICA

      const mapa = new Map(

        existencias

          .filter(
            (item) =>
              item.sucursalId === sucursalId
          )

          .map(
            (item) => [
              item.productoId,
              item
            ]
          )

      );


      activos.forEach((producto) => {

        const encontrado = mapa.get(
          producto.id
        );


        filas.push(

          encontrado || {

            id:
              `sin-stock-${sucursalId}-${producto.id}`,

            productoId:
              producto.id,

            sucursalId,

            nombreSucursal:
              sucursalesMap.get(sucursalId) ||
              "Sucursal",

            producto,

            fisico: 0,

            vendible: 0,

            tieneRegistro: false

          }

        );

      });

    }


    return filas.sort(
      (a, b) =>
        String(a.producto.nombre || "").localeCompare(
          String(b.producto.nombre || "")
        )
    );

  }, [
    sucursalId,
    existencias,
    activos,
    sucursalesMap
  ]);


  // ========================================
  // I. BUSCAR PRODUCTOS
  // ========================================

  const filtrados = useMemo(() => {

    const texto = busqueda
      .toLowerCase()
      .trim();

    return catalogo.filter((item) => {

      return [

        item.producto.nombre,

        item.producto.sku,

        item.producto.codigoBarras

      ].some(
        (valor) =>
          String(valor || "")
            .toLowerCase()
            .includes(texto)
      );

    });

  }, [catalogo, busqueda]);


  // ========================================
  // J. FILTRAR EXISTENCIAS
  // ========================================

  const existenciasVista = existencias.filter(
    (item) =>
      sucursalId === "TODAS" ||
      item.sucursalId === sucursalId
  );


  // ========================================
  // K. FILTRAR VENTAS
  // ========================================

  const ventasVista = ventas.filter(
    (venta) =>
      sucursalId === "TODAS" ||
      venta.sucursalId === sucursalId
  );


  const completadas = ventasVista.filter(
    (venta) =>
      venta.estado === "COMPLETADA"
  );


  // ========================================
  // L. VENTAS DEL DIA
  // ========================================

  const hoyVentas = completadas.filter(
    (venta) => {

      const fecha = fechaDe(
        venta.fechaRegistro
      );

      return fecha &&
        diaLocal(fecha) === diaLocal();

    }
  );


  // ========================================
  // M. ESTADISTICAS
  // ========================================

  const totalHoy = hoyVentas.reduce(
    (suma, venta) =>
      suma + Number(venta.total || 0),
    0
  );


  const totalVentas = completadas.reduce(
    (suma, venta) =>
      suma + Number(venta.total || 0),
    0
  );


  const stockTotal = existenciasVista.reduce(
    (suma, item) =>
      suma + item.vendible,
    0
  );


  // ========================================
  // N. ALERTAS DE VENCIMIENTO
  // ========================================

  const alertas = lotes

    .filter(
      (lote) =>
        sucursalId === "TODAS" ||
        lote.sucursalId === sucursalId
    )

    .filter(
      (lote) =>
        lote.estado === "ACTIVO" &&
        Number(lote.cantidadDisponible || 0) > 0
    )

    .map((lote) => ({

      ...lote,

      dias: diasHasta(
        lote.fechaVencimiento
      ),

      producto: productosMap.get(
        lote.productoId
      )

    }))

    .filter(
      (lote) =>
        lote.dias === null ||
        lote.dias <= Number(
          lote.producto?.diasAlertaVencimiento ?? 15
        )
    )

    .sort(
      (a, b) =>
        (a.dias ?? -9999) -
        (b.dias ?? -9999)
    );


  // ========================================
  // O. PRODUCTOS CON STOCK BAJO
  // ========================================

  const stockBajo = catalogo.filter(
    (item) =>
      item.vendible <= Number(
        item.producto.stockMinimo || 0
      )
  );


  // ========================================
  // P. ULTIMAS VENTAS
  // ========================================

  const ultimas = [...ventasVista]

    .sort(
      (a, b) =>
        (
          fechaDe(b.fechaRegistro)?.getTime() || 0
        ) -
        (
          fechaDe(a.fechaRegistro)?.getTime() || 0
        )
    )

    .slice(0, 80);


  // ========================================
  // Q. PROTEGER ACCESO
  // ========================================

  if (cargando) {

    return (
      <div className="go-loading">
        Comprobando acceso...
      </div>
    );

  }


  if (!usuario) {

    return (
      <Navigate
        to="/login"
        replace
      />
    );

  }


  if (
    usuario.tipoUsuario !== "ADMIN" ||
    !usuario.empresaId
  ) {

    return (
      <Navigate
        to="/sin-permiso"
        replace
      />
    );

  }


  // ========================================
  // R. CAMBIAR PANTALLA
  // ========================================

  const cambiar = (paginaNueva) => {

    setPagina(paginaNueva);

    window.scrollTo(0, 0);

  };


  // ========================================
  // S. CERRAR SESION
  // ========================================

  const salir = async () => {

    await cerrarSesion();

    navigate("/login", {
      replace: true
    });

  };


  // ========================================
  // T. INTERFAZ
  // ========================================

  return (

    <div className="go-app">

      {/* ENCABEZADO */}

      <header className="go-header">

        <div className="go-brand">

          <img className="arca-nova-mark" src="/brand/arca-nova-mark.png" alt="" width={46} height={46} />

          <div>

            <strong>
              Arca Nova <span>GO</span>
            </strong>

            <small>
              PANEL DEL ADMINISTRADOR
            </small>

          </div>

        </div>


        <button
          type="button"
          className="go-icon-button"
          onClick={() => navigate("/dashboard")}
          title="Volver a la web"
        >

          <ArrowLeft size={20} />

        </button>

      </header>


      {/* SELECTOR DE SUCURSAL */}

      <div className="go-sucursal">

        <span>

          ● {error
            ? "ERROR DE SINCRONIZACIÓN"
            : "FIREBASE CONECTADO"}

        </span>


        <select
          value={sucursalId}
          onChange={(e) => {

            setSucursalId(e.target.value);

            setBusqueda("");

          }}
        >

          <option value="TODAS">
            Todas las sucursales
          </option>


          {sucursales

            .filter(
              (sucursal) =>
                sucursal.estado === "ACTIVA"
            )

            .map((sucursal) => (

              <option
                key={sucursal.id}
                value={sucursal.id}
              >

                {sucursal.nombre}

              </option>

            ))}

        </select>

      </div>


      {/* CONTENIDO */}

      <main className="go-content">

        {error && (

          <div className="go-error">
            {error}
          </div>

        )}


        {cargandoDatos ? (

          <div className="go-loading">
            Sincronizando información...
          </div>

        ) : (

          <>

            {/* ========================== */}
            {/* INICIO */}
            {/* ========================== */}

            {pagina === "inicio" && (

              <div className="go-animation">

                <div className="go-title">

                  <small>
                    BIENVENIDO A TU NEGOCIO
                  </small>

                  <h1>
                    Todo bajo control ✦
                  </h1>

                  <p>
                    Consulta tu empresa desde cualquier lugar.
                  </p>

                </div>


                <div className="go-hero">

                  <div className="go-hero-label">

                    <TrendingUp size={17} />

                    VENTAS DE HOY

                  </div>


                  <strong>
                    {dinero(totalHoy)}
                  </strong>

                  <span>
                    {hoyVentas.length} ventas completadas
                  </span>

                </div>


                <div className="go-stat-grid">

                  <button
                    onClick={() => cambiar("inventario")}
                  >

                    <Boxes size={22} />

                    <strong>
                      {numero(activos.length)}
                    </strong>

                    <span>
                      Productos
                    </span>

                  </button>


                  <button
                    onClick={() => cambiar("ventas")}
                  >

                    <ReceiptText size={22} />

                    <strong>
                      {numero(completadas.length)}
                    </strong>

                    <span>
                      Ventas
                    </span>

                  </button>


                  <button
                    onClick={() => cambiar("inventario")}
                  >

                    <ChartNoAxesColumn size={22} />

                    <strong>
                      {numero(stockTotal)}
                    </strong>

                    <span>
                      Stock vendible
                    </span>

                  </button>


                  <button
                    onClick={() => cambiar("alertas")}
                  >

                    <BellRing size={22} />

                    <strong>
                      {numero(alertas.length)}
                    </strong>

                    <span>
                      Lotes con alerta
                    </span>

                  </button>

                </div>


                <h2 className="go-section-title">
                  Accesos rápidos
                </h2>


                <div className="go-quick">

                  <button
                    onClick={() => cambiar("inventario")}
                  >
                    📦 Ver inventario
                  </button>


                  <button
                    onClick={() => cambiar("ventas")}
                  >
                    🧾 Ver ventas
                  </button>

                </div>

              </div>

            )}


            {/* ========================== */}
            {/* INVENTARIO Y CATALOGO */}
            {/* ========================== */}

            {pagina === "inventario" && (

              <div className="go-animation">

                <div className="go-title">

                  <small>
                    CATÁLOGO E INVENTARIO
                  </small>

                  <h1>
                    Mis productos
                  </h1>

                  <p>

                    {activos.length} productos activos.
                    Los recién creados aparecen
                    incluso con stock cero.

                  </p>

                </div>


                <div className="go-search">

                  <Search size={19} />

                  <input
                    type="text"
                    placeholder="Buscar producto, SKU o código..."
                    value={busqueda}
                    onChange={(e) =>
                      setBusqueda(e.target.value)
                    }
                  />

                </div>


                <div className="go-product-list">

                  {filtrados.map((item) => (

                    <div
                      className="go-product-card"
                      key={
                        `${item.sucursalId || "general"}_${item.productoId}`
                      }
                    >

                      {/* FOTOGRAFIA */}

                      <div className="go-product-image">

                        {item.producto.imagenUrl ? (

                          <img
                            src={item.producto.imagenUrl}
                            alt={item.producto.nombre}
                            loading="lazy"
                          />

                        ) : (

                          <Boxes size={27} />

                        )}

                      </div>


                      {/* DATOS DEL PRODUCTO */}

                      <div className="go-product-info">

                        <strong>
                          {item.producto.nombre}
                        </strong>

                        <span>
                          {item.nombreSucursal}
                        </span>

                        <span>
                          {item.producto.sku || "Sin SKU"}
                        </span>

                        <b>
                          {dinero(item.producto.precioVenta)}
                        </b>


                        {item.producto.controlaVencimiento && (

                          <small>
                            Control por lotes
                          </small>

                        )}


                        {!item.tieneRegistro && (

                          <small
                            style={{
                              color: "#ffc783"
                            }}
                          >

                            <PackagePlus
                              size={12}
                            />

                            Sin inventario registrado

                          </small>

                        )}

                      </div>


                      {/* STOCK */}

                      <div className="go-product-stock">

                        <strong>
                          {numero(item.vendible)}
                        </strong>

                        <span>
                          Vendible
                        </span>

                        <small>
                          Físico: {numero(item.fisico)}
                        </small>

                      </div>

                    </div>

                  ))}

                </div>


                {!filtrados.length && (

                  <div className="go-loading">

                    No encontramos productos.

                  </div>

                )}

              </div>

            )}


            {/* ========================== */}
            {/* VENTAS */}
            {/* ========================== */}

            {pagina === "ventas" && (

              <div className="go-animation">

                <div className="go-title">

                  <small>
                    HISTORIAL
                  </small>

                  <h1>
                    Mis ventas
                  </h1>

                  <p>
                    Ventas registradas en tu empresa.
                  </p>

                </div>


                <div className="go-list">

                  {ultimas.map((venta) => (

                    <div
                      className="go-list-card"
                      key={venta.id}
                    >

                      <div className="go-list-icon">
                        <ReceiptText size={21} />
                      </div>


                      <div className="go-list-info">

                        <strong>
                          Venta #{venta.id.slice(0, 8)}
                        </strong>

                        <span>

                          {fechaDe(
                            venta.fechaRegistro
                          )?.toLocaleString("es-BO") || "-"}

                        </span>

                        <small>

                          {venta.metodoPago}

                          {" · "}

                          {venta.estado}

                        </small>

                      </div>


                      <b>
                        {dinero(venta.total)}
                      </b>

                    </div>

                  ))}

                </div>


                {!ultimas.length && (

                  <div className="go-loading">
                    No hay ventas registradas.
                  </div>

                )}

              </div>

            )}


            {/* ========================== */}
            {/* RESUMEN */}
            {/* ========================== */}

            {pagina === "finanzas" && (

              <div className="go-animation">

                <div className="go-title">

                  <small>
                    RESUMEN GERENCIAL
                  </small>

                  <h1>
                    Resumen de ventas
                  </h1>

                  <p>

                    Importes registrados;
                    no representan utilidad neta
                    ni saldo de caja.

                  </p>

                </div>


                <div className="go-hero">

                  <div className="go-hero-label">

                    <ChartNoAxesColumn size={18} />

                    TOTAL REGISTRADO

                  </div>


                  <strong>
                    {dinero(totalVentas)}
                  </strong>

                  <span>
                    {completadas.length} ventas completadas
                  </span>

                </div>


                <h2 className="go-section-title">
                  Por método de pago
                </h2>


                <div className="go-list">

                  {[
                    "EFECTIVO",
                    "QR",
                    "TARJETA",
                    "TRANSFERENCIA",
                    "CREDITO"
                  ].map((metodo) => {

                    const totalMetodo = completadas

                      .filter(
                        (venta) =>
                          venta.metodoPago === metodo
                      )

                      .reduce(
                        (suma, venta) =>
                          suma + Number(venta.total || 0),
                        0
                      );


                    return (

                      <div
                        className="go-list-card"
                        key={metodo}
                      >

                        <div className="go-list-icon">
                          <ChartNoAxesColumn size={19} />
                        </div>

                        <div className="go-list-info">
                          <strong>{metodo}</strong>
                        </div>

                        <b>
                          {dinero(totalMetodo)}
                        </b>

                      </div>

                    );

                  })}

                </div>

              </div>

            )}


            {/* ========================== */}
            {/* ALERTAS */}
            {/* ========================== */}

            {pagina === "alertas" && (

              <div className="go-animation">

                <div className="go-title">

                  <small>
                    MONITOREO
                  </small>

                  <h1>
                    Alertas
                  </h1>

                  <p>
                    Vencimientos y stock bajo.
                  </p>

                </div>


                <h2 className="go-section-title">
                  Vencimientos
                </h2>


                <div className="go-list">

                  {alertas.map((lote) => (

                    <div
                      className="go-list-card"
                      key={lote.id}
                    >

                      <div className="go-list-icon go-warning">
                        <AlertTriangle size={20} />
                      </div>


                      <div className="go-list-info">

                        <strong>
                          {lote.producto?.nombre || "Producto"}
                        </strong>

                        <span>

                          Lote {lote.numeroLote || lote.id.slice(0, 8)}

                          {" · "}

                          {lote.fechaVencimiento || "Sin fecha"}

                        </span>

                        <small>

                          {numero(lote.cantidadDisponible)}
                          {" "}unidades

                        </small>

                      </div>


                      <b className="go-warning-text">

                        {lote.dias === null

                          ? "Fecha inválida"

                          : lote.dias < 0

                            ? "Vencido"

                            : lote.dias === 0

                              ? "Hoy"

                              : `${lote.dias} días`}

                      </b>

                    </div>

                  ))}

                </div>


                {!alertas.length && (

                  <div className="go-loading">

                    No hay lotes con alerta.

                  </div>

                )}


                <h2 className="go-section-title">
                  Stock bajo
                </h2>


                <div className="go-list">

                  {stockBajo.map((item) => (

                    <div
                      className="go-list-card"
                      key={
                        `${item.sucursalId || "general"}_${item.productoId}`
                      }
                    >

                      <div className="go-list-icon go-warning">
                        <Boxes size={19} />
                      </div>


                      <div className="go-list-info">

                        <strong>
                          {item.producto.nombre}
                        </strong>

                        <span>
                          {item.nombreSucursal}
                        </span>

                      </div>


                      <b className="go-warning-text">
                        {numero(item.vendible)}
                      </b>

                    </div>

                  ))}

                </div>

              </div>

            )}


            {/* ========================== */}
            {/* PERFIL */}
            {/* ========================== */}

            {pagina === "perfil" && (

              <div className="go-animation">

                <div className="go-title">

                  <small>
                    MI CUENTA
                  </small>

                  <h1>
                    Mi perfil
                  </h1>

                </div>


                <div className="go-profile">

                  <div className="go-profile-avatar">
                    <UserRound size={32} />
                  </div>

                  <h2>
                    {usuario.nombreCompleto || "Administrador"}
                  </h2>

                  <span>

                    <ShieldCheck size={16} />

                    ADMIN

                  </span>

                </div>


                <div className="go-profile-details">

                  <p>

                    Correo:

                    <strong>
                      {usuario.email || usuario.correo}
                    </strong>

                  </p>


                  <p>

                    Empresa:

                    <strong>
                      {usuario.empresaId}
                    </strong>

                  </p>

                </div>


                <button
                  type="button"
                  className="go-logout"
                  onClick={salir}
                >

                  <LogOut size={19} />

                  Cerrar sesión

                </button>

              </div>

            )}

          </>

        )}

      </main>


      {/* NAVEGACION INFERIOR */}

      <nav className="go-navigation">

        {[
          ["inicio", "Inicio", House],
          ["inventario", "Stock", Boxes],
          ["ventas", "Ventas", ReceiptText],
          ["finanzas", "Resumen", ChartNoAxesColumn],
          ["alertas", "Alertas", BellRing],
          ["perfil", "Perfil", UserRound]
        ].map(([id, titulo, Icono]) => (

          <button
            type="button"
            key={id}
            className={
              pagina === id
                ? "go-nav-active"
                : ""
            }
            onClick={() => cambiar(id)}
          >

            <Icono size={20} />

            <span>
              {titulo}
            </span>

          </button>

        ))}

      </nav>

    </div>

  );

}