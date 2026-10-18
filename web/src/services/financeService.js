import { collection, doc, onSnapshot, query, runTransaction, serverTimestamp, where } from "firebase/firestore";
import { db } from "./firebase/firebaseConfig";

export function suscribirCuentas(tipo, empresaId, callback, errorCallback){
  const collectionName=tipo==="COBRAR"?"cuentasCobrar":"cuentasPagar";
  const q=query(collection(db,collectionName),where("empresaId","==",empresaId));
  return onSnapshot(q,s=>{const rows=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.fechaRegistro?.toMillis?.()||0)-(a.fechaRegistro?.toMillis?.()||0));callback(rows)},errorCallback)
}

export async function registrarPagoCuenta({tipo,cuentaId,empresaId,monto,metodoPago="EFECTIVO",observacion="",usuarioId}){
  const collectionName=tipo==="COBRAR"?"cuentasCobrar":"cuentasPagar";
  const paymentsName=tipo==="COBRAR"?"pagosCredito":"pagosProveedor";
  const cuentaRef=doc(db,collectionName,cuentaId); const pagoRef=doc(collection(db,paymentsName)); const amount=Number(monto);
  if(!Number.isFinite(amount)||amount<=0)throw new Error("El monto debe ser mayor que cero.");
  await runTransaction(db,async tx=>{const snap=await tx.get(cuentaRef);if(!snap.exists())throw new Error("La cuenta no existe.");const data=snap.data();if(data.empresaId!==empresaId)throw new Error("La cuenta no pertenece a la empresa.");const saldo=Number(data.saldo??data.total??0);if(amount>saldo)throw new Error(`El pago supera el saldo pendiente (${saldo.toFixed(2)}).`);const nuevo=Number((saldo-amount).toFixed(2));tx.update(cuentaRef,{saldo:nuevo,estadoCuenta:nuevo===0?"PAGADA":"PARCIAL",fechaActualizacion:serverTimestamp()});tx.set(pagoRef,{empresaId,cuentaId,tipo,monto:amount,metodoPago,observacion:observacion.trim(),usuarioId,fechaRegistro:serverTimestamp()});});
}
