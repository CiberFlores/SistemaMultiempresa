import { useEffect } from "react";

import {
  BrowserRouter,
  Navigate,
  useLocation
} from "react-router-dom";

import AppRoutes from "./routes/AppRoutes";

import LoginPage from "./pages/auth/LoginPage.jsx";

import pagina from "./routes/pagina";



import { guardarMotivoSalida } from "./utils/sesion";

import useAuth from "./hooks/useAuth";

import useMarcaEmpresa from "./hooks/useMarcaEmpresa";

import { aplicarMarcaApp } from "./utils/appMovilMarca";

const InstalarAppPage = pagina(() => import("./pages/empresa/InstalarAppPage"));
const MobileLayout = pagina(() => import("./components/admin-movil/MobileLayout"));


// ==========================================
// A. REGISTRAR MULTIEMPRESA GO
// ==========================================

// EL SERVICE WORKER PERMITE QUE
// EL NAVEGADOR RECONOZCA NUESTRA PWA.

function RegistrarPWA() {

  useEffect(() => {

    if (!("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker

      .register("/sw.js", {
        scope: "/"
      })

      .then(() => {

        console.log(
          "Arca Nova GO: Service Worker registrado."
        );

      })

      .catch((error) => {

        console.warn(
          "Error registrando Arca Nova GO:",
          error
        );

      });

  }, []);

  return null;

}


// ==========================================
// B. DETECTAR SI LA APP ESTA INSTALADA
// ==========================================

function estaInstalada() {

  const standalone = window.matchMedia(
    "(display-mode: standalone)"
  ).matches;

  const ios = window.navigator.standalone === true;

  return standalone || ios;

}


// ==========================================
// C. CONTROLAR WEB Y APLICACION MOVIL
// ==========================================

function SalirDeOtraEmpresa({ salir }) {
  useEffect(() => {
    guardarMotivoSalida("Esta app es de otra empresa. Entra con la cuenta de su dueño.");
    salir();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- se hace una sola vez
  }, []);

  return null;
}

function AplicacionActual() {

  const ubicacion = useLocation();

  const {
    usuario,
    cargando,
    cerrarSesion
  } = useAuth();


  // ========================================
  // D. COMPROBAR SESION Y ROL
  // ========================================

  const esAdministrador =

    !cargando &&

    usuario?.tipoUsuario === "ADMIN" &&

    Boolean(usuario?.empresaId);


  const empresaId = usuario?.empresaId;

  // La app se instala con el nombre, el icono y los colores de la empresa
  const marca = useMarcaEmpresa();

  useEffect(() => {
    if (!esAdministrador || !marca.listo) return;

    aplicarMarcaApp({
      empresaId,
      nombre: marca.nombre,
      logoUrl: marca.logoUrl,
      primario: marca.tema.primario,
      sobre: marca.tema.sobrePrimario,
      fondo: marca.tema.fondo
    }).catch(console.warn);
  }, [esAdministrador, empresaId, marca.listo, marca.nombre, marca.logoUrl, marca.tema.primario, marca.tema.sobrePrimario, marca.tema.fondo]);

  // ========================================
  // E. COMPROBAR SI ESTA INSTALADA
  // ========================================

  const instalada = estaInstalada();


  // ========================================
  // H. IDENTIFICAR PANEL MOVIL
  // ========================================

  const esRutaMovil =

    ubicacion.pathname === "/admin-movil" ||

    ubicacion.pathname.startsWith(
      "/admin-movil/"
    );


  // ========================================
  // I. PREPARAR CONTENIDO
  // ========================================

  let contenido;


  // ========================================
  // J. ABRIR MULTIEMPRESA GO
  // ========================================

  if (esRutaMovil) {

    const rutaPropia = `/admin-movil/${empresaId}`;
    const rutaConEmpresa = /^\/admin-movil\/[^/]+/.test(ubicacion.pathname);
    const quiereInstalar = new URLSearchParams(ubicacion.search).has("instalar");

    // Sin sesión se entra aquí mismo: si la app instalada saliera a /login,
    // el celular mostraría la barra del navegador.
    if (!cargando && !usuario) contenido = <LoginPage />;

    // La app instalada es de una sola empresa: otra cuenta no entra en ella
    else if (instalada && esAdministrador && rutaConEmpresa && ubicacion.pathname !== rutaPropia) contenido = <SalirDeOtraEmpresa salir={cerrarSesion} />;

    // Cada dueño abre solo la app de su empresa
    else if (esAdministrador && ubicacion.pathname !== rutaPropia) contenido = <Navigate to={rutaPropia + ubicacion.search} replace />;

    else if (esAdministrador && quiereInstalar && !instalada) contenido = <InstalarAppPage empresaId={empresaId} />;

    // MOBILELAYOUT COMPRUEBA EL USUARIO,
    // EL ROL ADMIN Y SU EMPRESA.
    else contenido = <MobileLayout />;

  }


  // ========================================
  // K. REDIRIGIR ADMIN INSTALADO
  // ========================================

  else if (

    instalada &&

    esAdministrador &&

    ubicacion.pathname === "/dashboard"

  ) {

    contenido = (

      <Navigate
        to={`/admin-movil/${empresaId}`}
        replace
      />

    );

  }


  // ========================================
  // L. MOSTRAR PAGINA WEB NORMAL
  // ========================================

  else {

    contenido = <AppRoutes />;

  }


  // ========================================
  // M. MOSTRAR INTERFAZ
  // ========================================

  return (

    <>

      {/* PAGINA WEB O PANEL MOVIL */}

      {contenido}


    </>

  );

}


// ==========================================
// N. APLICACION PRINCIPAL
// ==========================================

export default function App() {

  return (

    <BrowserRouter>

      {/* REGISTRAR PWA */}

      <RegistrarPWA />


      {/* WEB Y MULTIEMPRESA GO */}

      <AplicacionActual />

    </BrowserRouter>

  );

}