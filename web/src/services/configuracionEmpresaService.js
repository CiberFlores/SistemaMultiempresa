import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc
} from "firebase/firestore";

import { db } from "./firebase/firebaseConfig";

export async function obtenerEmpresa(
  empresaId
) {
  const referencia = doc(
    db,
    "empresas",
    empresaId
  );

  const resultado =
    await getDoc(referencia);

  if (!resultado.exists()) {
    throw new Error(
      "La empresa no existe."
    );
  }

  return {
    id: resultado.id,
    ...resultado.data()
  };
}

export async function obtenerConfiguracionEmpresa(
  empresaId
) {
  const referencia = doc(
    db,
    "configuracionesEmpresas",
    empresaId
  );

  const resultado =
    await getDoc(referencia);

  if (!resultado.exists()) {
    return null;
  }

  return {
    id: resultado.id,
    ...resultado.data()
  };
}

export async function guardarDatosEmpresa(
  empresaId,
  datos
) {
  const referencia = doc(
    db,
    "empresas",
    empresaId
  );

  await updateDoc(referencia, {
    ...datos,
    fechaActualizacion:
      serverTimestamp()
  });
}

export async function guardarConfiguracionEmpresa(
  empresaId,
  datos
) {
  const referencia = doc(
    db,
    "configuracionesEmpresas",
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