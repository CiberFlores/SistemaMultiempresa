// Reglas de promociones, compartidas por la pantalla de Promociones y el punto de venta.
//
// Una promoción:
//   tipo: "PORCENTAJE" (valor = % sobre la línea) | "MONTO" (valor = Bs de rebaja por unidad)
//   aplicaA: "TODOS" | "PRODUCTO" | "CATEGORIA"  (referenciaId = producto o categoría)
//   cantidadMinima: unidades que se deben llevar del producto para que aplique (por defecto 1)
//   fechaInicio / fechaFin: "YYYY-MM-DD" opcionales, ambas inclusivas
//   estado: "ACTIVO" | "INACTIVO"

export function hoyLocal() {
  const hoy = new Date();
  return [
    hoy.getFullYear(),
    String(hoy.getMonth() + 1).padStart(2, "0"),
    String(hoy.getDate()).padStart(2, "0")
  ].join("-");
}

const redondear = (valor) => Math.round((Number(valor) + Number.EPSILON) * 100) / 100;

// "VIGENTE" | "PROGRAMADA" | "VENCIDA" | "DESACTIVADA"
export function estadoPromocion(promocion, hoy = hoyLocal()) {
  if (promocion.estado !== "ACTIVO") return "DESACTIVADA";
  if (promocion.fechaInicio && promocion.fechaInicio > hoy) return "PROGRAMADA";
  if (promocion.fechaFin && promocion.fechaFin < hoy) return "VENCIDA";
  return "VIGENTE";
}

export function describirDescuento(promocion) {
  const valor = Number(promocion.valor || 0);
  const texto = valor.toLocaleString("es-BO", { maximumFractionDigits: 2 });
  return promocion.tipo === "MONTO" ? `Bs ${texto} menos por unidad` : `${texto}% de descuento`;
}

// Descuento de una promoción sobre una línea del carrito (0 si no aplica)
export function descuentoDeLinea(promocion, linea, producto, hoy = hoyLocal()) {
  if (estadoPromocion(promocion, hoy) !== "VIGENTE") return 0;

  if (promocion.aplicaA === "PRODUCTO" && promocion.referenciaId !== linea.productoId) return 0;
  if (promocion.aplicaA === "CATEGORIA" && (!producto || promocion.referenciaId !== producto.categoriaId)) return 0;

  const cantidad = Number(linea.cantidad);
  const precio = Number(linea.precioUnitario);
  if (!(cantidad > 0) || !(precio >= 0)) return 0;
  if (cantidad < Number(promocion.cantidadMinima || 1)) return 0;

  const bruto = cantidad * precio;
  const valor = Number(promocion.valor || 0);
  const descuento = promocion.tipo === "MONTO" ? cantidad * Math.min(valor, precio) : (bruto * Math.min(valor, 100)) / 100;

  return redondear(Math.min(Math.max(descuento, 0), bruto));
}

// Para cada línea se aplica la mejor promoción (no se acumulan entre sí)
export function calcularPromociones(carrito, productos, promociones, hoy = hoyLocal()) {
  const porId = new Map(productos.map((p) => [p.id, p]));

  const lineas = [];

  carrito.forEach((linea) => {
    let mejor = null;

    promociones.forEach((promocion) => {
      const descuento = descuentoDeLinea(promocion, linea, porId.get(linea.productoId), hoy);
      if (descuento > 0 && (!mejor || descuento > mejor.descuento)) {
        mejor = { productoId: linea.productoId, nombreProducto: linea.nombre || linea.nombreProducto, promocion, descuento };
      }
    });

    if (mejor) lineas.push(mejor);
  });

  const total = redondear(lineas.reduce((suma, l) => suma + l.descuento, 0));

  return { lineas, total };
}
