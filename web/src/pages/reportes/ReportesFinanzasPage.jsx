import { useEffect, useMemo, useState } from "react";

import { motion } from "framer-motion";

import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CreditCard,
  Download,
  RefreshCw,
  ShoppingBag,
  Store,
  TrendingUp,
  Wallet,
  AlertCircle
} from "lucide-react";

import useAuth from "../../hooks/useAuth";

import {
  suscribirColeccionEmpresa
} from "../../services/genericCrudService";


// ==========================================
// 1. COLECCIONES DE FIREBASE
// ==========================================

const COLECCIONES = [
  "ventas",
  "compras",
  "gastos",
  "cuentasCobrar",
  "cuentasPagar",
  "movimientosCaja",
  "sucursales"
];

const BASE = Object.fromEntries(
  COLECCIONES.map((nombre) => [nombre, []])
);


// ==========================================
// 2. FORMATEAR DINERO
// ==========================================

const MONEDA = new Intl.NumberFormat("es-BO", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const bs = (valor) => {
  return `Bs ${MONEDA.format(Number(valor) || 0)}`;
};


// ==========================================
// 3. CONVERTIR NUMEROS
// ==========================================

const num = (valor) => {
  const resultado = Number(valor);

  return Number.isFinite(resultado)
    ? resultado
    : 0;
};

const suma = (lista, obtenerValor) => {
  return lista.reduce(
    (total, registro) => total + num(obtenerValor(registro)),
    0
  );
};


// ==========================================
// 4. CONVERTIR FECHAS DE FIREBASE
// ==========================================

function fecha(valor) {

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

  if (
    typeof valor === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(valor)
  ) {

    const [anio, mes, dia] = valor
      .split("-")
      .map(Number);

    return new Date(anio, mes - 1, dia);

  }

  const resultado = new Date(valor);

  return Number.isNaN(resultado.getTime())
    ? null
    : resultado;

}


// ==========================================
// 5. FECHAS SEGUN COLECCION
// ==========================================

function fechaRegistro(registro, origen) {

  const campos = {

    ventas: [
      "fechaVenta",
      "fechaRegistro",
      "fecha",
      "createdAt"
    ],

    compras: [
      "fechaCompra",
      "fechaRegistro",
      "fecha",
      "createdAt"
    ],

    gastos: [
      "fecha",
      "fechaGasto",
      "fechaRegistro",
      "createdAt"
    ],

    movimientosCaja: [
      "fechaRegistro",
      "fechaMovimiento",
      "fecha",
      "createdAt"
    ]

  };

  const opciones = campos[origen] || [
    "fechaRegistro",
    "fecha"
  ];

  for (const nombre of opciones) {

    const resultado = fecha(registro[nombre]);

    if (resultado) {
      return resultado;
    }

  }

  return null;

}


// ==========================================
// 6. FORMATO DE FECHA PARA FILTROS
// ==========================================

function diaClave(d) {

  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0")
  ].join("-");

}


// ==========================================
// 7. ESTADOS VALIDOS
// ==========================================

function valido(registro) {

  const estado = String(
    registro.estado || ""
  ).toUpperCase();

  return ![
    "ANULADA",
    "ANULADO",
    "CANCELADA",
    "CANCELADO",
    "INACTIVO"
  ].includes(estado);

}


// ==========================================
// 8. TOTALES DE VENTAS Y COMPRAS
// ==========================================

function totalOperacion(registro) {

  return num(
    registro.total ??
    registro.totalVenta ??
    registro.totalCompra ??
    registro.montoTotal ??
    0
  );

}


// ==========================================
// 9. TIPO DE MOVIMIENTO DE CAJA
// ==========================================

function movimientoTipo(registro) {

  return String(
    registro.tipo || ""
  ).toUpperCase();

}


// ==========================================
// 10. ESTILOS PREMIUM
// ==========================================

