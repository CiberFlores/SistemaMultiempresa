import { useEffect, useMemo, useState } from "react";
import { Download, FileBarChart2 } from "lucide-react";
import useAuth from "../../hooks/useAuth";
import { suscribirColeccionEmpresa } from "../../services/genericCrudService";
import AdvancedFilterBar from "../filters/AdvancedFilterBar";

const toDate = (value) => value?.toDate?.() || (value ? new Date(value) : null);
const norm = (v) => String(v ?? "").toLowerCase();

export default function ReportPage({ title, description, collectionName, searchFields = [], amountField = "total", columns = [], dateField = "fecha" }) {
  const { usuario } = useAuth();
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [status, setStatus] = useState("TODOS");
  const [method, setMethod] = useState("TODOS");
  const [branch, setBranch] = useState("TODOS");

  useEffect(() => usuario?.empresaId ? suscribirColeccionEmpresa(collectionName, usuario.empresaId, setRows, console.error) : undefined, [collectionName, usuario?.empresaId]);

  const options = useMemo(() => ({
    estado: [...new Set(rows.map(r=>r.estado).filter(Boolean))].map(v=>({value:v,label:v})),
    metodoPago: [...new Set(rows.map(r=>r.metodoPago).filter(Boolean))].map(v=>({value:v,label:v})),
    sucursalId: [...new Set(rows.map(r=>r.sucursalId).filter(Boolean))].map(v=>({value:v,label:v}))
  }), [rows]);

  const filtered = useMemo(() => rows.filter((row) => {
    const q = norm(search);
    const searchOk = !q || searchFields.some((key) => norm(row[key]).includes(q)) || norm(row.id).includes(q);
    const d = toDate(row[dateField] || row.fechaRegistro || row.fechaActualizacion);
    const fromOk = !from || !d || d >= new Date(`${from}T00:00:00`);
    const toOk = !to || !d || d <= new Date(`${to}T23:59:59`);
    const amount = Number(row[amountField] || 0);
    const amountOk = (minAmount === "" || amount >= Number(minAmount)) && (maxAmount === "" || amount <= Number(maxAmount));
    const statusOk = status === "TODOS" || row.estado === status;
    const methodOk = method === "TODOS" || row.metodoPago === method;
    const branchOk = branch === "TODOS" || row.sucursalId === branch;
    return searchOk && fromOk && toOk && amountOk && statusOk && methodOk && branchOk;
  }), [rows, search, from, to, minAmount, maxAmount, status, method, branch, searchFields, dateField, amountField]);

  const total = filtered.reduce((sum, row) => sum + Number(row[amountField] || 0), 0);
  const clear = () => { setSearch(""); setFrom(""); setTo(""); setMinAmount(""); setMaxAmount(""); setStatus("TODOS"); setMethod("TODOS"); setBranch("TODOS"); };

  const exportCsv = () => {
    const headers = columns.map((c) => c.label);
    const lines = filtered.map((row) => columns.map((c) => JSON.stringify(c.value ? c.value(row) : c.render ? c.render(row) : row[c.key] ?? "")).join(","));
    const blob = new Blob([[headers.join(","), ...lines].join("\n")], {type:"text/csv;charset=utf-8"});
    const a = document.createElement("a");
    a.href=URL.createObjectURL(blob); a.download=`${collectionName}-${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };

  const filterOptions=[];
  if(options.metodoPago.length) filterOptions.push({key:"metodo",label:"Todos los métodos",value:method,onChange:setMethod,options:options.metodoPago});
  if(options.sucursalId.length) filterOptions.push({key:"sucursal",label:"Todas las sucursales",value:branch,onChange:setBranch,options:options.sucursalId});

  return <div className="module-page">
    <div className="module-page-header"><div><span className="eyebrow">ANALÍTICA</span><h1>{title}</h1><p>{description}</p></div><button className="primary-action" onClick={exportCsv}><Download size={17}/> Exportar CSV</button></div>
    <AdvancedFilterBar search={search} onSearch={setSearch} searchPlaceholder="Buscar en reporte…" status={options.estado.length?status:undefined} onStatus={options.estado.length?setStatus:undefined} statusOptions={[{value:"TODOS",label:"Todos los estados"},...options.estado]} filters={filterOptions} onClear={clear}/>
    <div className="report-date-row filter-range-grid"><label>Desde<input type="date" value={from} onChange={(e)=>setFrom(e.target.value)}/></label><label>Hasta<input type="date" value={to} onChange={(e)=>setTo(e.target.value)}/></label><label>{amountField} mínimo<input type="number" step="0.01" value={minAmount} onChange={(e)=>setMinAmount(e.target.value)} placeholder="0"/></label><label>{amountField} máximo<input type="number" step="0.01" value={maxAmount} onChange={(e)=>setMaxAmount(e.target.value)} placeholder="Sin límite"/></label></div>
    <section className="report-metrics"><article className="neo-metric"><FileBarChart2/><div><span>Registros filtrados</span><strong>{filtered.length}</strong></div></article><article className="neo-metric"><FileBarChart2/><div><span>Total acumulado ({amountField})</span><strong>{total.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</strong></div></article></section>
    <section className="data-card glass-3d"><div className="table-scroll"><table className="modern-table"><thead><tr>{columns.map((c)=><th key={c.key}>{c.label}</th>)}</tr></thead><tbody>{filtered.map((row)=><tr key={row.id}>{columns.map((c)=><td key={c.key}>{c.render ? c.render(row) : c.value ? c.value(row) : String(row[c.key] ?? "-")}</td>)}</tr>)}</tbody></table>{!filtered.length && <div className="empty-state">Sin datos para los filtros seleccionados.</div>}</div></section>
  </div>;
}
