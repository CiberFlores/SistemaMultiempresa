import { BadgeCheck, Check, Crown, Store } from "lucide-react";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  EscenaMostrador,
  EscenaRed,
  EscenaTienda
} from "./EscenasBienvenida";

import { nombreParaSaludo } from "../../utils/nombreSaludo";

import { sonidoBienvenida } from "../../utils/sonidos";

import Destello from "./Destello";

// Cada rol recibe su propia bienvenida
const ROLES = {
  SUPER_ADMIN: {
    icono: Crown,
    etiqueta: "Administrador general",
    escena: EscenaRed,
    imagen: "bienvenida-super-admin.png",
    mensaje: "Todas tus empresas, bajo control.",
    pasos: ["Empresas", "Administradores", "Auditoría global"],
    tono: 0
  },
  ADMIN: {
    icono: Store,
    etiqueta: "Dueño de empresa",
    escena: EscenaTienda,
    imagen: "bienvenida-dueno.png",
    mensaje: "Tu negocio está listo para el día.",
    pasos: ["Ventas de hoy", "Inventario", "Caja"],
    tono: 2
  },
  TRABAJADOR: {
    icono: BadgeCheck,
    etiqueta: "Equipo de trabajo",
    escena: EscenaMostrador,
    imagen: "bienvenida-trabajador.png",
    mensaje: "Todo listo para empezar tu turno.",
    pasos: ["Tu turno", "Caja", "Productos"],
    tono: 4
  }
};

const DURACION_MS = 3400;
const DURACION_REDUCIDA_MS = 1500;
const PIEZAS_CONFETI = 24;

function saludoSegunHora() {
  const hora = new Date().getHours();

  if (hora < 12) return "Buenos días,";
  if (hora < 19) return "Buenas tardes,";
  return "Buenas noches,";
}

// Confeti determinista: cada pieza sale en una dirección distinta
const CONFETI = Array.from({ length: PIEZAS_CONFETI }, (_, indice) => {
  const angulo = (indice * (360 / PIEZAS_CONFETI) + (indice % 3) * 9) * (Math.PI / 180);
  const distancia = 150 + (indice % 5) * 48;

  return {
    dx: Math.round(Math.cos(angulo) * distancia),
    dy: Math.round(Math.sin(angulo) * distancia * 0.8),
    giro: (indice % 2 ? 1 : -1) * (160 + indice * 13),
    retraso: 760 + (indice % 6) * 35,
    forma: ["punto", "cuadro", "barra"][indice % 3],
    color: ["naranja", "crema", "naranja", "claro"][indice % 4]
  };
});

function WelcomeOverlay({ usuario, onListo }) {
  const rol = ROLES[usuario?.tipoUsuario] || ROLES.TRABAJADOR;
  const Icono = rol.icono;
  const Escena = rol.escena;

  const nombre = nombreParaSaludo(usuario);

  const [saliendo, setSaliendo] = useState(false);
  const [saludo] = useState(saludoSegunHora);
  // Si existe la ilustración de Codex en /brand, reemplaza a la escena dibujada
  const [imagenLista, setImagenLista] = useState(false);

  const botonRef = useRef(null);
  const terminado = useRef(false);
  const cortarSonido = useRef(() => {});

  const finalizar = useCallback(() => {
    if (terminado.current) {
      return;
    }

    terminado.current = true;
    cortarSonido.current();
    setSaliendo(true);
    setTimeout(onListo, 260);
  }, [onListo]);

  useEffect(() => {
    const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    cortarSonido.current = sonidoBienvenida({ pasos: rol.tono });

    const temporizador = setTimeout(
      finalizar,
      reducido ? DURACION_REDUCIDA_MS : DURACION_MS
    );

    botonRef.current?.focus({ preventScroll: true });

    const alTeclear = (evento) => {
      if (evento.key === "Escape") {
        finalizar();
      }
    };

    window.addEventListener("keydown", alTeclear);

    return () => {
      clearTimeout(temporizador);
      window.removeEventListener("keydown", alTeclear);
      cortarSonido.current();
    };
  }, [finalizar, rol.tono]);

  // Cada palabra del nombre es un bloque: la primera en crema y la segunda en naranja
  const palabras = (nombre || "Bienvenido").split(" ");
  const inicios = palabras.map((_, indice) => palabras.slice(0, indice).join("").length);

  return (
    <div
      className="an-welcome"
      data-leaving={saliendo}
      role="dialog"
      aria-modal="true"
      aria-label="Bienvenida"
    >
      <div className="an-welcome__glow" aria-hidden="true" />
      <div className="an-welcome__rings" aria-hidden="true" />
      <div className="an-welcome__stripes" aria-hidden="true" />

      <div className="an-welcome__awning" aria-hidden="true" />

      <div className="an-welcome__confetti" aria-hidden="true">
        {CONFETI.map((pieza, indice) => (
          <i
            key={indice}
            className={`an-confetti an-confetti--${pieza.forma} an-confetti--${pieza.color}`}
            style={{
              "--dx": `${pieza.dx}px`,
              "--dy": `${pieza.dy}px`,
              "--giro": `${pieza.giro}deg`,
              "--retraso": `${pieza.retraso}ms`
            }}
          />
        ))}
      </div>

      <div className="an-welcome__layout">
      <div className="an-welcome__inner">
        <span className="an-welcome__badge">
          <Icono size={16} strokeWidth={2} aria-hidden="true" />
          {rol.etiqueta}
        </span>

        <p className="an-welcome__hello">{saludo}</p>

        <h2 className="an-welcome__name" aria-label={nombre || "Bienvenido"}>
          {palabras.map((palabra, p) => (
            <span key={p} className="an-welcome__word" data-word={p} aria-hidden="true">
              {Array.from(palabra).map((letra, i) => (
                <span
                  key={i}
                  className="an-welcome__letter"
                  style={{ "--i": inicios[p] + p * 2 + i }}
                >
                  {letra}
                </span>
              ))}
              {p < palabras.length - 1 ? " " : ""}
            </span>
          ))}
          <Destello className="an-welcome__sparkle" />
        </h2>

        <p className="an-welcome__message">{rol.mensaje}</p>

        <div className="an-welcome__bar" aria-hidden="true">
          <i />
        </div>

        <ul className="an-welcome__checks" aria-label="Preparando tu panel">
          {rol.pasos.map((paso, indice) => (
            <li key={paso} style={{ "--k": indice }}>
              <span className="an-welcome__tick" aria-hidden="true">
                <Check size={12} strokeWidth={3.5} />
              </span>
              {paso}
            </li>
          ))}
        </ul>

        <p className="sr-only" role="status">
          Bienvenido{nombre ? `, ${nombre}` : ""}. Preparando tu panel.
        </p>

        <button
          ref={botonRef}
          type="button"
          className="an-welcome__skip"
          onClick={finalizar}
        >
          Entrar ahora
        </button>
      </div>

      <div className="an-welcome__scene" aria-hidden="true">
        <img
          className="an-welcome__art"
          src={`/brand/${rol.imagen}`}
          alt=""
          hidden={!imagenLista}
          onLoad={() => setImagenLista(true)}
          onError={() => setImagenLista(false)}
        />
        {!imagenLista && <Escena />}
      </div>
      </div>

      <Destello className="an-welcome__spark an-welcome__spark--1" />
      <Destello className="an-welcome__spark an-welcome__spark--2" />
      <Destello className="an-welcome__spark an-welcome__spark--3" />
      <Destello className="an-welcome__spark an-welcome__spark--4" />
      <Destello className="an-welcome__spark an-welcome__spark--5" />
    </div>
  );
}

export default WelcomeOverlay;
