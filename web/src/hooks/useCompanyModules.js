import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebase/firebaseConfig";

// Todas las empresas tienen acceso a todos los módulos del catálogo.
// Lo que cada trabajador puede hacer lo decide el dueño desde "Roles y permisos".
// La única excepción global: si el super admin apaga un módulo en el catálogo,
// ese módulo se oculta para todas las empresas.
//
// Si el catálogo no se puede leer, no se oculta nada.
export default function useCompanyModules() {
  const [apagados, setApagados] = useState(null);

  useEffect(() => {
    const cancelar = onSnapshot(
      collection(db, "modulos"),
      (snapshot) => {
        const codigos = snapshot.docs
          .map((d) => d.data())
          .filter((m) => m.activo === false && m.codigo)
          .map((m) => String(m.codigo).toUpperCase());
        setApagados(new Set(codigos));
      },
      () => setApagados(new Set())
    );

    return cancelar;
  }, []);

  return useMemo(
    () => ({
      loading: apagados === null,
      unrestricted: apagados === null || apagados.size === 0,
      codes: apagados || new Set(),
      isEnabled: (codigo) => !apagados || !apagados.has(String(codigo).toUpperCase())
    }),
    [apagados]
  );
}
