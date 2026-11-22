import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc
} from "firebase/firestore";

import { db } from "./firebase/firebaseConfig";

// Las fotos del proyecto se guardan en Cloudinary (igual que las de los productos)
import { subirImagenEmpresa } from "./storageService";

import { resumenIdentidad } from "../utils/identidadEmpresa";

// Sube el logo a Cloudinary y devuelve su dirección pública (HTTPS)
export async function subirLogoEmpresa(empresaId, blob, extension = "webp") {
  const archivo = new File([blob], `logo-${empresaId}.${extension}`, {
    type: blob.type || `image/${extension}`
  });

  return subirImagenEmpresa({
    empresaId,
    carpeta: "branding",
    archivo,
    nombre: `logo_${empresaId}`
  });
}

// Cloudinary solo permite borrar con un servidor autorizado; aquí el logo
// simplemente deja de usarse (la empresa vuelve a mostrar su inicial).
export async function quitarLogoEmpresa() {}

export async function obtenerIdentidadEmpresa(empresaId) {
  const resultado = await getDoc(doc(db, "personalizacionesEmpresas", empresaId));

  return resultado.exists() ? resultado.data() : null;
}

// Guarda la identidad en su documento y deja un resumen en la empresa
export async function guardarIdentidadEmpresa(empresaId, identidad) {
  const resumen = resumenIdentidad(identidad);
  const logoUrl = identidad.logoUrl || "";

  await Promise.all([
    setDoc(
      doc(db, "personalizacionesEmpresas", empresaId),
      {
        ...resumen,
        logoUrl,
        empresaId,
        fechaActualizacion: serverTimestamp()
      },
      { merge: true }
    ),
    updateDoc(doc(db, "empresas", empresaId), {
      logoUrl,
      identidad: resumen,
      fechaActualizacion: serverTimestamp()
    })
  ]);
}

// El dueño solo puede cambiar los colores y el logo. El nombre y el tipo de letra
// se conservan tal como los dejó quien administra la plataforma.
export async function guardarIdentidadPropia(empresaId, identidad) {
  const resumen = resumenIdentidad(identidad);
  const logoUrl = identidad.logoUrl || "";

  await Promise.all([
    setDoc(
      doc(db, "personalizacionesEmpresas", empresaId),
      {
        colorPrimario: resumen.colorPrimario,
        colorSecundario: resumen.colorSecundario,
        fondo: resumen.fondo,
        logoUrl,
        empresaId,
        fechaActualizacion: serverTimestamp()
      },
      { merge: true }
    ),
    updateDoc(doc(db, "empresas", empresaId), {
      logoUrl,
      identidad: resumen,
      fechaActualizacion: serverTimestamp()
    })
  ]);
}
