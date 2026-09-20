import {
  collection,
  getDocs,
  limit,
  orderBy,
  query
} from "firebase/firestore";

import {
  db
} from "./firebase/firebaseConfig";

export async function obtenerDashboardGlobal() {
  const [
    empresasSnapshot,
    planesSnapshot,
    licenciasSnapshot,
    modulosSnapshot
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
    ),

    getDocs(
      collection(
        db,
        "licencias"
      )
    ),

    getDocs(
      collection(
        db,
        "modulos"
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

  const licencias =
    licenciasSnapshot.docs.map(
      (documento) => ({
        id: documento.id,
        ...documento.data()
      })
    );

  const modulos =
    modulosSnapshot.docs.map(
      (documento) => ({
        id: documento.id,
        ...documento.data()
      })
    );

  const empresasActivas =
    empresas.filter(
      (empresa) =>
        empresa.estado ===
        "ACTIVA"
    ).length;

  const empresasSuspendidas =
    empresas.filter(
      (empresa) =>
        empresa.estado ===
        "SUSPENDIDA"
    ).length;

  const planesActivos =
    planes.filter(
      (plan) =>
        plan.activo === true
    ).length;

  const licenciasActivas =
    licencias.filter(
      (licencia) =>
        licencia.estado ===
        "ACTIVA"
    ).length;

  const licenciasSuspendidas =
    licencias.filter(
      (licencia) =>
        licencia.estado ===
        "SUSPENDIDA"
    ).length;

  const licenciasPorPlan =
    planes.map(
      (plan) => ({
        nombre:
          plan.nombre,

        cantidad:
          licencias.filter(
            (licencia) =>
              licencia.planId ===
                plan.id &&
              licencia.estado ===
                "ACTIVA"
          ).length
      })
    );

  return {
    empresas,
    planes,
    licencias,
    modulos,

    totalEmpresas:
      empresas.length,

    empresasActivas,
    empresasSuspendidas,

    totalPlanes:
      planes.length,

    planesActivos,

    totalModulos:
      modulos.length,

    totalLicencias:
      licencias.length,

    licenciasActivas,
    licenciasSuspendidas,

    licenciasPorPlan
  };
}

export async function obtenerEmpresasRecientes() {
  const consulta = query(
    collection(
      db,
      "empresas"
    ),

    orderBy(
      "fechaRegistro",
      "desc"
    ),

    limit(5)
  );

  const resultado =
    await getDocs(
      consulta
    );

  return resultado.docs.map(
    (documento) => ({
      id: documento.id,
      ...documento.data()
    })
  );
}