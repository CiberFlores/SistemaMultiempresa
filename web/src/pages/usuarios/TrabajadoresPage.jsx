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
  UserRound,
  X
} from "lucide-react";

import {
  AnimatePresence,
  motion
} from "framer-motion";

import useAuth from "../../hooks/useAuth";

import {
  actualizarTrabajador,
  cambiarEstadoTrabajador,
  crearTrabajador,
  suscribirTrabajadores
} from "../../services/trabajadorService";

import {
  suscribirRolesEmpresa
} from "../../services/rolEmpresaService";

const formularioInicial = {
  uid: "",
  nombreCompleto: "",
  correo: "",
  telefono: "",
  rolId: ""
};

function TrabajadoresPage() {
  const {
    usuario
  } = useAuth();

  const [
    trabajadores,
    setTrabajadores
  ] = useState([]);

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
    trabajadorEditando,
    setTrabajadorEditando
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

    const cancelarTrabajadores =
      suscribirTrabajadores(
        usuario.empresaId,

        (datos) => {
          setTrabajadores(datos);
          setCargando(false);
        },

        console.error
      );

    const cancelarRoles =
      suscribirRolesEmpresa(
        usuario.empresaId,
        setRoles,
        console.error
      );

    return () => {
      cancelarTrabajadores();
      cancelarRoles();
    };
  }, [usuario?.empresaId]);

  const abrirNuevo = () => {
    setTrabajadorEditando(null);
    setFormulario(formularioInicial);
    setError("");
    setMostrarModal(true);
  };

  const abrirEditar = (
    trabajador
  ) => {
    setTrabajadorEditando(
      trabajador
    );

    setFormulario({
      uid:
        trabajador.id,

      nombreCompleto:
        trabajador.nombreCompleto ||
        "",

      correo:
        trabajador.correo ||
        "",

      telefono:
        trabajador.telefono ||
        "",

      rolId:
        trabajador.rolId ||
        ""
    });

    setError("");
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    if (guardando) return;

    setMostrarModal(false);
    setTrabajadorEditando(null);
    setFormulario(formularioInicial);
    setError("");
  };

  const guardarTrabajador =
    async (evento) => {
      evento.preventDefault();

      if (
        !formulario.nombreCompleto.trim()
      ) {
        setError(
          "El nombre es obligatorio."
        );

        return;
      }

      if (
        !formulario.correo.trim()
      ) {
        setError(
          "El correo es obligatorio."
        );

        return;
      }

      try {
        setGuardando(true);
        setError("");

        if (
          trabajadorEditando
        ) {
          await actualizarTrabajador(
            trabajadorEditando.id,
            formulario
          );
        } else {
          await crearTrabajador(
            formulario.uid,
            usuario.empresaId,
            formulario
          );
        }

        setMostrarModal(false);
        setTrabajadorEditando(null);
        setFormulario(formularioInicial);
      } catch (error) {
        console.error(error);

        setError(
          error.message ||
          "No se pudo guardar el trabajador."
        );
      } finally {
        setGuardando(false);
      }
    };

  const cambiarEstado =
    async (trabajador) => {
      const nuevoEstado =
        !trabajador.estado;

      const confirmar =
        window.confirm(
          `¿Deseas ${
            nuevoEstado
              ? "activar"
              : "desactivar"
          } a "${trabajador.nombreCompleto}"?`
        );

      if (!confirmar) return;

      try {
        await cambiarEstadoTrabajador(
          trabajador.id,
          nuevoEstado
        );
      } catch (error) {
        console.error(error);

        alert(
          "No se pudo modificar el trabajador."
        );
      }
    };

  const nombreRol = (
    rolId
  ) =>
    roles.find(
      (rol) =>
        rol.id === rolId
    )?.nombre ||
    "Sin rol";

  const filtrados =
    trabajadores.filter(
      (trabajador) => {
        const texto =
          busqueda.toLowerCase();

        return (
          trabajador.nombreCompleto
            ?.toLowerCase()
            .includes(texto) ||
          trabajador.correo
            ?.toLowerCase()
            .includes(texto) ||
          nombreRol(
            trabajador.rolId
          )
            .toLowerCase()
            .includes(texto)
        );
      }
    );

  const activos =
    trabajadores.filter(
      (trabajador) =>
        trabajador.estado === true
    ).length;

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1>
            Trabajadores
          </h1>

          <p>
            Gestiona el personal,
            roles y acceso al sistema.
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
          Nuevo trabajador
        </motion.button>
      </div>

      <div className="admin-info-banner">
        Para que un trabajador pueda iniciar
        sesión, primero crea su usuario en
        Firebase Authentication y copia aquí
        su UID. Más adelante automatizaremos
        este proceso con Firebase Admin SDK.
      </div>

      <section className="admin-inventory-metrics">
        <article>
          <UserRound size={21} />

          <div>
            <span>Total</span>
            <strong>
              {trabajadores.length}
            </strong>
          </div>
        </article>

        <article>
          <CircleCheck size={21} />

          <div>
            <span>Activos</span>
            <strong>{activos}</strong>
          </div>
        </article>

        <article
          className={
            trabajadores.length -
                activos >
              0
              ? "warning"
              : ""
          }
        >
          <Power size={21} />

          <div>
            <span>Inactivos</span>

            <strong>
              {trabajadores.length -
                activos}
            </strong>
          </div>
        </article>
      </section>

      <section className="admin-card">
        <div className="admin-toolbar">
          <div className="admin-search">
            <Search size={18} />

            <input
              placeholder="Buscar trabajador..."
              value={busqueda}
              onChange={(evento) =>
                setBusqueda(
                  evento.target.value
                )
              }
            />
          </div>

          <span>
            {filtrados.length} resultado(s)
          </span>
        </div>

        {cargando ? (
          <div className="admin-loading-box">
            <UserRound size={28} />

            <span>
              Cargando trabajadores...
            </span>
          </div>
        ) : filtrados.length === 0 ? (
          <div className="admin-empty admin-empty-column">
            <UserRound size={42} />

            <strong>
              No existen trabajadores
            </strong>

            <span>
              Registra el primer trabajador
              de la empresa.
            </span>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>TRABAJADOR</th>
                  <th>CORREO</th>
                  <th>TELÉFONO</th>
                  <th>ROL</th>
                  <th>ESTADO</th>
                  <th>ACCIONES</th>
                </tr>
              </thead>

              <tbody>
                {filtrados.map(
                  (trabajador) => (
                    <tr
                      key={
                        trabajador.id
                      }
                    >
                      <td>
                        <div className="admin-product-cell">
                          <div className="admin-product-image">
                            <UserRound
                              size={18}
                            />
                          </div>

                          <div>
                            <strong>
                              {
                                trabajador.nombreCompleto
                              }
                            </strong>

                            <small>
                              {trabajador.id}
                            </small>
                          </div>
                        </div>
                      </td>

                      <td>
                        {trabajador.correo}
                      </td>

                      <td>
                        {trabajador.telefono ||
                          "-"}
                      </td>

                      <td>
                        <span className="admin-permission-count">
                          {nombreRol(
                            trabajador.rolId
                          )}
                        </span>
                      </td>

                      <td>
                        <span
                          className={
                            trabajador.estado
                              ? "admin-badge active"
                              : "admin-badge inactive"
                          }
                        >
                          {trabajador.estado
                            ? "ACTIVO"
                            : "INACTIVO"}
                        </span>
                      </td>

                      <td>
                        <div className="admin-actions">
                          <button
                            onClick={() =>
                              abrirEditar(
                                trabajador
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
                                trabajador
                              )
                            }
                          >
                            {trabajador.estado ? (
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
              className="admin-modal"
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
                    {trabajadorEditando
                      ? "Editar trabajador"
                      : "Nuevo trabajador"}
                  </h2>

                  <p>
                    Configura sus datos y rol.
                  </p>
                </div>

                <button
                  onClick={cerrarModal}
                >
                  <X size={20} />
                </button>
              </div>

              <form
                onSubmit={
                  guardarTrabajador
                }
              >
                <div className="admin-form-grid">
                  {!trabajadorEditando && (
                    <div className="admin-form-group full">
                      <label>
                        UID Firebase Authentication *
                      </label>

                      <input
                        value={
                          formulario.uid
                        }
                        onChange={(evento) =>
                          setFormulario(
                            (anterior) => ({
                              ...anterior,

                              uid:
                                evento.target
                                  .value
                            })
                          )
                        }
                        placeholder="UID completo"
                        required
                      />
                    </div>
                  )}

                  <div className="admin-form-group">
                    <label>
                      Nombre completo *
                    </label>

                    <input
                      value={
                        formulario.nombreCompleto
                      }
                      onChange={(evento) =>
                        setFormulario(
                          (anterior) => ({
                            ...anterior,

                            nombreCompleto:
                              evento.target
                                .value
                          })
                        )
                      }
                      required
                    />
                  </div>

                  <div className="admin-form-group">
                    <label>
                      Correo *
                    </label>

                    <input
                      type="email"
                      value={
                        formulario.correo
                      }
                      onChange={(evento) =>
                        setFormulario(
                          (anterior) => ({
                            ...anterior,

                            correo:
                              evento.target
                                .value
                          })
                        )
                      }
                      required
                    />
                  </div>

                  <div className="admin-form-group">
                    <label>
                      Teléfono
                    </label>

                    <input
                      value={
                        formulario.telefono
                      }
                      onChange={(evento) =>
                        setFormulario(
                          (anterior) => ({
                            ...anterior,

                            telefono:
                              evento.target
                                .value
                          })
                        )
                      }
                    />
                  </div>

                  <div className="admin-form-group">
                    <label>
                      Rol
                    </label>

                    <select
                      value={
                        formulario.rolId
                      }
                      onChange={(evento) =>
                        setFormulario(
                          (anterior) => ({
                            ...anterior,

                            rolId:
                              evento.target
                                .value
                          })
                        )
                      }
                    >
                      <option value="">
                        Sin rol
                      </option>

                      {roles
                        .filter(
                          (rol) =>
                            rol.estado ===
                            "ACTIVO"
                        )
                        .map(
                          (rol) => (
                            <option
                              key={
                                rol.id
                              }
                              value={
                                rol.id
                              }
                            >
                              {rol.nombre}
                            </option>
                          )
                        )}
                    </select>
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
                      : trabajadorEditando
                        ? "Guardar cambios"
                        : "Crear trabajador"}
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

export default TrabajadoresPage;