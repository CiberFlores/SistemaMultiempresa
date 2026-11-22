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
  Maximize2,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
  X
} from "lucide-react";

import "../../styles/punto-venta.css";

import useAuth from "../../hooks/useAuth";

import {
  obtenerCatalogosVenta,
  registrarVenta
} from "../../services/ventaService";

import { sonidoCaja, sonidoError, sonidoPop } from "../../utils/sonidos";
import { calcularPromociones, describirDescuento } from "../../utils/promociones";
import { collection, doc, getDocs, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../../services/firebase/firebaseConfig";



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


// NOMBRE: solo letras, espacios, punto, apóstrofo y guion
function limpiarNombre(valor) {
  return String(valor ?? "")
    .replace(/[^\p{L}\s.'-]/gu, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^\s+/, "")
    .slice(0, 60);
}

// NOMBRE: cada palabra empieza con mayúscula
function capitalizarNombre(valor) {
  return String(valor ?? "")
    .trim()
    .toLocaleLowerCase("es")
    .replace(/(^|[\s'-])(\p{L})/gu, (_, antes, letra) => antes + letra.toLocaleUpperCase("es"));
}

// CARNET: solo números, hasta 12 dígitos
function limpiarCarnet(valor) {
  return String(valor ?? "").replace(/\D/g, "").slice(0, 12);
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


  const [productos, setProductos] = useState([]);

  const [sucursales, setSucursales] = useState([]);

  const [inventarios, setInventarios] = useState([]);

  const [cajas, setCajas] = useState([]);


  // ========================================
  // D. DATOS DE LA VENTA
  // ========================================

  const [sucursalId, setSucursalId] = useState("");




  const [metodoPago, setMetodoPago] = useState("EFECTIVO");

  const [cajaId, setCajaId] = useState("");

  const [busqueda, setBusqueda] = useState("");

  const [promociones, setPromociones] = useState([]);

  const [observaciones, setObservaciones] = useState("");


  // ========================================
  // E. CARRITO Y MENSAJES
  // ========================================

  const [carrito, setCarrito] = useState([]);

  const [guardando, setGuardando] = useState(false);

  const [cargando, setCargando] = useState(true);

  const [mensaje, setMensaje] = useState("");

  const [error, setError] = useState("");

  const [nombreCliente, setNombreCliente] = useState("");
  const [documentoCliente, setDocumentoCliente] = useState("");
  const [soloStock, setSoloStock] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [qrEmpresa, setQrEmpresa] = useState({ url: "", activo: false });
  const [qrGrande, setQrGrande] = useState(false);
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [limite, setLimite] = useState(30);


  // EVITA QUE UNA CONSULTA ANTIGUA
  // SOBRESCRIBA LOS DATOS ACTUALES.

  const solicitudRef = useRef(0);

  useEffect(() => {
    if (error) sonidoError();
  }, [error]);

  // El QR de cobro que subió el dueño: si lo cambia, aquí cambia al instante
  useEffect(() => {
    if (!empresaId) return undefined;

    return onSnapshot(
      doc(db, "empresas", empresaId),
      (documento) => {
        const datos = documento.exists() ? documento.data() : {};
        setQrEmpresa({ url: datos.qrCobroUrl || "", activo: datos.qrCobroActivo !== false });
      },
      () => setQrEmpresa({ url: "", activo: false })
    );
  }, [empresaId]);


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


      setProductos(catalogos.productos || []);

      setSucursales(catalogos.sucursales || []);

      const listaSucursales = catalogos.sucursales || [];
      let guardada = "";
      try {
        guardada = localStorage.getItem("an-pos-sucursal") || "";
      } catch {
        /* sin almacenamiento: se usa la primera sucursal */
      }
      const elegida =
        listaSucursales.find((item) => item.id === guardada)?.id ||
        listaSucursales[0]?.id ||
        "";
      if (elegida) {
        setSucursalId((actual) => actual || elegida);
      }

      setInventarios(catalogos.inventarios || []);

      setCajas(catalogos.cajas || []);

      // Las promociones no deben impedir vender si no se pueden leer
      try {
        const lectura = await getDocs(query(collection(db, "promociones"), where("empresaId", "==", empresaId)));
        if (solicitud === solicitudRef.current) {
          setPromociones(lectura.docs.map((d) => ({ id: d.id, ...d.data() })));
        }
      } catch (errorPromos) {
        console.warn("No se pudieron leer las promociones:", errorPromos);
      }

      try {
        const lectura = await getDocs(query(collection(db, "categorias"), where("empresaId", "==", empresaId)));
        if (solicitud === solicitudRef.current) {
          setCategorias(lectura.docs.map((d) => ({ id: d.id, ...d.data() })));
        }
      } catch (errorCategorias) {
        console.warn("No se pudieron leer las categorías:", errorCategorias);
      }

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

    sonidoPop();


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


  // Las promociones vigentes se aplican solas, la mejor por producto
  const promos = useMemo(
    () => calcularPromociones(carrito, productos, promociones),
    [carrito, productos, promociones]
  );

  const descuentoNumero = Math.min(promos.total, subtotal);

  const total = Math.max(0, subtotal - descuentoNumero);


  // ========================================
  // P. FILTRAR PRODUCTOS
  // ========================================

  const productosFiltrados = useMemo(() => {

    const texto = normalizar(busqueda);

    return productos.filter((producto) =>

      (!categoriaFiltro || producto.categoriaId === categoriaFiltro) &&

      (normalizar(producto.nombre).includes(texto) ||

      normalizar(producto.sku).includes(texto) ||

      normalizar(producto.codigoBarras).includes(texto))

    );

  }, [
    productos,
    busqueda,
    categoriaFiltro
  ]);

  // Solo las categorías que tienen productos para vender
  const categoriasConProductos = categorias.filter((c) =>
    productos.some((p) => p.categoriaId === c.id)
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

  const cajaEfectiva =
    cajaId || (cajasSucursal.length === 1 ? cajasSucursal[0].id : "");

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


    if (
      metodoPago === "EFECTIVO" &&
      !cajaEfectiva
    ) {

      setError(
        "Selecciona una caja abierta para cobrar en efectivo."
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

    if (clienteInvalido) {

      setError(errorCarnet || errorNombre);

      return;

    }


    setGuardando(true);

    try {

      const ventaId = await registrarVenta({

        empresaId,

        sucursalId,

        clienteNombre: nombreCliente,

        clienteDocumento: documentoCliente,

        metodoPago,

        cajaId:
          metodoPago === "EFECTIVO"
            ? cajaEfectiva
            : null,

        descuento: descuentoNumero,

        observaciones,

        items: carrito,

        usuarioId: usuario.uid

      });


      // SI LLEGAMOS AQUI, FIREBASE YA
      // CONFIRMO LA OPERACION PRINCIPAL.

      sonidoCaja();


      setMensaje(
        `Venta completada correctamente: ${ventaId}`
      );

      setCarrito([]);

      setNombreCliente("");

      setDocumentoCliente("");

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

    try {

      if (nuevaSucursal) localStorage.setItem("an-pos-sucursal", nuevaSucursal);

    } catch {

      /* sin almacenamiento */

    }

    // EL CARRITO ES DIFERENTE POR SUCURSAL.

    setCarrito([]);

    setCajaId("");

    setError("");

    setMensaje("");

  }


  // ========================================
  // W. INTERFAZ PRINCIPAL
  // ========================================

  const textoBusqueda = normalizar(busqueda);

  const catalogoOrdenado = (() => {
    const lista = soloStock && sucursalId
      ? productosFiltrados.filter((p) => stockProducto(p.id) >= 1)
      : productosFiltrados;

    if (!sucursalId) return lista;

    // Lo que se puede vender va primero.
    const conStock = [];
    const sinStockLista = [];
    lista.forEach((p) => (stockProducto(p.id) >= 1 ? conStock : sinStockLista).push(p));
    return [...conStock, ...sinStockLista];
  })();

  const productosVisibles = catalogoOrdenado.slice(0, limite);
  const hayMas = catalogoOrdenado.length > limite;

  function alPulsarEnBusqueda(evento) {
    if (evento.key !== "Enter") return;
    evento.preventDefault();
    if (!textoBusqueda) return;

    // Lector de código de barras: coincidencia exacta con SKU o código.
    const exacto = productos.find(
      (p) =>
        normalizar(p.codigoBarras) === textoBusqueda ||
        normalizar(p.sku) === textoBusqueda
    );
    const elegido = exacto || (catalogoOrdenado.length === 1 ? catalogoOrdenado[0] : null);

    if (elegido) {
      agregar(elegido);
      setBusqueda("");
      setLimite(30);
    }
  }

  const metodos = [
    { valor: "EFECTIVO", texto: "Efectivo" },
    { valor: "QR", texto: "QR" },
    { valor: "TARJETA", texto: "Tarjeta" }
  ];

  const cantidadUnidades = carrito.reduce((suma, item) => suma + item.cantidad, 0);

  // Datos del cliente: nombre solo con letras y carnet solo con números.
  const nombreLimpio = nombreCliente.trim();
  const errorNombre =
    nombreLimpio && nombreLimpio.length < 2 ? "Escribe al menos 2 letras." : "";
  const errorCarnet = documentoCliente
    ? documentoCliente.length < 5
      ? "El carnet tiene entre 5 y 12 números."
      : !nombreLimpio
        ? "Escribe también el nombre del cliente."
        : ""
    : "";
  const clienteInvalido = Boolean(errorNombre || errorCarnet);

  return (
    <div className="pv">
      <header className="pv-cabecera">
        <div>
          <h1>Punto de venta</h1>
          <p>Busca, toca y cobra. Escribe o escanea el código y pulsa Enter.</p>
        </div>

        <button
          type="button"
          className="pv-boton pv-boton--suave"
          onClick={actualizar}
          disabled={cargando || guardando}
        >
          <RefreshCw size={18} className={cargando ? "pv-gira" : ""} />
          {cargando ? "Actualizando…" : "Actualizar"}
        </button>
      </header>

      {mensaje && (
        <div className="pv-aviso pv-aviso--ok" role="status">
          <Check size={18} />
          {mensaje}
        </div>
      )}

      {error && (
        <div className="pv-aviso pv-aviso--error" role="alert">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      <div className="pv-layout">
        <section className="pv-catalogo" aria-label="Productos">
          <div className="pv-herramientas">
            <label className="pv-selector pv-selector--sucursal">
              <span className="pv-etiqueta">Sucursal</span>
              <span className="pv-selector__caja">
                <select
                  value={sucursalId}
                  onChange={(e) => cambiarSucursal(e.target.value)}
                  disabled={guardando || sucursales.length === 0}
                >
                  <option value="">
                    {sucursales.length === 0 ? "No hay sucursales activas" : "Selecciona una sucursal"}
                  </option>
                  {sucursales.map((sucursal) => (
                    <option key={sucursal.id} value={sucursal.id}>
                      {sucursal.nombre}
                    </option>
                  ))}
                </select>
                <ChevronDown size={18} aria-hidden="true" />
              </span>
            </label>

            <label className="pv-busqueda">
              <Search size={20} aria-hidden="true" />
              <input
                type="search"
                inputMode="search"
                autoComplete="off"
                placeholder="Buscar por nombre, SKU o código de barras…"
                aria-label="Buscar producto"
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setLimite(30);
                }}
                onKeyDown={alPulsarEnBusqueda}
              />
              {busqueda && (
                <button
                  type="button"
                  className="pv-limpiar"
                  aria-label="Borrar búsqueda"
                  onClick={() => {
                    setBusqueda("");
                    setLimite(30);
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </label>
          </div>

          <div className="pv-subbarra">
            <p className="pv-contador" aria-live="polite">
              {catalogoOrdenado.length.toLocaleString("es-BO")}{" "}
              {catalogoOrdenado.length === 1 ? "producto" : "productos"}
              {hayMas && ` · mostrando ${productosVisibles.length}`}
            </p>

            <label className="pv-interruptor">
              <input
                type="checkbox"
                checked={soloStock}
                onChange={(e) => {
                  setSoloStock(e.target.checked);
                  setLimite(30);
                }}
              />
              <span>Solo con stock</span>
            </label>
          </div>

          {categoriasConProductos.length > 1 && (
            <div className="pv-categorias" role="radiogroup" aria-label="Categoría">
              {[{ id: "", nombre: "Todo" }, ...categoriasConProductos].map((c) => (
                <button
                  key={c.id || "todo"}
                  type="button"
                  role="radio"
                  aria-checked={categoriaFiltro === c.id}
                  className="pv-categoria"
                  data-activa={categoriaFiltro === c.id}
                  onClick={() => {
                    setCategoriaFiltro(c.id);
                    setLimite(30);
                  }}
                >
                  {c.nombre}
                </button>
              ))}
            </div>
          )}

          {!sucursalId && !cargando && sucursales.length > 0 && (
            <div className="pv-aviso pv-aviso--info">
              <PackageCheck size={18} />
              Elige una sucursal para ver las existencias y poder vender.
            </div>
          )}

          <ul className="pv-lista">
            {productosVisibles.map((producto) => {
              const existencia = obtenerExistencia(producto.id);
              const stock = existencia.vendible;
              const sinStock = stock < 1;
              const enCarrito = carrito.find((i) => i.productoId === producto.id);

              return (
                <li key={producto.id}>
                  <button
                    type="button"
                    className="pv-producto"
                    data-sin-stock={Boolean(sucursalId) && sinStock}
                    onClick={() => agregar(producto)}
                    disabled={!sucursalId || sinStock || cargando || guardando}
                    title={producto.nombre}
                  >
                    <span className="pv-producto__imagen" aria-hidden="true">
                      {producto.imagenUrl ? (
                        <img src={producto.imagenUrl} alt="" loading="lazy" />
                      ) : (
                        <ShoppingCart size={22} />
                      )}
                    </span>

                    <span className="pv-producto__datos">
                      <strong>{producto.nombre}</strong>
                      <small>
                        {producto.sku || "Sin SKU"}
                        {producto.controlaVencimiento === true && " · Por lotes"}
                      </small>
                    </span>

                    <span className="pv-producto__precio">
                      <b>Bs {mostrarDinero(producto.precioVenta)}</b>
                      {sucursalId && (
                        <small data-bajo={stock >= 1 && stock <= 5} data-agotado={sinStock}>
                          {sinStock
                            ? producto.controlaVencimiento === true
                              ? "Sin lotes vigentes"
                              : "Agotado"
                            : `${mostrarCantidad(stock)} disp.`}
                        </small>
                      )}
                    </span>

                    <span className="pv-producto__mas" data-en-carrito={Boolean(enCarrito)} aria-hidden="true">
                      {enCarrito ? <b>{mostrarCantidad(enCarrito.cantidad)}</b> : <Plus size={18} />}
                    </span>
                  </button>
                </li>
              );
            })}

            {hayMas && (
              <li>
                <button
                  type="button"
                  className="pv-boton pv-boton--suave pv-mas"
                  onClick={() => setLimite((previo) => previo + 30)}
                >
                  Mostrar más productos
                </button>
              </li>
            )}
          </ul>

          {!cargando && catalogoOrdenado.length === 0 && (
            <div className="pv-vacio">
              <ShoppingCart size={34} />
              <strong>No encontramos productos</strong>
              <span>Prueba con otro nombre o código.</span>
            </div>
          )}
        </section>

        <aside className="pv-venta" id="pv-venta" aria-label="Venta actual">
          <div className="pv-venta__titulo">
            <div>
              <h2>Venta actual</h2>
              <span>
                {carrito.length === 0
                  ? "Sin productos"
                  : `${mostrarCantidad(cantidadUnidades)} unidad(es)`}
              </span>
            </div>

            {carrito.length > 0 && (
              <button
                type="button"
                className="pv-boton pv-boton--suave pv-boton--chico"
                onClick={() => setCarrito([])}
                disabled={guardando}
              >
                <Trash2 size={16} />
                Vaciar
              </button>
            )}
          </div>

          <div className="pv-venta__cuerpo">
            <ul className="pv-lineas">
              {carrito.map((item) => {
                const stockActual = stockProducto(item.productoId);
                const excedido = item.cantidad > stockActual;

                return (
                  <li key={item.productoId} data-excedido={excedido}>
                    <div className="pv-linea__datos">
                      <strong>{item.nombreProducto}</strong>
                      <small>
                        Bs {mostrarDinero(item.precioUnitario)} c/u ·{" "}
                        <b>Bs {mostrarDinero(item.cantidad * item.precioUnitario)}</b>
                      </small>
                      {excedido && (
                        <small className="pv-linea__alerta">
                          Solo hay {mostrarCantidad(stockActual)} · reduce la cantidad
                        </small>
                      )}
                    </div>

                    <div className="pv-cantidad">
                      <button
                        type="button"
                        onClick={() => cambiarCantidad(item.productoId, -1)}
                        disabled={guardando || item.cantidad <= 1}
                        aria-label={`Quitar una unidad de ${item.nombreProducto}`}
                      >
                        <Minus size={16} />
                      </button>
                      <strong>{mostrarCantidad(item.cantidad)}</strong>
                      <button
                        type="button"
                        onClick={() => cambiarCantidad(item.productoId, 1)}
                        disabled={guardando || item.cantidad >= stockActual}
                        aria-label={`Agregar una unidad de ${item.nombreProducto}`}
                      >
                        <Plus size={16} />
                      </button>
                    </div>

                    <button
                      type="button"
                      className="pv-quitar"
                      onClick={() => eliminar(item.productoId)}
                      disabled={guardando}
                      aria-label={`Quitar ${item.nombreProducto} de la venta`}
                    >
                      <Trash2 size={17} />
                    </button>
                  </li>
                );
              })}

              {carrito.length === 0 && (
                <li className="pv-lineas__vacio">
                  <ShoppingCart size={30} />
                  <span>Toca un producto para agregarlo.</span>
                </li>
              )}
            </ul>

            <div className="pv-grupo">
              <span className="pv-grupo__titulo">Cliente</span>
              <div className="pv-comprador">
                <label>
                  <span className="pv-etiqueta">Nombre</span>
                  <input
                    value={nombreCliente}
                    onChange={(e) => setNombreCliente(limpiarNombre(e.target.value))}
                    onBlur={() => setNombreCliente((n) => capitalizarNombre(n))}
                    placeholder="Ej. Juan Pérez"
                    autoComplete="off"
                    maxLength={60}
                    aria-invalid={Boolean(errorNombre)}
                    disabled={guardando}
                  />
                </label>
                <label>
                  <span className="pv-etiqueta">Carnet (opcional)</span>
                  <input
                    value={documentoCliente}
                    onChange={(e) => setDocumentoCliente(limpiarCarnet(e.target.value))}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Solo números"
                    autoComplete="off"
                    maxLength={12}
                    aria-invalid={Boolean(errorCarnet)}
                    disabled={guardando}
                  />
                </label>
              </div>
              {(errorNombre || errorCarnet) && (
                <p className="pv-nota pv-nota--alerta" role="alert">
                  {errorNombre || errorCarnet}
                </p>
              )}
            </div>

            <div className="pv-grupo">
              <span className="pv-grupo__titulo">Cobro</span>

              <label className="pv-selector">
                <span className="pv-etiqueta">Forma de pago</span>
                <span className="pv-selector__caja">
                  <select
                    value={metodoPago}
                    disabled={guardando}
                    onChange={(e) => {
                      setMetodoPago(e.target.value);
                      setCajaId("");
                      setError("");
                    }}
                  >
                    {metodos.map((metodo) => (
                      <option key={metodo.valor} value={metodo.valor}>
                        {metodo.texto}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={18} aria-hidden="true" />
                </span>
              </label>

              {metodoPago === "QR" && (
                qrEmpresa.url && qrEmpresa.activo ? (
                  <div className="pv-qr">
                    <button type="button" className="pv-qr__imagen" onClick={() => setQrGrande(true)} aria-label="Ver el QR en grande">
                      <img src={qrEmpresa.url} alt="QR para pagar" />
                      <span><Maximize2 size={16} aria-hidden="true" /> Ampliar</span>
                    </button>
                    <div className="pv-qr__texto">
                      <strong>Muestra este QR al cliente</strong>
                      <span>Total a pagar: <b>Bs {mostrarDinero(total)}</b></span>
                      <small>Cuando el pago llegue, pulsa Cobrar.</small>
                    </div>
                  </div>
                ) : (
                  <p className="pv-nota pv-nota--alerta">
                    <QrCode size={16} aria-hidden="true" /> El dueño aún no subió el QR de cobro. Puede hacerlo desde la app del celular.
                  </p>
                )
              )}

              {metodoPago === "EFECTIVO" && (
                <label className="pv-selector">
                  <span className="pv-etiqueta">Caja</span>
                  {!sucursalId ? (
                    <span className="pv-nota">Elige una sucursal primero.</span>
                  ) : cajasSucursal.length === 0 ? (
                    <span className="pv-nota pv-nota--alerta">
                      No hay cajas abiertas en esta sucursal. Abre una en Cajas.
                    </span>
                  ) : (
                    <span className="pv-selector__caja">
                      <select
                        value={cajaEfectiva}
                        disabled={guardando}
                        onChange={(e) => setCajaId(e.target.value)}
                      >
                        <option value="">Selecciona una caja abierta</option>
                        {cajasSucursal.map((caja) => (
                          <option key={caja.id} value={caja.id}>
                            {caja.nombre || caja.id}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={18} aria-hidden="true" />
                    </span>
                  )}
                </label>
              )}

              {promos.lineas.length > 0 && (
                <ul className="pv-promos" aria-label="Promociones aplicadas">
                  {promos.lineas.map((l) => (
                    <li key={l.productoId}>
                      <span>
                        <b>{l.promocion.nombre}</b>
                        <small>
                          {l.nombreProducto} · {describirDescuento(l.promocion)}
                        </small>
                      </span>
                      <strong>− Bs {mostrarDinero(l.descuento)}</strong>
                    </li>
                  ))}
                </ul>
              )}

              <label>
                <span className="pv-etiqueta">Nota (opcional)</span>
                <input
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  disabled={guardando}
                  maxLength={120}
                  placeholder="Ej. entrega mañana"
                />
              </label>

              {carritoSinStock && (
                <p className="pv-nota pv-nota--alerta">
                  El stock cambió. Ajusta las cantidades antes de cobrar.
                </p>
              )}
            </div>
          </div>

          <footer className="pv-venta__pie">
            <dl className="pv-totales">
              <div>
                <dt>Subtotal</dt>
                <dd>Bs {mostrarDinero(subtotal)}</dd>
              </div>
              <div>
                <dt>Promociones</dt>
                <dd>− Bs {mostrarDinero(descuentoNumero)}</dd>
              </div>
              <div className="pv-totales__total">
                <dt>Total</dt>
                <dd>Bs {mostrarDinero(total)}</dd>
              </div>
            </dl>

            <button
              type="button"
              className="pv-cobrar"
              onClick={vender}
              disabled={
                guardando ||
                cargando ||
                carrito.length === 0 ||
                carritoSinStock ||
                clienteInvalido
              }
            >
              {guardando ? "Procesando…" : `Cobrar Bs ${mostrarDinero(total)}`}
            </button>
          </footer>
        </aside>
      </div>

      {qrGrande && (
        <div className="pv-qr-fondo" role="dialog" aria-modal="true" aria-label="QR para pagar" onClick={() => setQrGrande(false)}>
          <div className="pv-qr-grande" onClick={(e) => e.stopPropagation()}>
            <img src={qrEmpresa.url} alt="QR para pagar" />
            <strong>Total a pagar: Bs {mostrarDinero(total)}</strong>
            <button type="button" onClick={() => setQrGrande(false)}>Cerrar</button>
          </div>
        </div>
      )}

      {carrito.length > 0 && (
        <button
          type="button"
          className="pv-barra-movil"
          onClick={() =>
            document.getElementById("pv-venta")?.scrollIntoView({
              behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
              block: "start"
            })
          }
        >
          <span>
            <ShoppingCart size={20} />
            {mostrarCantidad(cantidadUnidades)} unidad(es)
          </span>
          <strong>Cobrar · Bs {mostrarDinero(total)}</strong>
        </button>
      )}
    </div>
  );
}

export default PosPage;
