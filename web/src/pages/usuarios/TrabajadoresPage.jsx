import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CircleCheck, Pencil, Plus, Power, UserRound, X } from "lucide-react";

import useAuth from "../../hooks/useAuth";

import {
  suscribirTrabajadores,
  actualizarTrabajador,
  cambiarEstadoTrabajador
} from "../../services/trabajadorService";

import { suscribirRolesEmpresa } from "../../services/rolEmpresaService";
import { suscribirSucursales } from "../../services/sucursalService";
import { provisionarUsuario } from "../../services/userProvisionService";

import AdvancedFilterBar from "../../components/filters/AdvancedFilterBar";
import PasswordStrength from "../../components/common/PasswordStrength";

const initial = {
  nombreCompleto: "",
  correo: "",
  telefono: "",
  rolId: "",
  sucursales: [],
  password: ""
};

export default function TrabajadoresPage() {
  const { usuario } = useAuth();

  const [rows, setRows] = useState([]);
  const [roles, setRoles] = useState([]);
  const [sucursales, setSucursales] = useState([]);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("TODOS");
  const [roleFilter, setRoleFilter] = useState("TODOS");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initial);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [workersLoading, setWorkersLoading] = useState(true);

  const loading = usuario?.empresaId
    ? workersLoading
    : false;

  useEffect(() => {
    if (!usuario?.empresaId) return;

    const u1 = suscribirTrabajadores(
      usuario.empresaId,
      (datos) => {
        setRows(datos);
        setWorkersLoading(false);
      },
      console.error
    );

    const u2 = suscribirRolesEmpresa(
      usuario.empresaId,
      setRoles,
      console.error
    );

    const u3 = suscribirSucursales(
      usuario.empresaId,
      setSucursales,
      console.error
    );

    return () => {
      u1?.();
      u2?.();
      u3?.();
    };
  }, [usuario?.empresaId]);

  const roleName = (id) =>
    roles.find((r) => r.id === id)?.nombre ||
    "Sin rol";

  const sucursalName = (id) =>
    sucursales.find((s) => s.id === id)?.nombre ||
    "Sucursal";

  const sucursalesTexto = (ids = []) => {
    if (!Array.isArray(ids) || ids.length === 0) {
      return "Sin sucursal";
    }

    return ids
      .map(sucursalName)
      .join(", ");
  };

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const q = search.toLowerCase();

      const nombreRol =
        roles.find((rol) => rol.id === r.rolId)?.nombre ||
        "Sin rol";

      const nombresSucursales =
        Array.isArray(r.sucursales)
          ? r.sucursales
              .map(
                (id) =>
                  sucursales.find(
                    (sucursal) =>
                      sucursal.id === id
                  )?.nombre || "Sucursal"
              )
              .join(", ")
          : "";

      const match =
        !q ||
        [
          r.nombreCompleto,
          r.correo,
          r.telefono,
          nombreRol,
          nombresSucursales
        ].some((v) =>
          String(v || "")
            .toLowerCase()
            .includes(q)
        );

      const st =
        status === "TODOS" ||
        (
          status === "ACTIVO"
            ? r.estado === true
            : r.estado !== true
        );

      const ro =
        roleFilter === "TODOS" ||
        r.rolId === roleFilter;

      return match && st && ro;
    });
  }, [
    rows,
    search,
    status,
    roleFilter,
    roles,
    sucursales
  ]);

  const newRow = () => {
    setEditing(null);
    setForm(initial);
    setError("");
    setOpen(true);
  };

  const edit = (r) => {
    setEditing(r);

    setForm({
      nombreCompleto:
        r.nombreCompleto || "",

      correo:
        r.correo || "",

      telefono:
        r.telefono || "",

      rolId:
        r.rolId || "",

      sucursales:
        Array.isArray(r.sucursales)
          ? r.sucursales
          : [],

      password: ""
    });

    setError("");
    setOpen(true);
  };

  const cambiarSucursal = (sucursalId) => {
    setForm((actual) => {
      const seleccionadas =
        Array.isArray(actual.sucursales)
          ? actual.sucursales
          : [];

      const existe =
        seleccionadas.includes(sucursalId);

      return {
        ...actual,

        sucursales:
          existe
            ? seleccionadas.filter(
                (id) => id !== sucursalId
              )
            : [
                ...seleccionadas,
                sucursalId
              ]
      };
    });
  };

  const save = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");

      if (
        !form.nombreCompleto.trim() ||
        !form.correo.trim()
      ) {
        throw new Error(
          "Nombre y correo son obligatorios."
        );
      }

      if (editing) {
        await actualizarTrabajador(
          editing.id,
          form
        );
      } else {
        await provisionarUsuario({
          ...form,
          empresaId:
            usuario.empresaId,
          tipoUsuario:
            "TRABAJADOR"
        });
      }

      setOpen(false);
      setForm(initial);

    } catch (err) {
      setError(
        err.message ||
        "No se pudo guardar."
      );
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (r) => {
    const accion =
      r.estado === true
        ? "Desactivar"
        : "Activar";

    if (
      window.confirm(
        `¿${accion} a ${r.nombreCompleto}?`
      )
    ) {
      await cambiarEstadoTrabajador(
        r.id,
        r.estado !== true
      );
    }
  };

  return (
    <div className="module-page">

      <div className="module-page-header">

        <div>
          <span className="eyebrow">
            PERSONAL
          </span>

          <h1>
            Trabajadores
          </h1>

          <p>
            Cuentas TRABAJADOR con rol dinamico,
            sucursales asignadas, verificacion de
            correo y permisos por empresa.
          </p>
        </div>

        <button
          className="primary-action"
          onClick={newRow}
        >
          <Plus size={17} />
          Nuevo trabajador
        </button>

      </div>

      <AdvancedFilterBar
        search={search}
        onSearch={setSearch}

        status={status}
        onStatus={setStatus}

        statusOptions={[
          {
            value: "TODOS",
            label: "Todos"
          },
          {
            value: "ACTIVO",
            label: "Activos"
          },
          {
            value: "INACTIVO",
            label: "Inactivos"
          }
        ]}

        filters={[
          {
            key: "rol",
            label: "Todos los roles",
            value: roleFilter,
            onChange: setRoleFilter,

            options:
              roles.map((r) => ({
                value: r.id,
                label: r.nombre
              }))
          }
        ]}

        onClear={() => {
          setSearch("");
          setStatus("TODOS");
          setRoleFilter("TODOS");
        }}
      />

      <section className="admin-inventory-metrics">

        <article>
          <UserRound size={21} />

          <div>
            <span>Total</span>
            <strong>
              {rows.length}
            </strong>
          </div>
        </article>

        <article>
          <CircleCheck size={21} />

          <div>
            <span>Activos</span>

            <strong>
              {
                rows.filter(
                  (r) =>
                    r.estado === true
                ).length
              }
            </strong>
          </div>
        </article>

        <article>
          <CircleCheck size={21} />

          <div>
            <span>
              Correos verificados
            </span>

            <strong>
              {
                rows.filter(
                  (r) =>
                    r.correoVerificado === true
                ).length
              }
            </strong>
          </div>
        </article>

      </section>

      <section className="data-card glass-3d">

        {
          loading
            ? (
              <div className="empty-state">
                Cargando trabajadores…
              </div>
            )
            : (
              <div className="table-scroll">

                <table className="modern-table">

                  <thead>
                    <tr>
                      <th>TRABAJADOR</th>
                      <th>CORREO</th>
                      <th>ROL</th>
                      <th>SUCURSALES</th>
                      <th>VERIFICACION</th>
                      <th>ESTADO</th>
                      <th>ACCIONES</th>
                    </tr>
                  </thead>

                  <tbody>

                    {
                      filtered.map((r) => (

                        <tr key={r.id}>

                          <td>

                            <strong>
                              {r.nombreCompleto}
                            </strong>

                            <small className="table-sub">
                              {
                                r.telefono ||
                                "Sin telefono"
                              }
                            </small>

                          </td>

                          <td>
                            {r.correo}
                          </td>

                          <td>
                            {roleName(r.rolId)}
                          </td>

                          <td>
                            {
                              sucursalesTexto(
                                r.sucursales
                              )
                            }
                          </td>

                          <td>

                            <span
                              className={
                                `status-pill ${
                                  r.correoVerificado
                                    ? "active"
                                    : "warning"
                                }`
                              }
                            >
                              {
                                r.correoVerificado
                                  ? "VERIFICADO"
                                  : "PENDIENTE"
                              }
                            </span>

                          </td>

                          <td>

                            <span
                              className={
                                `status-pill ${
                                  r.estado === true
                                    ? "active"
                                    : "inactive"
                                }`
                              }
                            >
                              {
                                r.estado === true
                                  ? "ACTIVO"
                                  : "INACTIVO"
                              }
                            </span>

                          </td>

                          <td>

                            <div className="row-actions">

                              <button
                                onClick={() =>
                                  edit(r)
                                }
                              >
                                <Pencil size={16} />
                              </button>

                              <button
                                onClick={() =>
                                  toggle(r)
                                }
                              >
                                <Power size={16} />
                              </button>

                            </div>

                          </td>

                        </tr>

                      ))
                    }

                  </tbody>

                </table>

                {
                  !filtered.length &&
                  (
                    <div className="empty-state">
                      Sin trabajadores con esos filtros.
                    </div>
                  )
                }

              </div>
            )
        }

      </section>

      <AnimatePresence>

        {
          open &&
          (
            <motion.div
              className="modal-backdrop"

              initial={{
                opacity: 0
              }}

              animate={{
                opacity: 1
              }}

              exit={{
                opacity: 0
              }}

              onMouseDown={() =>
                setOpen(false)
              }
            >

              <motion.div
                className="modal-card glass-3d"

                initial={{
                  opacity: 0,
                  scale: 0.94,
                  y: 20
                }}

                animate={{
                  opacity: 1,
                  scale: 1,
                  y: 0
                }}

                onMouseDown={(e) =>
                  e.stopPropagation()
                }
              >

                <div className="modal-head">

                  <div>

                    <span className="eyebrow">
                      {
                        editing
                          ? "EDITAR"
                          : "CREAR"
                      }
                    </span>

                    <h2>
                      {
                        editing
                          ? "Editar trabajador"
                          : "Nuevo trabajador"
                      }
                    </h2>

                  </div>

                  <button
                    onClick={() =>
                      setOpen(false)
                    }
                  >
                    <X size={18} />
                  </button>

                </div>

                <form
                  className="smart-form"
                  onSubmit={save}
                >

                  <label className="field-block">

                    <span>
                      Nombre completo *
                    </span>

                    <input
                      value={
                        form.nombreCompleto
                      }

                      onChange={(e) =>
                        setForm({
                          ...form,
                          nombreCompleto:
                            e.target.value
                        })
                      }
                    />

                  </label>

                  <label className="field-block">

                    <span>
                      Correo *
                    </span>

                    <input
                      type="email"

                      value={
                        form.correo
                      }

                      onChange={(e) =>
                        setForm({
                          ...form,
                          correo:
                            e.target.value
                        })
                      }
                    />

                  </label>

                  <label className="field-block">

                    <span>
                      Telefono
                    </span>

                    <input
                      value={
                        form.telefono
                      }

                      onChange={(e) =>
                        setForm({
                          ...form,
                          telefono:
                            e.target.value
                        })
                      }
                    />

                  </label>

                  <label className="field-block">

                    <span>
                      Rol
                    </span>

                    <select
                      value={
                        form.rolId
                      }

                      onChange={(e) =>
                        setForm({
                          ...form,
                          rolId:
                            e.target.value
                        })
                      }
                    >

                      <option value="">
                        Sin rol
                      </option>

                      {
                        roles
                          .filter(
                            (r) =>
                              r.estado ===
                              "ACTIVO"
                          )
                          .map(
                            (r) => (
                              <option
                                key={r.id}
                                value={r.id}
                              >
                                {r.nombre}
                              </option>
                            )
                          )
                      }

                    </select>

                  </label>

                  <div className="field-block field-span-2">

  <span>
    Sucursales asignadas
  </span>

  <details className="sucursales-select">

    <summary>
      <span>
        {form.sucursales?.length > 0
          ? `${form.sucursales.length} sucursal(es) seleccionada(s)`
          : "Seleccionar sucursales"}
      </span>

      <span className="select-arrow">⌄</span>
    </summary>

    <div className="sucursales-options">

      {sucursales.length === 0 ? (

        <div className="sucursal-empty">
          No hay sucursales registradas
        </div>

      ) : (

        sucursales.map((sucursal) => {

          const seleccionada =
            form.sucursales?.includes(sucursal.id);

          return (

            <button
              key={sucursal.id}
              type="button"
              className={`sucursal-option ${
                seleccionada ? "selected" : ""
              }`}
              onClick={() =>
                cambiarSucursal(sucursal.id)
              }
            >

              <div className="sucursal-option-info">

                <strong>
                  {sucursal.nombre}
                </strong>

                {sucursal.direccion && (
                  <small>
                    {sucursal.direccion}
                  </small>
                )}

              </div>

              <span className="sucursal-check">
                {seleccionada ? "✓" : ""}
              </span>

            </button>

          );

        })

      )}

    </div>

  </details>

  {form.sucursales?.length > 0 && (

    <div className="sucursales-selected">

      {sucursales
        .filter((sucursal) =>
          form.sucursales.includes(sucursal.id)
        )
        .map((sucursal) => (

          <span
            key={sucursal.id}
            className="sucursal-chip"
          >

            {sucursal.nombre}

            <button
              type="button"
              onClick={() =>
                cambiarSucursal(sucursal.id)
              }
            >
              ×
            </button>

          </span>

        ))}

    </div>

  )}

</div>

                  {
                    !editing &&
                    (
                      <>

                        <label className="field-block field-span-2">

                          <span>
                            Contraseña temporal segura *
                          </span>

                          <input
                            type="password"

                            value={
                              form.password
                            }

                            onChange={(e) =>
                              setForm({
                                ...form,
                                password:
                                  e.target.value
                              })
                            }
                          />

                        </label>

                        <div className="field-span-2">

                          <PasswordStrength
                            value={
                              form.password
                            }
                          />

                        </div>

                      </>
                    )
                  }

                  {
                    error &&
                    (
                      <div className="form-error field-span-2">
                        {error}
                      </div>
                    )
                  }

                  <div className="modal-actions field-span-2">

                    <button
                      type="button"

                      className="secondary-action"

                      onClick={() =>
                        setOpen(false)
                      }
                    >
                      Cancelar
                    </button>

                    <button
                      className="primary-action"
                      disabled={saving}
                    >
                      {
                        saving
                          ? "Guardando…"
                          : "Guardar trabajador"
                      }
                    </button>

                  </div>

                </form>

              </motion.div>

            </motion.div>
          )
        }

      </AnimatePresence>

    </div>
  );
}