import { useMemo, useState } from "react";
import { Ban, Search, ShoppingBag, Tag, TrendingUp, Wallet } from "lucide-react";

import useAuth from "../../hooks/useAuth";
import { useColeccionesEmpresa, useIdentidadEmpresa } from "../../hooks/useColeccionesEmpresa";
import { descargarExcel, imprimirReporte } from "../../utils/exportarReporte";
import { BarrasReporte, CabeceraReporte, FiltroPeriodo, GraficoDias, SelectorFiltro, TablaReporte, TarjetasResumen } from "../../components/reportes/ReporteUI";
import { cantidad, dinero, enRango, fechaDe, normalizar, rangoDe, serieDiaria } from "../../utils/reporteHelpers";

const METODOS = { EFECTIVO: "Efectivo", QR: "QR", TARJETA: "Tarjeta", TRANSFERENCIA: "Transferencia", CREDITO: "A crédito" };

export default function ReportesVentasPage() {
  const { usuario } = useAuth();
  const empresaId = usuario?.empresaId;

  const { datos, cargando, error } = useColeccionesEmpresa(empresaId, ["ventas", "detalleVentas", "sucursales"]);
  const { empresa, personalizacion } = useIdentidadEmpresa(empresaId);

  const [periodo, setPeriodo] = useState("MES");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [sucursalId, setSucursalId] = useState("");
  const [metodo, setMetodo] = useState("");
  const [estado, setEstado] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const rango = useMemo(() => rangoDe(periodo, desde, hasta), [periodo, desde, hasta]);
  const nombreSucursal = (id) => datos.sucursales.find((s) => s.id === id)?.nombre || "—";

  const ventas = useMemo(() => {
    const texto = normalizar(busqueda);

    return datos.ventas
      .filter((v) => {
        if (!enRango(fechaDe(v.fechaRegistro), rango)) return false;
        if (sucursalId && v.sucursalId !== sucursalId) return false;
        if (metodo && v.metodoPago !== metodo) return false;
        if (estado && v.estado !== estado) return false;
        if (!texto) return true;
        return [v.clienteNombre, v.clienteDocumento, METODOS[v.metodoPago]].some((x) => normalizar(x).includes(texto));
      })
      .sort((a, b) => (fechaDe(b.fechaRegistro)?.getTime() || 0) - (fechaDe(a.fechaRegistro)?.getTime() || 0));
  }, [datos.ventas, rango, sucursalId, metodo, estado, busqueda]);

  const completadas = ventas.filter((v) => v.estado !== "ANULADA");
  const total = completadas.reduce((s, v) => s + Number(v.total || 0), 0);
  const descuentos = completadas.reduce((s, v) => s + Number(v.descuento || 0), 0);
  const anuladas = ventas.length - completadas.length;

  const porPago = useMemo(() => {
    const mapa = new Map();
    completadas.forEach((v) => mapa.set(v.metodoPago, (mapa.get(v.metodoPago) || 0) + Number(v.total || 0)));
    return [...mapa.entries()].map(([k, valor]) => ({ etiqueta: METODOS[k] || k || "Otro", valor })).sort((a, b) => b.valor - a.valor);
  }, [completadas]);

  const topProductos = useMemo(() => {
    const ids = new Set(completadas.map((v) => v.id));
    const mapa = new Map();

    datos.detalleVentas
      .filter((d) => ids.has(d.ventaId))
      .forEach((d) => {
        const nombre = d.nombreProducto || "Producto";
        const actual = mapa.get(nombre) || { unidades: 0, monto: 0 };
        actual.unidades += Number(d.cantidad || 0);
        actual.monto += Number(d.subtotal ?? Number(d.cantidad || 0) * Number(d.precioUnitario || 0));
        mapa.set(nombre, actual);
      });

    return [...mapa.entries()].map(([nombre, v]) => ({ nombre, ...v })).sort((a, b) => b.monto - a.monto);
  }, [completadas, datos.detalleVentas]);

  const serie = useMemo(() => serieDiaria(completadas, (v) => fechaDe(v.fechaRegistro), (v) => v.total, rango), [completadas, rango]);

  const textoFiltros = [
    rango.texto,
    sucursalId ? nombreSucursal(sucursalId) : "Todas las sucursales",
    metodo ? METODOS[metodo] : null,
    estado ? (estado === "ANULADA" ? "Anuladas" : "Completadas") : null
  ]
    .filter(Boolean)
    .join(" · ");

  const armarReporte = () => ({
    titulo: "Reporte de ventas",
    subtitulo: "Lo que vendiste, cómo te pagaron y qué se vende más.",
    filtros: textoFiltros,
    resumen: [
      { etiqueta: "Ventas completadas", valor: String(completadas.length) },
      { etiqueta: "Total vendido", valor: dinero(total) },
      { etiqueta: "Venta promedio", valor: dinero(completadas.length ? total / completadas.length : 0) },
      { etiqueta: "Descuentos dados", valor: dinero(descuentos) }
    ],
    secciones: [
      {
        titulo: "Ventas",
        columnas: [
          { etiqueta: "Fecha", tipo: "texto" },
          { etiqueta: "Cliente", tipo: "texto" },
          { etiqueta: "Sucursal", tipo: "texto" },
          { etiqueta: "Pago", tipo: "texto" },
          { etiqueta: "Estado", tipo: "texto" },
          { etiqueta: "Descuento", tipo: "dinero", total: true },
          { etiqueta: "Total", tipo: "dinero", total: true }
        ],
        filas: ventas.map((v) => [
          fechaDe(v.fechaRegistro)?.toLocaleString("es-BO") || "",
          v.clienteNombre || "Consumidor final",
          nombreSucursal(v.sucursalId),
          METODOS[v.metodoPago] || v.metodoPago || "",
          v.estado === "ANULADA" ? "Anulada" : "Completada",
          v.estado === "ANULADA" ? 0 : Number(v.descuento || 0),
          v.estado === "ANULADA" ? 0 : Number(v.total || 0)
        ])
      },
      {
        titulo: "Por forma de pago",
        columnas: [
          { etiqueta: "Forma de pago", tipo: "texto" },
          { etiqueta: "Total", tipo: "dinero", total: true }
        ],
        filas: porPago.map((p) => [p.etiqueta, p.valor])
      },
      {
        titulo: "Productos más vendidos",
        columnas: [
          { etiqueta: "Producto", tipo: "texto" },
          { etiqueta: "Unidades", tipo: "numero", total: true },
          { etiqueta: "Vendido", tipo: "dinero", total: true }
        ],
        filas: topProductos.map((p) => [p.nombre, p.unidades, p.monto])
      }
    ]
  });

  const hayFiltros = Boolean(sucursalId || metodo || estado || busqueda);

  return (
    <div className="re inv">
      <CabeceraReporte
        titulo="Reporte de ventas"
        descripcion="Lo que vendiste, cómo te pagaron y qué se vende más. Se actualiza solo."
        onExcel={() => descargarExcel(armarReporte(), empresa, personalizacion)}
        onPdf={() => imprimirReporte(armarReporte(), empresa, personalizacion) || window.alert("Permite las ventanas emergentes para ver el PDF.")}
        deshabilitado={cargando}
        aviso={error}
      />

      <FiltroPeriodo periodo={periodo} setPeriodo={setPeriodo} desde={desde} setDesde={setDesde} hasta={hasta} setHasta={setHasta} />

      <div className="re-herramientas">
        <label className="re-busqueda">
          <Search size={19} aria-hidden="true" />
          <input type="search" placeholder="Buscar por cliente o carnet…" aria-label="Buscar ventas" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </label>

        <SelectorFiltro
          valor={sucursalId}
          onChange={setSucursalId}
          etiqueta="Sucursal"
          opciones={[["", "Todas las sucursales"], ...datos.sucursales.map((s) => [s.id, s.nombre])]}
        />
        <SelectorFiltro valor={metodo} onChange={setMetodo} etiqueta="Forma de pago" opciones={[["", "Todas las formas de pago"], ...Object.entries(METODOS)]} />
        <SelectorFiltro
          valor={estado}
          onChange={setEstado}
          etiqueta="Estado"
          opciones={[
            ["", "Completadas y anuladas"],
            ["COMPLETADA", "Solo completadas"],
            ["ANULADA", "Solo anuladas"]
          ]}
        />

        {hayFiltros && (
          <button
            type="button"
            className="re-chip"
            onClick={() => {
              setSucursalId("");
              setMetodo("");
              setEstado("");
              setBusqueda("");
            }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {cargando ? (
        <div className="re-vacio">Preparando el reporte…</div>
      ) : (
        <>
          <TarjetasResumen
            items={[
              { icono: ShoppingBag, titulo: "Ventas", valor: completadas.length.toLocaleString("es-BO"), nota: "completadas" },
              { icono: Wallet, titulo: "Total vendido", valor: dinero(total), nota: "sin contar anuladas" },
              { icono: TrendingUp, titulo: "Venta promedio", valor: dinero(completadas.length ? total / completadas.length : 0), nota: "por cada venta" },
              anuladas > 0
                ? { icono: Ban, titulo: "Anuladas", valor: String(anuladas), nota: "no suman al total", tono: "alerta" }
                : { icono: Tag, titulo: "Descuentos", valor: dinero(descuentos), nota: "por promociones" }
            ]}
          />

          <GraficoDias titulo="Ventas por día" subtitulo={rango.texto} serie={serie} />

          <div className="rp-cuadricula">
            <BarrasReporte titulo="Cómo te pagaron" subtitulo="Total vendido por forma de pago" items={porPago} />
            <BarrasReporte
              titulo="Lo que más se vende"
              subtitulo="Productos con mayor venta"
              items={topProductos.slice(0, 6).map((p) => ({ etiqueta: `${p.nombre} · ${cantidad(p.unidades)} u.`, valor: p.monto }))}
            />
          </div>

          <TablaReporte
            titulo="Detalle de ventas"
            filas={ventas}
            claveFila={(v) => v.id}
            vacio={{ titulo: "No hay ventas en este período", texto: "Prueba con otro período o limpia los filtros." }}
            columnas={[
              { etiqueta: "Fecha", render: (v) => fechaDe(v.fechaRegistro)?.toLocaleString("es-BO", { dateStyle: "medium", timeStyle: "short" }) || "—" },
              { etiqueta: "Cliente", render: (v) => <strong>{v.clienteNombre || "Consumidor final"}</strong> },
              { etiqueta: "Sucursal", render: (v) => nombreSucursal(v.sucursalId) },
              { etiqueta: "Pago", render: (v) => <span className="co-pastilla-pago">{METODOS[v.metodoPago] || v.metodoPago || "—"}</span> },
              {
                etiqueta: "Estado",
                render: (v) => (
                  <span className="inv-pastilla" data-estado={v.estado === "ANULADA" ? "VENCIDO" : "VIGENTE"}>
                    {v.estado === "ANULADA" ? "Anulada" : "Completada"}
                  </span>
                )
              },
              { etiqueta: "Total", der: true, render: (v) => <strong>{dinero(v.total)}</strong> }
            ]}
          />
        </>
      )}
    </div>
  );
}
