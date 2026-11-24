import { useEffect, useMemo, useRef, useState } from "react";
import mensajeError from "../../utils/mensajeError";
import { Check, Lock, RotateCcw, Save } from "lucide-react";

import useAuth from "../../hooks/useAuth";
import usePersonalizacionEmpresa from "../../hooks/usePersonalizacionEmpresa";
import IdentidadVisualEditor from "../../components/empresa/IdentidadVisualEditor";
import VistaPreviaPanel from "../../components/empresa/VistaPreviaPanel";
import {
  obtenerConfiguracionEmpresa,
  obtenerEmpresa
} from "../../services/configuracionEmpresaService";
import {
  guardarIdentidadPropia,
  quitarLogoEmpresa,
  subirLogoEmpresa
} from "../../services/brandingEmpresaService";
import { IDENTIDAD_BASE, variablesPanel } from "../../utils/identidadEmpresa";
import { sonidoExito } from "../../utils/sonidos";

import "../../styles/roles-empresa.css";
import "../../styles/configuracion-empresa.css";

const vacio = "—";

const CLAVES_TEMA = Object.keys(variablesPanel(IDENTIDAD_BASE));

// Foto de los colores que el panel tiene en este momento
function tomarColores(raiz) {
  return Object.fromEntries(CLAVES_TEMA.map((nombre) => [nombre, raiz.style.getPropertyValue(nombre)]));
}

// Devuelve el panel a los colores que tenía antes de empezar a probar
function devolverColores(raiz, colores) {
  CLAVES_TEMA.forEach((nombre) => {
    if (colores[nombre]) raiz.style.setProperty(nombre, colores[nombre]);
    else raiz.style.removeProperty(nombre);
  });
}

