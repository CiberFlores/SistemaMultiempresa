import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  MailCheck,
  ShieldCheck
} from "lucide-react";
import useAuth from "../../hooks/useAuth";
import PasswordStrength from "../../components/common/PasswordStrength";
import { cambiarContrasenaActual } from "../../services/firebase/authService";
import { validarPassword } from "../../utils/password";

export default function SeguridadCuentaPage() {
  const { usuario } = useAuth();
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [showActual, setShowActual] = useState(false);
  const [showNueva, setShowNueva] = useState(false);
  const [showConfirmacion, setShowConfirmacion] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const seguridad = useMemo(() => validarPassword(nueva), [nueva]);

  const submit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      setOk("");
      if (nueva !== confirmacion) throw new Error("Las contraseñas nuevas no coinciden.");
      await cambiarContrasenaActual(actual, nueva);
      setActual("");
      setNueva("");
      setConfirmacion("");
      setOk("Contraseña actualizada correctamente.");
    } catch (err) {
      const code = err?.code || "";
      if (code.includes("invalid-credential") || code.includes("wrong-password")) {
        setError("La contraseña actual no es correcta.");
      } else {
        setError(err?.message || "No se pudo cambiar la contraseña.");
      }
    } finally {
      setSaving(false);
    }
  };

  const PasswordField = ({ label, value, setValue, visible, setVisible, autoComplete }) => (
    <label className="field-block">
      <span>{label}</span>
      <div className="password-input-wrap-v4">
        <input
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required
        />
        <button
          type="button"
          className="password-eye-v4"
          onClick={() => setVisible((current) => !current)}
          title={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </label>
  );

  return (
    <div className="module-page">
      <div className="module-page-header">
        <div>
          <span className="eyebrow">MI CUENTA</span>
          <h1>Seguridad</h1>
          <p>Protege tu acceso y revisa el estado de verificación de tu identidad.</p>
        </div>
      </div>

      <section className="security-account-grid">
        <article className="data-card glass-3d security-account-card">
          <div className="card-title"><ShieldCheck /><div><h3>Estado de la cuenta</h3><p>Información vinculada a Firebase Authentication.</p></div></div>
          <div className="security-facts">
            <div><MailCheck /><span>Correo</span><strong>{usuario?.correo || usuario?.email || "-"}</strong></div>
            <div><CheckCircle2 /><span>Correo verificado</span><strong className="good-text">SÍ</strong></div>
            <div><LockKeyhole /><span>Tipo de usuario</span><strong>{usuario?.tipoUsuario || "-"}</strong></div>
            <div><KeyRound /><span>Política</span><strong>Contraseña fuerte</strong></div>
          </div>
        </article>

        <article className="data-card glass-3d security-account-card">
          <div className="card-title"><KeyRound /><div><h3>Cambiar contraseña</h3><p>Se requiere reautenticación con la contraseña actual.</p></div></div>
          <form className="smart-form" onSubmit={submit}>
            <div className="field-span-2">
              <PasswordField label="Contraseña actual" value={actual} setValue={setActual} visible={showActual} setVisible={setShowActual} autoComplete="current-password" />
            </div>
            <PasswordField label="Nueva contraseña" value={nueva} setValue={setNueva} visible={showNueva} setVisible={setShowNueva} autoComplete="new-password" />
            <PasswordField label="Confirmar nueva contraseña" value={confirmacion} setValue={setConfirmacion} visible={showConfirmacion} setVisible={setShowConfirmacion} autoComplete="new-password" />
            <div className="field-span-2"><PasswordStrength value={nueva} /></div>
            {error && <div className="form-error field-span-2">{error}</div>}
            {ok && <div className="success-banner field-span-2">{ok}</div>}
            <div className="modal-actions field-span-2"><button className="primary-action" disabled={saving || !seguridad.valid || nueva !== confirmacion}>{saving ? "Actualizando…" : "Actualizar contraseña"}</button></div>
          </form>
        </article>
      </section>
    </div>
  );
}
