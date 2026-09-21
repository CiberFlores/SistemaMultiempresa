import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import useAuth from "../hooks/useAuth";
import useCompanyModules from "../hooks/useCompanyModules";
import { db } from "../services/firebase/firebaseConfig";

const MODULE_BY_PERMISSION={
  "dashboard.ver":"DASHBOARD",
  "configuracion.gestionar":"CONFIGURACION",
  "categorias.gestionar":"CATALOGO",
  "marcas.gestionar":"CATALOGO",
  "productos.gestionar":"PRODUCTOS",
  "inventario.ver":"INVENTARIO",
  "inventario.ajustar":"INVENTARIO",
  "clientes.gestionar":"CLIENTES",
  "proveedores.gestionar":"COMPRAS",
  "compras.gestionar":"COMPRAS",
  "caja.gestionar":"CAJA",
  "ventas.registrar":"VENTAS",
  "ventas.ver":"VENTAS",
  "promociones.gestionar":"PROMOCIONES",
  "finanzas.gestionar":"FINANZAS",
  "reportes.ver":"REPORTES",
  "notificaciones.ver":"NOTIFICACIONES",
  "auditoria.ver":"AUDITORIA"
};

export default function PermissionRoute({permiso}){
 const{usuario,cargando}=useAuth();const modules=useCompanyModules();const[verificando,setVerificando]=useState(true),[permitido,setPermitido]=useState(false);
 useEffect(()=>{let activo=true;async function verificar(){if(cargando)return;if(!usuario){if(activo){setPermitido(false);setVerificando(false)}return;}let permissionOk=false;if(usuario.tipoUsuario==="ADMIN")permissionOk=true;else if(usuario.tipoUsuario==="TRABAJADOR"&&usuario.rolId){try{const snap=await getDoc(doc(db,"rolesEmpresa",usuario.rolId));const d=snap.exists()?snap.data():null;permissionOk=Boolean(d&&d.estado==="ACTIVO"&&d.empresaId===usuario.empresaId&&Array.isArray(d.permisos)&&d.permisos.includes(permiso));}catch(e){console.error(e)}}const moduleCode=MODULE_BY_PERMISSION[permiso];const moduleOk=!moduleCode||modules.isEnabled(moduleCode);if(activo){setPermitido(permissionOk&&moduleOk);setVerificando(false)}}if(!modules.loading)verificar();return()=>{activo=false}},[usuario,cargando,permiso,modules.loading,modules.unrestricted,modules.codes]);
 if(cargando||verificando||modules.loading)return <div className="admin-empty">Verificando permisos y módulos…</div>;
 if(!permitido)return <Navigate to="/sin-permiso" replace/>;return <Outlet/>;
}
