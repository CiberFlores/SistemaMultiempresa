import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where
} from "firebase/firestore";

import { db } from "./firebase/firebaseConfig";

// ==========================================
// CONSULTAR CUENTAS POR COBRAR Y PAGAR
// ==========================================

export function suscribirCuentas(
  tipo,
  empresaId,
  callback,
  errorCallback
) {
  const collectionName =
    tipo === "COBRAR" ? "cuentasCobrar" : "cuentasPagar";

  const consulta = query(
    collection(db, collectionName),
    where("empresaId", "==", empresaId)
  );

  return onSnapshot(
    consulta,
    (snapshot) => {
      const cuentas = snapshot.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      }));

      cuentas.sort((a, b) => {
        const fechaA = a.fechaRegistro?.toMillis?.() || 0;
        const fechaB = b.fechaRegistro?.toMillis?.() || 0;

        return fechaB - fechaA;
      });

      callback(cuentas);
    },
    errorCallback
  );
}

// ==========================================
// REGISTRAR PAGOS DE CUENTAS
// ==========================================

export async function registrarPagoCuenta({
  tipo,
  cuentaId,
  empresaId,
  monto,
  metodoPago = "EFECTIVO",
  observacion = "",
  usuarioId,
  cajaId = ""
}) {
  if (tipo !== "COBRAR" && tipo !== "PAGAR") {
    throw new Error("El tipo de cuenta no es válido.");
  }

  if (!cuentaId || !empresaId) {
    throw new Error("Faltan datos de la cuenta.");
  }

  const amountOriginal = Number(monto);

  if (
    !Number.isFinite(amountOriginal) ||
    amountOriginal <= 0
  ) {
    throw new Error("El monto debe ser mayor que cero.");
  }

  const amount = Number(amountOriginal.toFixed(2));

  if (Math.abs(amountOriginal - amount) > 0.000001) {
    throw new Error("El monto admite como máximo dos decimales.");
  }

  const metodo = String(
    metodoPago || "EFECTIVO"
  ).trim().toUpperCase();

  const cajaSeleccionada = String(cajaId || "").trim();

  // LOS PAGOS QUE NO SON EN EFECTIVO
  // NO SE REGISTRAN COMO MOVIMIENTOS DE CAJA.

  if (cajaSeleccionada && metodo !== "EFECTIVO") {
    throw new Error(
      "Solo los pagos en efectivo pueden asociarse a una caja."
    );
  }

  const collectionName =
    tipo === "COBRAR" ? "cuentasCobrar" : "cuentasPagar";

  const paymentsName =
    tipo === "COBRAR" ? "pagosCredito" : "pagosProveedor";

  const cuentaRef = doc(
    db,
    collectionName,
    cuentaId
  );

  const pagoRef = doc(
    collection(db, paymentsName)
  );

  const cajaRef = cajaSeleccionada
    ? doc(db, "cajas", cajaSeleccionada)
    : null;

  const movimientoRef = cajaRef
    ? doc(db, "movimientosCaja", pagoRef.id)
    : null;

  // ========================================
  // TRANSACCION DE FIREBASE
  // ========================================

  await runTransaction(db, async (tx) => {

    // CONSULTAR CUENTA

    const cuentaSnapshot = await tx.get(cuentaRef);

    if (!cuentaSnapshot.exists()) {
      throw new Error("La cuenta no existe.");
    }

    const cuenta = cuentaSnapshot.data();

    if (cuenta.empresaId !== empresaId) {
      throw new Error(
        "La cuenta no pertenece a esta empresa."
      );
    }

    const saldo = Number(
      cuenta.saldo ?? cuenta.total ?? 0
    );

    if (amount > saldo) {
      throw new Error(
        `El pago supera el saldo pendiente (Bs ${saldo.toFixed(2)}).`
      );
    }

    // ======================================
    // VERIFICAR CAJA SELECCIONADA
    // ======================================

    let caja = null;

    if (cajaRef) {
      const cajaSnapshot = await tx.get(cajaRef);

      if (!cajaSnapshot.exists()) {
        throw new Error("La caja seleccionada no existe.");
      }

      caja = cajaSnapshot.data();

      if (caja.empresaId !== empresaId) {
        throw new Error(
          "La caja pertenece a otra empresa."
        );
      }

      if (caja.estado !== "ABIERTA") {
        throw new Error(
          "La caja seleccionada está cerrada."
        );
      }

      if (!caja.sucursalId) {
        throw new Error(
          "La caja no tiene una sucursal válida."
        );
      }

      if (
        cuenta.sucursalId &&
        cuenta.sucursalId !== caja.sucursalId
      ) {
        throw new Error(
          "La caja no corresponde a la sucursal de la cuenta."
        );
      }
    }

    // ======================================
    // CALCULAR NUEVO SALDO
    // ======================================

    const nuevoSaldo = Number(
      (saldo - amount).toFixed(2)
    );

    const nuevoEstado =
      nuevoSaldo === 0 ? "PAGADA" : "PARCIAL";

    // ======================================
    // ACTUALIZAR CUENTA
    // ======================================

    tx.update(cuentaRef, {
      saldo: nuevoSaldo,
      estadoCuenta: nuevoEstado,
      fechaActualizacion: serverTimestamp()
    });

    // ======================================
    // REGISTRAR PAGO
    // ======================================

    tx.set(pagoRef, {
      empresaId,
      cuentaId,
      tipo,
      monto: amount,
      metodoPago: metodo,
      observacion: String(observacion || "").trim(),
      usuarioId: usuarioId || null,
      cajaId: cajaSeleccionada || null,
      sucursalId: caja?.sucursalId || cuenta.sucursalId || null,
      fechaRegistro: serverTimestamp()
    });

    // ======================================
    // REGISTRAR MOVIMIENTO DE CAJA
    // ======================================

    if (movimientoRef && caja) {
      const esCobro = tipo === "COBRAR";

      tx.set(movimientoRef, {
        empresaId,
        sucursalId: caja.sucursalId,
        cajaId: cajaSeleccionada,

        tipo: esCobro ? "INGRESO" : "EGRESO",

        categoria: esCobro
          ? "COBRO_CREDITO"
          : "PAGO_PROVEEDOR",

        descripcion: esCobro
          ? `Cobro de cuenta ${cuentaId}`
          : `Pago de cuenta ${cuentaId}`,

        monto: amount,
        metodoPago: metodo,

        cuentaId,
        pagoId: pagoRef.id,

        usuarioId: usuarioId || null,

        fechaRegistro: serverTimestamp()
      });
    }

  });

  return pagoRef.id;
}