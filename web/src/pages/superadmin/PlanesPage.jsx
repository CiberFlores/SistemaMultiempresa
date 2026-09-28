import { useEffect, useMemo, useState } from "react";
import {
  BadgeDollarSign,
  CircleCheck,
  Eye,
  Pencil,
  Plus,
  Power,
  Search,
  Trash2,
  X
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  actualizarPlan,
  cambiarEstadoPlan,
  crearPlan,
  eliminarPlan,
  suscribirPlanes
} from "../../services/planService";
import { suscribirModulos } from "../../services/moduloService";
import { registrarAuditoria } from "../../services/auditService";
import useAuth from "../../hooks/useAuth";

const PLAN_TEMPLATES = {
  BASICO: {
    nombre: "Básico",
    precioMensual: "99",
    moneda: "BOB",
    limiteUsuarios: "3",
    limiteSucursales: "1",
    descripcion: "Ideal para negocios pequeños que necesitan catálogo, inventario, clientes y ventas esenciales."
  },
  PROFESIONAL: {
    nombre: "Profesional",
    precioMensual: "199",
    moneda: "BOB",
    limiteUsuarios: "10",
    limiteSucursales: "3",
    descripcion: "Incluye operación comercial completa con compras, inventario, ventas, caja y reportes para negocios en crecimiento."
  },
  EMPRESARIAL: {
    nombre: "Empresarial",
    precioMensual: "399",
    moneda: "BOB",
    limiteUsuarios: "30",
    limiteSucursales: "10",
    descripcion: "Pensado para empresas con múltiples sucursales, mayor cantidad de usuarios, finanzas, auditoría y analítica avanzada."
  },
  CORPORATIVO: {
    nombre: "Corporativo",
    precioMensual: "799",
    moneda: "BOB",
    limiteUsuarios: "100",
    limiteSucursales: "25",
    descripcion: "Paquete de alta capacidad para organizaciones con operación extensa, múltiples sucursales y acceso a todos los módulos disponibles."
  }
};

const formularioInicial = {
  plantilla: "",
  nombre: "",
  descripcion: "",
  precioMensual: "",
  moneda: "BOB",
  limiteUsuarios: "5",
  limiteSucursales: "1",
  modulos: []
};

