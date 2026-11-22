import {
  Blocks,
  Building2,
  CircleCheckBig,
  CircleX,
  Layers3,
  RefreshCw,
  Store
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

import { Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
);

// Paleta de la marca para los gráficos
const NARANJA = "#FE7C01";
const CREMA = "#FFF9F0";
const ROSA = "#C78BD1";
const TEXTO = "#CDBBD2";
const REJILLA = "rgba(255, 249, 240, 0.08)";

ChartJS.defaults.color = TEXTO;
ChartJS.defaults.font.family = "Inter, system-ui, sans-serif";

const estiloTooltip = {
  backgroundColor: "#2C0335",
  titleColor: CREMA,
  bodyColor: CREMA,
  borderColor: "rgba(255, 249, 240, 0.18)",
  borderWidth: 1,
  padding: 12,
  cornerRadius: 12,
  displayColors: false
};

function contarPorRubro(empresas) {
  const cuentas = new Map();

  empresas.forEach((empresa) => {
    const rubro = (empresa.rubro || "Sin rubro").trim() || "Sin rubro";
    cuentas.set(rubro, (cuentas.get(rubro) || 0) + 1);
  });

  return [...cuentas.entries()]
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 6);
}

function DashboardGlobalVista({
  usuario,
  datos,
  empresasRecientes,
  ultimaActualizacion,
  actualizando,
  alActualizar
}) {
  const rubros = contarPorRubro(datos.empresas || []);

  const metricas = [
    {
      titulo: "Empresas registradas",
      valor: datos.totalEmpresas,
      descripcion: "Total en la plataforma",
      icono: Building2,
      tono: "marca"
    },
    {
      titulo: "Empresas activas",
      valor: datos.empresasActivas,
      descripcion: "Con acceso habilitado",
      icono: CircleCheckBig,
      tono: "ok"
    },
    {
      titulo: "Empresas suspendidas",
      valor: datos.empresasSuspendidas,
      descripcion: "Acceso suspendido",
      icono: CircleX,
      tono: "alerta"
    },
    {
      titulo: "Módulos disponibles",
      valor: datos.totalModulos,
      descripcion: "Incluidos en cada empresa",
      icono: Blocks,
      tono: "neutro"
    }
  ];

  const total = datos.empresasActivas + datos.empresasSuspendidas;

  const datosEmpresas = {
    labels: ["Activas", "Suspendidas"],
    datasets: [
      {
        data: [datos.empresasActivas, datos.empresasSuspendidas],
        backgroundColor: [NARANJA, ROSA],
        borderWidth: 0,
        borderRadius: 8,
        spacing: 4,
        hoverOffset: 6
      }
    ]
  };

  const opcionesDona = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "72%",
    animation: { duration: 900 },
    plugins: {
      legend: { display: false },
      tooltip: {
        ...estiloTooltip,
        callbacks: {
          label: (contexto) => `${contexto.label}: ${contexto.parsed}`
        }
      }
    }
  };

  const datosRubros = {
    labels: rubros.map((item) => item.nombre),
    datasets: [
      {
        label: "Empresas",
        data: rubros.map((item) => item.cantidad),
        backgroundColor: NARANJA,
        hoverBackgroundColor: "#FF9A3D",
        borderRadius: 10,
        borderSkipped: false,
        barThickness: 18,
        maxBarThickness: 24
      }
    ]
  };

  const opcionesBarras = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 900 },
    plugins: {
      legend: { display: false },
      tooltip: {
        ...estiloTooltip,
        callbacks: {
          label: (contexto) =>
            `${contexto.parsed.x} ${contexto.parsed.x === 1 ? "empresa" : "empresas"}`
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { precision: 0, stepSize: 1, color: TEXTO },
        grid: { color: REJILLA },
        border: { display: false }
      },
      y: {
        ticks: { color: CREMA, font: { weight: 600 } },
        grid: { display: false },
        border: { display: false }
      }
    }
  };

  return (
    <div className="sa-dashboard">
      <div className="sa-page-header">
        <div>
          <h1>Dashboard Global</h1>

          <p>
            Bienvenido, {usuario?.nombreCompleto}. Supervisa toda la plataforma
            multiempresa.
          </p>
        </div>

        <div className="sa-dashboard-actions sa-dashboard-actions-v4">
          <div className="sa-dashboard-status-stack-v4">
            <div className="sa-status">
              <span></span>
              Plataforma operativa
            </div>
            <small>
              {ultimaActualizacion
                ? `Actualizado ${ultimaActualizacion.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" })}`
                : "Datos en tiempo real"}
            </small>
          </div>

          <button
            className="sa-dashboard-refresh-v4"
            onClick={alActualizar}
            title="Actualizar todas las métricas"
            disabled={actualizando}
          >
            <RefreshCw className={actualizando ? "sa-spin" : ""} size={18} />
            <span>{actualizando ? "Actualizando…" : "Actualizar datos"}</span>
          </button>
        </div>
      </div>

      <section className="sa-metrics">
        {metricas.map((metrica) => {
          const Icono = metrica.icono;

          return (
            <article className="sa-metric-card" data-tono={metrica.tono} key={metrica.titulo}>
              <div className="sa-metric-icon">
                <Icono size={24} />
              </div>

              <div>
                <span>{metrica.titulo}</span>
                <h2>{metrica.valor}</h2>
                <small>{metrica.descripcion}</small>
              </div>
            </article>
          );
        })}
      </section>

      <section className="sa-dashboard-grid">
        <article className="sa-panel">
          <div className="sa-panel-header">
            <div>
              <h3>Estado de empresas</h3>
              <p>Distribución general</p>
            </div>

            <Building2 size={20} />
          </div>

          {datos.totalEmpresas === 0 ? (
            <div className="sa-empty">
              <Building2 size={40} />
              <strong>Sin empresas registradas</strong>
            </div>
          ) : (
            <div className="sa-donut-wrap">
              <div className="sa-donut">
                <Doughnut data={datosEmpresas} options={opcionesDona} />

                <div className="sa-donut-center">
                  <strong>{total}</strong>
                  <span>{total === 1 ? "empresa" : "empresas"}</span>
                </div>
              </div>

              <ul className="sa-legend">
                <li>
                  <i style={{ background: NARANJA }} />
                  <span>Activas</span>
                  <strong>{datos.empresasActivas}</strong>
                </li>
                <li>
                  <i style={{ background: ROSA }} />
                  <span>Suspendidas</span>
                  <strong>{datos.empresasSuspendidas}</strong>
                </li>
              </ul>
            </div>
          )}
        </article>

        <article className="sa-panel">
          <div className="sa-panel-header">
            <div>
              <h3>Empresas por rubro</h3>
              <p>A qué se dedican tus clientes</p>
            </div>

            <Store size={20} />
          </div>

          {rubros.length === 0 ? (
            <div className="sa-empty">
              <Layers3 size={40} />
              <strong>Sin rubros registrados</strong>
            </div>
          ) : (
            <div className="sa-chart">
              <Bar data={datosRubros} options={opcionesBarras} />
            </div>
          )}
        </article>
      </section>

      <section className="sa-dashboard-grid">
        <article className="sa-panel">
          <div className="sa-panel-header">
            <div>
              <h3>Empresas recientes</h3>
              <p>Últimos registros realizados</p>
            </div>

            <Building2 size={20} />
          </div>

          {empresasRecientes.length === 0 ? (
            <div className="sa-empty">
              <Building2 size={40} />
              <strong>No existen empresas</strong>
              <span>Registra una empresa para comenzar.</span>
            </div>
          ) : (
            <div className="sa-recent-list">
              {empresasRecientes.map((empresa) => (
                <div className="sa-recent-item" key={empresa.id}>
                  <div className="sa-company-avatar">
                    {empresa.nombreComercial?.charAt(0).toUpperCase()}
                  </div>

                  <div className="sa-recent-info">
                    <strong>{empresa.nombreComercial}</strong>
                    <span>{empresa.rubro || "Rubro no definido"}</span>
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
              ))}
            </div>
          )}
        </article>

        <article className="sa-panel">
          <div className="sa-panel-header">
            <div>
              <h3>Resumen del sistema</h3>
              <p>Recursos configurados</p>
            </div>

            <Layers3 size={20} />
          </div>

          <div className="sa-service-list">
            <div>
              <span>Empresas registradas</span>
              <strong>{datos.totalEmpresas}</strong>
            </div>

            <div>
              <span>Empresas activas</span>
              <strong className="online">{datos.empresasActivas}</strong>
            </div>

            <div>
              <span>Empresas suspendidas</span>
              <strong className="pending">{datos.empresasSuspendidas}</strong>
            </div>

            <div>
              <span>Rubros distintos</span>
              <strong>{rubros.length}</strong>
            </div>

            <div>
              <span>Módulos disponibles</span>
              <strong>{datos.totalModulos}</strong>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}

export default DashboardGlobalVista;
