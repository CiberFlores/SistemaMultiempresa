// Pone en mayúscula cada palabra que venga toda en minúsculas ("luis mamani" → "Luis Mamani")
function capitalizar(texto) {
  return texto
    .split(/\s+/)
    .map((palabra) =>
      palabra === palabra.toLowerCase()
        ? palabra.charAt(0).toUpperCase() + palabra.slice(1)
        : palabra
    )
    .join(" ");
}

// El nombre se lee del perfil en cada inicio de sesión, así que siempre es el actual.
// Si no hay nombre, usa la parte del correo antes de la arroba.
export function nombreParaSaludo(usuario) {
  let nombre = (usuario?.nombreCompleto || "").trim();

  // Las cuentas creadas automáticas se llaman "Administrador - Empresa"
  if (/^administrador\s*[-–]/i.test(nombre)) {
    nombre = "Administrador";
  }

  if (!nombre) {
    const correo = usuario?.correo || usuario?.email || "";
    nombre = correo.split("@")[0].replace(/[._-]+/g, " ").trim();
  }

  if (!nombre) {
    return "";
  }

  // Dos palabras como máximo: "José Manuel"
  return capitalizar(nombre.split(/\s+/).slice(0, 2).join(" "));
}
