import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from "firebase/firestore";

import { db } from "./firebase/firebaseConfig";

export async function obtenerPersonalizacion(
  empresaId
) {
  const referencia = doc(
    db,
    "personalizacionesEmpresas",
    empresaId
  );

  const resultado =
    await getDoc(referencia);

  if (!resultado.exists()) {
    return null;
  }

  return resultado.data();
}

export async function guardarPersonalizacion(
  empresaId,
  datos
) {
  const referencia = doc(
    db,
    "personalizacionesEmpresas",
    empresaId
  );

  await setDoc(
    referencia,
    {
      empresaId,

      ...datos,

      fechaActualizacion:
        serverTimestamp()
    },
    {
      merge: true
    }
  );
}