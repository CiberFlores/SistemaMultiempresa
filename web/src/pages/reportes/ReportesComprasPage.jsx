import { useMemo, useState } from "react";
import { Receipt, Search, Truck, Wallet } from "lucide-react";

import useAuth from "../../hooks/useAuth";
import { useColeccionesEmpresa, useIdentidadEmpresa } from "../../hooks/useColeccionesEmpresa";
import { descargarExcel, imprimirReporte } from "../../utils/exportarReporte";
import { BarrasReporte, CabeceraReporte, FiltroPeriodo, GraficoDias, SelectorFiltro, TablaReporte, TarjetasResumen } from "../../components/reportes/ReporteUI";
import { cantidad, dinero, enRango, fechaDe, normalizar, rangoDe, serieDiaria } from "../../utils/reporteHelpers";

const METODOS = { EFECTIVO: "Efectivo", QR: "QR", TARJETA: "Tarjeta", TRANSFERENCIA: "Transferencia", CREDITO: "A crédito" };

export default function ReportesComprasPage() {
  const { usuario } = useAuth();
  const empresaId = usuario?.empresaId;

  const { datos, cargando, error } = useColeccionesEmpresa(empresaId, ["compras", "detalleCompras", "proveedores", "sucursales"]);
  const { empresa, personalizacion } = useIdentidadEmpresa(empresaId);

  const [periodo, setPeriodo] = useState("MES");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [sucursalId, setSucursalId] = useState("");
  const [proveedorId, setProveedorId] = useState("");
  const [metodo, setMetodo] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const rango = useMemo(() => rangoDe(periodo, desde, hasta), [periodo, desde, hasta]);
  const nombreSucursal = (id) => datos.sucursales.find((s) => s.id === id)?.nombre || "—";
  const nombreProveedor = (id) => datos.proveedores.find((p) => p.id === id)?.nombre || "Proveedor eliminado";

  const compras = useMemo(() => {
    const texto = normalizar(busqueda);

    return datos.compras
      .filter((c) => {
        if (!enRango(fechaDe(c.fechaRegistro), rango)) return false;
        if (sucursalId && c.sucursalId !== sucursalId) return false;
        if (proveedorId && c.proveedorId !== proveedorId) return false;
        if (metodo && c.metodoPago !== metodo) return false;
        if (!texto) return true;
        return [c.numeroDocumento, datos.proveedores.find((p) => p.id === c.proveedorId)?.nombre].some((x) => normalizar(x).includes(texto));
      })
      .sort((a, b) => (fechaDe(b.fechaRegistro)?.getTime() || 0) - (fechaDe(a.fechaRegistro)?.getTime() || 0));
  }, [datos.compras, datos.proveedores, rango, sucursalId, proveedorId, metodo, busqueda]);

  const total = compras.reduce((s, c) => s + Number(c.total || 0), 0);
  const aCredito = compras.filter((c) => c.metodoPago === "CREDITO").reduce((s, c) => s + Number(c.total || 0), 0);

  const porProveedor = useMemo(() => {
    const mapa = new Map();
    compras.forEach((c) => mapa.set(c.proveedorId, (mapa.get(c.proveedorId) || 0) + Number(c.total || 0)));
    return [...mapa.entries()].map(([id, valor]) => ({ etiqueta: nombreProveedor(id), valor })).sort((a, b) => b.valor - a.valor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compras, datos.proveedores]);

  const productos = useMemo(() => {
    const ids = new Set(compras.map((c) => c.id));
    const mapa = new Map();

    datos.detalleCompras
      .filter((d) => ids.has(d.compraId))
      .forEach((d) => {
        const nombre = d.nombreProducto || "Producto";
        const actual = mapa.get(nombre) || { unidades: 0, monto: 0 };
        actual.unidades += Number(d.cantidad || 0);
        actual.monto += Number(d.subtotal || 0);
        mapa.set(nombre, actual);
      });

    return [...mapa.entries()].map(([nombre, v]) => ({ nombre, ...v })).sort((a, b) => b.monto - a.monto);
  }, [compras, datos.detalleCompras]);

  const serie = useMemo(() => serieDiaria(compras, (c) => fechaDe(c.fechaRegistro), (c) => c.total, rango), [compras, rango]);

  const textoFiltros = [
    rango.texto,
    sucursalId ? nombreSucursal(sucursalId) : "Todas las sucursales",
    proveedorId ? nombreProveedor(proveedorId) : null,
    metodo ? METODOS[metodo] : null
  ]
    .filter(Boolean)
    .join(" · ");

  const armarReporte = () => ({
    titulo: "Reporte de compras",
    subtitulo: "Lo que compraste, a quién y cuánto gastaste en mercadería.",
    filtros: textoFiltros,
    resumen: [
      { etiqueta: "Compras", valor: String(compras.length) },
      { etiqueta: "Total comprado", valor: dinero(total) },
      { etiqueta: "A crédito", valor: dinero(aCredito) },
      { etiqueta: "Proveedor principal", valor: porProveedor[0]?.etiqueta || "—" }
    ],
    secciones: [
      {
        titulo: "Compras",
        columnas: [
          { etiqueta: "Fecha", tipo: "texto" },
          { etiqueta: "Proveedor", tipo: "texto" },
          { etiqueta: "Factura", tipo: "texto" },
          { etiqueta: "Sucursal", tipo: "texto" },
          { etiqueta: "Pago", tipo: "texto" },
          { etiqueta: "Total", tipo: "dinero", total: true }
        ],
        filas: compras.map((c) => [
          fechaDe(c.fechaRegistro)?.toLocaleString("es-BO") || "",
          nombreProveedor(c.proveedorId),
          c.numeroDocumento || "",
          nombreSucursal(c.sucursalId),
          METODOS[c.metodoPago] || c.metodoPago || "",
          Number(c.total || 0)
        ])
      },
      {
        titulo: "Por proveedor",
        columnas: [
          { etiqueta: "Proveedor", tipo: "texto" },
          { etiqueta: "Comprado", tipo: "dinero", total: true }
        ],
        filas: porProveedor.map((p) => [p.etiqueta, p.valor])
      },
      {
        titulo: "Productos comprados",
        columnas: [
          { etiqueta: "Producto", tipo: "texto" },
          { etiqueta: "Unidades", tipo: "numero", total: true },
          { etiqueta: "Costo", tipo: "dinero", total: true }
        ],
        filas: productos.map((p) => [p.nombre, p.unidades, p.monto])
      }
    ]
  });

  const hayFiltros = Boolean(sucursalId || proveedorId || metodo || busqueda);

  return (
    <div className="re inv">
      <CabeceraReporte
        titulo="Reporte de compras"
        descripcion="Lo que compraste, a quién y cuánto gastaste en mercadería. Se actualiza solo."
        onExcel={() => descargarExcel(armarReporte(), empresa, personalizacion)}
        onPdf={() => imprimirReporte(armarReporte(), empresa, personalizacion) || window.alert("Permite las ventanas emergentes para ver el PDF.")}
        deshabilitado={cargando}
        aviso={error}
      />

      <FiltroPeriodo periodo={periodo} setPeriodo={setPeriodo} desde={desde} setDesde={setDesde} hasta={hasta} setHasta={setHasta} />

      <div className="re-herramientas">
        <label className="re-busqueda">
          <Search size={19} aria-hidden="true" />
          <input type="search" placeholder="Buscar proveedor o factura…" aria-label="Buscar compras" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </label>

        <SelectorFiltro valor={sucursalId} onChange={setSucursalId} etiqueta="Sucursal" opciones={[["", "Todas las sucursales"], ...datos.sucursales.map((s) => [s.id, s.nombre])]} />
        <SelectorFiltro valor={proveedorId} onChange={setProveedorId} etiqueta="Proveedor" opciones={[["", "Todos los proveedores"], ...datos.proveedores.map((p) => [p.id, p.nombre])]} />
        <SelectorFiltro valor={metodo} onChange={setMetodo} etiqueta="Forma de pago" opciones={[["", "Todas las formas de pago"], ...Object.entries(METODOS)]} />

        {hayFiltros && (
          <button
            type="button"
            className="re-chip"
            onClick={() => {
              setSucursalId("");
              setProveedorId("");
              setMetodo("");
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
              { icono: Receipt, titulo: "Compras", valor: compras.length.toLocaleString("es-BO"), nota: "registradas" },
              { icono: Wallet, titulo: "Total comprado", valor: dinero(total), nota: "en este período" },
              { icono: Truck, titulo: "A crédito", valor: dinero(aCredito), nota: "por pagar a proveedores", tono: aCredito > 0 ? "alerta" : undefined },
              { icono: Truck, titulo: "Proveedor principal", valor: porProveedor[0]?.etiqueta || "—", nota: porProveedor[0] ? dinero(porProveedor[0].valor) : "sin compras" }
            ]}
          />

          <GraficoDias titulo="Compras por día" subtitulo={rango.texto} serie={serie} />

          <div className="rp-cuadricula">
            <BarrasReporte titulo="A quién le compras" subtitulo="Total por proveedor" items={porProveedor.slice(0, 6)} />
            <BarrasReporte
              titulo="Lo que más compras"
              subtitulo="Productos con mayor costo"
              items={productos.slice(0, 6).map((p) => ({ etiqueta: `${p.nombre} · ${cantidad(p.unidades)} u.`, valor: p.monto }))}
            />
          </div>

          <TablaReporte
            titulo="Detalle de compras"
            filas={compras}
            claveFila={(c) => c.id}
            vacio={{ titulo: "No hay compras en este período", texto: "Prueba con otro período o limpia los filtros." }}
            columnas={[
              { etiqueta: "Fecha", render: (c) => fechaDe(c.fechaRegistro)?.toLocaleString("es-BO", { dateStyle: "medium", timeStyle: "short" }) || "—" },
              { etiqueta: "Proveedor", render: (c) => <strong>{nombreProveedor(c.proveedorId)}</strong> },
              { etiqueta: "Factura", render: (c) => c.numeroDocumento || "—" },
              { etiqueta: "Sucursal", render: (c) => nombreSucursal(c.sucursalId) },
              { etiqueta: "Pago", render: (c) => <span className="co-pastilla-pago" data-metodo={c.metodoPago}>{METODOS[c.metodoPago] || c.metodoPago || "—"}</span> },
              { etiqueta: "Total", der: true, render: (c) => <strong>{dinero(c.total)}</strong> }
            ]}
          />
        </>
      )}
    </div>
  );
}
