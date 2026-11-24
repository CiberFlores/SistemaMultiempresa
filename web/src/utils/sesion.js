// La sesión vive solo en la pestaña donde se inició: pegar la dirección en otra
// pestaña o abrir el navegador otra vez pide entrar de nuevo.

export const CLAVE_ULTIMA_ACTIVIDAD = "an-ultima-actividad";
const CLAVE_MOTIVO = "an-motivo-salida";
const CLAVE_LIMPIEZA = "an-sesion-por-pestana";

export const MINUTOS_SIN_USO = { SUPER_ADMIN: 20, ADMIN: 30, TRABAJADOR: 120 };

export function marcarActividad() {
  sessionStorage.setItem(CLAVE_ULTIMA_ACTIVIDAD, String(Date.now()));
}

export function olvidarActividad() {
  sessionStorage.removeItem(CLAVE_ULTIMA_ACTIVIDAD);
}

export function sesionVencida(tipo) {
  const ultima = Number(sessionStorage.getItem(CLAVE_ULTIMA_ACTIVIDAD));
  const minutos = MINUTOS_SIN_USO[tipo];
  return Boolean(ultima && minutos && Date.now() - ultima > minutos * 60000);
}

export function guardarMotivoSalida(texto) {
  sessionStorage.setItem(CLAVE_MOTIVO, texto);
}

export function leerMotivoSalida() {
  return sessionStorage.getItem(CLAVE_MOTIVO) || "";
}

export function borrarMotivoSalida() {
  sessionStorage.removeItem(CLAVE_MOTIVO);
}

// Borra una sola vez las sesiones que antes quedaban guardadas en el equipo
export function limpiarSesionesAntiguas() {
  try {
    if (localStorage.getItem(CLAVE_LIMPIEZA)) return;
    Object.keys(localStorage)
      .filter((clave) => clave.startsWith("firebase:authUser:"))
      .forEach((clave) => localStorage.removeItem(clave));
    indexedDB.deleteDatabase("firebaseLocalStorageDb");
    localStorage.setItem(CLAVE_LIMPIEZA, "1");
  } catch {
    /* sin almacenamiento no hay nada que limpiar */
  }
}
