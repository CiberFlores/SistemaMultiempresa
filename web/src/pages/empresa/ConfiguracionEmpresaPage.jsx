import {
  useEffect,
  useState
} from "react";

import {
  Building2,
  Save
} from "lucide-react";

import useAuth from "../../hooks/useAuth";

import {
  guardarConfiguracionEmpresa,
  guardarDatosEmpresa,
  obtenerConfiguracionEmpresa,
  obtenerEmpresa
} from "../../services/configuracionEmpresaService";

function ConfiguracionEmpresaPage() {
  const { usuario } = useAuth();

  const [cargando, setCargando] =
    useState(true);

  const [guardando, setGuardando] =
    useState(false);

  const [mensaje, setMensaje] =
    useState("");

  const [error, setError] =
    useState("");

  const [empresa, setEmpresa] =
    useState({
      nombreComercial: "",
      razonSocial: "",
      rubro: "",
      nit: "",
      telefono: "",
      correo: "",
      direccion: "",
      ciudad: "",
      pais: ""
    });

  const [configuracion, setConfiguracion] =
    useState({
      monedaCodigo: "BOB",
      simboloMoneda: "Bs",
      reglasOperacion: ""
    });

  useEffect(() => {
    const cargar = async () => {
      if (!usuario?.empresaId) {
        setError(
          "Este usuario no tiene una empresa asignada."
        );

        setCargando(false);

        return;
      }

      try {
        const [
          datosEmpresa,
          datosConfiguracion
        ] = await Promise.all([
          obtenerEmpresa(
            usuario.empresaId
          ),

          obtenerConfiguracionEmpresa(
            usuario.empresaId
          )
        ]);

        setEmpresa({
          nombreComercial:
            datosEmpresa.nombreComercial || "",

          razonSocial:
            datosEmpresa.razonSocial || "",

          rubro:
            datosEmpresa.rubro || "",

          nit:
            datosEmpresa.nit || "",

          telefono:
            datosEmpresa.telefono || "",

          correo:
            datosEmpresa.correo || "",

          direccion:
            datosEmpresa.direccion || "",

          ciudad:
            datosEmpresa.ciudad || "",

          pais:
            datosEmpresa.pais || ""
        });

        if (datosConfiguracion) {
          setConfiguracion({
            monedaCodigo:
              datosConfiguracion.monedaCodigo
              || "BOB",

            simboloMoneda:
              datosConfiguracion.simboloMoneda
              || "Bs",

            reglasOperacion:
              datosConfiguracion.reglasOperacion
              || ""
          });
        }
      } catch (error) {
        console.error(error);

        setError(
          "No se pudo cargar la configuración."
        );
      } finally {
        setCargando(false);
      }
    };

    cargar();
  }, [usuario]);

  const cambiarEmpresa = (e) => {
    const {
      name,
      value
    } = e.target;

    setEmpresa((anterior) => ({
      ...anterior,
      [name]: value
    }));
  };

  const cambiarConfiguracion = (e) => {
    const {
      name,
      value
    } = e.target;

    setConfiguracion(
      (anterior) => ({
        ...anterior,
        [name]: value
      })
    );
  };

  const guardar = async (e) => {
    e.preventDefault();

    setMensaje("");
    setError("");

    try {
      setGuardando(true);

      await Promise.all([
        guardarDatosEmpresa(
          usuario.empresaId,
          empresa
        ),

        guardarConfiguracionEmpresa(
          usuario.empresaId,
          configuracion
        )
      ]);

      setMensaje(
        "Configuración guardada correctamente."
      );
    } catch (error) {
      console.error(error);

      setError(
        "No se pudo guardar la configuración."
      );
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="admin-empty">
        Cargando configuración...
      </div>
    );
  }

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1>
            Configuración de empresa
          </h1>

          <p>
            Administra la información comercial
            y las reglas de tu negocio.
          </p>
        </div>

        <div className="admin-page-icon">
          <Building2 size={22} />
        </div>
      </div>

      <form onSubmit={guardar}>
        <section className="admin-card">
          <div className="admin-card-header">
            <div>
              <h2>
                Información comercial
              </h2>

              <p>
                Datos visibles y administrativos
                de la empresa.
              </p>
            </div>
          </div>

          <div className="admin-form-grid">
            <div className="admin-form-group">
              <label>
                Nombre comercial
              </label>

              <input
                name="nombreComercial"
                value={
                  empresa.nombreComercial
                }
                onChange={cambiarEmpresa}
                required
              />
            </div>

            <div className="admin-form-group">
              <label>
                Razón social
              </label>

              <input
                name="razonSocial"
                value={
                  empresa.razonSocial
                }
                onChange={cambiarEmpresa}
              />
            </div>

            <div className="admin-form-group">
              <label>Rubro</label>

              <input
                name="rubro"
                value={empresa.rubro}
                onChange={cambiarEmpresa}
              />
            </div>

            <div className="admin-form-group">
              <label>NIT</label>

              <input
                name="nit"
                value={empresa.nit}
                onChange={cambiarEmpresa}
              />
            </div>

            <div className="admin-form-group">
              <label>Teléfono</label>

              <input
                name="telefono"
                value={empresa.telefono}
                onChange={cambiarEmpresa}
              />
            </div>

            <div className="admin-form-group">
              <label>Correo</label>

              <input
                type="email"
                name="correo"
                value={empresa.correo}
                onChange={cambiarEmpresa}
              />
            </div>

            <div className="admin-form-group full">
              <label>Dirección</label>

              <input
                name="direccion"
                value={empresa.direccion}
                onChange={cambiarEmpresa}
              />
            </div>

            <div className="admin-form-group">
              <label>Ciudad</label>

              <input
                name="ciudad"
                value={empresa.ciudad}
                onChange={cambiarEmpresa}
              />
            </div>

            <div className="admin-form-group">
              <label>País</label>

              <input
                name="pais"
                value={empresa.pais}
                onChange={cambiarEmpresa}
              />
            </div>
          </div>
        </section>

        <section className="admin-card">
          <div className="admin-card-header">
            <div>
              <h2>
                Moneda y reglas
              </h2>

              <p>
                Define la configuración operativa
                principal.
              </p>
            </div>
          </div>

          <div className="admin-form-grid">
            <div className="admin-form-group">
              <label>
                Moneda
              </label>

              <select
                name="monedaCodigo"
                value={
                  configuracion.monedaCodigo
                }
                onChange={
                  cambiarConfiguracion
                }
              >
                <option value="BOB">
                  Boliviano (BOB)
                </option>

                <option value="USD">
                  Dólar estadounidense (USD)
                </option>

                <option value="EUR">
                  Euro (EUR)
                </option>
              </select>
            </div>

            <div className="admin-form-group">
              <label>
                Símbolo
              </label>

              <input
                name="simboloMoneda"
                value={
                  configuracion.simboloMoneda
                }
                onChange={
                  cambiarConfiguracion
                }
                maxLength={10}
              />
            </div>

            <div className="admin-form-group full">
              <label>
                Reglas operativas
              </label>

              <textarea
                name="reglasOperacion"
                value={
                  configuracion.reglasOperacion
                }
                onChange={
                  cambiarConfiguracion
                }
                placeholder="Describe reglas internas o condiciones operativas del negocio..."
                rows={5}
              />
            </div>
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

        <div className="admin-form-actions">
          <button
            type="submit"
            className="admin-primary-button"
            disabled={guardando}
          >
            <Save size={18} />

            {guardando
              ? "Guardando..."
              : "Guardar configuración"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ConfiguracionEmpresaPage;