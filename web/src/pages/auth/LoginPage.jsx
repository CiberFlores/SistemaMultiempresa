import {
  motion,
  useMotionValue,
  useSpring,
  useTransform
} from "framer-motion";

import {
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles
} from "lucide-react";

import {
  useState
} from "react";

import {
  Link,
  useNavigate
} from "react-router-dom";

import {
  iniciarSesion
} from "../../services/firebase/authService";

import useAuth from "../../hooks/useAuth";

import "../../styles/auth.css";

function LoginPage() {
  const navigate =
    useNavigate();

  const {
    setUsuario
  } = useAuth();

  // ======================================================
  // ESTADOS
  // ======================================================

  const [
    correo,
    setCorreo
  ] = useState("");

  const [
    contraseña,
    setContraseña
  ] = useState("");

  const [
    mostrarPassword,
    setMostrarPassword
  ] = useState(false);

  const [
    cargando,
    setCargando
  ] = useState(false);

  const [
    error,
    setError
  ] = useState("");

  // ======================================================
  // EFECTO 3D CON EL MOUSE
  // ======================================================

  const mouseX =
    useMotionValue(0);

  const mouseY =
    useMotionValue(0);

  const suaveX =
    useSpring(
      mouseX,
      {
        stiffness: 100,
        damping: 20
      }
    );

  const suaveY =
    useSpring(
      mouseY,
      {
        stiffness: 100,
        damping: 20
      }
    );

  const rotateY =
    useTransform(
      suaveX,
      [-0.5, 0.5],
      [-8, 8]
    );

  const rotateX =
    useTransform(
      suaveY,
      [-0.5, 0.5],
      [8, -8]
    );

  const moverMouse = (evento) => {
    const rect =
      evento.currentTarget
        .getBoundingClientRect();

    const x =
      (
        evento.clientX -
        rect.left
      ) /
        rect.width -
      0.5;

    const y =
      (
        evento.clientY -
        rect.top
      ) /
        rect.height -
      0.5;

    mouseX.set(x);
    mouseY.set(y);
  };

  const salirMouse = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  // ======================================================
  // INICIAR SESIÓN
  // ======================================================

  const manejarLogin =
    async (evento) => {
      evento.preventDefault();

      if (cargando) {
        return;
      }

      setError("");
      setCargando(true);

      try {
        const usuario =
          await iniciarSesion(
            correo,
            contraseña
          );

        // Guardar usuario en AuthContext
        setUsuario(usuario);

        // ==============================================
        // SUPER ADMIN
        // ==============================================

        if (
          usuario.tipoUsuario ===
          "SUPER_ADMIN"
        ) {
          navigate(
            "/superadmin/dashboard",
            {
              replace: true
            }
          );

          return;
        }

        // ==============================================
        // ADMIN EMPRESA
        // ==============================================

        if (
          usuario.tipoUsuario ===
          "ADMIN"
        ) {
          navigate(
            "/dashboard",
            {
              replace: true
            }
          );

          return;
        }

        // ==============================================
        // TRABAJADOR
        // ==============================================

        if (
          usuario.tipoUsuario ===
          "TRABAJADOR"
        ) {
          navigate(
            "/dashboard",
            {
              replace: true
            }
          );

          return;
        }

        setError(
          "El usuario no tiene un rol válido."
        );
      } catch (error) {
        console.error(
          "Error al iniciar sesión:",
          error
        );

        // ==============================================
        // ERRORES FIREBASE
        // ==============================================

        if (
          error.code ===
            "auth/invalid-credential" ||
          error.code ===
            "auth/invalid-login-credentials" ||
          error.code ===
            "auth/wrong-password" ||
          error.code ===
            "auth/user-not-found"
        ) {
          setError(
            "Correo electrónico o contraseña incorrectos."
          );

          return;
        }

        if (
          error.code ===
          "auth/invalid-email"
        ) {
          setError(
            "El correo electrónico no tiene un formato válido."
          );

          return;
        }

        if (
          error.code ===
          "auth/user-disabled"
        ) {
          setError(
            "Esta cuenta fue deshabilitada."
          );

          return;
        }

        if (
          error.code ===
          "auth/too-many-requests"
        ) {
          setError(
            "Se realizaron demasiados intentos. Intenta nuevamente más tarde."
          );

          return;
        }

        if (
          error.code ===
          "auth/network-request-failed"
        ) {
          setError(
            "No se pudo conectar con Firebase. Revisa tu conexión a Internet."
          );

          return;
        }

        // ==============================================
        // ERRORES PERSONALIZADOS
        // ==============================================

        setError(
          error.message ||
            "No se pudo iniciar sesión."
        );
      } finally {
        setCargando(false);
      }
    };

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <main className="login-page">

      {/* =================================================
          FONDO TECNOLÓGICO
      ================================================= */}

      <div className="login-background">
        <div className="login-grid" />

        <motion.div
          className="login-orb orb-one"
          animate={{
            x: [
              0,
              80,
              -30,
              0
            ],

            y: [
              0,
              -60,
              50,
              0
            ],

            scale: [
              1,
              1.15,
              0.95,
              1
            ]
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        <motion.div
          className="login-orb orb-two"
          animate={{
            x: [
              0,
              -70,
              30,
              0
            ],

            y: [
              0,
              60,
              -30,
              0
            ],

            scale: [
              1,
              0.9,
              1.2,
              1
            ]
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        <motion.div
          className="login-orb orb-three"
          animate={{
            x: [
              0,
              40,
              -50,
              0
            ],

            y: [
              0,
              -30,
              40,
              0
            ]
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* =================================================
          HEADER
      ================================================= */}

      <motion.header
        className="login-topbar"
        initial={{
          opacity: 0,
          y: -20
        }}
        animate={{
          opacity: 1,
          y: 0
        }}
        transition={{
          duration: 0.6
        }}
      >
        <div className="login-brand">
          <div className="login-brand-symbol">
            M
          </div>

          <div>
            <strong>
              MultiEmpresa
            </strong>

            <span>
              Business Platform
            </span>
          </div>
        </div>

        <div className="login-secure">
          <ShieldCheck
            size={16}
          />

          <span>
            Conexión segura
          </span>
        </div>
      </motion.header>

      {/* =================================================
          CONTENIDO PRINCIPAL
      ================================================= */}

      <section className="login-container">

        {/* ===============================================
            PANEL 3D IZQUIERDO
        =============================================== */}

        <motion.div
          className="login-showcase"
          onMouseMove={
            moverMouse
          }
          onMouseLeave={
            salirMouse
          }
          style={{
            rotateX,
            rotateY,

            transformPerspective:
              1200
          }}
          initial={{
            opacity: 0,
            x: -50
          }}
          animate={{
            opacity: 1,
            x: 0
          }}
          transition={{
            duration: 0.8,
            ease: "easeOut"
          }}
        >
          <div className="showcase-glow" />

          <div className="showcase-content">

            {/* Badge */}

            <motion.div
              className="showcase-badge"
              animate={{
                y: [
                  0,
                  -6,
                  0
                ]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Sparkles
                size={16}
              />

              Plataforma inteligente
            </motion.div>

            {/* Título */}

            <h1>
              Gestiona tu negocio

              <span>
                {" "}
                desde un solo lugar.
              </span>
            </h1>

            <p>
              Ventas, inventario,
              sucursales, trabajadores,
              finanzas y reportes en una
              plataforma multiempresa
              moderna, segura y escalable.
            </p>

            {/* =========================================
                ESCENA EMPRESARIAL 3D
            ========================================= */}

            <div className="business-scene">

              {/* Núcleo */}

              <motion.div
                className="scene-core"
                animate={{
                  rotateY: [
                    0,
                    360
                  ]
                }}
                transition={{
                  duration: 14,
                  repeat: Infinity,
                  ease: "linear"
                }}
              >
                <Building2
                  size={36}
                />
              </motion.div>

              {/* Anillo 1 */}

              <motion.div
                className="scene-ring ring-one"
                animate={{
                  rotateZ: [
                    0,
                    360
                  ]
                }}
                transition={{
                  duration: 18,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />

              {/* Anillo 2 */}

              <motion.div
                className="scene-ring ring-two"
                animate={{
                  rotateZ: [
                    360,
                    0
                  ]
                }}
                transition={{
                  duration: 24,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />

              {/* Ventas */}

              <motion.div
                className="floating-card card-sales"
                animate={{
                  y: [
                    0,
                    -10,
                    0
                  ],

                  rotateZ: [
                    -3,
                    2,
                    -3
                  ]
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <span>
                  Ventas
                </span>

                <strong>
                  Tiempo real
                </strong>

                <div className="mini-chart">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
              </motion.div>

              {/* Inventario */}

              <motion.div
                className="floating-card card-stock"
                animate={{
                  y: [
                    0,
                    9,
                    0
                  ],

                  rotateZ: [
                    2,
                    -2,
                    2
                  ]
                }}
                transition={{
                  duration: 4.8,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <span>
                  Inventario
                </span>

                <strong>
                  Control total
                </strong>

                <small>
                  Stock y productos
                </small>
              </motion.div>

              {/* Multiempresa */}

              <motion.div
                className="floating-card card-company"
                animate={{
                  x: [
                    0,
                    7,
                    0
                  ],

                  y: [
                    0,
                    -5,
                    0
                  ]
                }}
                transition={{
                  duration: 5.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <ShieldCheck
                  size={20}
                />

                <div>
                  <strong>
                    Multiempresa
                  </strong>

                  <small>
                    Datos protegidos
                  </small>
                </div>
              </motion.div>
            </div>

            {/* Características */}

            <div className="showcase-features">
              <span>
                <i />
                Multiempresa
              </span>

              <span>
                <i />
                Tiempo real
              </span>

              <span>
                <i />
                Firebase Cloud
              </span>
            </div>
          </div>
        </motion.div>

        {/* ===============================================
            PANEL LOGIN
        =============================================== */}

        <motion.section
          className="login-card"
          initial={{
            opacity: 0,
            x: 50,
            scale: 0.96
          }}
          animate={{
            opacity: 1,
            x: 0,
            scale: 1
          }}
          transition={{
            duration: 0.75,
            delay: 0.1,
            ease: "easeOut"
          }}
        >
          <div className="login-card-glow" />

          <div className="login-card-content">

            {/* Icono */}

            <motion.div
              className="login-card-icon"
              animate={{
                y: [
                  0,
                  -4,
                  0
                ]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <LockKeyhole
                size={23}
              />
            </motion.div>

            {/* Encabezado */}

            <div className="login-card-heading">
              <span>
                BIENVENIDO
              </span>

              <h2>
                Iniciar sesión
              </h2>

              <p>
                Accede al centro de control
                de tu empresa.
              </p>
            </div>

            {/* =========================================
                FORMULARIO
            ========================================= */}

            <form
              onSubmit={
                manejarLogin
              }
              className="login-form"
            >

              {/* CORREO */}

              <div className="tech-form-group">
                <label
                  htmlFor="correo"
                >
                  Correo electrónico
                </label>

                <div className="tech-input">
                  <Mail
                    size={18}
                  />

                  <input
                    id="correo"
                    type="email"
                    value={
                      correo
                    }
                    onChange={(
                      evento
                    ) =>
                      setCorreo(
                        evento
                          .target
                          .value
                      )
                    }
                    placeholder="nombre@empresa.com"
                    autoComplete="email"
                    disabled={
                      cargando
                    }
                    required
                  />

                  <span className="input-glow" />
                </div>
              </div>

              {/* CONTRASEÑA */}

              <div className="tech-form-group">

                <div className="password-label">
                  <label
                    htmlFor="contraseña"
                  >
                    Contraseña
                  </label>

                  <Link
                    to="/recuperar-contrasena"
                    className="forgot-password"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>

                <div className="tech-input">
                  <LockKeyhole
                    size={18}
                  />

                  <input
                    id="contraseña"
                    type={
                      mostrarPassword
                        ? "text"
                        : "password"
                    }
                    value={
                      contraseña
                    }
                    onChange={(
                      evento
                    ) =>
                      setContraseña(
                        evento
                          .target
                          .value
                      )
                    }
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    disabled={
                      cargando
                    }
                    required
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setMostrarPassword(
                        (
                          valorActual
                        ) =>
                          !valorActual
                      )
                    }
                    disabled={
                      cargando
                    }
                    aria-label={
                      mostrarPassword
                        ? "Ocultar contraseña"
                        : "Mostrar contraseña"
                    }
                    title={
                      mostrarPassword
                        ? "Ocultar contraseña"
                        : "Mostrar contraseña"
                    }
                  >
                    {mostrarPassword ? (
                      <EyeOff
                        size={18}
                      />
                    ) : (
                      <Eye
                        size={18}
                      />
                    )}
                  </button>

                  <span className="input-glow" />
                </div>
              </div>

              {/* ERROR */}

              {error && (
                <motion.div
                  className="login-error"
                  role="alert"
                  initial={{
                    opacity: 0,
                    y: -5
                  }}
                  animate={{
                    opacity: 1,
                    y: 0
                  }}
                >
                  {error}
                </motion.div>
              )}

              {/* BOTÓN */}

              <motion.button
                className="tech-login-button"
                type="submit"
                disabled={
                  cargando
                }
                whileHover={
                  cargando
                    ? {}
                    : {
                        scale: 1.015
                      }
                }
                whileTap={
                  cargando
                    ? {}
                    : {
                        scale: 0.98
                      }
                }
              >
                <span>
                  {cargando
                    ? "Verificando acceso..."
                    : "Ingresar al sistema"}
                </span>

                {!cargando && (
                  <ArrowRight
                    size={19}
                  />
                )}

                {cargando && (
                  <span className="login-spinner" />
                )}
              </motion.button>
            </form>

            {/* Seguridad */}

            <div className="login-security-info">
              <ShieldCheck
                size={15}
              />

              <span>
                Sesión protegida mediante
                Firebase Authentication
              </span>
            </div>
          </div>
        </motion.section>
      </section>

      {/* =================================================
          FOOTER
      ================================================= */}

      <footer className="login-footer">
        <span>
          Sistema Multiempresa
        </span>

        <span>
          ·
        </span>

        <span>
          Plataforma empresarial
        </span>

        <span>
          ·
        </span>

        <span>
          2026
        </span>
      </footer>
    </main>
  );
}

export default LoginPage;