import { useEffect, useMemo, useState } from "react";
import { Eye, RefreshCw, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { collection, getDocs, query, where } from "firebase/firestore";
import useAuth from "../../hooks/useAuth";
import { db } from "../../services/firebase/firebaseConfig";
import { listarCompras } from "../../services/compraService";
import AdvancedFilterBar from "../../components/filters/AdvancedFilterBar";

const dateOf = (v) => v?.toDate?.() || (v ? new Date(v) : null);

export default function HistorialComprasPage() {
  const { usuario } = useAuth();
  const [rows, setRows] = useState([]);
  const [proveedores, setProveedores] = useState({});
  const [detalles, setDetalles] = useState([]);
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState("TODOS");
  const [supplier, setSupplier] = useState("TODOS");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [minTotal, setMinTotal] = useState("");
  const [maxTotal, setMaxTotal] = useState("");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!usuario?.empresaId) return;
    setLoading(true);
    const [compras, ps, ds] = await Promise.all([
      listarCompras(usuario.empresaId),
      getDocs(query(collection(db, "proveedores"), where("empresaId", "==", usuario.empresaId))),
      getDocs(query(collection(db, "detalleCompras"), where("empresaId", "==", usuario.empresaId)))
    ]);
    setRows(compras);
    setProveedores(Object.fromEntries(ps.docs.map((d)=>[d.id,{id:d.id,...d.data()}])));
    setDetalles(ds.docs.map((d)=>({id:d.id,...d.data()})));
    setLoading(false);
  };

  useEffect(()=>{load().catch(console.error)},[usuario?.empresaId]);

  const filtered = useMemo(()=>rows.filter((r)=>{
    const q=search.toLowerCase();
    const prov=proveedores[r.proveedorId];
    const searchOk=!q||[r.id,r.numeroDocumento,prov?.nombre,prov?.nit,r.metodoPago,r.usuarioId,r.sucursalId,r.estado].some(v=>String(v||"").toLowerCase().includes(q));
    const d=dateOf(r.fechaRegistro);
    const dateOk=(!from||!d||d>=new Date(`${from}T00:00:00`))&&(!to||!d||d<=new Date(`${to}T23:59:59`));
    const total=Number(r.total||0);
    const amountOk=(minTotal===""||total>=Number(minTotal))&&(maxTotal===""||total<=Number(maxTotal));
    return searchOk&&dateOk&&amountOk&&(method==="TODOS"||r.metodoPago===method)&&(supplier==="TODOS"||r.proveedorId===supplier);
  }),[rows,proveedores,search,method,supplier,from,to,minTotal,maxTotal]);

  const detailFor=(id)=>detalles.filter((d)=>d.compraId===id);
  const supplierOptions=Object.values(proveedores).sort((a,b)=>String(a.nombre||"").localeCompare(String(b.nombre||""))).map(p=>({value:p.id,label:p.nombre||p.nit||p.id}));

  return <div className="module-page">
    <div className="module-page-header"><div><span className="eyebrow">COMPRAS</span><h1>Historial de compras</h1><p>Consulta compras, proveedores, documentos, fechas, montos, métodos y detalle de productos.</p></div><button className="secondary-action" onClick={load}><RefreshCw size={16}/> Actualizar</button></div>
    <AdvancedFilterBar search={search} onSearch={setSearch} searchPlaceholder="Compra, documento, proveedor, NIT, usuario, sucursal…" filters={[{key:"metodo",label:"Todos los métodos",value:method,onChange:setMethod,options:[{value:"EFECTIVO",label:"Efectivo"},{value:"QR",label:"QR"},{value:"TARJETA",label:"Tarjeta"},{value:"TRANSFERENCIA",label:"Transferencia"},{value:"CREDITO",label:"Crédito"}]},{key:"proveedor",label:"Todos los proveedores",value:supplier,onChange:setSupplier,options:supplierOptions}]} onClear={()=>{setSearch("");setMethod("TODOS");setSupplier("TODOS");setFrom("");setTo("");setMinTotal("");setMaxTotal("")}}/>
    <div className="report-date-row filter-range-grid"><label>Desde<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>Hasta<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label><label>Total mínimo<input type="number" min="0" step="0.01" value={minTotal} onChange={e=>setMinTotal(e.target.value)}/></label><label>Total máximo<input type="number" min="0" step="0.01" value={maxTotal} onChange={e=>setMaxTotal(e.target.value)}/></label></div>
    <section className="data-card glass-3d">{loading?<div className="empty-state">Cargando compras…</div>:<div className="table-scroll"><table className="modern-table"><thead><tr><th>COMPRA</th><th>DOCUMENTO</th><th>PROVEEDOR</th><th>FECHA</th><th>MÉTODO</th><th>TOTAL</th><th>ESTADO</th><th>DETALLE</th></tr></thead><tbody>{filtered.map(r=><tr key={r.id}><td><code>{r.id.slice(0,10)}</code></td><td>{r.numeroDocumento||"-"}</td><td>{proveedores[r.proveedorId]?.nombre||r.proveedorId||"-"}</td><td>{dateOf(r.fechaRegistro)?.toLocaleString()||"-"}</td><td>{r.metodoPago||"-"}</td><td><strong>{Number(r.total||0).toFixed(2)}</strong></td><td><span className="status-pill active">{r.estado||"REGISTRADA"}</span></td><td><button className="icon-button" onClick={()=>setSelected(r)}><Eye size={16}/></button></td></tr>)}</tbody></table>{!filtered.length&&<div className="empty-state">Sin compras para los filtros seleccionados.</div>}</div>}</section>
    <AnimatePresence>{selected&&<motion.div className="modal-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={()=>setSelected(null)}><motion.div className="modal-card modal-wide glass-3d" initial={{opacity:0,scale:.95,y:20}} animate={{opacity:1,scale:1,y:0}} onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">DETALLE DE COMPRA</span><h2>{selected.numeroDocumento||selected.id}</h2></div><button onClick={()=>setSelected(null)}><X size={18}/></button></div><div className="detail-summary-grid"><div><span>Proveedor</span><strong>{proveedores[selected.proveedorId]?.nombre||"-"}</strong></div><div><span>Método</span><strong>{selected.metodoPago||"-"}</strong></div><div><span>Sucursal</span><strong>{selected.sucursalId||"-"}</strong></div><div><span>Usuario</span><strong>{selected.usuarioId||"-"}</strong></div></div><div className="table-scroll"><table className="modern-table"><thead><tr><th>PRODUCTO</th><th>CANTIDAD</th><th>COSTO</th><th>SUBTOTAL</th></tr></thead><tbody>{detailFor(selected.id).map(d=><tr key={d.id}><td>{d.nombreProducto||d.productoId}</td><td>{d.cantidad}</td><td>{Number(d.costoUnitario||0).toFixed(2)}</td><td><strong>{Number(d.subtotal||0).toFixed(2)}</strong></td></tr>)}</tbody></table>{!detailFor(selected.id).length&&<div className="empty-state">No se encontraron líneas de detalle.</div>}</div><div className="detail-totals"><span className="grand">Total <strong>{Number(selected.total||0).toFixed(2)}</strong></span></div></motion.div></motion.div>}</AnimatePresence>
  </div>;
}
