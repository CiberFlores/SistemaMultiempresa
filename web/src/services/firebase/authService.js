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

const ROLES_PERMITIDOS = ["SUPER_ADMIN", "ADMIN", "TRABAJADOR"];

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
