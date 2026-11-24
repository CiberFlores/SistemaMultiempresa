import { createElement, lazy, Suspense } from "react";

const CLAVE = "an-recarga-version";

// Carga cada pantalla cuando se abre. Si salió una versión nueva y el archivo
// viejo ya no existe, recarga una vez para tomar la actual.
export default function pagina(cargar) {
  const Pantalla = lazy(async () => {
    try {
      const modulo = await cargar();
      sessionStorage.removeItem(CLAVE);
      return modulo;
    } catch (error) {
      if (!sessionStorage.getItem(CLAVE) && navigator.onLine) {
        sessionStorage.setItem(CLAVE, "1");
        window.location.reload();
        return new Promise(() => {});
      }
      throw error;
    }
  });

  return function Pagina(props) {
    return <Suspense fallback={<div className="admin-empty" role="status">Cargando…</div>}>{createElement(Pantalla, props)}</Suspense>;
  };
}
