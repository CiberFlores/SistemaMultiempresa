import { Link } from "react-router-dom";

function NotFoundPage() {
  return (
    <div>
      <h1>Error 404</h1>
      <p>La página solicitada no existe.</p>

      <Link to="/">Volver al inicio</Link>
    </div>
  );
}

export default NotFoundPage;