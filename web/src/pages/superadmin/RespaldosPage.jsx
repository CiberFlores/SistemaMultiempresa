import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  DatabaseBackup,
  Download,
  FileJson2,
  HardDriveDownload,
  History,
  Info,
  ShieldCheck
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import useAuth from "../../hooks/useAuth";
import {
  generarRespaldoLocal,
  suscribirHistorialRespaldos
} from "../../services/platformService";
import { registrarAuditoria } from "../../services/auditService";

function formatBytes(bytes = 0) {
  const value = Number(bytes || 0);
  if (!value) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1
  );

  return `${(value / 1024 ** index).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function formatDate(value) {
  if (!value) return "-";

  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("es-BO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function descargarBlob(blob, nombreArchivo) {
  if (!blob) return;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = nombreArchivo || "respaldo-multiempresa.json";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function shortHash(hash = "") {
  if (!hash) return "No calculado";
  if (hash.length <= 22) return hash;
  return `${hash.slice(0, 12)}…${hash.slice(-8)}`;
}

export default function RespaldosPage() {
  const { usuario } = useAuth();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // Conserva el último JSON generado mientras esta pestaña siga abierta.
  // Esto permite volver a descargar exactamente el mismo archivo durante la sesión.
  const [archivoSesion, setArchivoSesion] = useState(null);

  useEffect(() => {
    const unsubscribe = suscribirHistorialRespaldos(
      (data) => {
        setRows(data);
        setLoading(false);
      },
      (err) => {
        console.error("Error al leer historial de respaldos:", err);
        setError(
          "No se pudo cargar el historial de respaldos. Inténtalo de nuevo en unos minutos."
        );
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const ultimo = useMemo(() => rows[0] || null, [rows]);

  const generar = async () => {
    if (busy) return;

    try {
      setBusy(true);
      setError("");
      setOk("");

      const result = await generarRespaldoLocal({
        usuarioId: usuario?.uid || "",
        usuarioNombre:
          usuario?.nombreCompleto ||
          usuario?.correo ||
          "SUPER_ADMIN",
        usuarioCorreo: usuario?.correo || ""
      });

      descargarBlob(result.blob, result.nombreArchivo);

      setArchivoSesion({
        id: result.id,
        nombreArchivo: result.nombreArchivo,
        blob: result.blob,
        fechaIso: result.fechaIso
      });

      try {
        await registrarAuditoria({
          empresaId: null,
          usuarioId: usuario?.uid,
          usuarioNombre:
            usuario?.nombreCompleto ||
            usuario?.correo ||
            "SUPER_ADMIN",
          accion: "GENERAR_RESPALDO",
          modulo: "respaldos",
          entidad: "respaldo",
          entidadId: result.id,
          detalle: `Generó la exportación JSON local ${result.nombreArchivo}`
        });
      } catch (auditError) {
        // El respaldo ya fue creado correctamente. Un fallo secundario de auditoría
        // no debe impedir que el usuario conserve el archivo.
        console.warn("No se pudo registrar la auditoría del respaldo:", auditError);
      }

      setOk(
        "Respaldo generado correctamente. El archivo se descargó en tu equipo y quedó registrado en el historial."
      );
    } catch (err) {
      console.error("Error al generar respaldo:", err);

      if (err?.code === "permission-denied") {
        setError(
          "No tienes permiso para esta operación. Comprueba que tu cuenta de super administrador esté activa."
        );
      } else {
        setError(err?.message || "No se pudo generar el respaldo.");
      }
    } finally {
      setBusy(false);
    }
  };

  const descargarUltimoDeSesion = () => {
    if (!archivoSesion?.blob) return;
    descargarBlob(archivoSesion.blob, archivoSesion.nombreArchivo);
  };

  const puedeRedescargar = (row) =>
    Boolean(
      archivoSesion?.blob &&
        archivoSesion?.id === row?.id
    );

  return (
    <div className="module-page">
      <div className="module-page-header">
        <div>
          <span className="eyebrow">SISTEMA</span>
          <h1>Respaldos</h1>
          <p>
            Exporta toda la información de la plataforma a un archivo y conserva el historial de cada exportación.
          </p>
        </div>

        <button
          className="primary-action backup-primary-v4"
          onClick={generar}
          disabled={busy}
        >
          <DatabaseBackup size={18} />
          {busy ? "Generando respaldo…" : "Generar nuevo respaldo"}
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}
      {ok && <div className="status-message success">{ok}</div>}

      <section className="backup-explainer-grid-v4">
        <article className="hero-system-card glass-3d">
          <FileJson2 size={46} />
          <div>
            <h2>Exportación completa en un archivo</h2>
            <p>
              El sistema lee las colecciones principales, conserva los identificadores y los valores de cada registro y genera un archivo descargable. No modifica ni elimina información.
            </p>
          </div>
        </article>

        <article className="hero-system-card glass-3d">
          <ShieldCheck size={46} />
          <div>
            <h2>El archivo queda en tu equipo</h2>
            <p>
              El archivo se descarga en tu computadora. La plataforma solo guarda el historial del respaldo: fecha, usuario, tamaño, registros y firma de verificación.
            </p>
          </div>
        </article>
      </section>

      <div className="warning-panel" style={{ marginBottom: 22 }}>
        <Info size={18} style={{ flexShrink: 0 }} />
        <div>
          <strong>Importante:</strong> el historial confirma que el respaldo se realizó, pero no guarda el archivo completo. Conserva el archivo descargado en una carpeta segura. Mientras esta pestaña siga abierta podrás volver a descargarlo.
        </div>
      </div>

      <section className="data-card glass-3d backup-latest-v4">
        <div className="card-title">
          <Clock3 />
          <div>
            <h3>Último respaldo</h3>
            <p>Información de la exportación más reciente registrada.</p>
          </div>
        </div>

        {!ultimo ? (
          <div className="empty-state">
            Todavía no existen respaldos registrados.
          </div>
        ) : (
          <div className="backup-latest-grid-v4">
            <div>
              <span>Archivo</span>
              <strong>{ultimo.nombreArchivo || "-"}</strong>
            </div>

            <div>
              <span>Fecha y hora</span>
              <strong>
                {formatDate(ultimo.fechaRegistro || ultimo.fechaIso)}
              </strong>
            </div>

            <div>
              <span>Tamaño</span>
              <strong>{formatBytes(ultimo.tamanoBytes)}</strong>
            </div>

            <div>
              <span>Documentos</span>
              <strong>{ultimo.totalDocumentos ?? "-"}</strong>
            </div>

            <div>
              <span>Colecciones</span>
              <strong>{ultimo.totalColecciones ?? "-"}</strong>
            </div>

            <div>
              <span>Generado por</span>
              <strong>
                {ultimo.generadoPorNombre ||
                  ultimo.generadoPorCorreo ||
                  "SUPER_ADMIN"}
              </strong>
            </div>

            <div>
              <span>Integridad SHA-256</span>
              <strong title={ultimo.checksumSha256 || ""}>
                {shortHash(ultimo.checksumSha256)}
              </strong>
            </div>

            <div>
              <span>Estado</span>
              <strong>{ultimo.estado || "COMPLETADO"}</strong>
            </div>

            {puedeRedescargar(ultimo) ? (
              <button
                className="primary-action"
                onClick={descargarUltimoDeSesion}
              >
                <Download size={17} />
                Descargar nuevamente
              </button>
            ) : (
              <button
                className="primary-action"
                onClick={generar}
                disabled={busy}
                title="El archivo histórico no se guarda en la plataforma. Genera una copia nueva."
              >
                <DatabaseBackup size={17} />
                Generar copia actual
              </button>
            )}
          </div>
        )}
      </section>

      <section className="data-card glass-3d">
        <div className="card-title">
          <History />
          <div>
            <h3>Historial de respaldos</h3>
            <p>
              Registro permanente de las exportaciones realizadas.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">Cargando historial…</div>
        ) : rows.length === 0 ? (
          <div className="empty-state">No hay respaldos registrados.</div>
        ) : (
          <div className="table-scroll">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>ARCHIVO</th>
                  <th>FECHA Y HORA</th>
                  <th>TAMAÑO</th>
                  <th>DOCUMENTOS</th>
                  <th>COLECCIONES</th>
                  <th>GENERADO POR</th>
                  <th>ESTADO</th>
                  <th>ARCHIVO</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.nombreArchivo || "-"}</strong>
                      <small className="table-sub">
                        v{row.version || 1} · {row.tipo || "RESPALDO"}
                      </small>
                    </td>

                    <td>{formatDate(row.fechaRegistro || row.fechaIso)}</td>
                    <td>{formatBytes(row.tamanoBytes)}</td>
                    <td>{row.totalDocumentos ?? "-"}</td>
                    <td>{row.totalColecciones ?? "-"}</td>
                    <td>
                      {row.generadoPorNombre ||
                        row.generadoPorCorreo ||
                        "SUPER_ADMIN"}
                    </td>
                    <td>
                      <span className="status-pill active">
                        {row.estado || "COMPLETADO"}
                      </span>
                    </td>
                    <td>
                      {puedeRedescargar(row) ? (
                        <button
                          className="mini-download-v4"
                          onClick={() =>
                            descargarBlob(
                              archivoSesion.blob,
                              archivoSesion.nombreArchivo
                            )
                          }
                        >
                          <Download size={15} />
                          Descargar
                        </button>
                      ) : (
                        <span
                          className="table-sub"
                          title="El archivo se descargó en el equipo y no está guardado en la plataforma."
                        >
                          Solo historial
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="data-card glass-3d" style={{ marginTop: 22 }}>
        <div className="card-title">
          <HardDriveDownload />
          <div>
            <h3>Cómo guardar correctamente tus respaldos</h3>
            <p>Recomendaciones para conservarlos de forma segura.</p>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: 14
          }}
        >
          <div className="hero-system-card glass-3d">
            <CheckCircle2 size={27} />
            <div>
              <strong>1. Genera el respaldo</strong>
              <p>El navegador descargará automáticamente el archivo.</p>
            </div>
          </div>

          <div className="hero-system-card glass-3d">
            <HardDriveDownload size={27} />
            <div>
              <strong>2. Guarda una copia</strong>
              <p>Conserva los archivos en una carpeta segura y exclusiva.</p>
            </div>
          </div>

          <div className="hero-system-card glass-3d">
            <AlertTriangle size={27} />
            <div>
              <strong>3. No borres el archivo</strong>
              <p>
                La plataforma conserva el historial, no el contenido completo del archivo.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
