import { useCallback, useEffect, useState } from "react";

import { appInstalada, hayAvisoDeInstalacion, pedirInstalacion, suscribirInstalacion } from "../utils/instalacionApp";

// Estado de la instalación de la app del dueño y el botón para lanzarla.
export default function useInstalarApp() {
  const [disponible, setDisponible] = useState(hayAvisoDeInstalacion);
  const [instalada, setInstalada] = useState(appInstalada);
  const [resultado, setResultado] = useState("");

  useEffect(() => {
    return suscribirInstalacion(() => {
      setDisponible(hayAvisoDeInstalacion());
      setInstalada(appInstalada());
    });
  }, []);

  const instalar = useCallback(async () => {
    setResultado("esperando");

    // Si el navegador no muestra su ventana, no se queda esperando: salen los pasos
    const reloj = setTimeout(() => {
      if (document.hasFocus()) setResultado((r) => (r === "esperando" ? "manual" : r));
    }, 5000);

    const respuesta = await pedirInstalacion();
    clearTimeout(reloj);

    if (respuesta === "instalada") setResultado("instalada");
    // Sin aviso del navegador, o si la rechazó: se muestran los pasos manuales
    else setResultado("manual");
  }, []);

  return { disponible, instalada, resultado, instalar };
}
