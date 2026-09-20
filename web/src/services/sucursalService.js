import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where
} from "firebase/firestore";

import { db } from "./firebase/firebaseConfig";

const sucursalesRef = collection(db, "sucursales");

export function suscribirSucursales(
  empresaId,
  callback,
  errorCallback
) {
  const consulta = query(
    sucursalesRef,
    where("empresaId", "==", empresaId)
  );

  return onSnapshot(
    consulta,
    (snapshot) => {
      const sucursales = snapshot.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      }));

      sucursales.sort((a, b) => {
        const fechaA =
          a.fechaRegistro?.toMillis?.() || 0;

        const fechaB =
          b.fechaRegistro?.toMillis?.() || 0;

        return fechaB - fechaA;
      });

      callback(sucursales);
    },
    (error) => {
      console.error(
        "Error al obtener sucursales:",
        error
      );

      if (errorCallback) {
        errorCallback(error);
      }
    }
  );
}

export async function crearSucursal(
  empresaId,
  datos
) {
  if (!empresaId) {
    throw new Error(
      "No se encontró la empresa del usuario."
    );
  }

  return await addDoc(sucursalesRef, {
    empresaId,

    nombre: datos.nombre.trim(),
    codigo: datos.codigo.trim(),
    telefono: datos.telefono.trim(),
    direccion: datos.direccion.trim(),
    ciudad: datos.ciudad.trim(),

    estado: "ACTIVA",

    fechaRegistro: serverTimestamp(),
    fechaActualizacion: serverTimestamp()
  });
}

export async function actualizarSucursal(
  sucursalId,
  datos
) {
  const referencia = doc(
    db,
    "sucursales",
    sucursalId
  );

  await updateDoc(referencia, {
    nombre: datos.nombre.trim(),
    codigo: datos.codigo.trim(),
    telefono: datos.telefono.trim(),
    direccion: datos.direccion.trim(),
    ciudad: datos.ciudad.trim(),

    fechaActualizacion: serverTimestamp()
  });
}

export async function cambiarEstadoSucursal(
  sucursalId,
  nuevoEstado
) {
  const referencia = doc(
    db,
    "sucursales",
    sucursalId
  );

  await updateDoc(referencia, {
    estado: nuevoEstado,
    fechaActualizacion: serverTimestamp()
  });
}