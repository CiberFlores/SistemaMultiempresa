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

const planesRef = collection(db, "planes");

export function suscribirPlanes(callback, errorCallback) {
  return onSnapshot(
    planesRef,
    (snapshot) => {
      const planes = snapshot.docs.map((documento) => ({ id: documento.id, ...documento.data() }));
      planes.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
      callback(planes);
    },
    (error) => {
      console.error("Error cargando planes:", error);
      errorCallback?.(error);
    }
  );
}

function normalizarPlan(datos) {
  const nombre = String(datos.nombre || "").trim();
  if (!nombre) throw new Error("El nombre del plan es obligatorio.");

  const precioMensual = Number(datos.precioMensual || 0);
  const limiteUsuarios = Number(datos.limiteUsuarios || 1);
  const limiteSucursales = Number(datos.limiteSucursales || 1);

  if (precioMensual < 0) throw new Error("El precio no puede ser negativo.");
  if (limiteUsuarios < 1) throw new Error("El plan debe permitir al menos un usuario.");
  if (limiteSucursales < 1) throw new Error("El plan debe permitir al menos una sucursal.");

  return {
    nombre,
    nombreNormalizado: nombre.toLowerCase(),
    descripcion: String(datos.descripcion || "").trim(),
    precioMensual,
    moneda: datos.moneda || "BOB",
    limiteUsuarios,
    limiteSucursales,
    modulos: Array.isArray(datos.modulos) ? datos.modulos : []
  };
}

export async function crearPlan(datos) {
  const payload = normalizarPlan(datos);
  return addDoc(planesRef, {
    ...payload,
    activo: true,
    fechaRegistro: serverTimestamp(),
    fechaActualizacion: serverTimestamp()
  });
}

export async function actualizarPlan(planId, datos) {
  const referencia = doc(db, "planes", planId);
  await updateDoc(referencia, {
    ...normalizarPlan(datos),
    fechaActualizacion: serverTimestamp()
  });
}

export async function cambiarEstadoPlan(planId, activo) {
  await updateDoc(doc(db, "planes", planId), {
    activo,
    fechaActualizacion: serverTimestamp()
  });
}

export async function eliminarPlan(planId) {
  const licenciaActiva = await getDocs(
    query(collection(db, "licencias"), where("planId", "==", planId), limit(1))
  );

  if (!licenciaActiva.empty) {
    throw new Error("No se puede eliminar el plan porque existe al menos una licencia asociada. Desactívalo para conservar el historial comercial.");
  }

  await deleteDoc(doc(db, "planes", planId));
}