const ESTILOS = `

.rf26 {
  color: #f3f0ff;
}

.rf26 .rf26-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 22px;
}

.rf26 .rf26-top h1 {
  margin: 5px 0 8px;
  font-size: clamp(27px, 3vw, 39px);
  line-height: 1.12;
  letter-spacing: -1px;
}

.rf26 .rf26-top p {
  margin: 0;
  color: #999bb6;
  font-size: 13px;
}

.rf26 .rf26-eyebrow {
  font-size: 11px;
  color: #ac92ff;
  font-weight: 800;
  letter-spacing: 2px;
}

.rf26 .rf26-actions {
  display: flex;
  gap: 9px;
  flex-wrap: wrap;
}

.rf26 button,
.rf26 input,
.rf26 select {
  font: inherit;
}

.rf26 .rf26-btn {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px 14px;
  border: 1px solid #393455;
  color: #eae7ff;
  background: #1a192b;
  border-radius: 12px;
  transition: 0.2s;
}

.rf26 .rf26-btn:hover {
  border-color: #9879ff;
  transform: translateY(-2px);
}

.rf26 .rf26-btn.primary {
  background: linear-gradient(
    120deg,
    #8254f4,
    #4b9cfb
  );
  border: 0;
  color: white;
  font-weight: 700;
}

.rf26 .rf26-filters {
  background: linear-gradient(
    125deg,
    #171727,
    #11121e
  );
  border: 1px solid #2c2944;
  border-radius: 18px;
  padding: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 13px;
  align-items: flex-end;
  margin-bottom: 18px;
}

.rf26 .rf26-filter {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 145px;
  flex: 1;
}

.rf26 .rf26-filter > span {
  color: #a29ebc;
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.rf26 .rf26-filter input,
.rf26 .rf26-filter select {
  background: #101120;
  color: #f2efff;
  border: 1px solid #33304d;
  outline: none;
  border-radius: 10px;
  padding: 10px;
  min-height: 42px;
  width: 100%;
  color-scheme: dark;
}

.rf26 .rf26-filter input:focus,
.rf26 .rf26-filter select:focus {
  border-color: #8c70f6;
}

.rf26 .rf26-warning {
  padding: 13px 15px;
  border-radius: 12px;
  background: rgba(80, 42, 43, 0.3);
  border: 1px solid #884c53;
  color: #ffd0d5;
  margin-bottom: 16px;
  font-size: 13px;
  display: flex;
  gap: 8px;
  align-items: center;
}

.rf26 .rf26-status {
  color: #9d9ab7;
  font-size: 12px;
  margin: 0 0 13px;
}

.rf26 .rf26-kpis {
  display: grid;
  grid-template-columns: repeat(
    4,
    minmax(0, 1fr)
  );
  gap: 13px;
  margin-bottom: 18px;
}

.rf26 .rf26-card {
  min-width: 0;
  border: 1px solid #302d4a;
  border-radius: 18px;
  background: linear-gradient(
    155deg,
    #1b1834,
    #11121f 85%
  );
  padding: 19px;
  overflow: hidden;
  transition: 0.25s;
}

.rf26 .rf26-card:hover {
  border-color: #7860c8;
  transform: translateY(-3px);
  box-shadow: 0 12px 30px #6545e71a;
}

.rf26 .rf26-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  color: #aba7c5;
  font-size: 12px;
  margin-bottom: 15px;
}

.rf26 .rf26-icon {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  background: #6d54dd28;
  border-radius: 11px;
  color: #b497ff;
  flex-shrink: 0;
}

.rf26 .rf26-card strong {
  display: block;
  font-size: clamp(19px, 2vw, 28px);
  word-break: break-word;
  margin-bottom: 8px;
}

.rf26 .rf26-card small {
  color: #9798b3;
  font-size: 11px;
  line-height: 1.4;
}

.rf26 .rf26-cash {
  background: linear-gradient(
    125deg,
    #222040,
    #111726
  );
  border: 1px solid #554482;
  border-radius: 21px;
  padding: 22px;
  margin-bottom: 18px;
}

.rf26 .rf26-cashhead {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 18px;
}

.rf26 .rf26-cash h2 {
  font-size: 18px;
  margin: 0 0 6px;
}

.rf26 .rf26-cash p {
  margin: 0;
  color: #aaa7c5;
  font-size: 12px;
}

.rf26 .rf26-pill {
  background: #7458e428;
  border: 1px solid #7461ab77;
  color: #c6b8ff;
  border-radius: 50px;
  padding: 7px 11px;
  font-size: 11px;
}

.rf26 .rf26-cashgrid {
  display: grid;
  grid-template-columns: repeat(
    3,
    minmax(0, 1fr)
  );
  gap: 13px;
}

.rf26 .rf26-cashitem {
  background: #10121e99;
  border: 1px solid #ffffff12;
  padding: 17px;
  border-radius: 15px;
}

.rf26 .rf26-cashitem span {
  display: block;
  margin-bottom: 10px;
  color: #a9aac5;
  font-size: 12px;
}

.rf26 .rf26-cashitem strong {
  font-size: clamp(23px, 2.5vw, 32px);
  overflow-wrap: anywhere;
}

.rf26 .rf26-cashitem.green strong {
  color: #62e4bf;
}

.rf26 .rf26-cashitem.red strong {
  color: #ff9cae;
}

.rf26 .rf26-cashitem.blue strong {
  color: #9ea9ff;
}

.rf26 .rf26-note {
  padding: 13px 15px;
  margin-bottom: 19px;
  border-radius: 12px;
  border: 1px solid #454069;
  background: #30255527;
  color: #afaac8;
  font-size: 12px;
  line-height: 1.55;
}

.rf26 .rf26-sectiongrid {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 16px;
  margin-bottom: 17px;
}

.rf26 .rf26-panel {
  background: linear-gradient(
    145deg,
    #181729,
    #11121f
  );
  border: 1px solid #2d2a46;
  border-radius: 19px;
  padding: 20px;
  min-width: 0;
}

.rf26 .rf26-panel h2 {
  font-size: 17px;
  margin: 0 0 6px;
}

.rf26 .rf26-panel p {
  font-size: 12px;
  margin: 0;
  color: #9798b2;
}

.rf26 .rf26-chart {
  height: 210px;
  display: flex;
  align-items: flex-end;
  gap: 8px;
  overflow-x: auto;
  margin-top: 18px;
}

.rf26 .rf26-col {
  min-width: 34px;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: end;
  height: 100%;
}

.rf26 .rf26-bars {
  display: flex;
  width: 100%;
  height: 174px;
  align-items: flex-end;
  gap: 3px;
  justify-content: center;
  border-bottom: 1px solid #3c3455;
}

.rf26 .rf26-bar {
  width: 35%;
  max-width: 27px;
  border-radius: 6px 6px 0 0;
  transition: height 0.35s ease;
}

.rf26 .rf26-bar.in {
  background: linear-gradient(
    #68edd5,
    #3389d8
  );
}

.rf26 .rf26-bar.out {
  background: linear-gradient(
    #ac8dff,
    #694ce2
  );
}

.rf26 .rf26-col small {
  font-size: 10px;
  color: #9796b1;
  margin-top: 7px;
}

.rf26 .rf26-legend {
  margin-top: 10px;
  display: flex;
  gap: 17px;
  color: #a7a4c0;
  font-size: 11px;
}

.rf26 .rf26-dot {
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 4px;
  margin-right: 5px;
  background: #45bed9;
}

.rf26 .rf26-dot.out {
  background: #8c6df0;
}

.rf26 .rf26-sumrow {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 13px 0;
  border-bottom: 1px solid #ffffff12;
  color: #bdb8d2;
  font-size: 13px;
}

.rf26 .rf26-sumrow strong {
  color: #f2efff;
}

.rf26 .rf26-table-wrap {
  overflow-x: auto;
  margin-top: 15px;
}

.rf26 .rf26-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 670px;
}

.rf26 .rf26-table th {
  padding: 13px;
  text-align: left;
  color: #9997b5;
  font-size: 10px;
  letter-spacing: 1px;
  border-bottom: 1px solid #38334c;
}

.rf26 .rf26-table td {
  padding: 13px;
  border-bottom: 1px solid #ffffff0d;
  color: #e7e3f7;
  font-size: 12px;
}

.rf26 .rf26-type {
  padding: 6px 9px;
  border-radius: 50px;
  font-size: 10px;
  font-weight: 700;
}

.rf26 .rf26-type.in {
  color: #69e2bd;
  background: #146b5036;
}

.rf26 .rf26-type.out {
  color: #f7a0af;
  background: #79253835;
}

.rf26 .rf26-empty {
  color: #9c9ab6;
  text-align: center;
  padding: 30px;
  font-size: 12px;
}

@media (max-width: 1150px) {

  .rf26 .rf26-kpis {
    grid-template-columns: repeat(
      2,
      minmax(0, 1fr)
    );
  }

  .rf26 .rf26-sectiongrid {
    grid-template-columns: 1fr;
  }

}

@media (max-width: 650px) {

  .rf26 .rf26-kpis {
    gap: 9px;
  }

  .rf26 .rf26-card {
    padding: 14px;
  }

  .rf26 .rf26-cashgrid {
    grid-template-columns: 1fr;
  }

  .rf26 .rf26-filter {
    min-width: 120px;
  }

  .rf26 .rf26-top h1 {
    font-size: 27px;
  }

}

`;


