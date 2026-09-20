import { useEffect, useState } from "react";
import {
  Plus,
  RefreshCw,
  ShoppingBag,
  Trash2
} from "lucide-react";

import useAuth from "../../hooks/useAuth";
import {
  listarCompras,
  obtenerCatalogosCompra,
  registrarCompra
} from "../../services/compraService";

function ComprasPage() {
  const { usuario } = useAuth();

  const [compras, setCompras] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [cajas, setCajas] = useState([]);

  const [proveedorId, setProveedorId] = useState("");
  const [sucursalId, setSucursalId] = useState("");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [metodoPago, setMetodoPago] = useState("EFECTIVO");
  const [cajaId, setCajaId] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const [productoId, setProductoId] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [costoUnitario, setCostoUnitario] = useState("");
  const [items, setItems] = useState([]);

  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const cargar = async () => {
    if (!usuario?.empresaId) return;

    try {
      setError("");

      const [catalogos, comprasDatos] = await Promise.all([
        obtenerCatalogosCompra(usuario.empresaId),
        listarCompras(usuario.empresaId)
      ]);

      setProveedores(catalogos.proveedores);
      setProductos(catalogos.productos);
      setSucursales(catalogos.sucursales);
      setCajas(catalogos.cajas);
      setCompras(comprasDatos);
    } catch (error) {
      console.error(error);
      setError("No se pudo cargar el módulo de compras.");
    }
  };

  useEffect(() => {
    cargar();
  }, [usuario]);

  const agregarItem = () => {
    const producto = productos.find((p) => p.id === productoId);
    const cantidadNumero = Number(cantidad);
    const costo = Number(costoUnitario);

    if (!producto || cantidadNumero <= 0 || costo < 0) {
      setError("Selecciona producto, cantidad y costo válidos.");
      return;
    }

    setItems((anteriores) => {
      const existente = anteriores.find((i) => i.productoId === producto.id);

      if (existente) {
        return anteriores.map((i) =>
          i.productoId === producto.id
            ? {
                ...i,
                cantidad: i.cantidad + cantidadNumero,
                costoUnitario: costo
              }
            : i
        );
      }

      return [
        ...anteriores,
        {
          productoId: producto.id,
          nombreProducto: producto.nombre,
          sku: producto.sku,
          cantidad: cantidadNumero,
          costoUnitario: costo
        }
      ];
    });

    setProductoId("");
    setCantidad("1");
    setCostoUnitario("");
    setError("");
  };

  const eliminarItem = (id) => {
    setItems((anteriores) =>
      anteriores.filter((item) => item.productoId !== id)
    );
  };

  const total = items.reduce(
    (suma, item) =>
      suma + Number(item.cantidad) * Number(item.costoUnitario),
    0
  );

  const guardarCompra = async () => {
    try {
      setGuardando(true);
      setError("");
      setMensaje("");

      const id = await registrarCompra({
        empresaId: usuario.empresaId,
        sucursalId,
        proveedorId,
        numeroDocumento,
        metodoPago,
        cajaId: metodoPago === "EFECTIVO" ? cajaId : null,
        observaciones,
        items,
        usuarioId: usuario.uid
      });

      setMensaje(`Compra registrada correctamente: ${id}`);

      setProveedorId("");
      setNumeroDocumento("");
      setObservaciones("");
      setItems([]);
      setCajaId("");

      await cargar();
    } catch (error) {
      console.error(error);
      setError(error.message || "No se pudo registrar la compra.");
    } finally {
      setGuardando(false);
    }
  };

  const nombreProveedor = (id) =>
    proveedores.find((p) => p.id === id)?.nombre || "Proveedor";

  const nombreSucursal = (id) =>
    sucursales.find((s) => s.id === id)?.nombre || "Sucursal";

  const cajasSucursal = cajas.filter(
    (caja) => !sucursalId || caja.sucursalId === sucursalId
  );

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1>Compras</h1>
          <p>Registra compras y aumenta inventario automáticamente.</p>
        </div>

        <button className="admin-refresh-button" onClick={cargar}>
          <RefreshCw size={18}/>
        </button>
      </div>

      <div className="commerce-two-column">
        <section className="admin-card">
          <div className="admin-card-header">
            <h2>Nueva compra</h2>
            <p>Proveedor, sucursal, productos y método de pago.</p>
          </div>

          <div className="admin-form-grid">
            <div className="admin-form-group">
              <label>Proveedor *</label>
              <select value={proveedorId} onChange={(e)=>setProveedorId(e.target.value)}>
                <option value="">Seleccionar</option>
                {proveedores.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>

            <div className="admin-form-group">
              <label>Sucursal *</label>
              <select value={sucursalId} onChange={(e)=>{setSucursalId(e.target.value);setCajaId("");}}>
                <option value="">Seleccionar</option>
                {sucursales.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>

            <div className="admin-form-group">
              <label>N° documento</label>
              <input value={numeroDocumento} onChange={(e)=>setNumeroDocumento(e.target.value)} placeholder="FAC-001"/>
            </div>

            <div className="admin-form-group">
              <label>Método de pago</label>
              <select value={metodoPago} onChange={(e)=>{setMetodoPago(e.target.value);setCajaId("");}}>
                <option value="EFECTIVO">Efectivo</option>
                <option value="QR">QR</option>
                <option value="TARJETA">Tarjeta</option>
                <option value="CREDITO">Crédito</option>
              </select>
            </div>

            {metodoPago === "EFECTIVO" && (
              <div className="admin-form-group full">
                <label>Caja abierta *</label>
                <select value={cajaId} onChange={(e)=>setCajaId(e.target.value)}>
                  <option value="">Seleccionar</option>
                  {cajasSucursal.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
            )}
          </div>

          <div className="commerce-item-adder">
            <select value={productoId} onChange={(e)=>{
              const id=e.target.value;
              setProductoId(id);
              const p=productos.find(x=>x.id===id);
              if(p) setCostoUnitario(String(p.costo || 0));
            }}>
              <option value="">Producto</option>
              {productos.map(p=><option key={p.id} value={p.id}>{p.sku} - {p.nombre}</option>)}
            </select>

            <input type="number" min="0.01" step="0.01" value={cantidad} onChange={(e)=>setCantidad(e.target.value)} placeholder="Cantidad"/>
            <input type="number" min="0" step="0.01" value={costoUnitario} onChange={(e)=>setCostoUnitario(e.target.value)} placeholder="Costo"/>
            <button className="admin-primary-button" type="button" onClick={agregarItem}><Plus size={17}/> Agregar</button>
          </div>

          <div className="commerce-cart-list">
            {items.map((item)=>(
              <div className="commerce-cart-row" key={item.productoId}>
                <div>
                  <strong>{item.nombreProducto}</strong>
                  <span>{item.sku}</span>
                </div>
                <span>{item.cantidad} x Bs {Number(item.costoUnitario).toFixed(2)}</span>
                <strong>Bs {(item.cantidad*item.costoUnitario).toFixed(2)}</strong>
                <button onClick={()=>eliminarItem(item.productoId)}><Trash2 size={16}/></button>
              </div>
            ))}

            {items.length === 0 && (
              <div className="commerce-empty-cart">
                <ShoppingBag size={30}/>
                <span>Agrega productos a la compra.</span>
              </div>
            )}
          </div>

          <div className="admin-form-group">
            <label>Observaciones</label>
            <textarea value={observaciones} onChange={(e)=>setObservaciones(e.target.value)}/>
          </div>

          {mensaje && <div className="admin-message success">{mensaje}</div>}
          {error && <div className="admin-message error">{error}</div>}

          <div className="commerce-total">
            <span>Total compra</span>
            <strong>Bs {total.toFixed(2)}</strong>
          </div>

          <button
            className="admin-primary-button commerce-submit"
            onClick={guardarCompra}
            disabled={guardando || items.length === 0}
          >
            {guardando ? "Registrando..." : "Registrar compra"}
          </button>
        </section>

        <section className="admin-card">
          <div className="admin-card-header">
            <h2>Compras recientes</h2>
            <p>Historial de compras registradas.</p>
          </div>

          <div className="commerce-history">
            {compras.slice(0, 12).map((compra)=>(
              <article key={compra.id}>
                <div>
                  <strong>{nombreProveedor(compra.proveedorId)}</strong>
                  <span>{nombreSucursal(compra.sucursalId)} · {compra.metodoPago}</span>
                </div>
                <strong>Bs {Number(compra.total || 0).toFixed(2)}</strong>
              </article>
            ))}

            {compras.length === 0 && (
              <div className="admin-empty">No existen compras.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default ComprasPage;
