import { useEffect, useMemo, useState } from "react";
import mensajeError from "../../utils/mensajeError";

import {
  collection,
  onSnapshot,
  query,
  where
} from "firebase/firestore";

import { motion } from "framer-motion";

import { Link } from "react-router-dom";

import {
  ArrowUpRight,
  BarChart3,
  Building2,
  CheckCircle2,
  CircleAlert,
  Package,
  Palette,
  RefreshCw,
  Settings2,
  ShoppingBag,
  Store,
  TrendingUp,
  Wallet,
} from "lucide-react";

import useAuth from "../../hooks/useAuth";

import "../../styles/dashboard-empresa.css";

import {
  db
} from "../../services/firebase/firebaseConfig";

import {
  obtenerDashboardEmpresa
} from "../../services/adminDashboardService";


// ==========================================
// FORMATEAR MONTOS
// ==========================================

const dinero = (valor) => {

  return `Bs ${Number(valor || 0).toLocaleString("es-BO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

};


// ==========================================
// CONVERTIR VALORES A NUMEROS
// ==========================================

const numero = (valor) => {

  const n = Number(valor ?? 0);

  return Number.isFinite(n) ? n : 0;

};


// ==========================================
// CONVERTIR FECHAS DE FIREBASE
// ==========================================

function convertirFecha(valor) {

  if (!valor) return null;

  if (typeof valor.toDate === "function") {
    return valor.toDate();
  }

  if (typeof valor.seconds === "number") {
    return new Date(valor.seconds * 1000);
  }

  if (valor instanceof Date) {
    return valor;
  }

  if (typeof valor === "number") {
    return new Date(valor);
  }

  if (typeof valor === "string") {

    const iso = valor.match(
      /^(\d{4})-(\d{2})-(\d{2})(?:$|\s)/
    );

    if (iso) {

      return new Date(
        +iso[1],
        +iso[2] - 1,
        +iso[3]
      );

    }

    const latina = valor.match(
      /^(\d{2})\/(\d{2})\/(\d{4})/
    );

    if (latina) {

      return new Date(
        +latina[3],
        +latina[2] - 1,
        +latina[1]
      );

    }

    const fecha = new Date(valor);

    return Number.isNaN(fecha.getTime())
      ? null
      : fecha;

  }

  return null;

}


// ==========================================
// OBTENER FECHA DEL REGISTRO
// ==========================================

const fechaRegistro = (registro) => {

  return convertirFecha(

    registro.fechaVenta ??
    registro.fecha ??
    registro.fechaRegistro ??
    registro.createdAt ??
    registro.fechaCreacion

  );

};


// ==========================================
// CLAVE PARA AGRUPAR POR DIA
// ==========================================

const claveDia = (fecha) => {

  return [

    fecha.getFullYear(),

    String(fecha.getMonth() + 1).padStart(2, "0"),

    String(fecha.getDate()).padStart(2, "0")

  ].join("-");

};


// ==========================================
// VERIFICAR VENTAS VALIDAS
// ==========================================

const ventaValida = (venta) => {

  const estado = String(
    venta.estado || "COMPLETADA"
  ).toUpperCase();

  return ![
    "ANULADA",
    "ANULADO",
    "CANCELADA",
    "CANCELADO"
  ].includes(estado);

};


// ==========================================
// VERIFICAR GASTOS VALIDOS
// ==========================================

const gastoValido = (gasto) => {

  const estado = String(
    gasto.estado || "ACTIVO"
  ).toUpperCase();

  return ![
    "INACTIVO",
    "ANULADO",
    "ANULADA",
    "CANCELADO"
  ].includes(estado);

};


// ==========================================
// ESTILOS DEL DASHBOARD
// ==========================================

const estilos = `

.h23 {
  color: #f4f4ff;
}

.h23-eyebrow {
  display: block;
  margin-bottom: 8px;
  color: #a18aff;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 2px;
}

.h23-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 23px;
}

.h23-heading h1 {
  margin: 0 0 7px;
  font-size: clamp(25px, 3vw, 36px);
  line-height: 1.12;
}

.h23-heading p,
.h23-muted {
  color: #999bb5;
}

.h23-heading p {
  margin: 0;
  font-size: 14px;
}

