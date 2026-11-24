import {
  AlertCircle,
  ArrowRight,
  Boxes,
  Building2,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  ShoppingBag,
  Wallet
} from "lucide-react";
import mensajeError from "../../utils/mensajeError";
import { leerMotivoSalida } from "../../utils/sesion";

import { useEffect, useRef, useState } from "react";

import { Link, useNavigate } from "react-router-dom";

import { iniciarSesion } from "../../services/firebase/authService";

import useAuth from "../../hooks/useAuth";

import Destello from "../../components/auth/Destello";

import WelcomeOverlay from "../../components/auth/WelcomeOverlay";

import BotonSonido from "../../components/auth/BotonSonido";

import useSonidosUI from "../../hooks/useSonidosUI";

import { sonidoError } from "../../utils/sonidos";

import "../../styles/login.css";

const MODULOS = [
  { icono: ShoppingBag, texto: "Ventas y caja" },
  { icono: Boxes, texto: "Inventario y compras" },
  { icono: Building2, texto: "Sucursales y trabajadores" },
  { icono: Wallet, texto: "Finanzas y reportes" }
];

const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function movimientoReducido() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// Cuenta de 0 a "hasta" una sola vez al cargar; con movimiento reducido muestra el valor final
function ContadorAnimado({ hasta, retraso = 1100, duracion = 1100 }) {
  const [valor, setValor] = useState(() => (movimientoReducido() ? hasta : 0));

  useEffect(() => {
    if (movimientoReducido()) {
      return undefined;
    }

    let cuadro;
    let inicio;

    const arrancar = setTimeout(() => {
      const paso = (marca) => {
        inicio ??= marca;
        const avance = Math.min((marca - inicio) / duracion, 1);
        setValor(Math.round(hasta * (1 - Math.pow(1 - avance, 4))));

        if (avance < 1) {
          cuadro = requestAnimationFrame(paso);
        }
      };

      cuadro = requestAnimationFrame(paso);
    }, retraso);

    return () => {
      clearTimeout(arrancar);
      cancelAnimationFrame(cuadro);
    };
  }, [hasta, retraso, duracion]);

  return valor;
}

