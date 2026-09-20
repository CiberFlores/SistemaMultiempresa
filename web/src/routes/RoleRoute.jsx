import { Navigate, Outlet } from "react-router-dom";
import useAuth from "../hooks/useAuth";


// Joel: Componente de ruta protegida basado en roles.
function RoleRoute({ rolesPermitidos }) {
  const { usuario, cargando } = useAuth();

  if (cargando) {
    return <p>Cargando...</p>;
  }

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  if (!rolesPermitidos.includes(usuario.tipoUsuario)) {
    return <Navigate to="/sin-permiso" replace />;
  }

  return <Outlet />;
}

export default RoleRoute;