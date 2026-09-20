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

const proveedoresRef = collection(db, "proveedores");

export function suscribirProveedores(empresaId, callback, errorCallback) {
  const consulta = query(
    proveedoresRef,
    where("empresaId", "==", empresaId)
  );

  return onSnapshot(
    consulta,
    (snapshot) => {
      const proveedores = snapshot.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      }));

      proveedores.sort((a, b) =>
        (a.nombre || "").localeCompare(b.nombre || "")
      );

      callback(proveedores);
    },
    errorCallback
  );
}

export async function crearProveedor(empresaId, datos) {
  if (!datos.nombre?.trim()) {
    throw new Error("El nombre del proveedor es obligatorio.");
  }

  return addDoc(proveedoresRef, {
    empresaId,
    nombre: datos.nombre.trim(),
    nit: datos.nit?.trim() || "",
    contacto: datos.contacto?.trim() || "",
    telefono: datos.telefono?.trim() || "",
    correo: datos.correo?.trim().toLowerCase() || "",
    direccion: datos.direccion?.trim() || "",
    estado: "ACTIVO",
    fechaRegistro: serverTimestamp(),
    fechaActualizacion: serverTimestamp()
  });
}

export async function actualizarProveedor(proveedorId, datos) {
  await updateDoc(
    doc(db, "proveedores", proveedorId),
    {
      nombre: datos.nombre.trim(),
      nit: datos.nit?.trim() || "",
      contacto: datos.contacto?.trim() || "",
      telefono: datos.telefono?.trim() || "",
      correo: datos.correo?.trim().toLowerCase() || "",
      direccion: datos.direccion?.trim() || "",
      fechaActualizacion: serverTimestamp()
    }
  );
}

export async function cambiarEstadoProveedor(proveedorId, estado) {
  await updateDoc(
    doc(db, "proveedores", proveedorId),
    {
      estado,
      fechaActualizacion: serverTimestamp()
    }
  );
}
