import {
  ArrowLeft,
  Mail,
  Send,
  ShieldCheck
} from "lucide-react";

import {
  motion
} from "framer-motion";

import {
  useState
} from "react";

import {
  Link
} from "react-router-dom";

import {
  recuperarContrasena
} from "../../services/firebase/authService";

import "../../styles/auth.css";

function ForgotPasswordPage() {
  const [correo, setCorreo] =
    useState("");

  const [cargando, setCargando] =
    useState(false);

  const [mensaje, setMensaje] =
    useState("");

  const [error, setError] =
    useState("");

  const enviar = async (e) => {
    e.preventDefault();

    setError("");
    setMensaje("");

    try {
      setCargando(true);

      await recuperarContrasena(
        correo
      );

      setMensaje(
        "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña."
      );
    } catch (error) {
      console.error(error);

      setError(
        "No se pudo enviar la solicitud. Verifica el correo e intenta nuevamente."
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="login-page">
      <div className="login-background">
        <div className="login-grid" />

        <motion.div
          className="login-orb orb-one"
          animate={{
            x: [0, 70, 0],
            y: [0, -40, 0]
          }}
          transition={{
            duration: 12,
            repeat: Infinity
          }}
        />

        <motion.div
          className="login-orb orb-two"
          animate={{
            x: [0, -50, 0],
            y: [0, 45, 0]
          }}
          transition={{
            duration: 15,
            repeat: Infinity
          }}
        />
      </div>

      <section className="reset-container">
        <motion.div
          className="login-card reset-card"
          initial={{
            opacity: 0,
            y: 35,
            scale: 0.96
          }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1
          }}
        >
          <div className="login-card-glow" />

          <div className="login-card-content">
            <div className="login-card-icon">
              <ShieldCheck size={23} />
            </div>

            <div className="login-card-heading">
              <span>
                RECUPERACIÓN SEGURA
              </span>

              <h2>
                Restablecer contraseña
              </h2>

              <p>
                Ingresa el correo asociado a tu cuenta.
              </p>
            </div>

            <form
              className="login-form"
              onSubmit={enviar}
            >
              <div className="tech-form-group">
                <label>
                  Correo electrónico
                </label>

                <div className="tech-input">
                  <Mail size={18} />

                  <input
                    type="email"
                    placeholder="nombre@empresa.com"
                    value={correo}
                    onChange={(e) =>
                      setCorreo(
                        e.target.value
                      )
                    }
                    required
                  />

                  <span className="input-glow" />
                </div>
              </div>

              {mensaje && (
                <div className="login-success">
                  {mensaje}
                </div>
              )}

              {error && (
                <div className="login-error">
                  {error}
                </div>
              )}

              <button
                className="tech-login-button"
                disabled={cargando}
              >
                <span>
                  {cargando
                    ? "Enviando..."
                    : "Enviar enlace"}
                </span>

                {!cargando && (
                  <Send size={18} />
                )}
              </button>

              <Link
                className="back-login"
                to="/login"
              >
                <ArrowLeft size={15} />
                Volver al inicio de sesión
              </Link>
            </form>
          </div>
        </motion.div>
      </section>
    </main>
  );
}

export default ForgotPasswordPage;