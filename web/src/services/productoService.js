import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where
} from "firebase/firestore";

import {
  db
} from "./firebase/firebaseConfig";

const productosRef =
  collection(
    db,
    "productos"
  );

export function suscribirProductos(
  empresaId,
  callback,
  errorCallback
) {
  const consulta = query(
    productosRef,

    where(
      "empresaId",
      "==",
      empresaId
    )
  );

  return onSnapshot(
    consulta,

    (snapshot) => {
      const productos =
        snapshot.docs.map(
          (documento) => ({
            id:
              documento.id,

            ...documento.data()
          })
        );

      productos.sort(
        (a, b) =>
          (a.nombre || "")
            .localeCompare(
              b.nombre || ""
            )
      );

      callback(
        productos
      );
    },

    errorCallback
  );
}

async function skuDisponible(
  empresaId,
  sku,
  excluirId = null
) {
  const snapshot =
    await getDocs(
      query(
        productosRef,

        where(
          "empresaId",
          "==",
          empresaId
        )
      )
    );

  const skuNormalizado =
    sku
      .trim()
      .toUpperCase();

  return !snapshot.docs.some(
    (documento) => {
      if (
        documento.id ===
        excluirId
      ) {
        return false;
      }

      return (
        documento.data().sku ===
        skuNormalizado
      );
    }
  );
}

export async function crearProducto(
  empresaId,
  datos
) {
  const sku =
    datos.sku
      .trim()
      .toUpperCase();

  if (!sku) {
    throw new Error(
      "El SKU es obligatorio."
    );
  }

  if (
    !datos.nombre?.trim()
  ) {
    throw new Error(
      "El nombre del producto es obligatorio."
    );
  }

  if (
    !(await skuDisponible(
      empresaId,
      sku
    ))
  ) {
    throw new Error(
      "Ya existe un producto con ese SKU."
    );
  }

  return addDoc(
    productosRef,
    {
      empresaId,

      sku,

      nombre:
        datos.nombre.trim(),

      descripcion:
        datos.descripcion
          ?.trim() || "",

      categoriaId:
        datos.categoriaId ||
        null,

      marcaId:
        datos.marcaId ||
        null,

      costo:
        Number(
          datos.costo
        ) || 0,

      precioVenta:
        Number(
          datos.precioVenta
        ) || 0,

      stockMinimo:
        Number(
          datos.stockMinimo
        ) || 0,

      unidad:
        datos.unidad
          ?.trim() ||
        "unidad",

      imagenUrl:
        datos.imagenUrl
          ?.trim() || "",

      estado:
        "ACTIVO",

      fechaRegistro:
        serverTimestamp(),

      fechaActualizacion:
        serverTimestamp()
    }
  );
}

export async function actualizarProducto(
  productoId,
  empresaId,
  datos
) {
  const sku =
    datos.sku
      .trim()
      .toUpperCase();

  if (
    !(await skuDisponible(
      empresaId,
      sku,
      productoId
    ))
  ) {
    throw new Error(
      "Ya existe otro producto con ese SKU."
    );
  }

  await updateDoc(
    doc(
      db,
      "productos",
      productoId
    ),
    {
      sku,

      nombre:
        datos.nombre.trim(),

      descripcion:
        datos.descripcion
          ?.trim() || "",

      categoriaId:
        datos.categoriaId ||
        null,

      marcaId:
        datos.marcaId ||
        null,

      costo:
        Number(
          datos.costo
        ) || 0,

      precioVenta:
        Number(
          datos.precioVenta
        ) || 0,

      stockMinimo:
        Number(
          datos.stockMinimo
        ) || 0,

      unidad:
        datos.unidad
          ?.trim() ||
        "unidad",

      imagenUrl:
        datos.imagenUrl
          ?.trim() || "",

      fechaActualizacion:
        serverTimestamp()
    }
  );
}

export async function cambiarEstadoProducto(
  productoId,
  estado
) {
  await updateDoc(
    doc(
      db,
      "productos",
      productoId
    ),
    {
      estado,

      fechaActualizacion:
        serverTimestamp()
    }
  );
}