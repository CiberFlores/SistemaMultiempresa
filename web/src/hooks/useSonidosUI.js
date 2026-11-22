import { useEffect } from "react";

import { sonidoClick, sonidoPop } from "../utils/sonidos";

// Un "clic" suave en cada botón y enlace de las pantallas de acceso.
// Los botones con data-sonido="pop" suenan distinto; data-sonido="ninguno" no suenan.
function useSonidosUI() {
  useEffect(() => {
    const alPulsar = (evento) => {
      const control = evento.target.closest?.("button, a[href]");

      if (!control || control.disabled || control.getAttribute("aria-disabled") === "true") {
        return;
      }

      if (!control.closest(".an-login, .an-welcome")) {
        return;
      }

      const tipo = control.dataset.sonido;

      if (tipo === "ninguno") {
        return;
      }

      if (tipo === "pop") {
        sonidoPop();
        return;
      }

      sonidoClick();
    };

    document.addEventListener("click", alPulsar, true);

    return () => document.removeEventListener("click", alPulsar, true);
  }, []);
}

export default useSonidosUI;
