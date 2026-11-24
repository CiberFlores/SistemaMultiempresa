import { deleteApp, initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { db, firebaseConfig } from "./firebase/firebaseConfig";
import { validarPassword } from "../utils/password";

const TIPOS = { SUPER_ADMIN: "super administrador", ADMIN: "administrador", TRABAJADOR: "trabajador" };

function errorCuenta(code, mensaje, extra = {}) {
  return Object.assign(new Error(mensaje), { code, ...extra });
}

// Un perfil ya usa ese correo: se explica cuál es y si se le puede devolver el acceso
function errorPorPerfil(perfil) {
  const reactivable = perfil.tipoUsuario === "ADMIN" && (perfil.eliminado === true || perfil.estado !== true);

  if (reactivable) {
    return errorCuenta(
      "cuenta/reactivable",
      `Ese correo es de ${perfil.nombreCompleto || "un administrador"}, que ya no tiene acceso. Puedes devolvérselo y asignarle esta empresa. Entrará con la contraseña que ya tenía.`,
      { perfil }
    );
  }

  return errorCuenta(
    "cuenta/con-perfil",
    `Ese correo ya lo usa ${perfil.nombreCompleto || "otra persona"} (${TIPOS[perfil.tipoUsuario] || "usuario"}). Usa otro correo para esta cuenta.`
  );
}

// Crea la cuenta; si el correo ya existe, intenta recuperarla con la misma contraseña
async function abrirCuenta(auth, correo, password) {
  try {
    const { user } = await createUserWithEmailAndPassword(auth, correo, password);
    return { user, nueva: true };
  } catch (error) {
    if (error.code !== "auth/email-already-in-use") throw error;
  }

  try {
    const { user } = await signInWithEmailAndPassword(auth, correo, password);
    return { user, nueva: false };
  } catch (error) {
    if (["auth/invalid-credential", "auth/wrong-password", "auth/invalid-login-credentials"].includes(error.code)) {
      throw errorCuenta(
        "cuenta/otra-clave",
        "Ese correo ya tiene una cuenta con otra contraseña. Si la cuenta quedó a medias, escribe la contraseña con la que se creó. También puedes usar otro correo."
      );
    }
    throw error;
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

  // Solo el super admin crea administradores y puede buscar en todos los usuarios
  if (tipoUsuario === "ADMIN") {
    const iguales = await getDocs(query(collection(db, "usuarios"), where("correo", "==", correoLimpio)));
    if (!iguales.empty) throw errorPorPerfil({ id: iguales.docs[0].id, ...iguales.docs[0].data() });
  }

  const secundaria = initializeApp(firebaseConfig, `provision-${Date.now()}-${Math.random()}`);
  const auth = getAuth(secundaria);
  auth.languageCode = "es";

  try {
    const { user, nueva } = await abrirCuenta(auth, correoLimpio, password);
    const referencia = doc(db, "usuarios", user.uid);

    if (!nueva) {
      // La cuenta existía: nunca se pisa un perfil. Si no se puede leer, las reglas lo protegen.
      const previo = await getDoc(referencia).catch(() => null);
      if (previo?.exists()) throw errorPorPerfil({ id: previo.id, ...previo.data() });
    }

    try {
      await setDoc(referencia, {
        empresaId,
        nombreCompleto: nombreCompleto.trim(),
        correo: correoLimpio,
        telefono: telefono.trim(),
        tipoUsuario,
        rolId: tipoUsuario === "TRABAJADOR" ? (rolId || null) : null,
        sucursales: tipoUsuario === "TRABAJADOR" ? sucursales : [],
        estado: true,
        correoVerificado: user.emailVerified,
        imagenPerfilUrl: "",
        ultimoAcceso: null,
        fechaRegistro: serverTimestamp(),
        fechaActualizacion: serverTimestamp()
      });
    } catch (error) {
      // Sin perfil la cuenta no sirve y el correo quedaría ocupado: se deshace
      if (nueva) await deleteUser(user).catch(() => {});
      if (!nueva && error.code === "permission-denied") {
        throw errorCuenta("cuenta/con-perfil", "Ese correo ya pertenece a otra cuenta del sistema. Usa otro correo.");
      }
      throw error;
    }

    // Si el correo no sale, al primer ingreso se envía otra vez
    let correoEnviado = true;
    if (!user.emailVerified) {
      await sendEmailVerification(user).catch(() => { correoEnviado = false; });
    }

    return { uid: user.uid, correoEnviado };
  } finally {
    await signOut(auth).catch(() => {});
    await deleteApp(secundaria).catch(() => {});
  }
}

// Devuelve el acceso a un administrador retirado y lo asigna a la empresa elegida
export async function reactivarAdministrador(uid, { empresaId, nombreCompleto, telefono = "" }) {
  await updateDoc(doc(db, "usuarios", uid), {
    empresaId,
    nombreCompleto: nombreCompleto.trim(),
    telefono: telefono.trim(),
    estado: true,
    eliminado: false,
    eliminadoPor: null,
    eliminadoMotivo: "",
    fechaActualizacion: serverTimestamp()
  });
}

export async function actualizarPerfilUsuario(uid, data) {
  await updateDoc(doc(db, "usuarios", uid), { ...data, fechaActualizacion: serverTimestamp() });
}
