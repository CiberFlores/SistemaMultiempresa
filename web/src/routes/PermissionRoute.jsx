import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";

import useAuth from "../hooks/useAuth";
import { db } from "../services/firebase/firebaseConfig";

function PermissionRoute({ permiso }) {
  const { usuario, cargando } = useAuth();

  const [verificando, setVerificando] = useState(true);
  const [permitido, setPermitido] = useState(false);

  useEffect(() => {
    let activo = true;

    async function verificar() {
      if (cargando) return;

      if (!usuario) {
        if (activo) {
          setPermitido(false);
          setVerificando(false);
        }
        return;
      }

      if (usuario.tipoUsuario === "ADMIN") {
        if (activo) {
          setPermitido(true);
          setVerificando(false);
        }
        return;
      }

      if (usuario.tipoUsuario !== "TRABAJADOR" || !usuario.rolId) {
        if (activo) {
          setPermitido(false);
          setVerificando(false);
        }
        return;
      }

      try {
        const snapshot = await getDoc(
          doc(db, "rolesEmpresa", usuario.rolId)
        );

        const datos = snapshot.exists() ? snapshot.data() : null;

        const tienePermiso =
          datos &&
          datos.estado === "ACTIVO" &&
          datos.empresaId === usuario.empresaId &&
          Array.isArray(datos.permisos) &&
          datos.permisos.includes(permiso);

        if (activo) {
          setPermitido(Boolean(tienePermiso));
          setVerificando(false);
        }
      } catch (error) {
        console.error("Error verificando permiso:", error);

        if (activo) {
          setPermitido(false);
          setVerificando(false);
        }
      }
    }

    verificar();

    return () => {
      activo = false;
    };
  }, [usuario, cargando, permiso]);

  if (cargando || verificando) {
    return <div className="admin-empty">Verificando permisos...</div>;
  }

  if (!permitido) {
    return <Navigate to="/sin-permiso" replace />;
  }

  return <Outlet />;
}

export default PermissionRoute;
