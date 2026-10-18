import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase/firebaseConfig";

export async function registrarAuditoria({
  empresaId = null,
  usuarioId = null,
  usuarioNombre = "",
  accion,
  modulo,
  entidad = "",
  entidadId = "",
  detalle = "",
  metadata = {}
}) {
  if (!accion || !modulo) return;
  try {
    await addDoc(collection(db, "auditorias"), {
      empresaId,
      usuarioId,
      usuarioNombre,
      accion,
      modulo,
      entidad,
      entidadId,
      detalle,
      metadata,
      fecha: serverTimestamp()
    });
  } catch (error) {
    // La auditoría no debe bloquear una operación principal si existe un problema puntual.
    console.warn("No se pudo registrar auditoría:", error);
  }
}
