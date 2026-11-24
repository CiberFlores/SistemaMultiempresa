import { useNavigate } from "react-router-dom";
import { LogOut, ShieldAlert, Undo2 } from "lucide-react";

import useAuth from "../hooks/useAuth";

// Se muestra cuando alguien abre una sección que su cargo no incluye.
function UnauthorizedPage() {
  const { usuario, cerrarSesion } = useAuth();
  const navigate = useNavigate();

  const inicio = !usuario ? "/login" : usuario.tipoUsuario === "SUPER_ADMIN" ? "/superadmin/dashboard" : "/dashboard";

  const salir = async () => {
    await cerrarSesion();
    navigate("/login", { replace: true });
  };

  return (
    <main className="sin-permiso">
      <section>
        <ShieldAlert size={44} aria-hidden="true" />
        <h1>No tienes acceso a esta sección</h1>
        <p>
          {usuario?.tipoUsuario === "TRABAJADOR"
            ? "Tu cargo no incluye esta pantalla o todavía no tienes un cargo activo. Pídele a tu jefe que revise tus permisos."
            : "Tu cuenta no puede abrir esta pantalla."}
        </p>
        <div>
          <button type="button" onClick={() => navigate(inicio, { replace: true })}>
            <Undo2 size={17} /> {usuario ? "Ir a mi panel" : "Iniciar sesión"}
          </button>
          {usuario && (
            <button type="button" className="sin-permiso__salir" onClick={salir}>
              <LogOut size={17} /> Cerrar sesión
            </button>
          )}
        </div>
      </section>
    </main>
  );
}

export default UnauthorizedPage;
