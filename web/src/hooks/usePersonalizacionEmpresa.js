import { useEffect, useMemo, useState } from "react";

import { doc, onSnapshot } from "firebase/firestore";

import { db } from "../services/firebase/firebaseConfig";

import { IDENTIDAD_BASE, variablesPanel } from "../utils/identidadEmpresa";

import useAuth from "./useAuth";

// Lee la identidad visual de la empresa del usuario y la mantiene al día:
// si el super administrador cambia el logo o los colores, el panel los refleja solo.
function usePersonalizacionEmpresa() {
  const { usuario } = useAuth();
  const empresaId = usuario?.empresaId || null;
  const [datos, setDatos] = useState(null);

  useEffect(() => {
    if (!empresaId) {
      return undefined;
    }

    return onSnapshot(
      doc(db, "personalizacionesEmpresas", empresaId),
      (resultado) => setDatos(resultado.exists() ? resultado.data() : null),
      () => setDatos(null)
    );
  }, [empresaId]);

  return useMemo(() => {
    if (!empresaId || !datos) {
      return { identidad: null, variables: {}, personalizada: false };
    }

    const identidad = { ...IDENTIDAD_BASE, ...datos };

    return {
      identidad,
      variables: variablesPanel(identidad),
      personalizada: true
    };
  }, [empresaId, datos]);
}

export default usePersonalizacionEmpresa;
