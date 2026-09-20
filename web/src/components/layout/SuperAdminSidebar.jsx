import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  BadgeDollarSign,
  KeyRound,
  Blocks,
  Settings
} from "lucide-react";

const opciones = [
  {
    texto: "Dashboard",
    ruta: "/superadmin/dashboard",
    icono: LayoutDashboard
  },
  {
    texto: "Empresas",
    ruta: "/superadmin/empresas",
    icono: Building2
  },
  {
    texto: "Planes",
    ruta: "/superadmin/planes",
    icono: BadgeDollarSign
  },
  {
    texto: "Licencias",
    ruta: "/superadmin/licencias",
    icono: KeyRound
  },
  {
    texto: "Módulos",
    ruta: "/superadmin/modulos",
    icono: Blocks
  }
];

function SuperAdminSidebar() {
  return (
    <aside className="sa-sidebar">
      <div className="sa-brand">
        <div className="sa-brand-icon">M</div>

        <div>
          <strong>MultiEmpresa</strong>
          <span>Super Admin</span>
        </div>
      </div>

      <span className="sa-menu-title">
        PLATAFORMA
      </span>

      <nav className="sa-nav">
        {opciones.map((opcion) => {
          const Icono = opcion.icono;

          return (
            <NavLink
              key={opcion.ruta}
              to={opcion.ruta}
              className={({ isActive }) =>
                isActive ? "sa-nav-item active" : "sa-nav-item"
              }
            >
              <Icono size={20} />
              <span>{opcion.texto}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sa-sidebar-bottom">
        <Settings size={18} />
        <span>Sistema Multiempresa</span>
      </div>
    </aside>
  );
}

export default SuperAdminSidebar;