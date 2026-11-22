import { useEffect, useState } from "react";

import { RefreshCw } from "lucide-react";

import useAuth from "../../hooks/useAuth";

import {
  obtenerDashboardGlobal,
  obtenerEmpresasRecientes
} from "../../services/dashboardService";

import DashboardGlobalVista from "./DashboardGlobalVista";

function DashboardGlobalPage() {
  const { usuario } = useAuth();

  const [datos, setDatos] = useState(null);
  const [empresasRecientes, setEmpresasRecientes] = useState([]);

  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
  const [error, setError] = useState("");

  const cargarDashboard = async (esActualizacion = false) => {
    try {
      if (esActualizacion) setActualizando(true);
      else setCargando(true);
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
      setUltimaActualizacion(new Date());
    } catch (error) {
      console.error(error);

      setError(
        "No se pudo cargar la información del dashboard."
      );
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  };

  useEffect(() => {
    cargarDashboard(false);
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
          onClick={() => cargarDashboard(false)}
        >
          Intentar nuevamente
        </button>
      </div>
    );
  }

  return (
    <DashboardGlobalVista
      usuario={usuario}
      datos={datos}
      empresasRecientes={empresasRecientes}
      ultimaActualizacion={ultimaActualizacion}
      actualizando={actualizando}
      alActualizar={() => cargarDashboard(true)}
    />
  );
}

export default DashboardGlobalPage;
