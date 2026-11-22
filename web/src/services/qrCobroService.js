import { doc, serverTimestamp, updateDoc } from "firebase/firestore";

import { db } from "./firebase/firebaseConfig";
import { subirImagenEmpresa } from "./storageService";
import { procesarImagenQr } from "../utils/imagenes";

// El QR de cobro vive en el documento de la empresa:
//   qrCobroUrl: dirección https de la imagen   qrCobroActivo: si se muestra en caja

export async function subirQrCobro(empresaId, archivo) {
  // La foto se reduce antes de subirla; si Cloudinary está configurado para
  // sobrescribir, el QR nuevo reemplaza al anterior y no ocupa espacio extra.
  const reducida = await procesarImagenQr(archivo);

  const url = await subirImagenEmpresa({
    empresaId,
    carpeta: "qr-cobro",
    archivo: reducida,
    nombre: `qr_${empresaId}`,
    sobrescribir: true
  });

  await updateDoc(doc(db, "empresas", empresaId), {
    qrCobroUrl: url,
    qrCobroActivo: true,
    fechaActualizacion: serverTimestamp()
  });

  return url;
}

export async function cambiarQrActivo(empresaId, activo) {
  await updateDoc(doc(db, "empresas", empresaId), {
    qrCobroActivo: Boolean(activo),
    fechaActualizacion: serverTimestamp()
  });
}

export async function quitarQrCobro(empresaId) {
  await updateDoc(doc(db, "empresas", empresaId), {
    qrCobroUrl: "",
    qrCobroActivo: false,
    fechaActualizacion: serverTimestamp()
  });
}
