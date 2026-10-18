import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";
import { db } from "./firebase/firebaseConfig";

export function suscribirAdministradores(callback, errorCallback) {
  return onSnapshot(
    collection(db, "usuarios"),
    (snapshot) => {
      const rows = snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }))
        .filter((item) => item.tipoUsuario === "ADMIN");
      rows.sort((a, b) => (a.nombreCompleto || "").localeCompare(b.nombreCompleto || ""));
      callback(rows);
    },
    errorCallback
  );
}

export async function cargarControlEmpresa(empresaId) {
  const [empresa, config, personalizacion, modulosEmpresa, modulos, planes, licencias] = await Promise.all([
    getDoc(doc(db, "empresas", empresaId)),
    getDoc(doc(db, "configuracionesEmpresas", empresaId)),
    getDoc(doc(db, "personalizacionesEmpresas", empresaId)),
    getDoc(doc(db, "modulosEmpresa", empresaId)),
    getDocs(collection(db, "modulos")),
    getDocs(collection(db, "planes")),
    getDocs(collection(db, "licencias"))
  ]);

  if (!empresa.exists()) throw new Error("La empresa no existe.");

  return {
    empresa: { id: empresa.id, ...empresa.data() },
    config: config.exists() ? config.data() : {},
    personalizacion: personalizacion.exists() ? personalizacion.data() : {},
    modulosEmpresa: modulosEmpresa.exists() ? modulosEmpresa.data() : {},
    modulos: modulos.docs.map((d) => ({ id: d.id, ...d.data() })),
    planes: planes.docs.map((d) => ({ id: d.id, ...d.data() })),
    licencias: licencias.docs.map((d) => ({ id: d.id, ...d.data() })).filter((l) => l.empresaId === empresaId)
  };
}

export async function guardarConfiguracionEmpresaGlobal(
  empresaId,
  { empresa, config, personalizacion, modulosHabilitados }
) {
  await Promise.all([
    updateDoc(doc(db, "empresas", empresaId), {
      ...empresa,
      fechaActualizacion: serverTimestamp()
    }),
    setDoc(
      doc(db, "configuracionesEmpresas", empresaId),
      { ...config, empresaId, fechaActualizacion: serverTimestamp() },
      { merge: true }
    ),
    setDoc(
      doc(db, "personalizacionesEmpresas", empresaId),
      { ...personalizacion, empresaId, fechaActualizacion: serverTimestamp() },
      { merge: true }
    ),
    setDoc(
      doc(db, "modulosEmpresa", empresaId),
      { empresaId, modulos: modulosHabilitados || [], fechaActualizacion: serverTimestamp() },
      { merge: true }
    )
  ]);
}

export async function eliminarEmpresaDefinitivamente(empresaId) {
  const coleccionesRelacionadas = [
    "usuarios",
    "sucursales",
    "rolesEmpresa",
    "categorias",
    "marcas",
    "productos",
    "inventarios",
    "movimientosStock",
    "proveedores",
    "compras",
    "detalleCompras",
    "clientes",
    "ventas",
    "detalleVentas",
    "cajas",
    "movimientosCaja",
    "gastos",
    "cuentasCobrar",
    "cuentasPagar",
    "promociones",
    "devoluciones"
  ];

  for (const nombre of coleccionesRelacionadas) {
    const snapshot = await getDocs(
      query(collection(db, nombre), where("empresaId", "==", empresaId), limit(1))
    );
    if (!snapshot.empty) {
      throw new Error(
        `No se puede eliminar la empresa porque tiene datos relacionados en "${nombre}". Suspéndela para conservar la trazabilidad.`
      );
    }
  }

  await deleteDoc(doc(db, "empresas", empresaId));
}

/* ==========================================================
   RESPALDOS LÓGICOS - COMPATIBLE CON FIREBASE SPARK
   ----------------------------------------------------------
   - Lee las colecciones principales desde Cloud Firestore.
   - Genera un archivo JSON local.
   - Registra metadata del respaldo en /respaldos.
   - NO usa Firebase Storage.
   ========================================================== */

const BACKUP_COLLECTIONS = [
  "empresas",
  "usuarios",
  "rolesEmpresa",
  "modulos",
  "planes",
  "licencias",
  "modulosEmpresa",
  "configuracionesEmpresas",
  "personalizacionesEmpresas",
  "sucursales",
  "categorias",
  "marcas",
  "productos",
  "inventarios",
  "movimientosStock",
  "proveedores",
  "compras",
  "detalleCompras",
  "clientes",
  "ventas",
  "detalleVentas",
  "metodosPago",
  "cajas",
  "movimientosCaja",
  "gastos",
  "cuentasCobrar",
  "pagosCredito",
  "cuentasPagar",
  "pagosProveedor",
  "promociones",
  "devoluciones",
  "auditorias",
  "notificaciones",
  "notificacionesGlobales"
];

