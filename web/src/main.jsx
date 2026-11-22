import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// Primero: guarda el aviso de instalación del navegador antes de que se pierda
import "./utils/instalacionApp";
import "./index.css";
import App from "./App.jsx";
import AuthProvider from "./context/AuthContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);