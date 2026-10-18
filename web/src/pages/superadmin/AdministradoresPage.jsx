import { useEffect, useMemo, useState } from "react";
import {
  Eye,
  EyeOff,
  Pencil,
  Power,
  ShieldCheck,
  Trash2,
  UserPlus,
  X
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase/firebaseConfig";
import { suscribirAdministradores } from "../../services/platformService";
import { provisionarUsuario, actualizarPerfilUsuario } from "../../services/userProvisionService";
import { registrarAuditoria } from "../../services/auditService";
import AdvancedFilterBar from "../../components/filters/AdvancedFilterBar";
import PasswordStrength from "../../components/common/PasswordStrength";
import useAuth from "../../hooks/useAuth";

const initial = {
  empresaId: "",
  nombreCompleto: "",
  correo: "",
  telefono: "",
  password: "",
  estado: true,
  eliminado: false
};

export default function AdministradoresPage() {
  const { usuario } = useAuth();
  const [rows, setRows] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("TODOS");
  const [empresaFilter, setEmpresaFilter] = useState("TODOS");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState(initial);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = suscribirAdministradores(setRows, console.error);
    getDocs(collection(db, "empresas")).then((snapshot) =>
      setEmpresas(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
    );
    return unsub;
  }, []);

  const company = (id) => empresas.find((item) => item.id === id);
  const companyName = (id) => company(id)?.nombreComercial || "Sin empresa";

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        const q = search.toLowerCase();
        const matches =
          !q ||
          [row.nombreCompleto, row.correo, row.telefono, companyName(row.empresaId)].some((value) =>
            String(value || "").toLowerCase().includes(q)
          );

        let statusOk = true;
        if (status === "ACTIVO") statusOk = row.estado === true && row.eliminado !== true;
        if (status === "INACTIVO") statusOk = row.estado !== true && row.eliminado !== true;
        if (status === "ELIMINADO") statusOk = row.eliminado === true;

        const companyOk = empresaFilter === "TODOS" || row.empresaId === empresaFilter;
        return matches && statusOk && companyOk;
      }),
    [rows, search, status, empresaFilter, empresas]
  );

  const newAdmin = () => {
    setEditing(null);
    setForm(initial);
    setShowPassword(false);
    setError("");
    setOpen(true);
  };

  const edit = (row) => {
    setEditing(row);
    setForm({ ...initial, ...row, password: "" });
    setShowPassword(false);
    setError("");
    setOpen(true);
  };

  const handleCompanyChange = (empresaId) => {
    const selected = company(empresaId);
    setForm((prev) => {
      if (!selected || editing) return { ...prev, empresaId };
      return {
        ...prev,
        empresaId,
        nombreCompleto: `Administrador - ${selected.nombreComercial || "Empresa"}`,
        correo: selected.correo || "",
        telefono: selected.telefono || ""
      };
    });
  };

  const save = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");

      if (!form.empresaId) throw new Error("Selecciona una empresa.");
      if (!form.nombreCompleto.trim()) throw new Error("El nombre completo es obligatorio.");
      if (!form.correo.trim()) throw new Error("El correo es obligatorio.");

      if (editing) {
        await actualizarPerfilUsuario(editing.id, {
          empresaId: form.empresaId,
          nombreCompleto: form.nombreCompleto.trim(),
          correo: form.correo.trim().toLowerCase(),
          telefono: form.telefono.trim(),
          estado: Boolean(form.estado),
          eliminado: false
        });
        await registrarAuditoria({
          empresaId: null,
          usuarioId: usuario?.uid,
          usuarioNombre: usuario?.nombreCompleto || usuario?.correo || "",
          accion: "ACTUALIZAR",
          modulo: "usuarios",
          entidad: "administrador",
          entidadId: editing.id,
          detalle: `Actualizó al administrador ${form.nombreCompleto.trim()}`
        });
      } else {
        const uid = await provisionarUsuario({ ...form, tipoUsuario: "ADMIN" });
        await registrarAuditoria({
          empresaId: null,
          usuarioId: usuario?.uid,
          usuarioNombre: usuario?.nombreCompleto || usuario?.correo || "",
          accion: "CREAR",
          modulo: "usuarios",
          entidad: "administrador",
          entidadId: uid,
          detalle: `Creó administrador para ${companyName(form.empresaId)}`
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
    if (row.eliminado === true) return;
    const next = row.estado !== true;
    await actualizarPerfilUsuario(row.id, { estado: next });
    await registrarAuditoria({
      empresaId: null,
      usuarioId: usuario?.uid,
      usuarioNombre: usuario?.nombreCompleto || usuario?.correo || "",
      accion: "CAMBIAR_ESTADO",
      modulo: "usuarios",
      entidad: "administrador",
      entidadId: row.id,
      detalle: `${row.nombreCompleto}: ${next ? "ACTIVO" : "INACTIVO"}`
    });
  };

  const remove = async (row) => {
    if (
      !window.confirm(
        `¿Retirar al administrador ${row.nombreCompleto}? Se bloqueará su acceso a la aplicación y se conservará el registro para auditoría.`
      )
    ) {
      return;
    }

    await actualizarPerfilUsuario(row.id, {
      estado: false,
      eliminado: true,
      eliminadoPor: usuario?.uid || null,
      eliminadoMotivo: "Retirado por SUPER_ADMIN"
    });

    await registrarAuditoria({
      empresaId: null,
      usuarioId: usuario?.uid,
      usuarioNombre: usuario?.nombreCompleto || usuario?.correo || "",
      accion: "RETIRAR_ACCESO",
      modulo: "usuarios",
      entidad: "administrador",
      entidadId: row.id,
      detalle: `Retiró el acceso de ${row.nombreCompleto}`
    });
  };

  const selectedCompany = company(form.empresaId);

  return (
    <div className="module-page">
      <div className="module-page-header">
        <div>
          <span className="eyebrow">SUPER ADMIN · EMPRESAS</span>
          <h1>Administradores de empresa</h1>
          <p>Crea y controla cuentas ADMIN. Los datos de la empresa se sugieren automáticamente y pueden editarse antes de guardar.</p>
        </div>
        <button className="primary-action" onClick={newAdmin}>
          <UserPlus size={17} /> Nuevo administrador
        </button>
      </div>

      <AdvancedFilterBar
        search={search}
        onSearch={setSearch}
        status={status}
        onStatus={setStatus}
        statusOptions={[
          { value: "TODOS", label: "Todos" },
          { value: "ACTIVO", label: "Activos" },
          { value: "INACTIVO", label: "Desactivados" },
          { value: "ELIMINADO", label: "Retirados" }
        ]}
        filters={[
          {
            key: "empresa",
            label: "Todas las empresas",
            value: empresaFilter,
            onChange: setEmpresaFilter,
            options: empresas.map((empresa) => ({ value: empresa.id, label: empresa.nombreComercial }))
          }
        ]}
        onClear={() => {
          setSearch("");
          setStatus("TODOS");
          setEmpresaFilter("TODOS");
        }}
      />

      <section className="data-card glass-3d">
        <div className="table-scroll">
          <table className="modern-table">
            <thead>
              <tr>
                <th>ADMINISTRADOR</th>
                <th>EMPRESA</th>
                <th>CORREO</th>
                <th>VERIFICACIÓN</th>
                <th>ESTADO</th>
                <th>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const visualStatus = row.eliminado === true ? "RETIRADO" : row.estado === true ? "ACTIVO" : "INACTIVO";
                return (
                  <tr key={row.id}>
                    <td><strong>{row.nombreCompleto}</strong><small className="table-sub">{row.telefono || "Sin teléfono"}</small></td>
                    <td>{companyName(row.empresaId)}</td>
                    <td>{row.correo}</td>
                    <td><span className={`status-pill ${row.correoVerificado ? "active" : "warning"}`}>{row.correoVerificado ? "VERIFICADO" : "PENDIENTE"}</span></td>
                    <td><span className={`status-pill ${visualStatus === "ACTIVO" ? "active" : "inactive"}`}>{visualStatus}</span></td>
                    <td>
                      <div className="row-actions">
                        <button title="Ver detalles" onClick={() => setDetail(row)}><Eye size={16} /></button>
                        <button title="Editar" onClick={() => edit(row)} disabled={row.eliminado === true}><Pencil size={16} /></button>
                        <button title="Activar/desactivar" onClick={() => toggle(row)} disabled={row.eliminado === true}><Power size={16} /></button>
                        <button title="Retirar acceso" className="danger" onClick={() => remove(row)} disabled={row.eliminado === true}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!filtered.length && <div className="empty-state">No hay administradores con esos filtros.</div>}
        </div>
      </section>

      <AnimatePresence>
        {detail && (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => setDetail(null)}>
            <motion.div className="modal-card glass-3d" initial={{ opacity: 0, scale: 0.96, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} onMouseDown={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <div><span className="eyebrow">DETALLE</span><h2>{detail.nombreCompleto}</h2></div>
                <button onClick={() => setDetail(null)}><X size={18} /></button>
              </div>
              <div className="detail-grid-v4">
                <div><span>Empresa</span><strong>{companyName(detail.empresaId)}</strong></div>
                <div><span>Tipo</span><strong>{detail.tipoUsuario || "ADMIN"}</strong></div>
                <div><span>Correo</span><strong>{detail.correo || "-"}</strong></div>
                <div><span>Teléfono</span><strong>{detail.telefono || "-"}</strong></div>
                <div><span>Correo verificado</span><strong>{detail.correoVerificado ? "Sí" : "Pendiente"}</strong></div>
                <div><span>Estado</span><strong>{detail.eliminado ? "RETIRADO" : detail.estado ? "ACTIVO" : "INACTIVO"}</strong></div>
              </div>
              <div className="modal-actions"><button className="secondary-action" onClick={() => setDetail(null)}>Cerrar</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => setOpen(false)}>
            <motion.div className="modal-card glass-3d" initial={{ opacity: 0, scale: 0.94, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} onMouseDown={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <div><span className="eyebrow">{editing ? "EDITAR" : "CREAR"}</span><h2>{editing ? "Editar administrador" : "Nuevo administrador"}</h2></div>
                <button onClick={() => setOpen(false)}><X size={18} /></button>
              </div>

              <form className="smart-form" onSubmit={save}>
                <label className="field-block">
                  <span>Empresa *</span>
                  <select value={form.empresaId} onChange={(e) => handleCompanyChange(e.target.value)}>
                    <option value="">Seleccionar empresa</option>
                    {empresas.filter((empresa) => empresa.estado === "ACTIVA").map((empresa) => (
                      <option key={empresa.id} value={empresa.id}>{empresa.nombreComercial}</option>
                    ))}
                  </select>
                </label>

                <label className="field-block">
                  <span>Nombre completo *</span>
                  <input value={form.nombreCompleto} onChange={(e) => setForm({ ...form, nombreCompleto: e.target.value })} />
                </label>

                {selectedCompany && !editing && (
                  <div className="field-span-2 company-autofill-card">
                    <strong>Datos sugeridos desde {selectedCompany.nombreComercial}</strong>
                    <span>Correo: {selectedCompany.correo || "sin correo registrado"}</span>
                    <span>Teléfono: {selectedCompany.telefono || "sin teléfono registrado"}</span>
                    <small>Puedes corregirlos antes de crear la cuenta.</small>
                  </div>
                )}

                <label className="field-block">
                  <span>Correo *</span>
                  <input type="email" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} />
                </label>

                <label className="field-block">
                  <span>Teléfono</span>
                  <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
                </label>

                {!editing && (
                  <>
                    <label className="field-block field-span-2">
                      <span>Contraseña temporal segura *</span>
                      <div className="password-input-wrap-v4">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={form.password}
                          onChange={(e) => setForm({ ...form, password: e.target.value })}
                          autoComplete="new-password"
                        />
                        <button type="button" className="password-eye-v4" onClick={() => setShowPassword((value) => !value)} title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </label>
                    <div className="field-span-2"><PasswordStrength value={form.password} /></div>
                  </>
                )}

                {editing && (
                  <label className="toggle-field field-span-2">
                    <input type="checkbox" checked={form.estado === true} onChange={(e) => setForm({ ...form, estado: e.target.checked })} />
                    <span>Cuenta activa</span>
                  </label>
                )}

                {error && <div className="form-error field-span-2">{error}</div>}

                <div className="modal-actions field-span-2">
                  <button type="button" className="secondary-action" onClick={() => setOpen(false)}>Cancelar</button>
                  <button className="primary-action" disabled={saving}><ShieldCheck size={16} />{saving ? "Guardando…" : "Guardar"}</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
