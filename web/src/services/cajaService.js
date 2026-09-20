import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where
} from "firebase/firestore";

import { db } from "./firebase/firebaseConfig";

const cajasRef = collection(db, "cajas");

export function suscribirCajas(empresaId, callback, errorCallback) {
  const consulta = query(
    cajasRef,
    where("empresaId", "==", empresaId)
  );

  return onSnapshot(
    consulta,
    (snapshot) => {
      const cajas = snapshot.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      }));

      cajas.sort((a, b) => {
        const fechaA = a.fechaApertura?.toMillis?.() || 0;
        const fechaB = b.fechaApertura?.toMillis?.() || 0;
        return fechaB - fechaA;
      });

      callback(cajas);
    },
    errorCallback
  );
}

export async function obtenerCajasAbiertas(empresaId) {
  const snapshot = await getDocs(
    query(
      cajasRef,
      where("empresaId", "==", empresaId)
    )
  );

  return snapshot.docs
    .map((documento) => ({
      id: documento.id,
      ...documento.data()
    }))
    .filter((caja) => caja.estado === "ABIERTA");
}

export async function abrirCaja({
  empresaId,
  sucursalId,
  nombre,
  saldoInicial,
  usuarioId
}) {
  const cajas = await obtenerCajasAbiertas(empresaId);

  const existeAbierta = cajas.some(
    (caja) => caja.sucursalId === sucursalId
  );

  if (existeAbierta) {
    throw new Error("Ya existe una caja abierta en esta sucursal.");
  }

  return addDoc(cajasRef, {
    empresaId,
    sucursalId,
    nombre: nombre?.trim() || "Caja principal",
    saldoInicial: Number(saldoInicial) || 0,
    saldoFinal: null,
    totalIngresos: 0,
    totalEgresos: 0,
    usuarioAperturaId: usuarioId,
    usuarioCierreId: null,
    estado: "ABIERTA",
    fechaApertura: serverTimestamp(),
    fechaCierre: null,
    fechaActualizacion: serverTimestamp()
  });
}

export async function cerrarCaja(caja, usuarioId) {
  if (caja.estado !== "ABIERTA") {
    throw new Error("La caja ya se encuentra cerrada.");
  }

  const movimientosSnapshot = await getDocs(
    query(
      collection(db, "movimientosCaja"),
      where("empresaId", "==", caja.empresaId),
      where("cajaId", "==", caja.id)
    )
  );

  const movimientos = movimientosSnapshot.docs.map((documento) =>
    documento.data()
  );

  const totalIngresos = movimientos
    .filter((m) => m.tipo === "INGRESO")
    .reduce((total, m) => total + Number(m.monto || 0), 0);

  const totalEgresos = movimientos
    .filter((m) => m.tipo === "EGRESO")
    .reduce((total, m) => total + Number(m.monto || 0), 0);

  const saldoFinal =
    Number(caja.saldoInicial || 0) +
    totalIngresos -
    totalEgresos;

  await updateDoc(
    doc(db, "cajas", caja.id),
    {
      totalIngresos,
      totalEgresos,
      saldoFinal,
      usuarioCierreId: usuarioId,
      estado: "CERRADA",
      fechaCierre: serverTimestamp(),
      fechaActualizacion: serverTimestamp()
    }
  );
}
