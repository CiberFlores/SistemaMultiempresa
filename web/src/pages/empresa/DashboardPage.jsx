import {
  useEffect,
  useState
} from "react";

import {
  Building2,
  CheckCircle2,
  CircleAlert,
  KeyRound,
  Palette,
  RefreshCw,
  Settings2,
  Store,
  Zap
} from "lucide-react";

import useAuth from "../../hooks/useAuth";

import {
  obtenerDashboardEmpresa
} from "../../services/adminDashboardService";

function DashboardPage() {
  const { usuario } = useAuth();

  const [datos, setDatos] =
    useState(null);

  const [cargando, setCargando] =
    useState(true);

  const [error, setError] =
    useState("");

  const cargarDashboard = async () => {
    if (!usuario?.empresaId) {
      setError(
        "El usuario no tiene una empresa asignada."
      );

      setCargando(false);

      return;
    }

    try {
      setCargando(true);
      setError("");

      const resultado =
        await obtenerDashboardEmpresa(
          usuario.empresaId
        );

      setDatos(resultado);
    } catch (error) {
      console.error(error);

      setError(
        error.message ||
        "No se pudo cargar el dashboard."
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDashboard();
  }, [usuario]);

  if (cargando) {
    return (
      <div className="admin-empty admin-empty-column">
        <RefreshCw
          size={30}
          className="admin-spin"
        />

        <strong>
          Cargando panel empresarial...
        </strong>
      </div>
    );
  }

  if (error) {
    return (
      <section className="admin-card">
        <div className="admin-message error">
          {error}
        </div>

        <div className="admin-form-actions">
          <button
            className="admin-primary-button"
            onClick={cargarDashboard}
          >
            <RefreshCw size={17} />
            Reintentar
          </button>
        </div>
      </section>
    );
  }

  const {
    empresa,
    totalSucursales,
    sucursalesActivas,
    licenciaActiva,
    plan,
    configuracionCompleta,
    personalizacionCompleta
  } = datos;

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1>
            Centro de Control
          </h1>

          <p>
            Bienvenido, {usuario?.nombreCompleto}.
            Gestiona {empresa.nombreComercial}.
          </p>
        </div>

        <button
          className="admin-refresh-button"
          onClick={cargarDashboard}
          title="Actualizar"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      <section className="admin-metrics">
        <article className="admin-metric-card">
          <div className="admin-metric-icon">
            <Building2 size={22} />
          </div>

          <div>
            <span>
              Empresa
            </span>

            <strong>
              {empresa.estado}
            </strong>

            <small>
              {empresa.nombreComercial}
            </small>
          </div>
        </article>

        <article className="admin-metric-card">
          <div className="admin-metric-icon">
            <Store size={22} />
          </div>

          <div>
            <span>
              Sucursales
            </span>

            <strong>
              {totalSucursales}
            </strong>

            <small>
              {sucursalesActivas} activas
            </small>
          </div>
        </article>

        <article className="admin-metric-card">
          <div className="admin-metric-icon">
            <KeyRound size={22} />
          </div>

          <div>
            <span>
              Licencia
            </span>

            <strong>
              {licenciaActiva
                ? "ACTIVA"
                : "SIN LICENCIA"}
            </strong>

            <small>
              {plan?.nombre ||
                "Sin plan asignado"}
            </small>
          </div>
        </article>

        <article className="admin-metric-card">
          <div className="admin-metric-icon">
            <Zap size={22} />
          </div>

          <div>
            <span>
              Vitrina
            </span>

            <strong>
              {empresa.publicada
                ? "PUBLICADA"
                : "PRIVADA"}
            </strong>

            <small>
              /tienda/{empresa.slugPublico}
            </small>
          </div>
        </article>
      </section>

      <div className="admin-dashboard-grid">
        <section className="admin-card">
          <div className="admin-card-header">
            <div>
              <h2>
                Estado de configuración
              </h2>

              <p>
                Preparación general de tu empresa.
              </p>
            </div>
          </div>

          <div className="admin-progress-list">
            <div className="admin-progress-item">
              <div className="admin-progress-icon">
                <Building2 size={18} />
              </div>

              <div>
                <strong>
                  Empresa registrada
                </strong>

                <span>
                  Información empresarial disponible
                </span>
              </div>

              <CheckCircle2
                className="progress-ok"
                size={20}
              />
            </div>

            <div className="admin-progress-item">
              <div className="admin-progress-icon">
                <Settings2 size={18} />
              </div>

              <div>
                <strong>
                  Configuración
                </strong>

                <span>
                  Moneda y reglas operativas
                </span>
              </div>

              {configuracionCompleta ? (
                <CheckCircle2
                  className="progress-ok"
                  size={20}
                />
              ) : (
                <CircleAlert
                  className="progress-warning"
                  size={20}
                />
              )}
            </div>

            <div className="admin-progress-item">
              <div className="admin-progress-icon">
                <Palette size={18} />
              </div>

              <div>
                <strong>
                  Personalización
                </strong>

                <span>
                  Colores y apariencia pública
                </span>
              </div>

              {personalizacionCompleta ? (
                <CheckCircle2
                  className="progress-ok"
                  size={20}
                />
              ) : (
                <CircleAlert
                  className="progress-warning"
                  size={20}
                />
              )}
            </div>

            <div className="admin-progress-item">
              <div className="admin-progress-icon">
                <Store size={18} />
              </div>

              <div>
                <strong>
                  Sucursales
                </strong>

                <span>
                  {totalSucursales} registradas
                </span>
              </div>

              {totalSucursales > 0 ? (
                <CheckCircle2
                  className="progress-ok"
                  size={20}
                />
              ) : (
                <CircleAlert
                  className="progress-warning"
                  size={20}
                />
              )}
            </div>
          </div>
        </section>

        <section className="admin-card admin-company-card">
          <div className="admin-company-glow" />

          <div className="admin-company-icon">
            <Building2 size={28} />
          </div>

          <span className="admin-company-label">
            EMPRESA ACTUAL
          </span>

          <h2>
            {empresa.nombreComercial}
          </h2>

          <p>
            {empresa.razonSocial ||
              "Razón social no configurada"}
          </p>

          <div className="admin-company-info">
            <div>
              <span>Rubro</span>
              <strong>
                {empresa.rubro || "-"}
              </strong>
            </div>

            <div>
              <span>Ciudad</span>
              <strong>
                {empresa.ciudad || "-"}
              </strong>
            </div>

            <div>
              <span>NIT</span>
              <strong>
                {empresa.nit || "-"}
              </strong>
            </div>

            <div>
              <span>Plan</span>
              <strong>
                {plan?.nombre || "Sin plan"}
              </strong>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default DashboardPage;