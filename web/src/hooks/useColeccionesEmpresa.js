import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";

import { db } from "../services/firebase/firebaseConfig";

// Escucha varias colecciones de la empresa en tiempo real.
// Cada vez que cambia un dato en la base, los reportes se recalculan solos.
export function useColeccionesEmpresa(empresaId, nombres) {
  const clave = nombres.join("|");

  const [estado, setEstado] = useState({ datos: {}, listas: {}, error: "" });

  useEffect(() => {
    if (!empresaId) return undefined;

    const cancelar = clave.split("|").map((nombre) =>
      onSnapshot(
        query(collection(db, nombre), where("empresaId", "==", empresaId)),
        (snapshot) =>
          setEstado((previo) => ({
            ...previo,
            datos: { ...previo.datos, [nombre]: snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) },
            listas: { ...previo.listas, [nombre]: true }
          })),
        (error) => {
          console.error(`No se pudo leer ${nombre}:`, error);
          // Un reporte no debe quedarse cargando para siempre si falta un permiso
          setEstado((previo) => ({
            ...previo,
            datos: { ...previo.datos, [nombre]: previo.datos[nombre] || [] },
            listas: { ...previo.listas, [nombre]: true },
            error: previo.error || "Algunos datos no se pudieron leer. Revisa tus permisos."
          }));
        }
      )
    );

    return () => cancelar.forEach((c) => c());
  }, [empresaId, clave]);

  return useMemo(() => {
    const nombresLista = clave.split("|");
    const datos = Object.fromEntries(nombresLista.map((n) => [n, estado.datos[n] || []]));

    return {
      datos,
      cargando: !nombresLista.every((n) => estado.listas[n]),
      error: estado.error
    };
  }, [estado, clave]);
}

// Nombre, logo y colores vigentes de la empresa, para exportar con su identidad
export function useIdentidadEmpresa(empresaId) {
  const [empresa, setEmpresa] = useState({});
  const [personalizacion, setPersonalizacion] = useState({});

  useEffect(() => {
    if (!empresaId) return undefined;

    const a = onSnapshot(
      doc(db, "empresas", empresaId),
      (d) => setEmpresa(d.exists() ? d.data() : {}),
      () => {}
    );
    const b = onSnapshot(
      doc(db, "personalizacionesEmpresas", empresaId),
      (d) => setPersonalizacion(d.exists() ? d.data() : {}),
      () => {}
    );

    return () => {
      a();
      b();
    };
  }, [empresaId]);

  return { empresa, personalizacion };
}