.h23-refresh {
  border: 1px solid #33304f;
  border-radius: 12px;
  background: #171626;
  color: #e7e4ff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 15px;
  cursor: pointer;
}

.h23-refresh:hover {
  border-color: #8c66ff;
}

.h23-filters {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
  margin: 0 0 18px;
}

.h23-filters label {
  color: #a7a6c3;
  font-size: 12px;
  display: flex;
  gap: 9px;
  align-items: center;
}

.h23-filters select {
  color: #f8f7ff;
  background: #161628;
  border: 1px solid #322d4b;
  padding: 10px 14px;
  border-radius: 10px;
  min-width: 136px;
  max-width: 245px;
}

.h23-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}

.h23-kpi {
  min-width: 0;
  padding: 20px;
  border: 1px solid #2a2941;
  border-radius: 19px;
  background: linear-gradient(
    145deg,
    #1a1830,
    #10101b 76%
  );
  position: relative;
  overflow: hidden;
}

.h23-kpi:before {
  content: '';
  width: 110px;
  height: 110px;
  border-radius: 50%;
  position: absolute;
  right: -55px;
  top: -65px;
  background: #684dff29;
  filter: blur(12px);
}

.h23-kpi-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  color: #a9a5c7;
  font-size: 12px;
}

.h23-kpi-icon {
  display: grid;
  place-items: center;
  width: 35px;
  height: 35px;
  border-radius: 11px;
  background: #7c5cff23;
  color: #b19bff;
}

.h23-kpi strong {
  display: block;
  font-size: clamp(20px, 2vw, 29px);
  line-height: 1.15;
  overflow-wrap: anywhere;
}

.h23-kpi small {
  display: block;
  font-size: 11px;
  margin-top: 9px;
  color: #8c91ae;
}

.h23-grid {
  display: grid;
  grid-template-columns: 1.45fr 1fr;
  gap: 16px;
  margin-bottom: 18px;
}

.h23-card {
  background: linear-gradient(
    160deg,
    #181727,
    #0e0f1a 90%
  );
  border: 1px solid #292a42;
  border-radius: 20px;
  padding: 22px;
  min-width: 0;
}

.h23-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 15px;
  margin-bottom: 18px;
}

.h23-card h2 {
  font-size: 17px;
  margin: 0 0 6px;
}

.h23-card p {
  margin: 0;
  font-size: 12px;
  color: #989ab5;
}

.h23-tag {
  padding: 7px 10px;
  border: 1px solid #493c71;
  color: #b3a0ff;
  background: #4b337029;
  border-radius: 8px;
  white-space: nowrap;
  font-size: 11px;
}

.h23-legend {
  font-size: 11px;
  color: #aaa7c7;
  display: flex;
  gap: 14px;
  margin-top: 16px;
  flex-wrap: wrap;
}

.h23-legend i {
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 4px;
  margin-right: 5px;
  background: #795cff;
}

.h23-legend i.cost {
  background: #3fbdd0;
}

.h23-scroll {
  overflow-x: auto;
  padding-bottom: 5px;
}

.h23-chart {
  display: grid;
  gap: 7px;
  align-items: end;
  min-height: 230px;
}

.h23-day {
  min-width: 0;
  display: grid;
  grid-template-rows: 188px 30px;
  align-items: end;
  text-align: center;
}

.h23-pair {
  height: 180px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 3px;
  border-bottom: 1px solid #38344d;
}

.h23-bar {
  min-width: 5px;
  width: 32%;
  max-width: 34px;
  border-radius: 5px 5px 1px 1px;
  transition: height .3s ease;
}

