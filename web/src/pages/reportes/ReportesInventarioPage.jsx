import ReportPage from "../../components/common/ReportPage";

import {
  Boxes,
  Package,
  AlertTriangle,
  Wallet
} from "lucide-react";


// ==========================================
// CONVERTIR A NUMERO
// ==========================================

function numero(valor) {

  const resultado = Number(valor);

  return Number.isFinite(resultado)
    ? resultado
    : 0;

}


// ==========================================
// FORMATEAR DINERO
// ==========================================

function dinero(valor) {

  return `Bs ${numero(valor).toFixed(2)}`;

}


// ==========================================
// OBTENER EL PRIMER VALOR NUMERICO
// ==========================================

function primerCosto(...valores) {

  for (const valor of valores) {

    if (
      valor === undefined ||
      valor === null ||
      valor === ""
    ) {
      continue;
    }

    const convertido = Number(valor);

    if (
      Number.isFinite(convertido) &&
      convertido >= 0
    ) {

      return convertido;

    }

  }

  return null;

}


// ==========================================
// FORMATEAR FECHA
// ==========================================

function mostrarFecha(valor) {

  if (!valor) return "-";

  let fecha;

  if (typeof valor.toDate === "function") {

    fecha = valor.toDate();

  } else {

    fecha = new Date(valor);

  }

  if (
    !fecha ||
    Number.isNaN(fecha.getTime())
  ) {

    return "-";

  }

  return fecha.toLocaleString("es-BO");

}


// ==========================================
// COLECCIONES RELACIONADAS
// ==========================================

const coleccionesRelacionadas = [

  "productos",

  "sucursales"

];


// ==========================================
// RELACIONAR INVENTARIO CON PRODUCTOS
// ==========================================

function prepararInventario(inventarios, relaciones) {

  const productos = relaciones.productos || [];

  const sucursales = relaciones.sucursales || [];


  // MAPA DE PRODUCTOS

  const mapaProductos = new Map(

    productos.map((producto) => [

      producto.id,

      producto

    ])

  );


  // MAPA DE SUCURSALES

  const mapaSucursales = new Map(

    sucursales.map((sucursal) => [

      sucursal.id,

      sucursal

    ])

  );


  // PREPARAR FILAS

  return inventarios.map((inventario) => {

    const producto = mapaProductos.get(
      inventario.productoId
    );

    const sucursal = mapaSucursales.get(
      inventario.sucursalId
    );


    // STOCK ACTUAL

    const stock = numero(

      inventario.stock ??
      inventario.cantidad ??
      0

    );


    // STOCK MINIMO

    const stockMinimo = numero(

      inventario.stockMinimo ??
      producto?.stockMinimo ??
      producto?.stockMin ??
      producto?.minimoStock ??
      0

    );


    // COSTO ACTUAL REGISTRADO

    const costoUnitario = primerCosto(

      inventario.costoPromedio,

      inventario.ultimoCosto,

      inventario.costoUnitario,

      inventario.costo,

      producto?.costoActual,

      producto?.costoPromedio,

      producto?.costoUnitario,

      producto?.costoCompra,

      producto?.precioCosto,

      producto?.precioCompra,

      producto?.costo

    );


    // VALORIZACION

    const valorizacion =

      costoUnitario === null

        ? null

        : Number(
            (stock * costoUnitario).toFixed(2)
          );


    // ESTADO DEL STOCK

    let estadoStock = "NORMAL";

    if (stock <= 0) {

      estadoStock = "AGOTADO";

    } else if (

      stockMinimo > 0 &&
      stock <= stockMinimo

    ) {

      estadoStock = "BAJO";

    }


    return {

      ...inventario,

      stock,

      stockMinimo,

      costoUnitario,

      valorizacion,

      estadoStock,

      productoNombre:

        producto?.nombre ||
        producto?.nombreProducto ||
        inventario.productoNombre ||
        inventario.productoId ||
        "Producto desconocido",

      sku:

        producto?.sku ||
        producto?.codigo ||
        inventario.sku ||
        "-",

      sucursalNombre:

        sucursal?.nombre ||
        sucursal?.codigo ||
        inventario.sucursalNombre ||
        inventario.sucursalId ||
        "Sucursal desconocida",

      fechaActualizacion:
        inventario.fechaActualizacion

    };

  });

}


