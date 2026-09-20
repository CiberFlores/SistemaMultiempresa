import {
  useEffect,
  useState
} from "react";

import {
  BadgeDollarSign,
  CircleCheck,
  Pencil,
  Plus,
  Power,
  Search,
  X
} from "lucide-react";

import {
  AnimatePresence,
  motion
} from "framer-motion";

import {
  actualizarPlan,
  cambiarEstadoPlan,
  crearPlan,
  suscribirPlanes
} from "../../services/planService";

import {
  suscribirModulos
} from "../../services/moduloService";

const formularioInicial = {
  nombre: "",
  descripcion: "",
  precioMensual: "",
  limiteUsuarios: "5",
  limiteSucursales: "1",
  modulos: []
};

function PlanesPage() {
  const [planes, setPlanes] =
    useState([]);

  const [modulos, setModulos] =
    useState([]);

  const [busqueda, setBusqueda] =
    useState("");

  const [
    mostrarModal,
    setMostrarModal
  ] = useState(false);

  const [
    planEditando,
    setPlanEditando
  ] = useState(null);

  const [
    formulario,
    setFormulario
  ] = useState(formularioInicial);

  const [
    cargando,
    setCargando
  ] = useState(true);

  const [
    guardando,
    setGuardando
  ] = useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const cancelarPlanes =
      suscribirPlanes(
        (datos) => {
          setPlanes(datos);
          setCargando(false);
        },
        (error) => {
          console.error(error);
          setCargando(false);
        }
      );

    const cancelarModulos =
      suscribirModulos(
        setModulos,
        console.error
      );

    return () => {
      cancelarPlanes();
      cancelarModulos();
    };
  }, []);

  const manejarCambio = (e) => {
    const {
      name,
      value
    } = e.target;

    setFormulario((anterior) => ({
      ...anterior,
      [name]: value
    }));
  };

  const alternarModulo = (
    moduloId
  ) => {
    setFormulario(
      (anterior) => {
        const existe =
          anterior.modulos.includes(
            moduloId
          );

        return {
          ...anterior,

          modulos: existe
            ? anterior.modulos.filter(
                (id) =>
                  id !== moduloId
              )
            : [
                ...anterior.modulos,
                moduloId
              ]
        };
      }
    );
  };

  const abrirNuevo = () => {
    setPlanEditando(null);

    setFormulario(
      formularioInicial
    );

    setError("");

    setMostrarModal(true);
  };

  const abrirEditar = (plan) => {
    setPlanEditando(plan);

    setFormulario({
      nombre:
        plan.nombre || "",

      descripcion:
        plan.descripcion || "",

      precioMensual:
        String(
          plan.precioMensual ?? 0
        ),

      limiteUsuarios:
        String(
          plan.limiteUsuarios ?? 1
        ),

      limiteSucursales:
        String(
          plan.limiteSucursales ?? 1
        ),

      modulos:
        plan.modulos || []
    });

    setError("");

    setMostrarModal(true);
  };

  const cerrarModal = () => {
    if (guardando) {
      return;
    }

    setMostrarModal(false);

    setPlanEditando(null);

    setFormulario(
      formularioInicial
    );

    setError("");
  };

  const guardar = async (e) => {
    e.preventDefault();

    setError("");

    if (
      !formulario.nombre.trim()
    ) {
      setError(
        "El nombre del plan es obligatorio."
      );

      return;
    }

    if (
      Number(
        formulario.limiteUsuarios
      ) < 1
    ) {
      setError(
        "El plan debe permitir al menos un usuario."
      );

      return;
    }

    if (
      Number(
        formulario.limiteSucursales
      ) < 1
    ) {
      setError(
        "El plan debe permitir al menos una sucursal."
      );

      return;
    }

    try {
      setGuardando(true);

      if (planEditando) {
        await actualizarPlan(
          planEditando.id,
          formulario
        );
      } else {
        await crearPlan(
          formulario
        );
      }

      setMostrarModal(false);

      setPlanEditando(null);

      setFormulario(
        formularioInicial
      );
    } catch (error) {
      console.error(error);

      setError(
        error.message ||
          "No se pudo guardar el plan."
      );
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado =
    async (plan) => {
      const nuevoEstado =
        !plan.activo;

      const accion =
        nuevoEstado
          ? "activar"
          : "desactivar";

      const confirmar =
        window.confirm(
          `¿Deseas ${accion} el plan "${plan.nombre}"?`
        );

      if (!confirmar) {
        return;
      }

      try {
        await cambiarEstadoPlan(
          plan.id,
          nuevoEstado
        );
      } catch (error) {
        console.error(error);

        alert(
          "No se pudo modificar el estado del plan."
        );
      }
    };

  const planesFiltrados =
    planes.filter((plan) => {
      const texto =
        busqueda.toLowerCase();

      return (
        plan.nombre
          ?.toLowerCase()
          .includes(texto) ||

        plan.descripcion
          ?.toLowerCase()
          .includes(texto)
      );
    });

  const modulosActivos =
    modulos.filter(
      (modulo) =>
        modulo.activo === true
    );

  const nombreModulo = (
    moduloId
  ) => {
    return (
      modulos.find(
        (modulo) =>
          modulo.id === moduloId
      )?.nombre || "Módulo"
    );
  };

  return (
    <div>
      <div className="sa-page-header">
        <div>
          <h1>
            Planes
          </h1>

          <p>
            Configura precios,
            límites y funcionalidades
            disponibles para las empresas.
          </p>
        </div>

        <button
          className="sa-primary-button"
          onClick={abrirNuevo}
        >
          <Plus size={17} />

          Nuevo plan
        </button>
      </div>

      <section className="sa-plan-summary">
        <article className="sa-plan-summary-card">
          <BadgeDollarSign
            size={22}
          />

          <div>
            <span>
              Planes registrados
            </span>

            <strong>
              {planes.length}
            </strong>
          </div>
        </article>

        <article className="sa-plan-summary-card">
          <CircleCheck
            size={22}
          />

          <div>
            <span>
              Planes activos
            </span>

            <strong>
              {
                planes.filter(
                  (plan) =>
                    plan.activo
                ).length
              }
            </strong>
          </div>
        </article>
      </section>

      <section className="sa-panel">
        <div className="sa-table-toolbar">
          <div className="sa-table-search">
            <Search size={17} />

            <input
              placeholder="Buscar plan..."
              value={busqueda}
              onChange={(e) =>
                setBusqueda(
                  e.target.value
                )
              }
            />
          </div>

          <span>
            {planesFiltrados.length}
            {" "}
            resultado(s)
          </span>
        </div>

        {cargando ? (
          <div className="sa-empty">
            Cargando planes...
          </div>
        ) : planesFiltrados.length === 0 ? (
          <div className="sa-empty">
            <BadgeDollarSign
              size={42}
            />

            <strong>
              No existen planes
            </strong>

            <span>
              Registra el primer plan
              comercial.
            </span>
          </div>
        ) : (
          <div className="sa-table-container">
            <table className="sa-table">
              <thead>
                <tr>
                  <th>PLAN</th>
                  <th>PRECIO</th>
                  <th>USUARIOS</th>
                  <th>SUCURSALES</th>
                  <th>MÓDULOS</th>
                  <th>ESTADO</th>
                  <th>ACCIONES</th>
                </tr>
              </thead>

              <tbody>
                {planesFiltrados.map(
                  (plan) => (
                    <tr key={plan.id}>
                      <td>
                        <strong>
                          {plan.nombre}
                        </strong>

                        <small className="sa-table-description">
                          {plan.descripcion ||
                            "Sin descripción"}
                        </small>
                      </td>

                      <td>
                        <span className="sa-price">
                          Bs{" "}
                          {Number(
                            plan.precioMensual ||
                              0
                          ).toFixed(2)}
                        </span>
                      </td>

                      <td>
                        {
                          plan.limiteUsuarios
                        }
                      </td>

                      <td>
                        {
                          plan.limiteSucursales
                        }
                      </td>

                      <td>
                        <div className="sa-mini-modules">
                          {(
                            plan.modulos || []
                          )
                            .slice(0, 3)
                            .map(
                              (moduloId) => (
                                <span
                                  key={
                                    moduloId
                                  }
                                >
                                  {nombreModulo(
                                    moduloId
                                  )}
                                </span>
                              )
                            )}

                          {(
                            plan.modulos || []
                          ).length > 3 && (
                            <span>
                              +
                              {plan.modulos
                                .length - 3}
                            </span>
                          )}
                        </div>
                      </td>

                      <td>
                        <span
                          className={
                            plan.activo
                              ? "sa-badge active"
                              : "sa-badge suspended"
                          }
                        >
                          {plan.activo
                            ? "ACTIVO"
                            : "INACTIVO"}
                        </span>
                      </td>

                      <td>
                        <div className="sa-actions">
                          <button
                            title="Editar"
                            onClick={() =>
                              abrirEditar(
                                plan
                              )
                            }
                          >
                            <Pencil
                              size={16}
                            />
                          </button>

                          <button
                            title={
                              plan.activo
                                ? "Desactivar"
                                : "Activar"
                            }
                            onClick={() =>
                              cambiarEstado(
                                plan
                              )
                            }
                          >
                            {plan.activo ? (
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
            className="sa-modal-overlay"
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
              className="sa-modal"
              initial={{
                opacity: 0,
                scale: 0.95,
                y: 20
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0
              }}
              exit={{
                opacity: 0,
                scale: 0.95,
                y: 20
              }}
            >
              <div className="sa-modal-header">
                <div>
                  <h2>
                    {planEditando
                      ? "Editar plan"
                      : "Nuevo plan"}
                  </h2>

                  <p>
                    Define las características
                    comerciales del plan.
                  </p>
                </div>

                <button
                  onClick={
                    cerrarModal
                  }
                >
                  <X size={20} />
                </button>
              </div>

              <form
                onSubmit={guardar}
              >
                <div className="sa-form-grid">
                  <div className="sa-form-group">
                    <label>
                      Nombre *
                    </label>

                    <input
                      name="nombre"
                      value={
                        formulario.nombre
                      }
                      onChange={
                        manejarCambio
                      }
                      placeholder="Profesional"
                      required
                    />
                  </div>

                  <div className="sa-form-group">
                    <label>
                      Precio mensual (Bs)
                    </label>

                    <input
                      name="precioMensual"
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        formulario.precioMensual
                      }
                      onChange={
                        manejarCambio
                      }
                    />
                  </div>

                  <div className="sa-form-group">
                    <label>
                      Límite de usuarios
                    </label>

                    <input
                      name="limiteUsuarios"
                      type="number"
                      min="1"
                      value={
                        formulario.limiteUsuarios
                      }
                      onChange={
                        manejarCambio
                      }
                    />
                  </div>

                  <div className="sa-form-group">
                    <label>
                      Límite de sucursales
                    </label>

                    <input
                      name="limiteSucursales"
                      type="number"
                      min="1"
                      value={
                        formulario.limiteSucursales
                      }
                      onChange={
                        manejarCambio
                      }
                    />
                  </div>

                  <div className="sa-form-group full">
                    <label>
                      Descripción
                    </label>

                    <textarea
                      name="descripcion"
                      value={
                        formulario.descripcion
                      }
                      onChange={
                        manejarCambio
                      }
                      rows={4}
                    />
                  </div>

                  <div className="sa-form-group full">
                    <label>
                      Módulos incluidos
                    </label>

                    <div className="sa-module-grid">
                      {modulosActivos.map(
                        (modulo) => {
                          const seleccionado =
                            formulario.modulos.includes(
                              modulo.id
                            );

                          return (
                            <label
                              key={
                                modulo.id
                              }
                              className={
                                seleccionado
                                  ? "sa-module-option selected"
                                  : "sa-module-option"
                              }
                            >
                              <input
                                type="checkbox"
                                checked={
                                  seleccionado
                                }
                                onChange={() =>
                                  alternarModulo(
                                    modulo.id
                                  )
                                }
                              />

                              <div>
                                <strong>
                                  {
                                    modulo.nombre
                                  }
                                </strong>

                                <small>
                                  {
                                    modulo.codigo
                                  }
                                </small>
                              </div>
                            </label>
                          );
                        }
                      )}
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="sa-form-error">
                    {error}
                  </div>
                )}

                <div className="sa-modal-footer">
                  <button
                    type="button"
                    className="sa-secondary-button"
                    onClick={
                      cerrarModal
                    }
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className="sa-primary-button"
                    disabled={
                      guardando
                    }
                  >
                    {guardando
                      ? "Guardando..."
                      : planEditando
                        ? "Guardar cambios"
                        : "Crear plan"}
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

export default PlanesPage;