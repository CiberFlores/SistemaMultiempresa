import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { Activity, Building2, CalendarDays, Users } from "lucide-react";
import { db } from "../../services/firebase/firebaseConfig";
import AdvancedFilterBar from "../../components/filters/AdvancedFilterBar";


const POR_PAGINA = 40;

const ACCIONES = {
  CREAR: { etiqueta: "Creó", tono: "ok" },
  ACTUALIZAR: { etiqueta: "Actualizó", tono: "aviso" },
  ELIMINAR: { etiqueta: "Eliminó", tono: "peligro" },
  CAMBIAR_ESTADO: { etiqueta: "Cambió el estado", tono: "info" },
  RETIRAR_ACCESO: { etiqueta: "Retiró el acceso", tono: "peligro" },
  REGISTRAR_VENTA: { etiqueta: "Registró una venta", tono: "ok" },
  REGISTRAR_COMPRA: { etiqueta: "Registró una compra", tono: "ok" }
};

const areaDe = (m) => (m === "clientes" || m === "metodosPago" ? "otros" : m);

const MODULOS = {
  empresas: "Empresas",
  usuarios: "Usuarios",
  ventas: "Ventas",
  compras: "Compras",
  otros: "Otros",
  modulos: "Módulos",
  productos: "Productos",
  proveedores: "Proveedores",
  inventario: "Inventario",
  sucursales: "Sucursales",
  respaldos: "Respaldos"
};

