import { deleteApp, initializeApp } from "firebase/app";
import { createUserWithEmailAndPassword, getAuth, sendEmailVerification, signOut } from "firebase/auth";
import { doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db, firebaseConfig } from "./firebase/firebaseConfig";
import { validarPassword } from "../utils/password";

async function crearCuentaSecundaria(correo, password) {
  const secondary = initializeApp(firebaseConfig, `provision-${Date.now()}-${Math.random()}`);
  const secondaryAuth = getAuth(secondary);
  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, correo, password);
    await sendEmailVerification(credential.user);
    await signOut(secondaryAuth);
    return credential.user.uid;
  } finally {
    await deleteApp(secondary);
  }
}

export async function provisionarUsuario({ correo, password, nombreCompleto, telefono = "", tipoUsuario, empresaId = null, rolId = null, sucursales = [] }) {
  const correoLimpio = correo?.trim().toLowerCase();
  if (!correoLimpio || !/^\S+@\S+\.\S+$/.test(correoLimpio)) throw new Error("Ingresa un correo válido.");
  const seguridad = validarPassword(password || "");
  if (!seguridad.valid) throw new Error("La contraseña no cumple todos los requisitos de seguridad.");
  if (!nombreCompleto?.trim()) throw new Error("El nombre completo es obligatorio.");
  if (!["ADMIN", "TRABAJADOR"].includes(tipoUsuario)) throw new Error("Tipo de usuario no permitido.");
  if (!empresaId) throw new Error("Debes seleccionar una empresa.");

  const uid = await crearCuentaSecundaria(correoLimpio, password);
  await setDoc(doc(db, "usuarios", uid), {
    empresaId,
    nombreCompleto: nombreCompleto.trim(),
    correo: correoLimpio,
    telefono: telefono.trim(),
    tipoUsuario,
    rolId: tipoUsuario === "TRABAJADOR" ? (rolId || null) : null,
    sucursales: tipoUsuario === "TRABAJADOR" ? sucursales : [],
    estado: true,
    correoVerificado: false,
    imagenPerfilUrl: "",
    ultimoAcceso: null,
    fechaRegistro: serverTimestamp(),
    fechaActualizacion: serverTimestamp()
  });
  return uid;
}

export async function actualizarPerfilUsuario(uid, data) {
  await updateDoc(doc(db, "usuarios", uid), { ...data, fechaActualizacion: serverTimestamp() });
}
