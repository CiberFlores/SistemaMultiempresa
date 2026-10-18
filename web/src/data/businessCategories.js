export const RUBROS_EMPRESA = [
  {
    grupo: "Comercio y retail",
    opciones: [
      "Minimarket",
      "Supermercado",
      "Tienda de barrio",
      "Tienda por departamentos",
      "Bazar",
      "Librería y papelería",
      "Ferretería",
      "Tienda de materiales de construcción",
      "Electrónica y tecnología",
      "Telefonía y accesorios",
      "Ropa y moda",
      "Calzados",
      "Joyería y accesorios",
      "Muebles y decoración",
      "Electrodomésticos",
      "Juguetería",
      "Mascotas y accesorios",
      "Repuestos automotrices",
      "Repuestos de motocicleta",
      "Tienda deportiva",
      "Óptica",
      "Floristería"
    ]
  },
  {
    grupo: "Salud y bienestar",
    opciones: [
      "Farmacia",
      "Laboratorio clínico",
      "Clínica",
      "Consultorio médico",
      "Centro odontológico",
      "Veterinaria",
      "Centro de fisioterapia",
      "Tienda naturista",
      "Centro de estética",
      "Peluquería y barbería",
      "Spa"
    ]
  },
  {
    grupo: "Alimentos y gastronomía",
    opciones: [
      "Restaurante",
      "Cafetería",
      "Panadería",
      "Pastelería",
      "Comida rápida",
      "Heladería",
      "Carnicería",
      "Frutería y verdulería",
      "Distribuidora de alimentos",
      "Bebidas y refrescos",
      "Catering"
    ]
  },
  {
    grupo: "Servicios profesionales",
    opciones: [
      "Consultoría",
      "Estudio jurídico",
      "Contabilidad y auditoría",
      "Agencia de marketing",
      "Agencia de publicidad",
      "Diseño gráfico",
      "Desarrollo de software",
      "Soporte técnico",
      "Imprenta",
      "Fotografía y video",
      "Inmobiliaria",
      "Seguros",
      "Servicios financieros"
    ]
  },
  {
    grupo: "Servicios operativos",
    opciones: [
      "Transporte y logística",
      "Courier y mensajería",
      "Taller mecánico",
      "Lavado de vehículos",
      "Servicios de limpieza",
      "Seguridad privada",
      "Mantenimiento y reparaciones",
      "Alquiler de equipos",
      "Almacén y distribución"
    ]
  },
  {
    grupo: "Educación y entretenimiento",
    opciones: [
      "Instituto educativo",
      "Academia",
      "Centro de capacitación",
      "Guardería",
      "Gimnasio",
      "Centro deportivo",
      "Eventos y entretenimiento",
      "Turismo y viajes",
      "Hotel y hospedaje"
    ]
  },
  {
    grupo: "Industria y producción",
    opciones: [
      "Manufactura",
      "Textil y confección",
      "Producción de alimentos",
      "Agricultura",
      "Ganadería",
      "Importadora",
      "Exportadora",
      "Distribuidora mayorista"
    ]
  }
];

export const RUBROS_PLANOS = RUBROS_EMPRESA.flatMap((grupo) => grupo.opciones);
