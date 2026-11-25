// Marca de la app móvil de cada empresa: nombre, icono y colores al instalarla.
//
// Cada empresa tiene su propio manifiesto e iconos en /m/<empresa>/… Se guardan en el
// celular y el service worker los entrega como archivos normales. Android no instala
// manifiestos temporales (blob:) ni iconos incrustados (data:).

import { olvidarAvisoDeInstalacion } from "./instalacionApp";

const CACHE = "an-marca";

const logoSeguro = (url) => (typeof url === "string" && url.startsWith("https://") ? url : "");

function cargarImagen(url) {
  return new Promise((resolve, reject) => {
    const imagen = new Image();
    imagen.crossOrigin = "anonymous";
    imagen.onload = () => resolve(imagen);
    imagen.onerror = reject;
    imagen.src = url;
  });
}

// Icono cuadrado: color de la empresa con su logo al centro (o su inicial si no hay logo)
export async function generarIcono(tamano, { logoUrl, primario, sobre, inicial }) {
  const lienzo = document.createElement("canvas");
  lienzo.width = tamano;
  lienzo.height = tamano;
  const c = lienzo.getContext("2d");

  c.fillStyle = primario;
  c.fillRect(0, 0, tamano, tamano);

  const caja = tamano * 0.62;
  const x = (tamano - caja) / 2;

  let dibujado = false;
  const url = logoSeguro(logoUrl);

  if (url) {
    try {
      const imagen = await cargarImagen(url);
      const radio = caja * 0.22;

      c.fillStyle = "#ffffff";
      c.beginPath();
      c.roundRect(x, x, caja, caja, radio);
      c.fill();

      const margen = caja * 0.1;
      const escala = Math.min((caja - margen * 2) / imagen.width, (caja - margen * 2) / imagen.height);
      const ancho = imagen.width * escala;
      const alto = imagen.height * escala;
      c.drawImage(imagen, x + (caja - ancho) / 2, x + (caja - alto) / 2, ancho, alto);
      dibujado = true;
    } catch {
      dibujado = false;
    }
  }

  if (!dibujado) {
    c.fillStyle = sobre;
    c.font = `800 ${Math.round(tamano * 0.5)}px system-ui, sans-serif`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(inicial || "A", tamano / 2, tamano / 2 + tamano * 0.03);
  }

  return new Promise((resolve, reject) => lienzo.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo crear el icono."))), "image/png"));
}

function poner(selector, crear, atributos) {
  let nodo = document.head.querySelector(selector);

  if (!nodo) {
    nodo = crear();
    document.head.appendChild(nodo);
  }

  Object.entries(atributos).forEach(([clave, valor]) => nodo.setAttribute(clave, valor));
  return nodo;
}

// El service worker tiene que estar a cargo de la página para entregar el manifiesto
async function esperarServicio() {
  if (!("serviceWorker" in navigator)) return false;
  if (navigator.serviceWorker.controller) return true;

  return Promise.race([
    new Promise((listo) => navigator.serviceWorker.addEventListener("controllerchange", () => listo(true), { once: true })),
    new Promise((listo) => setTimeout(() => listo(Boolean(navigator.serviceWorker.controller)), 5000))
  ]);
}

// Deja lista la app de la empresa y, en sus páginas móviles, la ofrece para instalar
export async function aplicarMarcaApp({ empresaId, nombre, logoUrl, primario, sobre, fondo }) {
  const corto = nombre.length > 12 ? nombre.slice(0, 12).trim() : nombre;
  const datos = { logoUrl, primario, sobre, inicial: nombre.charAt(0).toUpperCase() };
  const base = `/m/${empresaId}`;
  const inicio = `/admin-movil/${empresaId}`;

  const [icono192, icono512] = await Promise.all([generarIcono(192, datos), generarIcono(512, datos)]);

  const manifiesto = {
    id: inicio,
    name: nombre,
    short_name: corto,
    description: `Mira cómo le va a tu negocio ${nombre}: ventas, stock, equipo y alertas en tiempo real.`,
    start_url: inicio,
    scope: inicio,
    display: "standalone",
    orientation: "portrait",
    background_color: fondo,
    theme_color: primario,
    lang: "es",
    prefer_related_applications: false,
    icons: [
      { src: `${base}/icono-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${base}/icono-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `${base}/icono-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  };

  const cache = await caches.open(CACHE);
  await Promise.all([
    cache.put(`${base}/icono-192.png`, new Response(icono192, { headers: { "Content-Type": "image/png" } })),
    cache.put(`${base}/icono-512.png`, new Response(icono512, { headers: { "Content-Type": "image/png" } })),
    cache.put(`${base}/manifest.webmanifest`, new Response(JSON.stringify(manifiesto), { headers: { "Content-Type": "application/manifest+json" } }))
  ]);

  poner('link[rel="apple-touch-icon"]', () => Object.assign(document.createElement("link"), { rel: "apple-touch-icon" }), { href: URL.createObjectURL(icono192) });
  poner('meta[name="theme-color"]', () => Object.assign(document.createElement("meta"), { name: "theme-color" }), { content: primario });
  poner('meta[name="apple-mobile-web-app-title"]', () => Object.assign(document.createElement("meta"), { name: "apple-mobile-web-app-title" }), { content: corto });

  if (!window.location.pathname.startsWith(inicio) || !(await esperarServicio())) return;

  const direccion = `${base}/manifest.webmanifest`;
  if (document.head.querySelector('link[rel="manifest"]')?.getAttribute("href") === direccion) return;

  olvidarAvisoDeInstalacion();
  poner('link[rel="manifest"]', () => Object.assign(document.createElement("link"), { rel: "manifest" }), { href: direccion });
}
