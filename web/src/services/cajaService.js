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

// Ingresos, egresos y dinero que debería haber en una caja
export function resumirCaja(caja, movimientos = []) {
  let ingresos = 0;
  let egresos = 0;

  movimientos.forEach((m) => {
    const monto = Number(m.monto) || 0;
    if (m.tipo === "INGRESO") ingresos += monto;
    if (m.tipo === "EGRESO") egresos += monto;
  });

  ingresos = Math.round(ingresos * 100) / 100;
  egresos = Math.round(egresos * 100) / 100;

  return {
    ingresos,
    egresos,
    saldo: Math.round((Number(caja?.saldoInicial || 0) + ingresos - egresos) * 100) / 100
  };
}

// Dinero que hay ahora mismo en una caja (lee sus movimientos)
export async function obtenerSaldoCaja(caja) {
  const snapshot = await getDocs(
    query(
      collection(db, "movimientosCaja"),
      where("empresaId", "==", caja.empresaId),
      where("cajaId", "==", caja.id)
    )
  );

  return resumirCaja(
    caja,
    snapshot.docs.map((d) => d.data())
  ).saldo;
}

export async function cerrarCaja(caja, usuarioId, { saldoContado } = {}) {
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

  const resumen = resumirCaja(
    caja,
    movimientosSnapshot.docs.map((documento) => documento.data())
  );

  const contado =
    saldoContado === undefined || saldoContado === null || saldoContado === ""
      ? null
      : Math.round(Number(saldoContado) * 100) / 100;

  if (contado !== null && (!Number.isFinite(contado) || contado < 0)) {
    throw new Error("El dinero contado debe ser un número desde cero.");
  }

  await updateDoc(
    doc(db, "cajas", caja.id),
    {
      totalIngresos: resumen.ingresos,
      totalEgresos: resumen.egresos,
      saldoFinal: resumen.saldo,
      saldoContado: contado,
      diferencia: contado === null ? null : Math.round((contado - resumen.saldo) * 100) / 100,
      usuarioCierreId: usuarioId,
      estado: "CERRADA",
      fechaCierre: serverTimestamp(),
      fechaActualizacion: serverTimestamp()
    }
  );
}
