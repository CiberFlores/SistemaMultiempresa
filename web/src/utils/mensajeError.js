// Convierte los errores de Firebase en mensajes que la persona entiende
const MENSAJES = {
  "auth/email-already-in-use": "Ese correo ya tiene una cuenta en el sistema.",
  "auth/invalid-email": "El correo no tiene un formato válido.",
  "auth/weak-password": "La contraseña es muy débil.",
  "auth/invalid-credential": "El correo o la contraseña no coinciden.",
  "auth/wrong-password": "La contraseña actual no es correcta.",
  "auth/user-disabled": "Esta cuenta está bloqueada.",
  "auth/too-many-requests": "Hubo demasiados intentos. Espera unos minutos y vuelve a probar.",
  "auth/network-request-failed": "No hay conexión a internet. Revísala y vuelve a intentar.",
  "auth/requires-recent-login": "Por seguridad, cierra sesión, entra otra vez y repite la operación.",
  "permission-denied": "No tienes permiso para hacer esto. Pide que revisen tu cargo.",
  unavailable: "No hay conexión con el servidor. Revisa tu internet y vuelve a intentar.",
  "resource-exhausted": "Se alcanzó el límite de uso de hoy. Vuelve a intentar más tarde.",
  "deadline-exceeded": "El servidor tardó demasiado. Vuelve a intentar.",
  aborted: "Otra persona cambió estos datos al mismo tiempo. Vuelve a intentar.",
  "not-found": "El registro ya no existe. Actualiza la página.",
  unauthenticated: "Tu sesión venció. Vuelve a entrar."
};

export default function mensajeError(error, respaldo = "No se pudo completar la operación.") {
  const codigo = String(error?.code || "").replace(/^firestore\//, "");
  if (MENSAJES[codigo]) return MENSAJES[codigo];
  if (error?.name === "FirebaseError") return respaldo;
  return error?.message || respaldo;
}
