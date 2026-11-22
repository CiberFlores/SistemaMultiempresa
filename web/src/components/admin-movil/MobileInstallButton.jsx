import useMarcaEmpresa from "../../hooks/useMarcaEmpresa";

import {
  useEffect,
  useRef,
  useState
} from "react";

import {
  Download,
  Smartphone,
  X,
  CheckCircle2
} from "lucide-react";


// ==========================================
// A. COMPROBAR SI ES CELULAR O TABLET
// ==========================================

function esDispositivoMovil() {

  const agente = navigator.userAgent || "";

  const esMovil = /Android|iPhone|iPad|iPod/i.test(
    agente
  );

  const esTablet =

    navigator.maxTouchPoints > 1 &&

    window.innerWidth <= 1400;

  return esMovil || esTablet;

}


// ==========================================
// B. COMPROBAR SI YA ESTA INSTALADA
// ==========================================

function yaInstalada() {

  const standalone = window.matchMedia(
    "(display-mode: standalone)"
  ).matches;

  const ios = window.navigator.standalone === true;

  return standalone || ios;

}


// ==========================================
// C. BOTON DE INSTALACION
// ==========================================

export default function MobileInstallButton({
  usuario
}) {
  // La app se llama como la empresa: "OXXO GO"
  const marca = useMarcaEmpresa();


  const promptRef = useRef(null);

  const [disponible, setDisponible] = useState(false);

  const [instalada, setInstalada] = useState(
    yaInstalada
  );

  const [oculto, setOculto] = useState(false);

  const [mostrarAyuda, setMostrarAyuda] = useState(false);


  // ========================================
  // D. ESCUCHAR INSTALACION
  // ========================================

  useEffect(() => {

    function prepararInstalacion(evento) {

      evento.preventDefault();

      promptRef.current = evento;

      setDisponible(true);

    }


    function instalacionCompletada() {

      promptRef.current = null;

      setDisponible(false);

      setInstalada(true);

      setMostrarAyuda(false);

    }


    window.addEventListener(
      "beforeinstallprompt",
      prepararInstalacion
    );

    window.addEventListener(
      "appinstalled",
      instalacionCompletada
    );


    return () => {

      window.removeEventListener(
        "beforeinstallprompt",
        prepararInstalacion
      );

      window.removeEventListener(
        "appinstalled",
        instalacionCompletada
      );

    };

  }, []);


  // ========================================
  // E. INSTALAR
  // ========================================

  async function instalar() {

    const evento = promptRef.current;


    // CHROME TODAVIA NO OFRECE INSTALACION.
    // MOSTRAMOS INSTRUCCIONES MANUALES.

    if (!evento) {

      setMostrarAyuda(true);

      return;

    }


    try {

      await evento.prompt();

      const resultado = await evento.userChoice;

      promptRef.current = null;

      setDisponible(false);


      if (resultado?.outcome === "accepted") {

        setOculto(true);

      } else {

        setMostrarAyuda(true);

      }

    } catch (error) {

      console.error(error);

      setMostrarAyuda(true);

    }

  }


  // ========================================
  // F. SOLO ADMINISTRADORES
  // ========================================

  if (
    usuario?.tipoUsuario !== "ADMIN" ||

    !usuario?.empresaId ||

    !esDispositivoMovil() ||

    instalada ||

    oculto
  ) {

    return null;

  }


  // ========================================
  // G. INTERFAZ
  // ========================================

  return (

    <div
      style={{

        position: "fixed",

        bottom: 18,

        right: 14,

        zIndex: 99999,

        width: "min(365px, calc(100vw - 28px))",

        padding: 18,

        background:
          "linear-gradient(145deg, #29204f, #111a30)",

        border: "1px solid rgba(180,153,255,.36)",

        borderRadius: 23,

        boxShadow:
          "0 18px 65px rgba(0,0,0,.65)",

        color: "white",

        fontFamily: "inherit"

      }}
    >

      {/* CERRAR */}

      <button
        type="button"
        onClick={() => setOculto(true)}
        aria-label="Cerrar invitación"
        style={{

          position: "absolute",

          top: 12,

          right: 12,

          border: 0,

          background: "transparent",

          color: "#b7b0d6",

          cursor: "pointer"

        }}
      >

        <X size={18} />

      </button>


      {/* CABECERA */}

      <div
        style={{

          display: "flex",

          alignItems: "center",

          gap: 12,

          marginBottom: 15

        }}
      >

        <div
          style={{

            width: 49,

            height: 49,

            display: "grid",

            placeItems: "center",

            borderRadius: 15,

            background:
              "linear-gradient(135deg,#8355fa,#40b9ed)"

          }}
        >

          <Smartphone size={25} />

        </div>


        <div>

          <strong
            style={{

              display: "block",

              fontSize: 16

            }}
          >

            {marca.appNombre}

          </strong>


          <small
            style={{

              color: "#a9b5d2",

              fontSize: 11

            }}
          >

            Tu negocio en el bolsillo

          </small>

        </div>

      </div>


      {/* DESCRIPCION */}

      <p
        style={{

          fontSize: 12,

          lineHeight: 1.7,

          color: "#c2c8e0",

          marginBottom: 17

        }}
      >

        Instala el panel de tu empresa para
        consultar productos, fotografías,
        existencias, ventas y alertas.

      </p>


      {/* BOTON */}

      <button
        type="button"
        onClick={instalar}
        style={{

          display: "flex",

          justifyContent: "center",

          alignItems: "center",

          gap: 9,

          width: "100%",

          padding: "15px 12px",

          background:
            "linear-gradient(135deg,#8457f6,#457ded)",

          color: "#fff",

          border: 0,

          borderRadius: 14,

          fontWeight: 800,

          fontSize: 13,

          cursor: "pointer"

        }}
      >

        {disponible
          ? <Download size={19} />
          : <Smartphone size={19} />}

        Instalar {marca.appNombre}

      </button>


      {/* INSTRUCCIONES MANUALES */}

      {mostrarAyuda && (

        <div
          style={{

            marginTop: 14,

            padding: 13,

            borderRadius: 13,

            background: "rgba(255,255,255,.07)",

            fontSize: 12,

            lineHeight: 1.8

          }}
        >

          <CheckCircle2
            size={16}
            style={{

              display: "inline-block",

              marginRight: 6,

              color: "#80e0be"

            }}
          />


          {/iPhone|iPad|iPod/i.test(
            navigator.userAgent
          )

            ? (
              <>
                Abre esta página en Safari,
                toca Compartir y selecciona
                «Añadir a pantalla de inicio».
              </>
            )

            : (
              <>
                En Chrome toca el menú ⋮ y
                selecciona «Instalar aplicación»
                o «Añadir a pantalla de inicio».
              </>
            )

          }

        </div>

      )}


      {/* NOTA */}

      <small
        style={{

          display: "block",

          textAlign: "center",

          marginTop: 12,

          color: "#9ba5c6",

          fontSize: 10

        }}
      >

        Exclusivo para administradores

      </small>

    </div>

  );

}