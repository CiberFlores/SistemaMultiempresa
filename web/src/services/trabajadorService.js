import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";

import {
  db
} from "./firebase/firebaseConfig";

export function suscribirTrabajadores(
  empresaId,
  callback,
  errorCallback
) {
  const consulta = query(
    collection(
      db,
      "usuarios"
    ),

    where(
      "empresaId",
      "==",
      empresaId
    )
  );

  return onSnapshot(
    consulta,

    (snapshot) => {
      const trabajadores =
        snapshot.docs
          .map(
            (documento) => ({
              id:
                documento.id,

              ...documento.data()
            })
          )
          .filter(
            (usuario) =>
              usuario.tipoUsuario ===
              "TRABAJADOR"
          );

      callback(
        trabajadores
      );
    },

    errorCallback
  );
}

export async function crearTrabajador(
  uid,
  empresaId,
  datos
) {
  const uidLimpio =
    uid?.trim();

  if (!uidLimpio) {
    throw new Error(
      "Debes ingresar el UID de Firebase Authentication."
    );
  }

  const referencia = doc(
    db,
    "usuarios",
    uidLimpio
  );

  const existente =
    await getDoc(
      referencia
    );

  if (existente.exists()) {
    throw new Error(
      "Ya existe un usuario con ese UID."
    );
  }

  await setDoc(
    referencia,
    {
      empresaId,

      nombreCompleto:
        datos.nombreCompleto.trim(),

      correo:
        datos.correo
          .trim()
          .toLowerCase(),

      telefono:
        datos.telefono
          ?.trim() || "",

      tipoUsuario:
        "TRABAJADOR",

      rolId:
        datos.rolId || null,

      sucursales:
        datos.sucursales || [],

      estado:
        true,

      imagenPerfilUrl:
        "",

      ultimoAcceso:
        null,

      fechaRegistro:
        serverTimestamp(),

      fechaActualizacion:
        serverTimestamp()
    }
  );
}

export async function actualizarTrabajador(
  uid,
  datos
) {
  const referencia = doc(
    db,
    "usuarios",
    uid
  );

  await updateDoc(
    referencia,
    {
      nombreCompleto:
        datos.nombreCompleto.trim(),

      correo:
        datos.correo
          .trim()
          .toLowerCase(),

      telefono:
        datos.telefono
          ?.trim() || "",

      rolId:
        datos.rolId || null,

      fechaActualizacion:
        serverTimestamp()
    }
  );
}

export async function cambiarEstadoTrabajador(
  uid,
  estado
) {
  await updateDoc(
    doc(
      db,
      "usuarios",
      uid
    ),
    {
      estado,

      fechaActualizacion:
        serverTimestamp()
    }
  );
}