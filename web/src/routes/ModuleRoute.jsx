import { Outlet } from "react-router-dom";

import Mantenimiento from "../components/common/Mantenimiento";
import useCompanyModules from "../hooks/useCompanyModules";

// Pantallas del dueño que dependen de un módulo pero no de un permiso
export default function ModuleRoute({ modulo }) {
  const modules = useCompanyModules();

  if (modules.loading) return <div className="admin-empty" role="status">Cargando…</div>;

  if (!modules.isEnabled(modulo)) {
    return <Mantenimiento nombre={modules.nombreDe(modulo)} volverA={modules.isEnabled("DASHBOARD") ? "/dashboard" : ""} />;
  }

  return <Outlet />;
}
