import { Navigate, Outlet } from "react-router-dom";
import useAuth from "../hooks/useAuth";

// Joel: Componente de ruta protegida que verifica si el usuario está autenticado.

function ProtectedRoute() {
  const { usuario, cargando } = useAuth();

  if (cargando) {
    return <p>Cargando...</p>;
  }

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;