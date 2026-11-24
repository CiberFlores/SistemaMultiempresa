import "../../styles/empresa-identidad.css";
import { ImagePlus, Sparkles, Trash2, Upload } from "lucide-react";
import mensajeError from "../../utils/mensajeError";

import { useId, useRef, useState } from "react";

import {
  PALETAS,
  TIPOGRAFIAS,
  contraste,
  derivarTema,
  esHexValido,
  paletaPorRubro
} from "../../utils/identidadEmpresa";

import { TEXTO_FORMATOS, procesarLogo } from "../../utils/imagenes";

import LogoEmpresa from "./LogoEmpresa";

function etiquetaContraste(razon) {
  if (razon >= 7) return { texto: "Excelente", nivel: "ok" };
  if (razon >= 4.5) return { texto: "Muy bueno", nivel: "ok" };
  if (razon >= 3) return { texto: "Aceptable", nivel: "medio" };
  return { texto: "Muy bajo: casi no se verá", nivel: "bajo" };
}

// Selector de color con código escrito a mano
function CampoColor({ etiqueta, ayuda, valor, onChange, contrasteCon }) {
  const id = useId();
  const [borrador, setBorrador] = useState(null);

  const mostrado = borrador ?? valor;
  const calidad = contrasteCon ? etiquetaContraste(contraste(valor, contrasteCon)) : null;

  return (
    <div className="idv-color">
      <label htmlFor={id}>
        <span>{etiqueta}</span>
        {ayuda && <small>{ayuda}</small>}
      </label>

      <div className="idv-color__controles">
        <input
          type="color"
          aria-label={`Elegir ${etiqueta.toLowerCase()}`}
          value={esHexValido(valor) ? valor : "#000000"}
          onChange={(evento) => {
            setBorrador(null);
            onChange(evento.target.value.toUpperCase());
          }}
        />

        <input
          id={id}
          type="text"
          inputMode="text"
          spellCheck={false}
          maxLength={7}
          value={mostrado}
          aria-invalid={borrador !== null && !esHexValido(borrador)}
          onChange={(evento) => {
            const texto = evento.target.value.toUpperCase();
            setBorrador(texto);

            if (esHexValido(texto)) {
              onChange(texto);
            }
          }}
          onBlur={() => setBorrador(null)}
        />
      </div>

      {calidad && (
        <span className="idv-color__calidad" data-nivel={calidad.nivel}>
          Se lee: {calidad.texto}
        </span>
      )}
    </div>
  );
}

