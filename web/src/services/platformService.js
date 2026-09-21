import { collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase/firebaseConfig";

export function suscribirAdministradores(callback, errorCallback) {
  return onSnapshot(collection(db, "usuarios"), (snapshot) => {
    const rows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() })).filter((item) => item.tipoUsuario === "ADMIN");
    rows.sort((a,b)=>(a.nombreCompleto||"").localeCompare(b.nombreCompleto||"")); callback(rows);
  }, errorCallback);
}

export async function cargarControlEmpresa(empresaId) {
  const [empresa, config, personalizacion, modulosEmpresa, modulos, planes, licencias] = await Promise.all([
    getDoc(doc(db,"empresas",empresaId)),
    getDoc(doc(db,"configuracionesEmpresas",empresaId)),
    getDoc(doc(db,"personalizacionesEmpresas",empresaId)),
    getDoc(doc(db,"modulosEmpresa",empresaId)),
    getDocs(collection(db,"modulos")), getDocs(collection(db,"planes")), getDocs(collection(db,"licencias"))
  ]);
  if (!empresa.exists()) throw new Error("La empresa no existe.");
  return {
    empresa:{id:empresa.id,...empresa.data()}, config:config.exists()?config.data():{}, personalizacion:personalizacion.exists()?personalizacion.data():{},
    modulosEmpresa:modulosEmpresa.exists()?modulosEmpresa.data():{}, modulos:modulos.docs.map(d=>({id:d.id,...d.data()})), planes:planes.docs.map(d=>({id:d.id,...d.data()})),
    licencias:licencias.docs.map(d=>({id:d.id,...d.data()})).filter(l=>l.empresaId===empresaId)
  };
}

export async function guardarConfiguracionEmpresaGlobal(empresaId, { empresa, config, personalizacion, modulosHabilitados }) {
  await Promise.all([
    updateDoc(doc(db,"empresas",empresaId), {...empresa, fechaActualizacion:serverTimestamp()}),
    setDoc(doc(db,"configuracionesEmpresas",empresaId), {...config, empresaId, fechaActualizacion:serverTimestamp()}, {merge:true}),
    setDoc(doc(db,"personalizacionesEmpresas",empresaId), {...personalizacion, empresaId, fechaActualizacion:serverTimestamp()}, {merge:true}),
    setDoc(doc(db,"modulosEmpresa",empresaId), {empresaId, modulos:modulosHabilitados || [], fechaActualizacion:serverTimestamp()}, {merge:true})
  ]);
}

export async function eliminarEmpresaDefinitivamente(empresaId) {
  await deleteDoc(doc(db,"empresas",empresaId));
}

export async function exportarRespaldoBasico() {
  const names=["empresas","usuarios","rolesEmpresa","modulos","planes","licencias","sucursales","categorias","marcas","productos","inventarios","movimientosStock","proveedores","compras","detalleCompras","clientes","ventas","detalleVentas","cajas","movimientosCaja","gastos","cuentasCobrar","cuentasPagar","promociones","devoluciones","auditorias","notificaciones"];
  const result={version:1,fecha:new Date().toISOString(),colecciones:{}};
  for (const name of names) { const snap=await getDocs(collection(db,name)); result.colecciones[name]=snap.docs.map(d=>({id:d.id,...d.data()})); }
  return result;
}
