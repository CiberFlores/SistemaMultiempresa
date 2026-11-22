import {
  AlertCircle,
  ArrowLeft,
  Check,
  Mail,
  MailCheck,
  Send,
  ShieldCheck
} from "lucide-react";

import { useEffect, useRef, useState } from "react";

import { Link } from "react-router-dom";

import { recuperarContrasena } from "../../services/firebase/authService";

import Destello from "../../components/auth/Destello";

import BotonSonido from "../../components/auth/BotonSonido";

import useSonidosUI from "../../hooks/useSonidosUI";

import {
  sonidoDespegue,
  sonidoError,
  sonidoExito
} from "../../utils/sonidos";

import "../../styles/login.css";

const PASOS = [
  "Escribe el correo de tu cuenta",
  "Abre el enlace que te enviaremos",
  "Crea una contraseña nueva"
];

const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ESPERA_REENVIO = 300; // 5 minutos

const formatoEspera = (segundos) =>
  `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, "0")}`;

const pausa = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

const movimientoReducido = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function ForgotPasswordPage() {
  useSonidosUI();

  const [correo, setCorreo] = useState("");
  const [cargando, setCargando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");
  const [errorCampo, setErrorCampo] = useState("");
  const [espera, setEspera] = useState(0);
  const [despegue, setDespegue] = useState(false);

  const estadoBoton = despegue ? "sent" : cargando ? "sending" : "idle";

  const correoRef = useRef(null);
  const tituloEnviadoRef = useRef(null);

  // Cuenta atrás para poder reenviar el enlace
  useEffect(() => {
    if (espera <= 0) {
      return undefined;
    }

    const temporizador = setTimeout(() => setEspera((valor) => valor - 1), 1000);

    return () => clearTimeout(temporizador);
  }, [espera]);

  // Al confirmar el envío, el foco pasa al mensaje para lectores de pantalla
  useEffect(() => {
    if (enviado) {
      tituloEnviadoRef.current?.focus();
    }
  }, [enviado]);

  const enviar = async (evento) => {
    evento.preventDefault();

    if (cargando) {
      return;
    }

    setError("");

    const correoLimpio = correo.trim();

    if (!correoLimpio) {
      setErrorCampo("Escribe tu correo electrónico.");
      sonidoError();
      correoRef.current?.focus();
      return;
    }

    if (!FORMATO_CORREO.test(correoLimpio)) {
      setErrorCampo("Revisa el formato: nombre@empresa.com");
      sonidoError();
      correoRef.current?.focus();
      return;
    }

    setErrorCampo("");
    setCargando(true);

    try {
      await recuperarContrasena(correoLimpio);

      // El avión despega antes de mostrar la confirmación
      if (!enviado) {
        setDespegue(true);
        sonidoDespegue();
        await pausa(movimientoReducido() ? 250 : 780);
      }

      setEnviado(true);
      sonidoExito();
      setDespegue(false);
      setEspera(ESPERA_REENVIO);
    } catch (error) {
      console.error(error);

      sonidoError();

      setError(
        "No se pudo enviar la solicitud. Verifica el correo e inténtalo de nuevo."
      );
    } finally {
      setCargando(false);
    }
  };

  const cambiarCorreo = () => {
    setEnviado(false);
    setError("");
    setTimeout(() => correoRef.current?.focus(), 0);
  };

  return (
    <main className="an-login">
      <BotonSonido />

      {/* PANEL DE MARCA (30 % ciruela) */}
      <aside className="an-login__panel" aria-labelledby="an-reset-titulo">
        <div className="an-login__panel-inner an-enter">
          <h1 id="an-reset-titulo" className="an-login__title">
            Recupera el acceso
            <span> a tu cuenta.</span>
            <Destello className="an-login__sparkle" />
          </h1>

          <p className="an-login__lead">
            Te enviamos un enlace seguro al correo registrado. Tarda menos de
            un minuto.
          </p>

          <ol className="an-login__steps">
            {PASOS.map((paso, indice) => {
              // Al enviar el enlace, el paso 1 queda hecho y el 2 pasa a ser el actual
              const actual = enviado ? 1 : 0;
              const estado =
                indice < actual ? "hecho" : indice === actual ? "actual" : "pendiente";

              return (
                <li key={paso} data-state={estado}>
                  <span className="an-login__step-number" aria-hidden="true">
                    {estado === "hecho" ? (
                      <Check size={14} strokeWidth={3} />
                    ) : (
                      indice + 1
                    )}
                  </span>
                  <span>{paso}</span>
                  {estado === "hecho" && <span className="sr-only"> (hecho)</span>}
                </li>
              );
            })}
          </ol>

          <p className="an-login__secure">
            <ShieldCheck size={16} strokeWidth={1.75} aria-hidden="true" />
            El enlace caduca y solo sirve una vez
          </p>
        </div>

        <Destello className="an-login__deco an-login__deco--one" />
        <Destello className="an-login__deco an-login__deco--two" />
      </aside>

      {/* FORMULARIO (60 % crema) */}
      <section className="an-login__main" aria-labelledby="an-reset-form-titulo">
        <div className="an-login__column an-enter an-enter--late">
          <img
            className="an-login__logo"
            src="/brand/arca-nova-logo.png"
            alt="Arca Nova"
            width={1536}
            height={1024}
          />

          {enviado ? (
            <div className="an-done" key="enviado">
              <span className="an-done__icon" aria-hidden="true">
                <MailCheck size={28} strokeWidth={1.75} />
              </span>

              <h2
                id="an-reset-form-titulo"
                className="an-done__title"
                ref={tituloEnviadoRef}
                tabIndex={-1}
              >
                Revisa tu correo
              </h2>

              <p className="an-done__text" role="status">
                Si <strong>{correo.trim()}</strong> está registrado, recibirás
                un enlace para restablecer tu contraseña. Si no lo ves, mira
                en la carpeta de spam.
              </p>

              <div className="an-done__actions">
                <button
                  type="button"
                  className="an-button an-button--ghost"
                  onClick={enviar}
                  disabled={espera > 0 || cargando}
                  data-loading={cargando}
                >
                  {cargando
                    ? "Enviando…"
                    : espera > 0
                      ? `Reenviar enlace en ${formatoEspera(espera)}`
                      : "Reenviar enlace"}
                </button>

                <button
                  type="button"
                  className="an-link an-done__change"
                  onClick={cambiarCorreo}
                >
                  Usar otro correo
                </button>
              </div>

              {error && (
                <div className="an-alert" role="alert" key={error}>
                  <AlertCircle size={18} strokeWidth={2} aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          ) : (
            <>
              <header className="an-login__heading">
                <h2 id="an-reset-form-titulo">Restablecer contraseña</h2>
                <p>Escribe el correo asociado a tu cuenta.</p>
              </header>

              <form
                className="an-form"
                onSubmit={enviar}
                noValidate
                aria-busy={cargando}
              >
                <div className="an-field" data-invalid={Boolean(errorCampo)}>
                  <label htmlFor="correo-recuperar">Correo electrónico</label>

                  <div className="an-field__control">
                    <Mail size={18} strokeWidth={1.75} aria-hidden="true" />

                    <input
                      ref={correoRef}
                      id="correo-recuperar"
                      type="email"
                      inputMode="email"
                      value={correo}
                      onChange={(evento) => {
                        setCorreo(evento.target.value);
                        if (errorCampo) {
                          setErrorCampo("");
                        }
                      }}
                      placeholder="nombre@empresa.com"
                      autoComplete="email"
                      spellCheck={false}
                      readOnly={cargando}
                      aria-invalid={Boolean(errorCampo)}
                      aria-describedby={
                        errorCampo ? "correo-recuperar-error" : undefined
                      }
                      required
                    />
                  </div>

                  {errorCampo && (
                    <p id="correo-recuperar-error" className="an-field__error">
                      {errorCampo}
                    </p>
                  )}
                </div>

                <div className="an-form__status" aria-live="assertive">
                  {error && (
                    <div className="an-alert" role="alert" key={error}>
                      <AlertCircle size={18} strokeWidth={2} aria-hidden="true" />
                      <span>{error}</span>
                    </div>
                  )}
                </div>

                <button
                  className="an-button an-button--send"
                  type="submit"
                  data-state={estadoBoton}
                  data-loading={cargando}
                  aria-disabled={cargando}
                >
                  <span
                    className="an-button__label"
                    data-on={estadoBoton === "idle"}
                    aria-hidden={estadoBoton !== "idle"}
                  >
                    Enviar enlace
                  </span>

                  <span
                    className="an-button__label"
                    data-on={estadoBoton === "sending"}
                    aria-hidden={estadoBoton !== "sending"}
                  >
                    Enviando…
                  </span>

                  <span
                    className="an-button__label"
                    data-on={estadoBoton === "sent"}
                    aria-hidden={estadoBoton !== "sent"}
                  >
                    ¡Enlace enviado!
                  </span>

                  <Send
                    className="an-button__plane"
                    size={18}
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                </button>
              </form>
            </>
          )}

          <Link className="an-back" to="/login">
            <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
            Volver al inicio de sesión
          </Link>

          <footer className="an-login__footer">
            <Check size={14} strokeWidth={2} aria-hidden="true" />
            <span>Tu contraseña actual sigue siendo válida hasta que la cambies.</span>
          </footer>
        </div>
      </section>
    </main>
  );
}

export default ForgotPasswordPage;
