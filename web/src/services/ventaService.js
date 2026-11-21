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
import { obtenerCajasAbiertas } from "./cajaService";
import { registrarAuditoria } from "./auditService";


// ==========================================
// A. FUNCIONES AUXILIARES
// ==========================================

// OBTENER FECHA ACTUAL

function fechaHoy() {
  const hoy = new Date();

  return [
    hoy.getFullYear(),
    String(hoy.getMonth() + 1).padStart(2, "0"),
    String(hoy.getDate()).padStart(2, "0")
  ].join("-");
}


// VALIDAR FECHA DE VENCIMIENTO

function fechaValida(fecha) {
  if (
    typeof fecha !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(fecha)
  ) {
    return false;
  }

  const [a, m, d] = fecha.split("-").map(Number);

  const f = new Date(a, m - 1, d);

  return (
    f.getFullYear() === a &&
    f.getMonth() === m - 1 &&
    f.getDate() === d
  );
}


// REDONDEAR CANTIDADES

function redondear(numero) {
  return Math.round(
    (Number(numero) + Number.EPSILON) * 1000000
  ) / 1000000;
}


// REDONDEAR DINERO

function dinero(numero) {
  return Math.round(
    (Number(numero) + Number.EPSILON) * 100
  ) / 100;
}


// VALIDAR CANTIDAD POSITIVA

function positivo(numero) {
  return Number.isFinite(numero) && numero > 0;
}


// REGISTRAR AUDITORIA

async function auditar(datos) {
  try {
    await registrarAuditoria(datos);
  } catch (error) {
    console.warn(
      "La operación se guardó, pero falló la auditoría:",
      error
    );
  }
}


// ==========================================
// B. CATALOGOS DEL PUNTO DE VENTA
// ==========================================

