import { useEffect } from "react";

import { appInstalada } from "../utils/instalacionApp";
import { CLAVE_ULTIMA_ACTIVIDAD, MINUTOS_SIN_USO, marcarActividad, sesionVencida } from "../utils/sesion";

// Cierra la sesión si nadie toca la pantalla durante un rato.
// La app instalada del dueño queda fuera: ya la protege el bloqueo del celular.
export default function useCierrePorInactividad(usuario, cerrar) {
  const tipo = usuario?.tipoUsuario;

  useEffect(() => {
    if (!tipo || !MINUTOS_SIN_USO[tipo]) return undefined;
    if (appInstalada() && tipo !== "SUPER_ADMIN") return undefined;

    let previo = 0;
    const anotar = () => {
      const ahora = Date.now();
      if (ahora - previo < 5000) return;
      // Al volver de una laptop suspendida, primero se revisa si ya venció
      if (previo && sesionVencida(tipo)) { cerrar(); return; }
      previo = ahora;
      marcarActividad();
    };
    const revisar = () => { if (sesionVencida(tipo)) cerrar(); };

    if (!sessionStorage.getItem(CLAVE_ULTIMA_ACTIVIDAD)) marcarActividad();
    revisar();

    const eventos = ["pointerdown", "keydown", "wheel", "touchstart"];
    eventos.forEach((e) => window.addEventListener(e, anotar, { passive: true }));
    document.addEventListener("visibilitychange", revisar);
    const reloj = setInterval(revisar, 20000);

    return () => {
      eventos.forEach((e) => window.removeEventListener(e, anotar));
      document.removeEventListener("visibilitychange", revisar);
      clearInterval(reloj);
    };
  }, [tipo, cerrar]);
}
