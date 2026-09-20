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

const referencia =
  collection(
    db,
    "marcas"
  );

export function suscribirMarcas(
  empresaId,
  callback,
  errorCallback
) {
  const consulta = query(
    referencia,

    where(
      "empresaId",
      "==",
      empresaId
    )
  );

  return onSnapshot(
    consulta,

    (snapshot) => {
      const datos =
        snapshot.docs.map(
          (documento) => ({
            id:
              documento.id,

            ...documento.data()
          })
        );

      datos.sort(
        (a, b) =>
          (a.nombre || "")
            .localeCompare(
              b.nombre || ""
            )
      );

      callback(datos);
    },

    errorCallback
  );
}

export async function crearMarca(
  empresaId,
  datos
) {
  return addDoc(
    referencia,
    {
      empresaId,

      nombre:
        datos.nombre.trim(),

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
}

export async function actualizarMarca(
  marcaId,
  datos
) {
  await updateDoc(
    doc(
      db,
      "marcas",
      marcaId
    ),
    {
      nombre:
        datos.nombre.trim(),

      descripcion:
        datos.descripcion
          ?.trim() || "",

      fechaActualizacion:
        serverTimestamp()
    }
  );
}

export async function cambiarEstadoMarca(
  marcaId,
  estado
) {
  await updateDoc(
    doc(
      db,
      "marcas",
      marcaId
    ),
    {
      estado,

      fechaActualizacion:
        serverTimestamp()
    }
  );
}