function IdentidadVisualEditor({
  valor,
  onChange,
  rubro,
  nombre,
  alLogo,
  alQuitarLogo,
  ocultarNombre = false,
  ocultarTipografia = false
}) {
  const entradaArchivo = useRef(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [errorLogo, setErrorLogo] = useState("");

  const tema = derivarTema(valor);
  const sugerida = paletaPorRubro(rubro);

  const recibirArchivo = async (archivo) => {
    if (!archivo) {
      return;
    }

    try {
      setProcesando(true);
      setErrorLogo("");

      const resultado = await procesarLogo(archivo);
      alLogo(resultado);
    } catch (error) {
      setErrorLogo(mensajeError(error, "No se pudo preparar la imagen."));
    } finally {
      setProcesando(false);

      if (entradaArchivo.current) {
        entradaArchivo.current.value = "";
      }
    }
  };

  const aplicarPaleta = (paleta) => {
    onChange({
      colorPrimario: paleta.colorPrimario,
      colorSecundario: paleta.colorSecundario,
      fondo: paleta.fondo
    });
  };

  const paletaActiva = (paleta) =>
    paleta.colorPrimario === valor.colorPrimario.toUpperCase() &&
    paleta.colorSecundario === valor.colorSecundario.toUpperCase() &&
    paleta.fondo === valor.fondo.toUpperCase();

  return (
    <div className="idv-editor">
      {/* ---------------- LOGO ---------------- */}
      <section className="idv-block">
        <header>
          <h4>Logo de la empresa</h4>
          <p>Aparece en el menú, en los comprobantes y en el listado de empresas.</p>
        </header>

        <div
          className="idv-drop"
          data-activo={arrastrando}
          data-con-logo={Boolean(valor.logoUrl)}
          onDragOver={(evento) => {
            evento.preventDefault();
            setArrastrando(true);
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={(evento) => {
            evento.preventDefault();
            setArrastrando(false);
            recibirArchivo(evento.dataTransfer.files?.[0]);
          }}
        >
          <LogoEmpresa
            logoUrl={valor.logoUrl}
            nombre={valor.nombreVisual || nombre}
            color={tema.primario}
            tamano={84}
            className="idv-logo--grande"
          />

          <div className="idv-drop__texto">
            <strong>{valor.logoUrl ? "Logo cargado" : "Sube la foto o el logo"}</strong>
            <span>
              {procesando
                ? "Preparando la imagen…"
                : `Arrastra una imagen aquí o elige un archivo. ${TEXTO_FORMATOS}.`}
            </span>

            <div className="idv-drop__botones">
              <button
                type="button"
                className="idv-boton"
                onClick={() => entradaArchivo.current?.click()}
                disabled={procesando}
              >
                {valor.logoUrl ? <ImagePlus size={16} /> : <Upload size={16} />}
                {valor.logoUrl ? "Cambiar logo" : "Elegir archivo"}
              </button>

              {valor.logoUrl && (
                <button
                  type="button"
                  className="idv-boton idv-boton--peligro"
                  onClick={() => {
                    setErrorLogo("");
                    alQuitarLogo();
                  }}
                >
                  <Trash2 size={16} />
                  Quitar
                </button>
              )}
            </div>
          </div>

          <input
            ref={entradaArchivo}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={(evento) => recibirArchivo(evento.target.files?.[0])}
          />
        </div>

        {errorLogo && (
          <p className="idv-error" role="alert">
            {errorLogo}
          </p>
        )}
      </section>

      {/* ---------------- NOMBRE ---------------- */}
      {!ocultarNombre && (
      <section className="idv-block">
        <header>
          <h4>Nombre que verán</h4>
          <p>Si lo dejas vacío se usa el nombre comercial.</p>
        </header>

        <input
          className="idv-input"
          type="text"
          value={valor.nombreVisual}
          placeholder={nombre || "Nombre de la empresa"}
          maxLength={40}
          onChange={(evento) => onChange({ nombreVisual: evento.target.value })}
        />
      </section>
      )}

      {/* ---------------- PALETAS ---------------- */}
      <section className="idv-block">
        <header>
          <h4>Paleta de colores</h4>
          <p>Elige una base y afínala abajo. La vista previa cambia al instante.</p>
        </header>

        <div className="idv-paletas" role="group" aria-label="Paletas sugeridas">
          {PALETAS.map((paleta) => (
            <button
              type="button"
              key={paleta.id}
              className="idv-paleta"
              data-sonido="pop"
              aria-pressed={paletaActiva(paleta)}
              onClick={() => aplicarPaleta(paleta)}
            >
              <span className="idv-paleta__muestra" style={{ background: paleta.fondo }}>
                <i style={{ background: paleta.colorPrimario }} />
                <i style={{ background: paleta.colorSecundario }} />
              </span>
              <span className="idv-paleta__nombre">{paleta.nombre}</span>

              {sugerida?.id === paleta.id && (
                <span className="idv-paleta__sugerida">
                  <Sparkles size={11} aria-hidden="true" />
                  Sugerida
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* ---------------- COLORES ---------------- */}
      <section className="idv-block">
        <header>
          <h4>Colores</h4>
          <p>El texto se vuelve claro u oscuro solo, según el fondo que elijas.</p>
        </header>

        <div className="idv-colores">
          <CampoColor
            etiqueta="Color principal"
            ayuda="Botones y secciones activas"
            valor={valor.colorPrimario}
            contrasteCon={tema.fondo}
            onChange={(color) => onChange({ colorPrimario: color })}
          />

          <CampoColor
            etiqueta="Color secundario"
            ayuda="Gráficos y detalles"
            valor={valor.colorSecundario}
            contrasteCon={tema.fondo}
            onChange={(color) => onChange({ colorSecundario: color })}
          />

          <CampoColor
            etiqueta="Fondo del panel"
            ayuda="Oscuro o claro"
            valor={valor.fondo}
            onChange={(color) => onChange({ fondo: color })}
          />
        </div>
      </section>

      {/* ---------------- TIPOGRAFÍA ---------------- */}
      {!ocultarTipografia && (
      <section className="idv-block">
        <header>
          <h4>Tipo de letra</h4>
        </header>

        <select
          className="idv-input"
          value={valor.tipografia}
          onChange={(evento) => onChange({ tipografia: evento.target.value })}
        >
          {TIPOGRAFIAS.map((tipo) => (
            <option key={tipo.valor} value={tipo.valor}>
              {tipo.etiqueta}
            </option>
          ))}
        </select>
      </section>
      )}
    </div>
  );
}

export default IdentidadVisualEditor;
