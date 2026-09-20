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

export async function obtenerCatalogosVenta(empresaId) {
  const [
    clientesSnapshot,
    productosSnapshot,
    sucursalesSnapshot,
    inventariosSnapshot,
    cajas
  ] = await Promise.all([
    getDocs(
      query(
        collection(db, "clientes"),
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
    getDocs(
      query(
        collection(db, "inventarios"),
        where("empresaId", "==", empresaId)
      )
    ),
    obtenerCajasAbiertas(empresaId)
  ]);

  return {
    clientes: clientesSnapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((c) => c.estado === "ACTIVO"),

    productos: productosSnapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((p) => p.estado === "ACTIVO"),

    sucursales: sucursalesSnapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((s) => s.estado === "ACTIVA"),

    inventarios: inventariosSnapshot.docs.map((d) => ({
      id: d.id,
      ...d.data()
    })),

    cajas
  };
}

export async function listarVentas(empresaId) {
  const snapshot = await getDocs(
    query(
      collection(db, "ventas"),
      where("empresaId", "==", empresaId)
    )
  );

  const ventas = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data()
  }));

  ventas.sort((a, b) => {
    const fechaA = a.fechaRegistro?.toMillis?.() || 0;
    const fechaB = b.fechaRegistro?.toMillis?.() || 0;
    return fechaB - fechaA;
  });

  return ventas;
}

export async function registrarVenta({
  empresaId,
  sucursalId,
  clienteId,
  metodoPago,
  cajaId,
  descuento,
  observaciones,
  items,
  usuarioId
}) {
  if (!empresaId || !sucursalId) {
    throw new Error("Empresa y sucursal son obligatorias.");
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("El carrito está vacío.");
  }

  const lineas = items.map((item) => {
    const cantidad = Number(item.cantidad);
    const precioUnitario = Number(item.precioUnitario);

    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      throw new Error("Todas las cantidades deben ser mayores que cero.");
    }

    if (!Number.isFinite(precioUnitario) || precioUnitario < 0) {
      throw new Error("Todos los precios deben ser válidos.");
    }

    return {
      ...item,
      cantidad,
      precioUnitario,
      subtotal: cantidad * precioUnitario
    };
  });

  const subtotal = lineas.reduce(
    (suma, item) => suma + item.subtotal,
    0
  );

  const descuentoNumero = Math.max(
    0,
    Number(descuento) || 0
  );

  if (descuentoNumero > subtotal) {
    throw new Error("El descuento no puede ser mayor al subtotal.");
  }

  const total = subtotal - descuentoNumero;

  if (metodoPago === "EFECTIVO" && !cajaId) {
    throw new Error(
      "Selecciona una caja abierta para ventas en efectivo."
    );
  }

  const ventaRef = doc(collection(db, "ventas"));

  const detalleRefs = lineas.map(() =>
    doc(collection(db, "detalleVentas"))
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

    lineas.forEach((item, indice) => {
      const snapshot = stockSnapshots[indice];
      const stockActual = snapshot.exists()
        ? Number(snapshot.data().stock || 0)
        : 0;

      if (stockActual < item.cantidad) {
        throw new Error(
          `Stock insuficiente para ${item.nombreProducto}. Disponible: ${stockActual}.`
        );
      }
    });

    transaccion.set(ventaRef, {
      empresaId,
      sucursalId,
      clienteId: clienteId || null,
      metodoPago,
      cajaId: cajaId || null,
      subtotal,
      descuento: descuentoNumero,
      total,
      estado: "COMPLETADA",
      observaciones: observaciones?.trim() || "",
      usuarioId,
      fechaRegistro: serverTimestamp()
    });

    lineas.forEach((item, indice) => {
      const snapshot = stockSnapshots[indice];
      const stockAnterior = snapshot.exists()
        ? Number(snapshot.data().stock || 0)
        : 0;

      const stockNuevo = stockAnterior - item.cantidad;

      transaccion.set(detalleRefs[indice], {
        empresaId,
        ventaId: ventaRef.id,
        productoId: item.productoId,
        nombreProducto: item.nombreProducto,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
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
        tipo: "VENTA",
        cantidad: item.cantidad,
        stockAnterior,
        stockNuevo,
        motivo: `Venta ${ventaRef.id}`,
        referenciaTipo: "VENTA",
        referenciaId: ventaRef.id,
        usuarioId,
        fechaRegistro: serverTimestamp()
      });
    });

    if (movimientoCajaRef) {
      transaccion.set(movimientoCajaRef, {
        empresaId,
        cajaId,
        sucursalId,
        tipo: "INGRESO",
        categoria: "VENTA",
        monto: total,
        descripcion: `Venta ${ventaRef.id}`,
        referenciaTipo: "VENTA",
        referenciaId: ventaRef.id,
        usuarioId,
        fechaRegistro: serverTimestamp()
      });
    }
  });

  return ventaRef.id;
}
