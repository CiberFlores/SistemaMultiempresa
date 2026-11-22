import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";

import Header from "../components/layout/Header";
import Sidebar from "../components/layout/Sidebar";
import usePersonalizacionEmpresa from "../hooks/usePersonalizacionEmpresa";
import usePresencia from "../hooks/usePresencia";

import AppShellTools from "../components/ui/AppShellTools.jsx";
import ConfirmProvider from "../components/ui/ConfirmProvider.jsx";

import "../styles/dashboard.css";
import "../styles/sprint2.css";
import "../styles/commerce.css";
import "../styles/innovation.css";
import "../styles/empresa-tema.css";
import "../styles/empresa-panel.css";
import "../styles/menu-movil.css";

function DashboardLayout() {
  const location = useLocation();
  // El menú queda abierto solo en la página donde se abrió: al navegar se cierra solo
  const [abiertoEn, setAbiertoEn] = useState(null);
  const menuAbierto = abiertoEn === location.pathname;
  const cerrarMenu = () => setAbiertoEn(null);
  const { identidad, variables, personalizada } = usePersonalizacionEmpresa();

  // Le dice al dueño que esta persona está conectada
  usePresencia();

  // Escape cierra el menú y la página de atrás no se mueve mientras está abierto
  useEffect(() => {
    if (!menuAbierto) return undefined;

    const alTeclear = (e) => {
      if (e.key === "Escape") setAbiertoEn(null);
    };

    document.addEventListener("keydown", alTeclear);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = "";
    };
  }, [menuAbierto]);

  return (
    <ConfirmProvider>
    <div className="admin-layout" style={variables} data-personalizada={personalizada}>
      <Sidebar marca={identidad} abierto={menuAbierto} onCerrar={cerrarMenu} />

      <div className="admin-fondo-menu" data-abierto={menuAbierto} onClick={cerrarMenu} aria-hidden="true" />

      <div className="admin-main">
        <Header onMenu={() => setAbiertoEn(menuAbierto ? null : location.pathname)} menuAbierto={menuAbierto} />

        <AnimatePresence mode="wait">
          <motion.main
            key={location.pathname}
            className="admin-content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
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

export default DashboardLayout;
