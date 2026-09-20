import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  Boxes,
  CircleCheck,
  Image as ImageIcon,
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
  suscribirCategorias
} from "../../services/categoriaService";

import {
  suscribirMarcas
} from "../../services/marcaService";

import {
  actualizarProducto,
  cambiarEstadoProducto,
  crearProducto,
  suscribirProductos
} from "../../services/productoService";

const formularioInicial = {
  sku: "",
  nombre: "",
  descripcion: "",
  categoriaId: "",
  marcaId: "",
  costo: "",
  precioVenta: "",
  stockMinimo: "0",
  unidad: "unidad",
  imagenUrl: ""
};

function ProductosPage() {
  const { usuario } = useAuth();

  const [productos, setProductos] =
    useState([]);

  const [categorias, setCategorias] =
    useState([]);

  const [marcas, setMarcas] =
    useState([]);

  const [busqueda, setBusqueda] =
    useState("");

  const [mostrarModal, setMostrarModal] =
    useState(false);

  const [productoEditando, setProductoEditando] =
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
      setCargando(false);
      return;
    }

    const cancelarProductos =
      suscribirProductos(
        usuario.empresaId,
        (datos) => {
          setProductos(datos);
          setCargando(false);
        },
        console.error
      );

    const cancelarCategorias =
      suscribirCategorias(
        usuario.empresaId,
        setCategorias,
        console.error
      );

    const cancelarMarcas =
      suscribirMarcas(
        usuario.empresaId,
        setMarcas,
        console.error
      );

    return () => {
      cancelarProductos();
      cancelarCategorias();
      cancelarMarcas();
    };
  }, [usuario?.empresaId]);

  const abrirNuevo = () => {
    setProductoEditando(null);
    setFormulario(formularioInicial);
    setError("");
    setMostrarModal(true);
  };

  const abrirEditar = (producto) => {
    setProductoEditando(producto);

    setFormulario({
      sku:
        producto.sku || "",

      nombre:
        producto.nombre || "",

      descripcion:
        producto.descripcion || "",

      categoriaId:
        producto.categoriaId || "",

      marcaId:
        producto.marcaId || "",

      costo:
        String(
          producto.costo ?? 0
        ),

      precioVenta:
        String(
          producto.precioVenta ?? 0
        ),

      stockMinimo:
        String(
          producto.stockMinimo ?? 0
        ),

      unidad:
        producto.unidad ||
        "unidad",

      imagenUrl:
        producto.imagenUrl || ""
    });

    setError("");
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    if (guardando) return;

    setMostrarModal(false);
    setProductoEditando(null);
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

  const guardarProducto = async (evento) => {
    evento.preventDefault();

    if (!formulario.sku.trim()) {
      setError(
        "El SKU es obligatorio."
      );
      return;
    }

    if (!formulario.nombre.trim()) {
      setError(
        "El nombre es obligatorio."
      );
      return;
    }

    if (
      Number(formulario.costo) < 0 ||
      Number(formulario.precioVenta) < 0 ||
      Number(formulario.stockMinimo) < 0
    ) {
      setError(
        "Costo, precio y stock mínimo no pueden ser negativos."
      );

      return;
    }

    try {
      setGuardando(true);
      setError("");

      if (productoEditando) {
        await actualizarProducto(
          productoEditando.id,
          usuario.empresaId,
          formulario
        );
      } else {
        await crearProducto(
          usuario.empresaId,
          formulario
        );
      }

      setMostrarModal(false);
      setProductoEditando(null);
      setFormulario(formularioInicial);
    } catch (error) {
      console.error(error);

      setError(
        error.message ||
        "No se pudo guardar el producto."
      );
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (producto) => {
    const nuevoEstado =
      producto.estado === "ACTIVO"
        ? "INACTIVO"
        : "ACTIVO";

    if (
      !window.confirm(
        `¿Cambiar "${producto.nombre}" a ${nuevoEstado}?`
      )
    ) {
      return;
    }

    try {
      await cambiarEstadoProducto(
        producto.id,
        nuevoEstado
      );
    } catch (error) {
      console.error(error);

      alert(
        "No se pudo cambiar el estado del producto."
      );
    }
  };

  const nombreCategoria = (id) =>
    categorias.find(
      (categoria) =>
        categoria.id === id
    )?.nombre || "-";

  const nombreMarca = (id) =>
    marcas.find(
      (marca) =>
        marca.id === id
    )?.nombre || "-";

  const productosFiltrados =
    useMemo(() => {
      const texto =
        busqueda.toLowerCase();

      return productos.filter(
        (producto) => {
          return (
            producto.nombre
              ?.toLowerCase()
              .includes(texto) ||
            producto.sku
              ?.toLowerCase()
              .includes(texto) ||
            nombreCategoria(
              producto.categoriaId
            )
              .toLowerCase()
              .includes(texto) ||
            nombreMarca(
              producto.marcaId
            )
              .toLowerCase()
              .includes(texto)
          );
        }
      );
    }, [
      productos,
      categorias,
      marcas,
      busqueda
    ]);

  const activos =
    productos.filter(
      (producto) =>
        producto.estado === "ACTIVO"
    ).length;

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1>Productos</h1>

          <p>
            Gestiona el catálogo,
            precios y datos de inventario.
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
          Nuevo producto
        </motion.button>
      </div>

      <section className="admin-inventory-metrics">
        <article>
          <Boxes size={21} />

          <div>
            <span>Total</span>
            <strong>{productos.length}</strong>
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
            productos.length - activos > 0
              ? "warning"
              : ""
          }
        >
          <Power size={21} />

          <div>
            <span>Inactivos</span>

            <strong>
              {productos.length - activos}
            </strong>
          </div>
        </article>
      </section>

      <section className="admin-card">
        <div className="admin-toolbar">
          <div className="admin-search">
            <Search size={18} />

            <input
              placeholder="Buscar producto, SKU, categoría o marca..."
              value={busqueda}
              onChange={(evento) =>
                setBusqueda(
                  evento.target.value
                )
              }
            />
          </div>

          <span>
            {productosFiltrados.length} resultado(s)
          </span>
        </div>

        {cargando ? (
          <div className="admin-loading-box">
            <Boxes size={28} />

            <span>
              Cargando productos...
            </span>
          </div>
        ) : productosFiltrados.length ===
          0 ? (
          <div className="admin-empty admin-empty-column">
            <Boxes size={42} />

            <strong>
              No existen productos
            </strong>

            <span>
              Registra el primer producto.
            </span>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>PRODUCTO</th>
                  <th>SKU</th>
                  <th>CATEGORÍA</th>
                  <th>MARCA</th>
                  <th>COSTO</th>
                  <th>PRECIO</th>
                  <th>STOCK MÍN.</th>
                  <th>ESTADO</th>
                  <th>ACCIONES</th>
                </tr>
              </thead>

              <tbody>
                {productosFiltrados.map(
                  (producto, indice) => (
                    <motion.tr
                      key={producto.id}
                      initial={{
                        opacity: 0,
                        y: 7
                      }}
                      animate={{
                        opacity: 1,
                        y: 0
                      }}
                      transition={{
                        delay:
                          indice * 0.02
                      }}
                    >
                      <td>
                        <div className="admin-product-cell">
                          <div className="admin-product-image">
                            {producto.imagenUrl ? (
                              <img
                                src={
                                  producto.imagenUrl
                                }
                                alt={
                                  producto.nombre
                                }
                              />
                            ) : (
                              <ImageIcon
                                size={18}
                              />
                            )}
                          </div>

                          <div>
                            <strong>
                              {producto.nombre}
                            </strong>

                            <small>
                              {producto.unidad ||
                                "unidad"}
                            </small>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="admin-code-chip">
                          {producto.sku}
                        </span>
                      </td>

                      <td>
                        {nombreCategoria(
                          producto.categoriaId
                        )}
                      </td>

                      <td>
                        {nombreMarca(
                          producto.marcaId
                        )}
                      </td>

                      <td>
                        Bs{" "}
                        {Number(
                          producto.costo || 0
                        ).toFixed(2)}
                      </td>

                      <td>
                        <strong>
                          Bs{" "}
                          {Number(
                            producto.precioVenta ||
                              0
                          ).toFixed(2)}
                        </strong>
                      </td>

                      <td>
                        {producto.stockMinimo ??
                          0}
                      </td>

                      <td>
                        <span
                          className={
                            producto.estado ===
                            "ACTIVO"
                              ? "admin-badge active"
                              : "admin-badge inactive"
                          }
                        >
                          {producto.estado}
                        </span>
                      </td>

                      <td>
                        <div className="admin-actions">
                          <button
                            onClick={() =>
                              abrirEditar(
                                producto
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
                                producto
                              )
                            }
                          >
                            {producto.estado ===
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
              className="admin-modal admin-modal-wide"
              initial={{
                opacity: 0,
                scale: 0.94,
                y: 25
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0
              }}
            >
              <div className="admin-modal-header">
                <div>
                  <h2>
                    {productoEditando
                      ? "Editar producto"
                      : "Nuevo producto"}
                  </h2>

                  <p>
                    Configura los datos del producto.
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
                  guardarProducto
                }
              >
                <div className="admin-form-grid">
                  <div className="admin-form-group">
                    <label>SKU *</label>

                    <input
                      name="sku"
                      value={formulario.sku}
                      onChange={manejarCambio}
                      required
                    />
                  </div>

                  <div className="admin-form-group">
                    <label>Nombre *</label>

                    <input
                      name="nombre"
                      value={
                        formulario.nombre
                      }
                      onChange={
                        manejarCambio
                      }
                      required
                    />
                  </div>

                  <div className="admin-form-group">
                    <label>Categoría</label>

                    <select
                      name="categoriaId"
                      value={
                        formulario.categoriaId
                      }
                      onChange={
                        manejarCambio
                      }
                    >
                      <option value="">
                        Sin categoría
                      </option>

                      {categorias
                        .filter(
                          (categoria) =>
                            categoria.estado ===
                            "ACTIVA"
                        )
                        .map(
                          (categoria) => (
                            <option
                              key={
                                categoria.id
                              }
                              value={
                                categoria.id
                              }
                            >
                              {
                                categoria.nombre
                              }
                            </option>
                          )
                        )}
                    </select>
                  </div>

                  <div className="admin-form-group">
                    <label>Marca</label>

                    <select
                      name="marcaId"
                      value={
                        formulario.marcaId
                      }
                      onChange={
                        manejarCambio
                      }
                    >
                      <option value="">
                        Sin marca
                      </option>

                      {marcas
                        .filter(
                          (marca) =>
                            marca.estado ===
                            "ACTIVA"
                        )
                        .map(
                          (marca) => (
                            <option
                              key={
                                marca.id
                              }
                              value={
                                marca.id
                              }
                            >
                              {marca.nombre}
                            </option>
                          )
                        )}
                    </select>
                  </div>

                  <div className="admin-form-group">
                    <label>Costo</label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      name="costo"
                      value={
                        formulario.costo
                      }
                      onChange={
                        manejarCambio
                      }
                    />
                  </div>

                  <div className="admin-form-group">
                    <label>
                      Precio de venta
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      name="precioVenta"
                      value={
                        formulario.precioVenta
                      }
                      onChange={
                        manejarCambio
                      }
                    />
                  </div>

                  <div className="admin-form-group">
                    <label>
                      Stock mínimo
                    </label>

                    <input
                      type="number"
                      min="0"
                      name="stockMinimo"
                      value={
                        formulario.stockMinimo
                      }
                      onChange={
                        manejarCambio
                      }
                    />
                  </div>

                  <div className="admin-form-group">
                    <label>Unidad</label>

                    <input
                      name="unidad"
                      value={
                        formulario.unidad
                      }
                      onChange={
                        manejarCambio
                      }
                      placeholder="unidad"
                    />
                  </div>

                  <div className="admin-form-group full">
                    <label>
                      URL imagen
                    </label>

                    <input
                      name="imagenUrl"
                      value={
                        formulario.imagenUrl
                      }
                      onChange={
                        manejarCambio
                      }
                      placeholder="https://..."
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
                      : productoEditando
                        ? "Guardar cambios"
                        : "Crear producto"}
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

export default ProductosPage;