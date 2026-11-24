import { useMemo, useState } from "react";
import mensajeError from "../../utils/mensajeError";
import { Check, Eye, EyeOff, KeyRound, LockKeyhole, MailCheck, ShieldCheck, UserRound, X } from "lucide-react";

import useAuth from "../../hooks/useAuth";
import { cambiarContrasenaActual } from "../../services/firebase/authService";
import { validarPassword } from "../../utils/password";
import { sonidoError, sonidoExito } from "../../utils/sonidos";

import "../../styles/roles-empresa.css";
import "../../styles/trabajadores-empresa.css";
import "../../styles/inventario-empresa.css";
import "../../styles/compras-empresa.css";
import "../../styles/seguridad-cuenta.css";

const TIPOS = { SUPER_ADMIN: "Super administrador", ADMIN: "Dueño de la empresa", TRABAJADOR: "Trabajador" };

// Campo de contraseña con botón para verla (definido fuera para no perder el foco al escribir)
function CampoClave({ etiqueta, valor, onChange, autoComplete, invalido }) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="re-campo">
      <span className="re-etiqueta-campo">{etiqueta}</span>
      <span className="sg-clave">
        <input
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={invalido}
          required
        />
        <button type="button" onClick={() => setVisible((v) => !v)} aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={visible}>
          {visible ? <EyeOff size={19} /> : <Eye size={19} />}
        </button>
      </span>
    </label>
  );
}

export default function SeguridadCuentaPage() {
  const { usuario } = useAuth();

  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  const fuerza = useMemo(() => validarPassword(nueva), [nueva]);
  const noCoinciden = confirmacion.length > 0 && nueva !== confirmacion;
  const igualALaActual = nueva.length > 0 && nueva === actual;

  async function enviar(evento) {
    evento.preventDefault();
    if (guardando) return;

    setError("");
    setExito("");

    const fallar = (texto) => {
      setError(texto);
      sonidoError();
    };

    if (!fuerza.valid) return fallar("Tu nueva contraseña todavía no cumple todos los requisitos.");
    if (nueva !== confirmacion) return fallar("Las contraseñas nuevas no son iguales.");
    if (nueva === actual) return fallar("La nueva contraseña debe ser distinta a la actual.");

    setGuardando(true);

    try {
      await cambiarContrasenaActual(actual, nueva);
      setActual("");
      setNueva("");
      setConfirmacion("");
      sonidoExito();
      setExito("Listo: tu contraseña se actualizó.");
    } catch (e) {
      const codigo = e?.code || "";

      if (codigo.includes("invalid-credential") || codigo.includes("wrong-password")) {
        fallar("La contraseña actual no es correcta.");
      } else if (codigo.includes("too-many-requests")) {
        fallar("Hiciste muchos intentos. Espera unos minutos e inténtalo otra vez.");
      } else {
        fallar(mensajeError(e, "No pudimos cambiar la contraseña. Inténtalo otra vez."));
      }
    } finally {
      setGuardando(false);
    }
  }

  const datos = [
    { icono: UserRound, etiqueta: "Nombre", valor: usuario?.nombreCompleto || "—" },
    { icono: MailCheck, etiqueta: "Correo", valor: usuario?.correo || usuario?.email || "—" },
    { icono: LockKeyhole, etiqueta: "Tipo de cuenta", valor: TIPOS[usuario?.tipoUsuario] || usuario?.tipoUsuario || "—" }
  ];

  return (
    <div className="re inv">
      <header className="re-cabecera">
        <div>
          <h1>Mi seguridad</h1>
          <p>Cuida el acceso a tu cuenta. Cambia tu contraseña cuando quieras.</p>
        </div>
      </header>

      <div className="sg-grid">
        <section className="inv-bloque">
          <header className="co-paso__cabecera">
            <span className="co-paso__numero" aria-hidden="true">
              <ShieldCheck size={20} />
            </span>
            <div>
              <h2>Tu cuenta</h2>
              <p>Los datos con los que entras.</p>
            </div>
          </header>

          <ul className="sg-datos">
            {datos.map(({ icono: Icono, etiqueta, valor }) => (
              <li key={etiqueta}>
                <Icono size={20} aria-hidden="true" />
                <span>
                  <small>{etiqueta}</small>
                  <strong>{valor}</strong>
                </span>
              </li>
            ))}
          </ul>

          <div className="re-aviso inv-guia">
            <ShieldCheck size={18} />
            <span>Nunca compartas tu contraseña. Si crees que alguien la conoce, cámbiala ahora.</span>
          </div>
        </section>

        <form className="inv-bloque" onSubmit={enviar} noValidate>
          <header className="co-paso__cabecera">
            <span className="co-paso__numero" aria-hidden="true">
              <KeyRound size={20} />
            </span>
            <div>
              <h2>Cambiar contraseña</h2>
              <p>Por seguridad, primero escribe la que usas ahora.</p>
            </div>
          </header>

          <CampoClave etiqueta="Contraseña actual" valor={actual} onChange={setActual} autoComplete="current-password" />

          <div className="re-campos co-iguales">
            <CampoClave etiqueta="Contraseña nueva" valor={nueva} onChange={setNueva} autoComplete="new-password" invalido={igualALaActual} />
            <CampoClave etiqueta="Repite la nueva" valor={confirmacion} onChange={setConfirmacion} autoComplete="new-password" invalido={noCoinciden} />
          </div>

          {noCoinciden && (
            <small className="re-ayuda" data-error="true">
              Las contraseñas no son iguales.
            </small>
          )}
          {igualALaActual && (
            <small className="re-ayuda" data-error="true">
              Debe ser distinta a la actual.
            </small>
          )}

          <div className="sg-fuerza" data-nivel={fuerza.score >= 6 ? "alta" : fuerza.score >= 4 ? "media" : "baja"}>
            <div className="sg-fuerza__cabecera">
              <strong>{nueva ? fuerza.label : "Elige una contraseña fuerte"}</strong>
              <span>{fuerza.score}/6 requisitos</span>
            </div>
            <span className="sg-fuerza__barra" aria-hidden="true">
              <i style={{ width: `${(fuerza.score / 6) * 100}%` }} />
            </span>
            <ul>
              {fuerza.checks.map((c) => (
                <li key={c.key} data-ok={c.ok}>
                  {c.ok ? <Check size={15} aria-hidden="true" /> : <X size={15} aria-hidden="true" />}
                  {c.label}
                </li>
              ))}
            </ul>
          </div>

          {error && (
            <div className="re-aviso re-aviso--error" role="alert">
              {error}
            </div>
          )}
          {exito && (
            <div className="re-aviso re-aviso--ok" role="status">
              <Check size={18} />
              <span>{exito}</span>
            </div>
          )}

          <button type="submit" className="re-boton sg-enviar" disabled={guardando || !actual || !fuerza.valid || nueva !== confirmacion || igualALaActual}>
            {guardando ? "Actualizando…" : "Actualizar contraseña"}
          </button>
        </form>
      </div>
    </div>
  );
}
