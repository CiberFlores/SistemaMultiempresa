import { useMemo, useState } from "react";
import { Activity, Clock, Search, Users } from "lucide-react";

import useAuth from "../../hooks/useAuth";
import { useColeccionesEmpresa, useIdentidadEmpresa } from "../../hooks/useColeccionesEmpresa";
import { descargarExcel, imprimirReporte } from "../../utils/exportarReporte";
import { enRango, fechaDe as fechaBase, normalizar, rangoDe } from "../../utils/reporteHelpers";
import { CabeceraReporte, FiltroPeriodo, SelectorFiltro, TablaReporte, TarjetasResumen } from "../../components/reportes/ReporteUI";

const MODULOS = {
  ventas: "Ventas",
  compras: "Compras",
  finanzas: "Finanzas",
  caja: "Cajas",
  cajas: "Cajas",
  gastos: "Gastos",
  productos: "Productos",
  categorias: "Categorías",
  marcas: "Marcas",
  proveedores: "Proveedores",
  clientes: "Clientes",
  promociones: "Promociones",
  inventario: "Inventario",
  sucursales: "Sucursales",
  usuarios: "Equipo",
  roles: "Cargos",
  notificaciones: "Avisos",
  empresa: "Empresa"
};

const ACCIONES = {
  CREAR: "Creó",
  ACTUALIZAR: "Editó",
  ELIMINAR: "Eliminó",
  CAMBIAR_ESTADO: "Activó o desactivó",
  REGISTRAR_VENTA: "Registró una venta",
  ANULAR_VENTA: "Anuló una venta",
  REGISTRAR_COMPRA: "Registró una compra",
  REGISTRAR_GASTO: "Registró un gasto",
  ANULAR_GASTO: "Anuló un gasto",
  LOGIN: "Inició sesión"
};

const ENTIDADES = {
  producto: "un producto",
  categoria: "una categoría",
  categorias: "una categoría",
  marca: "una marca",
  marcas: "una marca",
  proveedor: "un proveedor",
  proveedores: "un proveedor",
  cliente: "un cliente",
  clientes: "un cliente",
  gasto: "un gasto",
  gastos: "un gasto",
  promocion: "una promoción",
  promociones: "una promoción",
  sucursal: "una sucursal",
  sucursales: "una sucursal"
};

const etiquetaModulo = (m) => MODULOS[m] || String(m || "Sistema").replace(/^./, (c) => c.toUpperCase());

function descripcion(registro) {
  const base = ACCIONES[registro.accion] || String(registro.accion || "Acción").toLowerCase().replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
  const entidad = ["CREAR", "ACTUALIZAR", "ELIMINAR", "CAMBIAR_ESTADO"].includes(registro.accion)
    ? ENTIDADES[registro.modulo] || ENTIDADES[registro.entidad] || ""
    : "";
  return `${base}${entidad ? ` ${entidad}` : ""}`;
}

