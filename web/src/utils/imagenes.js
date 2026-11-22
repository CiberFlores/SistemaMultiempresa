// Prepara el logo antes de subirlo: lo valida, lo reduce y lo comprime.

const TIPOS_PERMITIDOS = ["image/png", "image/jpeg", "image/webp"];
const MAXIMO_BYTES = 5 * 1024 * 1024;
const LADO_MAXIMO = 512;

export const TEXTO_FORMATOS = "PNG, JPG o WEBP de hasta 5 MB";

function cargarImagen(url) {
  return new Promise((resolver, rechazar) => {
    const imagen = new Image();
    imagen.onload = () => resolver(imagen);
    imagen.onerror = () => rechazar(new Error("No se pudo leer la imagen."));
    imagen.src = url;
  });
}

function aBlob(lienzo, tipo, calidad) {
  return new Promise((resolver) => lienzo.toBlob(resolver, tipo, calidad));
}

export async function procesarLogo(archivo) {
  if (!archivo) {
    throw new Error("No se seleccionó ninguna imagen.");
  }

  if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
    throw new Error("El logo debe ser PNG, JPG o WEBP.");
  }

  if (archivo.size > MAXIMO_BYTES) {
    throw new Error("El logo no puede superar 5 MB.");
  }

  const origen = URL.createObjectURL(archivo);

  try {
    const imagen = await cargarImagen(origen);
    const escala = Math.min(1, LADO_MAXIMO / Math.max(imagen.width, imagen.height));
    const ancho = Math.max(1, Math.round(imagen.width * escala));
    const alto = Math.max(1, Math.round(imagen.height * escala));

    const lienzo = document.createElement("canvas");
    lienzo.width = ancho;
    lienzo.height = alto;

    lienzo.getContext("2d").drawImage(imagen, 0, 0, ancho, alto);

    // WEBP conserva la transparencia y pesa poco; si no se puede, PNG
    let blob = await aBlob(lienzo, "image/webp", 0.9);
    let extension = "webp";

    if (!blob || blob.type !== "image/webp") {
      blob = await aBlob(lienzo, "image/png");
      extension = "png";
    }

    return {
      blob,
      extension,
      ancho,
      alto,
      vistaPrevia: URL.createObjectURL(blob)
    };
  } finally {
    URL.revokeObjectURL(origen);
  }
}

// Prepara la foto del QR de cobro: acepta fotos grandes del celular (hasta 20 MB),
// las reduce y las comprime para que pesen poco y el QR se siga leyendo bien.
const MAXIMO_QR_BYTES = 20 * 1024 * 1024;
const LADO_QR = 900;

export const TEXTO_FORMATOS_QR = "JPG, PNG o WEBP de hasta 20 MB (se reduce sola)";

export async function procesarImagenQr(archivo) {
  if (!archivo) {
    throw new Error("No se seleccionó ninguna imagen.");
  }

  if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
    throw new Error("Sube la foto del QR en JPG, PNG o WEBP.");
  }

  if (archivo.size > MAXIMO_QR_BYTES) {
    throw new Error("La imagen pesa demasiado. Usa una de menos de 20 MB.");
  }

  const origen = URL.createObjectURL(archivo);

  try {
    const imagen = await cargarImagen(origen);
    const escala = Math.min(1, LADO_QR / Math.max(imagen.width, imagen.height));
    const ancho = Math.max(1, Math.round(imagen.width * escala));
    const alto = Math.max(1, Math.round(imagen.height * escala));

    const lienzo = document.createElement("canvas");
    lienzo.width = ancho;
    lienzo.height = alto;

    const contexto = lienzo.getContext("2d");
    contexto.fillStyle = "#ffffff";
    contexto.fillRect(0, 0, ancho, alto);
    contexto.drawImage(imagen, 0, 0, ancho, alto);

    // PNG nítido si pesa poco (los QR son de dos colores); si no, WEBP de alta calidad
    let blob = await aBlob(lienzo, "image/png");
    let extension = "png";

    if (!blob || blob.size > 400 * 1024) {
      const webp = await aBlob(lienzo, "image/webp", 0.92);

      if (webp && webp.type === "image/webp" && (!blob || webp.size < blob.size)) {
        blob = webp;
        extension = "webp";
      }
    }

    return new File([blob], `qr-cobro.${extension}`, { type: blob.type });
  } finally {
    URL.revokeObjectURL(origen);
  }
}
