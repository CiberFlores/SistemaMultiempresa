import { Bell, Search, ShieldCheck } from "lucide-react";
import useAuth from "../../hooks/useAuth";

function SuperAdminHeader() {
  const { usuario, cerrarSesion } = useAuth();

  return (
    <header className="sa-header">
      <div className="sa-search">
        <Search size={18} />

        <input
          type="text"
          placeholder="Buscar en la plataforma..."
        />
      </div>

      <div className="sa-header-right">
        <button className="sa-icon-button">
          <Bell size={20} />
        </button>

        <div className="sa-user">
          <div className="sa-avatar">
            <ShieldCheck size={20} />
          </div>

          <div className="sa-user-info">
            <strong>{usuario?.nombreCompleto}</strong>
            <span>Super Administrador</span>
          </div>
        </div>

        <button
          className="sa-logout"
          onClick={cerrarSesion}
        >
          Salir
        </button>
      </div>
    </header>
  );
}

export default SuperAdminHeader;    