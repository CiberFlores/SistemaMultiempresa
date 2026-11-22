// Identidad visual de cada empresa: colores, tipografía y logo.
// Estos valores definen cómo se ve el panel de esa empresa.

export const IDENTIDAD_BASE = {
  nombreVisual: "",
  logoUrl: "",
  colorPrimario: "#FE7C01",
  colorSecundario: "#42054E",
  fondo: "#1C0222",
  tipografia: "Inter"
};

export const TIPOGRAFIAS = [
  { valor: "Inter", etiqueta: "Inter · limpia y neutra" },
  { valor: "Manrope", etiqueta: "Manrope · moderna" },
  { valor: "Montserrat", etiqueta: "Montserrat · geométrica" },
  { valor: "Space Grotesk", etiqueta: "Space Grotesk · técnica" },
  { valor: "Fraunces", etiqueta: "Fraunces · cálida y redondeada" }
];

// Paletas listas para elegir; cada una trae su propio fondo
export const PALETAS = [
  { id: "arca", nombre: "Arca Nova", colorPrimario: "#FE7C01", colorSecundario: "#42054E", fondo: "#1C0222", rubros: [] },
  { id: "farmacia", nombre: "Farmacia", colorPrimario: "#14B8A6", colorSecundario: "#0F766E", fondo: "#06201D", rubros: ["farmacia", "botica", "salud", "clínica", "clinica", "óptica", "optica", "dental"] },
  { id: "ferreteria", nombre: "Ferretería", colorPrimario: "#F59E0B", colorSecundario: "#64748B", fondo: "#17130A", rubros: ["ferreter", "construcci", "materiales", "pintura"] },
  { id: "panaderia", nombre: "Panadería", colorPrimario: "#E58A1F", colorSecundario: "#9A3412", fondo: "#1F1209", rubros: ["panader", "pasteler", "cafeter", "restaurante", "comida", "heladería", "heladeria"] },
  { id: "tienda", nombre: "Tienda de barrio", colorPrimario: "#3B82F6", colorSecundario: "#F97316", fondo: "#0B1220", rubros: ["tienda", "abarrotes", "bodega", "kiosco", "librer"] },
  { id: "minimarket", nombre: "Minimarket", colorPrimario: "#EF4444", colorSecundario: "#FACC15", fondo: "#1F0A0A", rubros: ["market", "supermercado", "comercio", "licorer"] },
  { id: "belleza", nombre: "Belleza y moda", colorPrimario: "#EC4899", colorSecundario: "#F59E0B", fondo: "#200A16", rubros: ["belleza", "moda", "ropa", "peluquer", "cosm", "boutique", "calzado"] },
  { id: "claro", nombre: "Claro clásico", colorPrimario: "#2563EB", colorSecundario: "#0EA5E9", fondo: "#F6F8FC", rubros: [] }
];

export function paletaPorRubro(rubro) {
  const texto = String(rubro || "").toLowerCase();

  if (!texto) {
    return null;
  }

  return (
    PALETAS.find((paleta) => paleta.rubros.some((clave) => texto.includes(clave))) || null
  );
}

// ---------------------------------------------------------------
// Color
// ---------------------------------------------------------------

export function esHexValido(valor) {
  return /^#([0-9a-f]{6})$/i.test(String(valor || "").trim());
}

export function normalizarHex(valor, respaldo = "#000000") {
  let texto = String(valor || "").trim();

  if (!texto.startsWith("#")) {
    texto = `#${texto}`;
  }

  if (/^#([0-9a-f]{3})$/i.test(texto)) {
    texto = `#${texto[1]}${texto[1]}${texto[2]}${texto[2]}${texto[3]}${texto[3]}`;
  }

  return esHexValido(texto) ? texto.toUpperCase() : respaldo;
}

function aRgb(hex) {
  const limpio = normalizarHex(hex).slice(1);

  return [
    parseInt(limpio.slice(0, 2), 16),
    parseInt(limpio.slice(2, 4), 16),
    parseInt(limpio.slice(4, 6), 16)
  ];
}

function aHex([r, g, b]) {
  return `#${[r, g, b]
    .map((canal) => Math.max(0, Math.min(255, Math.round(canal))).toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase();
}

export function luminancia(hex) {
  const [r, g, b] = aRgb(hex).map((canal) => {
    const c = canal / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Relación de contraste entre dos colores (1 a 21)
export function contraste(a, b) {
  const la = luminancia(a);
  const lb = luminancia(b);

  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// Texto oscuro o claro, el que mejor se lea sobre ese color
export function textoSobre(hex) {
  // El blanco gana mientras tenga contraste de texto grande (3.2); si no, el oscuro.
  if (contraste(hex, "#FFFFFF") >= 3.2) return "#FFFFFF";
  return contraste(hex, "#FFFFFF") >= contraste(hex, "#1A1020") ? "#FFFFFF" : "#1A1020";
}

export function mezclar(hexA, hexB, peso = 0.5) {
  const a = aRgb(hexA);
  const b = aRgb(hexB);

  return aHex(a.map((canal, i) => canal * (1 - peso) + b[i] * peso));
}

export function esFondoClaro(fondo) {
  return luminancia(fondo) > 0.5;
}

// Todo lo que el panel necesita a partir de la identidad elegida
export function derivarTema(identidad) {
  const primario = normalizarHex(identidad.colorPrimario, IDENTIDAD_BASE.colorPrimario);
  const secundario = normalizarHex(identidad.colorSecundario, IDENTIDAD_BASE.colorSecundario);
  const fondo = normalizarHex(identidad.fondo, IDENTIDAD_BASE.fondo);
  const claro = esFondoClaro(fondo);
  const texto = claro ? "#1A1020" : "#FFF9F0";

  return {
    primario,
    secundario,
    fondo,
    texto,
    claro,
    sobrePrimario: textoSobre(primario),
    sobreSecundario: textoSobre(secundario),
    superficie: mezclar(fondo, claro ? "#FFFFFF" : texto, claro ? 0.7 : 0.07),
    superficie2: mezclar(fondo, claro ? "#000000" : texto, claro ? 0.04 : 0.13),
    borde: mezclar(fondo, texto, claro ? 0.14 : 0.18),
    apagado: mezclar(fondo, texto, 0.62),
    acento: mezclar(primario, secundario, 0.5),
    // Un texto de color solo se usa si se lee bien sobre el fondo
    primarioLegible: contraste(primario, fondo) >= 3 ? primario : texto
  };
}

// Variables CSS para el panel real de la empresa
export function variablesPanel(identidad) {
  const tema = derivarTema(identidad);

  return {
    "--admin-primary": tema.primario,
    "--admin-secondary": tema.secundario,
    "--admin-accent": tema.acento,
    "--admin-bg": tema.fondo,
    "--admin-text": tema.texto,
    "--admin-muted": tema.apagado,
    "--admin-on-primary": tema.sobrePrimario,
    "--font-main": `"${identidad.tipografia || IDENTIDAD_BASE.tipografia}", "Inter", system-ui, sans-serif`
  };
}

// Resumen que se guarda dentro del documento de la empresa para listados rápidos
export function resumenIdentidad(identidad) {
  return {
    colorPrimario: normalizarHex(identidad.colorPrimario, IDENTIDAD_BASE.colorPrimario),
    colorSecundario: normalizarHex(identidad.colorSecundario, IDENTIDAD_BASE.colorSecundario),
    fondo: normalizarHex(identidad.fondo, IDENTIDAD_BASE.fondo),
    tipografia: identidad.tipografia || IDENTIDAD_BASE.tipografia,
    nombreVisual: (identidad.nombreVisual || "").trim()
  };
}
