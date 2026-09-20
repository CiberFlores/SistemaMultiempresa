import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where
} from "firebase/firestore";

import {
  db
} from "./firebase/firebaseConfig";

const categoriasRef = collection(
  db,
  "categorias"
);

// ======================================================
// ESCUCHAR CATEGORÍAS EN TIEMPO REAL
// ======================================================

export function suscribirCategorias(
  empresaId,
  callback,
  errorCallback
) {
  if (!empresaId) {
    if (callback) {
      callback([]);
    }

    return () => {};
  }

  const consulta = query(
    categoriasRef,

    where(
      "empresaId",
      "==",
      empresaId
    )
  );

  return onSnapshot(
    consulta,

    (snapshot) => {
      const categorias =
        snapshot.docs.map(
          (documento) => ({
            id:
              documento.id,

            ...documento.data()
          })
        );

      categorias.sort(
        (a, b) =>
          (a.nombre || "")
            .localeCompare(
              b.nombre || "",
              "es"
            )
      );

      callback(
        categorias
      );
    },

    (error) => {
      console.error(
        "Error cargando categorías:",
        error
      );

      if (errorCallback) {
        errorCallback(error);
      }
    }
  );
}

// ======================================================
// CREAR CATEGORÍA
// ======================================================

export async function crearCategoria(
  empresaId,
  datos
) {
  if (!empresaId) {
    throw new Error(
      "No se encontró la empresa."
    );
  }

  const nombre =
    datos.nombre?.trim();

  if (!nombre) {
    throw new Error(
      "El nombre de la categoría es obligatorio."
    );
  }

  const referencia =
    await addDoc(
      categoriasRef,
      {
        empresaId,

        nombre,

        nombreNormalizado:
          nombre.toLowerCase(),

        descripcion:
          datos.descripcion
            ?.trim() || "",

        estado:
          "ACTIVA",

        fechaRegistro:
          serverTimestamp(),

        fechaActualizacion:
          serverTimestamp()
      }
    );

  return referencia;
}

// ======================================================
// ACTUALIZAR CATEGORÍA
// ======================================================

export async function actualizarCategoria(
  categoriaId,
  datos
) {
  if (!categoriaId) {
    throw new Error(
      "No se encontró la categoría."
    );
  }

  const nombre =
    datos.nombre?.trim();

  if (!nombre) {
    throw new Error(
      "El nombre de la categoría es obligatorio."
    );
  }

  const referencia =
    doc(
      db,
      "categorias",
      categoriaId
    );

  await updateDoc(
    referencia,
    {
      nombre,

      nombreNormalizado:
        nombre.toLowerCase(),

      descripcion:
        datos.descripcion
          ?.trim() || "",

      fechaActualizacion:
        serverTimestamp()
    }
  );
}

// ======================================================
// ACTIVAR / DESACTIVAR
// ======================================================

export async function cambiarEstadoCategoria(
  categoriaId,
  estado
) {
  if (!categoriaId) {
    throw new Error(
      "No se encontró la categoría."
    );
  }

  if (
    ![
      "ACTIVA",
      "INACTIVA"
    ].includes(estado)
  ) {
    throw new Error(
      "Estado de categoría inválido."
    );
  }

  const referencia =
    doc(
      db,
      "categorias",
      categoriaId
    );

  await updateDoc(
    referencia,
    {
      estado,

      fechaActualizacion:
        serverTimestamp()
    }
  );
}