function normalizarValorParaJson(value) {
  if (value === null || value === undefined) return value ?? null;

  if (value?.toDate && typeof value.toDate === "function") {
    return {
      __tipo: "timestamp",
      valor: value.toDate().toISOString()
    };
  }

  if (
    typeof value?.latitude === "number" &&
    typeof value?.longitude === "number"
  ) {
    return {
      __tipo: "geopoint",
      latitude: value.latitude,
      longitude: value.longitude
    };
  }

  if (value?.path && typeof value.path === "string") {
    return {
      __tipo: "reference",
      path: value.path
    };
  }

  if (Array.isArray(value)) {
    return value.map(normalizarValorParaJson);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, normalizarValorParaJson(val)])
    );
  }

  return value;
}

async function calcularSha256(texto) {
  try {
    if (!globalThis.crypto?.subtle) return "";

    const bytes = new TextEncoder().encode(texto);
    const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", bytes);

    return Array.from(new Uint8Array(hashBuffer))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return "";
  }
}

export async function exportarRespaldoBasico() {
  const fecha = new Date().toISOString();

  const resultado = {
    metadata: {
      version: 3,
      tipo: "EXPORTACION_LOGICA_FIRESTORE",
      generadoEn: fecha,
      formato: "application/json",
      origen: "Cloud Firestore",
      modoAlmacenamiento: "DESCARGA_LOCAL"
    },
    resumen: {
      totalColecciones: 0,
      totalDocumentos: 0
    },
    colecciones: {}
  };

  const lecturas = await Promise.allSettled(
    BACKUP_COLLECTIONS.map(async (nombre) => {
      const snapshot = await getDocs(collection(db, nombre));
      return {
        nombre,
        documentos: snapshot.docs.map((documento) => ({
          id: documento.id,
          ...normalizarValorParaJson(documento.data())
        }))
      };
    })
  );

  const errores = [];

  lecturas.forEach((resultadoLectura, indice) => {
    const nombre = BACKUP_COLLECTIONS[indice];

    if (resultadoLectura.status === "rejected") {
      errores.push({
        coleccion: nombre,
        mensaje:
          resultadoLectura.reason?.message ||
          "No se pudo leer la colección."
      });
      return;
    }

    resultado.colecciones[nombre] = resultadoLectura.value.documentos;
    resultado.resumen.totalColecciones += 1;
    resultado.resumen.totalDocumentos += resultadoLectura.value.documentos.length;
  });

  if (errores.length > 0) {
    const nombres = errores.map((item) => item.coleccion).join(", ");
    const error = new Error(
      `No se generó un respaldo parcial. Firestore rechazó o no pudo leer: ${nombres}.`
    );
    error.detalles = errores;
    throw error;
  }

  return resultado;
}

export async function generarRespaldoLocal({
  usuarioId = "",
  usuarioNombre = "",
  usuarioCorreo = ""
} = {}) {
  const data = await exportarRespaldoBasico();
  const texto = JSON.stringify(data, null, 2);
  const blob = new Blob([texto], {
    type: "application/json;charset=utf-8"
  });

  const ahora = new Date();
  const safeStamp = ahora.toISOString().replace(/[:.]/g, "-");
  const nombreArchivo = `respaldo-multiempresa-${safeStamp}.json`;
  const checksumSha256 = await calcularSha256(texto);

  const metadataRef = doc(collection(db, "respaldos"));

  await setDoc(metadataRef, {
    nombreArchivo,
    tamanoBytes: blob.size,
    totalColecciones: data.resumen.totalColecciones,
    totalDocumentos: data.resumen.totalDocumentos,
    version: data.metadata.version,
    estado: "COMPLETADO",
    tipo: "EXPORTACION_JSON_LOCAL",
    destino: "DESCARGA_LOCAL",
    disponibleEnNube: false,
    generadoPor: usuarioId || null,
    generadoPorNombre: usuarioNombre || "",
    generadoPorCorreo: usuarioCorreo || "",
    checksumSha256: checksumSha256 || null,
    fechaRegistro: serverTimestamp(),
    fechaIso: ahora.toISOString()
  });

  return {
    id: metadataRef.id,
    nombreArchivo,
    tamanoBytes: blob.size,
    totalColecciones: data.resumen.totalColecciones,
    totalDocumentos: data.resumen.totalDocumentos,
    checksumSha256,
    fechaIso: ahora.toISOString(),
    blob,
    texto
  };
}

export function suscribirHistorialRespaldos(callback, errorCallback) {
  return onSnapshot(
    collection(db, "respaldos"),
    (snapshot) => {
      const filas = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data()
      }));

      filas.sort((a, b) => {
        const obtenerFecha = (fila) => {
          if (fila?.fechaRegistro?.toMillis) {
            return fila.fechaRegistro.toMillis();
          }
          if (fila?.fechaIso) {
            const valor = new Date(fila.fechaIso).getTime();
            return Number.isNaN(valor) ? 0 : valor;
          }
          return 0;
        };

        return obtenerFecha(b) - obtenerFecha(a);
      });

      callback(filas);
    },
    errorCallback
  );
}
