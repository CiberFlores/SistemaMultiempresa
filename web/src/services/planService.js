import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";

import { db } from "./firebase/firebaseConfig";

const planesRef = collection(db, "planes");

export function suscribirPlanes(callback, errorCallback) {
  return onSnapshot(
    planesRef,
    (snapshot) => {
      const planes = snapshot.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      }));

      planes.sort((a, b) =>
        (a.nombre || "").localeCompare(b.nombre || "")
      );

      callback(planes);
    },
    (error) => {
      console.error("Error cargando planes:", error);

      if (errorCallback) {
        errorCallback(error);
      }
    }
  );
}

export async function crearPlan(datos) {
  const nombre = datos.nombre.trim();

  if (!nombre) {
    throw new Error("El nombre del plan es obligatorio.");
  }

  if (Number(datos.precioMensual) < 0) {
    throw new Error("El precio no puede ser negativo.");
  }

  return addDoc(planesRef, {
    nombre,

    nombreNormalizado:
      nombre.toLowerCase(),

    descripcion:
      datos.descripcion.trim(),

    precioMensual:
      Number(datos.precioMensual) || 0,

    limiteUsuarios:
      Number(datos.limiteUsuarios) || 1,

    limiteSucursales:
      Number(datos.limiteSucursales) || 1,

    modulos:
      datos.modulos || [],

    activo: true,

    fechaRegistro:
      serverTimestamp(),

    fechaActualizacion:
      serverTimestamp()
  });
}

export async function actualizarPlan(
  planId,
  datos
) {
  const referencia = doc(
    db,
    "planes",
    planId
  );

  const nombre =
    datos.nombre.trim();

  if (!nombre) {
    throw new Error(
      "El nombre del plan es obligatorio."
    );
  }

  await updateDoc(referencia, {
    nombre,

    nombreNormalizado:
      nombre.toLowerCase(),

    descripcion:
      datos.descripcion.trim(),

    precioMensual:
      Number(datos.precioMensual) || 0,

    limiteUsuarios:
      Number(datos.limiteUsuarios) || 1,

    limiteSucursales:
      Number(datos.limiteSucursales) || 1,

    modulos:
      datos.modulos || [],

    fechaActualizacion:
      serverTimestamp()
  });
}

export async function cambiarEstadoPlan(
  planId,
  activo
) {
  const referencia = doc(
    db,
    "planes",
    planId
  );

  await updateDoc(referencia, {
    activo,
    fechaActualizacion:
      serverTimestamp()
  });
}