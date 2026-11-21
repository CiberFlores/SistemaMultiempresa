import {
  addDoc,
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


// ==========================================
// A. REFERENCIA DE PRODUCTOS
// ==========================================

const productosRef = collection(
  db,
  "productos"
);


// ==========================================
// B. ESCUCHAR PRODUCTOS DE UNA EMPRESA
// ==========================================

export function suscribirProductos(
  empresaId,
  callback,
  errorCallback
) {

  if (!empresaId) {
    throw new Error(
      "No hay empresa asignada."
    );
  }

  const consulta = query(
    productosRef,
    where("empresaId", "==", empresaId)
  );

  return onSnapshot(
    consulta,

    (snapshot) => {

      const productos = snapshot.docs.map(
        (documento) => ({
          id: documento.id,
          ...documento.data()
        })
      );

      // ORDENAR POR NOMBRE

      productos.sort((a, b) =>
        (a.nombre || "").localeCompare(
          b.nombre || ""
        )
      );

      callback(productos);
    },

    errorCallback
  );
}


// ==========================================
// C. COMPROBAR SI EL SKU ESTA DISPONIBLE
// ==========================================

async function skuDisponible(
  empresaId,
  sku,
  excluirId = null
) {

  const consulta = query(
    productosRef,
    where("empresaId", "==", empresaId)
  );

  const snapshot = await getDocs(
    consulta
  );

  const buscado = String(sku || "")
    .trim()
    .toUpperCase();

  return !snapshot.docs.some((documento) => {

    if (documento.id === excluirId) {
      return false;
    }

    const skuExistente = String(
      documento.data().sku || ""
    )
      .trim()
      .toUpperCase();

    return skuExistente === buscado;

  });
}


// ==========================================
// D. VALIDAR NUMEROS
// ==========================================

function numeroNoNegativo(
  valor,
  nombre
) {

  const numero = Number(
    valor === "" || valor == null
      ? 0
      : valor
  );

  if (
    !Number.isFinite(numero) ||
    numero < 0
  ) {
    throw new Error(
      `${nombre} debe ser un número mayor o igual a cero.`
    );
  }

  return numero;
}


// ==========================================
// E. VALIDAR FECHA
// ==========================================

function validarFechaReferencia(fecha) {

  if (!fecha) {
    return "";
  }

  const formatoCorrecto =
    /^\d{4}-\d{2}-\d{2}$/.test(fecha);

  if (!formatoCorrecto) {
    throw new Error(
      "La fecha de vencimiento debe tener el formato AAAA-MM-DD."
    );
  }

  const fechaConvertida = new Date(
    `${fecha}T12:00:00Z`
  );

  if (
    Number.isNaN(fechaConvertida.getTime()) ||
    fechaConvertida.toISOString().slice(0, 10) !== fecha
  ) {
    throw new Error(
      "La fecha de vencimiento de referencia no es válida."
    );
  }

  return fecha;
}


// ==========================================
// F. PREPARAR DATOS DEL PRODUCTO
// ==========================================

function prepararProducto(datos) {

  const sku = String(
    datos.sku || ""
  )
    .trim()
    .toUpperCase();

  const nombre = String(
    datos.nombre || ""
  ).trim();


  // VALIDAR CAMPOS OBLIGATORIOS

  if (!sku || !nombre) {
    throw new Error(
      "SKU y nombre son obligatorios."
    );
  }


  // CONTROL DE VENCIMIENTO

  const controlaVencimiento =
    datos.controlaVencimiento === true;


  // DIAS DE ALERTA

  const dias = controlaVencimiento
    ? Number(
        datos.diasAlertaVencimiento ?? 15
      )
    : 15;


  if (
    controlaVencimiento &&
    (
      !Number.isInteger(dias) ||
      dias < 1 ||
      dias > 365
    )
  ) {
    throw new Error(
      "Los días de aviso deben estar entre 1 y 365."
    );
  }


  // FECHA DE REFERENCIA DEL CATALOGO

  const fechaReferencia = controlaVencimiento
    ? String(
        datos.fechaVencimientoReferencia || ""
      ).trim()
    : "";


  validarFechaReferencia(
    fechaReferencia
  );


  // ========================================
  // CAMPOS PERMITIDOS
  // ========================================

  return {

    sku,

    nombre,

    codigoBarras: String(
      datos.codigoBarras || ""
    ).trim(),

    descripcion: String(
      datos.descripcion || ""
    ).trim(),

    categoriaId:
      datos.categoriaId || null,

    marcaId:
      datos.marcaId || null,

    costo: numeroNoNegativo(
      datos.costo,
      "El costo"
    ),

    precioVenta: numeroNoNegativo(
      datos.precioVenta,
      "El precio de venta"
    ),

    stockMinimo: numeroNoNegativo(
      datos.stockMinimo,
      "El stock mínimo"
    ),

    unidad: String(
      datos.unidad || "unidad"
    ).trim() || "unidad",

    imagenUrl: String(
      datos.imagenUrl || ""
    ).trim(),


    // CONTROL DE VENCIMIENTO

    controlaVencimiento,

    diasAlertaVencimiento: dias,


    // FECHA INFORMATIVA DEL CATALOGO
    // NO REEMPLAZA LAS FECHAS DE LOS LOTES.

    fechaVencimientoReferencia:
      fechaReferencia,


    fechaActualizacion:
      serverTimestamp()

  };
}


// ==========================================
// G. COMPROBAR SI PODEMOS DESACTIVAR
// EL CONTROL DE VENCIMIENTO
// ==========================================

async function validarDesactivacionVencimiento(
  empresaId,
  productoId
) {

  // CONSULTAR INVENTARIOS Y LOTES
  // SOLO DE ESTA EMPRESA.

  const [
    inventariosSnap,
    lotesSnap
  ] = await Promise.all([

    getDocs(
      query(
        collection(db, "inventarios"),
        where("empresaId", "==", empresaId)
      )
    ),

    getDocs(
      query(
        collection(db, "lotesInventario"),
        where("empresaId", "==", empresaId)
      )
    )

  ]);


  // ========================================
  // VERIFICAR EXISTENCIAS FISICAS
  // ========================================

  const tieneExistencias = inventariosSnap.docs.some(
    (documento) => {

      const inventario = documento.data();

      return (
        inventario.productoId === productoId &&
        Number(inventario.stock || 0) > 0
      );

    }
  );

  if (tieneExistencias) {

    throw new Error(
      "No puedes desactivar el control de vencimiento " +
      "porque este producto todavía tiene existencias. " +
      "Primero debes resolver su inventario."
    );

  }


  // ========================================
  // VERIFICAR LOTES REGISTRADOS
  // ========================================

  const tieneLotes = lotesSnap.docs.some(
    (documento) =>
      documento.data().productoId === productoId
  );

  if (tieneLotes) {

    throw new Error(
      "No puedes desactivar el control de vencimiento " +
      "porque este producto tiene lotes registrados. " +
      "Se debe conservar su historial."
    );

  }

}


// ==========================================
// H. CREAR PRODUCTO
// ==========================================

export async function crearProducto(
  empresaId,
  datos
) {

  if (!empresaId) {
    throw new Error(
      "No hay empresa asignada."
    );
  }


  // PREPARAR PRODUCTO

  const producto = prepararProducto(
    datos
  );


  // VALIDAR SKU

  const disponible = await skuDisponible(
    empresaId,
    producto.sku
  );

  if (!disponible) {
    throw new Error(
      "Ya existe un producto con ese SKU."
    );
  }


  // GUARDAR PRODUCTO

  return addDoc(
    productosRef,
    {

      ...producto,

      empresaId,

      estado: "ACTIVO",

      fechaRegistro:
        serverTimestamp()

    }
  );
}


// ==========================================
// I. ACTUALIZAR PRODUCTO
// ==========================================

export async function actualizarProducto(
  productoId,
  empresaId,
  datos
) {

  if (!productoId || !empresaId) {
    throw new Error(
      "Faltan datos del producto."
    );
  }


  // ========================================
  // PREPARAR CAMBIOS
  // ========================================

  const productoNuevo = prepararProducto(
    datos
  );

  const productoRef = doc(
    db,
    "productos",
    productoId
  );


  // ========================================
  // CONSULTAR PRODUCTO ACTUAL
  // ========================================

  const actualSnap = await getDoc(
    productoRef
  );

  if (!actualSnap.exists()) {
    throw new Error(
      "El producto no existe."
    );
  }

  const productoActual = actualSnap.data();


  // VERIFICAR EMPRESA

  if (
    productoActual.empresaId !== empresaId
  ) {
    throw new Error(
      "Este producto no pertenece a tu empresa."
    );
  }


  // ========================================
  // COMPROBAR SKU
  // ========================================

  const disponible = await skuDisponible(
    empresaId,
    productoNuevo.sku,
    productoId
  );

  if (!disponible) {
    throw new Error(
      "Ya existe otro producto con ese SKU."
    );
  }


  // ========================================
  // DETECTAR SI QUIEREN DESACTIVAR
  // EL CONTROL DE VENCIMIENTO
  // ========================================

  const antesControlaba =
    productoActual.controlaVencimiento === true;

  const ahoraControla =
    productoNuevo.controlaVencimiento === true;

  const desactivandoControl =
    antesControlaba && !ahoraControla;


  // ========================================
  // PROTEGER EXISTENCIAS Y LOTES
  // ========================================

  if (desactivandoControl) {

    await validarDesactivacionVencimiento(
      empresaId,
      productoId
    );

  }


  // ========================================
  // ACTUALIZAR EN TRANSACCION
  // ========================================

  await runTransaction(
    db,
    async (transaccion) => {

      const productoSnap = await transaccion.get(
        productoRef
      );

      if (!productoSnap.exists()) {
        throw new Error(
          "El producto ya no existe."
        );
      }

      const productoGuardado =
        productoSnap.data();


      // VERIFICAR QUE NO CAMBIO DE EMPRESA

      if (
        productoGuardado.empresaId !== empresaId
      ) {
        throw new Error(
          "El producto pertenece a otra empresa."
        );
      }


      // SI OTRO USUARIO MODIFICO EL CONTROL
      // DURANTE LA OPERACION, CANCELAMOS.

      const controlGuardado =
        productoGuardado.controlaVencimiento === true;

      if (
        controlGuardado !== antesControlaba
      ) {
        throw new Error(
          "Otro usuario modificó el control de vencimiento. " +
          "Actualiza la página e inténtalo nuevamente."
        );
      }


      // SI SE ESTA DESACTIVANDO EL CONTROL,
      // DEBEMOS HABER VERIFICADO LOS LOTES.

      if (
        controlGuardado &&
        !ahoraControla &&
        !desactivandoControl
      ) {
        throw new Error(
          "No se puede desactivar el control de vencimiento."
        );
      }


      // GUARDAR LOS CAMBIOS

      transaccion.update(
        productoRef,
        productoNuevo
      );

    }
  );

}


// ==========================================
// J. CAMBIAR ESTADO DEL PRODUCTO
// ==========================================

export async function cambiarEstadoProducto(
  productoId,
  estado
) {

  if (!productoId) {
    throw new Error(
      "Debes seleccionar un producto."
    );
  }


  // VALIDAR ESTADO

  if (
    !["ACTIVO", "INACTIVO"].includes(
      estado
    )
  ) {
    throw new Error(
      "Estado de producto inválido."
    );
  }


  const productoRef = doc(
    db,
    "productos",
    productoId
  );


  // ========================================
  // ACTUALIZAR ESTADO
  // ========================================

  await runTransaction(
    db,
    async (transaccion) => {

      const snapshot = await transaccion.get(
        productoRef
      );

      if (!snapshot.exists()) {
        throw new Error(
          "El producto no existe."
        );
      }


      transaccion.update(
        productoRef,
        {

          estado,

          fechaActualizacion:
            serverTimestamp()

        }
      );

    }
  );

}