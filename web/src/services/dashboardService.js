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

  return {
    empresas,
    modulos,

    totalEmpresas:
      empresas.length,

    empresasActivas,
    empresasSuspendidas,

    totalModulos:
      modulos.length
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