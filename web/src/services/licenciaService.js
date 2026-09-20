import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  updateDoc
} from "firebase/firestore";

import {
  db
} from "./firebase/firebaseConfig";

const licenciasRef =
  collection(
    db,
    "licencias"
  );

function convertirFecha(
  fecha
) {
  if (!fecha) {
    return null;
  }

  const fechaConvertida =
    new Date(
      `${fecha}T12:00:00`
    );

  return Timestamp.fromDate(
    fechaConvertida
  );
}

export function suscribirLicencias(
  callback,
  errorCallback
) {
  return onSnapshot(
    licenciasRef,

    (snapshot) => {
      const licencias =
        snapshot.docs.map(
          (documento) => ({
            id: documento.id,
            ...documento.data()
          })
        );

      licencias.sort(
        (a, b) => {
          const fechaA =
            a.fechaRegistro
              ?.toMillis?.() || 0;

          const fechaB =
            b.fechaRegistro
              ?.toMillis?.() || 0;

          return fechaB - fechaA;
        }
      );

      callback(licencias);
    },

    (error) => {
      console.error(
        "Error cargando licencias:",
        error
      );

      if (errorCallback) {
        errorCallback(error);
      }
    }
  );
}

export async function obtenerCatalogosLicencia() {
  const [
    empresasSnapshot,
    planesSnapshot
  ] = await Promise.all([
    getDocs(
      collection(
        db,
        "empresas"
      )
    ),

    getDocs(
      collection(
        db,
        "planes"
      )
    )
  ]);

  const empresas =
    empresasSnapshot.docs.map(
      (documento) => ({
        id: documento.id,
        ...documento.data()
      })
    );

  const planes =
    planesSnapshot.docs.map(
      (documento) => ({
        id: documento.id,
        ...documento.data()
      })
    );

  return {
    empresas,
    planes
  };
}

async function empresaTieneLicenciaActiva(
  empresaId,
  licenciaExcluirId = null
) {
  const snapshot =
    await getDocs(
      licenciasRef
    );

  return snapshot.docs.some(
    (documento) => {
      if (
        documento.id ===
        licenciaExcluirId
      ) {
        return false;
      }

      const licencia =
        documento.data();

      return (
        licencia.empresaId ===
          empresaId &&
        licencia.estado ===
          "ACTIVA"
      );
    }
  );
}

export async function crearLicencia(
  datos
) {
  if (!datos.empresaId) {
    throw new Error(
      "Debes seleccionar una empresa."
    );
  }

  if (!datos.planId) {
    throw new Error(
      "Debes seleccionar un plan."
    );
  }

  const existeActiva =
    await empresaTieneLicenciaActiva(
      datos.empresaId
    );

  if (existeActiva) {
    throw new Error(
      "La empresa ya tiene una licencia activa."
    );
  }

  return addDoc(
    licenciasRef,
    {
      empresaId:
        datos.empresaId,

      planId:
        datos.planId,

      fechaInicio:
        convertirFecha(
          datos.fechaInicio
        ),

      fechaFin:
        convertirFecha(
          datos.fechaFin
        ),

      renovacionAutomatica:
        Boolean(
          datos.renovacionAutomatica
        ),

      observaciones:
        datos.observaciones
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

export async function actualizarLicencia(
  licenciaId,
  datos
) {
  const existeActiva =
    await empresaTieneLicenciaActiva(
      datos.empresaId,
      licenciaId
    );

  if (
    existeActiva &&
    datos.estado === "ACTIVA"
  ) {
    throw new Error(
      "La empresa ya tiene otra licencia activa."
    );
  }

  const referencia =
    doc(
      db,
      "licencias",
      licenciaId
    );

  await updateDoc(
    referencia,
    {
      empresaId:
        datos.empresaId,

      planId:
        datos.planId,

      fechaInicio:
        convertirFecha(
          datos.fechaInicio
        ),

      fechaFin:
        convertirFecha(
          datos.fechaFin
        ),

      renovacionAutomatica:
        Boolean(
          datos.renovacionAutomatica
        ),

      observaciones:
        datos.observaciones
          ?.trim() || "",

      fechaActualizacion:
        serverTimestamp()
    }
  );
}

export async function cambiarEstadoLicencia(
  licenciaId,
  empresaId,
  nuevoEstado
) {
  if (
    nuevoEstado === "ACTIVA"
  ) {
    const existeActiva =
      await empresaTieneLicenciaActiva(
        empresaId,
        licenciaId
      );

    if (existeActiva) {
      throw new Error(
        "La empresa ya tiene otra licencia activa."
      );
    }
  }

  const referencia =
    doc(
      db,
      "licencias",
      licenciaId
    );

  await updateDoc(
    referencia,
    {
      estado:
        nuevoEstado,

      fechaActualizacion:
        serverTimestamp()
    }
  );
}