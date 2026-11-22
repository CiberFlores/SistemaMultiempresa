// ==========================================
// A. CONFIGURACION DE CLOUDINARY
// ==========================================

// CONFIGURACION PUBLICA DE SUBIDA SIN FIRMA.
// NUNCA COLOCAR API SECRET EN REACT.

const CLOUD_NAME =
  import.meta.env.VITE_CLOUDINARY_CLOUD_NAME ||
  "dhicf6xyg";

const UPLOAD_PRESET =
  import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET ||
  "multiempresa_productos_unsigned";

// Preset opcional con "sobrescribir" activado: así una foto nueva REEMPLAZA a la anterior
// en Cloudinary (misma dirección interna) y no se acumulan archivos viejos.
const PRESET_SOBRESCRIBIR = import.meta.env.VITE_CLOUDINARY_PRESET_SOBRESCRIBIR || "";

const TIPOS = [
  "image/jpeg",
  "image/png",
  "image/webp"
];

const MAX_BYTES = 5 * 1024 * 1024;


// ==========================================
// B. COMPRIMIR FOTOGRAFIA
// ==========================================

async function comprimirImagen(archivo) {

  const url = URL.createObjectURL(archivo);

  try {

    const imagen = await new Promise(
      (resolve, reject) => {

        const foto = new Image();

        foto.onload = () => resolve(foto);

        foto.onerror = () => reject(
          new Error(
            "No se pudo leer la fotografía."
          )
        );

        foto.src = url;

      }
    );


    // REDUCIR DIMENSIONES

    const escala = Math.min(

      1,

      1200 / imagen.naturalWidth,

      1200 / imagen.naturalHeight

    );


    const canvas = document.createElement("canvas");

    canvas.width = Math.max(
      1,
      Math.round(imagen.naturalWidth * escala)
    );

    canvas.height = Math.max(
      1,
      Math.round(imagen.naturalHeight * escala)
    );


    const contexto = canvas.getContext("2d");

    if (!contexto) {
      throw new Error(
        "No se pudo procesar la imagen."
      );
    }


    contexto.drawImage(
      imagen,
      0,
      0,
      canvas.width,
      canvas.height
    );


    // CONVERTIR A WEBP

    const blob = await new Promise(
      (resolve, reject) => {

        canvas.toBlob(

          (resultado) => {

            if (resultado) {

              resolve(resultado);

            } else {

              reject(
                new Error(
                  "No se pudo comprimir la imagen."
                )
              );

            }

          },

          "image/webp",

          0.78

        );

      }
    );


    return new File(

      [blob],

      "producto.webp",

      {
        type: "image/webp"
      }

    );

  } finally {

    URL.revokeObjectURL(url);

  }

}


// ==========================================
// C. IDENTIFICAR ERRORES DE CLOUDINARY
// ==========================================

function errorSubida(estado, mensaje) {

  const texto = String(
    mensaje || "Error desconocido"
  ).trim();


  const error = new Error("");

  error.httpStatus = estado;

  error.detalleProveedor = texto;


  // ERROR DE CUOTA O LIMITE

  if (
    /quota|exceed|limit|credit|rate.limit/i.test(texto) ||
    estado === 420 ||
    estado === 429
  ) {

    error.code = "CLOUDINARY_QUOTA";

    error.message =
      "Cloudinary rechazó la imagen por un límite o cuota. " +
      `HTTP ${estado}. ` +
      "Revisa el consumo de tu cuenta Cloudinary. " +
      "Puedes guardar el producto sin cambiar su fotografía " +
      "o utilizar una URL HTTPS de una imagen existente. " +
      `Detalle: ${texto}`;

  }

  // ERROR DE PERMISOS

  else if (
    estado === 401 ||
    estado === 403
  ) {

    error.code = "CLOUDINARY_PERMISOS";

    error.message =
      "Cloudinary no autorizó la subida. " +
      "Revisa que el Upload Preset permita " +
      "subidas sin firma (Unsigned). " +
      `Detalle: ${texto}`;

  }

  // OTROS ERRORES

  else {

    error.code = "CLOUDINARY_ERROR";

    error.message =
      `Cloudinary no pudo subir la fotografía. ` +
      `HTTP ${estado}. ` +
      `Detalle: ${texto}`;

  }

  return error;

}


