import { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import useAuth from "./useAuth";
import { db } from "../services/firebase/firebaseConfig";

export default function useCompanyModules(){
  const {usuario}=useAuth();
  const [state,setState]=useState({loading:true,unrestricted:true,codes:new Set()});
  useEffect(()=>{let active=true;(async()=>{
    if(!usuario?.empresaId){if(active)setState({loading:false,unrestricted:true,codes:new Set()});return;}
    try{
      const [modsSnap,overrideSnap,licensesSnap]=await Promise.all([
        getDocs(collection(db,"modulos")),
        getDoc(doc(db,"modulosEmpresa",usuario.empresaId)),
        getDocs(query(collection(db,"licencias"),where("empresaId","==",usuario.empresaId)))
      ]);
      const modules=modsSnap.docs.map(d=>({id:d.id,...d.data()}));
      let ids=overrideSnap.exists()&&Array.isArray(overrideSnap.data().modulos)?overrideSnap.data().modulos:[];
      if(!ids.length){
        const activeLicense=licensesSnap.docs.map(d=>({id:d.id,...d.data()})).find(l=>l.estado==="ACTIVA");
        if(activeLicense?.planId){const plan=await getDoc(doc(db,"planes",activeLicense.planId));if(plan.exists()&&Array.isArray(plan.data().modulos))ids=plan.data().modulos;}
      }
      const unrestricted=!ids.length;
      const codes=new Set(modules.filter(m=>ids.includes(m.id)).map(m=>String(m.codigo||"").toUpperCase()));
      if(active)setState({loading:false,unrestricted,codes});
    }catch(error){console.error("No se pudo resolver módulos de empresa:",error);if(active)setState({loading:false,unrestricted:true,codes:new Set()});}
  })();return()=>{active=false}},[usuario?.empresaId]);
  return {...state,isEnabled:(code)=>state.unrestricted||state.codes.has(String(code||"").toUpperCase())};
}
