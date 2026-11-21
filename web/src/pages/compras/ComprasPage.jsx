import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  Plus,
  RefreshCw,
  ShoppingBag,
  Trash2,
  CalendarDays
} from "lucide-react";

import useAuth from "../../hooks/useAuth";

import {
  listarCompras,
  obtenerCatalogosCompra,
  registrarCompra
} from "../../services/compraService";


// ==========================================
// FECHA ACTUAL
// ==========================================

function fechaLocal() {
  const hoy = new Date();

  return [
    hoy.getFullYear(),
    String(
      hoy.getMonth() + 1
    ).padStart(2, "0"),
    String(
      hoy.getDate()
    ).padStart(2, "0")
  ].join("-");
}


// ==========================================
// FORMATEAR DINERO
// ==========================================

const moneda = (valor) =>
  `Bs ${Number(valor || 0).toFixed(2)}`;


// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

function ComprasPage() {
  const { usuario } = useAuth();

  const empresaId =
    usuario?.empresaId;


  // ========================================
  // ESTADOS
  // ========================================

  const [compras, setCompras] =
    useState([]);

  const [proveedores, setProveedores] =
    useState([]);

  const [productos, setProductos] =
    useState([]);

  const [sucursales, setSucursales] =
    useState([]);

  const [cajas, setCajas] =
    useState([]);

  const [proveedorId, setProveedorId] =
    useState("");

  const [sucursalId, setSucursalId] =
    useState("");

  const [numeroDocumento, setNumeroDocumento] =
    useState("");

  const [metodoPago, setMetodoPago] =
    useState("EFECTIVO");

  const [cajaId, setCajaId] =
    useState("");

  const [observaciones, setObservaciones] =
    useState("");


  // PRODUCTO A AGREGAR

  const [productoId, setProductoId] =
    useState("");

  const [cantidad, setCantidad] =
    useState("1");

  const [costoUnitario, setCostoUnitario] =
    useState("");

  const [numeroLote, setNumeroLote] =
    useState("");

  const [fechaVencimiento, setFechaVencimiento] =
    useState("");


  // CARRITO Y MENSAJES

  const [items, setItems] =
    useState([]);

  const [guardando, setGuardando] =
    useState(false);

  const [cargando, setCargando] =
    useState(false);

  const [mensaje, setMensaje] =
    useState("");

  const [error, setError] =
    useState("");


  // ========================================
  // PRODUCTO SELECCIONADO
  // ========================================

  const productoElegido = productos.find(
    (p) => p.id === productoId
  );

  const llevaLote =
    productoElegido?.controlaVencimiento === true;

  const hoy = fechaLocal();


  // ========================================
  // CAJAS DE LA SUCURSAL
  // ========================================

  const cajasSucursal = useMemo(
    () =>
      cajas.filter(
        (c) =>
          c.estado === "ABIERTA" &&
          c.sucursalId === sucursalId
      ),
    [cajas, sucursalId]
  );


  // ========================================
  // TOTAL DE COMPRA
  // ========================================

  const total = useMemo(
    () =>
      items.reduce(
        (suma, item) =>
          suma +
          Number(item.cantidad) *
          Number(item.costoUnitario),
        0
      ),
    [items]
  );


  // ========================================
  // CARGAR DATOS
  // ========================================

  async function cargar() {
    if (!empresaId) return;

    setCargando(true);

    try {
      const [
        catalogos,
        historial
      ] = await Promise.all([
        obtenerCatalogosCompra(empresaId),
        listarCompras(empresaId)
      ]);

      setProveedores(
        catalogos.proveedores
      );

      setProductos(
        catalogos.productos
      );

      setSucursales(
        catalogos.sucursales
      );

      setCajas(
        catalogos.cajas
      );

      setCompras(
        historial
      );
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
        "No se pudo cargar el módulo de compras."
      );
    } finally {
      setCargando(false);
    }
  }


  useEffect(() => {
    if (empresaId) {
      cargar();
    }
  }, [empresaId]);


  // ========================================
  // AGREGAR PRODUCTO O LOTE
  // ========================================

  function agregarItem() {
    setError("");

    const producto =
      productoElegido;

    const qty =
      Number(cantidad);

    const costo =
      Number(costoUnitario);


    if (!sucursalId) {
      setError(
        "Primero selecciona la sucursal."
      );

      return;
    }

    if (
      !producto ||
      !Number.isFinite(qty) ||
      qty <= 0 ||
      !Number.isFinite(costo) ||
      costo < 0
    ) {
      setError(
        "Selecciona producto, cantidad y costo válidos."
      );

      return;
    }


    // VALIDAR LOTE SI EL PRODUCTO VENCE

    if (llevaLote) {
      if (
        !numeroLote.trim() ||
        !fechaVencimiento
      ) {
        setError(
          "Este producto requiere número de lote y fecha de vencimiento."
        );

        return;
      }

      if (
        fechaVencimiento < hoy
      ) {
        setError(
          "No puedes ingresar un lote ya vencido como stock vendible."
        );

        return;
      }
    }


    if (items.length >= 12) {
      setError(
        "Se permiten como máximo 12 líneas por compra."
      );

      return;
    }


    // CADA LINEA TIENE SU IDENTIFICADOR

    const idLinea =
      typeof crypto !== "undefined" &&
      crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;


    setItems((anteriores) => [
      ...anteriores,
      {
        idLinea,

        productoId:
          producto.id,

        nombreProducto:
          producto.nombre,

        sku:
          producto.sku,

        cantidad:
          qty,

        costoUnitario:
          costo,

        controlaVencimiento:
          llevaLote,

        numeroLote: llevaLote
          ? numeroLote.trim().toUpperCase()
          : "",

        fechaVencimiento: llevaLote
          ? fechaVencimiento
          : ""
      }
    ]);


    // LIMPIAR CAMPOS

    setProductoId("");
    setCantidad("1");
    setCostoUnitario("");
    setNumeroLote("");
    setFechaVencimiento("");
  }


  // ========================================
  // REGISTRAR COMPRA
  // ========================================

  async function guardarCompra() {
    if (guardando) return;

    if (!items.length) {
      setError(
        "Agrega al menos un producto."
      );

      return;
    }

    setGuardando(true);
    setMensaje("");
    setError("");

    try {
      const compraId =
        await registrarCompra({
          empresaId,
          sucursalId,
          proveedorId,
          numeroDocumento,
          metodoPago,

          cajaId:
            metodoPago === "EFECTIVO"
              ? cajaId
              : null,

          observaciones,
          items,

          usuarioId:
            usuario.uid
        });

      setMensaje(
        `Compra registrada: ${compraId}`
      );

      setNumeroDocumento("");
      setObservaciones("");
      setItems([]);
      setCajaId("");

      await cargar();
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
        "No se pudo registrar la compra."
      );
    } finally {
      setGuardando(false);
    }
  }


  // ========================================
  // MOSTRAR NOMBRES
  // ========================================

  const nombreProveedor = (id) =>
    proveedores.find(
      (p) => p.id === id
    )?.nombre || "Proveedor";

  const nombreSucursal = (id) =>
    sucursales.find(
      (s) => s.id === id
    )?.nombre || "Sucursal";


  // ========================================
  // INTERFAZ
  // ========================================

  return (
    <div>

      {/* ENCABEZADO */}

      <div className="admin-page-header">
        <div>
          <h1>Compras</h1>

          <p>
            Entradas de stock con lotes y
            vencimientos opcionales.
          </p>
        </div>

        <button
          type="button"
          className="admin-refresh-button"
          onClick={cargar}
          disabled={cargando}
        >
          <RefreshCw size={18} />
        </button>
      </div>


      <div className="commerce-two-column">

        {/* FORMULARIO */}

        <section className="admin-card">

          <div className="admin-card-header">
            <h2>Nueva compra</h2>

            <p>
              Registra productos y sus lotes
              por sucursal.
            </p>
          </div>


          {/* DATOS GENERALES */}

          <div className="admin-form-grid">

            <div className="admin-form-group">
              <label>Proveedor *</label>

              <select
                value={proveedorId}
                onChange={(e) =>
                  setProveedorId(
                    e.target.value
                  )
                }
              >
                <option value="">
                  Seleccionar
                </option>

                {proveedores.map((p) => (
                  <option
                    key={p.id}
                    value={p.id}
                  >
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>


            <div className="admin-form-group">
              <label>Sucursal *</label>

              <select
                value={sucursalId}
                onChange={(e) => {
                  if (
                    items.length &&
                    !window.confirm(
                      "Cambiar sucursal eliminará las líneas de esta compra. ¿Continuar?"
                    )
                  ) {
                    return;
                  }

                  setSucursalId(
                    e.target.value
                  );

                  setCajaId("");
                  setItems([]);
                }}
              >
                <option value="">
                  Seleccionar
                </option>

                {sucursales.map((s) => (
                  <option
                    key={s.id}
                    value={s.id}
                  >
                    {s.nombre}
                  </option>
                ))}
              </select>
            </div>


            <div className="admin-form-group">
              <label>N° documento</label>

              <input
                value={numeroDocumento}
                onChange={(e) =>
                  setNumeroDocumento(
                    e.target.value
                  )
                }
                placeholder="FAC-001"
              />
            </div>


            <div className="admin-form-group">
              <label>Método de pago</label>

              <select
                value={metodoPago}
                onChange={(e) => {
                  setMetodoPago(
                    e.target.value
                  );

                  setCajaId("");
                }}
              >
                <option value="EFECTIVO">
                  Efectivo
                </option>

                <option value="QR">
                  QR
                </option>

                <option value="TARJETA">
                  Tarjeta
                </option>

                <option value="CREDITO">
                  Crédito
                </option>
              </select>
            </div>


            {metodoPago === "EFECTIVO" && (
              <div className="admin-form-group full">
                <label>Caja abierta *</label>

                <select
                  value={cajaId}
                  onChange={(e) =>
                    setCajaId(
                      e.target.value
                    )
                  }
                >
                  <option value="">
                    Seleccionar
                  </option>

                  {cajasSucursal.map((c) => (
                    <option
                      key={c.id}
                      value={c.id}
                    >
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>


          {/* ================================= */}
          {/* AGREGAR PRODUCTO */}
          {/* ================================= */}

          <div
            style={{
              marginTop: 18,
              padding: 17,
              borderRadius: 16,
              border: "1px solid #54417d",
              background:
                "linear-gradient(125deg,rgba(126,87,255,.12),rgba(19,21,37,.85))"
            }}
          >

            <h3
              style={{
                margin: "0 0 10px",
                fontSize: 16
              }}
            >
              Agregar producto
            </h3>


            <div className="admin-form-grid">

              <div className="admin-form-group full">
                <label>Producto *</label>

                <select
                  value={productoId}
                  onChange={(e) => {
                    const id =
                      e.target.value;

                    const p = productos.find(
                      (x) => x.id === id
                    );

                    setProductoId(id);

                    setCostoUnitario(
                      p
                        ? String(
                            p.costo ?? 0
                          )
                        : ""
                    );

                    setNumeroLote("");
                    setFechaVencimiento("");
                  }}
                >
                  <option value="">
                    Seleccionar producto
                  </option>

                  {productos.map((p) => (
                    <option
                      key={p.id}
                      value={p.id}
                    >
                      {p.sku} - {p.nombre}
                      {p.controlaVencimiento
                        ? " - Controla vencimiento"
                        : ""}
                    </option>
                  ))}
                </select>
              </div>


              <div className="admin-form-group">
                <label>Cantidad *</label>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={cantidad}
                  onChange={(e) =>
                    setCantidad(
                      e.target.value
                    )
                  }
                />
              </div>


              <div className="admin-form-group">
                <label>
                  Costo por unidad (Bs) *
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={costoUnitario}
                  onChange={(e) =>
                    setCostoUnitario(
                      e.target.value
                    )
                  }
                />
              </div>


              {/* CAMPOS DE VENCIMIENTO */}

              {llevaLote && (
                <>

                  <div className="admin-form-group full">

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        color: "#bbaaff",
                        fontWeight: 700
                      }}
                    >
                      <CalendarDays size={17} />

                      Control de vencimiento habilitado
                    </div>

                    <small
                      style={{
                        opacity: 0.82
                      }}
                    >
                      Este producto requiere lote y
                      fecha de vencimiento.
                    </small>
                  </div>


                  <div className="admin-form-group">
                    <label>
                      Número de lote *
                    </label>

                    <input
                      value={numeroLote}
                      maxLength={60}
                      onChange={(e) =>
                        setNumeroLote(
                          e.target.value
                        )
                      }
                      placeholder="LOTE-001"
                    />
                  </div>


                  <div className="admin-form-group">
                    <label>
                      Fecha de vencimiento *
                    </label>

                    <input
                      type="date"
                      min={hoy}
                      value={fechaVencimiento}
                      onChange={(e) =>
                        setFechaVencimiento(
                          e.target.value
                        )
                      }
                    />
                  </div>

                </>
              )}

            </div>


            <button
              type="button"
              className="admin-primary-button"
              onClick={agregarItem}
              style={{
                marginTop: 14
              }}
            >
              <Plus size={17} />

              Agregar a la compra
            </button>

          </div>


          {/* ================================= */}
          {/* PRODUCTOS AGREGADOS */}
          {/* ================================= */}

          <div
            className="commerce-cart-list"
            style={{
              marginTop: 14
            }}
          >

            {items.map((item) => (
              <div
                className="commerce-cart-row"
                key={item.idLinea}
              >
                <div>
                  <strong>
                    {item.nombreProducto}
                  </strong>

                  <span>
                    {item.sku}
                  </span>


                  {item.controlaVencimiento && (
                    <small
                      style={{
                        display: "block",
                        marginTop: 5,
                        color: "#bda8ff"
                      }}
                    >
                      Lote: {item.numeroLote}
                      {" · "}
                      Vence: {item.fechaVencimiento}
                    </small>
                  )}
                </div>


                <span>
                  {item.cantidad}
                  {" × "}
                  {moneda(
                    item.costoUnitario
                  )}
                </span>


                <strong>
                  {moneda(
                    item.cantidad *
                    item.costoUnitario
                  )}
                </strong>


                <button
                  type="button"
                  aria-label="Quitar producto"
                  onClick={() =>
                    setItems(
                      (anteriores) =>
                        anteriores.filter(
                          (i) =>
                            i.idLinea !==
                            item.idLinea
                        )
                    )
                  }
                >
                  <Trash2 size={16} />
                </button>

              </div>
            ))}


            {items.length === 0 && (
              <div className="commerce-empty-cart">
                <ShoppingBag size={30} />

                <span>
                  Agrega productos y lotes
                  a la compra.
                </span>
              </div>
            )}

          </div>


          {/* OBSERVACIONES */}

          <div
            className="admin-form-group"
            style={{
              marginTop: 15
            }}
          >
            <label>Observaciones</label>

            <textarea
              value={observaciones}
              onChange={(e) =>
                setObservaciones(
                  e.target.value
                )
              }
            />
          </div>


          {/* MENSAJES */}

          {mensaje && (
            <div className="admin-message success">
              {mensaje}
            </div>
          )}

          {error && (
            <div className="admin-message error">
              {error}
            </div>
          )}


          {/* TOTAL */}

          <div className="commerce-total">
            <span>
              Total compra
            </span>

            <strong>
              {moneda(total)}
            </strong>
          </div>


          {/* GUARDAR */}

          <button
            type="button"
            className="admin-primary-button commerce-submit"
            onClick={guardarCompra}
            disabled={
              guardando ||
              items.length === 0
            }
          >
            {guardando
              ? "Registrando..."
              : "Registrar compra"}
          </button>

        </section>


        {/* ================================= */}
        {/* COMPRAS RECIENTES */}
        {/* ================================= */}

        <section className="admin-card">

          <div className="admin-card-header">
            <h2>
              Compras recientes
            </h2>

            <p>
              Historial de compras registradas.
            </p>
          </div>


          <div className="commerce-history">

            {compras
              .slice(0, 12)
              .map((compra) => (
                <article key={compra.id}>

                  <div>
                    <strong>
                      {nombreProveedor(
                        compra.proveedorId
                      )}
                    </strong>

                    <span>
                      {nombreSucursal(
                        compra.sucursalId
                      )}
                      {" · "}
                      {compra.metodoPago}
                    </span>
                  </div>


                  <strong>
                    {moneda(
                      compra.total
                    )}
                  </strong>

                </article>
              ))}


            {compras.length === 0 && (
              <div className="admin-empty">
                No existen compras.
              </div>
            )}

          </div>
        </section>

      </div>

    </div>
  );
}

export default ComprasPage;