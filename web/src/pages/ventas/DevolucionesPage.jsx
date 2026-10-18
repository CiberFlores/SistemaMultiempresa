import { useEffect, useMemo, useState } from "react";
import { RotateCcw, Search, Undo2 } from "lucide-react";
import useAuth from "../../hooks/useAuth";
import AdvancedFilterBar from "../../components/filters/AdvancedFilterBar";
import { cargarDatosDevoluciones, registrarDevolucion } from "../../services/devolucionService";

const dateOf = (value) => value?.toDate?.() || (value ? new Date(value) : null);

export default function DevolucionesPage() {
  const { usuario } = useAuth();
  const [ventas, setVentas] = useState([]);
  const [detalles, setDetalles] = useState([]);
  const [devoluciones, setDevoluciones] = useState([]);
  const [ventaId, setVentaId] = useState("");
  const [detalleVentaId, setDetalleVentaId] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [motivo, setMotivo] = useState("");
  const [resolucion, setResolucion] = useState("REINTEGRO");
  const [reingresaStock, setReingresaStock] = useState(true);
  const [search, setSearch] = useState("");
  const [resolutionFilter, setResolutionFilter] = useState("TODOS");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const load = async () => {
    if (!usuario?.empresaId) return;
    setLoading(true);
    try {
      const data = await cargarDatosDevoluciones(usuario.empresaId);
      setVentas(data.ventas);
      setDetalles(data.detalles);
      setDevoluciones(data.devoluciones);
    } finally { setLoading(false); }
  };

  useEffect(() => { load().catch((e) => setError(e.message)); }, [usuario?.empresaId]);

  const ventasValidas = useMemo(() => ventas.filter((v) => v.estado !== "ANULADA"), [ventas]);
  const detallesVenta = useMemo(() => detalles.filter((d) => d.ventaId === ventaId), [detalles, ventaId]);
  const selectedDetail = detalles.find((d) => d.id === detalleVentaId);
  const returnedQty = devoluciones.filter((d) => d.detalleVentaId === detalleVentaId && d.estado !== "ANULADA").reduce((s, d) => s + Number(d.cantidad || 0), 0);
  const maxQty = Math.max(0, Number(selectedDetail?.cantidad || 0) - returnedQty);

  const filtered = useMemo(() => devoluciones.filter((row) => {
    const q = search.trim().toLowerCase();
    const searchOk = !q || [row.id, row.ventaId, row.productoId, row.productoNombre, row.motivo, row.resolucion, row.usuarioId]
      .some((v) => String(v || "").toLowerCase().includes(q));
    const resolutionOk = resolutionFilter === "TODOS" || row.resolucion === resolutionFilter;
    return searchOk && resolutionOk;
  }), [devoluciones, search, resolutionFilter]);

  const save = async (event) => {
    event.preventDefault();
    try {
      setSaving(true); setError(""); setOk("");
      await registrarDevolucion({
        empresaId: usuario.empresaId,
        ventaId,
        detalleVentaId,
        cantidad,
        motivo,
        resolucion,
        reingresaStock,
        usuarioId: usuario.uid,
        usuarioNombre: usuario.nombreCompleto || usuario.correo || usuario.email || ""
      });
      setOk("Devolución registrada correctamente. El inventario fue actualizado según la opción seleccionada.");
      setDetalleVentaId(""); setCantidad(1); setMotivo(""); setResolucion("REINTEGRO"); setReingresaStock(true);
      await load();
    } catch (e) { setError(e.message || "No se pudo registrar la devolución."); }
    finally { setSaving(false); }
  };

  return <div className="module-page">
    <div className="module-page-header"><div><span className="eyebrow">VENTAS</span><h1>Devoluciones</h1><p>Procesa devoluciones reales, controla cantidades ya devueltas y reintegra stock automáticamente.</p></div><button className="secondary-action" onClick={load}><RotateCcw size={16}/> Actualizar</button></div>

    <section className="data-card glass-3d return-form-card">
      <div className="card-title"><Undo2/><div><h3>Nueva devolución</h3><p>Selecciona la venta y el producto que regresa.</p></div></div>
      <form className="smart-form" onSubmit={save}>
        <label className="field-block"><span>Venta *</span><select value={ventaId} onChange={(e)=>{setVentaId(e.target.value);setDetalleVentaId("")}} required><option value="">Seleccionar venta</option>{ventasValidas.map((v)=><option key={v.id} value={v.id}>{v.id.slice(0,12)} · {Number(v.total||0).toFixed(2)} · {dateOf(v.fechaRegistro)?.toLocaleDateString()||""}</option>)}</select></label>
        <label className="field-block"><span>Producto *</span><select value={detalleVentaId} onChange={(e)=>{setDetalleVentaId(e.target.value);setCantidad(1)}} required disabled={!ventaId}><option value="">Seleccionar producto</option>{detallesVenta.map((d)=>{const returned=devoluciones.filter(x=>x.detalleVentaId===d.id&&x.estado!=="ANULADA").reduce((s,x)=>s+Number(x.cantidad||0),0);const available=Math.max(0,Number(d.cantidad||0)-returned);return <option key={d.id} value={d.id} disabled={available<=0}>{d.nombreProducto||d.productoId} · disponible {available}/{d.cantidad}</option>})}</select></label>
        <label className="field-block"><span>Cantidad * {selectedDetail ? `(máx. ${maxQty})` : ""}</span><input type="number" min="1" max={maxQty||1} step="1" value={cantidad} onChange={(e)=>setCantidad(e.target.value)} required/></label>
        <label className="field-block"><span>Resolución</span><select value={resolucion} onChange={(e)=>setResolucion(e.target.value)}><option value="REINTEGRO">Reintegro</option><option value="CAMBIO">Cambio de producto</option><option value="NOTA_CREDITO">Nota de crédito</option><option value="GARANTIA">Garantía</option></select></label>
        <label className="field-block"><span>¿Reingresa al stock?</span><select value={reingresaStock?"SI":"NO"} onChange={(e)=>setReingresaStock(e.target.value==="SI")}><option value="SI">Sí, producto utilizable</option><option value="NO">No, dañado/no vendible</option></select></label>
        <label className="field-block field-span-2"><span>Motivo *</span><textarea rows="3" value={motivo} onChange={(e)=>setMotivo(e.target.value)} placeholder="Motivo detallado de la devolución" required/></label>
        {error&&<div className="form-error field-span-2">{error}</div>}{ok&&<div className="success-banner field-span-2">{ok}</div>}
        <div className="modal-actions field-span-2"><button className="primary-action" disabled={saving||!detalleVentaId||Number(cantidad)>maxQty}>{saving?"Procesando…":"Registrar devolución"}</button></div>
      </form>
    </section>

    <AdvancedFilterBar search={search} onSearch={setSearch} searchPlaceholder="Venta, producto, motivo, usuario…" filters={[{key:"resolucion",label:"Todas las resoluciones",value:resolutionFilter,onChange:setResolutionFilter,options:[{value:"REINTEGRO",label:"Reintegro"},{value:"CAMBIO",label:"Cambio"},{value:"NOTA_CREDITO",label:"Nota de crédito"},{value:"GARANTIA",label:"Garantía"}]}]} onClear={()=>{setSearch("");setResolutionFilter("TODOS")}}/>
    <section className="data-card glass-3d">{loading?<div className="empty-state">Cargando…</div>:<div className="table-scroll"><table className="modern-table"><thead><tr><th>DEVOLUCIÓN</th><th>VENTA</th><th>PRODUCTO</th><th>CANT.</th><th>RESOLUCIÓN</th><th>STOCK</th><th>MOTIVO</th><th>FECHA</th></tr></thead><tbody>{filtered.map((r)=><tr key={r.id}><td><code>{r.id.slice(0,9)}</code></td><td><code>{String(r.ventaId||"").slice(0,9)}</code></td><td>{r.productoNombre||r.productoId}</td><td>{r.cantidad}</td><td>{r.resolucion}</td><td><span className={`status-pill ${r.reingresaStock?"active":"warning"}`}>{r.reingresaStock?"REINGRESADO":"NO REINGRESA"}</span></td><td>{r.motivo}</td><td>{dateOf(r.fechaRegistro)?.toLocaleString()||"-"}</td></tr>)}</tbody></table>{!filtered.length&&<div className="empty-state"><Search size={28}/> Sin devoluciones para los filtros seleccionados.</div>}</div>}</section>
  </div>;
}
