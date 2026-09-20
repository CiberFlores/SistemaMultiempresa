import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  CalendarDays,
  CircleCheck,
  KeyRound,
  Pencil,
  Plus,
  Power,
  Search,
  X,
  XCircle
} from "lucide-react";

import {
  AnimatePresence,
  motion
} from "framer-motion";

import {
  actualizarLicencia,
  cambiarEstadoLicencia,
  crearLicencia,
  obtenerCatalogosLicencia,
  suscribirLicencias
} from "../../services/licenciaService";

const fechaActual = () =>
  new Date()
    .toISOString()
    .split("T")[0];

const formularioInicial = {
  empresaId: "",
  planId: "",
  fechaInicio: fechaActual(),
  fechaFin: "",
  renovacionAutomatica: false,
  observaciones: ""
};

function convertirFechaInput(
  timestamp
) {
  if (!timestamp) {
    return "";
  }

  const fecha =
    timestamp.toDate
      ? timestamp.toDate()
      : new Date(timestamp);

  const año =
    fecha.getFullYear();

  const mes =
    String(
      fecha.getMonth() + 1
    ).padStart(2, "0");

  const dia =
    String(
      fecha.getDate()
    ).padStart(2, "0");

  return `${año}-${mes}-${dia}`;
}

function formatearFecha(
  timestamp
) {
  if (!timestamp) {
    return "Sin vencimiento";
  }

  const fecha =
    timestamp.toDate
      ? timestamp.toDate()
      : new Date(timestamp);

  return fecha.toLocaleDateString(
    "es-BO"
  );
}

