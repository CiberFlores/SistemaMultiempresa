import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where
} from "firebase/firestore";

import { db } from "./firebase/firebaseConfig";
import { registrarAuditoria } from "./auditService";


// ==========================================
// A. OBTENER FECHA ACTUAL
// ==========================================

function fechaHoy() {
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
// B. VALIDAR FECHAS
// ==========================================

function fechaValida(valor) {
  if (
    typeof valor !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(valor)
  ) {
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
// C. CALCULAR DIAS RESTANTES
// ==========================================

function calcularDias(fechaVencimiento) {
  if (!fechaValida(fechaVencimiento)) {
    return null;
  }

  const inicio = Date.parse(
    `${fechaHoy()}T00:00:00Z`
  );

  const final = Date.parse(
    `${fechaVencimiento}T00:00:00Z`
  );

  return Math.round(
    (final - inicio) / 86400000
  );
}


// ==========================================
// D. FUNCIONES DE CANTIDADES
// ==========================================

function cantidadSegura(valor) {
  return Math.round(
    (Number(valor) + Number.EPSILON) *
    1000000
  ) / 1000000;
}

function cantidadPositiva(valor) {
  return (
    Number.isFinite(Number(valor)) &&
    Number(valor) > 0
  );
}


// ==========================================
// E. COMPARAR FECHAS DE FIRESTORE
// ==========================================

// AYUDA A DETECTAR SI OTRO USUARIO
// MODIFICO EL INVENTARIO.

function firmaFecha(valor) {
  if (
    valor &&
    typeof valor.seconds === "number"
  ) {
    return (
      `${valor.seconds}:${valor.nanoseconds || 0}`
    );
  }

  return JSON.stringify(valor ?? null);
}


// ==========================================
// F. ESCUCHAR INVENTARIO
// ==========================================

export function suscribirInventario(
  empresaId,
  callback,
  errorCallback
) {
  const consulta = query(
    collection(db, "inventarios"),
    where("empresaId", "==", empresaId)
  );

  return onSnapshot(
    consulta,

    (snapshot) => {
      const inventarios = snapshot.docs.map(
        (documento) => ({
          id: documento.id,
          ...documento.data()
        })
      );

      callback(inventarios);
    },

    errorCallback
  );
}


// ==========================================
// G. OBTENER PRODUCTOS Y SUCURSALES
// ==========================================

export async function obtenerCatalogosInventario(
  empresaId
) {
  const [
    productosSnapshot,
    sucursalesSnapshot
  ] = await Promise.all([

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
    )

  ]);

  return {
    productos: productosSnapshot.docs
      .map((documento) => ({
        id: documento.id,
        ...documento.data()
      }))
      .filter(
        (producto) =>
          producto.estado === "ACTIVO"
      ),

    sucursales: sucursalesSnapshot.docs
      .map((documento) => ({
        id: documento.id,
        ...documento.data()
      }))
      .filter(
        (sucursal) =>
          sucursal.estado === "ACTIVA"
      )
  };
}


// ==========================================
// H. LISTAR LOTES DE INVENTARIO
// ==========================================

export async function listarLotesInventario(
  empresaId
) {
  if (!empresaId) {
    throw new Error(
      "Debes seleccionar una empresa."
    );
  }

  const [
    lotesSnapshot,
    productosSnapshot
  ] = await Promise.all([

    getDocs(
      query(
        collection(db, "lotesInventario"),
        where("empresaId", "==", empresaId)
      )
    ),

    getDocs(
      query(
        collection(db, "productos"),
        where("empresaId", "==", empresaId)
      )
    )

  ]);

  const productos = new Map(
    productosSnapshot.docs.map(
      (documento) => [
        documento.id,
        documento.data()
      ]
    )
  );

  const lotes = lotesSnapshot.docs.map(
    (documento) => {
      const lote = documento.data();

      const producto = productos.get(
        lote.productoId
      );

      const disponible = Number(
        lote.cantidadDisponible || 0
      );

      const diasRestantes = calcularDias(
        lote.fechaVencimiento
      );

      const diasAlerta = Number(
        producto?.diasAlertaVencimiento ?? 15
      );

      let estadoVencimiento = "VIGENTE";

      if (
        lote.estado !== "ACTIVO" ||
        disponible <= 0
      ) {
        estadoVencimiento = "SIN_EXISTENCIAS";

      } else if (
        diasRestantes === null
      ) {
        estadoVencimiento = "FECHA_INVALIDA";

      } else if (
        diasRestantes < 0
      ) {
        estadoVencimiento = "VENCIDO";

      } else if (
        diasRestantes <= diasAlerta
      ) {
        estadoVencimiento = "POR_VENCER";
      }

      return {
        id: documento.id,
        ...lote,

        nombreProducto:
          producto?.nombre || "Producto",

        sku:
          producto?.sku || "",

        diasRestantes,
        diasAlerta,
        estadoVencimiento,

        cantidadRetirada: Number(
          lote.cantidadRetirada || 0
        )
      };
    }
  );

  lotes.sort((a, b) =>
    String(a.fechaVencimiento || "")
      .localeCompare(
        String(b.fechaVencimiento || "")
      )
  );

  return lotes;
}


// ==========================================
// I. AJUSTAR STOCK NORMAL
// ==========================================

// SOLO PARA PRODUCTOS SIN CONTROL
// DE VENCIMIENTO.

export async function ajustarStock({
  empresaId,
  sucursalId,
  productoId,
  tipo,
  cantidad,
  motivo,
  usuarioId
}) {
  const cantidadNumero = Number(cantidad);

  if (
    !empresaId ||
    !sucursalId ||
    !productoId
  ) {
    throw new Error(
      "Empresa, sucursal y producto son obligatorios."
    );
  }

  if (!cantidadPositiva(cantidadNumero)) {
    throw new Error(
      "La cantidad debe ser mayor que cero."
    );
  }

  const tiposPermitidos = [
    "ENTRADA",
    "SALIDA",
    "AJUSTE_POSITIVO",
    "AJUSTE_NEGATIVO"
  ];

  if (!tiposPermitidos.includes(tipo)) {
    throw new Error(
      "Tipo de movimiento inválido."
    );
  }

  const productoRef = doc(
    db,
    "productos",
    productoId
  );

  const sucursalRef = doc(
    db,
    "sucursales",
    sucursalId
  );

  const inventarioRef = doc(
    db,
    "inventarios",
    `${sucursalId}_${productoId}`
  );

  const movimientoRef = doc(
    collection(db, "movimientosStock")
  );

  await runTransaction(
    db,
    async (transaccion) => {

      // LEER TODOS LOS DOCUMENTOS

      const productoSnapshot =
        await transaccion.get(productoRef);

      const sucursalSnapshot =
        await transaccion.get(sucursalRef);

      const inventarioSnapshot =
        await transaccion.get(inventarioRef);


      // VALIDAR PRODUCTO

      if (
        !productoSnapshot.exists() ||
        productoSnapshot.data().empresaId !== empresaId ||
        productoSnapshot.data().estado !== "ACTIVO"
      ) {
        throw new Error(
          "Producto inexistente, inactivo o de otra empresa."
        );
      }


      // BLOQUEAR AJUSTES DE PERECEDEROS

      if (
        productoSnapshot.data().controlaVencimiento === true
      ) {
        throw new Error(
          "Este producto controla vencimientos. " +
          "Gestiona sus existencias por lotes."
        );
      }


      // VALIDAR SUCURSAL

      if (
        !sucursalSnapshot.exists() ||
        sucursalSnapshot.data().empresaId !== empresaId ||
        sucursalSnapshot.data().estado !== "ACTIVA"
      ) {
        throw new Error(
          "Sucursal inexistente, inactiva o de otra empresa."
        );
      }


      // VALIDAR INVENTARIO

      if (
        inventarioSnapshot.exists() &&
        inventarioSnapshot.data().empresaId !== empresaId
      ) {
        throw new Error(
          "El inventario pertenece a otra empresa."
        );
      }

      const stockAnterior =
        inventarioSnapshot.exists()
          ? Number(
              inventarioSnapshot.data().stock || 0
            )
          : 0;

      const esEntrada =
        tipo === "ENTRADA" ||
        tipo === "AJUSTE_POSITIVO";

      const stockNuevo = cantidadSegura(
        stockAnterior +
        (esEntrada ? cantidadNumero : -cantidadNumero)
      );

      if (
        !Number.isFinite(stockNuevo) ||
        stockNuevo < 0
      ) {
        throw new Error(
          `Stock insuficiente. Stock actual: ${stockAnterior}.`
        );
      }


      // GUARDAR EXISTENCIAS

      transaccion.set(
        inventarioRef,
        {
          empresaId,
          sucursalId,
          productoId,

          stock: stockNuevo,

          fechaActualizacion:
            serverTimestamp()
        },
        { merge: true }
      );


      // HISTORIAL

      transaccion.set(
        movimientoRef,
        {
          empresaId,
          sucursalId,
          productoId,

          tipo,

          cantidad: cantidadNumero,

          stockAnterior,
          stockNuevo,

          motivo:
            String(motivo || "").trim(),

          usuarioId:
            usuarioId || null,

          fechaRegistro:
            serverTimestamp()
        }
      );
    }
  );
}


// ==========================================
// J. REGULARIZAR STOCK ANTIGUO
// ==========================================

// CREA UN LOTE PARA UNIDADES QUE YA
// EXISTEN FISICAMENTE.
//
// NO AUMENTA EL STOCK GENERAL.
//
// IMPORTANTE:
// SE NECESITAN LAS REGLAS DE FIRESTORE
// ACTUALIZADAS ANTES DE USAR ESTA FUNCION.

export async function regularizarStockSinLote({
  empresaId,
  sucursalId,
  productoId,
  numeroLote,
  fechaVencimiento,
  cantidad,
  motivo,
  usuarioId
}) {

  // VALIDAR DATOS

  const cantidadNumero = Number(cantidad);

  const codigo = String(
    numeroLote || ""
  ).trim().toUpperCase();

  const explicacion = String(
    motivo || "Inventario inicial verificado físicamente"
  ).trim();

  if (
    !empresaId ||
    !sucursalId ||
    !productoId ||
    !usuarioId
  ) {
    throw new Error(
      "Empresa, sucursal, producto y usuario son obligatorios."
    );
  }

  if (
    !codigo ||
    codigo.length > 60
  ) {
    throw new Error(
      "El número de lote debe tener entre 1 y 60 caracteres."
    );
  }

  if (!fechaValida(fechaVencimiento)) {
    throw new Error(
      "La fecha de vencimiento del lote no es válida."
    );
  }

  if (!cantidadPositiva(cantidadNumero)) {
    throw new Error(
      "La cantidad debe ser mayor que cero."
    );
  }

  if (explicacion.length < 5) {
    throw new Error(
      "Explica el origen de la regularización."
    );
  }


  // REFERENCIAS

  const inventarioRef = doc(
    db,
    "inventarios",
    `${sucursalId}_${productoId}`
  );

  const productoRef = doc(
    db,
    "productos",
    productoId
  );

  const sucursalRef = doc(
    db,
    "sucursales",
    sucursalId
  );

  const loteRef = doc(
    collection(db, "lotesInventario")
  );

  const movimientoRef = doc(
    collection(db, "movimientosStock")
  );


  // ========================================
  // LEER INVENTARIO ANTES DE LOS LOTES
  // ========================================

  const baseSnapshot = await getDoc(
    inventarioRef
  );

  if (
    !baseSnapshot.exists() ||
    baseSnapshot.data().empresaId !== empresaId
  ) {
    throw new Error(
      "No existe inventario físico de este producto en la sucursal."
    );
  }

  const stockBase = Number(
    baseSnapshot.data().stock
  );

  const versionBase = Number(
    baseSnapshot.data().regularizacionVersion || 0
  );

  const fechaBase = firmaFecha(
    baseSnapshot.data().fechaActualizacion
  );

  if (
    !Number.isFinite(stockBase) ||
    stockBase <= 0
  ) {
    throw new Error(
      "No hay existencias físicas que regularizar."
    );
  }


  // ========================================
  // CONSULTAR LOTES EXISTENTES
  // ========================================

  const lotesSnapshot = await getDocs(
    query(
      collection(db, "lotesInventario"),
      where("empresaId", "==", empresaId)
    )
  );

  const existentes = lotesSnapshot.docs.filter(
    (documento) =>
      documento.data().productoId === productoId &&
      documento.data().sucursalId === sucursalId
  );

  if (existentes.length > 100) {
    throw new Error(
      "Este producto tiene demasiados lotes para regularizarlo desde esta pantalla."
    );
  }


  // EVITAR NUMEROS DE LOTE DUPLICADOS

  const loteDuplicado = existentes.some(
    (documento) =>
      String(
        documento.data().numeroLote || ""
      )
        .trim()
        .toUpperCase() === codigo
  );

  if (loteDuplicado) {
    throw new Error(
      "Ya existe un lote con ese número para este producto y sucursal."
    );
  }


  // ========================================
  // CALCULAR EXISTENCIAS SIN LOTE
  // ========================================

  const totalLotesBase = cantidadSegura(
    existentes.reduce(
      (suma, documento) =>
        suma + Number(
          documento.data().cantidadDisponible || 0
        ),
      0
    )
  );

  if (
    !Number.isFinite(totalLotesBase) ||
    totalLotesBase < 0
  ) {
    throw new Error(
      "Las cantidades de los lotes existentes no son válidas."
    );
  }

  const sinLoteBase = cantidadSegura(
    stockBase - totalLotesBase
  );

  if (sinLoteBase < 0) {
    throw new Error(
      "Los lotes superan el stock físico. Corrige primero el descuadre."
    );
  }

  if (
    cantidadNumero > sinLoteBase + 0.000001
  ) {
    throw new Error(
      `Solo hay ${sinLoteBase} unidades físicas sin lote para regularizar.`
    );
  }


  // ========================================
  // TRANSACCION DE REGULARIZACION
  // ========================================

  await runTransaction(
    db,
    async (transaccion) => {

      // PRIMERO LEER TODOS LOS DOCUMENTOS

      const inventarioSnapshot =
        await transaccion.get(inventarioRef);

      const productoSnapshot =
        await transaccion.get(productoRef);

      const sucursalSnapshot =
        await transaccion.get(sucursalRef);


      // VALIDAR INVENTARIO

      if (
        !inventarioSnapshot.exists() ||
        inventarioSnapshot.data().empresaId !== empresaId
      ) {
        throw new Error(
          "El inventario ya no está disponible."
        );
      }


      // VALIDAR PRODUCTO

      if (
        !productoSnapshot.exists() ||
        productoSnapshot.data().empresaId !== empresaId ||
        productoSnapshot.data().estado !== "ACTIVO" ||
        productoSnapshot.data().controlaVencimiento !== true
      ) {
        throw new Error(
          "El producto debe estar activo y controlar vencimientos."
        );
      }


      // VALIDAR SUCURSAL

      if (
        !sucursalSnapshot.exists() ||
        sucursalSnapshot.data().empresaId !== empresaId ||
        sucursalSnapshot.data().estado !== "ACTIVA"
      ) {
        throw new Error(
          "La sucursal debe estar activa y pertenecer a tu empresa."
        );
      }


      // ====================================
      // DETECTAR CAMBIOS SIMULTANEOS
      // ====================================

      const inventario = inventarioSnapshot.data();

      if (
        Number(inventario.stock) !== stockBase ||

        Number(
          inventario.regularizacionVersion || 0
        ) !== versionBase ||

        firmaFecha(
          inventario.fechaActualizacion
        ) !== fechaBase
      ) {
        throw new Error(
          "El inventario cambió mientras se regularizaba. " +
          "Actualiza la página e inténtalo nuevamente."
        );
      }


      // ====================================
      // COMPROBAR LOTES EXISTENTES
      // ====================================

      let totalVerificado = 0;

      for (const anterior of existentes) {
        const loteSnapshot =
          await transaccion.get(anterior.ref);

        if (
          !loteSnapshot.exists() ||

          loteSnapshot.data().empresaId !== empresaId ||

          loteSnapshot.data().sucursalId !== sucursalId ||

          loteSnapshot.data().productoId !== productoId ||

          Number(
            loteSnapshot.data().cantidadDisponible || 0
          ) !== Number(
            anterior.data().cantidadDisponible || 0
          )
        ) {
          throw new Error(
            "Un lote cambió durante la regularización. " +
            "Actualiza e inténtalo nuevamente."
          );
        }

        totalVerificado += Number(
          loteSnapshot.data().cantidadDisponible || 0
        );
      }


      // CALCULAR NUEVAMENTE LA CANTIDAD SIN LOTE

      const sinLote = cantidadSegura(
        Number(inventario.stock) -
        totalVerificado
      );

      if (
        !Number.isFinite(sinLote) ||
        sinLote < 0 ||
        cantidadNumero > sinLote + 0.000001
      ) {
        throw new Error(
          `Cantidad incorrecta. Actualmente hay ${sinLote} unidades sin lote.`
        );
      }


      // ====================================
      // TODAS LAS LECTURAS HAN TERMINADO
      // ====================================


      // ====================================
      // CREAR LOTE SIN CREAR COMPRA
      // ====================================

      transaccion.set(
        loteRef,
        {
          empresaId,
          sucursalId,
          productoId,

          compraId: null,

          origen: "REGULARIZACION_INICIAL",

          regularizacionId:
            movimientoRef.id,

          numeroLote:
            codigo,

          fechaVencimiento,

          cantidadInicial:
            cantidadNumero,

          cantidadDisponible:
            cantidadNumero,

          cantidadRetirada:
            0,

          estado:
            "ACTIVO",

          usuarioId,

          motivoRegularizacion:
            explicacion,

          fechaRegistro:
            serverTimestamp(),

          fechaActualizacion:
            serverTimestamp()
        }
      );


      // ====================================
      // NO AUMENTAR EL STOCK FISICO
      // ====================================

      // SOLO ACTUALIZAR LA VERSION PARA
      // DETECTAR REGULARIZACIONES SIMULTANEAS.

      transaccion.update(
        inventarioRef,
        {
          regularizacionVersion:
            versionBase + 1,

          ultimaRegularizacionId:
            movimientoRef.id,

          fechaActualizacion:
            serverTimestamp()
        }
      );


      // ====================================
      // REGISTRAR HISTORIAL
      // ====================================

      transaccion.set(
        movimientoRef,
        {
          empresaId,
          sucursalId,
          productoId,

          loteId:
            loteRef.id,

          numeroLote:
            codigo,

          tipo:
            "REGULARIZACION_LOTE",

          cantidad:
            cantidadNumero,

          stockAnterior:
            stockBase,

          stockNuevo:
            stockBase,

          motivo:
            explicacion,

          usuarioId,

          fechaRegistro:
            serverTimestamp()
        }
      );
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
        "REGULARIZACION_LOTE",

      modulo:
        "inventario",

      entidad:
        "lote",

      entidadId:
        loteRef.id,

      detalle:
        `${codigo}: ${cantidadNumero} unidades existentes. ` +
        `Vencimiento: ${fechaVencimiento}. ${explicacion}`
    });

  } catch (error) {
    console.warn(
      "La regularización se guardó, pero falló la auditoría:",
      error
    );
  }

  return loteRef.id;
}


// ==========================================
// K. DAR DE BAJA UN LOTE VENCIDO
// ==========================================

export async function darDeBajaLoteVencido({
  empresaId,
  loteId,
  cantidad,
  motivo,
  usuarioId
}) {
  const cantidadNumero = Number(cantidad);

  const motivoTexto = String(
    motivo || "Producto vencido"
  ).trim();

  if (
    !empresaId ||
    !loteId ||
    !usuarioId
  ) {
    throw new Error(
      "Faltan datos para registrar la baja."
    );
  }

  if (!cantidadPositiva(cantidadNumero)) {
    throw new Error(
      "La cantidad a retirar debe ser mayor que cero."
    );
  }

  if (motivoTexto.length < 5) {
    throw new Error(
      "Indica el motivo de la baja."
    );
  }

  const loteRef = doc(
    db,
    "lotesInventario",
    loteId
  );

  const movimientoRef = doc(
    collection(db, "movimientosStock")
  );


  // ========================================
  // TRANSACCION DE BAJA
  // ========================================

  await runTransaction(
    db,
    async (transaccion) => {

      const loteSnapshot =
        await transaccion.get(loteRef);

      if (!loteSnapshot.exists()) {
        throw new Error(
          "El lote seleccionado no existe."
        );
      }

      const lote = loteSnapshot.data();


      // VALIDAR LOTE

      if (
        lote.empresaId !== empresaId ||
        lote.estado !== "ACTIVO"
      ) {
        throw new Error(
          "El lote no pertenece a tu empresa o no está activo."
        );
      }

      if (!fechaValida(lote.fechaVencimiento)) {
        throw new Error(
          "El lote tiene una fecha inválida."
        );
      }

      if (
        lote.fechaVencimiento >= fechaHoy()
      ) {
        throw new Error(
          "Este lote todavía no está vencido."
        );
      }


      // VALIDAR CANTIDAD

      const disponible = Number(
        lote.cantidadDisponible || 0
      );

      if (
        !Number.isFinite(disponible) ||
        disponible <= 0 ||
        cantidadNumero > disponible
      ) {
        throw new Error(
          `Solo puedes retirar ${disponible} unidades de este lote.`
        );
      }


      // ====================================
      // LEER PRODUCTO, SUCURSAL Y STOCK
      // ====================================

      const inventarioRef = doc(
        db,
        "inventarios",
        `${lote.sucursalId}_${lote.productoId}`
      );

      const productoSnapshot =
        await transaccion.get(
          doc(db, "productos", lote.productoId)
        );

      const sucursalSnapshot =
        await transaccion.get(
          doc(db, "sucursales", lote.sucursalId)
        );

      const inventarioSnapshot =
        await transaccion.get(inventarioRef);


      // VALIDAR PRODUCTO

      if (
        !productoSnapshot.exists() ||
        productoSnapshot.data().empresaId !== empresaId ||
        productoSnapshot.data().controlaVencimiento !== true
      ) {
        throw new Error(
          "El producto no tiene control de vencimiento habilitado."
        );
      }


      // VALIDAR SUCURSAL

      if (
        !sucursalSnapshot.exists() ||
        sucursalSnapshot.data().empresaId !== empresaId
      ) {
        throw new Error(
          "La sucursal del lote no es válida."
        );
      }


      // VALIDAR INVENTARIO

      if (
        !inventarioSnapshot.exists() ||
        inventarioSnapshot.data().empresaId !== empresaId
      ) {
        throw new Error(
          "No se encontró el inventario físico del lote."
        );
      }

      const stockAnterior = Number(
        inventarioSnapshot.data().stock || 0
      );

      if (
        !Number.isFinite(stockAnterior) ||
        stockAnterior < cantidadNumero
      ) {
        throw new Error(
          "El inventario físico no tiene suficientes unidades."
        );
      }


      // ====================================
      // CALCULAR NUEVAS CANTIDADES
      // ====================================

      const stockNuevo = cantidadSegura(
        stockAnterior - cantidadNumero
      );

      const disponibleNuevo = cantidadSegura(
        disponible - cantidadNumero
      );

      const retiradoNuevo = cantidadSegura(
        Number(lote.cantidadRetirada || 0) +
        cantidadNumero
      );


      // ====================================
      // ACTUALIZAR LOTE
      // ====================================

      transaccion.update(
        loteRef,
        {
          cantidadDisponible:
            disponibleNuevo,

          cantidadRetirada:
            retiradoNuevo,

          ultimaBajaId:
            movimientoRef.id,

          fechaUltimaBaja:
            serverTimestamp(),

          fechaActualizacion:
            serverTimestamp()
        }
      );


      // ====================================
      // DESCONTAR STOCK FISICO
      // ====================================

      transaccion.set(
        inventarioRef,
        {
          empresaId,

          sucursalId:
            lote.sucursalId,

          productoId:
            lote.productoId,

          stock:
            stockNuevo,

          fechaActualizacion:
            serverTimestamp()
        },
        { merge: true }
      );


      // ====================================
      // REGISTRAR HISTORIAL
      // ====================================

      transaccion.set(
        movimientoRef,
        {
          empresaId,

          sucursalId:
            lote.sucursalId,

          productoId:
            lote.productoId,

          loteId,

          numeroLote:
            lote.numeroLote,

          tipo:
            "BAJA_VENCIMIENTO",

          cantidad:
            cantidadNumero,

          stockAnterior,
          stockNuevo,

          motivo:
            motivoTexto,

          usuarioId,

          fechaRegistro:
            serverTimestamp()
        }
      );
    }
  );


  // ========================================
  // AUDITORIA
  // ========================================

  try {
    await registrarAuditoria({
      empresaId,
      usuarioId,

      accion:
        "BAJA_PRODUCTO_VENCIDO",

      modulo:
        "inventario",

      entidad:
        "lote",

      entidadId:
        loteId,

      detalle:
        `Baja de ${cantidadNumero} unidades. ${motivoTexto}`
    });

  } catch (error) {
    console.warn(
      "La baja se registró, pero falló la auditoría:",
      error
    );
  }

  return movimientoRef.id;
}