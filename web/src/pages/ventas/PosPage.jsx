import { useEffect, useMemo, useState } from "react";
import {
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Trash2
} from "lucide-react";

import useAuth from "../../hooks/useAuth";
import {
  obtenerCatalogosVenta,
  registrarVenta
} from "../../services/ventaService";

function PosPage() {
  const { usuario } = useAuth();

  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [inventarios, setInventarios] = useState([]);
  const [cajas, setCajas] = useState([]);

  const [sucursalId, setSucursalId] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [metodoPago, setMetodoPago] = useState("EFECTIVO");
  const [cajaId, setCajaId] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [descuento, setDescuento] = useState("0");
  const [observaciones, setObservaciones] = useState("");

  const [carrito, setCarrito] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const cargar = async () => {
    if (!usuario?.empresaId) return;

    const catalogos = await obtenerCatalogosVenta(usuario.empresaId);

    setClientes(catalogos.clientes);
    setProductos(catalogos.productos);
    setSucursales(catalogos.sucursales);
    setInventarios(catalogos.inventarios);
    setCajas(catalogos.cajas);
  };

  useEffect(() => {
    cargar().catch(console.error);
  }, [usuario]);

  const stockProducto = (productoId) => {
    if (!sucursalId) return 0;

    return Number(
      inventarios.find(
        (i) =>
          i.productoId === productoId &&
          i.sucursalId === sucursalId
      )?.stock || 0
    );
  };

  const agregar = (producto) => {
    if (!sucursalId) {
      setError("Primero selecciona una sucursal.");
      return;
    }

    const stock = stockProducto(producto.id);

    if (stock <= 0) {
      setError("Este producto no tiene stock en la sucursal seleccionada.");
      return;
    }

    setCarrito((anterior) => {
      const existente = anterior.find(
        (i) => i.productoId === producto.id
      );

      if (existente) {
        if (existente.cantidad + 1 > stock) {
          return anterior;
        }

        return anterior.map((i) =>
          i.productoId === producto.id
            ? { ...i, cantidad: i.cantidad + 1 }
            : i
        );
      }

      return [
        ...anterior,
        {
          productoId: producto.id,
          nombreProducto: producto.nombre,
          sku: producto.sku,
          precioUnitario: Number(producto.precioVenta || 0),
          cantidad: 1
        }
      ];
    });

    setError("");
  };

  const cambiarCantidad = (productoId, delta) => {
    setCarrito((anterior) =>
      anterior.map((item) => {
        if (item.productoId !== productoId) return item;

        const stock = stockProducto(productoId);
        const nueva = item.cantidad + delta;

        if (nueva < 1 || nueva > stock) return item;

        return { ...item, cantidad: nueva };
      })
    );
  };

  const eliminar = (productoId) => {
    setCarrito((anterior) =>
      anterior.filter((i) => i.productoId !== productoId)
    );
  };

  const subtotal = carrito.reduce(
    (suma, item) =>
      suma + item.cantidad * item.precioUnitario,
    0
  );

  const descuentoNumero = Number(descuento) || 0;
  const total = Math.max(0, subtotal - descuentoNumero);

  const productosFiltrados = useMemo(() => {
    const texto = busqueda.toLowerCase();

    return productos.filter((p) =>
      p.nombre?.toLowerCase().includes(texto) ||
      p.sku?.toLowerCase().includes(texto)
    );
  }, [productos, busqueda]);

  const cajasSucursal = cajas.filter(
    (caja) =>
      caja.estado === "ABIERTA" &&
      (!sucursalId || caja.sucursalId === sucursalId)
  );

  const vender = async () => {
    try {
      setGuardando(true);
      setError("");
      setMensaje("");

      const ventaId = await registrarVenta({
        empresaId: usuario.empresaId,
        sucursalId,
        clienteId,
        metodoPago,
        cajaId: metodoPago === "EFECTIVO" ? cajaId : null,
        descuento,
        observaciones,
        items: carrito,
        usuarioId: usuario.uid
      });

      setMensaje(`Venta completada: ${ventaId}`);
      setCarrito([]);
      setClienteId("");
      setDescuento("0");
      setObservaciones("");

      await cargar();
    } catch (error) {
      console.error(error);
      setError(error.message || "No se pudo registrar la venta.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1>Punto de venta</h1>
          <p>Venta rápida con control automático de stock y caja.</p>
        </div>
      </div>

      <div className="pos-layout">
        <section className="admin-card pos-products">
          <div className="pos-top-filters">
            <select
              value={sucursalId}
              onChange={(e)=>{
                setSucursalId(e.target.value);
                setCarrito([]);
                setCajaId("");
              }}
            >
              <option value="">Seleccionar sucursal</option>
              {sucursales.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>

            <div className="admin-search pos-search">
              <Search size={18}/>
              <input
                placeholder="Buscar producto o SKU..."
                value={busqueda}
                onChange={(e)=>setBusqueda(e.target.value)}
              />
            </div>
          </div>

          <div className="pos-product-grid">
            {productosFiltrados.map((producto)=>{
              const stock = stockProducto(producto.id);

              return (
                <button
                  key={producto.id}
                  className="pos-product-card"
                  onClick={()=>agregar(producto)}
                  disabled={!sucursalId || stock <= 0}
                >
                  <div className="pos-product-image">
                    {producto.imagenUrl
                      ? <img src={producto.imagenUrl} alt={producto.nombre}/>
                      : <ShoppingCart size={25}/>
                    }
                  </div>
                  <strong>{producto.nombre}</strong>
                  <span>{producto.sku}</span>
                  <div>
                    <b>Bs {Number(producto.precioVenta || 0).toFixed(2)}</b>
                    <small>Stock: {stock}</small>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="admin-card pos-cart">
          <div className="admin-card-header">
            <h2>Venta actual</h2>
            <p>{carrito.length} producto(s) diferentes</p>
          </div>

          <div className="admin-form-group">
            <label>Cliente</label>
            <select value={clienteId} onChange={(e)=>setClienteId(e.target.value)}>
              <option value="">Consumidor final</option>
              {clientes.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>

          <div className="pos-cart-lines">
            {carrito.map((item)=>(
              <article key={item.productoId}>
                <div className="pos-cart-info">
                  <strong>{item.nombreProducto}</strong>
                  <span>Bs {item.precioUnitario.toFixed(2)}</span>
                </div>

                <div className="pos-quantity">
                  <button onClick={()=>cambiarCantidad(item.productoId,-1)}><Minus size={14}/></button>
                  <strong>{item.cantidad}</strong>
                  <button onClick={()=>cambiarCantidad(item.productoId,1)}><Plus size={14}/></button>
                </div>

                <button className="pos-remove" onClick={()=>eliminar(item.productoId)}>
                  <Trash2 size={15}/>
                </button>
              </article>
            ))}

            {carrito.length === 0 && (
              <div className="commerce-empty-cart">
                <ShoppingCart size={31}/>
                <span>Selecciona productos.</span>
              </div>
            )}
          </div>

          <div className="admin-form-grid pos-payment-grid">
            <div className="admin-form-group">
              <label>Pago</label>
              <select value={metodoPago} onChange={(e)=>{setMetodoPago(e.target.value);setCajaId("");}}>
                <option value="EFECTIVO">Efectivo</option>
                <option value="QR">QR</option>
                <option value="TARJETA">Tarjeta</option>
              </select>
            </div>

            <div className="admin-form-group">
              <label>Descuento</label>
              <input type="number" min="0" step="0.01" value={descuento} onChange={(e)=>setDescuento(e.target.value)}/>
            </div>

            {metodoPago === "EFECTIVO" && (
              <div className="admin-form-group full">
                <label>Caja *</label>
                <select value={cajaId} onChange={(e)=>setCajaId(e.target.value)}>
                  <option value="">Seleccionar caja abierta</option>
                  {cajasSucursal.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
            )}
          </div>

          <div className="admin-form-group">
            <label>Observaciones</label>
            <textarea value={observaciones} onChange={(e)=>setObservaciones(e.target.value)} />
          </div>

          <div className="pos-totals">
            <div><span>Subtotal</span><strong>Bs {subtotal.toFixed(2)}</strong></div>
            <div><span>Descuento</span><strong>- Bs {descuentoNumero.toFixed(2)}</strong></div>
            <div className="grand-total"><span>Total</span><strong>Bs {total.toFixed(2)}</strong></div>
          </div>

          {mensaje && <div className="admin-message success">{mensaje}</div>}
          {error && <div className="admin-message error">{error}</div>}

          <button
            className="admin-primary-button commerce-submit"
            onClick={vender}
            disabled={guardando || carrito.length === 0}
          >
            {guardando ? "Procesando..." : "Completar venta"}
          </button>
        </aside>
      </div>
    </div>
  );
}

export default PosPage;
