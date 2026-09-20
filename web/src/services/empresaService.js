import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from "firebase/firestore";

import { db } from "./firebase/firebaseConfig";

const empresasRef = collection(db, "empresas");

export function suscribirEmpresas(callback, errorCallback) {
  const consulta = query(
    empresasRef,
    orderBy("fechaRegistro", "desc")
  );

  return onSnapshot(
    consulta,
    (snapshot) => {
      const empresas = snapshot.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      }));

      callback(empresas);
    },
    errorCallback
  );
}

export async function verificarSlugDisponible(slug, empresaId = null) {
  const consulta = query(
    empresasRef,
    where("slugPublico", "==", slug),
    limit(1)
  );

  const resultado = await getDocs(consulta);

  if (resultado.empty) {
    return true;
  }

  if (empresaId && resultado.docs[0].id === empresaId) {
    return true;
  }

  return false;
}

export async function crearEmpresa(datos) {
  return await addDoc(empresasRef, {
    ...datos,

    publicada: false,
    estado: "ACTIVA",

    fechaRegistro: serverTimestamp(),
    fechaActualizacion: serverTimestamp()
  });
}

export async function actualizarEmpresa(empresaId, datos) {
  const referencia = doc(db, "empresas", empresaId);

  await updateDoc(referencia, {
    ...datos,
    fechaActualizacion: serverTimestamp()
  });
}

export async function cambiarEstadoEmpresa(empresaId, nuevoEstado) {
  const referencia = doc(db, "empresas", empresaId);

  await updateDoc(referencia, {
    estado: nuevoEstado,
    fechaActualizacion: serverTimestamp()
  });
}