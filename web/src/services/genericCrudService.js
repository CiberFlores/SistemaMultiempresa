import { addDoc, collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { db } from "./firebase/firebaseConfig";

export function suscribirColeccionEmpresa(collectionName, empresaId, callback, errorCallback) {
  const ref = collection(db, collectionName);
  const q = empresaId ? query(ref, where("empresaId", "==", empresaId)) : ref;
  return onSnapshot(q, (snapshot) => {
    const rows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    rows.sort((a, b) => (b.fechaRegistro?.toMillis?.() || 0) - (a.fechaRegistro?.toMillis?.() || 0));
    callback(rows);
  }, errorCallback);
}

export async function crearRegistro(collectionName, empresaId, data) {
  return addDoc(collection(db, collectionName), { ...data, ...(empresaId ? { empresaId } : {}), fechaRegistro: serverTimestamp(), fechaActualizacion: serverTimestamp() });
}

export async function actualizarRegistro(collectionName, id, data) {
  return updateDoc(doc(db, collectionName, id), { ...data, fechaActualizacion: serverTimestamp() });
}

export async function eliminarRegistro(collectionName, id) {
  return deleteDoc(doc(db, collectionName, id));
}
