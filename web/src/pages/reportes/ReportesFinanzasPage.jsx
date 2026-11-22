import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Info, Receipt, Scale, ShoppingBag, TrendingDown, Truck, Wallet, Users } from "lucide-react";

import useAuth from "../../hooks/useAuth";
import { useColeccionesEmpresa, useIdentidadEmpresa } from "../../hooks/useColeccionesEmpresa";
import { descargarExcel, imprimirReporte } from "../../utils/exportarReporte";
import { BarrasReporte, CabeceraReporte, FiltroPeriodo, GraficoDias, SelectorFiltro, TablaReporte, TarjetasResumen } from "../../components/reportes/ReporteUI";
import { dinero, enRango, fechaDe, rangoDe, serieDiaria } from "../../utils/reporteHelpers";

const METODOS = { EFECTIVO: "Efectivo", QR: "QR", TARJETA: "Tarjeta", TRANSFERENCIA: "Transferencia", CREDITO: "A crédito" };

const CATEGORIAS_GASTO = {
  OPERATIVO: "Operativo",
  SERVICIOS: "Servicios",
  PERSONAL: "Personal",
  TRANSPORTE: "Transporte",
  IMPUESTOS: "Impuestos",
  OTRO: "Otro"
};

const suma = (lista, valor) => lista.reduce((s, x) => s + (Number(valor(x)) || 0), 0);

