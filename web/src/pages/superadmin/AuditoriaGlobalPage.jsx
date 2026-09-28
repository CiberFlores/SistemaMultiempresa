import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../services/firebase/firebaseConfig";
import AdvancedFilterBar from "../../components/filters/AdvancedFilterBar";

function getTimestamp(value) {
  if (!value) return null;
  if (value?.toDate) return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export default function AuditoriaGlobalPage() {
  const [rows, setRows] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [q, setQ] = useState("");
  const [accion, setAccion] = useState("TODOS");
  const [modulo, setModulo] = useState("TODOS");
  const [empresa, setEmpresa] = useState("TODOS");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  useEffect(() => {
    const unsubAudit = onSnapshot(
      collection(db, "auditorias"),
      (snapshot) =>
        setRows(
          snapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => (b.fecha?.toMillis?.() || 0) - (a.fecha?.toMillis?.() || 0))
        ),
      console.error
    );
    const unsubEmpresas = onSnapshot(
      collection(db, "empresas"),
      (snapshot) => setEmpresas(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))),
      console.error
    );
    const unsubUsuarios = onSnapshot(
      collection(db, "usuarios"),
      (snapshot) => setUsuarios(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))),
      console.error
    );
    return () => {
      unsubAudit();
      unsubEmpresas();
      unsubUsuarios();
    };
  }, []);

  const nombreEmpresa = (id) => empresas.find((item) => item.id === id)?.nombreComercial || (id ? id : "GLOBAL");
  const nombreUsuario = (id, fallback) => usuarios.find((item) => item.id === id)?.nombreCompleto || fallback || id || "-";

  const acciones = useMemo(
    () => Array.from(new Set(rows.map((row) => row.accion).filter(Boolean))).sort().map((value) => ({ value, label: value })),
    [rows]
  );
  const modulos = useMemo(
    () => Array.from(new Set(rows.map((row) => row.modulo).filter(Boolean))).sort().map((value) => ({ value, label: value })),
    [rows]
  );
  const empresasOptions = useMemo(
    () => empresas.map((item) => ({ value: item.id, label: item.nombreComercial || item.id })).sort((a, b) => a.label.localeCompare(b.label)),
    [empresas]
  );

  const filtered = useMemo(() => {
    const queryText = q.toLowerCase();
    return rows.filter((row) => {
      const userName = nombreUsuario(row.usuarioId, row.usuarioNombre);
      const companyName = nombreEmpresa(row.empresaId);
      const searchOk =
        !queryText ||
        [row.accion, row.modulo, row.detalle, userName, companyName, row.entidad, row.entidadId]
          .some((value) => String(value || "").toLowerCase().includes(queryText));
      const accionOk = accion === "TODOS" || row.accion === accion;
      const moduloOk = modulo === "TODOS" || row.modulo === modulo;
      const empresaOk = empresa === "TODOS" || row.empresaId === empresa;
      const date = getTimestamp(row.fecha);
      const desdeOk = !desde || !date || date >= new Date(`${desde}T00:00:00`);
      const hastaOk = !hasta || !date || date <= new Date(`${hasta}T23:59:59`);
      return searchOk && accionOk && moduloOk && empresaOk && desdeOk && hastaOk;
    });
  }, [rows, q, accion, modulo, empresa, desde, hasta, empresas, usuarios]);

  return (
    <div className="module-page">
      <div className="module-page-header">
        <div>
          <span className="eyebrow">CONTROL</span>
          <h1>Auditoría global</h1>
          <p>Rastrea quién hizo qué, en qué módulo, sobre qué empresa y en qué momento. Estos registros son de solo lectura para conservar la trazabilidad.</p>
        </div>
      </div>

      <AdvancedFilterBar
        search={q}
        onSearch={setQ}
        filters={[
          { key: "accion", label: "Todas las acciones", value: accion, onChange: setAccion, options: acciones },
          { key: "modulo", label: "Todos los módulos", value: modulo, onChange: setModulo, options: modulos },
          { key: "empresa", label: "Todas las empresas", value: empresa, onChange: setEmpresa, options: empresasOptions }
        ]}
        onClear={() => {
          setQ("");
          setAccion("TODOS");
          setModulo("TODOS");
          setEmpresa("TODOS");
          setDesde("");
          setHasta("");
        }}
      />

      <div className="report-date-row filter-range-grid">
        <label>Desde<input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></label>
        <label>Hasta<input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} /></label>
      </div>

      <section className="data-card glass-3d">
        <div className="data-card-meta"><strong>{filtered.length}</strong><span>evento(s) de {rows.length}</span></div>
        <div className="table-scroll">
          <table className="modern-table">
            <thead><tr><th>ACCIÓN</th><th>MÓDULO</th><th>USUARIO</th><th>EMPRESA</th><th>DETALLE</th><th>FECHA</th></tr></thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id}>
                  <td>{row.accion || "-"}</td>
                  <td>{row.modulo || "-"}</td>
                  <td>{nombreUsuario(row.usuarioId, row.usuarioNombre)}</td>
                  <td>{nombreEmpresa(row.empresaId)}</td>
                  <td>{row.detalle || row.entidad || "-"}</td>
                  <td>{getTimestamp(row.fecha)?.toLocaleString("es-BO") || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && <div className="empty-state">Aún no hay eventos con esos filtros.</div>}
        </div>
      </section>
    </div>
  );
}
