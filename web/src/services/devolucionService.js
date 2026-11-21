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
import { registrarAuditoria } from "./auditService";


// ==========================================
// A. FUNCIONES AUXILIARES
// ==========================================

// EVITA PEQUEÑOS ERRORES DECIMALES

function redondear(valor) {
  return Math.round(
    (Number(valor) + Number.EPSILON) * 1000000
  ) / 1000000;
}


// COMPRUEBA QUE UNA CANTIDAD SEA VALIDA

function cantidadValida(valor) {
  const numero = Number(valor);

  return (
    Number.isFinite(numero) &&
    numero > 0
  );
}


// ==========================================
// B. CARGAR DATOS DE DEVOLUCIONES
// ==========================================

export async function cargarDatosDevoluciones(
  empresaId
) {

  if (!empresaId) {
    throw new Error(
      "Debes seleccionar una empresa."
    );
  }

  const [
    ventasSnap,
    detallesSnap,
    devolucionesSnap
  ] = await Promise.all([

    getDocs(
      query(
        collection(db, "ventas"),
        where("empresaId", "==", empresaId)
      )
    ),

    getDocs(
      query(
        collection(db, "detalleVentas"),
        where("empresaId", "==", empresaId)
      )
    ),

    getDocs(
      query(
        collection(db, "devoluciones"),
        where("empresaId", "==", empresaId)
      )
    )

  ]);


  // ORDENAR VENTAS

  const ventas = ventasSnap.docs
    .map((documento) => ({
      id: documento.id,
      ...documento.data()
    }))
    .sort((a, b) => {

      const fechaA =
        a.fechaRegistro?.toMillis?.() || 0;

      const fechaB =
        b.fechaRegistro?.toMillis?.() || 0;

      return fechaB - fechaA;
    });


  // OBTENER DETALLES

  const detalles = detallesSnap.docs.map(
    (documento) => ({
      id: documento.id,
      ...documento.data()
    })
  );


  // ORDENAR DEVOLUCIONES

  const devoluciones = devolucionesSnap.docs
    .map((documento) => ({
      id: documento.id,
      ...documento.data()
    }))
    .sort((a, b) => {

      const fechaA =
        a.fechaRegistro?.toMillis?.() || 0;

      const fechaB =
        b.fechaRegistro?.toMillis?.() || 0;

      return fechaB - fechaA;
    });


  return {
    ventas,
    detalles,
    devoluciones
  };
}


