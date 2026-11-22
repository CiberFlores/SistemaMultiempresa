import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where
} from "firebase/firestore";

import { db } from "./firebase/firebaseConfig";

// Avisos del dueño para su equipo (colección "notificaciones").
//   audiencia: "TODOS" (todo el equipo) | "ROL" (un cargo, con rolId) | "PERSONA" (un trabajador, con destinatarioId)
//   prioridad: "NORMAL" | "ALTA" | "URGENTE"
//   estado:    "ACTIVO" | "INACTIVO"      vence: "YYYY-MM-DD" opcional

export const PRIORIDADES = { NORMAL: "Normal", ALTA: "Importante", URGENTE: "Urgente" };

const referencia = collection(db, "notificaciones");

export function milisegundos(valor) {
  if (valor?.toMillis) return valor.toMillis();
  const fecha = new Date(valor).getTime();
  return Number.isNaN(fecha) ? 0 : fecha;
}

export function hoyLocal() {
  const h = new Date();
  return [h.getFullYear(), String(h.getMonth() + 1).padStart(2, "0"), String(h.getDate()).padStart(2, "0")].join("-");
}

export const estaVencido = (aviso) => Boolean(aviso.vence) && aviso.vence < hoyLocal();

function validar(datos) {
  const titulo = String(datos.titulo || "").trim();
  const mensaje = String(datos.mensaje || "").trim();

  if (titulo.length < 3) throw new Error("Escribe un título de al menos 3 letras.");
  if (mensaje.length < 5) throw new Error("Escribe el mensaje (mínimo 5 letras).");
  if (!["TODOS", "ROL", "PERSONA"].includes(datos.audiencia)) throw new Error("Elige a quién va dirigido.");
  if (datos.audiencia === "ROL" && !datos.rolId) throw new Error("Elige el cargo que recibirá el aviso.");
  if (datos.audiencia === "PERSONA" && !datos.destinatarioId) throw new Error("Elige a la persona que recibirá el aviso.");
  if (!PRIORIDADES[datos.prioridad]) throw new Error("Elige la importancia del aviso.");
  if (datos.vence && datos.vence < hoyLocal()) throw new Error("La fecha final ya pasó.");

  return {
    titulo,
    mensaje,
    audiencia: datos.audiencia,
    rolId: datos.audiencia === "ROL" ? datos.rolId : null,
    destinatarioId: datos.audiencia === "PERSONA" ? datos.destinatarioId : null,
    destinatarioNombre: datos.audiencia === "PERSONA" ? datos.destinatarioNombre || "" : "",
    rolNombre: datos.audiencia === "ROL" ? datos.rolNombre || "" : "",
    prioridad: datos.prioridad,
    vence: datos.vence || "",
    estado: datos.activo === false ? "INACTIVO" : "ACTIVO"
  };
}

export async function crearAviso(empresaId, usuarioId, datos) {
  const limpio = validar(datos);

  return addDoc(referencia, {
    ...limpio,
    empresaId,
    creadoPor: usuarioId,
    fechaRegistro: serverTimestamp(),
    fechaActualizacion: serverTimestamp()
  });
}

export async function actualizarAviso(id, datos) {
  const limpio = validar(datos);
  return updateDoc(doc(db, "notificaciones", id), { ...limpio, fechaActualizacion: serverTimestamp() });
}

export async function cambiarEstadoAviso(id, activo) {
  return updateDoc(doc(db, "notificaciones", id), {
    estado: activo ? "ACTIVO" : "INACTIVO",
    fechaActualizacion: serverTimestamp()
  });
}

export async function eliminarAviso(id) {
  return deleteDoc(doc(db, "notificaciones", id));
}

// Todos los avisos de la empresa (para el dueño), del más nuevo al más antiguo
export function suscribirAvisosEmpresa(empresaId, callback, errorCallback) {
  return onSnapshot(
    query(referencia, where("empresaId", "==", empresaId)),
    (snapshot) => {
      const filas = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      filas.sort((a, b) => milisegundos(b.fechaRegistro) - milisegundos(a.fechaRegistro));
      callback(filas);
    },
    errorCallback
  );
}

// Los avisos que le tocan a una persona: los de todo el equipo, los de su cargo y los suyos.
// Son tres consultas porque cada una debe cumplir las reglas de seguridad; se unen en una lista.
export function suscribirAvisosPara(usuario, callback, errorCallback) {
  const base = [where("empresaId", "==", usuario.empresaId), where("estado", "==", "ACTIVO")];

  const consultas = [query(referencia, ...base, where("audiencia", "==", "TODOS"))];

  if (usuario.rolId) {
    consultas.push(query(referencia, ...base, where("audiencia", "==", "ROL"), where("rolId", "==", usuario.rolId)));
  }

  consultas.push(query(referencia, ...base, where("audiencia", "==", "PERSONA"), where("destinatarioId", "==", usuario.uid)));

  const resultados = new Array(consultas.length).fill(null);

  const emitir = () => {
    const unidos = resultados
      .filter(Boolean)
      .flat()
      .filter((aviso) => !estaVencido(aviso))
      .sort((a, b) => milisegundos(b.fechaRegistro) - milisegundos(a.fechaRegistro));

    callback(unidos);
  };

  const cancelar = consultas.map((consulta, indice) =>
    onSnapshot(
      consulta,
      (snapshot) => {
        resultados[indice] = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        emitir();
      },
      (error) => {
        resultados[indice] = [];
        emitir();
        errorCallback?.(error);
      }
    )
  );

  return () => cancelar.forEach((c) => c());
}
