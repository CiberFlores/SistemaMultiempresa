import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where
} from "firebase/firestore";

import { db } from "./firebase/firebaseConfig";
import { obtenerCajasAbiertas } from "./cajaService";

export async function obtenerCatalogosCompra(empresaId) {
  const [
    proveedoresSnapshot,
    productosSnapshot,
    sucursalesSnapshot,
    cajas
  ] = await Promise.all([
    getDocs(
      query(
        collection(db, "proveedores"),
        where("empresaId", "==", empresaId)
      )
    ),
    getDocs(
      query(
        collection(db, "productos"),
        where("empresaId", "==", empresaId)
      )
    ),
    getDocs(
      query(
        collection(db, "sucursales"),
        where("empresaId", "==", empresaId)
      )
    ),
    obtenerCajasAbiertas(empresaId)
  ]);

  return {
    proveedores: proveedoresSnapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((p) => p.estado === "ACTIVO"),

    productos: productosSnapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((p) => p.estado === "ACTIVO"),

    sucursales: sucursalesSnapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((s) => s.estado === "ACTIVA"),

    cajas
  };
}

export async function listarCompras(empresaId) {
  const snapshot = await getDocs(
    query(
      collection(db, "compras"),
      where("empresaId", "==", empresaId)
    )
  );

  const compras = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data()
  }));

  compras.sort((a, b) => {
    const fechaA = a.fechaRegistro?.toMillis?.() || 0;
    const fechaB = b.fechaRegistro?.toMillis?.() || 0;
    return fechaB - fechaA;
  });

  return compras;
}

export async function registrarCompra({
  empresaId,
  sucursalId,
  proveedorId,
  numeroDocumento,
  metodoPago,
  cajaId,
  observaciones,
  items,
  usuarioId
}) {
  if (!empresaId || !sucursalId || !proveedorId) {
    throw new Error("Empresa, sucursal y proveedor son obligatorios.");
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Agrega al menos un producto.");
  }

  const lineas = items.map((item) => {
    const cantidad = Number(item.cantidad);
    const costoUnitario = Number(item.costoUnitario);

    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      throw new Error("Todas las cantidades deben ser mayores que cero.");
    }

    if (!Number.isFinite(costoUnitario) || costoUnitario < 0) {
      throw new Error("Todos los costos deben ser válidos.");
    }

    return {
      ...item,
      cantidad,
      costoUnitario,
      subtotal: cantidad * costoUnitario
    };
  });

  const total = lineas.reduce(
    (suma, item) => suma + item.subtotal,
    0
  );

  if (metodoPago === "EFECTIVO" && !cajaId) {
    throw new Error(
      "Selecciona una caja abierta para una compra en efectivo."
    );
  }

  const compraRef = doc(collection(db, "compras"));

  const detalleRefs = lineas.map(() =>
    doc(collection(db, "detalleCompras"))
  );

  const stockRefs = lineas.map((item) =>
    doc(
      db,
      "inventarios",
      `${sucursalId}_${item.productoId}`
    )
  );

  const movimientoStockRefs = lineas.map(() =>
    doc(collection(db, "movimientosStock"))
  );

  const cajaRef =
    metodoPago === "EFECTIVO"
      ? doc(db, "cajas", cajaId)
      : null;

  const movimientoCajaRef =
    metodoPago === "EFECTIVO"
      ? doc(collection(db, "movimientosCaja"))
      : null;

  await runTransaction(db, async (transaccion) => {
    const stockSnapshots = [];

    // Firestore exige leer antes de escribir dentro de la transacción.
    for (const referencia of stockRefs) {
      stockSnapshots.push(
        await transaccion.get(referencia)
      );
    }

    let cajaSnapshot = null;

    if (cajaRef) {
      cajaSnapshot = await transaccion.get(cajaRef);

      if (!cajaSnapshot.exists()) {
        throw new Error("La caja seleccionada no existe.");
      }

      const caja = cajaSnapshot.data();

      if (
        caja.estado !== "ABIERTA" ||
        caja.empresaId !== empresaId ||
        caja.sucursalId !== sucursalId
      ) {
        throw new Error(
          "La caja no está abierta o no pertenece a la sucursal seleccionada."
        );
      }
    }

    transaccion.set(compraRef, {
      empresaId,
      sucursalId,
      proveedorId,
      numeroDocumento: numeroDocumento?.trim() || "",
      metodoPago,
      cajaId: cajaId || null,
      total,
      estado: "REGISTRADA",
      observaciones: observaciones?.trim() || "",
      usuarioId,
      fechaRegistro: serverTimestamp()
    });

    lineas.forEach((item, indice) => {
      const stockSnapshot = stockSnapshots[indice];
      const stockAnterior = stockSnapshot.exists()
        ? Number(stockSnapshot.data().stock || 0)
        : 0;

      const stockNuevo = stockAnterior + item.cantidad;

      transaccion.set(detalleRefs[indice], {
        empresaId,
        compraId: compraRef.id,
        productoId: item.productoId,
        nombreProducto: item.nombreProducto,
        cantidad: item.cantidad,
        costoUnitario: item.costoUnitario,
        subtotal: item.subtotal
      });

      transaccion.set(
        stockRefs[indice],
        {
          empresaId,
          sucursalId,
          productoId: item.productoId,
          stock: stockNuevo,
          fechaActualizacion: serverTimestamp()
        },
        { merge: true }
      );

      transaccion.set(movimientoStockRefs[indice], {
        empresaId,
        sucursalId,
        productoId: item.productoId,
        tipo: "COMPRA",
        cantidad: item.cantidad,
        stockAnterior,
        stockNuevo,
        motivo: `Compra ${numeroDocumento || compraRef.id}`,
        referenciaTipo: "COMPRA",
        referenciaId: compraRef.id,
        usuarioId,
        fechaRegistro: serverTimestamp()
      });
    });

    if (movimientoCajaRef) {
      transaccion.set(movimientoCajaRef, {
        empresaId,
        cajaId,
        sucursalId,
        tipo: "EGRESO",
        categoria: "COMPRA",
        monto: total,
        descripcion: `Compra ${numeroDocumento || compraRef.id}`,
        referenciaTipo: "COMPRA",
        referenciaId: compraRef.id,
        usuarioId,
        fechaRegistro: serverTimestamp()
      });
    }
  });

  return compraRef.id;
}