// ==========================================
// 11. TARJETA DE INDICADORES
// ==========================================

function Tarjeta({
  icono: Icono,
  titulo,
  valor,
  nota,
  index
}) {

  return (

    <motion.article

      className="rf26-card"

      initial={{
        opacity: 0,
        y: 10
      }}

      animate={{
        opacity: 1,
        y: 0
      }}

      transition={{
        delay: index * 0.045
      }}

    >

      <div className="rf26-card-top">

        <span>
          {titulo}
        </span>

        <span className="rf26-icon">

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

  );

}


// ==========================================
// 12. COMPONENTE PRINCIPAL
// ==========================================

export default function ReportesFinanzasPage() {

  const { usuario } = useAuth();

  const empresaId = usuario?.empresaId;


  // ========================================
  // ESTADOS
  // ========================================

  const [datos, setDatos] = useState(BASE);

  const [esperando, setEsperando] = useState(true);

  const [errores, setErrores] = useState({});

  const [revision, setRevision] = useState(0);

  const [sucursalId, setSucursalId] =
    useState("TODAS");

  const [desde, setDesde] = useState("");

  const [hasta, setHasta] = useState("");


  // ========================================
  // 13. ESCUCHAR FIREBASE
  // ========================================

  useEffect(() => {

    setDatos(BASE);

    setErrores({});

    setEsperando(true);

    if (!empresaId) {

      setEsperando(false);

      return undefined;

    }

    let activo = true;

    const terminadas = new Set();

    const marcar = (nombre) => {

      terminadas.add(nombre);

      if (terminadas.size === COLECCIONES.length) {

        setEsperando(false);

      }

    };


    const detener = COLECCIONES.map((nombre) => {

      return suscribirColeccionEmpresa(

        nombre,

        empresaId,

        (filas) => {

          if (!activo) return;

          setDatos((anterior) => ({

            ...anterior,

            [nombre]: filas

          }));

          marcar(nombre);

        },

        (error) => {

          if (!activo) return;

          console.error(
            `Finanzas: ${nombre}`,
            error
          );

          setErrores((anterior) => ({

            ...anterior,

            [nombre]:
              error.message ||
              "Acceso no permitido"

          }));

          marcar(nombre);

        }

      );

    });


    return () => {

      activo = false;

      detener.forEach((fn) => fn?.());

    };

  }, [empresaId, revision]);


  // ========================================
  // 14. NOMBRES DE SUCURSALES
  // ========================================

  const sucursales = useMemo(() => {

    return new Map(

      datos.sucursales.map((sucursal) => [

        sucursal.id,

        sucursal.nombre ||
        sucursal.codigo ||
        sucursal.id

      ])

    );

  }, [datos.sucursales]);


  // ========================================
  // 15. CALCULAR REPORTE
  // ========================================

  const resumen = useMemo(() => {

    // FILTROS DE FECHAS

    const entreFechas = (registro, origen) => {

      if (!desde && !hasta) {
        return true;
      }

      const d = fechaRegistro(registro, origen);

      if (!d) {
        return false;
      }

      const inicio = desde

        ? new Date(`${desde}T00:00:00`)

        : null;

      const fin = hasta

        ? new Date(`${hasta}T23:59:59.999`)

        : null;


      return (

        (!inicio || d >= inicio) &&

        (!fin || d <= fin)

      );

    };


    // FILTRO POR SUCURSAL

    const enSucursal = (registro) => {

      return (

        sucursalId === "TODAS" ||

        registro.sucursalId === sucursalId

      );

    };


    // FILTRAR UNA COLECCION

    const registros = (nombre) => {

      return datos[nombre].filter((registro) => {

        return (

          enSucursal(registro) &&

          entreFechas(registro, nombre)

        );

      });

    };


    // VENTAS Y COMPRAS

    const ventas = registros("ventas")
      .filter(valido);

    const compras = registros("compras")
      .filter(valido);


    // GASTOS ACTIVOS

    const gastos = registros("gastos")
      .filter(valido);


    // MOVIMIENTOS DE CAJA

    const movimientos = registros(
      "movimientosCaja"
    );


    const ingresos = movimientos.filter(

      (m) => movimientoTipo(m) === "INGRESO"

    );


    const egresos = movimientos.filter(

      (m) => movimientoTipo(m) === "EGRESO"

    );


    // CUENTAS PENDIENTES
    // SON SALDOS ACTUALES, NO HISTORICOS

    const cxc = datos.cuentasCobrar.filter(
      enSucursal
    );

    const cxp = datos.cuentasPagar.filter(
      enSucursal
    );


    // RESULTADOS

    return {

      ventas: suma(
        ventas,
        totalOperacion
      ),

      compras: suma(
        compras,
        totalOperacion
      ),

      gastos: suma(
        gastos,
        (r) => r.monto ?? r.total
      ),

      cuentasCobrar: suma(
        cxc,
        (r) => r.saldo ?? r.total
      ),

      cuentasPagar: suma(
        cxp,
        (r) => r.saldo ?? r.total
      ),

      ingresos: suma(
        ingresos,
        (r) => r.monto
      ),

      egresos: suma(
        egresos,
        (r) => r.monto
      ),

      movimientos: movimientos.sort((a, b) => {

        const fechaA = fechaRegistro(
          a,
          "movimientosCaja"
        );

        const fechaB = fechaRegistro(
          b,
          "movimientosCaja"
        );

        return (

          (fechaB?.getTime() || 0) -

          (fechaA?.getTime() || 0)

        );

      }),

      ventasCantidad: ventas.length,

      ingresosCantidad: ingresos.length,

      egresosCantidad: egresos.length,

      cuentasSinSucursal:

        sucursalId !== "TODAS" &&

        [
          ...datos.cuentasCobrar,
          ...datos.cuentasPagar
        ].some((r) => !r.sucursalId)

    };

  }, [
    datos,
    desde,
    hasta,
    sucursalId
  ]);


  // ========================================
  // 16. CALCULAR GRAFICO
  // ========================================

  const grafico = useMemo(() => {

    const ultimoDia = hasta

      ? new Date(`${hasta}T12:00:00`)

      : new Date();


    if (Number.isNaN(ultimoDia.getTime())) {
      return [];
    }


    const base = new Date(ultimoDia);

    base.setHours(0, 0, 0, 0);


    const dias = Array.from(

      { length: 7 },

      (_, indice) => {

        const d = new Date(base);

        d.setDate(
          d.getDate() - 6 + indice
        );


        const clave = diaClave(d);


        const lista = resumen.movimientos.filter(
          (movimiento) => {

            const f = fechaRegistro(
              movimiento,
              "movimientosCaja"
            );

            return (

              f &&

              diaClave(f) === clave

            );

          }
        );


        return {

          clave,

          etiqueta:
            `${d.getDate()}/${d.getMonth() + 1}`,

          ingresos: suma(

            lista.filter(

              (m) =>
                movimientoTipo(m) === "INGRESO"

            ),

            (m) => m.monto

          ),

          egresos: suma(

            lista.filter(

              (m) =>
                movimientoTipo(m) === "EGRESO"

            ),

            (m) => m.monto

          )

        };

      }

    );

    return dias;

  }, [resumen.movimientos, hasta]);


  // ========================================
  // 17. ESCALA DEL GRAFICO
  // ========================================

  const mayor = Math.max(

    1,

    ...grafico.flatMap((dia) => [

      dia.ingresos,

      dia.egresos

    ])

  );


  // ========================================
  // 18. BALANCE REAL DE MOVIMIENTOS
  // ========================================

  const balance =

    resumen.ingresos -

    resumen.egresos;


  // ========================================
  // 19. INDICADORES
  // ========================================

  const indicadores = [

    {

      icono: TrendingUp,

      titulo: "Ventas registradas",

      valor: bs(resumen.ventas),

      nota:
        `${resumen.ventasCantidad} operaciones no anuladas; incluye crédito.`

    },

    {

      icono: ShoppingBag,

      titulo: "Compras registradas",

      valor: bs(resumen.compras),

      nota:
        "Mercadería comprada, no equivale a gasto consumido."

    },

    {

      icono: CreditCard,

      titulo: "Gastos operativos",

      valor: bs(resumen.gastos),

      nota:
        "Gastos activos en el período."

    },

    {

      icono: Wallet,

      titulo: "Cuentas por cobrar",

      valor: bs(resumen.cuentasCobrar),

      nota:
        "Saldo pendiente actual, no histórico."

    },

    {

      icono: Wallet,

      titulo: "Cuentas por pagar",

      valor: bs(resumen.cuentasPagar),

      nota:
        "Saldo pendiente actual, no histórico."

    },

    {

      icono: ArrowUpRight,

      titulo: "Movimientos de ingreso",

      valor: resumen.ingresosCantidad,

      nota:
        "Movimientos registrados en caja."

    },

    {

      icono: ArrowDownRight,

      titulo: "Movimientos de egreso",

      valor: resumen.egresosCantidad,

      nota:
        "Movimientos registrados en caja."

    },

    {

      icono: BarChart3,

      titulo: "Movimientos totales",

      valor: resumen.movimientos.length,

      nota:
        "Dentro del filtro actual."

    }

  ];


  // ========================================
  // 20. FILTROS RAPIDOS
  // ========================================

  function elegirPeriodo(tipo) {

    if (tipo === "TODO") {

      setDesde("");

      setHasta("");

      return;

    }


    const inicio = new Date();

    inicio.setHours(12, 0, 0, 0);

    const fin = diaClave(inicio);


    if (tipo === "7") {

      inicio.setDate(
        inicio.getDate() - 6
      );

    }


    if (tipo === "30") {

      inicio.setDate(
        inicio.getDate() - 29
      );

    }


    if (tipo === "MES") {

      inicio.setDate(1);

    }


    setDesde(
      diaClave(inicio)
    );

    setHasta(fin);

  }


  // ========================================
  // 21. EXPORTAR CSV
  // ========================================

  function exportarCSV() {

    const celda = (valor) => {

      let texto = String(valor ?? "");


      // PROTEGER EL CSV CONTRA FORMULAS

      if (

        /^[\s]*[=+@-]/.test(texto) &&

        !/^-?\d+([.,]\d+)?$/.test(
          texto.trim()
        )

      ) {

        texto = "'" + texto;

      }


      return `"${texto.replace(/"/g, '""')}"`;

    };


    const lineas = [

      [
        "REPORTE FINANCIERO",
        "SISTEMA MULTIEMPRESA"
      ],

      [
        "Sucursal",

        sucursalId === "TODAS"

          ? "Todas"

          : sucursales.get(sucursalId) ||
            sucursalId
      ],

      [
        "Desde",
        desde || "Sin límite"
      ],

      [
        "Hasta",
        hasta || "Sin límite"
      ],

      [],

      [
        "INDICADOR",
        "MONTO Bs"
      ],

      [
        "Ventas registradas",
        resumen.ventas.toFixed(2)
      ],

      [
        "Compras registradas",
        resumen.compras.toFixed(2)
      ],

      [
        "Gastos operativos",
        resumen.gastos.toFixed(2)
      ],

      [
        "Cuentas por cobrar (saldo actual)",
        resumen.cuentasCobrar.toFixed(2)
      ],

      [
        "Cuentas por pagar (saldo actual)",
        resumen.cuentasPagar.toFixed(2)
      ],

      [
        "Ingresos en caja",
        resumen.ingresos.toFixed(2)
      ],

      [
        "Egresos en caja",
        resumen.egresos.toFixed(2)
      ],

      [
        "Balance de movimientos de caja",
        balance.toFixed(2)
      ],

      [],

      [
        "FECHA",
        "TIPO",
        "CATEGORÍA",
        "DESCRIPCIÓN",
        "SUCURSAL",
        "MONTO Bs"
      ],

      ...resumen.movimientos.map((m) => [

        fechaRegistro(
          m,
          "movimientosCaja"
        )?.toLocaleString("es-BO") || "Sin fecha",

        movimientoTipo(m),

        m.categoria || "-",

        m.descripcion ||
        m.observacion ||
        "-",

        sucursales.get(m.sucursalId) ||
        m.sucursalId ||
        "-",

        num(m.monto).toFixed(2)

      ])

    ];


    const texto =

      "sep=;\r\n" +

      lineas.map(

        (fila) =>

          fila.map(celda).join(";")

      ).join("\r\n");


    const blob = new Blob(

      [
        "\ufeff",
        texto
      ],

      {
        type: "text/csv;charset=utf-8"
      }

    );


    const url = URL.createObjectURL(blob);

    const enlace = document.createElement("a");


    enlace.href = url;

    enlace.download =

      `reporte-financiero-${diaClave(new Date())}.csv`;


    document.body.appendChild(enlace);

    enlace.click();

    enlace.remove();


    setTimeout(() => {

      URL.revokeObjectURL(url);

    }, 1000);

  }


  // ========================================
  // 22. INTERFAZ PRINCIPAL
  // ========================================

  return (

    <div className="module-page rf26">

      <style>
        {ESTILOS}
      </style>


      {/* ENCABEZADO */}

      <div className="rf26-top">

        <div>

          <span className="rf26-eyebrow">

            ANALÍTICA FINANCIERA · HU-26

          </span>

          <h1>
            Reporte financiero
          </h1>

          <p>

            Ventas, gastos, saldos y movimientos
            de caja de tu empresa.

          </p>

        </div>


        <div className="rf26-actions">

          <button

            type="button"

            className="rf26-btn"

            onClick={() =>

              setRevision(
                (valor) => valor + 1
              )

            }

          >

            <RefreshCw size={16} />

            Actualizar

          </button>


          <button

            type="button"

            className="rf26-btn primary"

            onClick={exportarCSV}

          >

            <Download size={16} />

            Exportar CSV

          </button>

        </div>

      </div>


      {/* ================================= */}
      {/* FILTROS */}
      {/* ================================= */}

      <div className="rf26-filters">


        {/* SUCURSAL */}

        <label className="rf26-filter">

          <span>

            <Store size={12} />

            Sucursal

          </span>


          <select

            value={sucursalId}

            onChange={(e) =>

              setSucursalId(
                e.target.value
              )

            }

          >

            <option value="TODAS">

              Todas las sucursales

            </option>


            {datos.sucursales.map(
              (sucursal) => (

                <option

                  key={sucursal.id}

                  value={sucursal.id}

                >

                  {sucursal.nombre ||
                    sucursal.codigo ||
                    sucursal.id}

                </option>

              )
            )}

          </select>

        </label>


        {/* DESDE */}

        <label className="rf26-filter">

          <span>

            <CalendarDays size={12} />

            Desde

          </span>


          <input

            type="date"

            value={desde}

            max={hasta || undefined}

            onChange={(e) =>

              setDesde(
                e.target.value
              )

            }

          />

        </label>


        {/* HASTA */}

        <label className="rf26-filter">

          <span>

            <CalendarDays size={12} />

            Hasta

          </span>


          <input

            type="date"

            value={hasta}

            min={desde || undefined}

            onChange={(e) =>

              setHasta(
                e.target.value
              )

            }

          />

        </label>


        {/* PERIODO */}

        <label className="rf26-filter">

          <span>
            Período rápido
          </span>


          <select

            value=""

            onChange={(e) =>

              elegirPeriodo(
                e.target.value
              )

            }

          >

            <option value="" disabled>

              Elegir período

            </option>

            <option value="7">

              Últimos 7 días

            </option>

            <option value="30">

              Últimos 30 días

            </option>

            <option value="MES">

              Este mes

            </option>

            <option value="TODO">

              Todo el historial

            </option>

          </select>

        </label>

      </div>


      {/* ================================= */}
      {/* ERRORES */}
      {/* ================================= */}

      {!empresaId && (

        <div className="rf26-warning">

          <AlertCircle size={16} />

          Tu usuario no tiene una empresa asignada.

        </div>

      )}


      {Object.keys(errores).length > 0 && (

        <div className="rf26-warning">

          <AlertCircle size={16} />

          No se pudieron leer algunas colecciones:

          {" "}

          {Object.keys(errores).join(", ")}.

          {" "}

          Los totales podrían estar incompletos.
          Revisa los permisos de Firestore.

        </div>

      )}


      <div className="rf26-status">

        {esperando

          ? "Cargando información de Firebase..."

          : `Datos sincronizados · ${resumen.movimientos.length} movimientos de caja en el filtro`}

      </div>


      {/* ================================= */}
      {/* BALANCE DE CAJA */}
      {/* ================================= */}

      <section className="rf26-cash">

        <div className="rf26-cashhead">

          <div>

            <h2>

              Balance de movimientos de caja

            </h2>

            <p>

              Entradas y salidas registradas.
              No representa utilidad neta.

            </p>

          </div>


          <span className="rf26-pill">

            Sin doble conteo de pagos

          </span>

        </div>


        <div className="rf26-cashgrid">


          {/* INGRESOS */}

          <div className="rf26-cashitem green">

            <span>

              Ingresos registrados

            </span>

            <strong>

              {bs(resumen.ingresos)}

            </strong>

          </div>


          {/* EGRESOS */}

          <div className="rf26-cashitem red">

            <span>

              Egresos registrados

            </span>

            <strong>

              {bs(resumen.egresos)}

            </strong>

          </div>


          {/* BALANCE */}

          <div className="rf26-cashitem blue">

            <span>

              Balance de movimientos

            </span>

            <strong>

              {bs(balance)}

            </strong>

          </div>

        </div>

      </section>


      {/* NOTA FINANCIERA */}

      <div className="rf26-note">

        El balance representa únicamente los
        movimientos de caja registrados:

        {" "}

        <b>ingresos − egresos</b>.

        {" "}

        No incluye saldos iniciales y podría omitir
        gastos o pagos que no se hayan registrado
        como movimientos de caja.

        Las compras y las ventas a crédito se
        muestran por separado para no confundir
        movimientos de dinero con utilidad.

      </div>


      {/* ================================= */}
      {/* INDICADORES EMPRESARIALES */}
      {/* ================================= */}

      <section className="rf26-kpis">

        {indicadores.map(
          (tarjeta, indice) => (

            <Tarjeta

              key={tarjeta.titulo}

              {...tarjeta}

              index={indice}

            />

          )
        )}

      </section>


      {/* CUENTAS SIN SUCURSAL */}

      {resumen.cuentasSinSucursal && (

        <div className="rf26-note">

          Algunas cuentas por cobrar o pagar no
          tienen una sucursal asignada.

          Al filtrar por sucursal, esas cuentas
          no se incluyen.

          Selecciona Todas las sucursales para
          consultar el saldo empresarial completo.

        </div>

      )}


      {/* ================================= */}
      {/* GRAFICO Y OBLIGACIONES */}
      {/* ================================= */}

      <div className="rf26-sectiongrid">


        {/* GRAFICO */}

        <section className="rf26-panel">

          <h2>

            <BarChart3

              size={18}

              style={{

                verticalAlign: "middle",

                color: "#aa8aff",

                marginRight: 8

              }}

            />

            Ingresos y egresos de caja

          </h2>


          <p>

            Últimos 7 días del intervalo mostrado.
            Pasa el cursor sobre las barras.

          </p>


          <div className="rf26-chart">

            {grafico.map((dia) => (

              <div

                className="rf26-col"

                key={dia.clave}

              >

                <div className="rf26-bars">


                  {/* INGRESO */}

                  <div

                    className="rf26-bar in"

                    title={

                      `${dia.clave} · Ingresos: ${bs(dia.ingresos)}`

                    }

                    style={{

                      height: dia.ingresos

                        ? `${Math.max(
                            3,
                            100 * dia.ingresos / mayor
                          )}%`

                        : "0"

                    }}

                  />


                  {/* EGRESO */}

                  <div

                    className="rf26-bar out"

                    title={

                      `${dia.clave} · Egresos: ${bs(dia.egresos)}`

                    }

                    style={{

                      height: dia.egresos

                        ? `${Math.max(
                            3,
                            100 * dia.egresos / mayor
                          )}%`

                        : "0"

                    }}

                  />

                </div>


                <small>

                  {dia.etiqueta}

                </small>

              </div>

            ))}

          </div>


          <div className="rf26-legend">

            <span>

              <i className="rf26-dot" />

              Ingresos

            </span>

            <span>

              <i className="rf26-dot out" />

              Egresos

            </span>

          </div>

        </section>


        {/* CUENTAS PENDIENTES */}

        <section className="rf26-panel">

          <h2>

            Resumen de obligaciones

          </h2>

          <p>

            Saldos pendientes actuales,
            independientemente del filtro de fecha.

          </p>


          <div className="rf26-sumrow">

            <span>

              Por cobrar

            </span>

            <strong>

              {bs(resumen.cuentasCobrar)}

            </strong>

          </div>


          <div className="rf26-sumrow">

            <span>

              Por pagar

            </span>

            <strong>

              {bs(resumen.cuentasPagar)}

            </strong>

          </div>


          <div className="rf26-sumrow">

            <span>

              Diferencia de saldos

            </span>

            <strong>

              {bs(
                resumen.cuentasCobrar -
                resumen.cuentasPagar
              )}

            </strong>

          </div>


          <div

            className="rf26-note"

            style={{

              marginTop: 16,

              marginBottom: 0

            }}

          >

            Las cuentas pendientes representan
            obligaciones.

            No son entradas o salidas de caja
            hasta que se registren sus pagos.

          </div>

        </section>

      </div>


      {/* ================================= */}
      {/* HISTORIAL DE MOVIMIENTOS */}
      {/* ================================= */}

      <section className="rf26-panel">

        <h2>

          Detalle de movimientos de caja

        </h2>

        <p>

          Se muestran hasta 20 registros recientes.
          El CSV incluye todos los movimientos filtrados.

        </p>


        <div className="rf26-table-wrap">

          <table className="rf26-table">

            <thead>

              <tr>

                <th>FECHA</th>

                <th>TIPO</th>

                <th>CATEGORÍA</th>

                <th>DESCRIPCIÓN</th>

                <th>SUCURSAL</th>

                <th>MONTO</th>

              </tr>

            </thead>


            <tbody>

              {resumen.movimientos
                .slice(0, 20)
                .map((m) => (

                  <tr key={m.id}>


                    {/* FECHA */}

                    <td>

                      {fechaRegistro(
                        m,
                        "movimientosCaja"
                      )?.toLocaleString("es-BO") || "-"}

                    </td>


                    {/* TIPO */}

                    <td>

                      <span

                        className={

                          `rf26-type ${
                            movimientoTipo(m) === "INGRESO"
                              ? "in"
                              : "out"
                          }`

                        }

                      >

                        {movimientoTipo(m) || "-"}

                      </span>

                    </td>


                    {/* CATEGORIA */}

                    <td>

                      {String(
                        m.categoria || "-"
                      ).replaceAll("_", " ")}

                    </td>


                    {/* DESCRIPCION */}

                    <td>

                      {m.descripcion ||
                        m.observacion ||
                        "-"}

                    </td>


                    {/* SUCURSAL */}

                    <td>

                      {sucursales.get(m.sucursalId) ||
                        m.sucursalId ||
                        "-"}

                    </td>


                    {/* MONTO */}

                    <td>

                      <strong>

                        {bs(m.monto)}

                      </strong>

                    </td>

                  </tr>

                ))}

            </tbody>

          </table>


          {!resumen.movimientos.length && (

            <div className="rf26-empty">

              No existen movimientos de caja
              para los filtros elegidos.

            </div>

          )}

        </div>

      </section>

    </div>

  );

}