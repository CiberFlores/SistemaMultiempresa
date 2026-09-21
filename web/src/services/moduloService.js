import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";

import { db } from "./firebase/firebaseConfig";
import { BASE_MODULES } from "../data/baseModules";

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

export async function inicializarModulosBase() {
  const snapshot = await getDocs(modulosRef);
  const existentes = new Set(snapshot.docs.map((d) => String(d.data().codigo || "").toUpperCase()));
  const pendientes = BASE_MODULES.filter((item) => !existentes.has(item.codigo));
  for (const item of pendientes) {
    await addDoc(modulosRef, { ...item, activo: true, fechaRegistro: serverTimestamp(), fechaActualizacion: serverTimestamp() });
  }
  return pendientes.length;
}

export async function eliminarModulo(moduloId) {
  const planesSnapshot = await getDocs(collection(db, "planes"));
  const usado = planesSnapshot.docs.some((d) => Array.isArray(d.data().modulos) && d.data().modulos.includes(moduloId));
  if (usado) throw new Error("No se puede eliminar: el módulo está asignado a un plan. Desactívalo o quítalo de los planes primero.");
  await deleteDoc(doc(db, "modulos", moduloId));
}
