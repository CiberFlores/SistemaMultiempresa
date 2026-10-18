import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CircleCheck,
  ExternalLink,
  Eye,
  Pencil,
  Plus,
  Power,
  Trash2,
  X
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import AdvancedFilterBar from "../../components/filters/AdvancedFilterBar";
import LocationPicker from "../../components/common/LocationPicker";
import {
  actualizarEmpresa,
  cambiarEstadoEmpresa,
  crearEmpresa,
  suscribirEmpresas,
  verificarSlugDisponible
} from "../../services/empresaService";
import { eliminarEmpresaDefinitivamente } from "../../services/platformService";
import { registrarAuditoria } from "../../services/auditService";
import { generarSlug } from "../../utils/slug";
import { RUBROS_EMPRESA, RUBROS_PLANOS } from "../../data/businessCategories";
import useAuth from "../../hooks/useAuth";

const initial = {
  nombreComercial: "",
  razonSocial: "",
  rubro: "",
  rubroPersonalizado: "",
  nit: "",
  telefono: "",
  correo: "",
  slugPublico: "",
  ubicacion: {
    paisCodigo: "BO",
    paisNombre: "Bolivia",
    regionCodigo: "",
    regionNombre: "",
    provincia: "",
    ciudad: "",
    direccion: ""
  }
};

function normalizarRubro(valor) {
  return String(valor || "").trim();
}

