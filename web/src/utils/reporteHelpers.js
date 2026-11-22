// Funciones compartidas por los reportes (formatos, períodos y series por día)

export const dinero = (valor) => {
  const n = Number(valor || 0);
  return `${n < 0 ? "−" : ""}Bs ${Math.abs(n).toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const cantidad = (valor) => Number(valor || 0).toLocaleString("es-BO", { maximumFractionDigits: 2 });

export const normalizar = (valor) =>
  String(valor ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

export const fechaDe = (valor) => {
  const f = valor?.toDate?.() || (typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor) ? new Date(`${valor}T12:00:00`) : null);
  return f && !Number.isNaN(f.getTime()) ? f : null;
};

const dia = (f) => new Date(f.getFullYear(), f.getMonth(), f.getDate());

export const PERIODOS = [
  ["HOY", "Hoy"],
  ["SEMANA", "Últimos 7 días"],
  ["MES", "Este mes"],
  ["MES_PASADO", "Mes pasado"],
  ["TODO", "Todo"],
  ["FECHAS", "Elegir fechas"]
];

// Convierte el período elegido en un rango de fechas y su texto
export function rangoDe(periodo, desde, hasta) {
  const hoy = dia(new Date());
  const fin = (f) => new Date(f.getFullYear(), f.getMonth(), f.getDate(), 23, 59, 59, 999);
  const largo = (f) => f.toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" });

  if (periodo === "HOY") return { inicio: hoy, fin: fin(hoy), texto: "Hoy" };

  if (periodo === "SEMANA") {
    const inicio = new Date(hoy);
    inicio.setDate(inicio.getDate() - 6);
    return { inicio, fin: fin(hoy), texto: "Últimos 7 días" };
  }

  if (periodo === "MES") {
    return { inicio: new Date(hoy.getFullYear(), hoy.getMonth(), 1), fin: fin(hoy), texto: "Este mes" };
  }

  if (periodo === "MES_PASADO") {
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const ultimo = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
    return { inicio, fin: fin(ultimo), texto: "Mes pasado" };
  }

  if (periodo === "FECHAS") {
    const inicio = desde ? new Date(`${desde}T00:00:00`) : null;
    const final = hasta ? new Date(`${hasta}T23:59:59`) : null;
    const texto = inicio && final ? `Del ${largo(inicio)} al ${largo(final)}` : inicio ? `Desde ${largo(inicio)}` : final ? `Hasta ${largo(final)}` : "Todo";
    return { inicio, fin: final, texto };
  }

  return { inicio: null, fin: null, texto: "Todo el tiempo" };
}

export const enRango = (fecha, rango) => {
  if (!fecha) return !rango.inicio && !rango.fin;
  if (rango.inicio && fecha < rango.inicio) return false;
  if (rango.fin && fecha > rango.fin) return false;
  return true;
};

// Suma por día dentro del rango (máximo 31 días, terminando en el último día del rango)
export function serieDiaria(items, obtenerFecha, obtenerValor, rango) {
  const hoy = dia(new Date());
  const ultimo = rango.fin ? dia(rango.fin) : hoy;
  const final = ultimo > hoy ? hoy : ultimo;

  let primero = rango.inicio ? dia(rango.inicio) : null;

  if (!primero) {
    const fechas = items.map((i) => obtenerFecha(i)).filter(Boolean);
    primero = fechas.length ? dia(new Date(Math.min(...fechas.map((f) => f.getTime())))) : final;
  }

  const minimo = new Date(final);
  minimo.setDate(minimo.getDate() - 30);
  if (primero < minimo) primero = minimo;

  const dias = new Map();
  for (let d = new Date(primero); d <= final; d.setDate(d.getDate() + 1)) {
    dias.set(d.getTime(), { fecha: new Date(d), valor: 0 });
  }

  items.forEach((item) => {
    const f = obtenerFecha(item);
    if (!f) return;
    const registro = dias.get(dia(f).getTime());
    if (registro) registro.valor += Number(obtenerValor(item)) || 0;
  });

  return [...dias.values()];
}

