import { Volume2, VolumeX } from "lucide-react";

import { useState } from "react";

import { fijarSonido, sonidoActivo, sonidoPop } from "../../utils/sonidos";

// Silencia o activa los sonidos de la interfaz; se recuerda entre visitas
function BotonSonido() {
  const [activo, setActivo] = useState(sonidoActivo);

  const alternar = () => {
    const siguiente = !activo;

    fijarSonido(siguiente);
    setActivo(siguiente);

    if (siguiente) {
      sonidoPop();
    }
  };

  return (
    <button
      type="button"
      className="an-sound"
      data-sonido="ninguno"
      onClick={alternar}
      aria-pressed={activo}
      aria-label={activo ? "Silenciar sonidos" : "Activar sonidos"}
      title={activo ? "Silenciar sonidos" : "Activar sonidos"}
    >
      {activo ? (
        <Volume2 size={18} strokeWidth={1.75} aria-hidden="true" />
      ) : (
        <VolumeX size={18} strokeWidth={1.75} aria-hidden="true" />
      )}
    </button>
  );
}

export default BotonSonido;
