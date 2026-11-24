import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import useAuth from "../hooks/useAuth";
import useCompanyModules from "../hooks/useCompanyModules";
import { db } from "../services/firebase/firebaseConfig";

const MODULE_BY_PERMISSION = {
  "dashboard.ver": "DASHBOARD",
  "configuracion.gestionar": "CONFIGURACION",
  "categorias.gestionar": "CATALOGO",
  "marcas.gestionar": "CATALOGO",
  "productos.gestionar": "PRODUCTOS",
  "inventario.ver": "INVENTARIO",
  "inventario.ajustar": "INVENTARIO",
  "clientes.gestionar": "CLIENTES",
  "proveedores.gestionar": "COMPRAS",
  "compras.gestionar": "COMPRAS",
  "caja.gestionar": "CAJA",
  "ventas.registrar": "VENTAS",
  "ventas.ver": "VENTAS",
  "promociones.gestionar": "PROMOCIONES",
  "finanzas.gestionar": "FINANZAS",
  "reportes.ver": "REPORTES",
  "notificaciones.ver": "NOTIFICACIONES",
  "auditoria.ver": "AUDITORIA"
};

export default function PermissionRoute({ permiso }) {
  const { usuario, cargando } = useAuth();
  const modules = useCompanyModules();
  // El cargo se escucha en vivo: si el dueño quita un permiso, la pantalla se cierra
  const [cargo, setCargo] = useState({ rolId: null, datos: null });

  const esTrabajador = usuario?.tipoUsuario === "TRABAJADOR";
  const rolId = esTrabajador ? usuario.rolId || null : null;

  useEffect(() => {
    if (!rolId) return undefined;

    return onSnapshot(
      doc(db, "rolesEmpresa", rolId),
      (snap) => setCargo({ rolId, datos: snap.exists() ? snap.data() : null }),
      (error) => {
        console.error(error);
        setCargo({ rolId, datos: null });
      }
    );
  }, [rolId]);

  const esperando = cargando || modules.loading || (rolId !== null && cargo.rolId !== rolId);

  if (esperando) return <div className="admin-empty">Verificando permisos y módulos…</div>;
  if (!usuario) return <Navigate to="/login" replace />;

  const datos = cargo.datos;
  const permisoOk =
    usuario.tipoUsuario === "ADMIN" ||
    Boolean(
      rolId &&
        datos?.estado === "ACTIVO" &&
        datos.empresaId === usuario.empresaId &&
        Array.isArray(datos.permisos) &&
        datos.permisos.includes(permiso)
    );
  const modulo = MODULE_BY_PERMISSION[permiso];

  if (!permisoOk || (modulo && !modules.isEnabled(modulo))) return <Navigate to="/sin-permiso" replace />;

  return <Outlet />;
}