export default function AuditoriaPage() {
  const { usuario } = useAuth();
  const empresaId = usuario?.empresaId;

  const { datos, cargando, error } = useColeccionesEmpresa(empresaId, usuario?.tipoUsuario === "ADMIN" ? ["auditorias", "usuarios"] : ["auditorias"]);
  const { empresa, personalizacion } = useIdentidadEmpresa(empresaId);

  const [periodo, setPeriodo] = useState("SEMANA");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [modulo, setModulo] = useState("");
  const [persona, setPersona] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const rango = useMemo(() => rangoDe(periodo, desde, hasta), [periodo, desde, hasta]);

  const nombreDe = (r) => {
    const encontrado = datos.usuarios.find((u) => u.id === r.usuarioId);
    return encontrado?.nombreCompleto || r.usuarioNombre || "Alguien del equipo";
  };

  const fechaDe = (r) => fechaBase(r.fecha) || fechaBase(r.fechaRegistro);

  const registros = useMemo(() => {
    const texto = normalizar(busqueda);

    return datos.auditorias
      .filter((r) => {
        if (!enRango(fechaDe(r), rango)) return false;
        if (modulo && r.modulo !== modulo) return false;
        if (persona && r.usuarioId !== persona) return false;
        if (!texto) return true;
        return [descripcion(r), etiquetaModulo(r.modulo), nombreDe(r), r.detalle].some((x) => normalizar(x).includes(texto));
      })
      .sort((a, b) => (fechaDe(b)?.getTime() || 0) - (fechaDe(a)?.getTime() || 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos.auditorias, datos.usuarios, rango, modulo, persona, busqueda]);

  const personas = new Set(registros.map((r) => r.usuarioId).filter(Boolean)).size;
  const ultimo = registros[0] ? fechaDe(registros[0]) : null;

  const modulosPresentes = [...new Set(datos.auditorias.map((r) => r.modulo).filter(Boolean))];
  const personasPresentes = [...new Set(datos.auditorias.map((r) => r.usuarioId).filter(Boolean))];

  const armarReporte = () => ({
    titulo: "Historial de actividad",
    subtitulo: "Quién hizo qué dentro de tu empresa.",
    filtros: [rango.texto, modulo ? etiquetaModulo(modulo) : null, persona ? nombreDe({ usuarioId: persona }) : null].filter(Boolean).join(" · "),
    resumen: [
      { etiqueta: "Acciones", valor: String(registros.length) },
      { etiqueta: "Personas", valor: String(personas) }
    ],
    secciones: [
      {
        titulo: "Actividad",
        columnas: [
          { etiqueta: "Fecha", tipo: "texto" },
          { etiqueta: "Persona", tipo: "texto" },
          { etiqueta: "Qué hizo", tipo: "texto" },
          { etiqueta: "Dónde", tipo: "texto" },
          { etiqueta: "Detalle", tipo: "texto" }
        ],
        filas: registros.map((r) => [fechaDe(r)?.toLocaleString("es-BO") || "", nombreDe(r), descripcion(r), etiquetaModulo(r.modulo), r.detalle || ""])
      }
    ]
  });

  const hayFiltros = Boolean(modulo || persona || busqueda);

  return (
    <div className="re inv">
      <CabeceraReporte
        titulo="Historial de actividad"
        descripcion="Quién hizo qué dentro de tu empresa: ventas, compras, cambios y más. Se actualiza solo."
        onExcel={() => descargarExcel(armarReporte(), empresa, personalizacion)}
        onPdf={() => imprimirReporte(armarReporte(), empresa, personalizacion) || window.alert("Permite las ventanas emergentes para ver el PDF.")}
        deshabilitado={cargando}
        aviso={error}
      />

      <FiltroPeriodo periodo={periodo} setPeriodo={setPeriodo} desde={desde} setDesde={setDesde} hasta={hasta} setHasta={setHasta} />

      <div className="re-herramientas">
        <label className="re-busqueda">
          <Search size={19} aria-hidden="true" />
          <input type="search" placeholder="Buscar por persona o acción…" aria-label="Buscar actividad" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </label>

        <SelectorFiltro valor={modulo} onChange={setModulo} etiqueta="Dónde" opciones={[["", "Todas las áreas"], ...modulosPresentes.map((m) => [m, etiquetaModulo(m)])]} />
        <SelectorFiltro
          valor={persona}
          onChange={setPersona}
          etiqueta="Persona"
          opciones={[["", "Todas las personas"], ...personasPresentes.map((id) => [id, nombreDe({ usuarioId: id })])]}
        />

        {hayFiltros && (
          <button
            type="button"
            className="re-chip"
            onClick={() => {
              setModulo("");
              setPersona("");
              setBusqueda("");
            }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {cargando ? (
        <div className="re-vacio">Cargando actividad…</div>
      ) : (
        <>
          <TarjetasResumen
            items={[
              { icono: Activity, titulo: "Acciones", valor: registros.length.toLocaleString("es-BO"), nota: rango.texto.toLowerCase() },
              { icono: Users, titulo: "Personas activas", valor: String(personas), nota: "hicieron algo en el período" },
              {
                icono: Clock,
                titulo: "Última actividad",
                valor: ultimo ? ultimo.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" }) : "—",
                nota: ultimo ? ultimo.toLocaleDateString("es-BO", { day: "2-digit", month: "short" }) : "sin actividad"
              }
            ]}
          />

          <TablaReporte
            titulo="Actividad"
            filas={registros}
            claveFila={(r) => r.id}
            vacio={{ titulo: "No hay actividad en este período", texto: "Prueba con otro período o limpia los filtros." }}
            columnas={[
              {
                etiqueta: "Fecha",
                render: (r) => {
                  const f = fechaDe(r);
                  return f ? (
                    <div className="inv-celda">
                      <strong>{f.toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" })}</strong>
                      <small>{f.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" })}</small>
                    </div>
                  ) : (
                    "—"
                  );
                }
              },
              { etiqueta: "Persona", render: (r) => <strong>{nombreDe(r)}</strong> },
              {
                etiqueta: "Qué hizo",
                render: (r) => (
                  <div className="inv-celda">
                    <strong>{descripcion(r)}</strong>
                    {r.detalle && <small>{r.detalle}</small>}
                  </div>
                )
              },
              { etiqueta: "Dónde", render: (r) => <span className="co-pastilla-pago">{etiquetaModulo(r.modulo)}</span> }
            ]}
          />
        </>
      )}
    </div>
  );
}
