import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

import SuperAdminSidebar from "../components/layout/SuperAdminSidebar";
import SuperAdminHeader from "../components/layout/SuperAdminHeader";

import AppShellTools from "../components/ui/AppShellTools.jsx";
import ConfirmProvider from "../components/ui/ConfirmProvider.jsx";

import "../styles/superadmin.css";
import "../styles/innovation.css";
import "../styles/superadmin-marca.css";
import "../styles/superadmin-paginas.css";
import "../styles/superadmin-resto.css";
import "../styles/superadmin-movil.css";
import "../styles/superadmin-cabecera.css";

function SuperAdminLayout() {
  const location = useLocation();
  const [menuAbierto, setMenuAbierto] = useState(false);

  // Escape cierra el menú deslizable en pantallas pequeñas
  useEffect(() => {
    if (!menuAbierto) {
      return undefined;
    }

    const alTeclear = (evento) => {
      if (evento.key === "Escape") {
        setMenuAbierto(false);
      }
    };

    window.addEventListener("keydown", alTeclear);

    return () => window.removeEventListener("keydown", alTeclear);
  }, [menuAbierto]);

  return (
    <ConfirmProvider>
    <div className="sa-layout">
      <SuperAdminSidebar
        abierto={menuAbierto}
        onNavegar={() => setMenuAbierto(false)}
      />

      <div
        className="sa-scrim"
        data-abierto={menuAbierto}
        onClick={() => setMenuAbierto(false)}
        aria-hidden="true"
      />

      <div className="sa-main">
        <SuperAdminHeader
          menuAbierto={menuAbierto}
          onAbrirMenu={() => setMenuAbierto(true)}
        />

        <AnimatePresence mode="wait">
          <motion.main
            key={location.pathname}
            className="sa-content"
            initial={{
              opacity: 0,
              y: 10
            }}
            animate={{
              opacity: 1,
              y: 0
            }}
            exit={{
              opacity: 0,
              y: -6
            }}
            transition={{
              duration: 0.25,
              ease: "easeOut"
            }}
          >
            <Outlet />
            <AppShellTools />
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
    </ConfirmProvider>
  );
}

export default SuperAdminLayout;
