import { DatabaseBackup, Download } from "lucide-react";
import { useState } from "react";
import { exportarRespaldoBasico } from "../../services/platformService";

export default function RespaldosPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const run = async () => {
    try {
      setBusy(true);
      setError("");
      setOk("");

      const data = await exportarRespaldoBasico();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `respaldo-multiempresa-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setOk("Respaldo generado correctamente.");
    } catch (err) {
      console.error("Error al generar respaldo:", err);
      if (err?.code === "permission-denied") {
        setError("Firestore rechazó el acceso. Publica las reglas firestore.rules actualizadas en Firebase y vuelve a intentarlo.");
      } else {
        setError(err?.message || "No se pudo generar el respaldo.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="module-page">
      <div className="module-page-header">
        <div>
          <span className="eyebrow">SISTEMA</span>
          <h1>Respaldos</h1>
          <p>Exportación administrativa de colecciones principales en formato JSON.</p>
        </div>

        <button className="primary-action" onClick={run} disabled={busy}>
          <Download size={17} />
          {busy ? "Generando…" : "Generar respaldo"}
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}
      {ok && <div className="status-message success">{ok}</div>}

      <section className="hero-system-card glass-3d">
        <DatabaseBackup size={48} />
        <div>
          <h2>Respaldo lógico de Firestore</h2>
          <p>
            Descarga una copia legible de datos principales. No reemplaza las
            herramientas oficiales de backup administrado de Google Cloud.
          </p>
        </div>
      </section>
    </div>
  );
}