export async function obtenerCatalogosVenta(empresaId) {
  if (!empresaId) {
    throw new Error("No hay empresa asignada.");
  }

  const [
    clientesSnap,
    productosSnap,
    sucursalesSnap,
    inventariosSnap,
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


  // OBTENER PRODUCTOS ACTIVOS

  const productos = productosSnap.docs
    .map((d) => ({
      id: d.id,
      ...d.data()
    }))
    .filter((p) => p.estado === "ACTIVO");


  // CREAR MAPA DE PRODUCTOS

  const productosPorId = new Map(
    productos.map((p) => [p.id, p])
  );


  // COMPROBAR SI EXISTEN PRODUCTOS CON VENCIMIENTO

  const requiereLotes = productos.some(
    (p) => p.controlaVencimiento === true
  );


  // CONSULTAR LOTES DE LA EMPRESA

  const lotesSnap = requiereLotes
    ? await getDocs(
        query(
          collection(db, "lotesInventario"),
          where("empresaId", "==", empresaId)
        )
      )
    : null;


  // ========================================
  // CALCULAR CANTIDADES VIGENTES
  // ========================================

  const cantidadesVigentes = new Map();

  const hoy = fechaHoy();

  for (const documento of lotesSnap?.docs || []) {
    const lote = documento.data();

    const n = Number(
      lote.cantidadDisponible || 0
    );

    if (
      lote.estado !== "ACTIVO" ||
      !productosPorId.get(lote.productoId)?.controlaVencimiento ||
      !lote.sucursalId ||
      !fechaValida(lote.fechaVencimiento) ||
      lote.fechaVencimiento < hoy ||
      !positivo(n)
    ) {
      continue;
    }

    const clave =
      `${lote.sucursalId}_${lote.productoId}`;

    cantidadesVigentes.set(
      clave,
      redondear(
        (cantidadesVigentes.get(clave) || 0) + n
      )
    );
  }


  // ========================================
  // PREPARAR INVENTARIOS PARA EL POS
  // ========================================

  const inventarios = inventariosSnap.docs.map((d) => {
    const inventario = {
      id: d.id,
      ...d.data()
    };

    const fisico = Math.max(
      0,
      Number(inventario.stock || 0)
    );

    const producto = productosPorId.get(
      inventario.productoId
    );


    // PRODUCTO SIN VENCIMIENTO

    if (producto?.controlaVencimiento !== true) {
      return inventario;
    }


    // PRODUCTO CON VENCIMIENTO

    const clave =
      `${inventario.sucursalId}_${inventario.productoId}`;

    return {
      ...inventario,

      stockFisico: fisico,

      stock: Math.max(
        0,
        Math.min(
          fisico,
          cantidadesVigentes.get(clave) || 0
        )
      )
    };
  });


  // DEVOLVER CATALOGOS

  return {
    clientes: clientesSnap.docs
      .map((d) => ({
        id: d.id,
        ...d.data()
      }))
      .filter((c) => c.estado === "ACTIVO"),

    productos,

    sucursales: sucursalesSnap.docs
      .map((d) => ({
        id: d.id,
        ...d.data()
      }))
      .filter((s) => s.estado === "ACTIVA"),

    inventarios,

    cajas
  };
}


// ==========================================
// C. HISTORIAL DE VENTAS
// ==========================================

export async function listarVentas(empresaId) {
  if (!empresaId) {
    throw new Error("No hay empresa asignada.");
  }

  const snapshot = await getDocs(
    query(
      collection(db, "ventas"),
      where("empresaId", "==", empresaId)
    )
  );

  return snapshot.docs
    .map((d) => ({
      id: d.id,
      ...d.data()
    }))
    .sort((a, b) =>
      (b.fechaRegistro?.toMillis?.() || 0) -
      (a.fechaRegistro?.toMillis?.() || 0)
    );
}


// ==========================================
// D. REGISTRAR VENTA CON METODO FEFO
// ==========================================

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

  // ========================================
  // VALIDACIONES GENERALES
  // ========================================

  if (
    !empresaId ||
    !sucursalId ||
    !usuarioId
  ) {
    throw new Error(
      "Empresa, sucursal y usuario son obligatorios."
    );
  }

  if (
    !Array.isArray(items) ||
    items.length < 1 ||
    items.length > 20
  ) {
    throw new Error(
      "La venta debe contener entre 1 y 20 productos diferentes."
    );
  }


  // VALIDAR METODO DE PAGO

  if (
    ![
      "EFECTIVO",
      "QR",
      "TARJETA",
      "TRANSFERENCIA",
      "CREDITO"
    ].includes(metodoPago)
  ) {
    throw new Error(
      "Método de pago inválido."
    );
  }


  // VALIDAR CAJA

  if (
    metodoPago === "EFECTIVO" &&
    !cajaId
  ) {
    throw new Error(
      "Selecciona una caja abierta para el pago en efectivo."
    );
  }


  // VALIDAR CLIENTE PARA CREDITO

  if (
    metodoPago === "CREDITO" &&
    !clienteId
  ) {
    throw new Error(
      "Una venta a crédito requiere un cliente registrado."
    );
  }


  // ========================================
  // PREPARAR LINEAS DE VENTA
  // ========================================

  const lineas = items.map((item) => {
    const cantidad = Number(item.cantidad);

    const precioUnitario = Number(
      item.precioUnitario
    );

    if (
      !item.productoId ||
      !positivo(cantidad) ||
      !Number.isFinite(precioUnitario) ||
      precioUnitario < 0
    ) {
      throw new Error(
        "Revisa el producto, su precio y la cantidad."
      );
    }

    return {
      productoId: item.productoId,
      cantidad,
      precioUnitario,

      subtotal: dinero(
        cantidad * precioUnitario
      )
    };
  });


  // EVITAR PRODUCTOS DUPLICADOS

  const ids = [
    ...new Set(
      lineas.map((item) => item.productoId)
    )
  ];

  if (ids.length !== lineas.length) {
    throw new Error(
      "Un producto está repetido en la venta. " +
      "Agrupa su cantidad en una sola línea."
    );
  }


  // ========================================
  // CALCULAR TOTALES
  // ========================================

  const subtotal = dinero(
    lineas.reduce(
      (suma, item) => suma + item.subtotal,
      0
    )
  );

  const descuentoNumero = Number(
    descuento || 0
  );

  if (
    !Number.isFinite(descuentoNumero) ||
    descuentoNumero < 0 ||
    descuentoNumero > subtotal
  ) {
    throw new Error(
      "El descuento debe estar entre cero y el subtotal."
    );
  }

  const total = dinero(
    subtotal - descuentoNumero
  );


  // ========================================
  // CONSULTAR PRODUCTOS
  // ========================================

  const productosSnap = await getDocs(
    query(
      collection(db, "productos"),
      where("empresaId", "==", empresaId)
    )
  );

  const productosPrevios = new Map(
    productosSnap.docs.map(
      (d) => [d.id, d.data()]
    )
  );


  // COMPROBAR SI REQUIEREN LOTES

  const usaLotes = ids.some(
    (id) =>
      productosPrevios.get(id)?.controlaVencimiento === true
  );


  // CONSULTAR LOTES

  const lotesSnap = usaLotes
    ? await getDocs(
        query(
          collection(db, "lotesInventario"),
          where("empresaId", "==", empresaId)
        )
      )
    : null;


  // FILTRAR LOTES DE LOS PRODUCTOS

  const lotesPrevios = (lotesSnap?.docs || [])
    .filter(
      (d) =>
        d.data().sucursalId === sucursalId &&
        ids.includes(d.data().productoId)
    );


  // ========================================
  // CREAR REFERENCIAS
  // ========================================

  const ventaRef = doc(
    collection(db, "ventas")
  );

  const detalleRefs = lineas.map(
    () => doc(collection(db, "detalleVentas"))
  );

  const movimientoRefs = lineas.map(
    () => doc(collection(db, "movimientosStock"))
  );

  const cajaRef = metodoPago === "EFECTIVO"
    ? doc(db, "cajas", cajaId)
    : null;

  const movCajaRef = cajaRef
    ? doc(collection(db, "movimientosCaja"))
    : null;

  const cuentaRef = metodoPago === "CREDITO"
    ? doc(collection(db, "cuentasCobrar"))
    : null;


  // ========================================
  // TRANSACCION DE VENTA
  // ========================================

  await runTransaction(db, async (tx) => {

    // ======================================
    // PRIMERO REALIZAR TODAS LAS LECTURAS
    // ======================================

    const sucursalSnap = await tx.get(
      doc(db, "sucursales", sucursalId)
    );

    if (
      !sucursalSnap.exists() ||
      sucursalSnap.data().empresaId !== empresaId ||
      sucursalSnap.data().estado !== "ACTIVA"
    ) {
      throw new Error(
        "La sucursal no pertenece a esta empresa o está inactiva."
      );
    }


    // VALIDAR CLIENTE

    if (clienteId) {
      const clienteSnap = await tx.get(
        doc(db, "clientes", clienteId)
      );

      if (
        !clienteSnap.exists() ||
        clienteSnap.data().empresaId !== empresaId ||
        clienteSnap.data().estado !== "ACTIVO"
      ) {
        throw new Error(
          "El cliente no pertenece a la empresa o está inactivo."
        );
      }
    }


    // ======================================
    // LEER PRODUCTOS E INVENTARIOS
    // ======================================

    const productos = new Map();

    const existencias = new Map();

    const referencias = new Map();

    for (const id of ids) {
      const productoSnap = await tx.get(
        doc(db, "productos", id)
      );

      const stockRef = doc(
        db,
        "inventarios",
        `${sucursalId}_${id}`
      );

      const stockSnap = await tx.get(
        stockRef
      );


      // VALIDAR PRODUCTO

      if (
        !productoSnap.exists() ||
        productoSnap.data().empresaId !== empresaId ||
        productoSnap.data().estado !== "ACTIVO"
      ) {
        throw new Error(
          "Un producto está inactivo o no pertenece a la empresa."
        );
      }


      // VALIDAR INVENTARIO

      if (
        stockSnap.exists() &&
        stockSnap.data().empresaId !== empresaId
      ) {
        throw new Error(
          "El inventario pertenece a otra empresa."
        );
      }


      const producto = productoSnap.data();


      // COMPROBAR CAMBIO DE VENCIMIENTO

      if (
        (producto.controlaVencimiento === true) !==
        (
          productosPrevios.get(id)?.controlaVencimiento === true
        )
      ) {
        throw new Error(
          "Cambió el control de vencimiento. Actualiza la página."
        );
      }


      // COMPROBAR PRECIO ACTUAL

      const linea = lineas.find(
        (l) => l.productoId === id
      );

      if (
        Math.abs(
          Number(producto.precioVenta || 0) -
          linea.precioUnitario
        ) > 0.000001
      ) {
        throw new Error(
          `El precio de ${producto.nombre} cambió. ` +
          "Actualiza el punto de venta."
        );
      }


      // OBTENER STOCK FISICO

      const stock = stockSnap.exists()
        ? Number(
            stockSnap.data().stock || 0
          )
        : 0;


      if (
        !Number.isFinite(stock) ||
        stock < 0
      ) {
        throw new Error(
          `El inventario de ${producto.nombre} contiene un stock inválido.`
        );
      }


      productos.set(id, producto);

      existencias.set(id, stock);

      referencias.set(id, stockRef);
    }


    // ======================================
    // LEER LOTES EN LA TRANSACCION
    // ======================================

    const lotesPorProducto = new Map();

    const lotesPorId = new Map();

    for (const previo of lotesPrevios) {
      const snap = await tx.get(
        previo.ref
      );

      if (!snap.exists()) {
        throw new Error(
          "Un lote cambió. Actualiza el punto de venta."
        );
      }

      const lote = snap.data();

      if (
        lote.empresaId !== empresaId ||
        lote.sucursalId !== sucursalId ||
        !ids.includes(lote.productoId)
      ) {
        throw new Error(
          "Un lote no pertenece a la empresa o sucursal."
        );
      }

      const disponible = Number(
        lote.cantidadDisponible || 0
      );

      if (
        !Number.isFinite(disponible) ||
        disponible < 0
      ) {
        throw new Error(
          "Un lote tiene una cantidad inválida."
        );
      }


      const registro = {
        ...lote,
        ref: previo.ref,
        disponible
      };


      lotesPorId.set(
        previo.id,
        registro
      );

      if (!lotesPorProducto.has(lote.productoId)) {
        lotesPorProducto.set(
          lote.productoId,
          []
        );
      }

      lotesPorProducto
        .get(lote.productoId)
        .push(registro);
    }


    // ======================================
    // VALIDAR CAJA
    // ======================================

    if (cajaRef) {
      const cajaSnap = await tx.get(cajaRef);

      if (
        !cajaSnap.exists() ||
        cajaSnap.data().empresaId !== empresaId ||
        cajaSnap.data().sucursalId !== sucursalId ||
        cajaSnap.data().estado !== "ABIERTA"
      ) {
        throw new Error(
          "La caja no está abierta en esta sucursal."
        );
      }
    }


    // ======================================
    // TODAS LAS LECTURAS TERMINARON
    // ======================================

    const hoy = fechaHoy();


    // ORDENAR LOTES POR VENCIMIENTO

    for (const lotes of lotesPorProducto.values()) {
      lotes.sort(
        (a, b) =>
          String(a.fechaVencimiento).localeCompare(
            String(b.fechaVencimiento)
          ) ||
          a.ref.id.localeCompare(b.ref.id)
      );
    }


    // ======================================
    // PREPARAR DETALLES Y MOVIMIENTOS
    // ======================================

    const detalles = [];

    const movimientos = [];

    const lotesModificados = new Set();


    for (const linea of lineas) {
      const producto = productos.get(
        linea.productoId
      );

      const anterior = existencias.get(
        linea.productoId
      );


      // VALIDAR STOCK GENERAL

      if (
        anterior + 0.000001 < linea.cantidad
      ) {
        throw new Error(
          `Stock insuficiente para ${producto.nombre}. ` +
          `Disponible: ${anterior}.`
        );
      }


      // ====================================
      // DESCONTAR LOTES SI CORRESPONDE
      // ====================================

      const usados = [];

      if (producto.controlaVencimiento === true) {
        let pendiente = linea.cantidad;

        const lotes = lotesPorProducto.get(
          linea.productoId
        ) || [];


        for (const lote of lotes) {
          if (pendiente <= 0.000001) {
            break;
          }


          // NO USAR LOTES VENCIDOS

          if (
            lote.estado !== "ACTIVO" ||
            !fechaValida(lote.fechaVencimiento) ||
            lote.fechaVencimiento < hoy ||
            lote.disponible <= 0
          ) {
            continue;
          }


          // TOMAR UNIDADES DEL LOTE

          const extraer = Math.min(
            pendiente,
            lote.disponible
          );


          // DESCONTAR EN MEMORIA

          lote.disponible = redondear(
            lote.disponible - extraer
          );

          pendiente = redondear(
            pendiente - extraer
          );


          // GUARDAR TRAZABILIDAD

          usados.push({
            loteId: lote.ref.id,

            numeroLote: lote.numeroLote,

            fechaVencimiento:
              lote.fechaVencimiento,

            cantidad: extraer
          });

          lotesModificados.add(
            lote.ref.id
          );
        }


        // VALIDAR LOTES SUFICIENTES

        if (pendiente > 0.000001) {
          throw new Error(
            `${producto.nombre}: faltan unidades en lotes vigentes. ` +
            "Regulariza el stock antiguo sin lote."
          );
        }
      }


      // ====================================
      // ACTUALIZAR STOCK EN MEMORIA
      // ====================================

      const nuevo = redondear(
        anterior - linea.cantidad
      );

      existencias.set(
        linea.productoId,
        nuevo
      );


      // GUARDAR DETALLE DE VENTA

      detalles.push({
        empresaId,

        ventaId: ventaRef.id,

        productoId: linea.productoId,

        nombreProducto:
          producto.nombre,

        cantidad:
          linea.cantidad,

        precioUnitario:
          linea.precioUnitario,

        subtotal:
          linea.subtotal,

        controlaVencimiento:
          producto.controlaVencimiento === true,

        lotesUsados:
          usados
      });


      // GUARDAR MOVIMIENTO

      movimientos.push({
        empresaId,
        sucursalId,

        productoId:
          linea.productoId,

        tipo:
          "VENTA",

        cantidad:
          linea.cantidad,

        stockAnterior:
          anterior,

        stockNuevo:
          nuevo,

        motivo:
          `Venta ${ventaRef.id}`,

        referenciaTipo:
          "VENTA",

        referenciaId:
          ventaRef.id,

        usuarioId,

        fechaRegistro:
          serverTimestamp()
      });
    }


    // ======================================
    // GUARDAR VENTA
    // ======================================

    tx.set(ventaRef, {
      empresaId,
      sucursalId,

      clienteId:
        clienteId || null,

      metodoPago,

      cajaId:
        cajaId || null,

      subtotal,

      descuento:
        descuentoNumero,

      total,

      estado:
        "COMPLETADA",

      observaciones:
        String(observaciones || "").trim(),

      usuarioId,

      fechaRegistro:
        serverTimestamp()
    });


    // ======================================
    // GUARDAR DETALLES Y MOVIMIENTOS
    // ======================================

    lineas.forEach((_, i) => {
      tx.set(
        detalleRefs[i],
        detalles[i]
      );

      tx.set(
        movimientoRefs[i],
        movimientos[i]
      );
    });


    // ======================================
    // ACTUALIZAR STOCK GENERAL
    // ======================================

    for (const id of ids) {
      tx.set(
        referencias.get(id),
        {
          empresaId,
          sucursalId,

          productoId:
            id,

          stock:
            existencias.get(id),

          fechaActualizacion:
            serverTimestamp()
        },
        {
          merge: true
        }
      );
    }


    // ======================================
    // ACTUALIZAR LOTES UTILIZADOS
    // ======================================

    for (const id of lotesModificados) {
      const lote = lotesPorId.get(id);

      tx.update(
        lote.ref,
        {
          cantidadDisponible:
            lote.disponible,

          fechaActualizacion:
            serverTimestamp()
        }
      );
    }


    // ======================================
    // VENTAS A CREDITO
    // ======================================

    if (cuentaRef) {
      tx.set(
        cuentaRef,
        {
          empresaId,
          clienteId,

          ventaId:
            ventaRef.id,

          referencia:
            ventaRef.id,

          total,

          saldo:
            total,

          estadoCuenta:
            "PENDIENTE",

          estado:
            "ACTIVO",

          fechaRegistro:
            serverTimestamp(),

          fechaActualizacion:
            serverTimestamp()
        }
      );
    }


    // ======================================
    // MOVIMIENTO DE CAJA
    // ======================================

    if (movCajaRef) {
      tx.set(
        movCajaRef,
        {
          empresaId,
          cajaId,
          sucursalId,

          tipo:
            "INGRESO",

          categoria:
            "VENTA",

          monto:
            total,

          descripcion:
            `Venta ${ventaRef.id}`,

          referenciaTipo:
            "VENTA",

          referenciaId:
            ventaRef.id,

          usuarioId,

          fechaRegistro:
            serverTimestamp()
        }
      );
    }
  });


  // ========================================
  // AUDITORIA DE VENTA
  // ========================================

  await auditar({
    empresaId,
    usuarioId,

    accion:
      "REGISTRAR_VENTA",

    modulo:
      "ventas",

    entidad:
      "venta",

    entidadId:
      ventaRef.id,

    detalle:
      `Venta ${ventaRef.id} por ${total.toFixed(2)}`
  });

  return ventaRef.id;
}


