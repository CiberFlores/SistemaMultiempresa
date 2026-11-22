import { doc, serverTimestamp, updateDoc } from "firebase/firestore";

import { db } from "./firebase/firebaseConfig";
import { subirImagenEmpresa } from "./storageService";

// El QR de cobro vive en el documento de la empresa:
//   qrCobroUrl: dirección https de la imagen   qrCobroActivo: si se muestra en caja

export async function subirQrCobro(empresaId, archivo) {
  const url = await subirImagenEmpresa({
    empresaId,
    carpeta: "qr-cobro",
    archivo,
    nombre: `qr_${empresaId}_${Date.now()}`
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
