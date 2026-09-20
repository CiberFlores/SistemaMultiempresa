import {
  browserLocalPersistence,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";

import {
  doc,
  getDoc
} from "firebase/firestore";

import {
  auth,
  db
} from "./firebaseConfig";

// ======================================================
// ROLES PERMITIDOS EN EL SISTEMA
// ======================================================

const ROLES_PERMITIDOS = [
  "SUPER_ADMIN",
  "ADMIN",
  "TRABAJADOR"
];

// ======================================================
// INICIAR SESIÓN
// ======================================================

export async function iniciarSesion(
  correo,
  contraseña
) {
  const correoLimpio =
    correo?.trim();

  if (!correoLimpio) {
    throw new Error(
      "Debes ingresar tu correo electrónico."
    );
  }

  if (!contraseña) {
    throw new Error(
      "Debes ingresar tu contraseña."
    );
  }

  // Mantener la sesión aunque se recargue
  // o cierre la pestaña.
  await setPersistence(
    auth,
    browserLocalPersistence
  );

  // Firebase Authentication
  const credencial =
    await signInWithEmailAndPassword(
      auth,
      correoLimpio,
      contraseña
    );

  const usuarioFirebase =
    credencial.user;

  const uid =
    usuarioFirebase.uid;

  // Buscar perfil del usuario en Firestore
  const referenciaUsuario = doc(
    db,
    "usuarios",
    uid
  );

  const documentoUsuario =
    await getDoc(
      referenciaUsuario
    );

  // Authentication existe,
  // pero no tiene perfil Firestore.
  if (!documentoUsuario.exists()) {
    await signOut(auth);

    throw new Error(
      "El usuario no tiene un perfil registrado en Firestore."
    );
  }

  const datosUsuario =
    documentoUsuario.data();

  // Verificar estado de la cuenta
  if (datosUsuario.estado !== true) {
    await signOut(auth);

    throw new Error(
      "La cuenta se encuentra deshabilitada."
    );
  }

  // Verificar que el usuario tenga rol
  if (!datosUsuario.tipoUsuario) {
    await signOut(auth);

    throw new Error(
      "El usuario no tiene un rol asignado."
    );
  }

  // Verificar rol permitido
  if (
    !ROLES_PERMITIDOS.includes(
      datosUsuario.tipoUsuario
    )
  ) {
    await signOut(auth);

    throw new Error(
      "El usuario tiene un rol no reconocido por el sistema."
    );
  }

  // ADMIN y TRABAJADOR deben pertenecer
  // obligatoriamente a una empresa.
  if (
    (
      datosUsuario.tipoUsuario === "ADMIN" ||
      datosUsuario.tipoUsuario === "TRABAJADOR"
    ) &&
    !datosUsuario.empresaId
  ) {
    await signOut(auth);

    throw new Error(
      "El usuario no tiene una empresa asignada."
    );
  }

  // SUPER ADMIN no necesita empresaId.
  return {
    uid,

    email:
      usuarioFirebase.email,

    correo:
      datosUsuario.correo ||
      usuarioFirebase.email,

    ...datosUsuario
  };
}

// ======================================================
// RECUPERAR CONTRASEÑA
// ======================================================

export async function recuperarContrasena(
  correo
) {
  const correoLimpio =
    correo?.trim();

  if (!correoLimpio) {
    throw new Error(
      "Debes ingresar tu correo electrónico."
    );
  }

  await sendPasswordResetEmail(
    auth,
    correoLimpio
  );

  return true;
}

// ======================================================
// CERRAR SESIÓN
// ======================================================

export async function cerrarSesion() {
  await signOut(auth);

  return true;
}