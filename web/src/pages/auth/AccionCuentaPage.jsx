import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { applyActionCode, confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { Check, Eye, EyeOff, KeyRound, MailCheck, TriangleAlert, X } from "lucide-react";

import { auth } from "../../services/firebase/firebaseConfig";
import { validarPassword } from "../../utils/password";

import "../../styles/cuenta-bloqueada.css";
import "../../styles/accion-cuenta.css";

function mensajeDeError(error) {
  const codigo = error?.code || "";

  if (codigo.includes("expired-action-code")) return "Este enlace ya venció. Pide uno nuevo desde «¿Olvidaste tu contraseña?».";
  if (codigo.includes("invalid-action-code")) return "Este enlace ya se usó o no es válido. Pide uno nuevo desde «¿Olvidaste tu contraseña?».";
  if (codigo.includes("user-disabled")) return "Esta cuenta está deshabilitada. Habla con el encargado de tu empresa.";
  if (codigo.includes("weak-password")) return "La contraseña es muy débil. Usa una más larga.";
  if (codigo.includes("network")) return "No hay conexión. Revisa tu internet e inténtalo otra vez.";

  return "No pudimos completar esto. Inténtalo otra vez.";
}

function CampoClave({ etiqueta, valor, onChange, autoComplete, invalido }) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="ac-campo">
      <span>{etiqueta}</span>
      <span className="ac-clave">
        <input
          type={visible ? "text" : "password"}
          value={valor}
          autoComplete={autoComplete}
          aria-invalid={invalido}
          onChange={(e) => onChange(e.target.value)}
          required
        />
        <button type="button" onClick={() => setVisible((v) => !v)} aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={visible}>
          {visible ? <EyeOff size={19} /> : <Eye size={19} />}
        </button>
      </span>
    </label>
  );
}

// Página que abre el enlace de los correos: cambiar contraseña y verificar correo.
export default function AccionCuentaPage() {
  const [params] = useSearchParams();
  const modo = params.get("mode");
  const codigo = params.get("oobCode");

  const [fase, setFase] = useState(modo === "resetPassword" || modo === "verifyEmail" ? "revisando" : "invalido");
  const [correo, setCorreo] = useState("");
  const [error, setError] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!codigo || (modo !== "resetPassword" && modo !== "verifyEmail")) {
      return undefined;
    }

    let activo = true;

    const tarea =
      modo === "resetPassword"
        ? verifyPasswordResetCode(auth, codigo).then((email) => {
            if (!activo) return;
            setCorreo(email);
            setFase("formulario");
          })
        : applyActionCode(auth, codigo).then(() => activo && setFase("verificado"));

    tarea.catch((e) => {
      if (!activo) return;
      setError(mensajeDeError(e));
      setFase("error");
    });

    return () => {
      activo = false;
    };
  }, [modo, codigo]);

  const fuerza = useMemo(() => validarPassword(nueva), [nueva]);
  const noCoinciden = confirmacion.length > 0 && nueva !== confirmacion;

  async function enviar(evento) {
    evento.preventDefault();
    if (guardando) return;

    setError("");

    if (!fuerza.valid) return setError("Tu contraseña todavía no cumple todos los requisitos.");
    if (nueva !== confirmacion) return setError("Las contraseñas no son iguales.");

    setGuardando(true);

    try {
      await confirmPasswordReset(auth, codigo, nueva);
      setFase("listo");
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="cb">
      <div className="cb__columna">
        <img className="cb__logo" src="/brand/arca-nova-logo.png" alt="Arca Nova" width={1536} height={1024} />

        <section className="cb__tarjeta ac-tarjeta" aria-live="polite">
          {fase === "revisando" && (
            <>
              <span className="ac-girando" aria-hidden="true" />
              <p className="cb__texto">Revisando tu enlace…</p>
            </>
          )}

          {fase === "formulario" && (
            <>
              <span className="cb__icono" aria-hidden="true">
                <KeyRound size={32} />
              </span>
              <p className="cb__etiqueta">Cambiar contraseña</p>
              <h1>Crea tu nueva contraseña</h1>
              <p className="cb__texto">
                Para la cuenta <b>{correo}</b>.
              </p>

              <form className="ac-formulario" onSubmit={enviar} noValidate>
                <CampoClave etiqueta="Contraseña nueva" valor={nueva} onChange={setNueva} autoComplete="new-password" />
                <CampoClave etiqueta="Repite la contraseña" valor={confirmacion} onChange={setConfirmacion} autoComplete="new-password" invalido={noCoinciden} />

                {noCoinciden && <p className="ac-error">Las contraseñas no son iguales.</p>}

                <ul className="ac-requisitos" aria-label="Requisitos">
                  {fuerza.checks.map((c) => (
                    <li key={c.key} data-ok={c.ok}>
                      {c.ok ? <Check size={15} aria-hidden="true" /> : <X size={15} aria-hidden="true" />}
                      {c.label}
                    </li>
                  ))}
                </ul>

                {error && (
                  <p className="ac-error" role="alert">
                    {error}
                  </p>
                )}

                <button type="submit" className="ac-boton" disabled={guardando || !fuerza.valid || nueva !== confirmacion}>
                  {guardando ? "Guardando…" : "Guardar contraseña"}
                </button>
              </form>
            </>
          )}

          {fase === "listo" && (
            <>
              <span className="cb__icono ac-ok" aria-hidden="true">
                <Check size={34} />
              </span>
              <p className="cb__etiqueta">Listo</p>
              <h1>Tu contraseña se cambió</h1>
              <p className="cb__texto">Ya puedes entrar con tu contraseña nueva.</p>
              <Link className="ac-boton" to="/login" replace>
                Iniciar sesión
              </Link>
            </>
          )}

          {fase === "verificado" && (
            <>
              <span className="cb__icono ac-ok" aria-hidden="true">
                <MailCheck size={32} />
              </span>
              <p className="cb__etiqueta">Correo verificado</p>
              <h1>¡Tu correo quedó verificado!</h1>
              <p className="cb__texto">Ya puedes iniciar sesión en tu cuenta.</p>
              <Link className="ac-boton" to="/login" replace>
                Iniciar sesión
              </Link>
            </>
          )}

          {(fase === "error" || fase === "invalido") && (
            <>
              <span className="cb__icono" aria-hidden="true">
                <TriangleAlert size={32} />
              </span>
              <p className="cb__etiqueta">Enlace no válido</p>
              <h1>No pudimos abrir este enlace</h1>
              <p className="cb__texto">{error || "El enlace está incompleto o ya no sirve. Pide uno nuevo desde «¿Olvidaste tu contraseña?»."}</p>
              <Link className="ac-boton" to="/recuperar-contrasena" replace>
                Pedir un enlace nuevo
              </Link>
              <Link className="ac-enlace" to="/login" replace>
                Volver al inicio de sesión
              </Link>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
