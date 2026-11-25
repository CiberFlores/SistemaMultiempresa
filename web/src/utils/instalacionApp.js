// Guarda el aviso de instalación del navegador desde que carga la web.
//
// El navegador lo manda una sola vez, apenas la página está lista. Si la pantalla
// "Aplicación móvil" todavía no existe en ese momento, se perdía y el botón no
// instalaba nada. Por eso se escucha aquí, desde el arranque.

let aviso = null;
let instalada = false;
const oyentes = new Set();

function avisar() {
  oyentes.forEach((funcion) => funcion());
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (evento) => {
    evento.preventDefault();
    aviso = evento;
    avisar();
  });

  window.addEventListener("appinstalled", () => {
    aviso = null;
    instalada = true;
    avisar();
  });
}

// Cambió la app que se va a instalar: el aviso anterior ya no sirve y, si se usa, no pasa nada
export function olvidarAvisoDeInstalacion() {
  aviso = null;
  avisar();
}

export function hayAvisoDeInstalacion() {
  return aviso !== null;
}

export function appInstalada() {
  if (typeof window === "undefined") return false;
  return instalada || window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

export function suscribirInstalacion(funcion) {
  oyentes.add(funcion);
  return () => oyentes.delete(funcion);
}

// Abre la ventana de instalación del navegador. Devuelve "instalada", "rechazada" o "sin-aviso".
export async function pedirInstalacion() {
  if (!aviso) return "sin-aviso";

  const evento = aviso;

  try {
    await evento.prompt();
    const eleccion = await evento.userChoice;
    aviso = null;
    avisar();
    return eleccion?.outcome === "accepted" ? "instalada" : "rechazada";
  } catch {
    aviso = null;
    avisar();
    return "sin-aviso";
  }
}

// Qué navegador es, para explicar los pasos exactos
export function detectarNavegador() {
  const agente = (typeof navigator !== "undefined" && navigator.userAgent) || "";

  const dentroDeApp = /FBAN|FBAV|Instagram|Line\/|MicroMessenger|WhatsApp|Snapchat|TikTok|; wv\)/i.test(agente);
  const ios = /iPhone|iPad|iPod/i.test(agente);
  const android = /Android/i.test(agente);
  const samsung = /SamsungBrowser/i.test(agente);
  const firefox = /Firefox|FxiOS/i.test(agente);
  const edge = /EdgA|EdgiOS|Edg\//i.test(agente);
  const chrome = /Chrome|CriOS/i.test(agente) && !samsung && !edge;
  const movil = ios || android || (navigator.maxTouchPoints > 1 && window.innerWidth <= 1000);

  return { dentroDeApp, ios, android, samsung, firefox, edge, chrome, movil };
}

// Los pasos cambian según el navegador del celular
export function pasosDeInstalacion(n) {
  if (n.dentroDeApp) {
    return [
      "Este enlace está abierto dentro de otra aplicación (WhatsApp, Facebook…) y ahí no se puede instalar.",
      "Toca los tres puntos ⋮ de arriba y elige «Abrir en Chrome» o «Abrir en el navegador».",
      "Ya en el navegador, entra con tu cuenta de dueño y vuelve a esta página."
    ];
  }

  if (n.ios) {
    return [
      "Abre esta página en Safari (en iPhone solo Safari puede instalarla).",
      "Toca el botón Compartir (el cuadrado con la flecha hacia arriba).",
      "Elige «Añadir a pantalla de inicio» y toca «Añadir»."
    ];
  }

  if (n.firefox) {
    return [
      "Firefox no instala bien esta aplicación. Abre el enlace en Chrome.",
      "En Chrome toca el menú ⋮ de arriba a la derecha.",
      "Elige «Instalar aplicación» o «Agregar a la pantalla principal»."
    ];
  }

  if (n.samsung) {
    return [
      "Toca el menú ☰ de abajo a la derecha.",
      "Elige «Agregar página a» y luego «Pantalla de inicio».",
      "Toca «Agregar». Si no aparece, abre el enlace en Chrome."
    ];
  }

  return [
    "Desde el celular, con tu cuenta de dueño, toca «Instalar en mi celular».",
    "Toca el menú ⋮ de Chrome (arriba a la derecha) y elige «Instalar aplicación» o «Agregar a la pantalla principal».",
    "Confirma con «Instalar». El icono con el logo de tu empresa aparece en tu pantalla de inicio."
  ];
}
