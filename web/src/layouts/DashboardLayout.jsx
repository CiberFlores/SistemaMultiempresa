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

function DashboardLayout() {
  const location = useLocation();
  const { identidad, variables, personalizada } = usePersonalizacionEmpresa();

  // Le dice al dueño que esta persona está conectada
  usePresencia();

  return (
    <ConfirmProvider>
    <div className="admin-layout" style={variables} data-personalizada={personalizada}>
      <Sidebar marca={identidad} />

      <div className="admin-main">
        <Header />

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
