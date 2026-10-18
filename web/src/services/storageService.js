import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "./firebase/firebaseConfig";

export async function subirImagenEmpresa({ empresaId, carpeta, archivo, nombre }) {
  if (!archivo) return "";
  if (!archivo.type?.startsWith("image/")) throw new Error("Solo se permiten imágenes.");
  if (archivo.size > 5 * 1024 * 1024) throw new Error("La imagen no puede superar 5 MB.");
  const safeName = (nombre || archivo.name).replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `empresas/${empresaId}/${carpeta}/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, archivo, { contentType: archivo.type });
  return getDownloadURL(storageRef);
}

export async function eliminarArchivoPorUrl(path) {
  if (!path) return;
  await deleteObject(ref(storage, path));
}
