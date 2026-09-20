import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  CircleCheck,
  Pencil,
  Plus,
  Power,
  Search,
  Tags,
  X
} from "lucide-react";

import {
  AnimatePresence,
  motion
} from "framer-motion";

import useAuth from "../../hooks/useAuth";

import {
  actualizarMarca,
  cambiarEstadoMarca,
  crearMarca,
  suscribirMarcas
} from "../../services/marcaService";

const formularioInicial = {
  nombre: "",
  descripcion: ""
};

function MarcasPage() {
  const { usuario } = useAuth();

  const [marcas, setMarcas] = useState([]);
  const [busqueda, setBusqueda] = useState("");

  const [mostrarModal, setMostrarModal] =
    useState(false);

  const [marcaEditando, setMarcaEditando] =
    useState(null);

  const [formulario, setFormulario] =
    useState(formularioInicial);

  const [guardando, setGuardando] =
    useState(false);

  const [cargando, setCargando] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (!usuario?.empresaId) {
      setMarcas([]);
      setCargando(false);
      return;
    }

    const cancelar = suscribirMarcas(
      usuario.empresaId,

      (datos) => {
        setMarcas(datos);
        setCargando(false);
      },

      (error) => {
        console.error(error);
        setCargando(false);
      }
    );

    return () => cancelar();
  }, [usuario?.empresaId]);

  const abrirNueva = () => {
    setMarcaEditando(null);
    setFormulario(formularioInicial);
    setError("");
    setMostrarModal(true);
  };

  const abrirEditar = (marca) => {
    setMarcaEditando(marca);

    setFormulario({
      nombre: marca.nombre || "",
      descripcion: marca.descripcion || ""
    });

    setError("");
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    if (guardando) return;

    setMostrarModal(false);
    setMarcaEditando(null);
    setFormulario(formularioInicial);
    setError("");
  };

  const manejarCambio = (evento) => {
    const {
      name,
      value
    } = evento.target;

    setFormulario((anterior) => ({
      ...anterior,
      [name]: value
    }));
  };

  const guardarMarca = async (evento) => {
    evento.preventDefault();

    if (!formulario.nombre.trim()) {
      setError(
        "El nombre de la marca es obligatorio."
      );

      return;
    }

    try {
      setGuardando(true);
      setError("");

      if (marcaEditando) {
        await actualizarMarca(
          marcaEditando.id,
          formulario
        );
      } else {
        await crearMarca(
          usuario.empresaId,
          formulario
        );
      }

      setMostrarModal(false);
      setMarcaEditando(null);
      setFormulario(formularioInicial);
    } catch (error) {
      console.error(error);

      setError(
        error.message ||
        "No se pudo guardar la marca."
      );
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (marca) => {
    const nuevoEstado =
      marca.estado === "ACTIVA"
        ? "INACTIVA"
        : "ACTIVA";

    if (
      !window.confirm(
        `¿Cambiar "${marca.nombre}" a ${nuevoEstado}?`
      )
    ) {
      return;
    }

    try {
      await cambiarEstadoMarca(
        marca.id,
        nuevoEstado
      );
    } catch (error) {
      console.error(error);

      alert(
        "No se pudo modificar la marca."
      );
    }
  };

  const filtradas = useMemo(() => {
    const texto =
      busqueda.toLowerCase();

    return marcas.filter((marca) => {
      return (
        marca.nombre
          ?.toLowerCase()
          .includes(texto) ||
        marca.descripcion
          ?.toLowerCase()
          .includes(texto)
      );
    });
  }, [marcas, busqueda]);

  const activas =
    marcas.filter(
      (marca) =>
        marca.estado === "ACTIVA"
    ).length;

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1>Marcas</h1>

          <p>
            Administra las marcas asociadas
            a los productos.
          </p>
        </div>

        <motion.button
          className="admin-primary-button"
          onClick={abrirNueva}
          whileHover={{
            scale: 1.03
          }}
          whileTap={{
            scale: 0.97
          }}
        >
          <Plus size={18} />
          Nueva marca
        </motion.button>
      </div>

      <section className="admin-inventory-metrics">
        <article>
          <Tags size={21} />

          <div>
            <span>Total marcas</span>
            <strong>{marcas.length}</strong>
          </div>
        </article>

        <article>
          <CircleCheck size={21} />

          <div>
            <span>Activas</span>
            <strong>{activas}</strong>
          </div>
        </article>

        <article
          className={
            marcas.length - activas > 0
              ? "warning"
              : ""
          }
        >
          <Power size={21} />

          <div>
            <span>Inactivas</span>

            <strong>
              {marcas.length - activas}
            </strong>
          </div>
        </article>
      </section>

      <section className="admin-card">
        <div className="admin-toolbar">
          <div className="admin-search">
            <Search size={18} />

            <input
              placeholder="Buscar marca..."
              value={busqueda}
              onChange={(evento) =>
                setBusqueda(
                  evento.target.value
                )
              }
            />
          </div>

          <span>
            {filtradas.length} resultado(s)
          </span>
        </div>

        {cargando ? (
          <div className="admin-loading-box">
            <Tags size={28} />

            <span>
              Cargando marcas...
            </span>
          </div>
        ) : filtradas.length === 0 ? (
          <div className="admin-empty admin-empty-column">
            <Tags size={42} />

            <strong>
              No existen marcas
            </strong>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>MARCA</th>
                  <th>DESCRIPCIÓN</th>
                  <th>ESTADO</th>
                  <th>ACCIONES</th>
                </tr>
              </thead>

              <tbody>
                {filtradas.map(
                  (marca, indice) => (
                    <motion.tr
                      key={marca.id}
                      initial={{
                        opacity: 0,
                        y: 8
                      }}
                      animate={{
                        opacity: 1,
                        y: 0
                      }}
                      transition={{
                        delay:
                          indice * 0.025
                      }}
                    >
                      <td>
                        <div className="admin-product-cell">
                          <div className="admin-product-image">
                            <Tags size={18} />
                          </div>

                          <div>
                            <strong>
                              {marca.nombre}
                            </strong>

                            <small>
                              Marca comercial
                            </small>
                          </div>
                        </div>
                      </td>

                      <td>
                        {marca.descripcion ||
                          "Sin descripción"}
                      </td>

                      <td>
                        <span
                          className={
                            marca.estado ===
                            "ACTIVA"
                              ? "admin-badge active"
                              : "admin-badge inactive"
                          }
                        >
                          {marca.estado}
                        </span>
                      </td>

                      <td>
                        <div className="admin-actions">
                          <button
                            onClick={() =>
                              abrirEditar(marca)
                            }
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            onClick={() =>
                              cambiarEstado(marca)
                            }
                          >
                            {marca.estado ===
                            "ACTIVA" ? (
                              <Power size={16} />
                            ) : (
                              <CircleCheck
                                size={16}
                              />
                            )}
                          </button>
                        </div>
                      </td>
                    </motion.tr>
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
                    {marcaEditando
                      ? "Editar marca"
                      : "Nueva marca"}
                  </h2>

                  <p>
                    Información de la marca.
                  </p>
                </div>

                <button onClick={cerrarModal}>
                  <X size={20} />
                </button>
              </div>

              <form
                onSubmit={guardarMarca}
              >
                <div className="admin-form-grid">
                  <div className="admin-form-group full">
                    <label>Nombre *</label>

                    <input
                      name="nombre"
                      value={formulario.nombre}
                      onChange={manejarCambio}
                      required
                    />
                  </div>

                  <div className="admin-form-group full">
                    <label>
                      Descripción
                    </label>

                    <textarea
                      name="descripcion"
                      value={
                        formulario.descripcion
                      }
                      onChange={manejarCambio}
                      rows={4}
                    />
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
                      : "Guardar marca"}
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

export default MarcasPage;