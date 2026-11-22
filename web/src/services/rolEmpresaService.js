import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where
} from "firebase/firestore";

import { db } from "./firebase/firebaseConfig";

const rolesRef = collection(db, "rolesEmpresa");

export const PERMISOS_DISPONIBLES = [
  { id: "dashboard.ver", nombre: "Ver dashboard" },
  { id: "sucursales.ver", nombre: "Ver sucursales" },
  { id: "configuracion.gestionar", nombre: "Gestionar configuración de la empresa" },
  { id: "categorias.gestionar", nombre: "Gestionar categorías" },
  { id: "marcas.gestionar", nombre: "Gestionar marcas" },
  { id: "productos.gestionar", nombre: "Gestionar productos" },
  { id: "inventario.ver", nombre: "Ver inventario, movimientos y alertas" },
  { id: "inventario.ajustar", nombre: "Ajustar inventario" },
  { id: "proveedores.gestionar", nombre: "Gestionar proveedores" },
  { id: "compras.gestionar", nombre: "Gestionar compras" },
  { id: "caja.gestionar", nombre: "Gestionar cajas, movimientos y gastos" },
  { id: "ventas.registrar", nombre: "Registrar ventas / POS" },
  { id: "ventas.ver", nombre: "Ver el historial de ventas" },
  { id: "promociones.gestionar", nombre: "Gestionar promociones" },
  { id: "finanzas.gestionar", nombre: "Gestionar cuentas por cobrar/pagar" },
  { id: "reportes.ver", nombre: "Ver reportes" },
  { id: "notificaciones.ver", nombre: "Ver notificaciones" },
  { id: "auditoria.ver", nombre: "Ver auditoría" }
];

const PERMISOS_VALIDOS = new Set(PERMISOS_DISPONIBLES.map((permiso) => permiso.id));

// Deja solo permisos que existen, sin repetidos
function permisosLimpios(permisos) {
  return [...new Set(Array.isArray(permisos) ? permisos : [])].filter((id) =>
    PERMISOS_VALIDOS.has(id)
  );
}

function validarDatosRol(datos) {
  const nombre = String(datos?.nombre || "").trim();

  if (!nombre) {
    throw new Error("El nombre del rol es obligatorio.");
  }

  if (nombre.length < 3 || nombre.length > 40) {
    throw new Error("El nombre del rol debe tener entre 3 y 40 caracteres.");
  }

  const permisos = permisosLimpios(datos?.permisos);

  if (permisos.length === 0) {
    throw new Error("Elige al menos un permiso para el rol.");
  }

  return {
    nombre,
    descripcion: String(datos?.descripcion || "").trim().slice(0, 120),
    permisos
  };
}

export function suscribirRolesEmpresa(empresaId, callback, errorCallback) {
  const consulta = query(
    rolesRef,
    where("empresaId", "==", empresaId)
  );

  return onSnapshot(
    consulta,
    (snapshot) => {
      const roles = snapshot.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      }));

      roles.sort((a, b) =>
        (a.nombre || "").localeCompare(b.nombre || "")
      );

      callback(roles);
    },
    errorCallback
  );
}

export async function crearRolEmpresa(empresaId, datos) {
  if (!empresaId) {
    throw new Error("No se encontró la empresa.");
  }

  const limpio = validarDatosRol(datos);

  return addDoc(rolesRef, {
    empresaId,
    ...limpio,
    estado: "ACTIVO",
    fechaRegistro: serverTimestamp(),
    fechaActualizacion: serverTimestamp()
  });
}

export async function actualizarRolEmpresa(rolId, datos) {
  const limpio = validarDatosRol(datos);

  await updateDoc(
    doc(db, "rolesEmpresa", rolId),
    {
      ...limpio,
      fechaActualizacion: serverTimestamp()
    }
  );
}

export async function cambiarEstadoRolEmpresa(rolId, estado) {
  await updateDoc(
    doc(db, "rolesEmpresa", rolId),
    {
      estado,
      fechaActualizacion: serverTimestamp()
    }
  );
}
