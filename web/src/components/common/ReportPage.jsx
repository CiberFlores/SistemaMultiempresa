import { useEffect, useMemo, useState } from "react";

import {
  Download,
  FileBarChart2
} from "lucide-react";

import useAuth from "../../hooks/useAuth";

import {
  suscribirColeccionEmpresa
} from "../../services/genericCrudService";

import AdvancedFilterBar from "../filters/AdvancedFilterBar";


// ==========================================
// A. EVITAR ARREGLOS NUEVOS EN CADA RENDER
// ==========================================

const LISTA_VACIA = [];


// ==========================================
// B. CONVERTIR FECHAS
// ==========================================

function toDate(value) {

  if (!value) {
    return null;
  }

  if (typeof value.toDate === "function") {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  const fecha =
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T00:00:00`)
      : new Date(value);

  return Number.isNaN(fecha.getTime())
    ? null
    : fecha;
}


// ==========================================
// C. NORMALIZAR TEXTO
// ==========================================

const norm = (valor) =>
  String(valor ?? "")
    .toLowerCase()
    .trim();


// ==========================================
// D. CONVERTIR NUMEROS
// ==========================================

function numero(valor) {

  const n = Number(valor ?? 0);

  return Number.isFinite(n) ? n : 0;
}


// ==========================================
// E. FORMATEAR CIFRAS
// ==========================================

function formatoNumero(valor) {

  return numero(valor).toLocaleString("es-BO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}


// ==========================================
// F. PREPARAR VALORES PARA CSV
// ==========================================

function valorCsv(valor) {

  let texto = String(valor ?? "");

  // Evitar que Excel interprete textos como formulas.

  if (
    /^\s*[=+@-]/.test(texto) &&
    !/^-?\d+([.,]\d+)?$/.test(texto.trim())
  ) {
    texto = `'${texto}`;
  }

  return `"${texto.replace(/"/g, '""')}"`;
}


// ==========================================
// G. COMPONENTE PRINCIPAL
// ==========================================

