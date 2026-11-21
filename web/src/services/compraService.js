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

import { registrarAuditoria } from "./auditService";


// ==========================================
// OBTENER FECHA ACTUAL
// ==========================================

function fechaLocal() {
  const hoy = new Date();

  const anio = hoy.getFullYear();

  const mes = String(
    hoy.getMonth() + 1
  ).padStart(2, "0");

  const dia = String(
    hoy.getDate()
  ).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}


// ==========================================
// VALIDAR FECHA
// ==========================================

function fechaValida(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return false;
  }

  const [anio, mes, dia] = valor
    .split("-")
    .map(Number);

  const fecha = new Date(
    anio,
    mes - 1,
    dia
  );

  return (
    fecha.getFullYear() === anio &&
    fecha.getMonth() === mes - 1 &&
    fecha.getDate() === dia
  );
}


// ==========================================
// REDONDEAR IMPORTES
// ==========================================

function importe(valor) {
  return Math.round(
    (valor + Number.EPSILON) * 100
  ) / 100;
}


// ==========================================
// OBTENER CATALOGOS DE COMPRA
// ==========================================

export async function obtenerCatalogosCompra(
  empresaId
) {
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
      .map((d) => ({
        id: d.id,
        ...d.data()
      }))
      .filter(
        (p) => p.estado === "ACTIVO"
      ),

    productos: productosSnapshot.docs
      .map((d) => ({
        id: d.id,
        ...d.data()
      }))
      .filter(
        (p) => p.estado === "ACTIVO"
      ),

    sucursales: sucursalesSnapshot.docs
      .map((d) => ({
        id: d.id,
        ...d.data()
      }))
      .filter(
        (s) => s.estado === "ACTIVA"
      ),

    cajas
  };
}


// ==========================================
// LISTAR COMPRAS
// ==========================================

export async function listarCompras(
  empresaId
) {
  const snapshot = await getDocs(
    query(
      collection(db, "compras"),
      where("empresaId", "==", empresaId)
    )
  );

  const compras = snapshot.docs.map(
    (d) => ({
      id: d.id,
      ...d.data()
    })
  );

  compras.sort((a, b) => {
    const fechaA =
      a.fechaRegistro?.toMillis?.() || 0;

    const fechaB =
      b.fechaRegistro?.toMillis?.() || 0;

    return fechaB - fechaA;
  });

  return compras;
}


// ==========================================
// REGISTRAR COMPRA CON LOTES
// ==========================================

