import { AnimatePresence, motion } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";

import Header from "../components/layout/Header";
import Sidebar from "../components/layout/Sidebar";

import "../styles/dashboard.css";
import "../styles/sprint2.css";
import "../styles/commerce.css";

function DashboardLayout() {
  const location = useLocation();

  return (
    <div className="admin-layout">
      <Sidebar />

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
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default DashboardLayout;
