import { useCallback, useEffect, useRef, useState } from "react";

function yaInstalada() {
  const independiente = window.matchMedia("(display-mode: standalone)").matches;
  return independiente || window.navigator.standalone === true;
}

// Instalación de la app del dueño: avisa cuando el navegador la permite y la lanza al tocar el botón.
export default function useInstalarApp() {
  const aviso = useRef(null);

  const [disponible, setDisponible] = useState(false);
  const [instalada, setInstalada] = useState(yaInstalada);
  const [resultado, setResultado] = useState("");

  useEffect(() => {
    function preparar(evento) {
      evento.preventDefault();
      aviso.current = evento;
      setDisponible(true);
    }

    function terminada() {
      aviso.current = null;
      setDisponible(false);
      setInstalada(true);
    }

    window.addEventListener("beforeinstallprompt", preparar);
    window.addEventListener("appinstalled", terminada);

    return () => {
      window.removeEventListener("beforeinstallprompt", preparar);
      window.removeEventListener("appinstalled", terminada);
    };
  }, []);

  const instalar = useCallback(async () => {
    const evento = aviso.current;

    if (!evento) {
      setResultado("manual");
      return;
    }

    try {
      await evento.prompt();
      const eleccion = await evento.userChoice;
      aviso.current = null;
      setDisponible(false);
      setResultado(eleccion?.outcome === "accepted" ? "instalada" : "manual");
    } catch {
      setResultado("manual");
    }
  }, []);

  return { disponible, instalada, resultado, instalar };
}
