import {
  Bell,
  Building2,
  LogOut
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import useAuth from "../../hooks/useAuth";

function Header() {
  const {
    usuario,
    cerrarSesion
  } = useAuth();

  const navigate = useNavigate();

  const salir = async () => {
    await cerrarSesion();

    navigate("/login");
  };

  return (
    <header className="admin-header">
      <div>
        <span className="admin-header-label">
          PANEL EMPRESARIAL
        </span>
      </div>

      <div className="admin-header-right">
        <button
          className="admin-icon-button"
          title="Notificaciones"
        >
          <Bell size={19} />
        </button>

        <div className="admin-user">
          <div className="admin-avatar">
            <Building2 size={19} />
          </div>

          <div>
            <strong>
              {usuario?.nombreCompleto}
            </strong>

            <span>
              Administrador
            </span>
          </div>
        </div>

        <button
          className="admin-logout"
          onClick={salir}
        >
          <LogOut size={17} />
          Salir
        </button>
      </div>
    </header>
  );
}

export default Header;