// ==========================================
// D. SUBIR IMAGEN
// ==========================================

export async function subirImagenEmpresa({
  empresaId,
  carpeta,
  archivo,
  nombre,
  sobrescribir = false
}) {

  if (!archivo) {
    return "";
  }


  // VALIDAR EMPRESA

  if (!empresaId) {

    throw new Error(
      "Falta identificar la empresa de la fotografía."
    );

  }


  // VALIDAR FORMATO

  if (!TIPOS.includes(archivo.type)) {

    throw new Error(
      "Solo se permiten imágenes JPG, PNG y WEBP."
    );

  }


  // VALIDAR TAMAÑO

  if (archivo.size > MAX_BYTES) {

    throw new Error(
      "La fotografía supera los 5 MB."
    );

  }


  // COMPRIMIR

  const optimizada = await comprimirImagen(
    archivo
  );


  // PREPARAR FORMULARIO

  const datos = new FormData();

  datos.append(
    "file",
    optimizada
  );

  const reemplaza = sobrescribir && Boolean(PRESET_SOBRESCRIBIR);

  datos.append(
    "upload_preset",
    reemplaza ? PRESET_SOBRESCRIBIR : UPLOAD_PRESET
  );

  if (reemplaza) {
    datos.append("public_id", `${carpeta}/${nombre}`);
  }


  // EL PRESET CONFIGURA EL DESTINO DE LA FOTO.
  // NO ENVIAMOS CLAVES SECRETAS.


  // ========================================
  // E. TIEMPO MAXIMO
  // ========================================

  const controlador = new AbortController();

  const timeout = setTimeout(
    () => controlador.abort(),
    30000
  );


  try {

    // ======================================
    // ENVIAR FOTOGRAFIA
    // ======================================

    const respuesta = await fetch(

      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,

      {

        method: "POST",

        body: datos,

        signal: controlador.signal

      }

    );


    // ======================================
    // LEER RESPUESTA
    // ======================================

    const texto = await respuesta.text();

    let resultado;

    try {

      resultado = JSON.parse(texto);

    } catch {

      resultado = {};

    }


    // ======================================
    // DETECTAR ERROR REAL
    // ======================================

    if (!respuesta.ok) {

      const mensaje =

        resultado?.error?.message ||

        respuesta.headers.get("X-Cld-Error") ||

        texto.slice(0, 200);


      throw errorSubida(
        respuesta.status,
        mensaje
      );

    }


    // ======================================
    // VALIDAR URL
    // ======================================

    if (
      typeof resultado.secure_url !== "string" ||
      !resultado.secure_url.startsWith("https://")
    ) {

      throw new Error(
        "Cloudinary no devolvió un enlace HTTPS válido."
      );

    }


    // REGRESAR URL A PRODUCTOS

    return resultado.secure_url;

  } catch (error) {

    // TIEMPO AGOTADO

    if (error.name === "AbortError") {

      throw new Error(
        "La fotografía tardó demasiado en subirse. " +
        "Comprueba tu conexión a Internet."
      );

    }


    // ERROR DE CONEXION

    if (error instanceof TypeError) {

      throw new Error(
        "No fue posible conectar con Cloudinary. " +
        "Comprueba Internet o la configuración CORS."
      );

    }


    throw error;

  } finally {

    clearTimeout(timeout);

  }

}


// ==========================================
// F. ELIMINAR FOTOGRAFIA
// ==========================================

// REQUIERE UN BACKEND CON AUTORIZACION.
// NO EXPONEMOS CLAVES SECRETAS.

export async function eliminarArchivoPorUrl() {

  throw new Error(
    "Eliminar fotografías de Cloudinary " +
    "requiere un backend autorizado."
  );

}