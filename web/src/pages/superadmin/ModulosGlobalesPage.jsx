import { useEffect, useMemo, useState } from "react";
import {
  Boxes,
  CircleCheck,
  Eye,
  Pencil,
  Plus,
  Power,
  Search,
  Trash2,
  WandSparkles,
  X
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  actualizarModulo,
  cambiarEstadoModulo,
  crearModulo,
  eliminarModulo,
  inicializarModulosBase,
  suscribirModulos
} from "../../services/moduloService";
import { registrarAuditoria } from "../../services/auditService";
import useAuth from "../../hooks/useAuth";
import { MODULE_ICON_OPTIONS, obtenerIconoModulo } from "../../data/moduleIcons";

const formularioInicial = {
  nombre: "",
  codigo: "",
  descripcion: "",
  icono: "Boxes"
};

export default function ModulosGlobalesPage() {
  const { usuario } = useAuth();
  const [modulos, setModulos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("TODOS");
  const [cargando, setCargando] = useState(true);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [moduloEditando, setModuloEditando] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const cancelar = suscribirModulos(
      (datos) => {
        setModulos(datos);
        setCargando(false);
      },
      () => {
        setError("No se pudieron cargar los módulos.");
        setCargando(false);
      }
    );
    return cancelar;
  }, []);

  const modulosFiltrados = useMemo(() => {
    const texto = busqueda.toLowerCase();
    return modulos.filter((modulo) => {
      const textOk = !texto || [modulo.nombre, modulo.codigo, modulo.descripcion].some((value) => String(value || "").toLowerCase().includes(texto));
      const statusOk = estadoFiltro === "TODOS" || (estadoFiltro === "ACTIVO" ? modulo.activo === true : modulo.activo !== true);
      return textOk && statusOk;
    });
  }, [modulos, busqueda, estadoFiltro]);

  const abrirNuevo = () => {
    setModuloEditando(null);
    setFormulario(formularioInicial);
    setError("");
    setMostrarModal(true);
  };

  const abrirEditar = (modulo) => {
    setModuloEditando(modulo);
    setFormulario({
      nombre: modulo.nombre || "",
      codigo: modulo.codigo || "",
      descripcion: modulo.descripcion || "",
      icono: modulo.icono || "Boxes"
    });
    setError("");
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    if (guardando) return;
    setMostrarModal(false);
    setModuloEditando(null);
    setFormulario(formularioInicial);
    setError("");
  };

  const guardar = async (event) => {
    event.preventDefault();
    try {
      setGuardando(true);
      setError("");
      if (!formulario.nombre.trim()) throw new Error("El nombre es obligatorio.");
      if (!formulario.codigo.trim()) throw new Error("El código es obligatorio.");
      if (!formulario.icono) throw new Error("Selecciona un icono para mantener consistencia visual.");

      if (moduloEditando) {
        await actualizarModulo(moduloEditando.id, formulario);
        await registrarAuditoria({
          empresaId: null,
          usuarioId: usuario?.uid,
          usuarioNombre: usuario?.nombreCompleto || usuario?.correo || "",
          accion: "ACTUALIZAR",
          modulo: "modulos",
          entidad: "módulo",
          entidadId: moduloEditando.id,
          detalle: `Actualizó el módulo ${formulario.nombre.trim()}`
        });
      } else {
        const creado = await crearModulo(formulario);
        await registrarAuditoria({
          empresaId: null,
          usuarioId: usuario?.uid,
          usuarioNombre: usuario?.nombreCompleto || usuario?.correo || "",
          accion: "CREAR",
          modulo: "modulos",
          entidad: "módulo",
          entidadId: creado?.id || "",
          detalle: `Registró el módulo ${formulario.nombre.trim()}`
        });
      }
      cerrarModal();
    } catch (err) {
      setError(err.message || "No se pudo guardar el módulo.");
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (modulo) => {
    const nuevoEstado = !modulo.activo;
    if (!window.confirm(`¿Deseas ${nuevoEstado ? "activar" : "desactivar"} el módulo "${modulo.nombre}"?`)) return;
    await cambiarEstadoModulo(modulo.id, nuevoEstado);
    await registrarAuditoria({
      empresaId: null,
      usuarioId: usuario?.uid,
      usuarioNombre: usuario?.nombreCompleto || usuario?.correo || "",
      accion: "CAMBIAR_ESTADO",
      modulo: "modulos",
      entidad: "módulo",
      entidadId: modulo.id,
      detalle: `${modulo.nombre}: ${nuevoEstado ? "ACTIVO" : "INACTIVO"}`
    });
  };

  const cargarBase = async () => {
    try {
      const cantidad = await inicializarModulosBase();
      alert(cantidad ? `Se crearon ${cantidad} módulos base.` : "Los módulos base ya estaban creados.");
    } catch (err) {
      alert(err.message || "No se pudieron inicializar los módulos.");
    }
  };

  const eliminar = async (modulo) => {
    if (!window.confirm(`¿Eliminar definitivamente el módulo "${modulo.nombre}"?`)) return;
    try {
      await eliminarModulo(modulo.id);
      await registrarAuditoria({
        empresaId: null,
        usuarioId: usuario?.uid,
        usuarioNombre: usuario?.nombreCompleto || usuario?.correo || "",
        accion: "ELIMINAR",
        modulo: "modulos",
        entidad: "módulo",
        entidadId: modulo.id,
        detalle: `Eliminó el módulo ${modulo.nombre}`
      });
    } catch (err) {
      alert(err.message || "No se pudo eliminar.");
    }
  };

  const IconoFormulario = obtenerIconoModulo(formulario.icono);

  return (
    <div>
      <div className="sa-page-header">
        <div>
          <h1>Módulos</h1>
          <p>Catálogo global de funcionalidades ya desarrolladas. Los planes y licencias usan este catálogo para habilitar o bloquear capacidades.</p>
        </div>
        <div className="sa-header-actions-v4">
          <button className="sa-secondary-button" onClick={cargarBase}><WandSparkles size={17} /> Módulos base</button>
          <button className="sa-primary-button" onClick={abrirNuevo}><Plus size={17} /> Registrar módulo</button>
        </div>
      </div>

      <div className="info-panel-v4">
        <strong>Importante:</strong> registrar un módulo aquí no crea una nueva pantalla ni programa una funcionalidad automáticamente. Este catálogo representa funcionalidades que ya existen en el código y permite asignarlas a planes, licencias y empresas.
      </div>

      <section className="sa-panel">
        <div className="sa-table-toolbar sa-toolbar-v4">
          <div className="sa-table-search"><Search size={17} /><input placeholder="Buscar por nombre, código o descripción..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} /></div>
          <select className="sa-filter-select-v4" value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)}><option value="TODOS">Todos los estados</option><option value="ACTIVO">Activos</option><option value="INACTIVO">Inactivos</option></select>
          <span>{modulosFiltrados.length} módulo(s)</span>
        </div>

        {cargando ? (
          <div className="sa-empty">Cargando módulos...</div>
        ) : modulosFiltrados.length === 0 ? (
          <div className="sa-empty"><Boxes size={40} /><strong>Sin módulos registrados</strong><span>Inicializa los módulos base o registra una funcionalidad ya implementada.</span></div>
        ) : (
          <div className="sa-table-container">
            <table className="sa-table">
              <thead><tr><th>ICONO</th><th>MÓDULO</th><th>CÓDIGO</th><th>DESCRIPCIÓN</th><th>ESTADO</th><th>ACCIONES</th></tr></thead>
              <tbody>
                {modulosFiltrados.map((modulo) => {
                  const Icono = obtenerIconoModulo(modulo.icono);
                  return (
                    <tr key={modulo.id}>
                      <td><span className="module-icon-preview-v4"><Icono size={19} /></span></td>
                      <td><strong>{modulo.nombre}</strong></td>
                      <td><span className="sa-slug">{modulo.codigo}</span></td>
                      <td>{modulo.descripcion || "-"}</td>
                      <td><span className={modulo.activo ? "sa-badge active" : "sa-badge suspended"}>{modulo.activo ? "ACTIVO" : "INACTIVO"}</span></td>
                      <td><div className="sa-actions">
                        <button title="Ver detalle" onClick={() => setDetalle(modulo)}><Eye size={16} /></button>
                        <button title="Editar" onClick={() => abrirEditar(modulo)}><Pencil size={16} /></button>
                        <button title={modulo.activo ? "Desactivar" : "Activar"} onClick={() => cambiarEstado(modulo)}>{modulo.activo ? <Power size={16} /> : <CircleCheck size={16} />}</button>
                        <button title="Eliminar" className="danger" onClick={() => eliminar(modulo)}><Trash2 size={16} /></button>
                      </div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <AnimatePresence>
        {detalle && (
          <motion.div className="sa-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => setDetalle(null)}>
            <motion.div className="sa-modal" initial={{ opacity: 0, scale: 0.96, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} onMouseDown={(e) => e.stopPropagation()}>
              <div className="sa-modal-header"><div><h2>{detalle.nombre}</h2><p>Detalle de la funcionalidad global.</p></div><button onClick={() => setDetalle(null)}><X size={19} /></button></div>
              <div className="detail-grid-v4">
                <div><span>Código</span><strong>{detalle.codigo}</strong></div>
                <div><span>Estado</span><strong>{detalle.activo ? "ACTIVO" : "INACTIVO"}</strong></div>
                <div><span>Icono</span><strong>{detalle.icono || "Boxes"}</strong></div>
                <div className="detail-span-2"><span>Descripción</span><strong>{detalle.descripcion || "-"}</strong></div>
              </div>
              <div className="sa-modal-footer"><button className="sa-secondary-button" onClick={() => setDetalle(null)}>Cerrar</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mostrarModal && (
          <motion.div className="sa-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={cerrarModal}>
            <motion.div className="sa-modal" initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} onMouseDown={(e) => e.stopPropagation()}>
              <div className="sa-modal-header"><div><h2>{moduloEditando ? "Editar módulo" : "Registrar módulo"}</h2><p>Registra metadatos de una funcionalidad que ya existe en la aplicación.</p></div><button onClick={cerrarModal}><X size={19} /></button></div>

              <form onSubmit={guardar}>
                <div className="sa-form-grid">
                  <div className="sa-form-group"><label>Nombre *</label><input value={formulario.nombre} onChange={(e) => setFormulario({ ...formulario, nombre: e.target.value })} placeholder="Inventario" /></div>
                  <div className="sa-form-group"><label>Código *</label><input value={formulario.codigo} onChange={(e) => setFormulario({ ...formulario, codigo: e.target.value.toUpperCase().replace(/\s+/g, "_") })} placeholder="INVENTARIO" /></div>
                  <div className="sa-form-group full"><label>Descripción</label><textarea value={formulario.descripcion} onChange={(e) => setFormulario({ ...formulario, descripcion: e.target.value })} placeholder="Qué funcionalidad controla este módulo..." /></div>
                  <div className="sa-form-group full"><label>Icono *</label><div className="module-icon-picker-v4"><span className="module-icon-preview-v4 large"><IconoFormulario size={22} /></span><select value={formulario.icono} onChange={(e) => setFormulario({ ...formulario, icono: e.target.value })}>{MODULE_ICON_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div><small className="field-help-v4">Se usa un icono vectorial de Lucide, no una imagen subida. Así todos mantienen el mismo tamaño, grosor y calidad visual.</small></div>
                </div>

                {error && <div className="sa-form-error">{error}</div>}
                <div className="sa-modal-footer"><button type="button" className="sa-secondary-button" onClick={cerrarModal}>Cancelar</button><button className="sa-primary-button" disabled={guardando}>{guardando ? "Guardando..." : moduloEditando ? "Guardar cambios" : "Registrar módulo"}</button></div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
