import { useNavigate } from "react-router-dom";
import { Undo2 } from "lucide-react";

import EscenaTienda from "./EscenaTienda";
import "../../styles/mantenimiento.css";

// Se muestra en lugar de una pantalla cuando el super admin apaga su módulo.
// Vuelve sola apenas lo activan.
export default function Mantenimiento({ nombre = "Esta sección", volverA = "" }) {
  const navigate = useNavigate();

  return (
    <section className="mt" role="status">
      <EscenaTienda tipo="mantenimiento" letrero="Ya volvemos" />
      <h1>{nombre} está en mantenimiento</h1>
      <p>Lo estamos mejorando. Tus datos están guardados y esta pantalla se abrirá sola cuando terminemos.</p>
      {volverA && (
        <button type="button" onClick={() => navigate(volverA)}>
          <Undo2 size={18} aria-hidden="true" /> Ir a mi panel
        </button>
      )}
      <small>Equipo Arca Nova</small>
    </section>
  );
}