export default function ReportPage({

  title,

  description,

  collectionName,

  searchFields = LISTA_VACIA,

  amountField = "total",

  amountLabel,

  columns = LISTA_VACIA,

  dateField = "fecha",

  relatedCollections = LISTA_VACIA,

  transformRows,

  dateFilters = true,

  statusField = "estado",

  statusLabel = "Todos los estados",

  metrics,

  showNote = ""

}) {

  const { usuario } = useAuth();

  const empresaId = usuario?.empresaId;


  // ========================================
  // H. ESTADOS
  // ========================================

  const [rows, setRows] = useState([]);

  const [relatedData, setRelatedData] =
    useState({});

  const [search, setSearch] = useState("");

  const [from, setFrom] = useState("");

  const [to, setTo] = useState("");

  const [minAmount, setMinAmount] = useState("");

  const [maxAmount, setMaxAmount] = useState("");

  const [status, setStatus] = useState("TODOS");

  const [method, setMethod] = useState("TODOS");

  const [branch, setBranch] = useState("TODOS");

  const [error, setError] = useState("");

  const [cargando, setCargando] = useState(true);


  // ========================================
  // I. CORREGIR DEPENDENCIAS DE FIREBASE
  // ========================================

  // Convertimos los nombres en una cadena estable.
  // Asi evitamos repetir consultas innecesariamente.

  const claveRelacionadas = JSON.stringify(
    Array.isArray(relatedCollections)
      ? relatedCollections
      : LISTA_VACIA
  );


  // ========================================
  // J. SUSCRIBIR FIREBASE SIN CICLOS
  // ========================================

  useEffect(() => {

    let activo = true;

    const cancelaciones = [];

    setRows([]);

    setRelatedData({});

    setError("");

    setCargando(
      Boolean(empresaId && collectionName)
    );

    if (!empresaId || !collectionName) {
      return undefined;
    }

    try {

      // ====================================
      // COLECCION PRINCIPAL
      // ====================================

      const cancelarPrincipal =
        suscribirColeccionEmpresa(

          collectionName,

          empresaId,

          (datos) => {

            if (!activo) return;

            setRows(
              Array.isArray(datos)
                ? datos
                : []
            );

            setCargando(false);
          },

          (err) => {

            console.error(err);

            if (!activo) return;

            setError(
              err?.message ||
              "No se pudo cargar el reporte."
            );

            setCargando(false);
          }
        );

      cancelaciones.push(cancelarPrincipal);


      // ====================================
      // COLECCIONES RELACIONADAS
      // ====================================

      const nombres = JSON.parse(
        claveRelacionadas
      );

      // Evitamos suscribir dos veces la misma coleccion.

      for (const nombre of new Set(nombres)) {

        if (
          typeof nombre !== "string" ||
          !nombre.trim()
        ) {
          continue;
        }

        const cancelarRelacionada =
          suscribirColeccionEmpresa(

            nombre,

            empresaId,

            (datos) => {

              if (!activo) return;

              setRelatedData((anterior) => ({
                ...anterior,

                [nombre]:
                  Array.isArray(datos)
                    ? datos
                    : []
              }));
            },

            (err) => {

              console.error(err);

              if (activo) {
                setError(
                  `No se pudo consultar ${nombre}: ${
                    err?.message || "Error de Firebase"
                  }`
                );
              }
            }
          );

        cancelaciones.push(
          cancelarRelacionada
        );
      }

    } catch (err) {

      console.error(err);

      if (activo) {

        setError(
          err?.message ||
          "No se pudo iniciar el reporte."
        );

        setCargando(false);
      }
    }


    // ====================================
    // CANCELAR CONSULTAS AL SALIR
    // ====================================

    return () => {

      activo = false;

      cancelaciones.forEach((cancelar) => {

        if (typeof cancelar === "function") {
          cancelar();
        }

      });
    };

  }, [
    empresaId,
    collectionName,
    claveRelacionadas
  ]);


  // ========================================
  // K. RELACIONAR REGISTROS
  // ========================================

  const preparedRows = useMemo(() => {

    if (typeof transformRows === "function") {

      const resultado = transformRows(
        rows,
        relatedData
      );

      return Array.isArray(resultado)
        ? resultado
        : [];
    }

    return rows;

  }, [
    rows,
    relatedData,
    transformRows
  ]);


  // ========================================
  // L. OPCIONES PARA FILTROS
  // ========================================

  const options = useMemo(() => {

    const estados = [
      ...new Set(
        preparedRows
          .map((r) => r[statusField])
          .filter(Boolean)
      )
    ];

    const metodos = [
      ...new Set(
        preparedRows
          .map((r) => r.metodoPago)
          .filter(Boolean)
      )
    ];

    const sucursales = new Map();

    preparedRows.forEach((r) => {

      if (r.sucursalId) {

        sucursales.set(
          r.sucursalId,
          r.sucursalNombre || r.sucursalId
        );

      }
    });

    return {

      estado: estados.map((value) => ({
        value,
        label: value
      })),

      metodoPago: metodos.map((value) => ({
        value,
        label: value
      })),

      sucursalId: [
        ...sucursales.entries()
      ].map(([value, label]) => ({
        value,
        label
      }))

    };

  }, [
    preparedRows,
    statusField
  ]);


  // ========================================
  // M. FILTRAR LOS REGISTROS
  // ========================================

  const filtered = useMemo(() => {

    const q = norm(search);

    const camposBusqueda =
      Array.isArray(searchFields)
        ? searchFields
        : LISTA_VACIA;

    return preparedRows.filter((row) => {

      // BUSQUEDA

      const searchOk =
        !q ||
        camposBusqueda.some(
          (campo) =>
            norm(row[campo]).includes(q)
        ) ||
        norm(row.id).includes(q);


      // FECHAS

      const fecha = toDate(
        row[dateField] ||
        row.fechaRegistro ||
        row.fechaActualizacion
      );

      const fromOk =
        !dateFilters ||
        !from ||
        (
          fecha !== null &&
          fecha >= new Date(
            `${from}T00:00:00`
          )
        );

      const toOk =
        !dateFilters ||
        !to ||
        (
          fecha !== null &&
          fecha <= new Date(
            `${to}T23:59:59`
          )
        );


      // MONTOS

      const amount = numero(
        row[amountField]
      );

      const amountOk =
        (
          minAmount === "" ||
          amount >= Number(minAmount)
        ) &&
        (
          maxAmount === "" ||
          amount <= Number(maxAmount)
        );


      // ESTADO

      const statusOk =
        status === "TODOS" ||
        row[statusField] === status;


      // METODO DE PAGO

      const methodOk =
        method === "TODOS" ||
        row.metodoPago === method;


      // SUCURSAL

      const branchOk =
        branch === "TODOS" ||
        row.sucursalId === branch;


      return (
        searchOk &&
        fromOk &&
        toOk &&
        amountOk &&
        statusOk &&
        methodOk &&
        branchOk
      );

    });

  }, [
    preparedRows,
    search,
    searchFields,
    from,
    to,
    minAmount,
    maxAmount,
    status,
    method,
    branch,
    dateField,
    amountField,
    dateFilters,
    statusField
  ]);


  // ========================================
  // N. CALCULAR TOTALES
  // ========================================

  const total = useMemo(() => {

    return filtered.reduce(
      (suma, row) =>
        suma + numero(row[amountField]),
      0
    );

  }, [
    filtered,
    amountField
  ]);


  // ========================================
  // O. LIMPIAR FILTROS
  // ========================================

  function clear() {

    setSearch("");

    setFrom("");

    setTo("");

    setMinAmount("");

    setMaxAmount("");

    setStatus("TODOS");

    setMethod("TODOS");

    setBranch("TODOS");
  }


  // ========================================
  // P. EXPORTAR CSV
  // ========================================

  function exportCsv() {

    if (!filtered.length) {

      alert(
        "No existen registros para exportar."
      );

      return;
    }

    const headers = columns.map(
      (col) => valorCsv(col.label)
    );

    const lines = filtered.map((row) => {

      return columns.map((col) => {

        const valor =
          typeof col.value === "function"
            ? col.value(row)
            : row[col.key] ?? "";

        return valorCsv(valor);

      }).join(";");

    });

    const contenido = [
      "sep=;",
      headers.join(";"),
      ...lines
    ].join("\r\n");

    const blob = new Blob(
      ["\uFEFF", contenido],
      {
        type: "text/csv;charset=utf-8;"
      }
    );

    const url = URL.createObjectURL(blob);

    const enlace = document.createElement("a");

    enlace.href = url;

    enlace.download =
      `${collectionName}-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;

    document.body.appendChild(enlace);

    enlace.click();

    enlace.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }


  // ========================================
  // Q. FILTROS AVANZADOS
  // ========================================

  const filterOptions = [];

  if (options.metodoPago.length) {

    filterOptions.push({

      key: "metodo",

      label: "Todos los métodos",

      value: method,

      onChange: setMethod,

      options: options.metodoPago
    });
  }

  if (options.sucursalId.length) {

    filterOptions.push({

      key: "sucursal",

      label: "Todas las sucursales",

      value: branch,

      onChange: setBranch,

      options: options.sucursalId
    });
  }


  // ========================================
  // R. TARJETAS DE INDICADORES
  // ========================================

  const tarjetas =
    typeof metrics === "function"
      ? metrics(filtered)
      : [

          {
            label: "Registros filtrados",
            value: filtered.length,
            icon: FileBarChart2
          },

          {
            label:
              `Total acumulado (${amountField})`,

            value: formatoNumero(total),

            icon: FileBarChart2
          }
        ];


  // ========================================
  // S. INTERFAZ DE REPORTES
  // ========================================

  return (

    <div className="module-page">

      {/* ENCABEZADO */}

      <div className="module-page-header">

        <div>

          <span className="eyebrow">
            ANALÍTICA
          </span>

          <h1>
            {title}
          </h1>

          <p>
            {description}
          </p>

        </div>


        <button
          type="button"
          className="primary-action"
          onClick={exportCsv}
        >
          <Download size={17} />

          Exportar CSV
        </button>

      </div>


      {/* MOSTRAR ERRORES */}

      {error && (

        <div
          className="form-error"
          style={{
            marginBottom: 16,
            padding: 14
          }}
        >
          {error}
        </div>

      )}


      {/* BARRA DE FILTROS */}

      <AdvancedFilterBar

        search={search}

        onSearch={setSearch}

        searchPlaceholder="Buscar en reporte..."

        status={
          options.estado.length
            ? status
            : undefined
        }

        onStatus={
          options.estado.length
            ? setStatus
            : undefined
        }

        statusOptions={[
          {
            value: "TODOS",
            label: statusLabel
          },
          ...options.estado
        ]}

        filters={filterOptions}

        onClear={clear}
      />


      {/* FILTROS DE FECHAS */}

      <div className="report-date-row filter-range-grid">

        {dateFilters && (

          <>

            <label>
              Desde

              <input
                type="date"
                value={from}
                onChange={(e) =>
                  setFrom(e.target.value)
                }
              />
            </label>


            <label>
              Hasta

              <input
                type="date"
                value={to}
                onChange={(e) =>
                  setTo(e.target.value)
                }
              />
            </label>

          </>

        )}


        <label>
          {amountLabel || amountField} mínimo

          <input
            type="number"
            min="0"
            step="0.01"
            value={minAmount}
            onChange={(e) =>
              setMinAmount(e.target.value)
            }
            placeholder="0"
          />
        </label>


        <label>
          {amountLabel || amountField} máximo

          <input
            type="number"
            min="0"
            step="0.01"
            value={maxAmount}
            onChange={(e) =>
              setMaxAmount(e.target.value)
            }
            placeholder="Sin límite"
          />
        </label>

      </div>


      {/* INDICADORES */}

      <section className="report-metrics">

        {tarjetas.map((tarjeta, indice) => {

          const Icono =
            tarjeta.icon || FileBarChart2;

          return (

            <article
              className="neo-metric"
              key={indice}
            >

              <Icono size={23} />

              <div>

                <span>
                  {tarjeta.label}
                </span>

                <strong>
                  {tarjeta.value}
                </strong>

                {tarjeta.help && (

                  <small>
                    {tarjeta.help}
                  </small>

                )}

              </div>

            </article>

          );

        })}

      </section>


      {/* NOTA INFORMATIVA */}

      {showNote && (

        <div className="report-note">
          {showNote}
        </div>

      )}


      {/* TABLA DEL REPORTE */}

      <section className="data-card glass-3d">

        <div className="table-scroll">

          <table className="modern-table">

            <thead>

              <tr>

                {columns.map((col) => (

                  <th key={col.key}>
                    {col.label}
                  </th>

                ))}

              </tr>

            </thead>


            <tbody>

              {filtered.map((row) => (

                <tr key={row.id}>

                  {columns.map((col) => (

                    <td key={col.key}>

                      {typeof col.render === "function"
                        ? col.render(row)
                        : typeof col.value === "function"
                          ? col.value(row)
                          : String(
                              row[col.key] ?? "-"
                            )}

                    </td>

                  ))}

                </tr>

              ))}

            </tbody>

          </table>


          {/* ESTADO DE CARGA */}

          {cargando && (

            <div className="empty-state">
              Cargando reporte...
            </div>

          )}


          {/* REPORTE VACIO */}

          {!cargando && !filtered.length && (

            <div className="empty-state">
              Sin datos para los filtros seleccionados.
            </div>

          )}

        </div>

      </section>

    </div>
  );
}