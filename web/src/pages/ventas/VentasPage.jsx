import { useEffect, useMemo, useState } from "react";
import { Ban, Eye, FileText, RefreshCw, X } from "lucide-react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import useAuth from "../../hooks/useAuth";
import { db } from "../../services/firebase/firebaseConfig";
import { anularVenta, listarVentas } from "../../services/ventaService";
import { registrarAuditoria } from "../../services/auditService";
import AdvancedFilterBar from "../../components/filters/AdvancedFilterBar";

const dateOf = (v) => v?.toDate?.() || (v ? new Date(v) : null);

export default function VentasPage() {
  const { usuario } = useAuth();
  const [rows, setRows] = useState([]);
  const [clientes, setClientes] = useState({});
  const [detalles, setDetalles] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("TODOS");
  const [method, setMethod] = useState("TODOS");
  const [clientFilter, setClientFilter] = useState("TODOS");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [minTotal, setMinTotal] = useState("");
  const [maxTotal, setMaxTotal] = useState("");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!usuario?.empresaId) return;
    setLoading(true);
    const [ventas, cs, ds] = await Promise.all([
      listarVentas(usuario.empresaId),
      getDocs(query(collection(db, "clientes"), where("empresaId", "==", usuario.empresaId))),
      getDocs(query(collection(db, "detalleVentas"), where("empresaId", "==", usuario.empresaId)))
    ]);
    setRows(ventas);
    setClientes(Object.fromEntries(cs.docs.map((d) => [d.id, { id: d.id, ...d.data() }])));
    setDetalles(ds.docs.map((d) => ({ id: d.id, ...d.data() })));
    setLoading(false);
  };

  useEffect(() => { load().catch(console.error); }, [usuario?.empresaId]);

  const filtered = useMemo(() => rows.filter((r) => {
    const q = search.toLowerCase();
    const client = clientes[r.clienteId];
    const searchOk = !q || [r.id, client?.nombre, client?.documento, r.metodoPago, r.estado, r.usuarioId, r.sucursalId]
      .some((v) => String(v || "").toLowerCase().includes(q));
    const d = dateOf(r.fechaRegistro);
    const fromOk = !from || !d || d >= new Date(`${from}T00:00:00`);
    const toOk = !to || !d || d <= new Date(`${to}T23:59:59`);
    const total = Number(r.total || 0);
    const minOk = minTotal === "" || total >= Number(minTotal);
    const maxOk = maxTotal === "" || total <= Number(maxTotal);
    const clientOk = clientFilter === "TODOS" || (clientFilter === "FINAL" ? !r.clienteId : r.clienteId === clientFilter);
    return searchOk && (status === "TODOS" || r.estado === status) && (method === "TODOS" || r.metodoPago === method) && clientOk && fromOk && toOk && minOk && maxOk;
  }), [rows, clientes, search, status, method, clientFilter, from, to, minTotal, maxTotal]);

  const saleDetails = (saleId) => detalles.filter((d) => d.ventaId === saleId);

  const annul = async (r) => {
    if (!window.confirm(`¿Anular la venta ${r.id}? El stock será restaurado y se registrará la reversión.`)) return;
    try {
      await anularVenta({ ventaId: r.id, empresaId: usuario.empresaId, usuarioId: usuario.uid });
      await registrarAuditoria({ empresaId: usuario.empresaId, usuarioId: usuario.uid, usuarioNombre: usuario.nombreCompleto || usuario.correo || "", accion: "ANULAR_VENTA", modulo: "ventas", entidad: "venta", entidadId: r.id, detalle: `Anuló venta por ${Number(r.total || 0).toFixed(2)}` });
      setSelected(null);
      await load();
    } catch (e) { alert(e.message || "No se pudo anular."); }
  };

  const receipt = (r) => {
    const c = clientes[r.clienteId];
    const items = saleDetails(r.id);
    const w = window.open("", "_blank", "width=820,height=900");
    if (!w) return;
    const dt = dateOf(r.fechaRegistro)?.toLocaleString() || "-";
    const itemRows = items.map((d) => `<tr><td>${d.nombreProducto || d.productoId}</td><td style="text-align:right">${d.cantidad}</td><td style="text-align:right">${Number(d.precioUnitario || 0).toFixed(2)}</td><td style="text-align:right">${Number(d.subtotal || 0).toFixed(2)}</td></tr>`).join("");
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Comprobante ${r.id}</title><style>body{font-family:Arial,sans-serif;padding:40px;color:#111}h1{margin:0}.muted{color:#666}.box{border:1px solid #ddd;border-radius:12px;padding:18px;margin:20px 0}.row{display:flex;justify-content:space-between;margin:8px 0}.total{font-size:26px;font-weight:700}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{padding:10px;border-bottom:1px solid #ddd;text-align:left}th{background:#f5f5f5}</style></head><body><h1>Comprobante de venta</h1><p class="muted">${r.id}</p><div class="box"><div class="row"><span>Fecha</span><strong>${dt}</strong></div><div class="row"><span>Cliente</span><strong>${c?.nombre || "Consumidor final"}</strong></div><div class="row"><span>Método</span><strong>${r.metodoPago || "-"}</strong></div><div class="row"><span>Estado</span><strong>${r.estado || "-"}</strong></div></div><table><thead><tr><th>Producto</th><th style="text-align:right">Cantidad</th><th style="text-align:right">Precio</th><th style="text-align:right">Subtotal</th></tr></thead><tbody>${itemRows || '<tr><td colspan="4">Sin detalle disponible</td></tr>'}</tbody></table><div class="row"><span>Subtotal</span><span>${Number(r.subtotal || 0).toFixed(2)}</span></div><div class="row"><span>Descuento</span><span>${Number(r.descuento || 0).toFixed(2)}</span></div><div class="row total"><span>Total</span><span>${Number(r.total || 0).toFixed(2)}</span></div><script>window.print()</script></body></html>`);
    w.document.close();
  };

  const clientOptions = Object.values(clientes).sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || ""))).map((c) => ({ value: c.id, label: c.nombre || c.documento || c.id }));

  return <div className="module-page">
    <div className="module-page-header"><div><span className="eyebrow">VENTAS</span><h1>Historial de ventas</h1><p>Consulta detalle, filtra por múltiples criterios, genera comprobantes y anula operaciones con reversión de stock.</p></div><button className="secondary-action" onClick={load}><RefreshCw size={16}/> Actualizar</button></div>
    <AdvancedFilterBar search={search} onSearch={setSearch} searchPlaceholder="Venta, cliente, documento, usuario, sucursal…" status={status} onStatus={setStatus} statusOptions={[{value:"TODOS",label:"Todos los estados"},{value:"COMPLETADA",label:"Completadas"},{value:"ANULADA",label:"Anuladas"}]} filters={[{key:"metodo",label:"Todos los métodos",value:method,onChange:setMethod,options:[{value:"EFECTIVO",label:"Efectivo"},{value:"QR",label:"QR"},{value:"TARJETA",label:"Tarjeta"},{value:"TRANSFERENCIA",label:"Transferencia"},{value:"CREDITO",label:"Crédito"}]},{key:"cliente",label:"Todos los clientes",value:clientFilter,onChange:setClientFilter,options:[{value:"FINAL",label:"Consumidor final"},...clientOptions]}]} onClear={()=>{setSearch("");setStatus("TODOS");setMethod("TODOS");setClientFilter("TODOS");setFrom("");setTo("");setMinTotal("");setMaxTotal("")}}/>
    <div className="report-date-row filter-range-grid"><label>Desde<input type="date" value={from} onChange={(e)=>setFrom(e.target.value)}/></label><label>Hasta<input type="date" value={to} onChange={(e)=>setTo(e.target.value)}/></label><label>Total mínimo<input type="number" min="0" step="0.01" value={minTotal} onChange={(e)=>setMinTotal(e.target.value)} placeholder="0.00"/></label><label>Total máximo<input type="number" min="0" step="0.01" value={maxTotal} onChange={(e)=>setMaxTotal(e.target.value)} placeholder="Sin límite"/></label></div>
    <section className="data-card glass-3d">{loading?<div className="empty-state">Cargando ventas…</div>:<div className="table-scroll"><table className="modern-table"><thead><tr><th>VENTA</th><th>CLIENTE</th><th>FECHA</th><th>MÉTODO</th><th>SUBTOTAL</th><th>DESC.</th><th>TOTAL</th><th>ESTADO</th><th>ACCIONES</th></tr></thead><tbody>{filtered.map((r)=><tr key={r.id}><td><code>{r.id.slice(0,10)}</code></td><td>{clientes[r.clienteId]?.nombre||"Consumidor final"}</td><td>{dateOf(r.fechaRegistro)?.toLocaleString()||"-"}</td><td>{r.metodoPago}</td><td>{Number(r.subtotal||0).toFixed(2)}</td><td>{Number(r.descuento||0).toFixed(2)}</td><td><strong>{Number(r.total||0).toFixed(2)}</strong></td><td><span className={`status-pill ${r.estado==="ANULADA"?"inactive":"active"}`}>{r.estado}</span></td><td><div className="row-actions"><button title="Ver detalle" onClick={()=>setSelected(r)}><Eye size={16}/></button><button title="Comprobante" onClick={()=>receipt(r)}><FileText size={16}/></button>{r.estado!=="ANULADA"&&<button className="danger" title="Anular" onClick={()=>annul(r)}><Ban size={16}/></button>}</div></td></tr>)}</tbody></table>{!filtered.length&&<div className="empty-state">Sin ventas para los filtros seleccionados.</div>}</div>}</section>

    <AnimatePresence>{selected&&<motion.div className="modal-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={()=>setSelected(null)}><motion.div className="modal-card modal-wide glass-3d" initial={{opacity:0,scale:.95,y:20}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:.97}} onMouseDown={(e)=>e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">DETALLE DE VENTA</span><h2>{selected.id}</h2></div><button onClick={()=>setSelected(null)}><X size={18}/></button></div><div className="detail-summary-grid"><div><span>Cliente</span><strong>{clientes[selected.clienteId]?.nombre||"Consumidor final"}</strong></div><div><span>Método</span><strong>{selected.metodoPago}</strong></div><div><span>Sucursal</span><strong>{selected.sucursalId||"-"}</strong></div><div><span>Usuario</span><strong>{selected.usuarioId||"-"}</strong></div></div><div className="table-scroll"><table className="modern-table"><thead><tr><th>PRODUCTO</th><th>CANTIDAD</th><th>PRECIO</th><th>SUBTOTAL</th></tr></thead><tbody>{saleDetails(selected.id).map((d)=><tr key={d.id}><td>{d.nombreProducto||d.productoId}</td><td>{d.cantidad}</td><td>{Number(d.precioUnitario||0).toFixed(2)}</td><td><strong>{Number(d.subtotal||0).toFixed(2)}</strong></td></tr>)}</tbody></table>{!saleDetails(selected.id).length&&<div className="empty-state">No se encontraron líneas de detalle.</div>}</div><div className="detail-totals"><span>Subtotal <strong>{Number(selected.subtotal||0).toFixed(2)}</strong></span><span>Descuento <strong>{Number(selected.descuento||0).toFixed(2)}</strong></span><span className="grand">Total <strong>{Number(selected.total||0).toFixed(2)}</strong></span></div><div className="modal-actions"><button className="secondary-action" onClick={()=>receipt(selected)}><FileText size={16}/> Imprimir comprobante</button>{selected.estado!=="ANULADA"&&<button className="danger-action" onClick={()=>annul(selected)}><Ban size={16}/> Anular venta</button>}</div></motion.div></motion.div>}</AnimatePresence>
  </div>;
}