export default function ConfiguracionEmpresaPage() {
  const { usuario } = useAuth();
  const { identidad: guardada } = usePersonalizacionEmpresa();

  const [empresa, setEmpresa] = useState(null);
  const [configuracion, setConfiguracion] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Cambios sin guardar (null = sin cambios)
  const [borrador, setBorrador] = useState(null);
  const [logoArchivo, setLogoArchivo] = useState(null);
  const [logoQuitado, setLogoQuitado] = useState(false);

  useEffect(() => {
    if (!usuario?.empresaId) return undefined;

    let activo = true;

    Promise.all([
      obtenerEmpresa(usuario.empresaId),
      obtenerConfiguracionEmpresa(usuario.empresaId).catch(() => null)
    ])
      .then(([datosEmpresa, datosConfiguracion]) => {
        if (!activo) return;
        setEmpresa(datosEmpresa || {});
        setConfiguracion(datosConfiguracion || {});
      })
      .catch((fallo) => {
        console.error(fallo);
        if (activo) setError("No se pudo cargar la información de la empresa.");
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [usuario?.empresaId]);

  useEffect(() => {
    if (!aviso) return undefined;
    const temporizador = setTimeout(() => setAviso(""), 4500);
    return () => clearTimeout(temporizador);
  }, [aviso]);

  // Identidad guardada, completa
  const identidadBase = useMemo(
    () => ({
      ...IDENTIDAD_BASE,
      ...(guardada || {}),
      nombreVisual: guardada?.nombreVisual || empresa?.nombreComercial || "",
      logoUrl: guardada?.logoUrl || empresa?.logoUrl || ""
    }),
    [guardada, empresa]
  );

  const identidad = borrador || identidadBase;
  const hayCambios = borrador !== null;

  // Colores que tenía el panel antes de empezar a probar (null = no se está probando nada)
  const coloresOriginales = useRef(null);

  // Los colores se ven al instante en TODO el panel (menú, botones, tarjetas)
  useEffect(() => {
    const raiz = document.querySelector(".admin-layout");
    if (!raiz) return;

    if (borrador) {
      if (!coloresOriginales.current) {
        coloresOriginales.current = tomarColores(raiz);
      }

      Object.entries(variablesPanel(borrador)).forEach(([nombre, valor]) =>
        raiz.style.setProperty(nombre, valor)
      );
    } else if (coloresOriginales.current) {
      devolverColores(raiz, coloresOriginales.current);
      coloresOriginales.current = null;
    }
  }, [borrador]);

  // Al salir de la página sin guardar, el panel vuelve a sus colores guardados
  useEffect(
    () => () => {
      const raiz = document.querySelector(".admin-layout");

      if (raiz && coloresOriginales.current) {
        devolverColores(raiz, coloresOriginales.current);
        coloresOriginales.current = null;
      }
    },
    []
  );

  const cambiar = (parcial) => {
    setBorrador((previo) => ({ ...(previo || identidadBase), ...parcial }));
  };

  const descartar = () => {
    setBorrador(null);
    setLogoArchivo(null);
    setLogoQuitado(false);
    setError("");
  };

  const guardar = async () => {
    if (!hayCambios || guardando) return;

    try {
      setGuardando(true);
      setError("");

      let logoUrl = identidad.logoUrl || "";

      if (logoArchivo) {
        logoUrl = await subirLogoEmpresa(usuario.empresaId, logoArchivo.blob, logoArchivo.extension);
      } else if (logoQuitado) {
        await quitarLogoEmpresa(usuario.empresaId);
        logoUrl = "";
      } else if (logoUrl.startsWith("blob:")) {
        logoUrl = identidadBase.logoUrl;
      }

      await guardarIdentidadPropia(usuario.empresaId, { ...identidad, logoUrl });

      coloresOriginales.current = null;
      setBorrador(null);
      setLogoArchivo(null);
      setLogoQuitado(false);
      setAviso("Listo: los colores y el logo de tu empresa quedaron guardados.");
      sonidoExito();
    } catch (fallo) {
      console.error(fallo);
      setError(
        fallo?.code === "permission-denied"
          ? "No tienes permiso para cambiar la imagen de la empresa."
          : mensajeError(fallo, "No se pudieron guardar los cambios.")
      );
    } finally {
      setGuardando(false);
    }
  };

  const datos = [
    ["Nombre comercial", empresa?.nombreComercial],
    ["Razón social", empresa?.razonSocial],
    ["Rubro", empresa?.rubro],
    ["NIT", empresa?.nit],
    ["Teléfono", empresa?.telefono],
    ["Correo", empresa?.correo],
    ["Dirección", empresa?.direccion],
    ["Ciudad", empresa?.ciudad],
    ["País", empresa?.pais]
  ];

  const moneda = configuracion?.monedaCodigo
    ? `${configuracion.monedaCodigo}${configuracion.simboloMoneda ? ` (${configuracion.simboloMoneda})` : ""}`
    : "";

  return (
    <div className="re cf">
      <header className="re-cabecera">
        <div>
          <h1>Configuración</h1>
          <p>Cambia el logo y los colores de tu empresa. Se ven al instante en todo el panel.</p>
        </div>
      </header>

      {aviso && (
        <div className="re-aviso re-aviso--ok" role="status">
          <Check size={18} />
          {aviso}
        </div>
      )}

      {error && (
        <div className="re-aviso re-aviso--error" role="alert">
          {error}
        </div>
      )}

      <section className="cf-identidad" aria-label="Identidad visual">
        <div className="cf-editor">
          <IdentidadVisualEditor
            valor={identidad}
            onChange={cambiar}
            rubro={empresa?.rubro}
            nombre={empresa?.nombreComercial}
            ocultarNombre
            ocultarTipografia
            alLogo={(resultado) => {
              setLogoArchivo(resultado);
              setLogoQuitado(false);
              cambiar({ logoUrl: resultado.vistaPrevia });
            }}
            alQuitarLogo={() => {
              setLogoArchivo(null);
              setLogoQuitado(true);
              cambiar({ logoUrl: "" });
            }}
          />
        </div>

        <div className="cf-vista">
          <VistaPreviaPanel
            identidad={identidad}
            nombre={empresa?.nombreComercial}
            rubro={empresa?.rubro}
          />
        </div>
      </section>

      <div className="cf-barra" data-visible={hayCambios}>
        <p>
          {hayCambios
            ? "Tienes cambios sin guardar. Así se ve tu panel ahora mismo."
            : "Cambia un color o el logo y verás el resultado al instante."}
        </p>
        <div className="cf-barra__botones">
          <button
            type="button"
            className="re-boton re-boton--suave"
            onClick={descartar}
            disabled={!hayCambios || guardando}
          >
            <RotateCcw size={16} />
            Descartar
          </button>
          <button type="button" className="re-boton" onClick={guardar} disabled={!hayCambios || guardando}>
            <Save size={17} />
            {guardando ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>

      <section className="cf-info" aria-label="Información de la empresa">
        <header className="cf-info__cabecera">
          <div>
            <h2>Información de la empresa</h2>
            <p>Estos datos los administra Arca Nova. Si necesitas cambiar alguno, comunícate con soporte.</p>
          </div>
          <span className="cf-candado">
            <Lock size={15} aria-hidden="true" />
            Solo lectura
          </span>
        </header>

        {cargando ? (
          <p className="re-ayuda">Cargando información…</p>
        ) : (
          <dl className="cf-datos">
            {datos.map(([titulo, valor]) => (
              <div key={titulo}>
                <dt>{titulo}</dt>
                <dd>{valor || vacio}</dd>
              </div>
            ))}
            <div>
              <dt>Moneda</dt>
              <dd>{moneda || vacio}</dd>
            </div>
            <div className="cf-datos__ancho">
              <dt>Reglas operativas</dt>
              <dd>{configuracion?.reglasOperacion || vacio}</dd>
            </div>
          </dl>
        )}
      </section>
    </div>
  );
}
