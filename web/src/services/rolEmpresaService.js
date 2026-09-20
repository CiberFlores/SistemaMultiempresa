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
  { id: "categorias.gestionar", nombre: "Gestionar categorías" },
  { id: "marcas.gestionar", nombre: "Gestionar marcas" },
  { id: "productos.gestionar", nombre: "Gestionar productos" },
  { id: "inventario.ver", nombre: "Ver inventario" },
  { id: "inventario.ajustar", nombre: "Ajustar inventario" },
  { id: "clientes.gestionar", nombre: "Gestionar clientes" },
  { id: "proveedores.gestionar", nombre: "Gestionar proveedores" },
  { id: "compras.gestionar", nombre: "Gestionar compras" },
  { id: "caja.gestionar", nombre: "Gestionar cajas" },
  { id: "ventas.registrar", nombre: "Registrar ventas / POS" },
  { id: "ventas.ver", nombre: "Ver historial de ventas" },
  { id: "reportes.ver", nombre: "Ver reportes" }
];

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

  if (!datos.nombre?.trim()) {
    throw new Error("El nombre del rol es obligatorio.");
  }

  return addDoc(rolesRef, {
    empresaId,
    nombre: datos.nombre.trim(),
    descripcion: datos.descripcion?.trim() || "",
    permisos: Array.isArray(datos.permisos) ? datos.permisos : [],
    estado: "ACTIVO",
    fechaRegistro: serverTimestamp(),
    fechaActualizacion: serverTimestamp()
  });
}

export async function actualizarRolEmpresa(rolId, datos) {
  await updateDoc(
    doc(db, "rolesEmpresa", rolId),
    {
      nombre: datos.nombre.trim(),
      descripcion: datos.descripcion?.trim() || "",
      permisos: Array.isArray(datos.permisos) ? datos.permisos : [],
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
