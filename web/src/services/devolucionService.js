import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where
} from "firebase/firestore";
import { db } from "./firebase/firebaseConfig";
import { registrarAuditoria } from "./auditService";

export async function cargarDatosDevoluciones(empresaId) {
  const [ventasSnap, detallesSnap, devolucionesSnap] = await Promise.all([
    getDocs(query(collection(db, "ventas"), where("empresaId", "==", empresaId))),
    getDocs(query(collection(db, "detalleVentas"), where("empresaId", "==", empresaId))),
    getDocs(query(collection(db, "devoluciones"), where("empresaId", "==", empresaId)))
  ]);

  const ventas = ventasSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.fechaRegistro?.toMillis?.() || 0) - (a.fechaRegistro?.toMillis?.() || 0));
  const detalles = detallesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const devoluciones = devolucionesSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.fechaRegistro?.toMillis?.() || 0) - (a.fechaRegistro?.toMillis?.() || 0));

  return { ventas, detalles, devoluciones };
}

export async function registrarDevolucion({
  empresaId,
  ventaId,
  detalleVentaId,
  cantidad,
  motivo,
  resolucion = "REINTEGRO",
  reingresaStock = true,
  usuarioId,
  usuarioNombre = ""
}) {
  const qty = Number(cantidad);
  if (!empresaId || !ventaId || !detalleVentaId) throw new Error("Venta y producto son obligatorios.");
  if (!Number.isFinite(qty) || qty <= 0) throw new Error("La cantidad debe ser mayor que cero.");
  if (!motivo?.trim()) throw new Error("Debes indicar el motivo de la devolución.");

  const ventaRef = doc(db, "ventas", ventaId);
  const detalleRef = doc(db, "detalleVentas", detalleVentaId);
  const [ventaSnap, detalleSnap, prevSnap] = await Promise.all([
    getDoc(ventaRef),
    getDoc(detalleRef),
    getDocs(query(collection(db, "devoluciones"), where("empresaId", "==", empresaId)))
  ]);

  if (!ventaSnap.exists()) throw new Error("La venta no existe.");
  if (!detalleSnap.exists()) throw new Error("El detalle de venta no existe.");

  const venta = ventaSnap.data();
  const detalle = detalleSnap.data();
  if (venta.empresaId !== empresaId || detalle.empresaId !== empresaId) throw new Error("La operación no pertenece a la empresa.");
  if (detalle.ventaId !== ventaId) throw new Error("El producto no pertenece a la venta seleccionada.");
  if (venta.estado === "ANULADA") throw new Error("No se puede devolver una venta anulada.");

  const devuelto = prevSnap.docs
    .map((d) => d.data())
    .filter((r) => r.ventaId === ventaId && r.detalleVentaId === detalleVentaId && r.estado !== "ANULADA")
    .reduce((s, r) => s + Number(r.cantidad || 0), 0);
  const vendido = Number(detalle.cantidad || 0);
  const disponible = Math.max(0, vendido - devuelto);
  if (qty > disponible) throw new Error(`Solo quedan ${disponible} unidad(es) disponibles para devolución.`);

  const devolucionRef = doc(collection(db, "devoluciones"));
  const stockRef = doc(db, "inventarios", `${venta.sucursalId}_${detalle.productoId}`);
  const movimientoRef = reingresaStock ? doc(collection(db, "movimientosStock")) : null;

  await runTransaction(db, async (tx) => {
    const stockSnap = reingresaStock ? await tx.get(stockRef) : null;
    const stockAnterior = stockSnap?.exists() ? Number(stockSnap.data().stock || 0) : 0;
    const stockNuevo = stockAnterior + qty;

    tx.set(devolucionRef, {
      empresaId,
      ventaId,
      detalleVentaId,
      productoId: detalle.productoId,
      productoNombre: detalle.nombreProducto || "",
      sucursalId: venta.sucursalId,
      clienteId: venta.clienteId || null,
      cantidad: qty,
      precioUnitario: Number(detalle.precioUnitario || 0),
      montoReferencia: Number((qty * Number(detalle.precioUnitario || 0)).toFixed(2)),
      motivo: motivo.trim(),
      resolucion,
      reingresaStock: Boolean(reingresaStock),
      estado: "ACTIVA",
      usuarioId,
      fechaRegistro: serverTimestamp(),
      fechaActualizacion: serverTimestamp()
    });

    if (reingresaStock) {
      tx.set(stockRef, {
        empresaId,
        sucursalId: venta.sucursalId,
        productoId: detalle.productoId,
        stock: stockNuevo,
        fechaActualizacion: serverTimestamp()
      }, { merge: true });
      tx.set(movimientoRef, {
        empresaId,
        sucursalId: venta.sucursalId,
        productoId: detalle.productoId,
        tipo: "DEVOLUCION_VENTA",
        cantidad: qty,
        stockAnterior,
        stockNuevo,
        motivo: `Devolución de venta ${ventaId}: ${motivo.trim()}`,
        referenciaTipo: "DEVOLUCION",
        referenciaId: devolucionRef.id,
        usuarioId,
        fechaRegistro: serverTimestamp()
      });
    }
  });

  await registrarAuditoria({
    empresaId,
    usuarioId,
    usuarioNombre,
    accion: "DEVOLUCION_VENTA",
    modulo: "ventas",
    entidad: "devolucion",
    entidadId: devolucionRef.id,
    detalle: `Venta ${ventaId} · ${detalle.nombreProducto || detalle.productoId} · ${qty} unidad(es)`
  });

  return devolucionRef.id;
}