function LoginPage() {
  useSonidosUI();

  const navigate = useNavigate();
  const { setUsuario } = useAuth();

  // ======================================================
  // ESTADOS
  // ======================================================

  const [correo, setCorreo] = useState("");
  const [contraseña, setContraseña] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(leerMotivoSalida);
  const [erroresCampo, setErroresCampo] = useState({});
  const [mayusculas, setMayusculas] = useState(false);
  const [bienvenida, setBienvenida] = useState(null);

  // Si sacaron a la persona porque su empresa fue desactivada, va a la pantalla de bloqueo
  useEffect(() => {
    try {
      if (sessionStorage.getItem("an-empresa-bloqueada")) {
        navigate("/cuenta-bloqueada", { replace: true });
      }
    } catch {
      /* sin almacenamiento */
    }
  }, [navigate]);

  // Las tarjetas del panel siguen al ratón con un desplazamiento mínimo (solo ratón fino)
  const moverPanel = (evento) => {
    if (evento.pointerType !== "mouse" || movimientoReducido()) {
      return;
    }

    const caja = evento.currentTarget.getBoundingClientRect();
    const x = (evento.clientX - caja.left) / caja.width - 0.5;
    const y = (evento.clientY - caja.top) / caja.height - 0.5;

    evento.currentTarget.style.setProperty("--px", x.toFixed(3));
    evento.currentTarget.style.setProperty("--py", y.toFixed(3));
  };

  const soltarPanel = (evento) => {
    evento.currentTarget.style.setProperty("--px", "0");
    evento.currentTarget.style.setProperty("--py", "0");
  };

  const formRef = useRef(null);
  const correoRef = useRef(null);
  const passwordRef = useRef(null);

  // Sacudida breve del formulario cuando el acceso falla
  const sacudirFormulario = () => {
    const formulario = formRef.current;

    if (!formulario || movimientoReducido() || !formulario.animate) {
      return;
    }

    formulario.animate(
      [
        { transform: "translateX(0)" },
        { transform: "translateX(-6px)" },
        { transform: "translateX(5px)" },
        { transform: "translateX(-3px)" },
        { transform: "translateX(0)" }
      ],
      {
        duration: 320,
        easing: "cubic-bezier(0.23, 1, 0.32, 1)"
      }
    );
  };

  const detectarMayusculas = (evento) => {
    if (evento.getModifierState) {
      setMayusculas(evento.getModifierState("CapsLock"));
    }
  };

  const validarCampos = () => {
    const errores = {};
    const correoLimpio = correo.trim();

    if (!correoLimpio) {
      errores.correo = "Escribe tu correo electrónico.";
    } else if (!FORMATO_CORREO.test(correoLimpio)) {
      errores.correo = "Revisa el formato: nombre@empresa.com";
    }

    if (!contraseña) {
      errores.contraseña = "Escribe tu contraseña.";
    }

    return errores;
  };

  // ======================================================
  // INICIAR SESIÓN
  // ======================================================

  const manejarLogin = async (evento) => {
    evento.preventDefault();

    if (cargando) {
      return;
    }

    setError("");

    const errores = validarCampos();
    setErroresCampo(errores);

    if (errores.correo || errores.contraseña) {
      sonidoError();
    }

    if (errores.correo) {
      correoRef.current?.focus();
      return;
    }

    if (errores.contraseña) {
      passwordRef.current?.focus();
      return;
    }

    setCargando(true);

    try {
      const usuario = await iniciarSesion(correo.trim(), contraseña);

      // Guardar usuario en AuthContext
      setUsuario(usuario);

      // SUPER ADMIN: bienvenida y luego su panel
      if (usuario.tipoUsuario === "SUPER_ADMIN") {
        setBienvenida({ usuario, destino: "/superadmin/dashboard" });
        return;
      }

      // ADMIN EMPRESA y TRABAJADOR: bienvenida y luego el panel de la empresa
      if (
        usuario.tipoUsuario === "ADMIN" ||
        usuario.tipoUsuario === "TRABAJADOR"
      ) {
        setBienvenida({ usuario, destino: "/dashboard" });
        return;
      }

      setError("El usuario no tiene un rol válido.");
      sacudirFormulario();
    } catch (error) {
      if (error.code === "empresa/suspendida") {
        navigate("/cuenta-bloqueada", { replace: true });
        return;
      }

      console.error("Error al iniciar sesión:", error);

      sacudirFormulario();
      sonidoError();

      // ERRORES FIREBASE
      if (error.code === "auth/email-not-verified") {
        setError(error.message);
        return;
      }

      if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/invalid-login-credentials" ||
        error.code === "auth/wrong-password" ||
        error.code === "auth/user-not-found"
      ) {
        setError(
          "Correo electrónico o contraseña incorrectos. Revísalos e inténtalo de nuevo."
        );
        return;
      }

      if (error.code === "auth/invalid-email") {
        setError("El correo electrónico no tiene un formato válido.");
        return;
      }

      if (error.code === "auth/user-disabled") {
        setError(
          "Esta cuenta fue deshabilitada. Contacta con el administrador de tu empresa."
        );
        return;
      }

      if (error.code === "auth/too-many-requests") {
        setError(
          "Se realizaron demasiados intentos. Espera unos minutos e inténtalo de nuevo."
        );
        return;
      }

      if (error.code === "auth/network-request-failed") {
        setError(
          "No se pudo conectar con el servidor. Revisa tu conexión a Internet."
        );
        return;
      }

      // ERRORES PERSONALIZADOS
      setError(mensajeError(error, "No se pudo iniciar sesión."));
    } finally {
      setCargando(false);
    }
  };

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <>
    <main className="an-login" inert={Boolean(bienvenida)}>
      <BotonSonido />

      {/* PANEL DE MARCA (30 % ciruela) */}
      <aside
        className="an-login__panel"
        aria-labelledby="an-login-titulo"
        onPointerMove={moverPanel}
        onPointerLeave={soltarPanel}
      >
        <div className="an-login__panel-inner an-enter">
          <h1 id="an-login-titulo" className="an-login__title">
            Gestiona tu negocio
            <span> desde un solo lugar.</span>
            <Destello className="an-login__sparkle" />
          </h1>

          <p className="an-login__lead">
            Ventas, inventario, sucursales y finanzas de todas tus empresas
            en una sola plataforma.
          </p>

          {/* Escena ilustrativa del producto: ticket, ventas y alerta de stock */}
          <div className="an-stage" aria-hidden="true">
          <div className="an-ticket">
            <div className="an-ticket__paper">
              <div className="an-ticket__head">
                <span>Ticket de venta</span>
                <span className="an-ticket__tag">Caja 1</span>
              </div>

              <div className="an-ticket__row">
                <span>Pan artesanal × 3</span>
                <span>9.00</span>
              </div>
              <div className="an-ticket__row">
                <span>Jugo natural × 2</span>
                <span>12.00</span>
              </div>
              <div className="an-ticket__row">
                <span>Tarta de manzana</span>
                <span>8.50</span>
              </div>

              <div className="an-ticket__total">
                <span>Total</span>
                <strong>29.50</strong>
              </div>

              <div className="an-ticket__paid">
                <Check size={14} strokeWidth={2.5} />
                Cobrado
              </div>
            </div>
          </div>

          <div className="an-stage__side">
            <div className="an-card an-card--sales">
              <span className="an-card__label">Ventas de hoy</span>
              <strong className="an-card__value">
                <ContadorAnimado hasta={38} />
                <small>ventas</small>
              </strong>

              <div className="an-bars">
                {[34, 48, 42, 66, 58, 80, 100].map((alto, indice) => (
                  <i
                    key={indice}
                    style={{ "--h": `${alto}%`, "--i": indice }}
                    data-last={indice === 6}
                  />
                ))}
              </div>
            </div>

            <div className="an-card an-card--stock">
              <span className="an-dot" />
              <div>
                <strong>Stock bajo</strong>
                <small>Pan artesanal · quedan 4</small>
              </div>
            </div>
          </div>
          </div>

          <ul className="an-login__modules">
            {MODULOS.map(({ icono: Icono, texto }) => (
              <li key={texto}>
                <Icono size={18} strokeWidth={1.75} aria-hidden="true" />
                <span>{texto}</span>
              </li>
            ))}
          </ul>

          <p className="an-login__secure">
            <ShieldCheck size={16} strokeWidth={1.75} aria-hidden="true" />
            Tus datos viajan cifrados y protegidos
          </p>
        </div>

        <Destello className="an-login__deco an-login__deco--one" />
        <Destello className="an-login__deco an-login__deco--two" />
      </aside>

      {/* FORMULARIO (60 % crema) */}
      <section className="an-login__main" aria-labelledby="an-login-form-titulo">
        <div className="an-login__column an-enter an-enter--late">
          <img
            className="an-login__logo"
            src="/brand/arca-nova-logo.png"
            alt="Arca Nova"
            width={1536}
            height={1024}
          />

          <header className="an-login__heading">
            <h2 id="an-login-form-titulo">Iniciar sesión</h2>
            <p>Accede al panel de control de tu empresa.</p>
          </header>

          <form
            ref={formRef}
            className="an-form"
            onSubmit={manejarLogin}
            noValidate
            aria-busy={cargando}
          >
            {/* CORREO */}
            <div className="an-field" data-invalid={Boolean(erroresCampo.correo)}>
              <label htmlFor="correo">Correo electrónico</label>

              <div className="an-field__control">
                <Mail size={18} strokeWidth={1.75} aria-hidden="true" />

                <input
                  ref={correoRef}
                  id="correo"
                  type="email"
                  inputMode="email"
                  value={correo}
                  onChange={(evento) => {
                    setCorreo(evento.target.value);
                    if (erroresCampo.correo) {
                      setErroresCampo((previo) => ({ ...previo, correo: "" }));
                    }
                  }}
                  placeholder="nombre@empresa.com"
                  autoComplete="email"
                  spellCheck={false}
                  readOnly={cargando}
                  aria-invalid={Boolean(erroresCampo.correo)}
                  aria-describedby={
                    erroresCampo.correo ? "correo-error" : undefined
                  }
                  required
                />
              </div>

              {erroresCampo.correo && (
                <p id="correo-error" className="an-field__error">
                  {erroresCampo.correo}
                </p>
              )}
            </div>

            {/* CONTRASEÑA */}
            <div
              className="an-field"
              data-invalid={Boolean(erroresCampo.contraseña)}
            >
              <label htmlFor="contraseña">Contraseña</label>

              <div className="an-field__control">
                <LockKeyhole size={18} strokeWidth={1.75} aria-hidden="true" />

                <input
                  ref={passwordRef}
                  id="contraseña"
                  type={mostrarPassword ? "text" : "password"}
                  value={contraseña}
                  onChange={(evento) => {
                    setContraseña(evento.target.value);
                    if (erroresCampo.contraseña) {
                      setErroresCampo((previo) => ({
                        ...previo,
                        contraseña: ""
                      }));
                    }
                  }}
                  onKeyDown={detectarMayusculas}
                  onKeyUp={detectarMayusculas}
                  onBlur={() => setMayusculas(false)}
                  placeholder="Tu contraseña"
                  autoComplete="current-password"
                  readOnly={cargando}
                  aria-invalid={Boolean(erroresCampo.contraseña)}
                  aria-describedby={
                    [
                      erroresCampo.contraseña ? "password-error" : null,
                      mayusculas ? "password-caps" : null
                    ]
                      .filter(Boolean)
                      .join(" ") || undefined
                  }
                  required
                />

                <button
                  type="button"
                  className="an-field__toggle"
                  data-sonido="pop"
                  onClick={() => setMostrarPassword((valor) => !valor)}
                  aria-pressed={mostrarPassword}
                  aria-label={
                    mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                  title={
                    mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                >
                  <span className="an-field__toggle-icon" data-on={!mostrarPassword}>
                    <Eye size={18} strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <span className="an-field__toggle-icon" data-on={mostrarPassword}>
                    <EyeOff size={18} strokeWidth={1.75} aria-hidden="true" />
                  </span>
                </button>
              </div>

              {erroresCampo.contraseña && (
                <p id="password-error" className="an-field__error">
                  {erroresCampo.contraseña}
                </p>
              )}

              {mayusculas && (
                <p id="password-caps" className="an-field__hint" aria-live="polite">
                  Bloq Mayús está activado.
                </p>
              )}

              <Link to="/recuperar-contrasena" className="an-link an-field__aside">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            {/* ERROR GENERAL */}
            <div className="an-form__status" aria-live="assertive">
              {error && (
                <div className="an-alert" role="alert" key={error}>
                  <AlertCircle size={18} strokeWidth={2} aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* BOTÓN */}
            <button
              className="an-button"
              type="submit"
              data-loading={cargando}
              aria-disabled={cargando}
            >
              <span className="an-button__label" data-on={!cargando} aria-hidden={cargando}>
                Ingresar al sistema
                <ArrowRight
                  className="an-button__arrow"
                  size={18}
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </span>

              <span className="an-button__label" data-on={cargando} aria-hidden={!cargando}>
                <span className="an-spinner" aria-hidden="true" />
                Verificando acceso…
              </span>
            </button>
          </form>

          <footer className="an-login__footer">
            <span>Arca Nova</span>
            <span aria-hidden="true">·</span>
            <span>Sistema multiempresa</span>
            <span aria-hidden="true">·</span>
            <span>2026</span>
          </footer>
        </div>
      </section>
    </main>

    {bienvenida && (
      <WelcomeOverlay
        usuario={bienvenida.usuario}
        onListo={() => navigate(bienvenida.destino, { replace: true })}
      />
    )}
    </>
  );
}

export default LoginPage;
