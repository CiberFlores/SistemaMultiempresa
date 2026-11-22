import { useMemo, useState } from "react";
import { AlertTriangle, Boxes, Package, Search, Wallet } from "lucide-react";

import useAuth from "../../hooks/useAuth";
import { useColeccionesEmpresa, useIdentidadEmpresa } from "../../hooks/useColeccionesEmpresa";
import { descargarExcel, imprimirReporte } from "../../utils/exportarReporte";
import { hoyLocal } from "../../utils/promociones";
import { BarrasReporte, CabeceraReporte, SelectorFiltro, TablaReporte, TarjetasResumen } from "../../components/reportes/ReporteUI";
import { cantidad, dinero, normalizar } from "../../utils/reporteHelpers";

const ESTADOS = {
  NORMAL: "Normal",
  BAJO: "Stock bajo",
  AGOTADO: "Agotado",
  SOLO_VENCIDO: "Solo vencido"
};

export default function ReportesInventarioPage() {
  const { usuario } = useAuth();
  const empresaId = usuario?.empresaId;

  const { datos, cargando, error } = useColeccionesEmpresa(empresaId, ["inventarios", "productos", "sucursales", "lotesInventario", "categorias"]);
  const { empresa, personalizacion } = useIdentidadEmpresa(empresaId);

  const [sucursalId, setSucursalId] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [estado, setEstado] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const nombreSucursal = (id) => datos.sucursales.find((s) => s.id === id)?.nombre || "—";
  const nombreCategoria = (id) => datos.categorias.find((c) => c.id === id)?.nombre || "Sin categoría";

  // Una fila por producto y sucursal; los productos eliminados no aparecen
  const filas = useMemo(() => {
    const hoy = hoyLocal();
    const productos = new Map(datos.productos.map((p) => [p.id, p]));
    const vendibles = new Map();
    const vencidos = new Map();

    datos.lotesInventario.forEach((lote) => {
      const disponible = Number(lote.cantidadDisponible || 0);
      if (disponible <= 0 || lote.estado !== "ACTIVO") return;

      const clave = `${lote.sucursalId}_${lote.productoId}`;
      const mapa = !lote.fechaVencimiento || lote.fechaVencimiento < hoy ? vencidos : vendibles;
      mapa.set(clave, (mapa.get(clave) || 0) + disponible);
    });

    return datos.inventarios
      .map((inv) => {
        const producto = productos.get(inv.productoId);
        if (!producto) return null;

        const clave = `${inv.sucursalId}_${inv.productoId}`;
        const fisico = Math.max(0, Number(inv.stock || 0));
        const controla = producto.controlaVencimiento === true;
        const vendible = controla ? Math.min(fisico, vendibles.get(clave) || 0) : fisico;
        const vencido = controla ? vencidos.get(clave) || 0 : 0;
        const minimo = Number(producto.stockMinimo || 0);
        const costo = Number(producto.costo) > 0 ? Number(producto.costo) : null;

        let situacion = "NORMAL";
        if (vendible <= 0) situacion = fisico > 0 && vencido > 0 ? "SOLO_VENCIDO" : "AGOTADO";
        else if (vendible <= minimo) situacion = "BAJO";

        return {
          id: inv.id,
          producto,
          sucursalId: inv.sucursalId,
          vendible,
          vencido,
          minimo,
          costo,
          valor: costo === null ? null : vendible * costo,
          situacion
        };
      })
      .filter(Boolean);
  }, [datos.inventarios, datos.productos, datos.lotesInventario]);

  const visibles = useMemo(() => {
    const texto = normalizar(busqueda);

    return filas
      .filter((f) => {
        if (sucursalId && f.sucursalId !== sucursalId) return false;
        if (categoriaId && f.producto.categoriaId !== categoriaId) return false;
        if (estado === "ALERTA" ? f.situacion === "NORMAL" : estado && f.situacion !== estado) return false;
        if (!texto) return true;
        return [f.producto.nombre, f.producto.sku, f.producto.codigoBarras].some((x) => normalizar(x).includes(texto));
      })
      .sort((a, b) => (b.valor || 0) - (a.valor || 0) || String(a.producto.nombre).localeCompare(String(b.producto.nombre)));
  }, [filas, sucursalId, categoriaId, estado, busqueda]);

  const unidades = visibles.reduce((s, f) => s + f.vendible, 0);
  const valorTotal = visibles.reduce((s, f) => s + (f.valor || 0), 0);
  const sinCosto = visibles.filter((f) => f.vendible > 0 && f.costo === null).length;
  const alertas = visibles.filter((f) => f.situacion !== "NORMAL").length;
  const vencidas = visibles.reduce((s, f) => s + f.vencido, 0);

  const porCategoria = useMemo(() => {
    const mapa = new Map();
    visibles.forEach((f) => mapa.set(f.producto.categoriaId, (mapa.get(f.producto.categoriaId) || 0) + (f.valor || 0)));
    return [...mapa.entries()]
      .map(([id, valor]) => ({ etiqueta: nombreCategoria(id), valor }))
      .filter((c) => c.valor > 0)
      .sort((a, b) => b.valor - a.valor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibles, datos.categorias]);

  const textoFiltros = [
    sucursalId ? nombreSucursal(sucursalId) : "Todas las sucursales",
    categoriaId ? nombreCategoria(categoriaId) : null,
    estado === "ALERTA" ? "Solo alertas" : estado ? ESTADOS[estado] : null,
    `Existencias al ${new Date().toLocaleDateString("es-BO", { dateStyle: "long" })}`
  ]
    .filter(Boolean)
    .join(" · ");

  const armarReporte = () => ({
    titulo: "Reporte de inventario",
    subtitulo: "Lo que tienes para vender, cuánto vale y qué se está acabando.",
    filtros: textoFiltros,
    resumen: [
      { etiqueta: "Unidades para vender", valor: cantidad(unidades) },
      { etiqueta: "Valor del stock", valor: dinero(valorTotal) },
      { etiqueta: "Productos en alerta", valor: String(alertas) },
      { etiqueta: "Unidades vencidas", valor: cantidad(vencidas) }
    ],
    secciones: [
      {
        titulo: "Existencias",
        nota: sinCosto ? `${sinCosto} producto(s) no tienen costo, por eso no suman al valor.` : "",
        columnas: [
          { etiqueta: "Producto", tipo: "texto" },
          { etiqueta: "Código", tipo: "texto" },
          { etiqueta: "Categoría", tipo: "texto" },
          { etiqueta: "Sucursal", tipo: "texto" },
          { etiqueta: "Para vender", tipo: "numero", total: true },
          { etiqueta: "Vencido", tipo: "numero", total: true },
          { etiqueta: "Mínimo", tipo: "numero" },
          { etiqueta: "Costo", tipo: "dinero" },
          { etiqueta: "Valor", tipo: "dinero", total: true },
          { etiqueta: "Estado", tipo: "texto" }
        ],
        filas: visibles.map((f) => [
          f.producto.nombre,
          f.producto.sku || "",
          nombreCategoria(f.producto.categoriaId),
          nombreSucursal(f.sucursalId),
          f.vendible,
          f.vencido,
          f.minimo,
          f.costo,
          f.valor,
          ESTADOS[f.situacion]
        ])
      },
      {
        titulo: "Valor por categoría",
        columnas: [
          { etiqueta: "Categoría", tipo: "texto" },
          { etiqueta: "Valor", tipo: "dinero", total: true }
        ],
        filas: porCategoria.map((c) => [c.etiqueta, c.valor])
      }
    ]
  });

  const hayFiltros = Boolean(sucursalId || categoriaId || estado || busqueda);

  return (
    <div className="re inv">
      <CabeceraReporte
        titulo="Reporte de inventario"
        descripcion="Lo que tienes para vender, cuánto vale y qué se está acabando. Se actualiza solo."
        onExcel={() => descargarExcel(armarReporte(), empresa, personalizacion)}
        onPdf={() => imprimirReporte(armarReporte(), empresa, personalizacion) || window.alert("Permite las ventanas emergentes para ver el PDF.")}
        deshabilitado={cargando}
        aviso={error}
      />

      <div className="re-herramientas">
        <label className="re-busqueda">
          <Search size={19} aria-hidden="true" />
          <input type="search" placeholder="Buscar producto o código…" aria-label="Buscar productos" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </label>

        <SelectorFiltro valor={sucursalId} onChange={setSucursalId} etiqueta="Sucursal" opciones={[["", "Todas las sucursales"], ...datos.sucursales.map((s) => [s.id, s.nombre])]} />
        <SelectorFiltro valor={categoriaId} onChange={setCategoriaId} etiqueta="Categoría" opciones={[["", "Todas las categorías"], ...datos.categorias.map((c) => [c.id, c.nombre])]} />
        <SelectorFiltro
          valor={estado}
          onChange={setEstado}
          etiqueta="Estado"
          opciones={[["", "Todos los estados"], ["ALERTA", "Solo alertas"], ...Object.entries(ESTADOS)]}
        />

        {hayFiltros && (
          <button
            type="button"
            className="re-chip"
            onClick={() => {
              setSucursalId("");
              setCategoriaId("");
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
              { icono: Boxes, titulo: "Productos", valor: visibles.length.toLocaleString("es-BO"), nota: "por sucursal" },
              { icono: Package, titulo: "Para vender", valor: cantidad(unidades), nota: vencidas > 0 ? `${cantidad(vencidas)} vencidas aparte` : "unidades disponibles" },
              { icono: Wallet, titulo: "Valor del stock", valor: dinero(valorTotal), nota: sinCosto ? `${sinCosto} sin costo no suman` : "al costo de compra" },
              { icono: AlertTriangle, titulo: "En alerta", valor: String(alertas), nota: "agotados o por acabarse", tono: alertas > 0 ? "alerta" : undefined }
            ]}
          />

          <BarrasReporte titulo="Dónde está tu dinero" subtitulo="Valor del stock por categoría" items={porCategoria.slice(0, 8)} />

          <TablaReporte
            titulo="Existencias"
            filas={visibles}
            claveFila={(f) => f.id}
            vacio={{ titulo: "No hay productos para mostrar", texto: "Registra una compra para que entren los primeros productos." }}
            columnas={[
              {
                etiqueta: "Producto",
                render: (f) => (
                  <div className="inv-celda">
                    <strong>{f.producto.nombre}</strong>
                    <small>{f.producto.sku || nombreCategoria(f.producto.categoriaId)}</small>
                  </div>
                )
              },
              { etiqueta: "Sucursal", render: (f) => nombreSucursal(f.sucursalId) },
              {
                etiqueta: "Para vender",
                der: true,
                render: (f) => (
                  <div className="inv-celda" style={{ justifyItems: "end" }}>
                    <strong data-bajo={f.situacion !== "NORMAL" ? "true" : undefined}>{cantidad(f.vendible)}</strong>
                    {f.vencido > 0 && <small className="inv-vencido">{cantidad(f.vencido)} vencidas</small>}
                  </div>
                )
              },
              { etiqueta: "Mínimo", der: true, render: (f) => cantidad(f.minimo) },
              { etiqueta: "Costo", der: true, render: (f) => (f.costo === null ? <span className="inv-sin">Sin costo</span> : dinero(f.costo)) },
              { etiqueta: "Valor", der: true, render: (f) => (f.valor === null ? "—" : <strong>{dinero(f.valor)}</strong>) },
              {
                etiqueta: "Estado",
                render: (f) => (
                  <span
                    className="inv-pastilla"
                    data-estado={f.situacion === "NORMAL" ? "NORMAL" : f.situacion === "BAJO" ? "POR_VENCER" : "VENCIDO"}
                  >
                    {ESTADOS[f.situacion]}
                  </span>
                )
              }
            ]}
          />
        </>
      )}
    </div>
  );
}
