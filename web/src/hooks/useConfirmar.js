import { useContext } from "react";

import { ConfirmContext } from "../context/ConfirmContext";

// const confirmar = useConfirmar();
// const ok = await confirmar({ titulo, mensaje, accion: "Eliminar", peligro: true });
function useConfirmar() {
  const confirmar = useContext(ConfirmContext);

  if (!confirmar) {
    throw new Error("useConfirmar debe utilizarse dentro de ConfirmProvider");
  }

  return confirmar;
}

export default useConfirmar;