// ==========================================
// INDICADORES DEL REPORTE
// ==========================================

function indicadoresInventario(filas) {

  const totalUnidades = filas.reduce(

    (total, fila) => {

      return total + numero(fila.stock);

    },

    0

  );


  const totalValorizacion = filas.reduce(

    (total, fila) => {

      return total + numero(
        fila.valorizacion
      );

    },

    0

  );


  const stockBajo = filas.filter(

    (fila) =>

      fila.estadoStock === "BAJO" ||
      fila.estadoStock === "AGOTADO"

  ).length;


  const sinCosto = filas.filter(

    (fila) => fila.costoUnitario === null

  ).length;


  return [

    {

      label: "Registros de inventario",

      value: filas.length,

      icon: Boxes,

      help: "Productos por sucursal"

    },

    {

      label: "Unidades disponibles",

      value: totalUnidades,

      icon: Package,

      help: "Existencias actuales"

    },

    {

      label: "Valorización del stock",

      value: dinero(totalValorizacion),

      icon: Wallet,

      help: sinCosto > 0
        ? `${sinCosto} registro(s) sin costo`
        : "Según costos registrados"

    },

    {

      label: "Productos con alerta",

      value: stockBajo,

      icon: AlertTriangle,

      help: "Stock bajo o agotado"

    }

  ];

}


// ==========================================
// COLUMNAS DEL REPORTE
// ==========================================

const columnasInventario = [

  {

    key: "productoNombre",

    label: "PRODUCTO",

    value: (fila) => fila.productoNombre,

    render: (fila) => (

      <div className="ri-producto">

        <strong>
          {fila.productoNombre}
        </strong>

        <small>
          {fila.sku}
        </small>

      </div>

    )

  },

  {

    key: "sucursalNombre",

    label: "SUCURSAL",

    value: (fila) => fila.sucursalNombre

  },

  {

    key: "stock",

    label: "STOCK",

    value: (fila) => fila.stock,

    render: (fila) => (

      <strong className="ri-stock">

        {fila.stock}

      </strong>

    )

  },

  {

    key: "stockMinimo",

    label: "MÍNIMO",

    value: (fila) => fila.stockMinimo

  },

  {

    key: "costoUnitario",

    label: "COSTO UNITARIO",

    value: (fila) =>

      fila.costoUnitario === null
        ? "SIN COSTO"
        : dinero(fila.costoUnitario),

    render: (fila) => (

      <span>

        {fila.costoUnitario === null

          ? "Sin costo"

          : dinero(fila.costoUnitario)}

      </span>

    )

  },

  {

    key: "valorizacion",

    label: "VALORIZACIÓN",

    value: (fila) =>

      fila.valorizacion === null
        ? "SIN COSTO"
        : dinero(fila.valorizacion),

    render: (fila) => (

      <strong className="ri-valor">

        {fila.valorizacion === null

          ? "Sin costo"

          : dinero(fila.valorizacion)}

      </strong>

    )

  },

  {

    key: "estadoStock",

    label: "ESTADO",

    value: (fila) => fila.estadoStock,

    render: (fila) => (

      <span

        className={`ri-estado ${
          fila.estadoStock === "NORMAL"
            ? "normal"
            : fila.estadoStock === "BAJO"
            ? "bajo"
            : "agotado"
        }`}

      >

        {fila.estadoStock === "NORMAL"

          ? "NORMAL"

          : fila.estadoStock === "BAJO"

          ? "STOCK BAJO"

          : "AGOTADO"}

      </span>

    )

  },

  {

    key: "fechaActualizacion",

    label: "ACTUALIZADO",

    value: (fila) =>

      mostrarFecha(
        fila.fechaActualizacion
      )

  }

];


