import { useEffect } from "react";

import {
  BrowserRouter,
  Navigate,
  useLocation
} from "react-router-dom";

import AppRoutes from "./routes/AppRoutes";

import MobileLayout from "./components/admin-movil/MobileLayout";

import MobileInstallButton from "./components/admin-movil/MobileInstallButton";

import useAuth from "./hooks/useAuth";


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

function AplicacionActual() {

  const ubicacion = useLocation();

  const {
    usuario,
    cargando
  } = useAuth();


  // ========================================
  // D. COMPROBAR SESION Y ROL
  // ========================================

  const esAdministrador =

    !cargando &&

    usuario?.tipoUsuario === "ADMIN" &&

    Boolean(usuario?.empresaId);


  // ========================================
  // E. COMPROBAR SI ESTA INSTALADA
  // ========================================

  const instalada = estaInstalada();


  // ========================================
  // F. IDENTIFICAR PANTALLAS PUBLICAS
  // ========================================

  const esRutaPublica = [

    "/",

    "/login",

    "/recuperar-contrasena",

    "/sin-permiso"

  ].includes(ubicacion.pathname);


  // ========================================
  // G. CONTROLAR BOTON DE INSTALACION
  // ========================================

  // SOLO PERMITIMOS MOSTRAR NUESTRO BOTON
  // CUANDO EL USUARIO YA INICIO SESION,
  // ES ADMINISTRADOR Y TIENE EMPRESA.
  //
  // SI LA APP YA ESTA INSTALADA EN MODO
  // STANDALONE, NO MOSTRAMOS EL BOTON.

  const puedeMostrarInstalacion =

    esAdministrador &&

    !esRutaPublica &&

    !instalada;


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

    // MOBILELAYOUT COMPRUEBA EL USUARIO,
    // EL ROL ADMIN Y SU EMPRESA.

    contenido = <MobileLayout />;

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
        to="/admin-movil"
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


      {/* ================================= */}
      {/* INSTALACION CONTROLADA */}
      {/* ================================= */}

      {/*
        MANTENEMOS EL COMPONENTE MONTADO
        PARA QUE PUEDA ESCUCHAR EL EVENTO
        DE INSTALACION DEL NAVEGADOR.

        CUANDO NO EXISTE UN ADMIN VALIDADO,
        RECIBE NULL Y NO MUESTRA SU BOTON.

        MOBILEINSTALLBUTTON TAMBIEN
        COMPRUEBA SI ES CELULAR O TABLET.
      */}

      <MobileInstallButton

        usuario={
          puedeMostrarInstalacion
            ? usuario
            : null
        }

      />

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