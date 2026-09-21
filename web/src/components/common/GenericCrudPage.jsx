import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Pencil, Plus, Power, Trash2, X } from "lucide-react";
import useAuth from "../../hooks/useAuth";
import AdvancedFilterBar from "../filters/AdvancedFilterBar";
import { actualizarRegistro, crearRegistro, eliminarRegistro, suscribirColeccionEmpresa } from "../../services/genericCrudService";
import { registrarAuditoria } from "../../services/auditService";

const normalize = (value) => String(value ?? "").toLowerCase();

export default function GenericCrudPage({
  title,
  description,
  collectionName,
  fields,
  searchFields,
  entityLabel = "registro",
  defaultValues = {},
  statusField = "estado",
  statusActive = "ACTIVO",
  statusInactive = "INACTIVO",
  extraFilters = [],
  transformBeforeSave,
  columns,
  allowDelete = true,
  globalCollection = false
}) {
  const { usuario } = useAuth();
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("TODOS");
  const [filters, setFilters] = useState(() => Object.fromEntries(extraFilters.map((f) => [f.key, "TODOS"])));
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minNumber, setMinNumber] = useState("");
  const [maxNumber, setMaxNumber] = useState("");
  const dateField = fields.find((f) => f.type === "date");
  const numberField = fields.find((f) => f.type === "number");
  const [form, setForm] = useState(defaultValues);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!globalCollection && !usuario?.empresaId) return undefined;
    return suscribirColeccionEmpresa(
      collectionName,
      globalCollection ? null : usuario.empresaId,
      (data) => { setRows(data); setLoading(false); },
      (err) => { console.error(err); setError("No se pudo cargar la información."); setLoading(false); },
      { globalCollection }
    );
  }, [collectionName, globalCollection, usuario?.empresaId]);

  const filtered = useMemo(() => rows.filter((row) => {
    const matchesSearch = !search || (searchFields || fields.map((f) => f.key)).some((key) => normalize(row[key]).includes(normalize(search)));
    const currentStatus = row[statusField] ?? statusActive;
    const matchesStatus = status === "TODOS" || currentStatus === status;
    const matchesExtra = extraFilters.every((filter) => filters[filter.key] === "TODOS" || String(row[filter.key] ?? "") === String(filters[filter.key]));
    const rowDate = dateField ? row[dateField.key] : null;
    const dateValue = rowDate?.toDate?.() || (rowDate ? new Date(`${rowDate}T12:00:00`) : null);
    const matchesDate = !dateField || ((!dateFrom || !dateValue || dateValue >= new Date(`${dateFrom}T00:00:00`)) && (!dateTo || !dateValue || dateValue <= new Date(`${dateTo}T23:59:59`)));
    const numeric = numberField ? Number(row[numberField.key] || 0) : 0;
    const matchesNumber = !numberField || ((minNumber === "" || numeric >= Number(minNumber)) && (maxNumber === "" || numeric <= Number(maxNumber)));
    return matchesSearch && matchesStatus && matchesExtra && matchesDate && matchesNumber;
  }), [rows, search, status, filters, fields, searchFields, statusField, statusActive, extraFilters, dateFrom, dateTo, minNumber, maxNumber, dateField, numberField]);

  const openNew = () => { setEditing(null); setForm(defaultValues); setError(""); setOpen(true); };
  const openEdit = (row) => { setEditing(row); setForm({ ...defaultValues, ...row }); setError(""); setOpen(true); };
  const close = () => { if (!saving) { setOpen(false); setEditing(null); setForm(defaultValues); setError(""); } };

  const save = async (event) => {
    event.preventDefault();
    try {
      setSaving(true); setError("");
      const required = fields.find((f) => f.required && !String(form[f.key] ?? "").trim());
      if (required) throw new Error(`${required.label} es obligatorio.`);
      const payloadBase = Object.fromEntries(fields.map((f) => [f.key, f.type === "number" ? Number(form[f.key] || 0) : form[f.key] ?? ""]));
      const payload = transformBeforeSave ? transformBeforeSave(payloadBase, form) : payloadBase;
      if (editing) {
        await actualizarRegistro(collectionName, editing.id, payload);
        await registrarAuditoria({ empresaId: globalCollection ? null : usuario?.empresaId, usuarioId: usuario?.uid, usuarioNombre: usuario?.nombreCompleto || usuario?.correo || "", accion: "ACTUALIZAR", modulo: collectionName, entidad: entityLabel, entidadId: editing.id, detalle: `Actualizó ${entityLabel}` });
      } else {
        const creado = await crearRegistro(collectionName, globalCollection ? null : usuario.empresaId, { ...payload, [statusField]: statusActive }, { globalCollection });
        await registrarAuditoria({ empresaId: globalCollection ? null : usuario?.empresaId, usuarioId: usuario?.uid, usuarioNombre: usuario?.nombreCompleto || usuario?.correo || "", accion: "CREAR", modulo: collectionName, entidad: entityLabel, entidadId: creado?.id || "", detalle: `Creó ${entityLabel}` });
      }
      setOpen(false);
      setEditing(null);
      setForm(defaultValues);
      setError("");
    } catch (err) { setError(err.message || "No se pudo guardar."); }
    finally { setSaving(false); }
  };

  const toggleStatus = async (row) => {
    const current = row[statusField] ?? statusActive;
    const next = current === statusActive ? statusInactive : statusActive;
    await actualizarRegistro(collectionName, row.id, { [statusField]: next });
    await registrarAuditoria({ empresaId: globalCollection ? null : usuario?.empresaId, usuarioId: usuario?.uid, usuarioNombre: usuario?.nombreCompleto || usuario?.correo || "", accion: "CAMBIAR_ESTADO", modulo: collectionName, entidad: entityLabel, entidadId: row.id, detalle: `${current} → ${next}` });
  };

  const remove = async (row) => {
    if (!window.confirm(`¿Eliminar definitivamente este ${entityLabel}? Esta acción no se puede deshacer.`)) return;
    try {
      await eliminarRegistro(collectionName, row.id);
      await registrarAuditoria({ empresaId: globalCollection ? null : usuario?.empresaId, usuarioId: usuario?.uid, usuarioNombre: usuario?.nombreCompleto || usuario?.correo || "", accion: "ELIMINAR", modulo: collectionName, entidad: entityLabel, entidadId: row.id, detalle: `Eliminó ${entityLabel}` });
    } catch (err) { alert(err.message || "No se pudo eliminar."); }
  };

  const visibleColumns = columns || fields.slice(0, 5).map((field) => ({ key: field.key, label: field.label }));

  return (
    <div className="module-page">
      <div className="module-page-header">
        <div><span className="eyebrow">GESTIÓN OPERATIVA</span><h1>{title}</h1><p>{description}</p></div>
        <button className="primary-action" onClick={openNew}><Plus size={17}/> Nuevo {entityLabel}</button>
      </div>

      <AdvancedFilterBar
        search={search} onSearch={setSearch} status={status} onStatus={setStatus}
        statusOptions={[{value:"TODOS",label:"Todos"},{value:statusActive,label:"Activos"},{value:statusInactive,label:"Inactivos"}]}
        filters={extraFilters.map((filter) => ({ ...filter, value: filters[filter.key], onChange: (value) => setFilters((prev) => ({ ...prev, [filter.key]: value })) }))}
        onClear={() => { setSearch(""); setStatus("TODOS"); setFilters(Object.fromEntries(extraFilters.map((f) => [f.key, "TODOS"]))); setDateFrom(""); setDateTo(""); setMinNumber(""); setMaxNumber(""); }}
      />
      {(dateField || numberField) && <div className="report-date-row filter-range-grid">{dateField && <><label>Desde<input type="date" value={dateFrom} onChange={(e)=>setDateFrom(e.target.value)}/></label><label>Hasta<input type="date" value={dateTo} onChange={(e)=>setDateTo(e.target.value)}/></label></>}{numberField && <><label>{numberField.label} mínimo<input type="number" step="0.01" value={minNumber} onChange={(e)=>setMinNumber(e.target.value)}/></label><label>{numberField.label} máximo<input type="number" step="0.01" value={maxNumber} onChange={(e)=>setMaxNumber(e.target.value)}/></label></>}</div>}

      <section className="data-card glass-3d">
        <div className="data-card-meta"><strong>{filtered.length}</strong><span>resultado(s) de {rows.length}</span></div>
        {error && <div className="form-error">{error}</div>}
        {loading ? <div className="empty-state">Cargando…</div> : filtered.length === 0 ? <div className="empty-state">No hay registros con los filtros seleccionados.</div> : (
          <div className="table-scroll"><table className="modern-table"><thead><tr>{visibleColumns.map((col) => <th key={col.key}>{col.label}</th>)}<th>ESTADO</th><th>ACCIONES</th></tr></thead><tbody>
            {filtered.map((row) => <tr key={row.id}>{visibleColumns.map((col) => <td key={col.key}>{col.render ? col.render(row) : String(row[col.key] ?? "-")}</td>)}<td><span className={`status-pill ${(row[statusField] ?? statusActive) === statusActive ? "active" : "inactive"}`}>{row[statusField] ?? statusActive}</span></td><td><div className="row-actions"><button onClick={() => openEdit(row)} title="Editar"><Pencil size={16}/></button><button onClick={() => toggleStatus(row)} title="Activar/desactivar"><Power size={16}/></button>{allowDelete && <button className="danger" onClick={() => remove(row)} title="Eliminar"><Trash2 size={16}/></button>}</div></td></tr>)}
          </tbody></table></div>
        )}
      </section>

      <AnimatePresence>{open && <motion.div className="modal-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={close}><motion.div className="modal-card glass-3d" initial={{opacity:0,scale:.94,y:24,rotateX:-8}} animate={{opacity:1,scale:1,y:0,rotateX:0}} exit={{opacity:0,scale:.96,y:12}} onMouseDown={(e)=>e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">{editing ? "EDITAR" : "CREAR"}</span><h2>{editing ? `Editar ${entityLabel}` : `Nuevo ${entityLabel}`}</h2></div><button onClick={close}><X size={18}/></button></div><form className="smart-form" onSubmit={save}>{fields.map((field) => <label key={field.key} className={field.wide ? "field-span-2 field-block" : "field-block"}><span>{field.label}{field.required ? " *" : ""}</span>{field.type === "select" ? <select value={form[field.key] ?? ""} onChange={(e)=>setForm((prev)=>({...prev,[field.key]:e.target.value}))}><option value="">Seleccionar</option>{(field.options || []).map((opt)=><option key={String(opt.value)} value={opt.value}>{opt.label}</option>)}</select> : field.type === "textarea" ? <textarea rows="3" value={form[field.key] ?? ""} onChange={(e)=>setForm((prev)=>({...prev,[field.key]:e.target.value}))}/> : <input type={field.type || "text"} value={form[field.key] ?? ""} onChange={(e)=>setForm((prev)=>({...prev,[field.key]:e.target.value}))} placeholder={field.placeholder || ""}/>}</label>)}{error && <div className="form-error field-span-2">{error}</div>}<div className="modal-actions field-span-2"><button type="button" className="secondary-action" onClick={close}>Cancelar</button><button className="primary-action" disabled={saving}>{saving ? "Guardando…" : "Guardar"}</button></div></form></motion.div></motion.div>}</AnimatePresence>
    </div>
  );
}