// ==========================================
// C. REGISTRAR DEVOLUCION
// ==========================================

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

  // ========================================
  // VALIDACIONES
  // ========================================

  const qty = Number(cantidad);

  if (
    !empresaId ||
    !ventaId ||
    !detalleVentaId ||
    !usuarioId
  ) {
    throw new Error(
      "Empresa, venta, producto y usuario son obligatorios."
    );
  }

  if (!cantidadValida(qty)) {
    throw new Error(
      "La cantidad debe ser mayor que cero."
    );
  }

  if (
    !motivo ||
    String(motivo).trim().length < 3
  ) {
    throw new Error(
      "Debes indicar el motivo de la devolución."
    );
  }

  if (typeof reingresaStock !== "boolean") {
    throw new Error(
      "La opción de reingreso al stock no es válida."
    );
  }


  // ========================================
  // REFERENCIAS
  // ========================================

  const ventaRef = doc(
    db,
    "ventas",
    ventaId
  );

  const detalleRef = doc(
    db,
    "detalleVentas",
    detalleVentaId
  );

  const devolucionRef = doc(
    collection(db, "devoluciones")
  );

  const movimientoRef = reingresaStock
    ? doc(collection(db, "movimientosStock"))
    : null;


  // ========================================
  // CONSULTAR DEVOLUCIONES ANTERIORES
  // ========================================

  // ESTO PERMITE RESPETAR LAS DEVOLUCIONES
  // QUE YA EXISTIAN ANTES DE ESTA MEJORA.

  const anterioresSnap = await getDocs(
    query(
      collection(db, "devoluciones"),
      where("empresaId", "==", empresaId)
    )
  );

  const anteriores = anterioresSnap.docs
    .map((documento) => documento.data())
    .filter((registro) =>
      registro.ventaId === ventaId &&
      registro.detalleVentaId === detalleVentaId &&
      registro.estado !== "ANULADA"
    );


  // CALCULAR CUANTAS UNIDADES YA SE DEVOLVIERON

  const devueltoHistorico = redondear(
    anteriores.reduce(
      (suma, registro) =>
        suma + Number(registro.cantidad || 0),
      0
    )
  );


  // ========================================
  // CALCULAR LOTES RESTAURADOS ANTERIORMENTE
  // ========================================

  const historicoLotes = {};

  let historialSinTrazabilidad = false;

  for (const devolucion of anteriores) {

    if (!devolucion.reingresaStock) {
      continue;
    }

    if (
      !Array.isArray(devolucion.lotesReintegrados) ||
      devolucion.lotesReintegrados.length === 0
    ) {
      historialSinTrazabilidad = true;
      continue;
    }

    for (const lote of devolucion.lotesReintegrados) {

      if (!lote.loteId) {
        continue;
      }

      historicoLotes[lote.loteId] = redondear(
        Number(historicoLotes[lote.loteId] || 0) +
        Number(lote.cantidad || 0)
      );
    }
  }


  // ========================================
  // TRANSACCION DE FIRESTORE
  // ========================================

  await runTransaction(db, async (tx) => {

    // ======================================
    // LEER VENTA
    // ======================================

    const ventaSnap = await tx.get(
      ventaRef
    );

    if (!ventaSnap.exists()) {
      throw new Error(
        "La venta no existe."
      );
    }

    const venta = ventaSnap.data();

    if (venta.empresaId !== empresaId) {
      throw new Error(
        "La venta no pertenece a esta empresa."
      );
    }

    if (venta.estado !== "COMPLETADA") {
      throw new Error(
        "Solo se pueden devolver productos de ventas completadas."
      );
    }


    // ======================================
    // LEER DETALLE DE VENTA
    // ======================================

    const detalleSnap = await tx.get(
      detalleRef
    );

    if (!detalleSnap.exists()) {
      throw new Error(
        "El detalle de venta no existe."
      );
    }

    const detalle = detalleSnap.data();

    if (
      detalle.empresaId !== empresaId ||
      detalle.ventaId !== ventaId
    ) {
      throw new Error(
        "El producto no pertenece a la venta seleccionada."
      );
    }


    // ======================================
    // LEER PRODUCTO
    // ======================================

    const productoRef = doc(
      db,
      "productos",
      detalle.productoId
    );

    const productoSnap = await tx.get(
      productoRef
    );

    if (
      !productoSnap.exists() ||
      productoSnap.data().empresaId !== empresaId
    ) {
      throw new Error(
        "El producto no pertenece a esta empresa."
      );
    }

    const producto = productoSnap.data();


    // ======================================
    // VALIDAR CANTIDAD DEVUELTA
    // ======================================

    const vendido = Number(
      detalle.cantidad || 0
    );

    if (!cantidadValida(vendido)) {
      throw new Error(
        "La cantidad original de la venta no es válida."
      );
    }


    // CONSULTAR CONTADOR DE DEVOLUCIONES
    // GUARDADO EN LA PROPIA VENTA.

    const contadorDevoluciones =
      venta.devolucionesPorDetalle || {};

    const devueltoAnterior =
      Object.prototype.hasOwnProperty.call(
        contadorDevoluciones,
        detalleVentaId
      )
        ? Number(
            contadorDevoluciones[detalleVentaId]
          )
        : devueltoHistorico;


    const disponible = redondear(
      vendido - devueltoAnterior
    );

    if (qty > disponible + 0.000001) {

      throw new Error(
        `Solo puedes devolver ${disponible} unidad(es) de este producto.`
      );
    }


    // ======================================
    // COMPROBAR SI CONTROLA VENCIMIENTO
    // ======================================

    const controlaVencimiento =
      detalle.controlaVencimiento === true ||
      producto.controlaVencimiento === true;


    // ======================================
    // PREPARAR RESTAURACION DE LOTES
    // ======================================

    const lotesReintegrados = [];

    const actualizacionesLotes = [];

    const reintegrosVenta =
      venta.reintegrosPorDetalle || {};

    const reintegrosPrevios =
      reintegrosVenta[detalleVentaId] ||
      historicoLotes;

    const nuevosReintegros = {
      ...reintegrosPrevios
    };


    if (
      controlaVencimiento &&
      reingresaStock
    ) {

      // SI LA VENTA ES ANTIGUA Y NO TIENE
      // TRAZABILIDAD NO INVENTAMOS UN LOTE.

      if (
        !Array.isArray(detalle.lotesUsados) ||
        detalle.lotesUsados.length === 0
      ) {
        throw new Error(
          "Esta venta no tiene lotes registrados. " +
          "No se puede reingresar automáticamente al stock."
        );
      }


      // EVITAR RESTAURACIONES INSEGURAS
      // DE DEVOLUCIONES HISTORICAS.

      if (historialSinTrazabilidad) {
        throw new Error(
          "Existen devoluciones anteriores sin información de lotes. " +
          "Se necesita revisar el historial antes de reingresar stock."
        );
      }


      // ====================================
      // AGRUPAR LOTES DE LA VENTA
      // ====================================

      const lotesOrigen = new Map();

      for (const usado of detalle.lotesUsados) {

        const cantidadUsada = Number(
          usado.cantidad
        );

        if (
          !usado.loteId ||
          !cantidadValida(cantidadUsada)
        ) {
          throw new Error(
            "La venta tiene información de lotes inválida."
          );
        }

        const anterior = lotesOrigen.get(
          usado.loteId
        );

        if (anterior) {

          anterior.cantidad = redondear(
            anterior.cantidad + cantidadUsada
          );

        } else {

          lotesOrigen.set(
            usado.loteId,
            {
              loteId: usado.loteId,

              numeroLote:
                usado.numeroLote || "",

              fechaVencimiento:
                usado.fechaVencimiento || "",

              cantidad: cantidadUsada
            }
          );
        }
      }


      // ====================================
      // DISTRIBUIR LA DEVOLUCION POR LOTES
      // ====================================

      let pendiente = qty;

      const distribucion = [];


      for (const origen of lotesOrigen.values()) {

        if (pendiente <= 0.000001) {
          break;
        }

        const devueltoDeEseLote = Number(
          nuevosReintegros[origen.loteId] || 0
        );

        const maximoRestaurable = redondear(
          origen.cantidad - devueltoDeEseLote
        );

        if (maximoRestaurable <= 0) {
          continue;
        }

        const devolver = Math.min(
          pendiente,
          maximoRestaurable
        );

        distribucion.push({
          ...origen,
          devolver
        });

        pendiente = redondear(
          pendiente - devolver
        );
      }


      if (pendiente > 0.000001) {

        throw new Error(
          "No se pudo identificar una cantidad suficiente " +
          "en los lotes originales de esta venta."
        );
      }


      // ====================================
      // LEER CADA LOTE ORIGINAL
      // ====================================

      for (const registro of distribucion) {

        const loteRef = doc(
          db,
          "lotesInventario",
          registro.loteId
        );

        const loteSnap = await tx.get(
          loteRef
        );

        if (!loteSnap.exists()) {

          throw new Error(
            "No se encontró el lote original de la venta."
          );
        }

        const lote = loteSnap.data();


        // COMPROBAR EMPRESA Y SUCURSAL

        if (
          lote.empresaId !== empresaId ||
          lote.sucursalId !== venta.sucursalId ||
          lote.productoId !== detalle.productoId
        ) {
          throw new Error(
            "El lote no pertenece al producto o sucursal de la venta."
          );
        }


        // SOLO RESTAURAR LOTES ACTIVOS

        if (lote.estado !== "ACTIVO") {

          throw new Error(
            `El lote ${lote.numeroLote} no está activo.`
          );
        }


        const disponibleLote = Number(
          lote.cantidadDisponible || 0
        );

        const cantidadInicial = Number(
          lote.cantidadInicial || 0
        );

        const cantidadRetirada = Number(
          lote.cantidadRetirada || 0
        );

        const nuevoDisponible = redondear(
          disponibleLote + registro.devolver
        );


        // EVITAR SUPERAR LA CAPACIDAD DEL LOTE

        if (
          !Number.isFinite(nuevoDisponible) ||
          nuevoDisponible < 0 ||
          nuevoDisponible + cantidadRetirada >
            cantidadInicial + 0.000001
        ) {

          throw new Error(
            `No se puede restaurar el lote ${lote.numeroLote}. ` +
            "Sus cantidades no coinciden con el historial."
          );
        }


        actualizacionesLotes.push({
          ref: loteRef,

          cantidadDisponible:
            nuevoDisponible
        });


        lotesReintegrados.push({

          loteId:
            registro.loteId,

          numeroLote:
            registro.numeroLote,

          fechaVencimiento:
            registro.fechaVencimiento,

          cantidad:
            registro.devolver
        });


        nuevosReintegros[registro.loteId] =
          redondear(
            Number(
              nuevosReintegros[registro.loteId] || 0
            ) +
            registro.devolver
          );
      }

    }


    // ======================================
    // LEER INVENTARIO GENERAL
    // ======================================

    const stockRef = doc(
      db,
      "inventarios",
      `${venta.sucursalId}_${detalle.productoId}`
    );

    let stockAnterior = 0;

    let stockNuevo = 0;


    if (reingresaStock) {

      const stockSnap = await tx.get(
        stockRef
      );

      if (
        stockSnap.exists() &&
        stockSnap.data().empresaId !== empresaId
      ) {
        throw new Error(
          "El inventario pertenece a otra empresa."
        );
      }

      stockAnterior = stockSnap.exists()
        ? Number(stockSnap.data().stock || 0)
        : 0;

      if (
        !Number.isFinite(stockAnterior) ||
        stockAnterior < 0
      ) {
        throw new Error(
          "El stock actual no es válido."
        );
      }

      stockNuevo = redondear(
        stockAnterior + qty
      );
    }


    // ======================================
    // TODAS LAS LECTURAS ESTAN TERMINADAS
    // ======================================

    // AHORA PODEMOS REALIZAR LAS ESCRITURAS.


    // ======================================
    // REGISTRAR DEVOLUCION
    // ======================================

    tx.set(
      devolucionRef,
      {
        empresaId,

        ventaId,

        detalleVentaId,

        productoId:
          detalle.productoId,

        productoNombre:
          detalle.nombreProducto || "",

        sucursalId:
          venta.sucursalId,

        clienteId:
          venta.clienteId || null,

        cantidad:
          qty,

        precioUnitario:
          Number(detalle.precioUnitario || 0),

        montoReferencia:
          Number(
            (
              qty *
              Number(detalle.precioUnitario || 0)
            ).toFixed(2)
          ),

        motivo:
          String(motivo).trim(),

        resolucion,

        reingresaStock,

        controlaVencimiento,

        lotesReintegrados,

        estado:
          "ACTIVA",

        usuarioId,

        fechaRegistro:
          serverTimestamp(),

        fechaActualizacion:
          serverTimestamp()
      }
    );


    // ======================================
    // ACTUALIZAR CONTADOR DE DEVOLUCIONES
    // ======================================

    const nuevosContadores = {
      ...contadorDevoluciones,

      [detalleVentaId]:
        redondear(
          devueltoAnterior + qty
        )
    };


    const nuevosReintegrosVenta = {
      ...reintegrosVenta,

      [detalleVentaId]:
        nuevosReintegros
    };


    tx.update(
      ventaRef,
      {
        devolucionesPorDetalle:
          nuevosContadores,

        reintegrosPorDetalle:
          nuevosReintegrosVenta,

        fechaUltimaDevolucion:
          serverTimestamp()
      }
    );


    // ======================================
    // RESTAURAR LOTES
    // ======================================

    if (
      controlaVencimiento &&
      reingresaStock
    ) {

      for (const lote of actualizacionesLotes) {

        tx.update(
          lote.ref,
          {
            cantidadDisponible:
              lote.cantidadDisponible,

            fechaActualizacion:
              serverTimestamp()
          }
        );
      }
    }


    // ======================================
    // RESTAURAR INVENTARIO GENERAL
    // ======================================

    if (reingresaStock) {

      tx.set(
        stockRef,
        {
          empresaId,

          sucursalId:
            venta.sucursalId,

          productoId:
            detalle.productoId,

          stock:
            stockNuevo,

          fechaActualizacion:
            serverTimestamp()
        },
        {
          merge: true
        }
      );


      // ====================================
      // MOVIMIENTO DE INVENTARIO
      // ====================================

      tx.set(
        movimientoRef,
        {
          empresaId,

          sucursalId:
            venta.sucursalId,

          productoId:
            detalle.productoId,

          tipo:
            "DEVOLUCION_VENTA",

          cantidad:
            qty,

          stockAnterior,

          stockNuevo,

          motivo:
            `Devolución de venta ${ventaId}: ${String(motivo).trim()}`,

          referenciaTipo:
            "DEVOLUCION",

          referenciaId:
            devolucionRef.id,

          usuarioId,

          fechaRegistro:
            serverTimestamp()
        }
      );

    }

  });


  // ========================================
  // REGISTRAR AUDITORIA
  // ========================================

  try {

    await registrarAuditoria({
      empresaId,

      usuarioId,

      usuarioNombre,

      accion:
        "DEVOLUCION_VENTA",

      modulo:
        "ventas",

      entidad:
        "devolucion",

      entidadId:
        devolucionRef.id,

      detalle:
        `Venta ${ventaId} · ${qty} unidad(es)`
    });

  } catch (error) {

    console.warn(
      "La devolución se registró, pero falló la auditoría:",
      error
    );

  }


  return devolucionRef.id;
}