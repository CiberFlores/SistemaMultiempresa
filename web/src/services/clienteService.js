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

const clientesRef = collection(db, "clientes");

export function suscribirClientes(empresaId, callback, errorCallback) {
  const consulta = query(
    clientesRef,
    where("empresaId", "==", empresaId)
  );

  return onSnapshot(
    consulta,
    (snapshot) => {
      const clientes = snapshot.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      }));

      clientes.sort((a, b) =>
        (a.nombre || "").localeCompare(b.nombre || "")
      );

      callback(clientes);
    },
    errorCallback
  );
}

export async function crearCliente(empresaId, datos) {
  if (!datos.nombre?.trim()) {
    throw new Error("El nombre del cliente es obligatorio.");
  }

  return addDoc(clientesRef, {
    empresaId,
    nombre: datos.nombre.trim(),
    documento: datos.documento?.trim() || "",
    telefono: datos.telefono?.trim() || "",
    correo: datos.correo?.trim().toLowerCase() || "",
    direccion: datos.direccion?.trim() || "",
    tipo: datos.tipo || "PERSONA",
    estado: "ACTIVO",
    fechaRegistro: serverTimestamp(),
    fechaActualizacion: serverTimestamp()
  });
}

export async function actualizarCliente(clienteId, datos) {
  await updateDoc(
    doc(db, "clientes", clienteId),
    {
      nombre: datos.nombre.trim(),
      documento: datos.documento?.trim() || "",
      telefono: datos.telefono?.trim() || "",
      correo: datos.correo?.trim().toLowerCase() || "",
      direccion: datos.direccion?.trim() || "",
      tipo: datos.tipo || "PERSONA",
      fechaActualizacion: serverTimestamp()
    }
  );
}

export async function cambiarEstadoCliente(clienteId, estado) {
  await updateDoc(
    doc(db, "clientes", clienteId),
    {
      estado,
      fechaActualizacion: serverTimestamp()
    }
  );
}