.h23-bar.sale {
  background: linear-gradient(#a17bff, #6551db);
}

.h23-bar.expense {
  background: linear-gradient(#6ee0da, #2793b9);
}

.h23-day small {
  font-size: 10px;
  color: #9294ad;
  padding-top: 9px;
}

.h23-topitem {
  padding: 11px 0;
  border-bottom: 1px solid #29283b;
}

.h23-topline {
  display: flex;
  gap: 12px;
  justify-content: space-between;
  margin-bottom: 9px;
  font-size: 13px;
}

.h23-topline strong {
  overflow-wrap: anywhere;
}

.h23-topline span {
  color: #bbaeff;
  white-space: nowrap;
}

.h23-track {
  height: 7px;
  background: #29253c;
  border-radius: 10px;
  overflow: hidden;
}

.h23-fill {
  height: 100%;
  border-radius: 10px;
  background: linear-gradient(
    90deg,
    #7050ee,
    #54c5f4
  );
}

.h23-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 0 0 19px;
}

.h23-summary > div {
  padding: 17px;
  background: #171626;
  border: 1px solid #2e2b44;
  border-radius: 14px;
}

.h23-summary span {
  display: block;
  color: #9a9db8;
  font-size: 11px;
  margin-bottom: 8px;
}

.h23-summary strong {
  font-size: clamp(18px, 2vw, 24px);
}

.h23-footnote {
  color: #9291af;
  font-size: 11px;
  margin: -8px 0 20px;
}

.h23-empty {
  padding: 42px 14px;
  text-align: center;
  color: #999ab8;
  font-size: 13px;
}

.h23-alert {
  padding: 16px;
  color: #ffb6c5;
  background: #6e203029;
  border: 1px solid #8d3c57;
  border-radius: 13px;
  margin-bottom: 20px;
}

.h23-existing {
  margin-top: 15px;
}

@media (max-width: 1080px) {

  .h23-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .h23-grid {
    grid-template-columns: 1fr;
  }

}

@media (max-width: 560px) {

  .h23-heading {
    align-items: flex-start;
  }

  .h23-heading p {
    font-size: 12px;
  }

  .h23-refresh {
    padding: 10px;
  }

  .h23-metrics {
    gap: 9px;
  }

  .h23-kpi {
    padding: 15px;
  }

  .h23-kpi strong {
    font-size: 19px;
  }

  .h23-card {
    padding: 15px;
  }

  .h23-summary {
    grid-template-columns: 1fr;
  }

  .h23-filters label {
    width: 100%;
    justify-content: space-between;
  }

  .h23-filters select {
    width: 60%;
  }

}

`;


// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

function DashboardPage() {

  const { usuario } = useAuth();

  const empresaId = usuario?.empresaId;

  const mostrarAnalitica =
    usuario?.tipoUsuario === "ADMIN";

  // ========================================
  // ESTADOS
  // ========================================

  const [empresaInfo, setEmpresaInfo] = useState(null);

  const [registros, setRegistros] = useState({

    ventas: [],

    detalleVentas: [],

    gastos: [],

    productos: [],

    sucursales: []

  });

  const [cargandoEmpresa, setCargandoEmpresa] =
    useState(true);

  const [cargandoRegistros, setCargandoRegistros] =
    useState(true);

  const [errorEmpresa, setErrorEmpresa] =
    useState("");

  const [errorRegistros, setErrorRegistros] =
    useState("");

  const [sucursalId, setSucursalId] =
    useState("TODAS");

  const [periodo, setPeriodo] =
    useState(7);

  const [revision, setRevision] =
    useState(0);


  // ========================================
  // CARGAR INFORMACION EMPRESARIAL
  // ========================================

  useEffect(() => {

    let vigente = true;

    setEmpresaInfo(null);

    setCargandoEmpresa(true);

    setErrorEmpresa("");

    if (!empresaId) {

      setErrorEmpresa(
        "El usuario no tiene una empresa asignada."
      );

      setCargandoEmpresa(false);

      return undefined;

    }

    obtenerDashboardEmpresa(empresaId)

      .then((resultado) => {

        if (vigente) {
          setEmpresaInfo(resultado);
        }

      })

      .catch((err) => {

        if (vigente) {

          setErrorEmpresa(
            mensajeError(err, "No se pudo consultar la empresa.")
          );

        }

      })

      .finally(() => {

        if (vigente) {
          setCargandoEmpresa(false);
        }

      });

    return () => {
      vigente = false;
    };

  }, [empresaId, revision]);


  // ========================================
  // ESCUCHAR DATOS REALES DE FIREBASE
  // ========================================

  useEffect(() => {

    let vigente = true;

    setRegistros({

      ventas: [],

      detalleVentas: [],

      gastos: [],

      productos: [],

      sucursales: []

    });

    setCargandoRegistros(true);

    setErrorRegistros("");

    if (!empresaId || !mostrarAnalitica) {

      setCargandoRegistros(false);

      return undefined;

    }

    const nombres = [

      "ventas",

      "detalleVentas",

      "gastos",

      "productos",

      "sucursales"

    ];

    const recibidos = new Set();

    const cancelar = nombres.map((nombre) => {

      return onSnapshot(

        query(

          collection(db, nombre),

          where("empresaId", "==", empresaId)

        ),

        (snapshot) => {

          if (!vigente) return;

          const documentos = snapshot.docs.map(
            (documento) => ({

              id: documento.id,

              ...documento.data()

            })
          );

          setRegistros((anterior) => ({

            ...anterior,

            [nombre]: documentos

          }));

          recibidos.add(nombre);

          if (recibidos.size === nombres.length) {

            setCargandoRegistros(false);

          }

        },

        (err) => {

          if (!vigente) return;

          console.error(
            `Error consultando ${nombre}:`,
            err
          );

          setErrorRegistros(

            `No se pudo leer ${nombre} en Firestore: ${err.message}`

          );

          setCargandoRegistros(false);

        }

      );

    });

    return () => {

      vigente = false;

      cancelar.forEach((detener) => detener());

    };

  }, [empresaId, revision, mostrarAnalitica]);


  // ========================================
  // CALCULAR INDICADORES REALES
  // ========================================

  const estadisticas = useMemo(() => {

    const hoy = new Date();

    hoy.setHours(0, 0, 0, 0);

    const desde = new Date(hoy);

    desde.setDate(
      desde.getDate() - periodo + 1
    );

    const hasta = new Date(hoy);

    hasta.setDate(
      hasta.getDate() + 1
    );


    // FILTRO POR SUCURSAL

    const pertenece = (registro) => {

      return (
        sucursalId === "TODAS" ||
        registro.sucursalId === sucursalId
      );

    };


    // FILTRO POR FECHA

    const enPeriodo = (registro) => {

      const fecha = fechaRegistro(registro);

      return (
        fecha &&
        fecha >= desde &&
        fecha < hasta
      );

    };


    // VENTAS NO ANULADAS

    const ventasValidas = registros.ventas.filter(
      (venta) => {

        return (
          ventaValida(venta) &&
          pertenece(venta)
        );

      }
    );


    const ventasPeriodo = ventasValidas.filter(
      enPeriodo
    );


    // GASTOS ACTIVOS

    const gastosPeriodo = registros.gastos.filter(
      (gasto) => {

        return (
          gastoValido(gasto) &&
          pertenece(gasto) &&
          enPeriodo(gasto)
        );

      }
    );


    // TOTAL DE CADA VENTA

    const totalVenta = (venta) => {

      return numero(

        venta.total ??
        venta.totalVenta ??
        venta.montoTotal

      );

    };


    const suma = (lista, obtenerValor) => {

      return lista.reduce(

        (total, elemento) => {
          return total + obtenerValor(elemento);
        },

        0

      );

    };


    // TOTALES DEL PERIODO

    const totalVentas = suma(
      ventasPeriodo,
      totalVenta
    );

    const totalGastos = suma(

      gastosPeriodo,

      (gasto) => numero(
        gasto.monto ?? gasto.total
      )

    );


    // VENTAS DEL DIA

    const ventasHoy = ventasPeriodo.filter(
      (venta) => {

        return (
          claveDia(fechaRegistro(venta)) ===
          claveDia(hoy)
        );

      }
    );


    // ====================================
    // GRAFICO POR DIA
    // ====================================

    const dias = Array.from(

      { length: periodo },

      (_, indice) => {

        const fecha = new Date(desde);

        fecha.setDate(
          desde.getDate() + indice
        );

        const clave = claveDia(fecha);


        const ventasDia = ventasPeriodo.filter(
          (venta) => {

            return (
              claveDia(fechaRegistro(venta)) === clave
            );

          }
        );


        const gastosDia = gastosPeriodo.filter(
          (gasto) => {

            return (
              claveDia(fechaRegistro(gasto)) === clave
            );

          }
        );


        return {

          clave,

          etiqueta:
            `${fecha.getDate()}/${fecha.getMonth() + 1}`,

          ventas: suma(
            ventasDia,
            totalVenta
          ),

          gastos: suma(

            gastosDia,

            (gasto) => numero(
              gasto.monto ?? gasto.total
            )

          )

        };

      }

    );


    // ====================================
    // PRODUCTOS MAS VENDIDOS
    // ====================================

    const porId = new Map(

      registros.productos.map(
        (producto) => [

          producto.id,

          producto

        ]
      )

    );


    const detallePorVenta = new Map();


    registros.detalleVentas.forEach((detalle) => {

      const lista = detallePorVenta.get(
        detalle.ventaId
      ) || [];

      lista.push(detalle);

      detallePorVenta.set(
        detalle.ventaId,
        lista
      );

    });


    const unidadesPorProducto = new Map();


    ventasPeriodo.forEach((venta) => {

      // COMPATIBLE CON DETALLES GUARDADOS
      // COMO COLECCION O DENTRO DE LA VENTA

      const embebido = [

        venta.detalles,

        venta.items,

        venta.productos,

        venta.detalle

      ].find(

        (valor) => {
          return (
            Array.isArray(valor) &&
            valor.length > 0
          );
        }

      );


      const lineas =

        detallePorVenta.get(venta.id) ||
        embebido ||
        [];


      lineas.forEach((item) => {

        const productoId =

          item.productoId ||
          item.idProducto ||
          item.producto?.id;


        const nombre =

          item.productoNombre ||
          item.nombreProducto ||
          item.nombre ||
          porId.get(productoId)?.nombre ||
          "Producto sin nombre";


        const cantidad = numero(

          item.cantidad ??
          item.cantidadVendida ??
          item.unidades

        );


        const clave = productoId || nombre;


        const anterior =

          unidadesPorProducto.get(clave) ||

          {

            nombre,

            cantidad: 0

          };


        anterior.cantidad += cantidad;


        unidadesPorProducto.set(

          clave,

          anterior

        );

      });

    });


    const populares = [

      ...unidadesPorProducto.values()

    ]

      .sort(
        (a, b) => b.cantidad - a.cantidad
      )

      .slice(0, 5);


    // RESULTADOS

    return {

      totalVentas,

      totalGastos,

      balance: totalVentas - totalGastos,

      ventasHoy: suma(
        ventasHoy,
        totalVenta
      ),

      operacionesHoy: ventasHoy.length,

      operaciones: ventasPeriodo.length,

      dias,

      populares

    };

  }, [registros, sucursalId, periodo]);


  // ========================================
  // DATOS PARA LA INTERFAZ
  // ========================================

  const cargando =
    cargandoEmpresa || cargandoRegistros;

  const error =
    errorEmpresa || errorRegistros;

  const datos = empresaInfo;

  const empresa = datos?.empresa || {};


  const maxGrafica = Math.max(

    1,

    ...estadisticas.dias.flatMap(
      (dia) => [
        dia.ventas,
        dia.gastos
      ]
    )

  );


  const maxProducto = Math.max(

    1,

    ...estadisticas.populares.map(
      (producto) => producto.cantidad
    )

  );


  // ========================================
  // INTERFAZ
  // ========================================

  return (

    <div className="h23">

      <style>
        {estilos}
      </style>


      {/* ENCABEZADO */}

      <div className="h23-heading">

        <div>

          <span className="h23-eyebrow">

            ANALÍTICA EMPRESARIAL

          </span>

          <h1>
            Centro de Control
          </h1>

          <p>

            Bienvenido, {usuario?.nombreCompleto || "Administrador"}.

            {" "}

            Indicadores reales de{" "}

            {empresa.nombreComercial || "tu empresa"}.

          </p>

        </div>


        <button

          className="h23-refresh"

          type="button"

          title="Actualizar datos"

          onClick={() => {

            setRevision(
              (valor) => valor + 1
            );

          }}

        >

          <RefreshCw size={18} />

          Actualizar

        </button>

      </div>


      {mostrarAnalitica && (
        <nav className="h23-atajos" aria-label="Accesos rápidos">
          <Link to="/ventas/pos" className="h23-atajo h23-atajo--principal">
            <ShoppingBag size={22} />
            <span>
              <strong>Cobrar</strong>
              <small>Abrir el punto de venta</small>
            </span>
          </Link>
          <Link to="/ventas" className="h23-atajo">
            <TrendingUp size={22} />
            <span>
              <strong>Ventas</strong>
              <small>Historial y comprobantes</small>
            </span>
          </Link>
          <Link to="/inventario" className="h23-atajo">
            <Package size={22} />
            <span>
              <strong>Inventario</strong>
              <small>Existencias y alertas</small>
            </span>
          </Link>
          <Link to="/finanzas/gastos" className="h23-atajo">
            <Wallet size={22} />
            <span>
              <strong>Gastos</strong>
              <small>Registrar y revisar</small>
            </span>
          </Link>
        </nav>
      )}

      {/* ERROR */}

      {error && (

        <div className="h23-alert">

          <CircleAlert
            size={17}
            style={{
              verticalAlign: "middle"
            }}
          />

          {" "}

          {error}

          {" "}

          Revisa los permisos o pulsa Actualizar.

        </div>

      )}


      {/* CARGANDO */}

      {cargando ? (

        <div className="admin-empty admin-empty-column">

          <RefreshCw

            size={30}

            className="admin-spin"

          />

          <strong>

            Cargando información empresarial y ventas...

          </strong>

        </div>

      ) : !error && (

        <>


          {/* ================================= */}
          {/* ANALITICA EXCLUSIVA DEL ADMIN */}
          {/* ================================= */}

          {mostrarAnalitica && (

            <>


              {/* FILTROS */}

              <div className="h23-filters">

                <label>

                  Sucursal

                  <select

                    value={sucursalId}

                    onChange={(e) => {

                      setSucursalId(
                        e.target.value
                      );

                    }}

                  >

                    <option value="TODAS">

                      Todas las sucursales

                    </option>


                    {registros.sucursales.map(
                      (sucursal) => (

                        <option

                          key={sucursal.id}

                          value={sucursal.id}

                        >

                          {sucursal.nombre ||
                            sucursal.codigo ||
                            "Sucursal"}

                        </option>

                      )
                    )}

                  </select>

                </label>


                <label>

                  Período

                  <select

                    value={periodo}

                    onChange={(e) => {

                      setPeriodo(
                        Number(e.target.value)
                      );

                    }}

                  >

                    <option value={7}>

                      Últimos 7 días

                    </option>

                    <option value={30}>

                      Últimos 30 días

                    </option>

                  </select>

                </label>


                <span

                  className="h23-muted"

                  style={{
                    fontSize: 12
                  }}

                >

                  Datos al día

                </span>

              </div>


              {/* ================================= */}
              {/* TARJETAS DE INDICADORES */}
              {/* ================================= */}

              <section className="h23-metrics">

                {[

                  {

                    icono: Wallet,

                    texto: "Ventas de hoy",

                    valor: dinero(
                      estadisticas.ventasHoy
                    ),

                    nota: "Todas las formas de pago"

                  },

                  {

                    icono: ShoppingBag,

                    texto: "Operaciones de hoy",

                    valor: estadisticas.operacionesHoy,

                    nota: "Ventas no anuladas"

                  },

                  {

                    icono: TrendingUp,

                    texto: `Ventas · ${periodo} días`,

                    valor: dinero(
                      estadisticas.totalVentas
                    ),

                    nota:
                      `${estadisticas.operaciones} operaciones en el período`

                  },

                  {

                    icono: ArrowUpRight,

                    texto: `Gastos · ${periodo} días`,

                    valor: dinero(
                      estadisticas.totalGastos
                    ),

                    nota: "Gastos activos registrados"

                  }

                ].map(

                  ({

                    icono: Icono,

                    texto,

                    valor,

                    nota

                  }, indice) => (

                    <motion.article

                      key={texto}

                      className="h23-kpi"

                      initial={{

                        opacity: 0,

                        y: 12

                      }}

                      animate={{

                        opacity: 1,

                        y: 0

                      }}

                      transition={{

                        delay: indice * 0.07

                      }}

                    >

                      <div className="h23-kpi-top">

                        <span>

                          {texto}

                        </span>


                        <span className="h23-kpi-icon">

                          <Icono size={18} />

                        </span>

                      </div>


                      <strong>

                        {valor}

                      </strong>


                      <small>

                        {nota}

                      </small>

                    </motion.article>

                  )

                )}

              </section>


              {/* ================================= */}
              {/* GRAFICOS */}
              {/* ================================= */}

              <section className="h23-grid">


                {/* VENTAS Y GASTOS */}

                <article className="h23-card">

                  <div className="h23-card-header">

                    <div>

                      <h2>

                        <BarChart3

                          size={19}

                          style={{

                            verticalAlign: "middle",

                            marginRight: 7,

                            color: "#ab95ff"

                          }}

                        />

                        Ventas y gastos

                      </h2>


                      <p>

                        Evolución diaria del período seleccionado

                      </p>

                    </div>


                    <span className="h23-tag">

                      {periodo} días

                    </span>

                  </div>


                  <div className="h23-scroll">

                    <div

                      className="h23-chart"

                      style={{

                        gridTemplateColumns:
                          `repeat(${periodo}, minmax(${periodo === 30 ? 25 : 52}px, 1fr))`,

                        minWidth:
                          periodo === 30 ? 830 : 420

                      }}

                    >

                      {estadisticas.dias.map(
                        (dia) => (

                          <div

                            className="h23-day"

                            key={dia.clave}

                          >

                            <div className="h23-pair">


                              <div

                                className="h23-bar sale"

                                title={

                                  `${dia.clave} · Ventas ${dinero(dia.ventas)}`

                                }

                                style={{

                                  height: dia.ventas > 0

                                    ? `${Math.max(3, (dia.ventas / maxGrafica) * 100)}%`

                                    : "0%"

                                }}

                              />


                              <div

                                className="h23-bar expense"

                                title={

                                  `${dia.clave} · Gastos ${dinero(dia.gastos)}`

                                }

                                style={{

                                  height: dia.gastos > 0

                                    ? `${Math.max(3, (dia.gastos / maxGrafica) * 100)}%`

                                    : "0%"

                                }}

                              />

                            </div>


                            <small>

                              {dia.etiqueta}

                            </small>

                          </div>

                        )
                      )}

                    </div>

                  </div>


                  <div className="h23-legend">

                    <span>

                      <i />

                      Ventas

                    </span>


                    <span>

                      <i className="cost" />

                      Gastos

                    </span>

                  </div>

                </article>


                {/* PRODUCTOS MAS VENDIDOS */}

                <article className="h23-card">

                  <div className="h23-card-header">

                    <div>

                      <h2>

                        <Package

                          size={19}

                          style={{

                            verticalAlign: "middle",

                            marginRight: 7,

                            color: "#ab95ff"

                          }}

                        />

                        Más vendidos

                      </h2>


                      <p>

                        Productos por unidades vendidas

                      </p>

                    </div>


                    <span className="h23-tag">

                      Top 5

                    </span>

                  </div>


                  {estadisticas.populares.length > 0 ? (

                    estadisticas.populares.map(
                      (producto, indice) => (

                        <div

                          className="h23-topitem"

                          key={`${producto.nombre}-${indice}`}

                        >

                          <div className="h23-topline">

                            <strong>

                              {indice + 1}. {producto.nombre}

                            </strong>


                            <span>

                              {producto.cantidad} uds.

                            </span>

                          </div>


                          <div className="h23-track">

                            <div

                              className="h23-fill"

                              style={{

                                width:
                                  `${(producto.cantidad / maxProducto) * 100}%`

                              }}

                            />

                          </div>

                        </div>

                      )
                    )

                  ) : (

                    <div className="h23-empty">

                      Todavía no hay detalles de productos
                      vendidos en este período.

                    </div>

                  )}

                </article>

              </section>


              {/* ================================= */}
              {/* RESUMEN FINANCIERO */}
              {/* ================================= */}

              <div className="h23-summary">

                <div>

                  <span>

                    Ventas del período

                  </span>


                  <strong>

                    {dinero(estadisticas.totalVentas)}

                  </strong>

                </div>


                <div>

                  <span>

                    Gastos operativos del período

                  </span>


                  <strong>

                    {dinero(estadisticas.totalGastos)}

                  </strong>

                </div>


                <div>

                  <span>

                    Ventas menos gastos

                  </span>


                  <strong

                    style={{

                      color:

                        estadisticas.balance >= 0

                          ? "#5cdec1"

                          : "#ff91aa"

                    }}

                  >

                    {dinero(estadisticas.balance)}

                  </strong>

                </div>

              </div>


              <p className="h23-footnote">

                * Este último valor es un indicador simple.
                No representa utilidad neta porque no descuenta
                el costo de los productos vendidos.

              </p>

            </>

          )}


          {/* ================================= */}
          {/* INFORMACION ORIGINAL DE LA EMPRESA */}
          {/* ================================= */}

          <section className="admin-metrics h23-existing">


            {/* EMPRESA */}

            <article className="admin-metric-card">

              <div className="admin-metric-icon">

                <Building2 size={22} />

              </div>


              <div>

                <span>

                  Empresa

                </span>


                <strong>

                  {empresa.estado || "-"}

                </strong>


                <small>

                  {empresa.nombreComercial || "-"}

                </small>

              </div>

            </article>


            {/* SUCURSALES */}

            <article className="admin-metric-card">

              <div className="admin-metric-icon">

                <Store size={22} />

              </div>


              <div>

                <span>

                  Sucursales

                </span>


                <strong>

                  {datos.totalSucursales ?? 0}

                </strong>


                <small>

                  {datos.sucursalesActivas ?? 0} activas

                </small>

              </div>

            </article>

          </section>


          {/* ================================= */}
          {/* CONFIGURACION Y EMPRESA */}
          {/* ================================= */}

          <div className="admin-dashboard-grid h23-existing">


            {/* ESTADO DE CONFIGURACION */}

            <section className="admin-card">

              <div className="admin-card-header">

                <div>

                  <h2>

                    Estado de configuración

                  </h2>


                  <p>

                    Preparación general de tu empresa.

                  </p>

                </div>

              </div>


              <div className="admin-progress-list">

                {[

                  {

                    icono: Building2,

                    titulo: "Empresa registrada",

                    descripcion:
                      "Información empresarial disponible",

                    ok: true

                  },

                  {

                    icono: Settings2,

                    titulo: "Configuración",

                    descripcion:
                      "Moneda y reglas operativas",

                    ok: !!datos.configuracionCompleta

                  },

                  {

                    icono: Palette,

                    titulo: "Personalización",

                    descripcion:
                      "Apariencia administrada por el SUPER_ADMIN",

                    ok: !!datos.personalizacionCompleta

                  },

                  {

                    icono: Store,

                    titulo: "Sucursales",

                    descripcion:
                      `${datos.totalSucursales ?? 0} registradas`,

                    ok:
                      (datos.totalSucursales ?? 0) > 0

                  }

                ].map(

                  ({

                    icono: Icono,

                    titulo,

                    descripcion,

                    ok

                  }) => (

                    <div

                      className="admin-progress-item"

                      key={titulo}

                    >

                      <div className="admin-progress-icon">

                        <Icono size={18} />

                      </div>


                      <div>

                        <strong>

                          {titulo}

                        </strong>


                        <span>

                          {descripcion}

                        </span>

                      </div>


                      {ok ? (

                        <CheckCircle2

                          className="progress-ok"

                          size={20}

                        />

                      ) : (

                        <CircleAlert

                          className="progress-warning"

                          size={20}

                        />

                      )}

                    </div>

                  )

                )}

              </div>

            </section>


            {/* TARJETA EMPRESARIAL */}

            <section className="admin-card admin-company-card">

              <div className="admin-company-glow" />


              <div className="admin-company-icon">

                <Building2 size={28} />

              </div>


              <span className="admin-company-label">

                EMPRESA ACTUAL

              </span>


              <h2>

                {empresa.nombreComercial || "Empresa"}

              </h2>


              <p>

                {empresa.razonSocial ||
                  "Razón social no configurada"}

              </p>


              <div className="admin-company-info">

                {[

                  ["Rubro", empresa.rubro],

                  ["Ciudad", empresa.ciudad],

                  ["NIT", empresa.nit],

                  ["Estado", empresa.estado]

                ].map(

                  ([etiqueta, valor]) => (

                    <div key={etiqueta}>

                      <span>

                        {etiqueta}

                      </span>


                      <strong>

                        {valor || "-"}

                      </strong>

                    </div>

                  )

                )}

              </div>

            </section>

          </div>

        </>

      )}

    </div>

  );

}

export default DashboardPage;