export default function PlanesPage() {
  const { usuario } = useAuth();
  const [planes, setPlanes] = useState([]);
  const [modulos, setModulos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("TODOS");
  const [mostrarModal, setMostrarModal] = useState(false);
  const [planEditando, setPlanEditando] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const cancelarPlanes = suscribirPlanes(
      (datos) => {
        setPlanes(datos);
        setCargando(false);
      },
      (err) => {
        console.error(err);
        setCargando(false);
      }
    );
    const cancelarModulos = suscribirModulos(setModulos, console.error);
    return () => {
      cancelarPlanes();
      cancelarModulos();
    };
  }, []);

  const modulosActivos = useMemo(() => modulos.filter((modulo) => modulo.activo === true), [modulos]);

  const planesFiltrados = useMemo(() => {
    const texto = busqueda.toLowerCase();
    return planes.filter((plan) => {
      const matchText = !texto || [plan.nombre, plan.descripcion, plan.moneda].some((value) => String(value || "").toLowerCase().includes(texto));
      const matchStatus = estadoFiltro === "TODOS" || (estadoFiltro === "ACTIVO" ? plan.activo === true : plan.activo !== true);
      return matchText && matchStatus;
    });
  }, [planes, busqueda, estadoFiltro]);

  const nombreModulo = (moduloId) => modulos.find((modulo) => modulo.id === moduloId)?.nombre || "Módulo";

  const aplicarPlantilla = (key) => {
    if (!key) {
      setFormulario((prev) => ({ ...prev, plantilla: "" }));
      return;
    }
    const template = PLAN_TEMPLATES[key];
    setFormulario((prev) => ({
      ...prev,
      ...template,
      plantilla: key,
      modulos: prev.modulos
    }));
  };

  const alternarModulo = (moduloId) => {
    setFormulario((prev) => ({
      ...prev,
      modulos: prev.modulos.includes(moduloId)
        ? prev.modulos.filter((id) => id !== moduloId)
        : [...prev.modulos, moduloId]
    }));
  };

  const abrirNuevo = () => {
    setPlanEditando(null);
    setFormulario(formularioInicial);
    setError("");
    setMostrarModal(true);
  };

  const abrirEditar = (plan) => {
    setPlanEditando(plan);
    setFormulario({
      plantilla: "",
      nombre: plan.nombre || "",
      descripcion: plan.descripcion || "",
      precioMensual: String(plan.precioMensual ?? 0),
      moneda: plan.moneda || "BOB",
      limiteUsuarios: String(plan.limiteUsuarios ?? 1),
      limiteSucursales: String(plan.limiteSucursales ?? 1),
      modulos: plan.modulos || []
    });
    setError("");
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    if (guardando) return;
    setMostrarModal(false);
    setPlanEditando(null);
    setFormulario(formularioInicial);
    setError("");
  };

  const guardar = async (event) => {
    event.preventDefault();
    try {
      setGuardando(true);
      setError("");
      if (!formulario.nombre.trim()) throw new Error("El nombre del plan es obligatorio.");
      if (Number(formulario.precioMensual) < 0) throw new Error("El precio no puede ser negativo.");
      if (Number(formulario.limiteUsuarios) < 1) throw new Error("Debe permitir al menos un usuario.");
      if (Number(formulario.limiteSucursales) < 1) throw new Error("Debe permitir al menos una sucursal.");

      if (planEditando) {
        await actualizarPlan(planEditando.id, formulario);
        await registrarAuditoria({
          empresaId: null,
          usuarioId: usuario?.uid,
          usuarioNombre: usuario?.nombreCompleto || usuario?.correo || "",
          accion: "ACTUALIZAR",
          modulo: "planes",
          entidad: "plan",
          entidadId: planEditando.id,
          detalle: `Actualizó el plan ${formulario.nombre.trim()}`
        });
      } else {
        const creado = await crearPlan(formulario);
        await registrarAuditoria({
          empresaId: null,
          usuarioId: usuario?.uid,
          usuarioNombre: usuario?.nombreCompleto || usuario?.correo || "",
          accion: "CREAR",
          modulo: "planes",
          entidad: "plan",
          entidadId: creado?.id || "",
          detalle: `Creó el plan ${formulario.nombre.trim()}`
        });
      }

      cerrarModal();
    } catch (err) {
      setError(err.message || "No se pudo guardar el plan.");
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (plan) => {
    const nuevoEstado = !plan.activo;
    if (!window.confirm(`¿Deseas ${nuevoEstado ? "activar" : "desactivar"} el plan "${plan.nombre}"?`)) return;
    await cambiarEstadoPlan(plan.id, nuevoEstado);
    await registrarAuditoria({
      empresaId: null,
      usuarioId: usuario?.uid,
      usuarioNombre: usuario?.nombreCompleto || usuario?.correo || "",
      accion: "CAMBIAR_ESTADO",
      modulo: "planes",
      entidad: "plan",
      entidadId: plan.id,
      detalle: `${plan.nombre}: ${nuevoEstado ? "ACTIVO" : "INACTIVO"}`
    });
  };

  const eliminar = async (plan) => {
    if (!window.confirm(`¿Eliminar definitivamente el plan "${plan.nombre}"? Solo se permitirá si no tiene licencias asociadas.`)) return;
    try {
      await eliminarPlan(plan.id);
      await registrarAuditoria({
        empresaId: null,
        usuarioId: usuario?.uid,
        usuarioNombre: usuario?.nombreCompleto || usuario?.correo || "",
        accion: "ELIMINAR",
        modulo: "planes",
        entidad: "plan",
        entidadId: plan.id,
        detalle: `Eliminó el plan ${plan.nombre}`
      });
    } catch (err) {
      alert(err.message || "No se pudo eliminar el plan.");
    }
  };

  return (
    <div>
      <div className="sa-page-header">
        <div>
          <h1>Planes</h1>
          <p>Configura paquetes comerciales. Puedes partir de una plantilla y luego personalizar precio, límites y módulos.</p>
        </div>
        <button className="sa-primary-button" onClick={abrirNuevo}><Plus size={17} /> Nuevo plan</button>
      </div>

      <section className="sa-plan-summary">
        <article className="sa-plan-summary-card"><BadgeDollarSign size={22} /><div><span>Planes registrados</span><strong>{planes.length}</strong></div></article>
        <article className="sa-plan-summary-card"><CircleCheck size={22} /><div><span>Planes activos</span><strong>{planes.filter((plan) => plan.activo).length}</strong></div></article>
      </section>

      <section className="sa-panel">
        <div className="sa-table-toolbar sa-toolbar-v4">
          <div className="sa-table-search"><Search size={17} /><input placeholder="Buscar plan..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} /></div>
          <select className="sa-filter-select-v4" value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)}>
            <option value="TODOS">Todos los estados</option>
            <option value="ACTIVO">Activos</option>
            <option value="INACTIVO">Inactivos</option>
          </select>
          <span>{planesFiltrados.length} resultado(s)</span>
        </div>

        {cargando ? (
          <div className="sa-empty">Cargando planes...</div>
        ) : planesFiltrados.length === 0 ? (
          <div className="sa-empty"><BadgeDollarSign size={42} /><strong>No existen planes</strong><span>Registra el primer plan comercial.</span></div>
        ) : (
          <div className="sa-table-container">
            <table className="sa-table">
              <thead><tr><th>PLAN</th><th>PRECIO</th><th>USUARIOS</th><th>SUCURSALES</th><th>MÓDULOS</th><th>ESTADO</th><th>ACCIONES</th></tr></thead>
              <tbody>
                {planesFiltrados.map((plan) => (
                  <tr key={plan.id}>
                    <td><strong>{plan.nombre}</strong><small className="sa-table-description">{plan.descripcion || "Sin descripción"}</small></td>
                    <td><span className="sa-price">{plan.moneda || "BOB"} {Number(plan.precioMensual || 0).toFixed(2)}</span></td>
                    <td>{plan.limiteUsuarios}</td>
                    <td>{plan.limiteSucursales}</td>
                    <td><div className="sa-mini-modules">{(plan.modulos || []).slice(0, 3).map((id) => <span key={id}>{nombreModulo(id)}</span>)}{(plan.modulos || []).length > 3 && <span>+{plan.modulos.length - 3}</span>}</div></td>
                    <td><span className={plan.activo ? "sa-badge active" : "sa-badge suspended"}>{plan.activo ? "ACTIVO" : "INACTIVO"}</span></td>
                    <td><div className="sa-actions">
                      <button title="Ver detalle" onClick={() => setDetalle(plan)}><Eye size={16} /></button>
                      <button title="Editar" onClick={() => abrirEditar(plan)}><Pencil size={16} /></button>
                      <button title={plan.activo ? "Desactivar" : "Activar"} onClick={() => cambiarEstado(plan)}>{plan.activo ? <Power size={16} /> : <CircleCheck size={16} />}</button>
                      <button title="Eliminar" className="danger" onClick={() => eliminar(plan)}><Trash2 size={16} /></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <AnimatePresence>
        {detalle && (
          <motion.div className="sa-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => setDetalle(null)}>
            <motion.div className="sa-modal" initial={{ opacity: 0, scale: 0.96, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} onMouseDown={(e) => e.stopPropagation()}>
              <div className="sa-modal-header"><div><h2>{detalle.nombre}</h2><p>Detalle comercial del plan.</p></div><button onClick={() => setDetalle(null)}><X size={20} /></button></div>
              <div className="detail-grid-v4">
                <div><span>Precio mensual</span><strong>{detalle.moneda || "BOB"} {Number(detalle.precioMensual || 0).toFixed(2)}</strong></div>
                <div><span>Estado</span><strong>{detalle.activo ? "ACTIVO" : "INACTIVO"}</strong></div>
                <div><span>Límite usuarios</span><strong>{detalle.limiteUsuarios}</strong></div>
                <div><span>Límite sucursales</span><strong>{detalle.limiteSucursales}</strong></div>
                <div className="detail-span-2"><span>Descripción</span><strong>{detalle.descripcion || "-"}</strong></div>
                <div className="detail-span-2"><span>Módulos incluidos</span><div className="sa-mini-modules">{(detalle.modulos || []).map((id) => <span key={id}>{nombreModulo(id)}</span>)}</div></div>
              </div>
              <div className="sa-modal-footer"><button className="sa-secondary-button" onClick={() => setDetalle(null)}>Cerrar</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mostrarModal && (
          <motion.div className="sa-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={cerrarModal}>
            <motion.div className="sa-modal sa-modal-wide-v4" initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} onMouseDown={(e) => e.stopPropagation()}>
              <div className="sa-modal-header"><div><h2>{planEditando ? "Editar plan" : "Nuevo plan"}</h2><p>Selecciona una plantilla para agilizar el registro o personaliza todos los valores.</p></div><button onClick={cerrarModal}><X size={20} /></button></div>

              <form onSubmit={guardar}>
                <div className="sa-form-grid">
                  {!planEditando && (
                    <div className="sa-form-group full">
                      <label>Plantilla rápida</label>
                      <select value={formulario.plantilla} onChange={(e) => aplicarPlantilla(e.target.value)}>
                        <option value="">Personalizado / sin plantilla</option>
                        <option value="BASICO">Básico</option>
                        <option value="PROFESIONAL">Profesional</option>
                        <option value="EMPRESARIAL">Empresarial</option>
                        <option value="CORPORATIVO">Corporativo</option>
                      </select>
                    </div>
                  )}

                  <div className="sa-form-group"><label>Nombre *</label><input value={formulario.nombre} onChange={(e) => setFormulario({ ...formulario, nombre: e.target.value })} placeholder="Profesional" /></div>
                  <div className="sa-form-group"><label>Moneda</label><select value={formulario.moneda} onChange={(e) => setFormulario({ ...formulario, moneda: e.target.value })}><option value="BOB">BOB - Boliviano</option><option value="USD">USD - Dólar</option><option value="EUR">EUR - Euro</option><option value="PEN">PEN - Sol peruano</option><option value="CLP">CLP - Peso chileno</option><option value="ARS">ARS - Peso argentino</option><option value="COP">COP - Peso colombiano</option></select></div>

                  <div className="sa-form-group"><label>Precio mensual</label><input list="precios-plan" type="number" min="0" step="0.01" value={formulario.precioMensual} onChange={(e) => setFormulario({ ...formulario, precioMensual: e.target.value })} /><datalist id="precios-plan"><option value="49"/><option value="99"/><option value="149"/><option value="199"/><option value="299"/><option value="399"/><option value="599"/><option value="799"/></datalist></div>
                  <div className="sa-form-group"><label>Límite de usuarios</label><input list="limites-usuarios" type="number" min="1" value={formulario.limiteUsuarios} onChange={(e) => setFormulario({ ...formulario, limiteUsuarios: e.target.value })} /><datalist id="limites-usuarios"><option value="1"/><option value="3"/><option value="5"/><option value="10"/><option value="20"/><option value="30"/><option value="50"/><option value="100"/></datalist></div>
                  <div className="sa-form-group"><label>Límite de sucursales</label><input list="limites-sucursales" type="number" min="1" value={formulario.limiteSucursales} onChange={(e) => setFormulario({ ...formulario, limiteSucursales: e.target.value })} /><datalist id="limites-sucursales"><option value="1"/><option value="2"/><option value="3"/><option value="5"/><option value="10"/><option value="25"/><option value="50"/></datalist></div>

                  <div className="sa-form-group full"><label>Descripción de lo que ofrece</label><textarea rows={4} value={formulario.descripcion} onChange={(e) => setFormulario({ ...formulario, descripcion: e.target.value })} placeholder="Describe el público objetivo y las capacidades principales del plan." /></div>

                  <div className="sa-form-group full"><label>Módulos incluidos</label><div className="sa-module-grid">{modulosActivos.map((modulo) => { const seleccionado = formulario.modulos.includes(modulo.id); return <label key={modulo.id} className={seleccionado ? "sa-module-option selected" : "sa-module-option"}><input type="checkbox" checked={seleccionado} onChange={() => alternarModulo(modulo.id)} /><div><strong>{modulo.nombre}</strong><small>{modulo.codigo}</small></div></label>; })}</div></div>
                </div>

                {error && <div className="sa-form-error">{error}</div>}
                <div className="sa-modal-footer"><button type="button" className="sa-secondary-button" onClick={cerrarModal}>Cancelar</button><button type="submit" className="sa-primary-button" disabled={guardando}>{guardando ? "Guardando..." : planEditando ? "Guardar cambios" : "Crear plan"}</button></div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
