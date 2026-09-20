import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";

import { db } from "./firebase/firebaseConfig";

const modulosRef = collection(db, "modulos");

export function suscribirModulos(callback, errorCallback) {
  return onSnapshot(
    modulosRef,
    (snapshot) => {
      const datos = snapshot.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      }));

      datos.sort((a, b) =>
        (a.nombre || "").localeCompare(b.nombre || "")
      );

      callback(datos);
    },
    (error) => {
      console.error("Error al obtener módulos:", error);

      if (errorCallback) {
        errorCallback(error);
      }
    }
  );
}

export async function listarModulosActivos() {
  const snapshot = await getDocs(modulosRef);

  return snapshot.docs
    .map((documento) => ({
      id: documento.id,
      ...documento.data()
    }))
    .filter((modulo) => modulo.activo === true)
    .sort((a, b) =>
      (a.nombre || "").localeCompare(b.nombre || "")
    );
}

export async function crearModulo(datos) {
  const codigo = datos.codigo
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");

  return addDoc(modulosRef, {
    nombre: datos.nombre.trim(),
    codigo,
    descripcion: datos.descripcion.trim(),
    icono: datos.icono?.trim() || "",
    activo: true,
    fechaRegistro: serverTimestamp(),
    fechaActualizacion: serverTimestamp()
  });
}

export async function actualizarModulo(moduloId, datos) {
  const referencia = doc(db, "modulos", moduloId);

  const codigo = datos.codigo
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");

  await updateDoc(referencia, {
    nombre: datos.nombre.trim(),
    codigo,
    descripcion: datos.descripcion.trim(),
    icono: datos.icono?.trim() || "",
    fechaActualizacion: serverTimestamp()
  });
}

export async function cambiarEstadoModulo(moduloId, activo) {
  const referencia = doc(db, "modulos", moduloId);

  await updateDoc(referencia, {
    activo,
    fechaActualizacion: serverTimestamp()
  });
}