import {
  collection,
  getDoc,
  getDocs,
  doc,
  query,
  where
} from "firebase/firestore";

import { db } from "./firebase/firebaseConfig";

export async function obtenerDashboardEmpresa(empresaId) {
  if (!empresaId) {
    throw new Error("No se encontró la empresa del usuario.");
  }

  const empresaRef = doc(
    db,
    "empresas",
    empresaId
  );

  const configuracionRef = doc(
    db,
    "configuracionesEmpresas",
    empresaId
  );

  const personalizacionRef = doc(
    db,
    "personalizacionesEmpresas",
    empresaId
  );

  const sucursalesQuery = query(
    collection(db, "sucursales"),
    where("empresaId", "==", empresaId)
  );

  const licenciasQuery = query(
    collection(db, "licencias"),
    where("empresaId", "==", empresaId)
  );

  const [
    empresaSnapshot,
    configuracionSnapshot,
    personalizacionSnapshot,
    sucursalesSnapshot,
    licenciasSnapshot
  ] = await Promise.all([
    getDoc(empresaRef),
    getDoc(configuracionRef),
    getDoc(personalizacionRef),
    getDocs(sucursalesQuery),
    getDocs(licenciasQuery)
  ]);

  if (!empresaSnapshot.exists()) {
    throw new Error("La empresa asignada no existe.");
  }

  const empresa = {
    id: empresaSnapshot.id,
    ...empresaSnapshot.data()
  };

  const configuracion =
    configuracionSnapshot.exists()
      ? configuracionSnapshot.data()
      : null;

  const personalizacion =
    personalizacionSnapshot.exists()
      ? personalizacionSnapshot.data()
      : null;

  const sucursales =
    sucursalesSnapshot.docs.map((documento) => ({
      id: documento.id,
      ...documento.data()
    }));

  const licencias =
    licenciasSnapshot.docs.map((documento) => ({
      id: documento.id,
      ...documento.data()
    }));

  const sucursalesActivas = sucursales.filter(
    (sucursal) =>
      sucursal.estado === "ACTIVA"
  ).length;

  const licenciaActiva =
    licencias.find(
      (licencia) =>
        licencia.estado === "ACTIVA"
    ) || null;

  let plan = null;

  if (licenciaActiva?.planId) {
    const planSnapshot = await getDoc(
      doc(
        db,
        "planes",
        licenciaActiva.planId
      )
    );

    if (planSnapshot.exists()) {
      plan = {
        id: planSnapshot.id,
        ...planSnapshot.data()
      };
    }
  }

  return {
    empresa,
    configuracion,
    personalizacion,
    sucursales,
    licencias,
    licenciaActiva,
    plan,

    totalSucursales: sucursales.length,
    sucursalesActivas,

    configuracionCompleta:
      Boolean(configuracion),

    personalizacionCompleta:
      Boolean(personalizacion)
  };
}