import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  CircleCheck,
  FolderPlus,
  FolderTree,
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

import useAuth from "../../hooks/useAuth";

import {
  actualizarCategoria,
  cambiarEstadoCategoria,
  crearCategoria,
  suscribirCategorias
} from "../../services/categoriaService";

const formularioInicial = {
  nombre: "",
  descripcion: ""
};

function CategoriasPage() {
  const {
    usuario
  } = useAuth();

  const [
    categorias,
    setCategorias
  ] = useState([]);

  const [
    busqueda,
    setBusqueda
  ] = useState("");

  const [
    cargando,
    setCargando
  ] = useState(true);

  const [
    mostrarModal,
    setMostrarModal
  ] = useState(false);

  const [
    categoriaEditando,
    setCategoriaEditando
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
    error,
    setError
  ] = useState("");

  // ======================================================
  // CARGAR CATEGORÍAS
  // ======================================================

  useEffect(() => {
    if (
      !usuario?.empresaId
    ) {
      setCategorias([]);
      setCargando(false);

      return;
    }

    setCargando(true);

    const cancelar =
      suscribirCategorias(
        usuario.empresaId,

        (datos) => {
          setCategorias(datos);
          setCargando(false);
        },

        (error) => {
          console.error(
            error
          );

          setError(
            "No se pudieron cargar las categorías."
          );

          setCargando(false);
        }
      );

    return () => {
      cancelar();
    };
  }, [
    usuario?.empresaId
  ]);

  // ======================================================
  // ABRIR NUEVA
  // ======================================================

  const abrirNueva = () => {
    setCategoriaEditando(
      null
    );

    setFormulario(
      formularioInicial
    );

    setError("");

    setMostrarModal(
      true
    );
  };

  // ======================================================
  // ABRIR EDITAR
  // ======================================================

  const abrirEditar = (
    categoria
  ) => {
    setCategoriaEditando(
      categoria
    );

    setFormulario({
      nombre:
        categoria.nombre ||
        "",

      descripcion:
        categoria.descripcion ||
        ""
    });

    setError("");

    setMostrarModal(
      true
    );
  };

  // ======================================================
  // CERRAR MODAL
  // ======================================================

  const cerrarModal = () => {
    if (guardando) {
      return;
    }

    setMostrarModal(
      false
    );

    setCategoriaEditando(
      null
    );

    setFormulario(
      formularioInicial
    );

    setError("");
  };

  // ======================================================
  // CAMBIOS FORMULARIO
  // ======================================================

  const manejarCambio = (
    evento
  ) => {
    const {
      name,
      value
    } = evento.target;

    setFormulario(
      (anterior) => ({
        ...anterior,

        [name]:
          value
      })
    );
  };

  // ======================================================
  // GUARDAR
  // ======================================================

  const guardarCategoria =
    async (evento) => {
      evento.preventDefault();

      if (
        !formulario.nombre.trim()
      ) {
        setError(
          "El nombre de la categoría es obligatorio."
        );

        return;
      }

      try {
        setGuardando(
          true
        );

        setError("");

        if (
          categoriaEditando
        ) {
          await actualizarCategoria(
            categoriaEditando.id,
            formulario
          );
        } else {
          await crearCategoria(
            usuario.empresaId,
            formulario
          );
        }

        setMostrarModal(
          false
        );

        setCategoriaEditando(
          null
        );

        setFormulario(
          formularioInicial
        );
      } catch (error) {
        console.error(
          "Error guardando categoría:",
          error
        );

        setError(
          error.message ||
            "No se pudo guardar la categoría."
        );
      } finally {
        setGuardando(
          false
        );
      }
    };

  // ======================================================
  // CAMBIAR ESTADO
  // ======================================================

  const cambiarEstado =
    async (categoria) => {
      const nuevoEstado =
        categoria.estado ===
        "ACTIVA"
          ? "INACTIVA"
          : "ACTIVA";

      const accion =
        nuevoEstado ===
        "ACTIVA"
          ? "activar"
          : "desactivar";

      const confirmar =
        window.confirm(
          `¿Deseas ${accion} la categoría "${categoria.nombre}"?`
        );

      if (!confirmar) {
        return;
      }

      try {
        await cambiarEstadoCategoria(
          categoria.id,
          nuevoEstado
        );
      } catch (error) {
        console.error(
          error
        );

        alert(
          error.message ||
            "No se pudo cambiar el estado."
        );
      }
    };

  // ======================================================
  // FILTRADO
  // ======================================================

  const categoriasFiltradas =
    useMemo(() => {
      const texto =
        busqueda
          .trim()
          .toLowerCase();

      if (!texto) {
        return categorias;
      }

      return categorias.filter(
        (categoria) => {
          return (
            categoria.nombre
              ?.toLowerCase()
              .includes(texto) ||

            categoria.descripcion
              ?.toLowerCase()
              .includes(texto) ||

            categoria.estado
              ?.toLowerCase()
              .includes(texto)
          );
        }
      );
    }, [
      categorias,
      busqueda
    ]);

  // ======================================================
  // ESTADÍSTICAS
  // ======================================================

  const totalActivas =
    categorias.filter(
      (categoria) =>
        categoria.estado ===
        "ACTIVA"
    ).length;

  const totalInactivas =
    categorias.filter(
      (categoria) =>
        categoria.estado ===
        "INACTIVA"
    ).length;

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div>

      {/* ==================================================
          ENCABEZADO
      ================================================== */}

      <div className="admin-page-header">
        <div>
          <h1>
            Categorías
          </h1>

          <p>
            Organiza y clasifica
            los productos de tu
            empresa.
          </p>
        </div>

        <motion.button
          className="admin-primary-button"
          onClick={
            abrirNueva
          }
          whileHover={{
            scale: 1.03
          }}
          whileTap={{
            scale: 0.97
          }}
        >
          <Plus
            size={18}
          />

          Nueva categoría
        </motion.button>
      </div>

      {/* ==================================================
          MÉTRICAS
      ================================================== */}

      <section className="admin-inventory-metrics">

        <motion.article
          whileHover={{
            y: -5,
            rotateX: 2
          }}
        >
          <FolderTree
            size={21}
          />

          <div>
            <span>
              Total categorías
            </span>

            <strong>
              {categorias.length}
            </strong>
          </div>
        </motion.article>

        <motion.article
          whileHover={{
            y: -5,
            rotateX: 2
          }}
        >
          <CircleCheck
            size={21}
          />

          <div>
            <span>
              Activas
            </span>

            <strong>
              {totalActivas}
            </strong>
          </div>
        </motion.article>

        <motion.article
          className={
            totalInactivas > 0
              ? "warning"
              : ""
          }
          whileHover={{
            y: -5,
            rotateX: 2
          }}
        >
          <Power
            size={21}
          />

          <div>
            <span>
              Inactivas
            </span>

            <strong>
              {totalInactivas}
            </strong>
          </div>
        </motion.article>

      </section>

      {/* ==================================================
          TABLA
      ================================================== */}

      <section className="admin-card">

        <div className="admin-toolbar admin-toolbar-wrap">

          <div className="admin-search">
            <Search
              size={18}
            />

            <input
              type="text"
              placeholder="Buscar categoría..."
              value={
                busqueda
              }
              onChange={(
                evento
              ) =>
                setBusqueda(
                  evento.target.value
                )
              }
            />
          </div>

          <span>
            {
              categoriasFiltradas.length
            }
            {" "}
            resultado(s)
          </span>
        </div>

        {/* LOADING */}

        {cargando ? (
          <div className="admin-loading-box">
            <FolderTree
              size={28}
            />

            <span>
              Cargando categorías...
            </span>
          </div>
        ) : categoriasFiltradas.length ===
          0 ? (
          <div className="admin-empty admin-empty-column">
            <FolderPlus
              size={44}
            />

            <strong>
              No existen categorías
            </strong>

            <span>
              Crea categorías para
              organizar los productos
              del inventario.
            </span>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">

              <thead>
                <tr>
                  <th>
                    CATEGORÍA
                  </th>

                  <th>
                    DESCRIPCIÓN
                  </th>

                  <th>
                    ESTADO
                  </th>

                  <th>
                    ACCIONES
                  </th>
                </tr>
              </thead>

              <tbody>
                <AnimatePresence>
                  {categoriasFiltradas.map(
                    (
                      categoria,
                      indice
                    ) => (
                      <motion.tr
                        key={
                          categoria.id
                        }
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
                            indice *
                            0.025
                        }}
                      >

                        <td>
                          <div className="admin-product-cell">
                            <div className="admin-product-image">
                              <FolderTree
                                size={18}
                              />
                            </div>

                            <div>
                              <strong>
                                {
                                  categoria.nombre
                                }
                              </strong>

                              <small>
                                Categoría de productos
                              </small>
                            </div>
                          </div>
                        </td>

                        <td>
                          {
                            categoria.descripcion ||
                            "Sin descripción"
                          }
                        </td>

                        <td>
                          <span
                            className={
                              categoria.estado ===
                              "ACTIVA"
                                ? "admin-badge active"
                                : "admin-badge inactive"
                            }
                          >
                            {
                              categoria.estado
                            }
                          </span>
                        </td>

                        <td>
                          <div className="admin-actions">

                            <button
                              type="button"
                              title="Editar categoría"
                              onClick={() =>
                                abrirEditar(
                                  categoria
                                )
                              }
                            >
                              <Pencil
                                size={16}
                              />
                            </button>

                            <button
                              type="button"
                              title={
                                categoria.estado ===
                                "ACTIVA"
                                  ? "Desactivar categoría"
                                  : "Activar categoría"
                              }
                              onClick={() =>
                                cambiarEstado(
                                  categoria
                                )
                              }
                            >
                              {categoria.estado ===
                              "ACTIVA" ? (
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

                      </motion.tr>
                    )
                  )}
                </AnimatePresence>
              </tbody>

            </table>
          </div>
        )}

      </section>

      {/* ==================================================
          MODAL
      ================================================== */}

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
                y: 30,
                scale: 0.94,
                rotateX: -5
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                rotateX: 0
              }}
              exit={{
                opacity: 0,
                y: 20,
                scale: 0.96
              }}
              transition={{
                type: "spring",
                stiffness: 220,
                damping: 22
              }}
            >

              <div className="admin-modal-header">

                <div>
                  <h2>
                    {categoriaEditando
                      ? "Editar categoría"
                      : "Nueva categoría"}
                  </h2>

                  <p>
                    Configura la información
                    de clasificación.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    cerrarModal
                  }
                  title="Cerrar"
                >
                  <X
                    size={20}
                  />
                </button>

              </div>

              <form
                onSubmit={
                  guardarCategoria
                }
              >

                <div className="admin-form-grid">

                  <div className="admin-form-group full">
                    <label>
                      Nombre *
                    </label>

                    <input
                      type="text"
                      name="nombre"
                      value={
                        formulario.nombre
                      }
                      onChange={
                        manejarCambio
                      }
                      placeholder="Ej. Bebidas"
                      maxLength={80}
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
                      onChange={
                        manejarCambio
                      }
                      placeholder="Describe brevemente esta categoría..."
                      rows={4}
                      maxLength={300}
                    />
                  </div>

                </div>

                {error && (
                  <motion.div
                    className="admin-message error"
                    initial={{
                      opacity: 0,
                      y: -5
                    }}
                    animate={{
                      opacity: 1,
                      y: 0
                    }}
                  >
                    {error}
                  </motion.div>
                )}

                <div className="admin-modal-footer">

                  <button
                    type="button"
                    className="admin-secondary-button"
                    onClick={
                      cerrarModal
                    }
                    disabled={
                      guardando
                    }
                  >
                    Cancelar
                  </button>

                  <motion.button
                    type="submit"
                    className="admin-primary-button"
                    disabled={
                      guardando
                    }
                    whileHover={
                      guardando
                        ? {}
                        : {
                            scale:
                              1.02
                          }
                    }
                    whileTap={
                      guardando
                        ? {}
                        : {
                            scale:
                              0.98
                          }
                    }
                  >
                    {guardando
                      ? "Guardando..."
                      : categoriaEditando
                        ? "Guardar cambios"
                        : "Crear categoría"}
                  </motion.button>

                </div>

              </form>

            </motion.div>

          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default CategoriasPage;