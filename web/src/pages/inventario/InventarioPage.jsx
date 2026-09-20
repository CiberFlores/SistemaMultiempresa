import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  Search,
  SlidersHorizontal,
  X
} from "lucide-react";

import {
  AnimatePresence,
  motion
} from "framer-motion";

import useAuth from "../../hooks/useAuth";

import {
  ajustarStock,
  obtenerCatalogosInventario,
  suscribirInventario
} from "../../services/inventarioService";

const formularioInicial = {
  sucursalId: "",
  productoId: "",
  tipo: "ENTRADA",
  cantidad: "",
  motivo: ""
};

function InventarioPage() {
  const {
    usuario
  } = useAuth();

  const [
    inventarios,
    setInventarios
  ] = useState([]);

  const [
    productos,
    setProductos
  ] = useState([]);

  const [
    sucursales,
    setSucursales
  ] = useState([]);

  const [
    busqueda,
    setBusqueda
  ] = useState("");

  const [
    filtroSucursal,
    setFiltroSucursal
  ] = useState("");

  const [
    mostrarModal,
    setMostrarModal
  ] = useState(false);

  const [
    formulario,
    setFormulario
  ] = useState(formularioInicial);

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
      suscribirInventario(
        usuario.empresaId,

        (datos) => {
          setInventarios(datos);
          setCargando(false);
        },

        console.error
      );

    obtenerCatalogosInventario(
      usuario.empresaId
    )
      .then(
        ({
          productos,
          sucursales
        }) => {
          setProductos(productos);
          setSucursales(sucursales);
        }
      )
      .catch(console.error);

    return () => cancelar();
  }, [usuario?.empresaId]);

  const productoPorId = (id) =>
    productos.find(
      (producto) =>
        producto.id === id
    );

  const sucursalPorId = (id) =>
    sucursales.find(
      (sucursal) =>
        sucursal.id === id
    );

  const abrirMovimiento = (
    inventario = null
  ) => {
    setFormulario({
      sucursalId:
        inventario?.sucursalId || "",

      productoId:
        inventario?.productoId || "",

      tipo:
        "ENTRADA",

      cantidad:
        "",

      motivo:
        ""
    });

    setError("");
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    if (guardando) return;

    setMostrarModal(false);
    setFormulario(formularioInicial);
    setError("");
  };

  const registrarMovimiento =
    async (evento) => {
      evento.preventDefault();

      try {
        setGuardando(true);
        setError("");

        await ajustarStock({
          empresaId:
            usuario.empresaId,

          sucursalId:
            formulario.sucursalId,

          productoId:
            formulario.productoId,

          tipo:
            formulario.tipo,

          cantidad:
            formulario.cantidad,

          motivo:
            formulario.motivo,

          usuarioId:
            usuario.uid
        });

        setMostrarModal(false);
        setFormulario(formularioInicial);
      } catch (error) {
        console.error(error);

        setError(
          error.message ||
          "No se pudo registrar el movimiento."
        );
      } finally {
        setGuardando(false);
      }
    };

  const filas = useMemo(() => {
    return inventarios
      .map((inventario) => ({
        ...inventario,

        producto:
          productoPorId(
            inventario.productoId
          ),

        sucursal:
          sucursalPorId(
            inventario.sucursalId
          )
      }))
      .filter((inventario) => {
        if (
          filtroSucursal &&
          inventario.sucursalId !==
            filtroSucursal
        ) {
          return false;
        }

        const texto =
          busqueda.toLowerCase();

        return (
          inventario.producto?.nombre
            ?.toLowerCase()
            .includes(texto) ||
          inventario.producto?.sku
            ?.toLowerCase()
            .includes(texto) ||
          inventario.sucursal?.nombre
            ?.toLowerCase()
            .includes(texto)
        );
      });
  }, [
    inventarios,
    productos,
    sucursales,
    busqueda,
    filtroSucursal
  ]);

  const stockTotal =
    inventarios.reduce(
      (total, inventario) =>
        total +
        Number(
          inventario.stock || 0
        ),
      0
    );

  const alertas =
    inventarios.filter(
      (inventario) => {
        const producto =
          productoPorId(
            inventario.productoId
          );

        return (
          Number(
            inventario.stock || 0
          ) <=
          Number(
            producto?.stockMinimo || 0
          )
        );
      }
    ).length;

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1>Inventario</h1>

          <p>
            Control de existencias por
            producto y sucursal.
          </p>
        </div>

        <motion.button
          className="admin-primary-button"
          onClick={() =>
            abrirMovimiento()
          }
          whileHover={{
            scale: 1.03
          }}
          whileTap={{
            scale: 0.97
          }}
        >
          <SlidersHorizontal
            size={18}
          />

          Ajustar stock
        </motion.button>
      </div>

      <section className="admin-inventory-metrics">
        <article>
          <Boxes size={21} />

          <div>
            <span>
              Registros
            </span>

            <strong>
              {inventarios.length}
            </strong>
          </div>
        </article>

        <article>
          <ArrowDownToLine
            size={21}
          />

          <div>
            <span>
              Unidades
            </span>

            <strong>
              {stockTotal}
            </strong>
          </div>
        </article>

        <article
          className={
            alertas > 0
              ? "warning"
              : ""
          }
        >
          <ArrowUpFromLine
            size={21}
          />

          <div>
            <span>
              Stock bajo
            </span>

            <strong>
              {alertas}
            </strong>
          </div>
        </article>
      </section>

      <section className="admin-card">
        <div className="admin-toolbar admin-toolbar-wrap">
          <div className="admin-search">
            <Search size={18} />

            <input
              placeholder="Buscar producto, SKU o sucursal..."
              value={busqueda}
              onChange={(evento) =>
                setBusqueda(
                  evento.target.value
                )
              }
            />
          </div>

          <select
            className="admin-filter-select"
            value={filtroSucursal}
            onChange={(evento) =>
              setFiltroSucursal(
                evento.target.value
              )
            }
          >
            <option value="">
              Todas las sucursales
            </option>

            {sucursales.map(
              (sucursal) => (
                <option
                  key={sucursal.id}
                  value={sucursal.id}
                >
                  {sucursal.nombre}
                </option>
              )
            )}
          </select>
        </div>

        {cargando ? (
          <div className="admin-loading-box">
            <Boxes size={28} />

            <span>
              Cargando inventario...
            </span>
          </div>
        ) : filas.length === 0 ? (
          <div className="admin-empty admin-empty-column">
            <Boxes size={42} />

            <strong>
              Sin existencias registradas
            </strong>

            <span>
              Usa Ajustar stock para realizar
              la primera entrada.
            </span>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>PRODUCTO</th>
                  <th>SKU</th>
                  <th>SUCURSAL</th>
                  <th>STOCK</th>
                  <th>MÍNIMO</th>
                  <th>ESTADO</th>
                  <th>ACCIÓN</th>
                </tr>
              </thead>

              <tbody>
                {filas.map((inventario) => {
                  const minimo =
                    Number(
                      inventario.producto
                        ?.stockMinimo || 0
                    );

                  const bajo =
                    Number(
                      inventario.stock || 0
                    ) <= minimo;

                  return (
                    <tr key={inventario.id}>
                      <td>
                        <strong>
                          {inventario.producto
                            ?.nombre ||
                            "Producto"}
                        </strong>
                      </td>

                      <td>
                        <span className="admin-code-chip">
                          {inventario.producto
                            ?.sku || "-"}
                        </span>
                      </td>

                      <td>
                        {inventario.sucursal
                          ?.nombre ||
                          "Sucursal"}
                      </td>

                      <td>
                        <strong>
                          {inventario.stock ||
                            0}
                        </strong>
                      </td>

                      <td>
                        {minimo}
                      </td>

                      <td>
                        <span
                          className={
                            bajo
                              ? "admin-badge inactive"
                              : "admin-badge active"
                          }
                        >
                          {bajo
                            ? "STOCK BAJO"
                            : "NORMAL"}
                        </span>
                      </td>

                      <td>
                        <button
                          className="admin-mini-button"
                          onClick={() =>
                            abrirMovimiento(
                              inventario
                            )
                          }
                        >
                          Ajustar
                        </button>
                      </td>
                    </tr>
                  );
                })}
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
                    Movimiento de inventario
                  </h2>

                  <p>
                    Entrada, salida o ajuste
                    de existencias.
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
                  registrarMovimiento
                }
              >
                <div className="admin-form-grid">
                  <div className="admin-form-group">
                    <label>
                      Sucursal *
                    </label>

                    <select
                      value={
                        formulario.sucursalId
                      }
                      onChange={(evento) =>
                        setFormulario(
                          (anterior) => ({
                            ...anterior,

                            sucursalId:
                              evento.target
                                .value
                          })
                        )
                      }
                      required
                    >
                      <option value="">
                        Seleccionar
                      </option>

                      {sucursales.map(
                        (sucursal) => (
                          <option
                            key={
                              sucursal.id
                            }
                            value={
                              sucursal.id
                            }
                          >
                            {
                              sucursal.nombre
                            }
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div className="admin-form-group">
                    <label>
                      Producto *
                    </label>

                    <select
                      value={
                        formulario.productoId
                      }
                      onChange={(evento) =>
                        setFormulario(
                          (anterior) => ({
                            ...anterior,

                            productoId:
                              evento.target
                                .value
                          })
                        )
                      }
                      required
                    >
                      <option value="">
                        Seleccionar
                      </option>

                      {productos.map(
                        (producto) => (
                          <option
                            key={
                              producto.id
                            }
                            value={
                              producto.id
                            }
                          >
                            {producto.sku}
                            {" - "}
                            {
                              producto.nombre
                            }
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div className="admin-form-group">
                    <label>Tipo *</label>

                    <select
                      value={
                        formulario.tipo
                      }
                      onChange={(evento) =>
                        setFormulario(
                          (anterior) => ({
                            ...anterior,

                            tipo:
                              evento.target
                                .value
                          })
                        )
                      }
                    >
                      <option value="ENTRADA">
                        Entrada
                      </option>

                      <option value="SALIDA">
                        Salida
                      </option>

                      <option value="AJUSTE_POSITIVO">
                        Ajuste positivo
                      </option>

                      <option value="AJUSTE_NEGATIVO">
                        Ajuste negativo
                      </option>
                    </select>
                  </div>

                  <div className="admin-form-group">
                    <label>
                      Cantidad *
                    </label>

                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={
                        formulario.cantidad
                      }
                      onChange={(evento) =>
                        setFormulario(
                          (anterior) => ({
                            ...anterior,

                            cantidad:
                              evento.target
                                .value
                          })
                        )
                      }
                      required
                    />
                  </div>

                  <div className="admin-form-group full">
                    <label>Motivo</label>

                    <textarea
                      value={
                        formulario.motivo
                      }
                      onChange={(evento) =>
                        setFormulario(
                          (anterior) => ({
                            ...anterior,

                            motivo:
                              evento.target
                                .value
                          })
                        )
                      }
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
                      ? "Procesando..."
                      : "Registrar movimiento"}
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

export default InventarioPage;