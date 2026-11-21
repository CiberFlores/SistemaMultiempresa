import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import {
  AlertTriangle,
  Check,
  ChevronDown,
  Minus,
  PackageCheck,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
  UserRound
} from "lucide-react";

import useAuth from "../../hooks/useAuth";

import {
  obtenerCatalogosVenta,
  registrarVenta
} from "../../services/ventaService";


// ==========================================
// A. FUNCIONES AUXILIARES
// ==========================================

// FORMATEAR CANTIDADES

function mostrarCantidad(valor) {
  return Number(valor || 0).toLocaleString("es-BO", {
    maximumFractionDigits: 2
  });
}


// FORMATEAR PRECIOS

function mostrarDinero(valor) {
  return Number(valor || 0).toFixed(2);
}


// NORMALIZAR TEXTOS

function normalizar(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}


// ==========================================
// B. COMPONENTE PRINCIPAL
// ==========================================

function PosPage() {

  const { usuario } = useAuth();

  const empresaId = usuario?.empresaId;


  // ========================================
  // C. DATOS DE FIREBASE
  // ========================================

  const [clientes, setClientes] = useState([]);

  const [productos, setProductos] = useState([]);

  const [sucursales, setSucursales] = useState([]);

  const [inventarios, setInventarios] = useState([]);

  const [cajas, setCajas] = useState([]);


  // ========================================
  // D. DATOS DE LA VENTA
  // ========================================

  const [sucursalId, setSucursalId] = useState("");

  const [clienteId, setClienteId] = useState("");

  const [busquedaCliente, setBusquedaCliente] = useState("");

  const [mostrarClientes, setMostrarClientes] = useState(false);

  const [metodoPago, setMetodoPago] = useState("EFECTIVO");

  const [cajaId, setCajaId] = useState("");

  const [busqueda, setBusqueda] = useState("");

  const [descuento, setDescuento] = useState("0");

  const [observaciones, setObservaciones] = useState("");


  // ========================================
  // E. CARRITO Y MENSAJES
  // ========================================

  const [carrito, setCarrito] = useState([]);

  const [guardando, setGuardando] = useState(false);

  const [cargando, setCargando] = useState(true);

  const [mensaje, setMensaje] = useState("");

  const [error, setError] = useState("");


  // EVITA QUE UNA CONSULTA ANTIGUA
  // SOBRESCRIBA LOS DATOS ACTUALES.

  const solicitudRef = useRef(0);


  // ========================================
  // F. CARGAR CATÁLOGOS
  // ========================================

  const cargar = useCallback(async () => {

    const solicitud = ++solicitudRef.current;

    if (!empresaId) {
      setCargando(false);
      return;
    }

    setCargando(true);

    try {

      const catalogos = await obtenerCatalogosVenta(
        empresaId
      );

      if (solicitud !== solicitudRef.current) {
        return;
      }

      setClientes(catalogos.clientes || []);

      setProductos(catalogos.productos || []);

      setSucursales(catalogos.sucursales || []);

      setInventarios(catalogos.inventarios || []);

      setCajas(catalogos.cajas || []);

    } catch (err) {

      console.error(err);

      if (solicitud === solicitudRef.current) {

        setError(
          err.message ||
          "No se pudieron cargar los datos del punto de venta."
        );

      }

      throw err;

    } finally {

      if (solicitud === solicitudRef.current) {
        setCargando(false);
      }

    }

  }, [empresaId]);


  // ========================================
  // G. CARGAR AL ENTRAR
  // ========================================

  useEffect(() => {

    setSucursalId("");

    setClienteId("");

    setCajaId("");

    setCarrito([]);

    setMensaje("");

    setError("");

    cargar().catch(console.error);

    return () => {
      solicitudRef.current += 1;
    };

  }, [cargar]);


  // ========================================
  // H. ACTUALIZAR MANUALMENTE
  // ========================================

  async function actualizar() {

    if (guardando || cargando) return;

    setError("");

    setMensaje("");

    try {

      await cargar();

      setMensaje(
        "Productos, existencias y cajas actualizados."
      );

    } catch (err) {

      console.error(err);

    }

  }


  // ========================================
  // I. MAPA DE INVENTARIOS
  // ========================================

  const inventarioPorClave = useMemo(() => {

    const mapa = new Map();

    inventarios.forEach((inventario) => {

      const clave =
        `${inventario.sucursalId}_${inventario.productoId}`;

      mapa.set(clave, inventario);

    });

    return mapa;

  }, [inventarios]);


  // ========================================
  // J. OBTENER EXISTENCIAS
  // ========================================

  function obtenerExistencia(productoId) {

    if (!sucursalId || !productoId) {

      return {
        vendible: 0,
        fisico: 0,
        noVendible: 0
      };

    }

    const clave = `${sucursalId}_${productoId}`;

    const inventario = inventarioPorClave.get(clave);

    if (!inventario) {

      return {
        vendible: 0,
        fisico: 0,
        noVendible: 0
      };

    }


    // EL SERVICIO DE VENTAS ENTREGA "STOCK"
    // COMO CANTIDAD VENDIBLE CUANDO EL
    // PRODUCTO CONTROLA VENCIMIENTOS.

    const vendible = Math.max(
      0,
      Number(inventario.stock) || 0
    );


    // STOCK FISICO ORIGINAL.
    // EL SERVICIO LO INCLUYE EN PRODUCTOS
    // QUE CONTROLAN VENCIMIENTOS.

    const fisico = Math.max(
      0,
      Number(
        inventario.stockFisico ??
        inventario.stock ??
        0
      ) || 0
    );


    const noVendible = Math.max(
      0,
      fisico - vendible
    );


    return {
      vendible,
      fisico,
      noVendible
    };

  }


  // ========================================
  // K. STOCK VENDIBLE DE UN PRODUCTO
  // ========================================

  function stockProducto(productoId) {

    return obtenerExistencia(
      productoId
    ).vendible;

  }


  // ========================================
  // L. AGREGAR PRODUCTO AL CARRITO
  // ========================================

  function agregar(producto) {

    setError("");

    setMensaje("");

    if (!sucursalId) {

      setError(
        "Primero selecciona una sucursal."
      );

      return;
    }

    if (cargando) {

      setError(
        "Los productos todavía se están actualizando."
      );

      return;
    }

    const stock = stockProducto(producto.id);

    if (stock < 1) {

      setError(

        producto.controlaVencimiento === true

          ? "Este producto no tiene unidades vendibles. " +
            "Revisa sus lotes vigentes en Inventario."

          : "Este producto no tiene stock suficiente " +
            "en la sucursal seleccionada."

      );

      return;
    }


    const existente = carrito.find(
      (item) => item.productoId === producto.id
    );

    if (
      existente &&
      existente.cantidad + 1 > stock
    ) {

      setError(
        `Solo hay ${mostrarCantidad(stock)} unidades disponibles de ${producto.nombre}.`
      );

      return;
    }


    // CONSERVAR DATOS DEL PRODUCTO

    setCarrito((anterior) => {

      const itemExistente = anterior.find(
        (item) => item.productoId === producto.id
      );

      if (itemExistente) {

        return anterior.map((item) =>

          item.productoId === producto.id

            ? {
                ...item,

                cantidad: Math.min(
                  stock,
                  item.cantidad + 1
                )
              }

            : item
        );

      }


      return [

        ...anterior,

        {
          productoId: producto.id,

          nombreProducto: producto.nombre,

          sku: producto.sku,

          precioUnitario: Number(
            producto.precioVenta || 0
          ),

          cantidad: 1
        }

      ];

    });

  }


  // ========================================
  // M. CAMBIAR CANTIDAD DEL CARRITO
  // ========================================

  function cambiarCantidad(productoId, delta) {

    setError("");

    const stock = stockProducto(productoId);

    setCarrito((anterior) =>

      anterior.map((item) => {

        if (item.productoId !== productoId) {
          return item;
        }

        const nuevaCantidad =
          item.cantidad + delta;

        if (nuevaCantidad < 1) {
          return item;
        }

        if (
          delta > 0 &&
          nuevaCantidad > stock
        ) {
          return item;
        }

        return {
          ...item,

          cantidad: nuevaCantidad
        };

      })

    );

  }


  // ========================================
  // N. ELIMINAR PRODUCTO
  // ========================================

  function eliminar(productoId) {

    setCarrito((anterior) =>

      anterior.filter(
        (item) => item.productoId !== productoId
      )

    );

    setError("");

  }


  // ========================================
  // O. CALCULAR TOTALES
  // ========================================

  const subtotal = carrito.reduce(

    (suma, item) =>

      suma +
      item.cantidad *
      item.precioUnitario,

    0

  );


  const descuentoNumero =
    Number(descuento || 0);


  const descuentoValido =

    Number.isFinite(descuentoNumero) &&

    descuentoNumero >= 0 &&

    descuentoNumero <= subtotal;


  const total = Math.max(
    0,
    subtotal - (
      descuentoValido
        ? descuentoNumero
        : 0
    )
  );


  // ========================================
  // P. FILTRAR PRODUCTOS
  // ========================================

  const productosFiltrados = useMemo(() => {

    const texto = normalizar(busqueda);

    return productos.filter((producto) =>

      normalizar(producto.nombre).includes(texto) ||

      normalizar(producto.sku).includes(texto) ||

      normalizar(producto.codigoBarras).includes(texto)

    );

  }, [
    productos,
    busqueda
  ]);


  // ========================================
  // Q. FILTRAR CLIENTES
  // ========================================

  const clientesFiltrados = useMemo(() => {

    const texto = normalizar(busquedaCliente);

    return clientes

      .filter(
        (cliente) =>
          cliente.estado === "ACTIVO"
      )

      .filter((cliente) => {

        if (!texto) return true;

        return [

          cliente.nombre,

          cliente.codigo,

          cliente.documento,

          cliente.telefono,

          cliente.correo

        ].some(
          (valor) =>
            normalizar(valor).includes(texto)
        );

      })

      .slice(0, 8);

  }, [
    clientes,
    busquedaCliente
  ]);


  // ========================================
  // R. CLIENTE SELECCIONADO
  // ========================================

  const clienteSeleccionado = clientes.find(
    (cliente) => cliente.id === clienteId
  );


  // ========================================
  // S. CAJAS ABIERTAS DE LA SUCURSAL
  // ========================================

  const cajasSucursal = cajas.filter(

    (caja) =>

      caja.estado === "ABIERTA" &&

      (!sucursalId || caja.sucursalId === sucursalId)

  );


  // ========================================
  // T. VALIDAR EL CARRITO
  // ========================================

  const carritoSinStock = carrito.some(
    (item) =>

      item.cantidad >
      stockProducto(item.productoId)

  );


  // ========================================
  // U. COMPLETAR VENTA
  // ========================================

  async function vender() {

    if (guardando) return;

    setError("");

    setMensaje("");


    // VALIDACIONES ANTES DE GUARDAR

    if (!empresaId || !usuario?.uid) {

      setError(
        "No se pudo identificar al usuario o empresa."
      );

      return;
    }


    if (!sucursalId) {

      setError(
        "Debes seleccionar una sucursal."
      );

      return;
    }


    if (cargando) {

      setError(
        "Espera a que terminen de cargar las existencias."
      );

      return;
    }


    if (carrito.length === 0) {

      setError(
        "Agrega productos al carrito."
      );

      return;
    }


    if (carrito.length > 20) {

      setError(
        "Una venta permite como máximo 20 productos diferentes."
      );

      return;
    }


    if (carritoSinStock) {

      setError(
        "Hay productos en el carrito que superan " +
        "el stock vendible actual. Revisa las cantidades."
      );

      return;
    }


    if (!descuentoValido) {

      setError(
        "El descuento debe estar entre cero y el subtotal."
      );

      return;
    }


    if (
      metodoPago === "EFECTIVO" &&
      !cajaId
    ) {

      setError(
        "Selecciona una caja abierta para cobrar en efectivo."
      );

      return;
    }


    if (
      metodoPago === "CREDITO" &&
      !clienteId
    ) {

      setError(
        "Las ventas a crédito necesitan un cliente registrado."
      );

      return;
    }


    // LA VERSION REVISADA DE ventaService.js
    // TODAVIA NO ACEPTA TRANSFERENCIA.
    // EVITAMOS UN ERROR CONFUSO.

    if (metodoPago === "TRANSFERENCIA") {

      setError(
        "El servicio de ventas todavía necesita habilitar " +
        "el método TRANSFERENCIA. Por ahora utiliza QR, " +
        "tarjeta o efectivo."
      );

      return;
    }


    // ======================================
    // REGISTRAR LA VENTA
    // ======================================

    setGuardando(true);

    try {

      const ventaId = await registrarVenta({

        empresaId,

        sucursalId,

        clienteId,

        metodoPago,

        cajaId:
          metodoPago === "EFECTIVO"
            ? cajaId
            : null,

        descuento: descuentoNumero,

        observaciones,

        items: carrito,

        usuarioId: usuario.uid

      });


      // SI LLEGAMOS AQUI, FIREBASE YA
      // CONFIRMO LA OPERACION PRINCIPAL.

      setMensaje(
        `Venta completada correctamente: ${ventaId}`
      );

      setCarrito([]);

      setClienteId("");

      setBusquedaCliente("");

      setMostrarClientes(false);

      setDescuento("0");

      setObservaciones("");


      // ACTUALIZAR EXISTENCIAS Y LOTES

      try {

        await cargar();

      } catch (errorActualizacion) {

        console.error(errorActualizacion);

        setMensaje(
          `Venta ${ventaId} registrada. ` +
          "No se pudieron actualizar las existencias; " +
          "presiona Actualizar."
        );

      }

    } catch (err) {

      console.error(err);

      setError(
        err.message ||
        "No se pudo registrar la venta."
      );

    } finally {

      setGuardando(false);

    }

  }


  // ========================================
  // V. CAMBIAR SUCURSAL
  // ========================================

  function cambiarSucursal(nuevaSucursal) {

    setSucursalId(nuevaSucursal);

    // EL CARRITO ES DIFERENTE POR SUCURSAL.

    setCarrito([]);

    setCajaId("");

    setError("");

    setMensaje("");

  }


  // ========================================
  // W. INTERFAZ PRINCIPAL
  // ========================================

  return (

    <div>

      {/* ================================= */}
      {/* ENCABEZADO */}
      {/* ================================= */}

      <div className="admin-page-header">

        <div>

          <h1>
            Punto de venta
          </h1>

          <p>
            Venta rápida con control de stock,
            lotes vigentes y caja.
          </p>

        </div>


        <button
          type="button"
          className="admin-secondary-button"
          onClick={actualizar}
          disabled={cargando || guardando}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8
          }}
        >

          <RefreshCw size={17} />

          {cargando
            ? "Actualizando..."
            : "Actualizar"}

        </button>

      </div>


      {/* ================================= */}
      {/* MENSAJES */}
      {/* ================================= */}

      {mensaje && (

        <div
          className="admin-message success"
          style={{ marginBottom: 16 }}
        >
          <Check
            size={17}
            style={{
              verticalAlign: "middle",
              marginRight: 8
            }}
          />

          {mensaje}
        </div>

      )}


      {error && (

        <div
          className="admin-message error"
          style={{ marginBottom: 16 }}
        >
          {error}
        </div>

      )}


      {/* ================================= */}
      {/* AVISO DE VENCIMIENTOS */}
      {/* ================================= */}

      <div
        style={{
          padding: "12px 16px",
          marginBottom: 18,
          borderRadius: 12,
          background: "rgba(124,93,255,.09)",
          border: "1px solid rgba(124,93,255,.22)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 13
        }}
      >

        <PackageCheck
          size={19}
          style={{ color: "#a891ff" }}
        />

        <span>
          Los productos con control de vencimiento
          solo muestran sus unidades vendibles.
          Los lotes vencidos o sin existencias
          válidas no se pueden vender.
        </span>

      </div>


      {/* ================================= */}
      {/* DISEÑO ORIGINAL DEL POS */}
      {/* ================================= */}

      <div className="pos-layout">

        {/* =============================== */}
        {/* PRODUCTOS */}
        {/* =============================== */}

        <section className="admin-card pos-products">

          {/* FILTROS */}

          <div className="pos-top-filters">

            <select
              value={sucursalId}
              onChange={(e) =>
                cambiarSucursal(e.target.value)
              }
              disabled={guardando}
            >

              <option value="">
                Seleccionar sucursal
              </option>

              {sucursales.map((sucursal) => (

                <option
                  key={sucursal.id}
                  value={sucursal.id}
                >
                  {sucursal.nombre}
                </option>

              ))}

            </select>


            <div className="admin-search pos-search">

              <Search size={18} />

              <input
                type="text"
                placeholder="Buscar producto, SKU o código de barras..."
                value={busqueda}
                onChange={(e) =>
                  setBusqueda(e.target.value)
                }
              />

            </div>

          </div>


          {/* CARGANDO */}

          {cargando && (

            <div
              className="admin-loading-box"
              style={{ marginBottom: 15 }}
            >
              <RefreshCw size={20} />

              Cargando productos y existencias...
            </div>

          )}


          {/* TARJETAS DE PRODUCTOS */}

          <div className="pos-product-grid">

            {productosFiltrados.map((producto) => {

              const existencia = obtenerExistencia(
                producto.id
              );

              const stock = existencia.vendible;

              const controlaVencimiento =
                producto.controlaVencimiento === true;

              const sinStock = stock < 1;

              return (

                <button
                  type="button"
                  key={producto.id}
                  className="pos-product-card"
                  onClick={() =>
                    agregar(producto)
                  }
                  disabled={
                    !sucursalId ||
                    sinStock ||
                    cargando ||
                    guardando
                  }
                  title={
                    controlaVencimiento && sinStock
                      ? "Sin unidades disponibles en lotes vigentes"
                      : producto.nombre
                  }
                >

                  {/* IMAGEN */}

                  <div className="pos-product-image">

                    {producto.imagenUrl ? (

                      <img
                        src={producto.imagenUrl}
                        alt={producto.nombre}
                        loading="lazy"
                      />

                    ) : (

                      <ShoppingCart size={25} />

                    )}

                  </div>


                  {/* INFORMACION */}

                  <strong>
                    {producto.nombre}
                  </strong>

                  <span>
                    {producto.sku || "Sin SKU"}
                  </span>


                  {/* CONTROL DE VENCIMIENTO */}

                  {controlaVencimiento && (

                    <small
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        color: "#bba8ff",
                        fontSize: 11
                      }}
                    >

                      <PackageCheck size={13} />

                      Control por lotes

                    </small>

                  )}


                  {/* PRECIO Y STOCK */}

                  <div>

                    <b>
                      Bs {mostrarDinero(
                        producto.precioVenta
                      )}
                    </b>

                    <small
                      style={{
                        color:
                          stock >= 1
                            ? "#69dab4"
                            : "#ff898f"
                      }}
                    >

                      {controlaVencimiento
                        ? "Vendible: "
                        : "Stock: "}

                      {mostrarCantidad(stock)}

                    </small>

                  </div>


                  {/* UNIDADES NO VENDIBLES */}

                  {controlaVencimiento &&
                    existencia.noVendible > 0 && (

                    <small
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        color: "#ffc783",
                        fontSize: 11
                      }}
                    >

                      <AlertTriangle size={13} />

                      {mostrarCantidad(
                        existencia.noVendible
                      )}

                      {" "}unidad(es) no vendibles

                    </small>

                  )}


                  {/* SIN LOTES VIGENTES */}

                  {controlaVencimiento &&
                    sinStock && (

                    <small
                      style={{
                        color: "#ff898f",
                        fontSize: 11
                      }}
                    >
                      Sin lotes disponibles
                    </small>

                  )}

                </button>

              );

            })}

          </div>


          {/* SIN PRODUCTOS */}

          {!cargando &&
            productosFiltrados.length === 0 && (

            <div className="admin-empty admin-empty-column">

              <ShoppingCart size={30} />

              <strong>
                No encontramos productos.
              </strong>

            </div>

          )}

        </section>


        {/* =============================== */}
        {/* CARRITO */}
        {/* =============================== */}

        <aside className="admin-card pos-cart">

          <div className="admin-card-header">

            <h2>
              Venta actual
            </h2>

            <p>
              {carrito.length} producto(s) diferentes
            </p>

          </div>


          {/* ============================= */}
          {/* SELECTOR DE CLIENTES */}
          {/* ============================= */}

          <div className="admin-form-group pos-cliente-field">

            <label>
              Cliente
            </label>


            <button
              type="button"
              className="pos-cliente-toggle"
              onClick={() => {

                setMostrarClientes(!mostrarClientes);

                setBusquedaCliente("");

              }}
              disabled={guardando}
            >

              <div className="pos-cliente-selected">

                <UserRound size={18} />

                <span>

                  {clienteSeleccionado
                    ? clienteSeleccionado.nombre
                    : "Consumidor final"}

                </span>

              </div>

              <ChevronDown size={18} />

            </button>


            {mostrarClientes && (

              <div className="pos-cliente-dropdown">

                {/* BUSCADOR */}

                <div className="pos-cliente-search">

                  <Search size={18} />

                  <input
                    type="text"
                    placeholder="Buscar nombre, CI o teléfono..."
                    value={busquedaCliente}
                    onChange={(e) =>
                      setBusquedaCliente(e.target.value)
                    }
                    autoFocus
                  />

                </div>


                {/* CONSUMIDOR FINAL */}

                <button
                  type="button"
                  className="pos-cliente-option"
                  onClick={() => {

                    setClienteId("");

                    setMostrarClientes(false);

                    setBusquedaCliente("");

                  }}
                >

                  <div className="pos-cliente-avatar">
                    <UserRound size={20} />
                  </div>


                  <div className="pos-cliente-info">

                    <strong>
                      Consumidor final
                    </strong>

                    <small>
                      Venta sin cliente registrado
                    </small>

                  </div>


                  {!clienteId && (
                    <Check size={17} />
                  )}

                </button>


                {/* CLIENTES REGISTRADOS */}

                <div className="pos-cliente-results">

                  {clientesFiltrados.map((cliente) => (

                    <button
                      type="button"
                      key={cliente.id}
                      className="pos-cliente-option"
                      onClick={() => {

                        setClienteId(cliente.id);

                        setMostrarClientes(false);

                        setBusquedaCliente("");

                      }}
                    >

                      <div className="pos-cliente-avatar">
                        <UserRound size={20} />
                      </div>


                      <div className="pos-cliente-info">

                        <strong>
                          {cliente.nombre}
                        </strong>

                        <small>

                          {cliente.documento

                            ? `CI/NIT: ${cliente.documento}`

                            : "Sin documento"}

                          {cliente.telefono
                            ? ` · Tel: ${cliente.telefono}`
                            : ""}

                        </small>

                      </div>


                      {clienteId === cliente.id && (
                        <Check size={17} />
                      )}

                    </button>

                  ))}


                  {clientesFiltrados.length === 0 && (

                    <div className="pos-cliente-empty">

                      No encontramos clientes
                      con esa búsqueda.

                    </div>

                  )}

                </div>

              </div>

            )}

          </div>


          {/* ============================= */}
          {/* PRODUCTOS EN EL CARRITO */}
          {/* ============================= */}

          <div className="pos-cart-lines">

            {carrito.map((item) => {

              const stockActual = stockProducto(
                item.productoId
              );

              const excedido =
                item.cantidad > stockActual;


              return (

                <article key={item.productoId}>

                  <div className="pos-cart-info">

                    <strong>
                      {item.nombreProducto}
                    </strong>


                    <span>

                      Precio unitario: Bs{" "}

                      {mostrarDinero(
                        item.precioUnitario
                      )}

                    </span>


                    <span className="pos-line-subtotal">

                      Subtotal: Bs{" "}

                      {mostrarDinero(
                        item.cantidad *
                        item.precioUnitario
                      )}

                    </span>


                    {excedido && (

                      <span
                        style={{
                          color: "#ff898f",
                          fontSize: 11
                        }}
                      >

                        Stock actual:{" "}

                        {mostrarCantidad(stockActual)}

                        {" "}· Reduce la cantidad

                      </span>

                    )}

                  </div>


                  {/* CONTROLES */}

                  <div className="pos-quantity">

                    <button
                      type="button"
                      onClick={() =>
                        cambiarCantidad(
                          item.productoId,
                          -1
                        )
                      }
                      disabled={guardando}
                    >
                      <Minus size={14} />
                    </button>


                    <strong>
                      {mostrarCantidad(item.cantidad)}
                    </strong>


                    <button
                      type="button"
                      onClick={() =>
                        cambiarCantidad(
                          item.productoId,
                          1
                        )
                      }
                      disabled={
                        guardando ||
                        item.cantidad >= stockActual
                      }
                    >
                      <Plus size={14} />
                    </button>

                  </div>


                  {/* ELIMINAR */}

                  <button
                    type="button"
                    className="pos-remove"
                    onClick={() =>
                      eliminar(item.productoId)
                    }
                    disabled={guardando}
                  >

                    <Trash2 size={15} />

                  </button>

                </article>

              );

            })}


            {/* CARRITO VACÍO */}

            {carrito.length === 0 && (

              <div className="commerce-empty-cart">

                <ShoppingCart size={31} />

                <span>
                  Selecciona productos.
                </span>

              </div>

            )}

          </div>


          {/* ============================= */}
          {/* MÉTODO DE PAGO */}
          {/* ============================= */}

          <div className="admin-form-grid pos-payment-grid">

            <div className="admin-form-group">

              <label>
                Pago
              </label>


              <select
                value={metodoPago}
                onChange={(e) => {

                  setMetodoPago(e.target.value);

                  setCajaId("");

                  setError("");

                }}
                disabled={guardando}
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

                <option value="TRANSFERENCIA">
                  Transferencia
                </option>

                <option value="CREDITO">
                  Crédito
                </option>

              </select>

            </div>


            {/* DESCUENTO */}

            <div className="admin-form-group">

              <label>
                Descuento
              </label>


              <input
                type="number"
                min="0"
                step="0.01"
                value={descuento}
                onChange={(e) =>
                  setDescuento(e.target.value)
                }
                disabled={guardando}
              />

            </div>


            {/* SELECCIONAR CAJA */}

            {metodoPago === "EFECTIVO" && (

              <div className="admin-form-group full">

                <label>
                  Caja *
                </label>


                <select
                  value={cajaId}
                  onChange={(e) =>
                    setCajaId(e.target.value)
                  }
                  disabled={guardando}
                >

                  <option value="">
                    Seleccionar caja abierta
                  </option>


                  {cajasSucursal.map((caja) => (

                    <option
                      key={caja.id}
                      value={caja.id}
                    >

                      {caja.nombre || caja.id}

                    </option>

                  ))}

                </select>


                {sucursalId &&
                  cajasSucursal.length === 0 && (

                  <small
                    style={{
                      color: "#ffc783",
                      marginTop: 5
                    }}
                  >

                    No hay cajas abiertas
                    en esta sucursal.

                  </small>

                )}

              </div>

            )}


            {/* AVISO PARA CRÉDITOS */}

            {metodoPago === "CREDITO" &&
              !clienteId && (

              <div
                className="admin-message error full"
              >

                Selecciona un cliente registrado
                para vender a crédito.

              </div>

            )}

          </div>


          {/* ============================= */}
          {/* OBSERVACIONES */}
          {/* ============================= */}

          <div className="admin-form-group">

            <label>
              Observaciones
            </label>


            <textarea
              value={observaciones}
              onChange={(e) =>
                setObservaciones(e.target.value)
              }
              disabled={guardando}
            />

          </div>


          {/* ============================= */}
          {/* RESUMEN DE LA VENTA */}
          {/* ============================= */}

          <div className="pos-totals">

            <div>

              <span>
                Subtotal
              </span>

              <strong>
                Bs {mostrarDinero(subtotal)}
              </strong>

            </div>


            <div>

              <span>
                Descuento
              </span>

              <strong>

                - Bs{" "}

                {mostrarDinero(
                  descuentoValido
                    ? descuentoNumero
                    : 0
                )}

              </strong>

            </div>


            <div className="grand-total">

              <span>
                Total
              </span>

              <strong>
                Bs {mostrarDinero(total)}
              </strong>

            </div>

          </div>


          {/* DESCUENTO INVÁLIDO */}

          {!descuentoValido && (

            <div className="admin-message error">

              El descuento no puede ser negativo
              ni mayor que el subtotal.

            </div>

          )}


          {/* STOCK INSUFICIENTE */}

          {carritoSinStock && (

            <div className="admin-message error">

              El stock vendible cambió.

              Actualiza las cantidades
              antes de completar la venta.

            </div>

          )}


          {/* ============================= */}
          {/* COMPLETAR VENTA */}
          {/* ============================= */}

          <button
            type="button"
            className="admin-primary-button commerce-submit"
            onClick={vender}
            disabled={

              guardando ||

              cargando ||

              carrito.length === 0 ||

              carritoSinStock ||

              !descuentoValido

            }
          >

            {guardando

              ? "Procesando..."

              : "Completar venta"}

          </button>

        </aside>

      </div>

    </div>

  );

}

export default PosPage;