// Marca de la app móvil de cada empresa: nombre, icono y colores al instalarla.
//
// El manifiesto de la app se arma en el momento con los datos de la empresa, así
// "OXXO GO" se instala con el logo y los colores de OXXO, y otra empresa con los suyos.

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

  return lienzo.toDataURL("image/png");
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

let manifiestoAnterior = "";

// Cambia el nombre, el icono y el color con que el navegador instala la app
export async function aplicarMarcaApp({ nombre, logoUrl, primario, sobre, fondo }) {
  const nombreApp = `${nombre} GO`;
  const corto = nombre.length > 11 ? `${nombre.slice(0, 11).trim()} GO` : nombreApp;
  const datos = { logoUrl, primario, sobre, inicial: nombre.charAt(0).toUpperCase() };

  const [icono192, icono512] = await Promise.all([generarIcono(192, datos), generarIcono(512, datos)]);

  const origen = window.location.origin;

  const manifiesto = {
    id: `${origen}/admin-movil`,
    name: nombreApp,
    short_name: corto,
    description: `Mira cómo le va a ${nombre}: ventas, stock, equipo y alertas en tiempo real.`,
    start_url: `${origen}/admin-movil`,
    scope: `${origen}/`,
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
  };

  const direccion = URL.createObjectURL(new Blob([JSON.stringify(manifiesto)], { type: "application/manifest+json" }));

  poner('link[rel="manifest"]', () => Object.assign(document.createElement("link"), { rel: "manifest" }), { href: direccion });
  poner('link[rel="apple-touch-icon"]', () => Object.assign(document.createElement("link"), { rel: "apple-touch-icon" }), { href: icono192 });
  poner('meta[name="theme-color"]', () => Object.assign(document.createElement("meta"), { name: "theme-color" }), { content: primario });
  poner('meta[name="apple-mobile-web-app-title"]', () => Object.assign(document.createElement("meta"), { name: "apple-mobile-web-app-title" }), { content: corto });

  if (manifiestoAnterior) URL.revokeObjectURL(manifiestoAnterior);
  manifiestoAnterior = direccion;

  return { nombreApp, icono192 };
}
