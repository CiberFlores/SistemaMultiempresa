import { Link } from "react-router-dom";

// Joel: Página que se muestra cuando un usuario intenta acceder a una sección sin los permisos necesarios.

function UnauthorizedPage() {
  return (
    <div>
      <h1>Acceso denegado</h1>

      <p>
        No tienes permisos para acceder a esta sección.
      </p>

      <Link to="/">
        Volver
      </Link>
    </div>
  );
}

export default UnauthorizedPage;