function LicenciasPage() {
  const [
    licencias,
    setLicencias
  ] = useState([]);

  const [
    empresas,
    setEmpresas
  ] = useState([]);

  const [
    planes,
    setPlanes
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
    licenciaEditando,
    setLicenciaEditando
  ] = useState(null);

  const [
    formulario,
    setFormulario
  ] = useState(
    formularioInicial
  );

  const [
    cargando,
    setCargando
  ] = useState(true);

  const [
    guardando,
    setGuardando
  ] = useState(false);

  const [
    error,
    setError
  ] = useState("");

  useEffect(() => {
    const cancelar =
      suscribirLicencias(
        (datos) => {
          setLicencias(datos);
          setCargando(false);
        },

        (error) => {
          console.error(error);
          setCargando(false);
        }
      );

    obtenerCatalogosLicencia()
      .then(({ empresas, planes }) => {
        setEmpresas(empresas);
        setPlanes(planes);
      })
      .catch(console.error);

    return () =>
      cancelar();
  }, []);

  const empresasActivas =
    empresas.filter(
      (empresa) =>
        empresa.estado ===
        "ACTIVA"
    );

  const planesActivos =
    planes.filter(
      (plan) =>
        plan.activo === true
    );

  const nombreEmpresa = (
    empresaId
  ) =>
    empresas.find(
      (empresa) =>
        empresa.id ===
        empresaId
    )?.nombreComercial ||
    "Empresa";

  const nombrePlan = (
    planId
  ) =>
    planes.find(
      (plan) =>
        plan.id ===
        planId
    )?.nombre ||
    "Plan";

  const estadoVisual = (
    licencia
  ) => {
    if (
      licencia.estado !==
      "ACTIVA"
    ) {
      return licencia.estado;
    }

    if (
      licencia.fechaFin
    ) {
      const fechaFin =
        licencia.fechaFin.toDate();

      const ahora =
        new Date();

      if (
        fechaFin <
        ahora
      ) {
        return "VENCIDA";
      }
    }

    return "ACTIVA";
  };

  const estadisticas =
    useMemo(() => {
      return {
        total:
          licencias.length,

        activas:
          licencias.filter(
            (licencia) =>
              estadoVisual(
                licencia
              ) ===
              "ACTIVA"
          ).length,

        suspendidas:
          licencias.filter(
            (licencia) =>
              licencia.estado ===
              "SUSPENDIDA"
          ).length,

        vencidas:
          licencias.filter(
            (licencia) =>
              estadoVisual(
                licencia
              ) ===
              "VENCIDA"
          ).length
      };
    }, [licencias]);

  const manejarCambio = (
    e
  ) => {
    const {
      name,
      value,
      type,
      checked
    } = e.target;

    setFormulario(
      (anterior) => ({
        ...anterior,

        [name]:
          type ===
          "checkbox"
            ? checked
            : value
      })
    );
  };

  const abrirNueva = () => {
    setLicenciaEditando(null);

    setFormulario(
      formularioInicial
    );

    setError("");

    setMostrarModal(true);
  };

  const abrirEditar = (
    licencia
  ) => {
    setLicenciaEditando(
      licencia
    );

    setFormulario({
      empresaId:
        licencia.empresaId || "",

      planId:
        licencia.planId || "",

      fechaInicio:
        convertirFechaInput(
          licencia.fechaInicio
        ),

      fechaFin:
        convertirFechaInput(
          licencia.fechaFin
        ),

      renovacionAutomatica:
        Boolean(
          licencia.renovacionAutomatica
        ),

      observaciones:
        licencia.observaciones ||
        ""
    });

    setError("");

    setMostrarModal(true);
  };

  const cerrarModal = () => {
    if (guardando) {
      return;
    }

    setMostrarModal(false);

    setLicenciaEditando(null);

    setFormulario(
      formularioInicial
    );

    setError("");
  };

  const guardar = async (
    e
  ) => {
    e.preventDefault();

    setError("");

    if (
      !formulario.empresaId
    ) {
      setError(
        "Selecciona una empresa."
      );

      return;
    }

    if (
      !formulario.planId
    ) {
      setError(
        "Selecciona un plan."
      );

      return;
    }

    if (
      formulario.fechaFin &&
      formulario.fechaFin <
        formulario.fechaInicio
    ) {
      setError(
        "La fecha de vencimiento no puede ser anterior a la fecha de inicio."
      );

      return;
    }

    try {
      setGuardando(true);

      if (
        licenciaEditando
      ) {
        await actualizarLicencia(
          licenciaEditando.id,
          {
            ...formulario,

            estado:
              licenciaEditando.estado
          }
        );
      } else {
        await crearLicencia(
          formulario
        );
      }

      setMostrarModal(false);

      setLicenciaEditando(null);

      setFormulario(
        formularioInicial
      );
    } catch (error) {
      console.error(error);

      setError(
        error.message ||
          "No se pudo guardar la licencia."
      );
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado =
    async (
      licencia,
      nuevoEstado
    ) => {
      const confirmar =
        window.confirm(
          `¿Deseas cambiar la licencia a ${nuevoEstado}?`
        );

      if (!confirmar) {
        return;
      }

      try {
        await cambiarEstadoLicencia(
          licencia.id,
          licencia.empresaId,
          nuevoEstado
        );
      } catch (error) {
        console.error(error);

        alert(
          error.message ||
            "No se pudo modificar la licencia."
        );
      }
    };

  const licenciasFiltradas =
    licencias.filter(
      (licencia) => {
        const texto =
          busqueda.toLowerCase();

        return (
          nombreEmpresa(
            licencia.empresaId
          )
            .toLowerCase()
            .includes(texto) ||

          nombrePlan(
            licencia.planId
          )
            .toLowerCase()
            .includes(texto) ||

          licencia.estado
            ?.toLowerCase()
            .includes(texto)
        );
      }
    );

  return (
    <div>
      <div className="sa-page-header">
        <div>
          <h1>
            Licencias
          </h1>

          <p>
            Gestiona planes,
            vigencias y acceso
            comercial de cada empresa.
          </p>
        </div>

        <button
          className="sa-primary-button"
          onClick={abrirNueva}
        >
          <Plus size={17} />

          Nueva licencia
        </button>
      </div>

      <section className="sa-license-stats">
        <article>
          <KeyRound size={20} />

          <div>
            <span>
              Total
            </span>

            <strong>
              {estadisticas.total}
            </strong>
          </div>
        </article>

        <article>
          <CircleCheck
            size={20}
          />

          <div>
            <span>
              Activas
            </span>

            <strong>
              {estadisticas.activas}
            </strong>
          </div>
        </article>

        <article>
          <Power size={20} />

          <div>
            <span>
              Suspendidas
            </span>

            <strong>
              {
                estadisticas.suspendidas
              }
            </strong>
          </div>
        </article>

        <article>
          <CalendarDays
            size={20}
          />

          <div>
            <span>
              Vencidas
            </span>

            <strong>
              {estadisticas.vencidas}
            </strong>
          </div>
        </article>
      </section>

      <section className="sa-panel">
        <div className="sa-table-toolbar">
          <div className="sa-table-search">
            <Search size={17} />

            <input
              placeholder="Buscar licencia..."
              value={busqueda}
              onChange={(e) =>
                setBusqueda(
                  e.target.value
                )
              }
            />
          </div>

          <span>
            {
              licenciasFiltradas.length
            }
            {" "}
            resultado(s)
          </span>
        </div>

        {cargando ? (
          <div className="sa-empty">
            Cargando licencias...
          </div>
        ) : licenciasFiltradas.length ===
          0 ? (
          <div className="sa-empty">
            <KeyRound size={42} />

            <strong>
              No existen licencias
            </strong>

            <span>
              Asigna un plan
              a una empresa.
            </span>
          </div>
        ) : (
          <div className="sa-table-container">
            <table className="sa-table">
              <thead>
                <tr>
                  <th>EMPRESA</th>
                  <th>PLAN</th>
                  <th>INICIO</th>
                  <th>VENCIMIENTO</th>
                  <th>RENOVACIÓN</th>
                  <th>ESTADO</th>
                  <th>ACCIONES</th>
                </tr>
              </thead>

              <tbody>
                {licenciasFiltradas.map(
                  (licencia) => {
                    const estado =
                      estadoVisual(
                        licencia
                      );

                    return (
                      <tr
                        key={
                          licencia.id
                        }
                      >
                        <td>
                          <strong>
                            {nombreEmpresa(
                              licencia.empresaId
                            )}
                          </strong>
                        </td>

                        <td>
                          <span className="sa-license-plan">
                            {nombrePlan(
                              licencia.planId
                            )}
                          </span>
                        </td>

                        <td>
                          {formatearFecha(
                            licencia.fechaInicio
                          )}
                        </td>

                        <td>
                          {formatearFecha(
                            licencia.fechaFin
                          )}
                        </td>

                        <td>
                          {licencia
                            .renovacionAutomatica
                            ? "Sí"
                            : "No"}
                        </td>

                        <td>
                          <span
                            className={
                              estado ===
                              "ACTIVA"
                                ? "sa-badge active"
                                : estado ===
                                  "VENCIDA"
                                  ? "sa-badge expired"
                                  : "sa-badge suspended"
                            }
                          >
                            {estado}
                          </span>
                        </td>

                        <td>
                          <div className="sa-actions">
                            <button
                              title="Editar"
                              onClick={() =>
                                abrirEditar(
                                  licencia
                                )
                              }
                            >
                              <Pencil
                                size={16}
                              />
                            </button>

                            {licencia.estado ===
                            "ACTIVA" ? (
                              <button
                                title="Suspender"
                                onClick={() =>
                                  cambiarEstado(
                                    licencia,
                                    "SUSPENDIDA"
                                  )
                                }
                              >
                                <Power
                                  size={16}
                                />
                              </button>
                            ) : licencia.estado ===
                              "SUSPENDIDA" ? (
                              <button
                                title="Reactivar"
                                onClick={() =>
                                  cambiarEstado(
                                    licencia,
                                    "ACTIVA"
                                  )
                                }
                              >
                                <CircleCheck
                                  size={16}
                                />
                              </button>
                            ) : null}

                            {licencia.estado !==
                              "CANCELADA" && (
                              <button
                                title="Cancelar licencia"
                                onClick={() =>
                                  cambiarEstado(
                                    licencia,
                                    "CANCELADA"
                                  )
                                }
                              >
                                <XCircle
                                  size={16}
                                />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }
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
                y: 20,
                scale: 0.96
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1
              }}
              exit={{
                opacity: 0,
                y: 20,
                scale: 0.96
              }}
            >
              <div className="sa-modal-header">
                <div>
                  <h2>
                    {licenciaEditando
                      ? "Editar licencia"
                      : "Nueva licencia"}
                  </h2>

                  <p>
                    Relaciona una empresa
                    con uno de los planes
                    de la plataforma.
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
                      Empresa *
                    </label>

                    <select
                      name="empresaId"
                      value={
                        formulario.empresaId
                      }
                      onChange={
                        manejarCambio
                      }
                      required
                    >
                      <option value="">
                        Seleccionar
                      </option>

                      {empresasActivas.map(
                        (empresa) => (
                          <option
                            key={
                              empresa.id
                            }
                            value={
                              empresa.id
                            }
                          >
                            {
                              empresa.nombreComercial
                            }
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div className="sa-form-group">
                    <label>
                      Plan *
                    </label>

                    <select
                      name="planId"
                      value={
                        formulario.planId
                      }
                      onChange={
                        manejarCambio
                      }
                      required
                    >
                      <option value="">
                        Seleccionar
                      </option>

                      {planesActivos.map(
                        (plan) => (
                          <option
                            key={
                              plan.id
                            }
                            value={
                              plan.id
                            }
                          >
                            {plan.nombre}
                            {" - Bs "}
                            {Number(
                              plan.precioMensual ||
                                0
                            ).toFixed(2)}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div className="sa-form-group">
                    <label>
                      Inicio *
                    </label>

                    <input
                      type="date"
                      name="fechaInicio"
                      value={
                        formulario.fechaInicio
                      }
                      onChange={
                        manejarCambio
                      }
                      required
                    />
                  </div>

                  <div className="sa-form-group">
                    <label>
                      Vencimiento
                    </label>

                    <input
                      type="date"
                      name="fechaFin"
                      value={
                        formulario.fechaFin
                      }
                      onChange={
                        manejarCambio
                      }
                    />
                  </div>

                  <div className="sa-form-group full">
                    <label className="sa-checkbox-row">
                      <input
                        type="checkbox"
                        name="renovacionAutomatica"
                        checked={
                          formulario
                            .renovacionAutomatica
                        }
                        onChange={
                          manejarCambio
                        }
                      />

                      Renovación automática
                    </label>
                  </div>

                  <div className="sa-form-group full">
                    <label>
                      Observaciones
                    </label>

                    <textarea
                      name="observaciones"
                      value={
                        formulario.observaciones
                      }
                      onChange={
                        manejarCambio
                      }
                      rows={4}
                    />
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
                      : licenciaEditando
                        ? "Guardar cambios"
                        : "Crear licencia"}
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

export default LicenciasPage;