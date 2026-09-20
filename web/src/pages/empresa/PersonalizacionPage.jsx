import {
  useEffect,
  useState
} from "react";

import {
  Eye,
  Palette,
  Save
} from "lucide-react";

import useAuth from "../../hooks/useAuth";

import {
  guardarPersonalizacion,
  obtenerPersonalizacion
} from "../../services/personalizacionEmpresaService";

const configuracionInicial = {
  colorPrimario: "#6366f1",
  colorSecundario: "#8b5cf6",
  colorFondo: "#ffffff",
  colorTexto: "#18181b",

  tipografia: "Inter",

  logoUrl: "",
  bannerUrl: "",

  tituloPrincipal:
    "Bienvenido a nuestra tienda",

  textoPrincipal:
    "Descubre nuestros productos y promociones.",

  textoBoton:
    "Ver productos",

  mostrarPromociones: true,
  mostrarSucursales: true
};

function PersonalizacionPage() {
  const { usuario } = useAuth();

  const [configuracion, setConfiguracion] =
    useState(configuracionInicial);

  const [cargando, setCargando] =
    useState(true);

  const [guardando, setGuardando] =
    useState(false);

  const [mensaje, setMensaje] =
    useState("");

  const [error, setError] =
    useState("");

  useEffect(() => {
    const cargar = async () => {
      try {
        const datos =
          await obtenerPersonalizacion(
            usuario.empresaId
          );

        if (datos) {
          setConfiguracion({
            ...configuracionInicial,
            ...datos
          });
        }
      } catch (error) {
        console.error(error);

        setError(
          "No se pudo cargar la personalización."
        );
      } finally {
        setCargando(false);
      }
    };

    if (usuario?.empresaId) {
      cargar();
    }
  }, [usuario]);

  const cambiar = (e) => {
    const {
      name,
      value,
      type,
      checked
    } = e.target;

    setConfiguracion((anterior) => ({
      ...anterior,

      [name]:
        type === "checkbox"
          ? checked
          : value
    }));
  };

  const guardar = async (e) => {
    e.preventDefault();

    setMensaje("");
    setError("");

    try {
      setGuardando(true);

      await guardarPersonalizacion(
        usuario.empresaId,
        configuracion
      );

      setMensaje(
        "Personalización guardada correctamente."
      );
    } catch (error) {
      console.error(error);

      setError(
        "No se pudo guardar la personalización."
      );
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="admin-empty">
        Cargando personalización...
      </div>
    );
  }

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1>
            Personalización
          </h1>

          <p>
            Configura la identidad visual
            de tu empresa.
          </p>
        </div>

        <div className="admin-page-icon">
          <Palette size={22} />
        </div>
      </div>

      <div className="personalization-layout">
        <form
          className="personalization-controls"
          onSubmit={guardar}
        >
          <section className="admin-card">
            <div className="admin-card-header">
              <h2>
                Colores y tipografía
              </h2>
            </div>

            <div className="admin-form-grid">
              <div className="admin-form-group">
                <label>
                  Color primario
                </label>

                <input
                  type="color"
                  name="colorPrimario"
                  value={
                    configuracion.colorPrimario
                  }
                  onChange={cambiar}
                />
              </div>

              <div className="admin-form-group">
                <label>
                  Color secundario
                </label>

                <input
                  type="color"
                  name="colorSecundario"
                  value={
                    configuracion.colorSecundario
                  }
                  onChange={cambiar}
                />
              </div>

              <div className="admin-form-group">
                <label>
                  Fondo
                </label>

                <input
                  type="color"
                  name="colorFondo"
                  value={
                    configuracion.colorFondo
                  }
                  onChange={cambiar}
                />
              </div>

              <div className="admin-form-group">
                <label>
                  Texto
                </label>

                <input
                  type="color"
                  name="colorTexto"
                  value={
                    configuracion.colorTexto
                  }
                  onChange={cambiar}
                />
              </div>

              <div className="admin-form-group full">
                <label>
                  Tipografía
                </label>

                <select
                  name="tipografia"
                  value={
                    configuracion.tipografia
                  }
                  onChange={cambiar}
                >
                  <option value="Inter">
                    Inter
                  </option>

                  <option value="Arial">
                    Arial
                  </option>

                  <option value="Georgia">
                    Georgia
                  </option>

                  <option value="Verdana">
                    Verdana
                  </option>
                </select>
              </div>
            </div>
          </section>

          <section className="admin-card">
            <div className="admin-card-header">
              <h2>
                Imágenes y contenido
              </h2>
            </div>

            <div className="admin-form-grid">
              <div className="admin-form-group full">
                <label>
                  URL del logo
                </label>

                <input
                  name="logoUrl"
                  value={configuracion.logoUrl}
                  onChange={cambiar}
                  placeholder="https://..."
                />
              </div>

              <div className="admin-form-group full">
                <label>
                  URL del banner
                </label>

                <input
                  name="bannerUrl"
                  value={
                    configuracion.bannerUrl
                  }
                  onChange={cambiar}
                  placeholder="https://..."
                />
              </div>

              <div className="admin-form-group full">
                <label>
                  Título principal
                </label>

                <input
                  name="tituloPrincipal"
                  value={
                    configuracion.tituloPrincipal
                  }
                  onChange={cambiar}
                />
              </div>

              <div className="admin-form-group full">
                <label>
                  Texto principal
                </label>

                <textarea
                  name="textoPrincipal"
                  value={
                    configuracion.textoPrincipal
                  }
                  onChange={cambiar}
                />
              </div>

              <div className="admin-form-group full">
                <label>
                  Texto del botón
                </label>

                <input
                  name="textoBoton"
                  value={
                    configuracion.textoBoton
                  }
                  onChange={cambiar}
                />
              </div>

              <label className="admin-check-option">
                <input
                  type="checkbox"
                  name="mostrarPromociones"
                  checked={
                    configuracion.mostrarPromociones
                  }
                  onChange={cambiar}
                />

                Mostrar promociones
              </label>

              <label className="admin-check-option">
                <input
                  type="checkbox"
                  name="mostrarSucursales"
                  checked={
                    configuracion.mostrarSucursales
                  }
                  onChange={cambiar}
                />

                Mostrar sucursales
              </label>
            </div>
          </section>

          {mensaje && (
            <div className="admin-message success">
              {mensaje}
            </div>
          )}

          {error && (
            <div className="admin-message error">
              {error}
            </div>
          )}

          <button
            className="admin-primary-button"
            disabled={guardando}
          >
            <Save size={18} />

            {guardando
              ? "Guardando..."
              : "Guardar personalización"}
          </button>
        </form>

        <section className="personalization-preview">
          <div className="preview-title">
            <Eye size={18} />
            Vista previa
          </div>

          <div
            className="store-preview"
            style={{
              background:
                configuracion.colorFondo,

              color:
                configuracion.colorTexto,

              fontFamily:
                configuracion.tipografia
            }}
          >
            {configuracion.bannerUrl && (
              <img
                className="store-preview-banner"
                src={
                  configuracion.bannerUrl
                }
                alt="Banner"
              />
            )}

            {configuracion.logoUrl && (
              <img
                className="store-preview-logo"
                src={
                  configuracion.logoUrl
                }
                alt="Logo"
              />
            )}

            <h2>
              {configuracion.tituloPrincipal}
            </h2>

            <p>
              {configuracion.textoPrincipal}
            </p>

            <button
              type="button"
              style={{
                background:
                  `linear-gradient(
                    135deg,
                    ${configuracion.colorPrimario},
                    ${configuracion.colorSecundario}
                  )`
              }}
            >
              {configuracion.textoBoton}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default PersonalizacionPage;