import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebase/firebaseConfig";

// Todas las empresas tienen acceso a todos los módulos del catálogo.
// Lo que cada trabajador puede hacer lo decide el dueño desde "Roles y permisos".
// La única excepción global: si el super admin apaga un módulo en el catálogo,
// todas las empresas ven la pantalla de mantenimiento en su lugar.
//
// Si el catálogo no se puede leer, no se oculta nada.
export default function useCompanyModules() {
  const [apagados, setApagados] = useState(null);

  useEffect(() => {
    const cancelar = onSnapshot(
      collection(db, "modulos"),
      (snapshot) => {
        const inactivos = snapshot.docs.map((d) => d.data()).filter((m) => m.activo === false && m.codigo);
        setApagados(new Map(inactivos.map((m) => [String(m.codigo).toUpperCase(), m.nombre || "Esta sección"])));
      },
      () => setApagados(new Map())
    );

    return cancelar;
  }, []);

  return useMemo(
    () => ({
      loading: apagados === null,
      unrestricted: apagados === null || apagados.size === 0,
      codes: apagados || new Map(),
      nombreDe: (codigo) => apagados?.get(String(codigo).toUpperCase()) || "Esta sección",
      isEnabled: (codigo) => !apagados || !apagados.has(String(codigo).toUpperCase())
    }),
    [apagados]
  );
}
