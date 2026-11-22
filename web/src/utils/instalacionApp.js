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
  aviso = null;
  avisar();

  try {
    await evento.prompt();
    const eleccion = await evento.userChoice;
    return eleccion?.outcome === "accepted" ? "instalada" : "rechazada";
  } catch {
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