// ==========================================
// E. ANULAR VENTA Y RESTAURAR LOTES
// ==========================================

export async function anularVenta({
  ventaId,
  empresaId,
  usuarioId
}) {

  // ========================================
  // VALIDACIONES
  // ========================================

  if (
    !ventaId ||
    !empresaId ||
    !usuarioId
  ) {
    throw new Error(
      "Venta, empresa y usuario son obligatorios."
    );
  }


  const ventaRef = doc(
    db,
    "ventas",
    ventaId
  );


  // CONSULTAR VENTA ORIGINAL

  const ventaPrevia = await getDoc(
    ventaRef
  );

  if (
    !ventaPrevia.exists() ||
    ventaPrevia.data().empresaId !== empresaId
  ) {
    throw new Error(
      "No existe esta venta en tu empresa."
    );
  }


  // ========================================
  // BUSCAR DETALLES Y DEVOLUCIONES
  // ========================================

  const [
    detallesSnap,
    devolucionesSnap
  ] = await Promise.all([

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


  // OBTENER DETALLES DE ESTA VENTA

  const detalleRefs = detallesSnap.docs
    .filter(
      (d) => d.data().ventaId === ventaId
    )
    .map((d) => d.ref);


  if (!detalleRefs.length) {
    throw new Error(
      "La venta no tiene detalles registrados."
    );
  }


  // ========================================
  // EVITAR ANULACION CON DEVOLUCIONES
  // ========================================

  if (
    devolucionesSnap.docs.some(
      (d) =>
        d.data().ventaId === ventaId &&
        d.data().estado !== "ANULADA"
    )
  ) {
    throw new Error(
      "Esta venta tiene devoluciones registradas. " +
      "No se puede anular automáticamente porque " +
      "se duplicarían existencias. " +
      "Revisa el historial de devoluciones."
    );
  }


  // ========================================
  // BUSCAR CUENTAS POR COBRAR
  // ========================================

  const cuentasSnap =
    ventaPrevia.data().metodoPago === "CREDITO"

      ? await getDocs(
          query(
            collection(db, "cuentasCobrar"),
            where("empresaId", "==", empresaId)
          )
        )

      : null;


  const cuentaRefs = (
    cuentasSnap?.docs || []
  )
    .filter(
      (d) => d.data().ventaId === ventaId
    )
    .map(
      (d) => d.ref
    );


  // ========================================
  // TRANSACCION DE ANULACION
  // ========================================

  await runTransaction(db, async (tx) => {

    // ======================================
    // LEER VENTA
    // ======================================

    const ventaSnap = await tx.get(
      ventaRef
    );

    if (
      !ventaSnap.exists() ||
      ventaSnap.data().empresaId !== empresaId
    ) {
      throw new Error(
        "No existe esta venta en tu empresa."
      );
    }


    const venta = ventaSnap.data();


    // SOLO ANULAR VENTAS COMPLETADAS

    if (venta.estado !== "COMPLETADA") {
      throw new Error(
        venta.estado === "ANULADA"
          ? "Esta venta ya fue anulada."
          : "La venta no está completada."
      );
    }


    // DETECTAR CAMBIO DE METODO DE PAGO

    if (
      venta.metodoPago !==
      ventaPrevia.data().metodoPago
    ) {
      throw new Error(
        "Cambió el método de pago. Actualiza el historial."
      );
    }


    // ======================================
    // VALIDAR DEVOLUCIONES REGISTRADAS
    // ======================================

    const devueltos = Object.values(
      venta.devolucionesPorDetalle || {}
    );


    if (
      devueltos.some(
        (cantidad) => Number(cantidad) > 0
      )
    ) {
      throw new Error(
        "Esta venta tiene devoluciones. " +
        "No puede anularse automáticamente."
      );
    }


    // ======================================
    // LEER DETALLES
    // ======================================

    const detalles = [];

    for (const ref of detalleRefs) {
      const snap = await tx.get(ref);

      if (
        !snap.exists() ||
        snap.data().empresaId !== empresaId ||
        snap.data().ventaId !== ventaId
      ) {
        throw new Error(
          "Un detalle de venta cambió. Actualiza el historial."
        );
      }

      detalles.push(
        snap.data()
      );
    }


    // ======================================
    // AGRUPAR PRODUCTOS Y LOTES
    // ======================================

    const cantidades = new Map();

    const lotesRestaurar = new Map();


    for (const detalle of detalles) {
      const cantidad = Number(
        detalle.cantidad
      );

      if (
        !detalle.productoId ||
        !positivo(cantidad)
      ) {
        throw new Error(
          "La venta contiene cantidades inválidas."
        );
      }


      // AGRUPAR CANTIDADES POR PRODUCTO

      cantidades.set(
        detalle.productoId,
        redondear(
          (cantidades.get(detalle.productoId) || 0) +
          cantidad
        )
      );


      // OBTENER LOTES ORIGINALES

      const usados = detalle.lotesUsados;


      // CONTROLAR TRAZABILIDAD

      if (
        detalle.controlaVencimiento === true &&
        (
          !Array.isArray(usados) ||
          usados.length === 0
        )
      ) {
        throw new Error(
          "Esta venta no tiene lotes suficientes " +
          "para anularla de forma segura."
        );
      }


      if (
        usados != null &&
        !Array.isArray(usados)
      ) {
        throw new Error(
          "La información de lotes de la venta es inválida."
        );
      }


      let sumaUsada = 0;


      // AGRUPAR LOTES UTILIZADOS

      for (const usado of usados || []) {
        const n = Number(
          usado.cantidad
        );

        if (
          !usado.loteId ||
          !positivo(n)
        ) {
          throw new Error(
            "El detalle contiene un lote inválido."
          );
        }


        const anterior = lotesRestaurar.get(
          usado.loteId
        );


        if (
          anterior &&
          anterior.productoId !== detalle.productoId
        ) {
          throw new Error(
            "Un lote aparece asociado a productos diferentes."
          );
        }


        lotesRestaurar.set(
          usado.loteId,
          {
            productoId:
              detalle.productoId,

            cantidad:
              redondear(
                (anterior?.cantidad || 0) + n
              )
          }
        );


        sumaUsada = redondear(
          sumaUsada + n
        );
      }


      // VALIDAR QUE LOS LOTES SUMEN LO VENDIDO

      if (
        (
          detalle.controlaVencimiento === true ||
          (usados || []).length > 0
        ) &&
        Math.abs(sumaUsada - cantidad) > 0.000001
      ) {
        throw new Error(
          "Las cantidades de los lotes no coinciden " +
          "con las unidades vendidas."
        );
      }
    }


    // ======================================
    // LEER INVENTARIOS
    // ======================================

    const stocks = new Map();


    for (const [productoId, cantidad] of cantidades) {
      const ref = doc(
        db,
        "inventarios",
        `${venta.sucursalId}_${productoId}`
      );

      const snap = await tx.get(ref);


      if (
        snap.exists() &&
        snap.data().empresaId !== empresaId
      ) {
        throw new Error(
          "El inventario pertenece a otra empresa."
        );
      }


      const anterior = snap.exists()
        ? Number(snap.data().stock || 0)
        : 0;


      if (
        !Number.isFinite(anterior) ||
        anterior < 0
      ) {
        throw new Error(
          "El inventario tiene cantidades inválidas."
        );
      }


      stocks.set(
        productoId,
        {
          ref,
          cantidad,
          anterior
        }
      );
    }


    // ======================================
    // LEER LOTES QUE SE RESTAURARAN
    // ======================================

    const lotes = new Map();


    for (const [loteId, origen] of lotesRestaurar) {
      const ref = doc(
        db,
        "lotesInventario",
        loteId
      );

      const snap = await tx.get(ref);


      if (!snap.exists()) {
        throw new Error(
          "No se encontró uno de los lotes de la venta."
        );
      }


      const lote = snap.data();


      // VALIDAR EMPRESA, SUCURSAL Y PRODUCTO

      if (
        lote.empresaId !== empresaId ||
        lote.sucursalId !== venta.sucursalId ||
        lote.productoId !== origen.productoId ||
        lote.estado !== "ACTIVO"
      ) {
        throw new Error(
          "Un lote no pertenece a la venta o está inactivo."
        );
      }


      const disponible = Number(
        lote.cantidadDisponible || 0
      );

      const inicial = Number(
        lote.cantidadInicial || 0
      );

      const retirado = Number(
        lote.cantidadRetirada || 0
      );


      const nuevo = redondear(
        disponible + origen.cantidad
      );


      // EVITAR SUPERAR LA CANTIDAD INICIAL

      if (
        !Number.isFinite(nuevo) ||
        !Number.isFinite(inicial) ||
        !Number.isFinite(retirado) ||
        nuevo < 0 ||
        nuevo + retirado > inicial + 0.000001
      ) {
        throw new Error(
          "No es posible restaurar un lote: " +
          "su cantidad superaría la inicial."
        );
      }


      lotes.set(
        loteId,
        {
          ref,
          nuevo
        }
      );
    }


    // ======================================
    // VALIDAR CUENTAS POR COBRAR
    // ======================================

    const cuentas = [];


    if (venta.metodoPago === "CREDITO") {
      if (!cuentaRefs.length) {
        throw new Error(
          "No se encontró la cuenta por cobrar " +
          "de la venta a crédito."
        );
      }


      for (const ref of cuentaRefs) {
        const snap = await tx.get(ref);


        if (
          !snap.exists() ||
          snap.data().empresaId !== empresaId
        ) {
          throw new Error(
            "La cuenta por cobrar ya no está disponible."
          );
        }


        const cuenta = snap.data();


        // EVITAR ANULACION SI YA HUBO PAGOS

        if (
          Number(cuenta.saldo) + 0.000001 <
          Number(cuenta.total)
        ) {
          throw new Error(
            "Esta venta a crédito ya tiene cobros. " +
            "Revisa sus pagos antes de anular."
          );
        }


        cuentas.push(ref);
      }
    }


    // ======================================
    // TERMINARON TODAS LAS LECTURAS
    // ======================================


    // ACTUALIZAR ESTADO DE LA VENTA

    tx.update(
      ventaRef,
      {
        estado:
          "ANULADA",

        usuarioAnulacion:
          usuarioId,

        fechaAnulacion:
          serverTimestamp()
      }
    );


    // ======================================
    // RESTAURAR STOCK GENERAL
    // ======================================

    for (const [productoId, dato] of stocks) {
      const nuevo = redondear(
        dato.anterior + dato.cantidad
      );


      tx.set(
        dato.ref,
        {
          empresaId,

          sucursalId:
            venta.sucursalId,

          productoId,

          stock:
            nuevo,

          fechaActualizacion:
            serverTimestamp()
        },
        {
          merge: true
        }
      );


      // MOVIMIENTO DE ANULACION

      tx.set(
        doc(collection(db, "movimientosStock")),
        {
          empresaId,

          sucursalId:
            venta.sucursalId,

          productoId,

          tipo:
            "ANULACION_VENTA",

          cantidad:
            dato.cantidad,

          stockAnterior:
            dato.anterior,

          stockNuevo:
            nuevo,

          motivo:
            `Anulación venta ${ventaId}`,

          referenciaTipo:
            "VENTA",

          referenciaId:
            ventaId,

          usuarioId,

          fechaRegistro:
            serverTimestamp()
        }
      );
    }


    // ======================================
    // RESTAURAR LOTES
    // ======================================

    for (const lote of lotes.values()) {
      tx.update(
        lote.ref,
        {
          cantidadDisponible:
            lote.nuevo,

          fechaActualizacion:
            serverTimestamp()
        }
      );
    }


    // ======================================
    // REVERTIR MOVIMIENTO DE CAJA
    // ======================================

    if (
      venta.metodoPago === "EFECTIVO" &&
      venta.cajaId
    ) {
      tx.set(
        doc(collection(db, "movimientosCaja")),
        {
          empresaId,

          cajaId:
            venta.cajaId,

          sucursalId:
            venta.sucursalId,

          tipo:
            "EGRESO",

          categoria:
            "ANULACION_VENTA",

          monto:
            Number(venta.total || 0),

          descripcion:
            `Reversión venta ${ventaId}`,

          referenciaTipo:
            "VENTA",

          referenciaId:
            ventaId,

          usuarioId,

          fechaRegistro:
            serverTimestamp()
        }
      );
    }


    // ======================================
    // ANULAR CUENTAS POR COBRAR
    // ======================================

    for (const ref of cuentas) {
      tx.update(
        ref,
        {
          saldo:
            0,

          estadoCuenta:
            "ANULADA",

          fechaActualizacion:
            serverTimestamp()
        }
      );
    }

  });


  // ========================================
  // REGISTRAR AUDITORIA
  // ========================================

  await auditar({
    empresaId,
    usuarioId,

    accion:
      "ANULAR_VENTA",

    modulo:
      "ventas",

    entidad:
      "venta",

    entidadId:
      ventaId,

    detalle:
      `Anulación de venta ${ventaId}`
  });
}