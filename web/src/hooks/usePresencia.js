import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";

import { db } from "../services/firebase/firebaseConfig";
import useAuth from "./useAuth";

const CADA_MS = 60000;

// Avisa al dueño que esta persona está conectada y si está cobrando.
// Se anota cada minuto mientras la pestaña está a la vista.
export default function usePresencia() {
  const { usuario } = useAuth();
  const { pathname } = useLocation();

  const uid = usuario?.uid;
  const esEquipo = usuario?.tipoUsuario === "TRABAJADOR" || usuario?.tipoUsuario === "ADMIN";
  const vendiendo = pathname.startsWith("/ventas/pos");

  useEffect(() => {
    if (!uid || !esEquipo) return undefined;

    let activo = true;

    const anotar = (conectado) => {
      updateDoc(doc(db, "usuarios", uid), {
        conectado,
        enPos: conectado && vendiendo,
        ultimaActividad: serverTimestamp()
      }).catch(() => {
        /* la presencia nunca debe molestar a quien trabaja */
      });
    };

    const latido = () => {
      if (activo && document.visibilityState === "visible") anotar(true);
    };

    latido();
    const intervalo = setInterval(latido, CADA_MS);
    document.addEventListener("visibilitychange", latido);

    return () => {
      activo = false;
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", latido);
    };
  }, [uid, esEquipo, vendiendo]);
}