export default function ReportesFinanzasPage() {
  const { usuario } = useAuth();
  const empresaId = usuario?.empresaId;

  const { datos, cargando, error } = useColeccionesEmpresa(empresaId, [
    "ventas",
    "compras",
    "gastos",
    "movimientosCaja",
    "cuentasCobrar",
    "cuentasPagar",
    "cajas",
    "sucursales"
  ]);
  const { empresa, personalizacion } = useIdentidadEmpresa(empresaId);

  const [periodo, setPeriodo] = useState("MES");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [sucursalId, setSucursalId] = useState("");

  const rango = useMemo(() => rangoDe(periodo, desde, hasta), [periodo, desde, hasta]);
  const nombreSucursal = (id) => datos.sucursales.find((s) => s.id === id)?.nombre || "Sin sucursal";

  const delPeriodo = (lista, obtenerFecha) =>
    lista.filter((x) => enRango(obtenerFecha(x), rango) && (!sucursalId || x.sucursalId === sucursalId));

  const ventas = useMemo(
    () => delPeriodo(datos.ventas, (v) => fechaDe(v.fechaRegistro)).filter((v) => v.estado !== "ANULADA"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [datos.ventas, rango, sucursalId]
  );
  const compras = useMemo(
    () => delPeriodo(datos.compras, (c) => fechaDe(c.fechaRegistro)).filter((c) => c.estado !== "ANULADA"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [datos.compras, rango, sucursalId]
  );
  const gastos = useMemo(
    () => delPeriodo(datos.gastos, (g) => fechaDe(g.fecha) || fechaDe(g.fechaRegistro)).filter((g) => g.estado !== "ANULADO" && g.estado !== "INACTIVO"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [datos.gastos, rango, sucursalId]
  );
  const movimientos = useMemo(
    () => delPeriodo(datos.movimientosCaja, (m) => fechaDe(m.fechaRegistro)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [datos.movimientosCaja, rango, sucursalId]
  );

  const vendido = suma(ventas, (v) => v.total);
  const comprado = suma(compras, (c) => c.total);
  const gastado = suma(gastos, (g) => g.monto);
  const resultado = vendido - comprado - gastado;

  const entro = suma(movimientos.filter((m) => m.tipo === "INGRESO"), (m) => m.monto);
  const salio = suma(movimientos.filter((m) => m.tipo === "EGRESO"), (m) => m.monto);

  // Lo que pasa hoy (no depende del período)
  const cuentasCobrar = datos.cuentasCobrar.filter((c) => c.estadoCuenta !== "PAGADA" && (!sucursalId || c.sucursalId === sucursalId));
  const cuentasPagar = datos.cuentasPagar.filter((c) => c.estadoCuenta !== "PAGADA" && (!sucursalId || c.sucursalId === sucursalId));
  const teDeben = suma(cuentasCobrar, (c) => c.saldo);
  const debes = suma(cuentasPagar, (c) => c.saldo);

  const dineroEnCajas = useMemo(() => {
    return datos.cajas
      .filter((c) => c.estado === "ABIERTA" && (!sucursalId || c.sucursalId === sucursalId))
      .reduce((total, caja) => {
        const propios = datos.movimientosCaja.filter((m) => m.cajaId === caja.id);
        const ingresos = suma(propios.filter((m) => m.tipo === "INGRESO"), (m) => m.monto);
        const egresos = suma(propios.filter((m) => m.tipo === "EGRESO"), (m) => m.monto);
        return total + Number(caja.saldoInicial || 0) + ingresos - egresos;
      }, 0);
  }, [datos.cajas, datos.movimientosCaja, sucursalId]);

  const porPago = useMemo(() => {
    const mapa = new Map();
    ventas.forEach((v) => mapa.set(v.metodoPago, (mapa.get(v.metodoPago) || 0) + Number(v.total || 0)));
    return [...mapa.entries()].map(([k, valor]) => ({ etiqueta: METODOS[k] || k || "Otro", valor })).sort((a, b) => b.valor - a.valor);
  }, [ventas]);

  const porCategoria = useMemo(() => {
    const mapa = new Map();
    gastos.forEach((g) => mapa.set(g.categoria, (mapa.get(g.categoria) || 0) + Number(g.monto || 0)));
    return [...mapa.entries()].map(([k, valor]) => ({ etiqueta: CATEGORIAS_GASTO[k] || "Otro", valor })).sort((a, b) => b.valor - a.valor);
  }, [gastos]);

  const porSucursal = useMemo(() => {
    const ids = new Set([...ventas, ...compras, ...gastos].map((x) => x.sucursalId || ""));
    return [...ids]
      .map((id) => {
        const v = suma(ventas.filter((x) => (x.sucursalId || "") === id), (x) => x.total);
        const c = suma(compras.filter((x) => (x.sucursalId || "") === id), (x) => x.total);
        const g = suma(gastos.filter((x) => (x.sucursalId || "") === id), (x) => x.monto);
        return { id, nombre: id ? nombreSucursal(id) : "Sin sucursal", vendido: v, comprado: c, gastado: g, resultado: v - c - g };
      })
      .sort((a, b) => b.vendido - a.vendido);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ventas, compras, gastos, datos.sucursales]);

  const serie = useMemo(() => serieDiaria(ventas, (v) => fechaDe(v.fechaRegistro), (v) => v.total, rango), [ventas, rango]);

  const textoFiltros = [rango.texto, sucursalId ? nombreSucursal(sucursalId) : "Todas las sucursales"].join(" · ");

  const armarReporte = () => ({
    titulo: "Reporte financiero",
    subtitulo: "Lo que vendiste, compraste y gastaste, y cómo están tus cajas y cuentas.",
    filtros: textoFiltros,
    resumen: [
      { etiqueta: "Vendido", valor: dinero(vendido) },
      { etiqueta: "Comprado", valor: dinero(comprado) },
      { etiqueta: "Gastos", valor: dinero(gastado) },
      { etiqueta: "Ventas menos compras y gastos", valor: dinero(resultado) },
      { etiqueta: "Te deben", valor: dinero(teDeben) },
      { etiqueta: "Debes", valor: dinero(debes) },
      { etiqueta: "Dinero en cajas abiertas", valor: dinero(dineroEnCajas) }
    ],
    secciones: [
      {
        titulo: "Por sucursal",
        nota: "«Resultado» es ventas menos compras y gastos del período. No descuenta el costo exacto de lo vendido.",
        columnas: [
          { etiqueta: "Sucursal", tipo: "texto" },
          { etiqueta: "Vendido", tipo: "dinero", total: true },
          { etiqueta: "Comprado", tipo: "dinero", total: true },
          { etiqueta: "Gastos", tipo: "dinero", total: true },
          { etiqueta: "Resultado", tipo: "dinero", total: true }
        ],
        filas: porSucursal.map((s) => [s.nombre, s.vendido, s.comprado, s.gastado, s.resultado])
      },
      {
        titulo: "Ventas por forma de pago",
        columnas: [
          { etiqueta: "Forma de pago", tipo: "texto" },
          { etiqueta: "Total", tipo: "dinero", total: true }
        ],
        filas: porPago.map((p) => [p.etiqueta, p.valor])
      },
      {
        titulo: "Gastos por categoría",
        columnas: [
          { etiqueta: "Categoría", tipo: "texto" },
          { etiqueta: "Total", tipo: "dinero", total: true }
        ],
        filas: porCategoria.map((p) => [p.etiqueta, p.valor])
      },
      {
        titulo: "Dinero que entró y salió de las cajas",
        columnas: [
          { etiqueta: "Concepto", tipo: "texto" },
          { etiqueta: "Monto", tipo: "dinero" }
        ],
        filas: [
          ["Entró", entro],
          ["Salió", salio],
          ["Diferencia", entro - salio]
        ]
      },
      {
        titulo: "Cuentas pendientes (hoy)",
        columnas: [
          { etiqueta: "Concepto", tipo: "texto" },
          { etiqueta: "Cuentas", tipo: "numero" },
          { etiqueta: "Saldo", tipo: "dinero" }
        ],
        filas: [
          ["Te deben (clientes)", cuentasCobrar.length, teDeben],
          ["Debes (proveedores)", cuentasPagar.length, debes]
        ]
      }
    ]
  });

  return (
    <div className="re inv">
      <CabeceraReporte
        titulo="Reporte financiero"
        descripcion="Lo que vendiste, compraste y gastaste, y cómo están tus cajas y cuentas. Se actualiza solo."
        onExcel={() => descargarExcel(armarReporte(), empresa, personalizacion)}
        onPdf={() => imprimirReporte(armarReporte(), empresa, personalizacion) || window.alert("Permite las ventanas emergentes para ver el PDF.")}
        deshabilitado={cargando}
        aviso={error}
      />

      <FiltroPeriodo periodo={periodo} setPeriodo={setPeriodo} desde={desde} setDesde={setDesde} hasta={hasta} setHasta={setHasta} />

      <div className="re-herramientas">
        <SelectorFiltro valor={sucursalId} onChange={setSucursalId} etiqueta="Sucursal" opciones={[["", "Todas las sucursales"], ...datos.sucursales.map((s) => [s.id, s.nombre])]} />
      </div>

      {cargando ? (
        <div className="re-vacio">Preparando el reporte…</div>
      ) : (
        <>
          <TarjetasResumen
            items={[
              { icono: ShoppingBag, titulo: "Vendido", valor: dinero(vendido), nota: `${ventas.length} ${ventas.length === 1 ? "venta" : "ventas"}` },
              { icono: Truck, titulo: "Comprado", valor: dinero(comprado), nota: `${compras.length} ${compras.length === 1 ? "compra" : "compras"}` },
              { icono: TrendingDown, titulo: "Gastos", valor: dinero(gastado), nota: `${gastos.length} ${gastos.length === 1 ? "gasto" : "gastos"}`, tono: "alerta" },
              { icono: Scale, titulo: "Ventas menos compras y gastos", valor: dinero(resultado), nota: resultado >= 0 ? "a tu favor" : "estás gastando más de lo que vendes", tono: resultado < 0 ? "peligro" : undefined }
            ]}
          />

          <div className="re-aviso inv-guia">
            <Info size={18} />
            <span>
              Esto <b>no es la ganancia exacta</b>: restamos todo lo que compraste, aunque aún lo tengas en el estante. Para saber cuánto vale lo que te queda,
              mira el Reporte de inventario.
            </span>
          </div>

          <TarjetasResumen
            items={[
              { icono: Users, titulo: "Te deben", valor: dinero(teDeben), nota: `${cuentasCobrar.length} ${cuentasCobrar.length === 1 ? "cuenta" : "cuentas"} por cobrar`, tono: teDeben > 0 ? "alerta" : undefined },
              { icono: Receipt, titulo: "Debes", valor: dinero(debes), nota: `${cuentasPagar.length} ${cuentasPagar.length === 1 ? "cuenta" : "cuentas"} por pagar`, tono: debes > 0 ? "alerta" : undefined },
              { icono: Wallet, titulo: "Dinero en cajas", valor: dinero(dineroEnCajas), nota: "sumando las cajas abiertas", tono: dineroEnCajas < 0 ? "peligro" : undefined },
              { icono: entro >= salio ? ArrowUpRight : ArrowDownRight, titulo: "Movimiento de cajas", valor: dinero(entro - salio), nota: `entró ${dinero(entro)} · salió ${dinero(salio)}` }
            ]}
          />

          <GraficoDias titulo="Ventas por día" subtitulo={rango.texto} serie={serie} />

          <div className="rp-cuadricula">
            <BarrasReporte titulo="Cómo te pagaron" subtitulo="Ventas por forma de pago" items={porPago} />
            <BarrasReporte titulo="En qué gastas" subtitulo="Gastos por categoría" items={porCategoria} vacio="Aún no registraste gastos en este período." />
          </div>

          <TablaReporte
            titulo="Resultado por sucursal"
            filas={porSucursal}
            claveFila={(s) => s.id || "sin"}
            vacio={{ titulo: "Sin movimiento en este período", texto: "Prueba con otro período." }}
            columnas={[
              { etiqueta: "Sucursal", render: (s) => <strong>{s.nombre}</strong> },
              { etiqueta: "Vendido", der: true, render: (s) => dinero(s.vendido) },
              { etiqueta: "Comprado", der: true, render: (s) => dinero(s.comprado) },
              { etiqueta: "Gastos", der: true, render: (s) => dinero(s.gastado) },
              { etiqueta: "Resultado", der: true, render: (s) => <strong data-bajo={s.resultado < 0 ? "true" : undefined}>{dinero(s.resultado)}</strong> }
            ]}
          />
        </>
      )}
    </div>
  );
}
