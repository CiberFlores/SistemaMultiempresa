import {
  browserLocalPersistence,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { auth, db } from "./firebaseConfig";

// Los correos de Firebase (verificar cuenta, cambiar contraseña) salen en español
auth.languageCode = "es";

const ROLES_PERMITIDOS = ["SUPER_ADMIN", "ADMIN", "TRABAJADOR"];

export const MENSAJE_EMPRESA_SUSPENDIDA =
  "Esta empresa fue desactivada. Habla con los encargados de la plataforma para volver a activarla.";

// Dónde se guarda el nombre de la empresa bloqueada para mostrarlo en la pantalla de bloqueo
export const CLAVE_EMPRESA_BLOQUEADA = "an-empresa-bloqueada";

export function recordarEmpresaBloqueada(nombre) {
  try {
    sessionStorage.setItem(CLAVE_EMPRESA_BLOQUEADA, JSON.stringify({ nombre: nombre || "" }));
  } catch {
    /* sin almacenamiento: la pantalla de bloqueo sale sin el nombre */
  }
}

// Si la empresa fue suspendida devuelve { nombre }; si está activa, null
export async function empresaSuspendida(empresaId) {
  if (!empresaId) return null;

  try {
    const documento = await getDoc(doc(db, "empresas", empresaId));

    if (!documento.exists() || documento.data().estado !== "SUSPENDIDA") return null;

    const datos = documento.data();
    return { nombre: datos.nombreComercial || datos.nombre || datos.razonSocial || "" };
  } catch {
    return null;
  }
}

export async function iniciarSesion(correo, contraseña) {
  const correoLimpio = correo?.trim().toLowerCase();
  if (!correoLimpio) throw new Error("Debes ingresar tu correo electrónico.");
  if (!contraseña) throw new Error("Debes ingresar tu contraseña.");

  await setPersistence(auth, browserLocalPersistence);
  const credencial = await signInWithEmailAndPassword(auth, correoLimpio, contraseña);
  const usuarioFirebase = credencial.user;

  if (!usuarioFirebase.emailVerified) {
    try { await sendEmailVerification(usuarioFirebase); } catch { /* Firebase puede limitar reenvíos */ }
    await signOut(auth);
    const error = new Error("Tu correo todavía no está verificado. Te enviamos un enlace de verificación. Revisa también spam/correo no deseado.");
    error.code = "auth/email-not-verified";
    throw error;
  }

  const referenciaUsuario = doc(db, "usuarios", usuarioFirebase.uid);
  const documentoUsuario = await getDoc(referenciaUsuario);
  if (!documentoUsuario.exists()) {
    await signOut(auth);
    throw new Error("El usuario no tiene un perfil registrado en Firestore.");
  }

  const datosUsuario = documentoUsuario.data();
  if (datosUsuario.estado !== true) {
    await signOut(auth);
    throw new Error("La cuenta se encuentra deshabilitada.");
  }
  if (!ROLES_PERMITIDOS.includes(datosUsuario.tipoUsuario)) {
    await signOut(auth);
    throw new Error("El usuario no tiene un rol válido.");
  }
  if (["ADMIN", "TRABAJADOR"].includes(datosUsuario.tipoUsuario) && !datosUsuario.empresaId) {
    await signOut(auth);
    throw new Error("El usuario no tiene una empresa asignada.");
  }

  const bloqueo = datosUsuario.tipoUsuario !== "SUPER_ADMIN" ? await empresaSuspendida(datosUsuario.empresaId) : null;

  if (bloqueo) {
    recordarEmpresaBloqueada(bloqueo.nombre);
    await signOut(auth);
    const error = new Error(MENSAJE_EMPRESA_SUSPENDIDA);
    error.code = "empresa/suspendida";
    throw error;
  }

  try {
    await updateDoc(referenciaUsuario, { ultimoAcceso: serverTimestamp(), correoVerificado: true });
  } catch { /* no bloquear login por telemetría */ }

  return { uid: usuarioFirebase.uid, email: usuarioFirebase.email, correo: datosUsuario.correo || usuarioFirebase.email, emailVerified: true, ...datosUsuario };
}

export async function reenviarVerificacion() {
  if (!auth.currentUser) throw new Error("No hay una sesión activa.");
  await sendEmailVerification(auth.currentUser);
}

export async function recuperarContrasena(correo) {
  const correoLimpio = correo?.trim().toLowerCase();
  if (!correoLimpio) throw new Error("Debes ingresar tu correo electrónico.");
  await sendPasswordResetEmail(auth, correoLimpio);
  return true;
}

export async function cerrarSesion() {
  // Antes de salir, se avisa que ya no está conectado
  try {
    if (auth.currentUser) {
      await updateDoc(doc(db, "usuarios", auth.currentUser.uid), { conectado: false, enPos: false, ultimaActividad: serverTimestamp() });
    }
  } catch {
    /* no bloquear la salida */
  }

  await signOut(auth);
  return true;
}

export async function cambiarContrasenaActual(contrasenaActual, nuevaContrasena) {
  const { EmailAuthProvider, reauthenticateWithCredential, updatePassword } = await import("firebase/auth");
  const { validarPassword } = await import("../../utils/password");
  const currentUser = auth.currentUser;
  if (!currentUser?.email) throw new Error("No hay una sesión válida.");
  if (!contrasenaActual) throw new Error("Ingresa tu contraseña actual.");
  const seguridad = validarPassword(nuevaContrasena || "");
  if (!seguridad.valid) throw new Error("La nueva contraseña no cumple todos los requisitos de seguridad.");
  const credential = EmailAuthProvider.credential(currentUser.email, contrasenaActual);
  await reauthenticateWithCredential(currentUser, credential);
  await updatePassword(currentUser, nuevaContrasena);
  return true;
}
