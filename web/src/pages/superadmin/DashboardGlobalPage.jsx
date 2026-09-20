import { useEffect, useState } from "react";

import {
  Building2,
  CircleCheckBig,
  CircleX,
  KeyRound,
  Layers3,
  RefreshCw
} from "lucide-react";

import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip
} from "chart.js";

import {
  Bar,
  Doughnut
} from "react-chartjs-2";

import useAuth from "../../hooks/useAuth";

import {
  obtenerDashboardGlobal,
  obtenerEmpresasRecientes
} from "../../services/dashboardService";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
);

function DashboardGlobalPage() {
  const { usuario } = useAuth();

  const [datos, setDatos] = useState(null);
  const [empresasRecientes, setEmpresasRecientes] = useState([]);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargarDashboard = async () => {
    try {
      setCargando(true);
      setError("");

      const [
        resumen,
        recientes
      ] = await Promise.all([
        obtenerDashboardGlobal(),
        obtenerEmpresasRecientes()
      ]);

      setDatos(resumen);
      setEmpresasRecientes(recientes);
    } catch (error) {
      console.error(error);

      setError(
        "No se pudo cargar la información del dashboard."
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDashboard();
  }, []);

  if (cargando) {
    return (
      <div className="sa-page-loading">
        <RefreshCw
          className="sa-spin"
          size={30}
        />

        <span>
          Cargando información...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sa-panel">
        <div className="sa-form-error">
          {error}
        </div>

        <br />

        <button
          className="sa-primary-button"
          onClick={cargarDashboard}
        >
          Intentar nuevamente
        </button>
      </div>
    );
  }

  const metricas = [
    {
      titulo: "Empresas registradas",
      valor: datos.totalEmpresas,
      descripcion: "Total de empresas",
      icono: Building2
    },
    {
      titulo: "Empresas activas",
      valor: datos.empresasActivas,
      descripcion: "Empresas habilitadas",
      icono: CircleCheckBig
    },
    {
      titulo: "Empresas suspendidas",
      valor: datos.empresasSuspendidas,
      descripcion: "Acceso suspendido",
      icono: CircleX
    },
    {
      titulo: "Licencias activas",
      valor: datos.licenciasActivas,
      descripcion: "Licencias vigentes",
      icono: KeyRound
    }
  ];

  const datosEmpresas = {
    labels: [
      "Activas",
      "Suspendidas"
    ],
    datasets: [
      {
        label: "Empresas",
        data: [
          datos.empresasActivas,
          datos.empresasSuspendidas
        ]
      }
    ]
  };

  const datosPlanes = {
    labels: datos.licenciasPorPlan.map(
      (item) => item.nombre
    ),

    datasets: [
      {
        label: "Licencias activas",
        data: datos.licenciasPorPlan.map(
          (item) => item.cantidad
        )
      }
    ]
  };

  const opcionesGrafico = {
    responsive: true,
    maintainAspectRatio: false,

    plugins: {
      legend: {
        position: "bottom"
      }
    }
  };

  return (
    <div className="sa-dashboard">
      <div className="sa-page-header">
        <div>
          <h1>
            Dashboard Global
          </h1>

          <p>
            Bienvenido, {usuario?.nombreCompleto}.
            Supervisa toda la plataforma multiempresa.
          </p>
        </div>

        <div className="sa-dashboard-actions">
          <div className="sa-status">
            <span></span>
            Plataforma operativa
          </div>

          <button
            className="sa-refresh-button"
            onClick={cargarDashboard}
            title="Actualizar información"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      <section className="sa-metrics">
        {metricas.map((metrica) => {
          const Icono = metrica.icono;

          return (
            <article
              className="sa-metric-card"
              key={metrica.titulo}
            >
              <div className="sa-metric-icon">
                <Icono size={23} />
              </div>

              <div>
                <span>
                  {metrica.titulo}
                </span>

                <h2>
                  {metrica.valor}
                </h2>

                <small>
                  {metrica.descripcion}
                </small>
              </div>
            </article>
          );
        })}
      </section>

      <section className="sa-dashboard-grid">
        <article className="sa-panel">
          <div className="sa-panel-header">
            <div>
              <h3>
                Estado de empresas
              </h3>

              <p>
                Distribución general
              </p>
            </div>

            <Building2 size={20} />
          </div>

          <div className="sa-chart">
            {datos.totalEmpresas === 0 ? (
              <div className="sa-empty">
                <Building2 size={40} />

                <strong>
                  Sin empresas registradas
                </strong>
              </div>
            ) : (
              <Doughnut
                data={datosEmpresas}
                options={opcionesGrafico}
              />
            )}
          </div>
        </article>

        <article className="sa-panel">
          <div className="sa-panel-header">
            <div>
              <h3>
                Licencias por plan
              </h3>

              <p>
                Planes utilizados actualmente
              </p>
            </div>

            <KeyRound size={20} />
          </div>

          <div className="sa-chart">
            {datos.totalPlanes === 0 ? (
              <div className="sa-empty">
                <Layers3 size={40} />

                <strong>
                  Sin planes registrados
                </strong>
              </div>
            ) : (
              <Bar
                data={datosPlanes}
                options={opcionesGrafico}
              />
            )}
          </div>
        </article>
      </section>

      <section className="sa-dashboard-grid">
        <article className="sa-panel">
          <div className="sa-panel-header">
            <div>
              <h3>
                Empresas recientes
              </h3>

              <p>
                Últimos registros realizados
              </p>
            </div>

            <Building2 size={20} />
          </div>

          {empresasRecientes.length === 0 ? (
            <div className="sa-empty">
              <Building2 size={40} />

              <strong>
                No existen empresas
              </strong>

              <span>
                Registra una empresa para comenzar.
              </span>
            </div>
          ) : (
            <div className="sa-recent-list">
              {empresasRecientes.map(
                (empresa) => (
                  <div
                    className="sa-recent-item"
                    key={empresa.id}
                  >
                    <div className="sa-company-avatar">
                      {empresa.nombreComercial
                        ?.charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="sa-recent-info">
                      <strong>
                        {empresa.nombreComercial}
                      </strong>

                      <span>
                        {empresa.rubro ||
                          "Rubro no definido"}
                      </span>
                    </div>

                    <span
                      className={
                        empresa.estado === "ACTIVA"
                          ? "sa-badge active"
                          : "sa-badge suspended"
                      }
                    >
                      {empresa.estado}
                    </span>
                  </div>
                )
              )}
            </div>
          )}
        </article>

        <article className="sa-panel">
          <div className="sa-panel-header">
            <div>
              <h3>
                Resumen del sistema
              </h3>

              <p>
                Recursos configurados
              </p>
            </div>

            <Layers3 size={20} />
          </div>

          <div className="sa-service-list">
            <div>
              <span>
                Empresas
              </span>

              <strong>
                {datos.totalEmpresas}
              </strong>
            </div>

            <div>
              <span>
                Planes
              </span>

              <strong>
                {datos.totalPlanes}
              </strong>
            </div>

            <div>
              <span>
                Módulos
              </span>

              <strong>
                {datos.totalModulos}
              </strong>
            </div>

            <div>
              <span>
                Licencias
              </span>

              <strong>
                {datos.totalLicencias}
              </strong>
            </div>

            <div>
              <span>
                Licencias activas
              </span>

              <strong className="online">
                {datos.licenciasActivas}
              </strong>
            </div>

            <div>
              <span>
                Licencias suspendidas
              </span>

              <strong className="pending">
                {datos.licenciasSuspendidas}
              </strong>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}

export default DashboardGlobalPage;