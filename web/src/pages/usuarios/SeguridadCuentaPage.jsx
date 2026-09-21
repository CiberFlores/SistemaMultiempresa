import { useMemo, useState } from "react";
import { CheckCircle2, KeyRound, LockKeyhole, MailCheck, ShieldCheck } from "lucide-react";
import useAuth from "../../hooks/useAuth";
import PasswordStrength from "../../components/common/PasswordStrength";
import { cambiarContrasenaActual } from "../../services/firebase/authService";
import { validarPassword } from "../../utils/password";

export default function SeguridadCuentaPage() {
  const { usuario } = useAuth();
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const seguridad = useMemo(() => validarPassword(nueva), [nueva]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true); setError(""); setOk("");
      if (nueva !== confirmacion) throw new Error("Las contraseñas nuevas no coinciden.");
      await cambiarContrasenaActual(actual, nueva);
      setActual(""); setNueva(""); setConfirmacion("");
      setOk("Contraseña actualizada correctamente.");
    } catch (err) {
      const code = err?.code || "";
      if (code.includes("invalid-credential") || code.includes("wrong-password")) setError("La contraseña actual no es correcta.");
      else setError(err?.message || "No se pudo cambiar la contraseña.");
    } finally { setSaving(false); }
  };

  return <div className="module-page">
    <div className="module-page-header"><div><span className="eyebrow">MI CUENTA</span><h1>Seguridad</h1><p>Protege tu acceso y revisa el estado de verificación de tu identidad.</p></div></div>
    <section className="security-account-grid">
      <article className="data-card glass-3d security-account-card">
        <div className="card-title"><ShieldCheck/><div><h3>Estado de la cuenta</h3><p>Información vinculada a Firebase Authentication.</p></div></div>
        <div className="security-facts">
          <div><MailCheck/><span>Correo</span><strong>{usuario?.correo || usuario?.email || "-"}</strong></div>
          <div><CheckCircle2/><span>Correo verificado</span><strong className="good-text">SÍ</strong></div>
          <div><LockKeyhole/><span>Tipo de usuario</span><strong>{usuario?.tipoUsuario || "-"}</strong></div>
          <div><KeyRound/><span>Política</span><strong>Contraseña fuerte</strong></div>
        </div>
      </article>
      <article className="data-card glass-3d security-account-card">
        <div className="card-title"><KeyRound/><div><h3>Cambiar contraseña</h3><p>Se requiere reautenticación con la contraseña actual.</p></div></div>
        <form className="smart-form" onSubmit={submit}>
          <label className="field-block field-span-2"><span>Contraseña actual</span><input type="password" autoComplete="current-password" value={actual} onChange={(e)=>setActual(e.target.value)} required/></label>
          <label className="field-block"><span>Nueva contraseña</span><input type="password" autoComplete="new-password" value={nueva} onChange={(e)=>setNueva(e.target.value)} required/></label>
          <label className="field-block"><span>Confirmar nueva contraseña</span><input type="password" autoComplete="new-password" value={confirmacion} onChange={(e)=>setConfirmacion(e.target.value)} required/></label>
          <div className="field-span-2"><PasswordStrength value={nueva}/></div>
          {error&&<div className="form-error field-span-2">{error}</div>}{ok&&<div className="success-banner field-span-2">{ok}</div>}
          <div className="modal-actions field-span-2"><button className="primary-action" disabled={saving||!seguridad.valid||nueva!==confirmacion}>{saving?"Actualizando…":"Actualizar contraseña"}</button></div>
        </form>
      </article>
    </section>
  </div>;
}
