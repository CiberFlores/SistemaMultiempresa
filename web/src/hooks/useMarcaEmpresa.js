import { useEffect, useMemo, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";

import { db } from "../services/firebase/firebaseConfig";
import { IDENTIDAD_BASE, derivarTema } from "../utils/identidadEmpresa";
import useAuth from "./useAuth";

// Nombre, logo, colores y QR de cobro de la empresa del usuario, siempre al día.
export default function useMarcaEmpresa() {
  const { usuario } = useAuth();
  const empresaId = usuario?.empresaId || null;

  const [empresa, setEmpresa] = useState(null);
  const [personalizacion, setPersonalizacion] = useState(null);

  useEffect(() => {
    if (!empresaId) return undefined;

    const a = onSnapshot(
      doc(db, "empresas", empresaId),
      (d) => setEmpresa(d.exists() ? d.data() : {}),
      () => setEmpresa({})
    );
    const b = onSnapshot(
      doc(db, "personalizacionesEmpresas", empresaId),
      (d) => setPersonalizacion(d.exists() ? d.data() : {}),
      () => setPersonalizacion({})
    );

    return () => {
      a();
      b();
    };
  }, [empresaId]);

  return useMemo(() => {
    const e = empresa || {};
    const p = personalizacion || {};

    const identidad = {
      ...IDENTIDAD_BASE,
      colorPrimario: p.colorPrimario || e.identidad?.colorPrimario || IDENTIDAD_BASE.colorPrimario,
      colorSecundario: p.colorSecundario || e.identidad?.colorSecundario || IDENTIDAD_BASE.colorSecundario,
      fondo: p.fondo || e.identidad?.fondo || IDENTIDAD_BASE.fondo,
      tipografia: p.tipografia || e.identidad?.tipografia || IDENTIDAD_BASE.tipografia
    };

    const nombre = p.nombreVisual || e.nombreComercial || e.nombre || e.razonSocial || "Mi empresa";

    return {
      listo: empresa !== null && personalizacion !== null,
      nombre,
      appNombre: nombre,
      logoUrl: p.logoUrl || e.logoUrl || "",
      tema: derivarTema(identidad),
      tipografia: identidad.tipografia,
      qrUrl: e.qrCobroUrl || "",
      qrActivo: e.qrCobroActivo !== false,
      empresaDoc: e
    };
  }, [empresa, personalizacion]);
}
