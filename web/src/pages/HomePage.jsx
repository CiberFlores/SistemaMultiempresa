import { Link } from "react-router-dom";

function HomePage() {
  return (
    <div>
      <h1>Sistema Multiempresa de Ventas e Inventario</h1>
      <p>Plataforma de administración multiempresa.</p>

      <Link to="/login">Iniciar sesión</Link>
    </div>
  );
}

export default HomePage;