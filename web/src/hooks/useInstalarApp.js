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
    const respuesta = await pedirInstalacion();

    if (respuesta === "instalada") setResultado("instalada");
    // Sin aviso del navegador, o si la rechazó: se muestran los pasos manuales
    else setResultado("manual");
  }, []);

  return { disponible, instalada, resultado, instalar };
}
