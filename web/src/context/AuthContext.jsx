import { createContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "../services/firebase/firebaseConfig";
import { cerrarSesion as firebaseCerrarSesion } from "../services/firebase/authService";

export const AuthContext = createContext(null);


// Joel: Contexto de autenticación para la aplicación. 
// Brinda la información sobre el usuario autenticado y funciones para iniciar y cerrar sesión.

function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (!firebaseUser) {
          setUsuario(null);
          setCargando(false);
          return;
        }

        const referencia = doc(db, "usuarios", firebaseUser.uid);
        const documento = await getDoc(referencia);

        if (!documento.exists()) {
          setUsuario(null);
          setCargando(false);
          return;
        }

        const datos = documento.data();

        setUsuario({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          ...datos
        });
      } catch (error) {
        console.error("Error cargando usuario:", error);
        setUsuario(null);
      } finally {
        setCargando(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const cerrarSesion = async () => {
    await firebaseCerrarSesion();
    setUsuario(null);
  };

  return (
    <AuthContext.Provider
      value={{
        usuario,
        setUsuario,
        cargando,
        cerrarSesion
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;