// ==========================================
// ESTILOS DEL REPORTE
// ==========================================

const estilosInventario = `

.inventory-report-v2 .report-metrics {
  display: grid;
  grid-template-columns: repeat(
    auto-fit,
    minmax(190px, 1fr)
  );
  gap: 14px;
  margin: 20px 0;
}

.inventory-report-v2 .neo-metric {
  min-width: 0;
  border-radius: 16px;
  padding: 19px;
  background: linear-gradient(
    145deg,
    rgba(104, 68, 210, 0.12),
    rgba(15, 17, 32, 0.95)
  );
  border: 1px solid rgba(
    149, 119, 255, 0.2
  );
}

.inventory-report-v2 .neo-metric strong {
  font-size: 24px;
  font-weight: 800;
  color: #f5f3ff;
}

.inventory-report-v2 .neo-metric small {
  display: block;
  margin-top: 6px;
  color: #9799b3;
  font-size: 11px;
}

.inventory-report-v2 .neo-metric svg {
  color: #9b80ff;
  flex-shrink: 0;
}

.inventory-report-v2 .data-card {
  border-radius: 20px;
  overflow: hidden;
}

.inventory-report-v2 .modern-table th {
  white-space: nowrap;
}

.inventory-report-v2 .modern-table td {
  vertical-align: middle;
}

.ri-producto {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 125px;
}

.ri-producto strong {
  color: #f5f4ff;
  font-weight: 700;
}

.ri-producto small {
  color: #a18aff;
  font-size: 11px;
}

.ri-stock {
  font-size: 15px;
  color: #ede9ff;
}

.ri-valor {
  color: #61d6c3;
  white-space: nowrap;
}

.ri-estado {
  display: inline-flex;
  align-items: center;
  padding: 7px 10px;
  border-radius: 30px;
  font-size: 10px;
  font-weight: 800;
  white-space: nowrap;
  letter-spacing: .4px;
}

.ri-estado.normal {
  color: #5ce1b8;
  background: rgba(36, 180, 126, .12);
  border: 1px solid rgba(36, 180, 126, .25);
}

.ri-estado.bajo {
  color: #ffce6a;
  background: rgba(255, 172, 55, .12);
  border: 1px solid rgba(255, 172, 55, .25);
}

.ri-estado.agotado {
  color: #ff869a;
  background: rgba(255, 87, 116, .12);
  border: 1px solid rgba(255, 87, 116, .25);
}

.inventory-report-v2 .report-note {
  margin-bottom: 15px;
  padding: 13px 17px;
  border-radius: 12px;
  border: 1px solid rgba(150, 119, 255, .2);
  background: rgba(101, 76, 190, .07);
  color: #a8a7c2;
  font-size: 12px;
}

@media (max-width: 700px) {

  .inventory-report-v2 .neo-metric strong {
    font-size: 20px;
  }

}

`;


// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function ReportesInventarioPage() {

  return (

    <div className="inventory-report-v2">

      <style>
        {estilosInventario}
      </style>

      <ReportPage

        title="Reporte de inventario"

        description="Existencias, costos actuales, valorización y alertas de stock por sucursal."

        collectionName="inventarios"

        relatedCollections={
          coleccionesRelacionadas
        }

        transformRows={
          prepararInventario
        }

        searchFields={[

          "productoNombre",

          "sku",

          "sucursalNombre",

          "productoId"

        ]}

        amountField="stock"

        amountLabel="unidades"

        dateFilters={false}

        statusField="estadoStock"

        statusLabel="Todos los niveles"

        metrics={indicadoresInventario}

        columns={columnasInventario}

        showNote={
          "La valorización utiliza los costos registrados. Los productos sin costo no se incluyen en el valor acumulado."
        }

      />

    </div>

  );

}