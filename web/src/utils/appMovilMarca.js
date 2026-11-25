// Marca de la app móvil de cada empresa: nombre, icono y colores al instalarla.
//
// Android arma el icono en los servidores de Google, así que tiene que ser una imagen
// pública en internet. Por eso sale del logo de la empresa en Cloudinary, ya recortado
// al tamaño exacto. Al cambiar el logo cambia su dirección, y con eso el celular sabe
// que debe actualizar el icono. Sin logo se usa el de Arca Nova.
//
// El manifiesto de cada empresa se guarda en el celular y lo entrega el service worker
// en /m/<empresa>/manifest.webmanifest, como un archivo normal.

import { olvidarAvisoDeInstalacion } from "./instalacionApp";

const CACHE = "an-marca";
const SUBIDA = "/image/upload/";

// Dirección pública del icono cuadrado de la empresa
export function iconoDeEmpresa(logoUrl, tamano) {
  const esCloudinary = typeof logoUrl === "string" && logoUrl.startsWith("https://res.cloudinary.com/") && logoUrl.includes(SUBIDA);

  if (!esCloudinary) return `/icons/arca-nova-${tamano}.png`;

  const interior = Math.round(tamano * 0.8);
  const ajuste = `c_pad,w_${interior},h_${interior},b_white/c_pad,w_${tamano},h_${tamano},b_white/f_png`;
  const direccion = logoUrl.replace(SUBIDA, `${SUBIDA}${ajuste}/`);

  // La extensión también pide PNG: es lo que el celular espera
  return direccion.replace(/\.(webp|jpe?g|avif|gif|svg|png)(\?.*)?$/i, ".png");
}

function cargarImagen(url) {
  return new Promise((resolve) => {
    const imagen = new Image();
    imagen.onload = () => resolve(true);
    imagen.onerror = () => resolve(false);
    imagen.src = url;
  });
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
export async function aplicarMarcaApp({ empresaId, nombre, logoUrl, primario, fondo }) {
  const corto = nombre.length > 12 ? nombre.slice(0, 12).trim() : nombre;
  const inicio = `/admin-movil/${empresaId}`;
  const direccion = `/m/${empresaId}/manifest.webmanifest`;

  let icono192 = iconoDeEmpresa(logoUrl, 192);
  let icono512 = iconoDeEmpresa(logoUrl, 512);

  // Si el logo no se puede preparar, la app se instala igual
  if (!(await cargarImagen(icono512))) {
    icono192 = iconoDeEmpresa("", 192);
    icono512 = iconoDeEmpresa("", 512);
  }

  const texto = JSON.stringify({
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
      { src: icono192, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: icono512, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: icono512, sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  });

  const cache = await caches.open(CACHE);
  const previo = await cache.match(direccion).then((r) => r?.text());
  if (previo !== texto) await cache.put(direccion, new Response(texto, { headers: { "Content-Type": "application/manifest+json" } }));

  poner('link[rel="icon"]', () => Object.assign(document.createElement("link"), { rel: "icon" }), { href: icono192 });
  poner('link[rel="apple-touch-icon"]', () => Object.assign(document.createElement("link"), { rel: "apple-touch-icon" }), { href: icono192 });
  poner('meta[name="theme-color"]', () => Object.assign(document.createElement("meta"), { name: "theme-color" }), { content: primario });
  poner('meta[name="apple-mobile-web-app-title"]', () => Object.assign(document.createElement("meta"), { name: "apple-mobile-web-app-title" }), { content: corto });

  if (!window.location.pathname.startsWith(inicio) || !(await esperarServicio())) return;

  const enlace = document.head.querySelector('link[rel="manifest"]');
  if (previo === texto && enlace?.getAttribute("href") === direccion) return;

  // Se vuelve a poner el enlace para que el navegador lea el manifiesto nuevo
  enlace?.remove();
  olvidarAvisoDeInstalacion();
  poner('link[rel="manifest"]', () => Object.assign(document.createElement("link"), { rel: "manifest" }), { href: direccion });
}