export async function registrarCompra({
  empresaId,
  sucursalId,
  proveedorId,
  numeroDocumento = "",
  metodoPago = "QR",
  cajaId,
  observaciones = "",
  items,
  usuarioId
}) {

  // VALIDAR DATOS GENERALES

  if (
    !empresaId ||
    !sucursalId ||
    !proveedorId ||
    !usuarioId
  ) {
    throw new Error(
      "Empresa, sucursal, proveedor y usuario son obligatorios."
    );
  }

  if (
    !Array.isArray(items) ||
    items.length === 0
  ) {
    throw new Error(
      "Agrega al menos un producto."
    );
  }

  if (items.length > 12) {
    throw new Error(
      "Registra como máximo 12 líneas por compra."
    );
  }

  if (
    ![
      "EFECTIVO",
      "QR",
      "TARJETA",
      "CREDITO"
    ].includes(metodoPago)
  ) {
    throw new Error(
      "Método de pago inválido."
    );
  }

  if (
    metodoPago === "EFECTIVO" &&
    !cajaId
  ) {
    throw new Error(
      "Selecciona una caja abierta para una compra en efectivo."
    );
  }


  // ========================================
  // PREPARAR LINEAS DE COMPRA
  // ========================================

  const lineas = items.map((item) => {
    const cantidad = Number(
      item.cantidad
    );

    const costoUnitario = Number(
      item.costoUnitario
    );

    if (
      !item.productoId ||
      !Number.isFinite(cantidad) ||
      cantidad <= 0 ||
      !Number.isFinite(costoUnitario) ||
      costoUnitario < 0
    ) {
      throw new Error(
        "Revisa el producto, la cantidad y el costo."
      );
    }

    return {
      productoId: item.productoId,

      cantidad,

      costoUnitario,

      numeroLote: String(
        item.numeroLote || ""
      ).trim().toUpperCase(),

      fechaVencimiento: String(
        item.fechaVencimiento || ""
      ).trim(),

      subtotal: importe(
        cantidad * costoUnitario
      )
    };
  });


  // ========================================
  // CALCULAR TOTAL
  // ========================================

  const total = importe(
    lineas.reduce(
      (suma, item) =>
        suma + item.subtotal,
      0
    )
  );


  // ========================================
  // REFERENCIAS DE FIRESTORE
  // ========================================

  const compraRef = doc(
    collection(db, "compras")
  );

  const cuentaPagarRef =
    metodoPago === "CREDITO"
      ? doc(collection(db, "cuentasPagar"))
      : null;

  const cajaRef =
    metodoPago === "EFECTIVO"
      ? doc(db, "cajas", cajaId)
      : null;

  const movimientoCajaRef = cajaRef
    ? doc(collection(db, "movimientosCaja"))
    : null;

  const detalleRefs = lineas.map(() =>
    doc(collection(db, "detalleCompras"))
  );

  const movimientoRefs = lineas.map(() =>
    doc(collection(db, "movimientosStock"))
  );

  // NUEVA COLECCION DE LOTES

  const loteRefs = lineas.map(() =>
    doc(collection(db, "lotesInventario"))
  );


  // ========================================
  // AGRUPAR PRODUCTOS SIN REPETIR IDS
  // ========================================

  const ids = [
    ...new Set(
      lineas.map(
        (item) => item.productoId
      )
    )
  ];

  const productosRef = new Map(
    ids.map((id) => [
      id,
      doc(db, "productos", id)
    ])
  );

  const inventariosRef = new Map(
    ids.map((id) => [
      id,
      doc(
        db,
        "inventarios",
        `${sucursalId}_${id}`
      )
    ])
  );


  // ========================================
  // TRANSACCION DE FIRESTORE
  // ========================================

  await runTransaction(
    db,
    async (transaccion) => {

      // LEER PROVEEDOR Y SUCURSAL

      const proveedorSnapshot =
        await transaccion.get(
          doc(db, "proveedores", proveedorId)
        );

      const sucursalSnapshot =
        await transaccion.get(
          doc(db, "sucursales", sucursalId)
        );

      if (
        !proveedorSnapshot.exists() ||
        proveedorSnapshot.data().empresaId !== empresaId ||
        proveedorSnapshot.data().estado !== "ACTIVO"
      ) {
        throw new Error(
          "El proveedor no existe o no pertenece a la empresa."
        );
      }

      if (
        !sucursalSnapshot.exists() ||
        sucursalSnapshot.data().empresaId !== empresaId ||
        sucursalSnapshot.data().estado !== "ACTIVA"
      ) {
        throw new Error(
          "La sucursal no está activa o no pertenece a la empresa."
        );
      }


      // ====================================
      // LEER PRODUCTOS E INVENTARIOS
      // ====================================

      const productos = new Map();

      const stocks = new Map();

      for (const id of ids) {
        const productoSnapshot =
          await transaccion.get(
            productosRef.get(id)
          );

        const stockSnapshot =
          await transaccion.get(
            inventariosRef.get(id)
          );

        if (
          !productoSnapshot.exists() ||
          productoSnapshot.data().empresaId !== empresaId ||
          productoSnapshot.data().estado !== "ACTIVO"
        ) {
          throw new Error(
            "Uno de los productos no está activo o no pertenece a la empresa."
          );
        }

        if (
          stockSnapshot.exists() &&
          stockSnapshot.data().empresaId !== empresaId
        ) {
          throw new Error(
            "El inventario pertenece a otra empresa."
          );
        }

        productos.set(
          id,
          productoSnapshot.data()
        );

        stocks.set(
          id,
          Number(
            stockSnapshot.exists()
              ? stockSnapshot.data().stock || 0
              : 0
          )
        );
      }


      // ====================================
      // VALIDAR CAJA
      // ====================================

      if (cajaRef) {
        const cajaSnapshot =
          await transaccion.get(cajaRef);

        if (
          !cajaSnapshot.exists() ||
          cajaSnapshot.data().empresaId !== empresaId ||
          cajaSnapshot.data().sucursalId !== sucursalId ||
          cajaSnapshot.data().estado !== "ABIERTA"
        ) {
          throw new Error(
            "La caja no está abierta en la sucursal seleccionada."
          );
        }
      }


      // ====================================
      // VALIDAR PRODUCTOS PERECEDEROS
      // ====================================

      for (const item of lineas) {
        const producto = productos.get(
          item.productoId
        );

        if (
          producto.controlaVencimiento === true
        ) {
          if (
            !item.numeroLote ||
            !fechaValida(
              item.fechaVencimiento
            )
          ) {
            throw new Error(
              `Indica lote y vencimiento válido para ${producto.nombre}.`
            );
          }

          if (
            item.fechaVencimiento <
            fechaLocal()
          ) {
            throw new Error(
              `El lote ${item.numeroLote} de ${producto.nombre} ya venció. No puede ingresar como stock vendible.`
            );
          }
        }
      }


      // ====================================
      // GUARDAR COMPRA
      // ====================================

      transaccion.set(compraRef, {
        empresaId,
        sucursalId,
        proveedorId,

        numeroDocumento:
          numeroDocumento.trim(),

        metodoPago,

        cajaId:
          cajaRef ? cajaId : null,

        total,

        estado: "REGISTRADA",

        observaciones:
          observaciones.trim(),

        usuarioId,

        fechaRegistro:
          serverTimestamp()
      });


      // ====================================
      // GUARDAR DETALLES Y LOTES
      // ====================================

      lineas.forEach((item, indice) => {
        const producto = productos.get(
          item.productoId
        );

        const controlaVencimiento =
          producto.controlaVencimiento === true;

        const stockAnterior =
          stocks.get(item.productoId);

        const stockNuevo =
          stockAnterior + item.cantidad;

        stocks.set(
          item.productoId,
          stockNuevo
        );


        // DETALLE DE COMPRA

        transaccion.set(
          detalleRefs[indice],
          {
            empresaId,

            compraId: compraRef.id,

            productoId:
              item.productoId,

            nombreProducto:
              producto.nombre,

            cantidad:
              item.cantidad,

            costoUnitario:
              item.costoUnitario,

            subtotal:
              item.subtotal,

            controlaVencimiento,

            numeroLote:
              controlaVencimiento
                ? item.numeroLote
                : null,

            fechaVencimiento:
              controlaVencimiento
                ? item.fechaVencimiento
                : null
          }
        );


        // MOVIMIENTO DE STOCK

        transaccion.set(
          movimientoRefs[indice],
          {
            empresaId,
            sucursalId,

            productoId:
              item.productoId,

            tipo: "COMPRA",

            cantidad:
              item.cantidad,

            stockAnterior,

            stockNuevo,

            motivo:
              `Compra ${numeroDocumento.trim() || compraRef.id}`,

            referenciaTipo:
              "COMPRA",

            referenciaId:
              compraRef.id,

            usuarioId,

            fechaRegistro:
              serverTimestamp()
          }
        );


        // ==================================
        // REGISTRAR LOTE SI CORRESPONDE
        // ==================================

        if (controlaVencimiento) {
          transaccion.set(
            loteRefs[indice],
            {
              empresaId,
              sucursalId,

              productoId:
                item.productoId,

              compraId:
                compraRef.id,

              detalleCompraId:
                detalleRefs[indice].id,

              numeroLote:
                item.numeroLote,

              fechaVencimiento:
                item.fechaVencimiento,

              cantidadInicial:
                item.cantidad,

              cantidadDisponible:
                item.cantidad,

              costoUnitario:
                item.costoUnitario,

              estado: "ACTIVO",

              usuarioId,

              fechaRegistro:
                serverTimestamp(),

              fechaActualizacion:
                serverTimestamp()
            }
          );
        }
      });


      // ====================================
      // ACTUALIZAR INVENTARIO GENERAL
      // ====================================

      // Solo una escritura por producto.

      for (const id of ids) {
        transaccion.set(
          inventariosRef.get(id),
          {
            empresaId,
            sucursalId,

            productoId: id,

            stock: stocks.get(id),

            fechaActualizacion:
              serverTimestamp()
          },
          {
            merge: true
          }
        );
      }


      // ====================================
      // COMPRA A CREDITO
      // ====================================

      if (cuentaPagarRef) {
        transaccion.set(
          cuentaPagarRef,
          {
            empresaId,
            proveedorId,
            sucursalId,

            compraId:
              compraRef.id,

            referencia:
              numeroDocumento.trim() ||
              compraRef.id,

            total,
            saldo: total,

            estadoCuenta:
              "PENDIENTE",

            estado: "ACTIVO",

            fechaRegistro:
              serverTimestamp(),

            fechaActualizacion:
              serverTimestamp()
          }
        );
      }


      // ====================================
      // MOVIMIENTO DE CAJA
      // ====================================

      if (movimientoCajaRef) {
        transaccion.set(
          movimientoCajaRef,
          {
            empresaId,
            cajaId,
            sucursalId,

            tipo: "EGRESO",

            categoria: "COMPRA",

            monto: total,

            descripcion:
              `Compra ${numeroDocumento.trim() || compraRef.id}`,

            referenciaTipo:
              "COMPRA",

            referenciaId:
              compraRef.id,

            usuarioId,

            fechaRegistro:
              serverTimestamp()
          }
        );
      }
    }
  );


  // ========================================
  // REGISTRAR AUDITORIA
  // ========================================

  try {
    await registrarAuditoria({
      empresaId,
      usuarioId,

      accion:
        "REGISTRAR_COMPRA",

      modulo:
        "compras",

      entidad:
        "compra",

      entidadId:
        compraRef.id,

      detalle:
        `Compra ${numeroDocumento.trim() || compraRef.id} por ${total.toFixed(2)}`
    });
  } catch (error) {
    console.warn(
      "Compra guardada, pero no se registró la auditoría:",
      error
    );
  }

  return compraRef.id;
}