function getTimestamp(value) {
  if (!value) return null;
  if (value?.toDate) return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// "CAMBIAR_ESTADO" → "Cambiar estado"
function humanizar(texto) {
  const limpio = String(texto || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .toLowerCase()
    .trim();

  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

function infoAccion(codigo) {
  if (ACCIONES[codigo]) {
    return ACCIONES[codigo];
  }

  const texto = String(codigo || "");
  let tono = "neutro";

  if (/ELIMIN|RETIR|BORR|ANUL/.test(texto)) tono = "peligro";
  else if (/CREAR|REGISTR|AGREG/.test(texto)) tono = "ok";
  else if (/ACTUAL|EDIT|MODIF/.test(texto)) tono = "aviso";

  return { etiqueta: humanizar(texto) || "-", tono };
}

function nombreModulo(valor) {
  return MODULOS[areaDe(valor)] || humanizar(valor) || "-";
}

const formatoFecha = new Intl.DateTimeFormat("es-BO", {
  day: "2-digit",
  month: "short",
  year: "numeric"
});

const formatoHora = new Intl.DateTimeFormat("es-BO", {
  hour: "2-digit",
  minute: "2-digit"
});

function inicio(dias) {
  const fecha = new Date();
  fecha.setHours(0, 0, 0, 0);
  fecha.setDate(fecha.getDate() - dias);
  return fecha;
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
  const [limite, setLimite] = useState(POR_PAGINA);

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

  const nombreEmpresa = (id) =>
    empresas.find((item) => item.id === id)?.nombreComercial || (id ? id : "");
  const nombreUsuario = (id, fallback) =>
    usuarios.find((item) => item.id === id)?.nombreCompleto || fallback || id || "-";

  const acciones = useMemo(
    () =>
      Array.from(new Set(rows.map((row) => row.accion).filter(Boolean)))
        .sort()
        .map((value) => ({ value, label: infoAccion(value).etiqueta })),
    [rows]
  );
  const modulos = useMemo(
    () =>
      Array.from(new Set(rows.map((row) => areaDe(row.modulo)).filter(Boolean)))
        .sort()
        .map((value) => ({ value, label: nombreModulo(value) })),
    [rows]
  );
  const empresasOptions = useMemo(
    () =>
      empresas
        .map((item) => ({ value: item.id, label: item.nombreComercial || item.id }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [empresas]
  );

  const resumen = useMemo(() => {
    const hoy = inicio(0);
    const semana = inicio(6);
    let deHoy = 0;
    let deSemana = 0;

    rows.forEach((row) => {
      const fecha = getTimestamp(row.fecha);

      if (!fecha) return;
      if (fecha >= hoy) deHoy += 1;
      if (fecha >= semana) deSemana += 1;
    });

    return {
      hoy: deHoy,
      semana: deSemana,
      personas: new Set(rows.map((row) => row.usuarioId).filter(Boolean)).size,
      empresas: new Set(rows.map((row) => row.empresaId).filter(Boolean)).size
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const queryText = q.toLowerCase();
    return rows.filter((row) => {
      const userName = nombreUsuario(row.usuarioId, row.usuarioNombre);
      const companyName = nombreEmpresa(row.empresaId) || "Plataforma";
      const searchOk =
        !queryText ||
        [row.accion, infoAccion(row.accion).etiqueta, row.modulo, row.detalle, userName, companyName, row.entidad, row.entidadId]
          .some((value) => String(value || "").toLowerCase().includes(queryText));
      const accionOk = accion === "TODOS" || row.accion === accion;
      const moduloOk = modulo === "TODOS" || areaDe(row.modulo) === modulo;
      const empresaOk = empresa === "TODOS" || row.empresaId === empresa;
      const date = getTimestamp(row.fecha);
      const desdeOk = !desde || !date || date >= new Date(`${desde}T00:00:00`);
      const hastaOk = !hasta || !date || date <= new Date(`${hasta}T23:59:59`);
      return searchOk && accionOk && moduloOk && empresaOk && desdeOk && hastaOk;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, q, accion, modulo, empresa, desde, hasta, empresas, usuarios]);

  const visibles = filtered.slice(0, limite);

  const tarjetas = [
    { titulo: "Eventos de hoy", valor: resumen.hoy, icono: Activity },
    { titulo: "Últimos 7 días", valor: resumen.semana, icono: CalendarDays },
    { titulo: "Personas con actividad", valor: resumen.personas, icono: Users },
    { titulo: "Empresas con actividad", valor: resumen.empresas, icono: Building2 }
  ];

  return (
    <div className="module-page">
      <div className="module-page-header">
        <div>
          <h1>Auditoría global</h1>
          <p>Quién hizo qué, en qué módulo, sobre qué empresa y cuándo. Los registros son de solo lectura para conservar la trazabilidad.</p>
        </div>
      </div>

      <section className="aud-resumen" aria-label="Resumen de actividad">
        {tarjetas.map(({ titulo, valor, icono: Icono }) => (
          <article key={titulo}>
            <span aria-hidden="true"><Icono size={20} /></span>
            <div>
              <small>{titulo}</small>
              <strong>{valor}</strong>
            </div>
          </article>
        ))}
      </section>

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
          setLimite(POR_PAGINA);
        }}
      />

      <div className="aud-fechas">
        <label>
          <span>Desde</span>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </label>
        <label>
          <span>Hasta</span>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </label>
      </div>

      <section className="data-card glass-3d">
        <div className="data-card-meta"><strong>{filtered.length}</strong><span>evento(s) de {rows.length}</span></div>
        <div className="table-scroll">
          <table className="modern-table aud-tabla">
            <thead><tr><th>ACCIÓN</th><th>QUÉ PASÓ</th><th>QUIÉN</th><th>EMPRESA</th><th>CUÁNDO</th></tr></thead>
            <tbody>
              {visibles.map((row) => {
                const info = infoAccion(row.accion);
                const fecha = getTimestamp(row.fecha);
                const persona = nombreUsuario(row.usuarioId, row.usuarioNombre);
                const empresaNombre = nombreEmpresa(row.empresaId);

                return (
                  <tr key={row.id}>
                    <td><span className="aud-accion" data-tono={info.tono}>{info.etiqueta}</span></td>
                    <td>
                      <strong className="aud-detalle">{row.detalle || row.entidad || "-"}</strong>
                      <small className="table-sub">{nombreModulo(row.modulo)}</small>
                    </td>
                    <td>
                      <span className="aud-persona">
                        <i aria-hidden="true">{String(persona).trim().charAt(0).toUpperCase() || "?"}</i>
                        {persona}
                      </span>
                    </td>
                    <td>
                      <span className="aud-empresa" data-global={!empresaNombre}>
                        {empresaNombre || "Plataforma"}
                      </span>
                    </td>
                    <td>
                      {fecha ? (
                        <span className="aud-fecha">
                          <strong>{formatoFecha.format(fecha)}</strong>
                          <small>{formatoHora.format(fecha)}</small>
                        </span>
                      ) : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!filtered.length && <div className="empty-state">Aún no hay eventos con esos filtros.</div>}
        </div>

        {filtered.length > visibles.length && (
          <div className="aud-mas">
            <button type="button" className="secondary-action" onClick={() => setLimite((valor) => valor + POR_PAGINA)}>
              Ver {Math.min(POR_PAGINA, filtered.length - visibles.length)} más
            </button>
            <span>Mostrando {visibles.length} de {filtered.length}</span>
          </div>
        )}
      </section>
    </div>
  );
}