export default function EmpresasPage() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("TODOS");
  const [country, setCountry] = useState("TODOS");
  const [rubroFilter, setRubroFilter] = useState("TODOS");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(
    () =>
      suscribirEmpresas(
        (data) => {
          setRows(data);
          setLoading(false);
        },
        (err) => {
          console.error(err);
          setError("No se pudieron cargar las empresas.");
          setLoading(false);
        }
      ),
    []
  );

  const countries = useMemo(
    () =>
      Array.from(
        new Map(
          rows.map((row) => [
            row.paisCodigo || row.ubicacion?.paisCodigo || row.pais || "",
            row.pais || row.ubicacion?.paisNombre || row.paisCodigo || ""
          ])
        ).entries()
      )
        .filter(([value]) => value)
        .map(([value, label]) => ({ value, label })),
    [rows]
  );

  const rubrosDisponibles = useMemo(
    () =>
      Array.from(
        new Set([
          ...RUBROS_PLANOS,
          ...rows.map((row) => normalizarRubro(row.rubro)).filter(Boolean)
        ])
      )
        .sort((a, b) => a.localeCompare(b))
        .map((value) => ({ value, label: value })),
    [rows]
  );

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        const q = search.toLowerCase();
        const loc = row.ubicacion || {};
        const match =
          !q ||
          [
            row.nombreComercial,
            row.razonSocial,
            row.rubro,
            row.nit,
            row.correo,
            row.telefono,
            row.slugPublico,
            row.pais,
            loc.paisNombre,
            row.region,
            loc.regionNombre,
            row.provincia,
            loc.provincia,
            row.ciudad,
            loc.ciudad
          ].some((value) => String(value || "").toLowerCase().includes(q));

        const statusOk = status === "TODOS" || row.estado === status;
        const code = row.paisCodigo || loc.paisCodigo || row.pais || "";
        const countryOk = country === "TODOS" || code === country;
        const rubroOk = rubroFilter === "TODOS" || row.rubro === rubroFilter;
        return match && statusOk && countryOk && rubroOk;
      }),
    [rows, search, status, country, rubroFilter]
  );

  const openNew = () => {
    setEditing(null);
    setForm(initial);
    setError("");
    setOpen(true);
  };

  const openEdit = (row) => {
    const loc = row.ubicacion || {
      paisCodigo: row.paisCodigo || "BO",
      paisNombre: row.pais || "Bolivia",
      regionCodigo: row.regionCodigo || "",
      regionNombre: row.region || "",
      provincia: row.provincia || "",
      ciudad: row.ciudad || "",
      direccion: row.direccion || ""
    };
    const rubroConocido = RUBROS_PLANOS.includes(row.rubro || "");

    setEditing(row);
    setForm({
      nombreComercial: row.nombreComercial || "",
      razonSocial: row.razonSocial || "",
      rubro: rubroConocido ? row.rubro : row.rubro ? "OTRO" : "",
      rubroPersonalizado: rubroConocido ? "" : row.rubro || "",
      nit: row.nit || "",
      telefono: row.telefono || "",
      correo: row.correo || "",
      slugPublico: row.slugPublico || "",
      ubicacion: {
        ...initial.ubicacion,
        ...loc
      }
    });
    setError("");
    setOpen(true);
  };

  const save = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");

      if (!form.nombreComercial.trim()) {
        throw new Error("El nombre comercial es obligatorio.");
      }

      const rubroFinal =
        form.rubro === "OTRO"
          ? form.rubroPersonalizado.trim()
          : form.rubro.trim();

      if (!rubroFinal) {
        throw new Error("Selecciona un rubro o especifica uno personalizado.");
      }

      const slug = generarSlug(form.slugPublico || form.nombreComercial);
      if (!(await verificarSlugDisponible(slug, editing?.id))) {
        throw new Error("El slug público ya está en uso.");
      }

      const u = form.ubicacion;
      const payload = {
        nombreComercial: form.nombreComercial.trim(),
        razonSocial: form.razonSocial.trim(),
        rubro: rubroFinal,
        nit: form.nit.trim(),
        telefono: form.telefono.trim(),
        correo: form.correo.trim().toLowerCase(),
        slugPublico: slug,
        ubicacion: u,
        paisCodigo: u.paisCodigo,
        pais: u.paisNombre,
        regionCodigo: u.regionCodigo,
        region: u.regionNombre,
        provincia: u.provincia || "",
        ciudad: u.ciudad,
        direccion: u.direccion
      };

      if (editing) {
        await actualizarEmpresa(editing.id, payload);
        await registrarAuditoria({
          empresaId: null,
          usuarioId: usuario?.uid,
          usuarioNombre: usuario?.nombreCompleto || usuario?.correo || "",
          accion: "ACTUALIZAR",
          modulo: "empresas",
          entidad: "empresa",
          entidadId: editing.id,
          detalle: `Actualizó la empresa ${payload.nombreComercial}`
        });
      } else {
        const creada = await crearEmpresa(payload);
        await registrarAuditoria({
          empresaId: null,
          usuarioId: usuario?.uid,
          usuarioNombre: usuario?.nombreCompleto || usuario?.correo || "",
          accion: "CREAR",
          modulo: "empresas",
          entidad: "empresa",
          entidadId: creada?.id || "",
          detalle: `Creó la empresa ${payload.nombreComercial}`
        });
      }

      setOpen(false);
    } catch (err) {
      setError(err.message || "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (row) => {
    const next = row.estado === "ACTIVA" ? "SUSPENDIDA" : "ACTIVA";
    if (!window.confirm(`¿${next === "ACTIVA" ? "Reactivar" : "Suspender"} ${row.nombreComercial}?`)) {
      return;
    }

    await cambiarEstadoEmpresa(row.id, next);
    await registrarAuditoria({
      empresaId: null,
      usuarioId: usuario?.uid,
      usuarioNombre: usuario?.nombreCompleto || usuario?.correo || "",
      accion: "CAMBIAR_ESTADO",
      modulo: "empresas",
      entidad: "empresa",
      entidadId: row.id,
      detalle: `${row.nombreComercial}: ${row.estado || "ACTIVA"} → ${next}`
    });
  };

  const remove = async (row) => {
    if (
      !window.confirm(
        `¿Eliminar definitivamente la empresa ${row.nombreComercial}? Solo se permitirá si no tiene usuarios u operaciones relacionadas.`
      )
    ) {
      return;
    }

    try {
      await eliminarEmpresaDefinitivamente(row.id);
      await registrarAuditoria({
        empresaId: null,
        usuarioId: usuario?.uid,
        usuarioNombre: usuario?.nombreCompleto || usuario?.correo || "",
        accion: "ELIMINAR",
        modulo: "empresas",
        entidad: "empresa",
        entidadId: row.id,
        detalle: `Eliminó la empresa ${row.nombreComercial}`
      });
    } catch (err) {
      alert(err.message || "No se pudo eliminar.");
    }
  };

  return (
    <div className="module-page">
      <div className="module-page-header">
        <div>
          <span className="eyebrow">SUPER ADMIN · EMPRESAS</span>
          <h1>Empresas</h1>
          <p>Control global de negocios, rubros, ubicación internacional y estado de acceso.</p>
        </div>
        <button className="primary-action" onClick={openNew}>
          <Plus size={17} /> Nueva empresa
        </button>
      </div>

      <AdvancedFilterBar
        search={search}
        onSearch={setSearch}
        status={status}
        onStatus={setStatus}
        statusOptions={[
          { value: "TODOS", label: "Todos los estados" },
          { value: "ACTIVA", label: "Activas" },
          { value: "SUSPENDIDA", label: "Suspendidas" }
        ]}
        filters={[
          {
            key: "rubro",
            label: "Todos los rubros",
            value: rubroFilter,
            onChange: setRubroFilter,
            options: rubrosDisponibles
          },
          {
            key: "pais",
            label: "Todos los países",
            value: country,
            onChange: setCountry,
            options: countries
          }
        ]}
        onClear={() => {
          setSearch("");
          setStatus("TODOS");
          setCountry("TODOS");
          setRubroFilter("TODOS");
        }}
      />

      <section className="data-card glass-3d">
        <div className="data-card-meta">
          <strong>{filtered.length}</strong>
          <span>de {rows.length} empresa(s)</span>
        </div>

        {loading ? (
          <div className="empty-state">Cargando empresas…</div>
        ) : (
          <div className="table-scroll">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>EMPRESA</th>
                  <th>RUBRO</th>
                  <th>UBICACIÓN</th>
                  <th>SLUG</th>
                  <th>ESTADO</th>
                  <th>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.nombreComercial}</strong>
                      <small className="table-sub">{row.razonSocial || row.correo || "Sin razón social"}</small>
                    </td>
                    <td>{row.rubro || "-"}</td>
                    <td>
                      {[
                        row.ubicacion?.ciudad || row.ciudad,
                        row.ubicacion?.regionNombre || row.region,
                        row.ubicacion?.paisNombre || row.pais
                      ]
                        .filter(Boolean)
                        .join(", ") || "-"}
                    </td>
                    <td><code>{row.slugPublico || "-"}</code></td>
                    <td>
                      <span className={`status-pill ${row.estado === "ACTIVA" ? "active" : "inactive"}`}>
                        {row.estado || "ACTIVA"}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button title="Ver detalles" onClick={() => setDetail(row)}><Eye size={16} /></button>
                        <button title="Centro de control" onClick={() => navigate(`/superadmin/empresas/${row.id}/control`)}><ExternalLink size={16} /></button>
                        <button title="Editar" onClick={() => openEdit(row)}><Pencil size={16} /></button>
                        <button title="Activar/suspender" onClick={() => toggle(row)}><Power size={16} /></button>
                        <button title="Eliminar" className="danger" onClick={() => remove(row)}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && <div className="empty-state">No hay empresas con esos filtros.</div>}
          </div>
        )}
      </section>

      <AnimatePresence>
        {detail && (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => setDetail(null)}>
            <motion.div className="modal-card modal-wide glass-3d" initial={{ opacity: 0, scale: 0.96, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} onMouseDown={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <div><span className="eyebrow">DETALLE</span><h2>{detail.nombreComercial}</h2></div>
                <button onClick={() => setDetail(null)}><X size={18} /></button>
              </div>
              <div className="detail-grid-v4">
                <div><span>Razón social</span><strong>{detail.razonSocial || "-"}</strong></div>
                <div><span>Rubro</span><strong>{detail.rubro || "-"}</strong></div>
                <div><span>NIT / documento</span><strong>{detail.nit || "-"}</strong></div>
                <div><span>Correo</span><strong>{detail.correo || "-"}</strong></div>
                <div><span>Teléfono</span><strong>{detail.telefono || "-"}</strong></div>
                <div><span>Estado</span><strong>{detail.estado || "ACTIVA"}</strong></div>
                <div><span>País</span><strong>{detail.ubicacion?.paisNombre || detail.pais || "-"}</strong></div>
                <div><span>Región</span><strong>{detail.ubicacion?.regionNombre || detail.region || "-"}</strong></div>
                <div><span>Provincia / distrito</span><strong>{detail.ubicacion?.provincia || detail.provincia || "-"}</strong></div>
                <div><span>Ciudad</span><strong>{detail.ubicacion?.ciudad || detail.ciudad || "-"}</strong></div>
                <div className="detail-span-2"><span>Dirección</span><strong>{detail.ubicacion?.direccion || detail.direccion || "-"}</strong></div>
                <div className="detail-span-2"><span>Slug público</span><strong>{detail.slugPublico || "-"}</strong></div>
              </div>
              <div className="modal-actions">
                <button className="secondary-action" onClick={() => setDetail(null)}>Cerrar</button>
                <button className="primary-action" onClick={() => { setDetail(null); navigate(`/superadmin/empresas/${detail.id}/control`); }}>Abrir centro de control</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => setOpen(false)}>
            <motion.div className="modal-card modal-wide glass-3d" initial={{ opacity: 0, scale: 0.94, y: 22, rotateX: -8 }} animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }} onMouseDown={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <div><span className="eyebrow">{editing ? "EDITAR" : "CREAR"}</span><h2>{editing ? "Editar empresa" : "Nueva empresa"}</h2></div>
                <button onClick={() => setOpen(false)}><X size={18} /></button>
              </div>

              <form className="smart-form" onSubmit={save}>
                <label className="field-block">
                  <span>Nombre comercial *</span>
                  <input value={form.nombreComercial} onChange={(e) => setForm({ ...form, nombreComercial: e.target.value, slugPublico: editing ? form.slugPublico : generarSlug(e.target.value) })} />
                </label>

                <label className="field-block">
                  <span>Razón social</span>
                  <input value={form.razonSocial} onChange={(e) => setForm({ ...form, razonSocial: e.target.value })} />
                </label>

                <label className="field-block">
                  <span>Rubro *</span>
                  <select value={form.rubro} onChange={(e) => setForm({ ...form, rubro: e.target.value, rubroPersonalizado: e.target.value === "OTRO" ? form.rubroPersonalizado : "" })}>
                    <option value="">Seleccionar rubro</option>
                    {RUBROS_EMPRESA.map((grupo) => (
                      <optgroup key={grupo.grupo} label={grupo.grupo}>
                        {grupo.opciones.map((opcion) => <option key={opcion} value={opcion}>{opcion}</option>)}
                      </optgroup>
                    ))}
                    <option value="OTRO">Otro / rubro personalizado</option>
                  </select>
                </label>

                <label className="field-block">
                  <span>NIT / documento fiscal</span>
                  <input value={form.nit} onChange={(e) => setForm({ ...form, nit: e.target.value })} />
                </label>

                {form.rubro === "OTRO" && (
                  <label className="field-block field-span-2">
                    <span>Especificar rubro *</span>
                    <input value={form.rubroPersonalizado} onChange={(e) => setForm({ ...form, rubroPersonalizado: e.target.value })} placeholder="Ej. Distribuidora de insumos odontológicos" />
                  </label>
                )}

                <label className="field-block">
                  <span>Correo</span>
                  <input type="email" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} />
                </label>

                <label className="field-block">
                  <span>Teléfono</span>
                  <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
                </label>

                <label className="field-block field-span-2">
                  <span>Slug público</span>
                  <input value={form.slugPublico} onChange={(e) => setForm({ ...form, slugPublico: generarSlug(e.target.value) })} />
                </label>

                <div className="field-span-2">
                  <LocationPicker value={form.ubicacion} onChange={(ubicacion) => setForm({ ...form, ubicacion })} />
                </div>

                {error && <div className="form-error field-span-2">{error}</div>}

                <div className="modal-actions field-span-2">
                  <button type="button" className="secondary-action" onClick={() => setOpen(false)}>Cancelar</button>
                  <button className="primary-action" disabled={saving}><CircleCheck size={16} />{saving ? "Guardando…" : "Guardar empresa"}</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
