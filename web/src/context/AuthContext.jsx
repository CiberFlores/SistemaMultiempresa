import { createContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../services/firebase/firebaseConfig";
import {
  cerrarSesion as firebaseCerrarSesion,
  empresaSuspendida,
  recordarEmpresaBloqueada
} from "../services/firebase/authService";

// Saca a la persona; la pantalla de inicio la lleva a la pantalla de cuenta bloqueada
async function expulsarPorEmpresaSuspendida(nombre) {
  recordarEmpresaBloqueada(nombre);
  await signOut(auth);
}

const CAMPOS_VIVOS = ["empresaId", "tipoUsuario", "rolId", "sucursales", "nombreCompleto", "telefono", "imagenPerfilUrl"];

export const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (!firebaseUser) { setUsuario(null); return; }
        await firebaseUser.reload();
        if (!firebaseUser.emailVerified) { setUsuario(null); return; }
        const documento = await getDoc(doc(db, "usuarios", firebaseUser.uid));
        if (!documento.exists()) { setUsuario(null); await signOut(auth); return; }
        const datos = documento.data();
        if (datos.estado !== true) { setUsuario(null); await signOut(auth); return; }
        const bloqueo = datos.tipoUsuario !== "SUPER_ADMIN" ? await empresaSuspendida(datos.empresaId) : null;
        if (bloqueo) { setUsuario(null); await expulsarPorEmpresaSuspendida(bloqueo.nombre); return; }
        setUsuario({ uid: firebaseUser.uid, email: firebaseUser.email, emailVerified: firebaseUser.emailVerified, ...datos });
      } catch (error) {
        console.error("Error cargando usuario:", error);
        setUsuario(null);
        if (error?.code === "permission-denied") await signOut(auth).catch(() => {});
      } finally { setCargando(false); }
    });
    return () => unsubscribe();
  }, []);

  // Si el administrador suspende la empresa mientras alguien trabaja, se le avisa y sale al instante
  const empresaId = usuario?.tipoUsuario === "SUPER_ADMIN" ? null : usuario?.empresaId;

  useEffect(() => {
    if (!empresaId) return undefined;

    return onSnapshot(
      doc(db, "empresas", empresaId),
      (documento) => {
        if (documento.exists() && documento.data().estado === "SUSPENDIDA") {
          const d = documento.data();
          setUsuario(null);
          expulsarPorEmpresaSuspendida(d.nombreComercial || d.nombre || d.razonSocial || "");
        }
      },
      () => {}
    );
  }, [empresaId]);

  // Si desactivan la cuenta o le cambian el cargo, se aplica sin volver a entrar
  const uid = usuario?.uid;

  useEffect(() => {
    if (!uid) return undefined;

    return onSnapshot(
      doc(db, "usuarios", uid),
      (documento) => {
        const datos = documento.data();
        if (!datos) return;
        if (datos.estado !== true) { setUsuario(null); signOut(auth); return; }
        setUsuario((actual) => {
          if (!actual) return actual;
          const igual = CAMPOS_VIVOS.every((k) => JSON.stringify(actual[k]) === JSON.stringify(datos[k]));
          return igual ? actual : { ...actual, ...datos };
        });
      },
      (error) => {
        if (error.code === "permission-denied") { setUsuario(null); signOut(auth); }
      }
    );
  }, [uid]);

  const cerrarSesion = async () => { await firebaseCerrarSesion(); setUsuario(null); };

  return <AuthContext.Provider value={{ usuario, setUsuario, cargando, cerrarSesion }}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
