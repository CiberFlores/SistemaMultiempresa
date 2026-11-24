// Guarda por qué se sacó a la persona, para explicárselo en la pantalla de bloqueo.
// motivo: "EMPRESA" | "CUENTA" · rol: "ADMIN" | "TRABAJADOR"
const CLAVE = "an-bloqueo";

export function recordarBloqueo({ motivo, rol, empresa = "" }) {
  try {
    sessionStorage.setItem(CLAVE, JSON.stringify({ motivo, rol, empresa }));
  } catch {
    /* sin almacenamiento: la pantalla de bloqueo sale sin detalles */
  }
}

export function leerBloqueo() {
  try {
    return { motivo: "EMPRESA", rol: "ADMIN", empresa: "", ...JSON.parse(sessionStorage.getItem(CLAVE) || "{}") };
  } catch {
    return { motivo: "EMPRESA", rol: "ADMIN", empresa: "" };
  }
}

export function hayBloqueo() {
  try {
    return Boolean(sessionStorage.getItem(CLAVE));
  } catch {
    return false;
  }
}

export function borrarBloqueo() {
  try {
    sessionStorage.removeItem(CLAVE);
  } catch {
    /* sin almacenamiento */
  }
}
