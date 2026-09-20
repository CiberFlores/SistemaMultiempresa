import {
  useEffect,
  useState
} from "react";

import {
  CircleCheck,
  Pencil,
  Plus,
  Power,
  Search,
  ShieldCheck,
  X
} from "lucide-react";

import {
  AnimatePresence,
  motion
} from "framer-motion";

import useAuth from "../../hooks/useAuth";

import {
  PERMISOS_DISPONIBLES,
  actualizarRolEmpresa,
  cambiarEstadoRolEmpresa,
  crearRolEmpresa,
  suscribirRolesEmpresa
} from "../../services/rolEmpresaService";

const formularioInicial = {
  nombre: "",
  descripcion: "",
  permisos: []
};

function RolesEmpresaPage() {
  const {
    usuario
  } = useAuth();

  const [
    roles,
    setRoles
  ] = useState([]);

  const [
    busqueda,
    setBusqueda
  ] = useState("");

  const [
    mostrarModal,
    setMostrarModal
  ] = useState(false);

  const [
    rolEditando,
    setRolEditando
  ] = useState(null);

  const [
    formulario,
    setFormulario
  ] = useState(
    formularioInicial
  );

  const [
    guardando,
    setGuardando
  ] = useState(false);

  const [
    cargando,
    setCargando
  ] = useState(true);

  const [
    error,
    setError
  ] = useState("");

  useEffect(() => {
    if (!usuario?.empresaId) {
      setCargando(false);
      return;
    }

    const cancelar =
      suscribirRolesEmpresa(
        usuario.empresaId,

        (datos) => {
          setRoles(datos);
          setCargando(false);
        },

        (error) => {
          console.error(error);
          setCargando(false);
        }
      );

    return () => cancelar();
  }, [usuario?.empresaId]);

  const abrirNuevo = () => {
    setRolEditando(null);
    setFormulario(formularioInicial);
    setError("");
    setMostrarModal(true);
  };

  const abrirEditar = (rol) => {
    setRolEditando(rol);

    setFormulario({
      nombre:
        rol.nombre || "",

      descripcion:
        rol.descripcion || "",

      permisos:
        rol.permisos || []
    });

    setError("");
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    if (guardando) return;

    setMostrarModal(false);
    setRolEditando(null);
    setFormulario(formularioInicial);
    setError("");
  };

  const alternarPermiso = (
    permisoId
  ) => {
    setFormulario(
      (anterior) => {
        const seleccionado =
          anterior.permisos.includes(
            permisoId
          );

        return {
          ...anterior,

          permisos:
            seleccionado
              ? anterior.permisos.filter(
                  (id) =>
                    id !==
                    permisoId
                )
              : [
                  ...anterior.permisos,
                  permisoId
                ]
        };
      }
    );
  };

  const seleccionarTodos = () => {
    setFormulario(
      (anterior) => ({
        ...anterior,

        permisos:
          PERMISOS_DISPONIBLES.map(
            (permiso) =>
              permiso.id
          )
      })
    );
  };

  const limpiarPermisos = () => {
    setFormulario(
      (anterior) => ({
        ...anterior,
        permisos: []
      })
    );
  };

  const guardarRol = async (
    evento
  ) => {
    evento.preventDefault();

    if (
      !formulario.nombre.trim()
    ) {
      setError(
        "El nombre del rol es obligatorio."
      );

      return;
    }

    try {
      setGuardando(true);
      setError("");

      if (rolEditando) {
        await actualizarRolEmpresa(
          rolEditando.id,
          formulario
        );
      } else {
        await crearRolEmpresa(
          usuario.empresaId,
          formulario
        );
      }

      setMostrarModal(false);
      setRolEditando(null);
      setFormulario(formularioInicial);
    } catch (error) {
      console.error(error);

      setError(
        error.message ||
        "No se pudo guardar el rol."
      );
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado =
    async (rol) => {
      const estado =
        rol.estado === "ACTIVO"
          ? "INACTIVO"
          : "ACTIVO";

      if (
        !window.confirm(
          `¿Cambiar "${rol.nombre}" a ${estado}?`
        )
      ) {
        return;
      }

      try {
        await cambiarEstadoRolEmpresa(
          rol.id,
          estado
        );
      } catch (error) {
        console.error(error);

        alert(
          "No se pudo cambiar el estado."
        );
      }
    };

  const filtrados =
    roles.filter((rol) => {
      const texto =
        busqueda.toLowerCase();

      return (
        rol.nombre
          ?.toLowerCase()
          .includes(texto) ||
        rol.descripcion
          ?.toLowerCase()
          .includes(texto)
      );
    });

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1>
            Roles y permisos
          </h1>

          <p>
            Define las funciones que
            podrá realizar cada trabajador.
          </p>
        </div>

        <motion.button
          className="admin-primary-button"
          onClick={abrirNuevo}
          whileHover={{
            scale: 1.03
          }}
          whileTap={{
            scale: 0.97
          }}
        >
          <Plus size={18} />
          Nuevo rol
        </motion.button>
      </div>

      <section className="admin-card">
        <div className="admin-toolbar">
          <div className="admin-search">
            <Search size={18} />

            <input
              placeholder="Buscar rol..."
              value={busqueda}
              onChange={(evento) =>
                setBusqueda(
                  evento.target.value
                )
              }
            />
          </div>

          <span>
            {roles.length} rol(es)
          </span>
        </div>

        {cargando ? (
          <div className="admin-loading-box">
            <ShieldCheck
              size={28}
            />

            <span>
              Cargando roles...
            </span>
          </div>
        ) : filtrados.length === 0 ? (
          <div className="admin-empty admin-empty-column">
            <ShieldCheck
              size={42}
            />

            <strong>
              No existen roles
            </strong>

            <span>
              Crea el primer rol operativo.
            </span>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ROL</th>
                  <th>DESCRIPCIÓN</th>
                  <th>PERMISOS</th>
                  <th>ESTADO</th>
                  <th>ACCIONES</th>
                </tr>
              </thead>

              <tbody>
                {filtrados.map(
                  (rol) => (
                    <tr key={rol.id}>
                      <td>
                        <strong>
                          {rol.nombre}
                        </strong>
                      </td>

                      <td>
                        {rol.descripcion ||
                          "-"}
                      </td>

                      <td>
                        <span className="admin-permission-count">
                          {(rol.permisos ||
                            []).length}
                          {" "}
                          permiso(s)
                        </span>
                      </td>

                      <td>
                        <span
                          className={
                            rol.estado ===
                            "ACTIVO"
                              ? "admin-badge active"
                              : "admin-badge inactive"
                          }
                        >
                          {rol.estado}
                        </span>
                      </td>

                      <td>
                        <div className="admin-actions">
                          <button
                            onClick={() =>
                              abrirEditar(
                                rol
                              )
                            }
                          >
                            <Pencil
                              size={16}
                            />
                          </button>

                          <button
                            onClick={() =>
                              cambiarEstado(
                                rol
                              )
                            }
                          >
                            {rol.estado ===
                            "ACTIVO" ? (
                              <Power
                                size={16}
                              />
                            ) : (
                              <CircleCheck
                                size={16}
                              />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <AnimatePresence>
        {mostrarModal && (
          <motion.div
            className="admin-modal-overlay"
            initial={{
              opacity: 0
            }}
            animate={{
              opacity: 1
            }}
            exit={{
              opacity: 0
            }}
          >
            <motion.div
              className="admin-modal admin-modal-wide"
              initial={{
                opacity: 0,
                y: 25,
                scale: 0.95
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1
              }}
            >
              <div className="admin-modal-header">
                <div>
                  <h2>
                    {rolEditando
                      ? "Editar rol"
                      : "Nuevo rol"}
                  </h2>

                  <p>
                    Configura permisos para
                    los trabajadores.
                  </p>
                </div>

                <button
                  onClick={cerrarModal}
                >
                  <X size={20} />
                </button>
              </div>

              <form
                onSubmit={guardarRol}
              >
                <div className="admin-form-grid">
                  <div className="admin-form-group full">
                    <label>
                      Nombre *
                    </label>

                    <input
                      value={
                        formulario.nombre
                      }
                      onChange={(evento) =>
                        setFormulario(
                          (anterior) => ({
                            ...anterior,

                            nombre:
                              evento.target
                                .value
                          })
                        )
                      }
                      required
                    />
                  </div>

                  <div className="admin-form-group full">
                    <label>
                      Descripción
                    </label>

                    <textarea
                      value={
                        formulario.descripcion
                      }
                      onChange={(evento) =>
                        setFormulario(
                          (anterior) => ({
                            ...anterior,

                            descripcion:
                              evento.target
                                .value
                          })
                        )
                      }
                    />
                  </div>

                  <div className="admin-form-group full">
                    <div className="admin-permission-toolbar">
                      <label>
                        Permisos
                      </label>

                      <div>
                        <button
                          type="button"
                          className="admin-mini-button"
                          onClick={
                            seleccionarTodos
                          }
                        >
                          Seleccionar todos
                        </button>

                        <button
                          type="button"
                          className="admin-mini-button"
                          onClick={
                            limpiarPermisos
                          }
                        >
                          Limpiar
                        </button>
                      </div>
                    </div>

                    <div className="admin-permissions-grid">
                      {PERMISOS_DISPONIBLES.map(
                        (permiso) => {
                          const seleccionado =
                            formulario.permisos.includes(
                              permiso.id
                            );

                          return (
                            <label
                              key={
                                permiso.id
                              }
                              className={
                                seleccionado
                                  ? "admin-permission-option selected"
                                  : "admin-permission-option"
                              }
                            >
                              <input
                                type="checkbox"
                                checked={
                                  seleccionado
                                }
                                onChange={() =>
                                  alternarPermiso(
                                    permiso.id
                                  )
                                }
                              />

                              <span>
                                {
                                  permiso.nombre
                                }
                              </span>
                            </label>
                          );
                        }
                      )}
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="admin-message error">
                    {error}
                  </div>
                )}

                <div className="admin-modal-footer">
                  <button
                    type="button"
                    className="admin-secondary-button"
                    onClick={cerrarModal}
                  >
                    Cancelar
                  </button>

                  <button
                    className="admin-primary-button"
                    disabled={guardando}
                  >
                    {guardando
                      ? "Guardando..."
                      : rolEditando
                        ? "Guardar cambios"
                        : "Crear rol"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default RolesEmpresaPage;