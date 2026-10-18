import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where
} from "firebase/firestore";
import { db } from "./firebase/firebaseConfig";
import { BASE_MODULES } from "../data/baseModules";

const modulosRef = collection(db, "modulos");

export function suscribirModulos(callback, errorCallback) {
  return onSnapshot(
    modulosRef,
    (snapshot) => {
      const datos = snapshot.docs.map((documento) => ({ id: documento.id, ...documento.data() }));
      datos.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
      callback(datos);
    },
    (error) => {
      console.error("Error al obtener módulos:", error);
      errorCallback?.(error);
    }
  );
}

export async function listarModulosActivos() {
  const snapshot = await getDocs(modulosRef);
  return snapshot.docs
    .map((documento) => ({ id: documento.id, ...documento.data() }))
    .filter((modulo) => modulo.activo === true)
    .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
}

function normalizarCodigo(value) {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "_");
}

async function validarCodigoUnico(codigo, ignoreId = null) {
  const snap = await getDocs(query(modulosRef, where("codigo", "==", codigo), limit(2)));
  const conflict = snap.docs.some((item) => item.id !== ignoreId);
  if (conflict) throw new Error(`Ya existe un módulo con el código ${codigo}.`);
}

export async function crearModulo(datos) {
  const nombre = String(datos.nombre || "").trim();
  const codigo = normalizarCodigo(datos.codigo);
  const icono = String(datos.icono || "").trim();
  if (!nombre) throw new Error("El nombre del módulo es obligatorio.");
  if (!codigo) throw new Error("El código del módulo es obligatorio.");
  if (!icono) throw new Error("Selecciona un icono.");
  await validarCodigoUnico(codigo);

  return addDoc(modulosRef, {
    nombre,
    codigo,
    descripcion: String(datos.descripcion || "").trim(),
    icono,
    activo: true,
    fechaRegistro: serverTimestamp(),
    fechaActualizacion: serverTimestamp()
  });
}

export async function actualizarModulo(moduloId, datos) {
  const nombre = String(datos.nombre || "").trim();
  const codigo = normalizarCodigo(datos.codigo);
  const icono = String(datos.icono || "").trim();
  if (!nombre) throw new Error("El nombre del módulo es obligatorio.");
  if (!codigo) throw new Error("El código del módulo es obligatorio.");
  if (!icono) throw new Error("Selecciona un icono.");
  await validarCodigoUnico(codigo, moduloId);

  await updateDoc(doc(db, "modulos", moduloId), {
    nombre,
    codigo,
    descripcion: String(datos.descripcion || "").trim(),
    icono,
    fechaActualizacion: serverTimestamp()
  });
}

export async function cambiarEstadoModulo(moduloId, activo) {
  await updateDoc(doc(db, "modulos", moduloId), {
    activo,
    fechaActualizacion: serverTimestamp()
  });
}

export async function inicializarModulosBase() {
  const snapshot = await getDocs(modulosRef);
  const existentes = new Set(snapshot.docs.map((d) => String(d.data().codigo || "").toUpperCase()));
  const pendientes = BASE_MODULES.filter((item) => !existentes.has(item.codigo));
  for (const item of pendientes) {
    await addDoc(modulosRef, {
      ...item,
      activo: true,
      fechaRegistro: serverTimestamp(),
      fechaActualizacion: serverTimestamp()
    });
  }
  return pendientes.length;
}

export async function eliminarModulo(moduloId) {
  const planesSnapshot = await getDocs(collection(db, "planes"));
  const usado = planesSnapshot.docs.some(
    (d) => Array.isArray(d.data().modulos) && d.data().modulos.includes(moduloId)
  );
  if (usado) {
    throw new Error("No se puede eliminar: el módulo está asignado a un plan. Desactívalo o quítalo de los planes primero.");
  }
  await deleteDoc(doc(db, "modulos", moduloId));
}
