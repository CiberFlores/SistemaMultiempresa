import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

import SuperAdminSidebar from "../components/layout/SuperAdminSidebar";
import SuperAdminHeader from "../components/layout/SuperAdminHeader";

import "../styles/superadmin.css";

function SuperAdminLayout() {
  const location = useLocation();

  return (
    <div className="sa-layout">
      <SuperAdminSidebar />

      <div className="sa-main">
        <SuperAdminHeader />

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
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default SuperAdminLayout;