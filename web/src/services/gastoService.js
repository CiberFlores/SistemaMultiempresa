import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";

import { db } from "./firebase/firebaseConfig";

import { registrarAuditoria } from "./auditService";

const CATEGORIAS = ["OPERATIVO", "SERVICIOS", "PERSONAL", "TRANSPORTE", "IMPUESTOS", "OTRO"];
const METODOS = ["EFECTIVO", "QR", "TRANSFERENCIA", "TARJETA"];

const redondear = (valor) => Math.round((Number(valor) + Number.EPSILON) * 100) / 100;

function hoyLocal() {
  const hoy = new Date();
  return [
    hoy.getFullYear(),
    String(hoy.getMonth() + 1).padStart(2, "0"),
    String(hoy.getDate()).padStart(2, "0")
  ].join("-");
}

// Un gasto pagado en efectivo sale de la caja: queda anotado como egreso.
export async function registrarGasto({
  empresaId,
  usuarioId,
  concepto,
  categoria,
  monto,
  metodoPago,
  fecha,
  observacion = "",
  sucursalId = "",
  cajaId = ""
}) {
  const texto = String(concepto || "").trim();
  const importe = redondear(monto);

  if (!empresaId || !usuarioId) throw new Error("No se pudo identificar al usuario o la empresa.");
  if (texto.length < 3) throw new Error("Escribe en qué se gastó (mínimo 3 letras).");
  if (!CATEGORIAS.includes(categoria)) throw new Error("Elige una categoría válida.");
  if (!METODOS.includes(metodoPago)) throw new Error("Elige cómo se pagó.");
  if (!Number.isFinite(importe) || importe <= 0) throw new Error("El monto debe ser mayor que cero.");
  if (importe > 10000000) throw new Error("Ese monto es demasiado grande. Revísalo.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || "")) throw new Error("Elige la fecha del gasto.");
  if (fecha > hoyLocal()) throw new Error("La fecha no puede ser futura.");

  const esEfectivo = metodoPago === "EFECTIVO";

  if (esEfectivo && !cajaId) throw new Error("Elige la caja de donde salió el dinero.");

  const gastoRef = doc(collection(db, "gastos"));
  const cajaRef = esEfectivo ? doc(db, "cajas", cajaId) : null;
  const movimientoRef = esEfectivo ? doc(collection(db, "movimientosCaja")) : null;

  await runTransaction(db, async (tx) => {
    let sucursalDeCaja = sucursalId || null;

    if (cajaRef) {
      const cajaSnap = await tx.get(cajaRef);

      if (!cajaSnap.exists() || cajaSnap.data().empresaId !== empresaId) {
        throw new Error("La caja elegida no existe.");
      }
      if (cajaSnap.data().estado !== "ABIERTA") {
        throw new Error("Esa caja ya está cerrada. Elige una caja abierta.");
      }

      sucursalDeCaja = cajaSnap.data().sucursalId;
    }

    tx.set(gastoRef, {
      empresaId,
      concepto: texto,
      categoria,
      monto: importe,
      metodoPago,
      fecha,
      observacion: String(observacion || "").trim(),
      sucursalId: sucursalDeCaja,
      cajaId: esEfectivo ? cajaId : null,
      movimientoCajaId: movimientoRef ? movimientoRef.id : null,
      estado: "ACTIVO",
      usuarioId,
      fechaRegistro: serverTimestamp(),
      fechaActualizacion: serverTimestamp()
    });

    if (movimientoRef) {
      tx.set(movimientoRef, {
        empresaId,
        sucursalId: sucursalDeCaja,
        cajaId,
        tipo: "EGRESO",
        categoria: "GASTO",
        descripcion: `Gasto: ${texto}`,
        monto: importe,
        metodoPago,
        referenciaTipo: "GASTO",
        referenciaId: gastoRef.id,
        usuarioId,
        fechaRegistro: serverTimestamp()
      });
    }
  });

  registrarAuditoria({
    empresaId,
    usuarioId,
    accion: "REGISTRAR_GASTO",
    modulo: "finanzas",
    entidad: "gasto",
    entidadId: gastoRef.id,
    detalle: `Gasto "${texto}" por ${importe.toFixed(2)}`
  }).catch(() => {});

  return gastoRef.id;
}

// Solo se corrige lo que no mueve dinero
export async function corregirGasto(gastoId, { concepto, categoria, observacion }) {
  const texto = String(concepto || "").trim();

  if (texto.length < 3) throw new Error("Escribe en qué se gastó (mínimo 3 letras).");
  if (!CATEGORIAS.includes(categoria)) throw new Error("Elige una categoría válida.");

  await updateDoc(doc(db, "gastos", gastoId), {
    concepto: texto,
    categoria,
    observacion: String(observacion || "").trim(),
    fechaActualizacion: serverTimestamp()
  });
}

// Anular un gasto en efectivo devuelve el dinero a la misma caja (si sigue abierta)
export async function anularGasto({ gasto, empresaId, usuarioId }) {
  const gastoRef = doc(db, "gastos", gasto.id);
  const movimientoRef = gasto.cajaId ? doc(collection(db, "movimientosCaja")) : null;

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(gastoRef);

    if (!snap.exists() || snap.data().empresaId !== empresaId) throw new Error("El gasto no existe.");
    if (snap.data().estado === "ANULADO") throw new Error("Este gasto ya estaba anulado.");

    if (movimientoRef) {
      const cajaSnap = await tx.get(doc(db, "cajas", gasto.cajaId));

      if (!cajaSnap.exists() || cajaSnap.data().estado !== "ABIERTA") {
        throw new Error("La caja de este gasto ya se cerró, así que no se puede devolver el dinero. Regístralo como un ingreso aparte.");
      }

      tx.set(movimientoRef, {
        empresaId,
        sucursalId: cajaSnap.data().sucursalId,
        cajaId: gasto.cajaId,
        tipo: "INGRESO",
        categoria: "ANULACION_GASTO",
        descripcion: `Gasto anulado: ${gasto.concepto}`,
        monto: redondear(gasto.monto),
        metodoPago: "EFECTIVO",
        referenciaTipo: "GASTO",
        referenciaId: gasto.id,
        usuarioId,
        fechaRegistro: serverTimestamp()
      });
    }

    tx.update(gastoRef, {
      estado: "ANULADO",
      fechaAnulacion: serverTimestamp(),
      fechaActualizacion: serverTimestamp()
    });
  });

  registrarAuditoria({
    empresaId,
    usuarioId,
    accion: "ANULAR_GASTO",
    modulo: "finanzas",
    entidad: "gasto",
    entidadId: gasto.id,
    detalle: `Anuló el gasto "${gasto.concepto}" de ${Number(gasto.monto || 0).toFixed(2)}`
  }).catch(() => {});
}
