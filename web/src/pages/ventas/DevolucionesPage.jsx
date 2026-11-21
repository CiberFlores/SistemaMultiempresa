import { useCallback, useEffect, useMemo, useState } from "react";

import {
  AlertTriangle,
  CalendarDays,
  PackageCheck,
  RotateCcw,
  Search,
  Undo2
} from "lucide-react";

import useAuth from "../../hooks/useAuth";

import AdvancedFilterBar from "../../components/filters/AdvancedFilterBar";

import {
  cargarDatosDevoluciones,
  registrarDevolucion
} from "../../services/devolucionService";


// ==========================================
// A. OBTENER FECHA ACTUAL
// ==========================================

function hoyLocal() {
  const hoy = new Date();

  const anio = hoy.getFullYear();

  const mes = String(
    hoy.getMonth() + 1
  ).padStart(2, "0");

  const dia = String(
    hoy.getDate()
  ).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}


// ==========================================
// B. CONVERTIR FECHAS DE FIRESTORE
// ==========================================

function fechaDe(valor) {
  if (!valor) return null;

  const fecha =
    typeof valor.toDate === "function"
      ? valor.toDate()
      : new Date(valor);

  return Number.isNaN(fecha.getTime())
    ? null
    : fecha;
}


// ==========================================
// C. FORMATEAR NUMEROS
// ==========================================

function mostrarNumero(valor) {
  return Number(valor || 0).toLocaleString("es-BO", {
    maximumFractionDigits: 2
  });
}


// ==========================================
// D. COMPONENTE PRINCIPAL
// ==========================================

export default function DevolucionesPage() {

  const { usuario } = useAuth();

  const empresaId = usuario?.empresaId;


  // ========================================
  // ESTADOS GENERALES
  // ========================================

  const [ventas, setVentas] = useState([]);

  const [detalles, setDetalles] = useState([]);

  const [devoluciones, setDevoluciones] = useState([]);


  // ========================================
  // FORMULARIO
  // ========================================

  const [ventaId, setVentaId] = useState("");

  const [detalleVentaId, setDetalleVentaId] = useState("");

  const [cantidad, setCantidad] = useState("1");

  const [motivo, setMotivo] = useState("");

  const [resolucion, setResolucion] = useState("REINTEGRO");

  const [reingresaStock, setReingresaStock] = useState(false);


  // ========================================
  // FILTROS
  // ========================================

  const [search, setSearch] = useState("");

  const [resolutionFilter, setResolutionFilter] = useState("TODOS");


  // ========================================
  // CARGAS Y MENSAJES
  // ========================================

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [ok, setOk] = useState("");


  // ========================================
  // E. CARGAR DATOS DESDE FIREBASE
  // ========================================

  const load = useCallback(async () => {

    if (!empresaId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {

      const data = await cargarDatosDevoluciones(empresaId);

      setVentas(data.ventas);

      setDetalles(data.detalles);

      setDevoluciones(data.devoluciones);

    } catch (err) {

      console.error(err);

      setError(
        err.message ||
        "No se pudieron cargar las devoluciones."
      );

    } finally {

      setLoading(false);

    }

  }, [empresaId]);


  useEffect(() => {
    load();
  }, [load]);


  // ========================================
  // F. OBTENER VENTAS COMPLETADAS
  // ========================================

  const ventasValidas = useMemo(
    () => ventas.filter(
      (venta) => venta.estado === "COMPLETADA"
    ),
    [ventas]
  );


  // ========================================
  // G. OBTENER PRODUCTOS DE LA VENTA
  // ========================================

  const detallesVenta = useMemo(
    () => detalles.filter(
      (detalle) => detalle.ventaId === ventaId
    ),
    [detalles, ventaId]
  );


  // ========================================
  // H. PRODUCTO SELECCIONADO
  // ========================================

  const detalleElegido = useMemo(
    () => detallesVenta.find(
      (detalle) => detalle.id === detalleVentaId
    ),
    [detallesVenta, detalleVentaId]
  );


  // ========================================
  // I. CALCULAR DEVOLUCIONES ANTERIORES
  // ========================================

  const cantidadDevuelta = useMemo(
    () => devoluciones
      .filter(
        (dev) =>
          dev.detalleVentaId === detalleVentaId &&
          dev.estado !== "ANULADA"
      )
      .reduce(
        (suma, dev) =>
          suma + Number(dev.cantidad || 0),
        0
      ),

    [devoluciones, detalleVentaId]
  );


  const maxCantidad = Math.max(
    0,

    Number(detalleElegido?.cantidad || 0) -
    cantidadDevuelta
  );


  // ========================================
  // J. LOTES UTILIZADOS EN LA VENTA
  // ========================================

  const lotesUsados = Array.isArray(
    detalleElegido?.lotesUsados
  )
    ? detalleElegido.lotesUsados
    : [];


  const controlaVencimiento =
    detalleElegido?.controlaVencimiento === true ||
    lotesUsados.length > 0;


  // ========================================
  // K. VERIFICAR FECHAS DE VENCIMIENTO
  // ========================================

  const fechaActual = hoyLocal();


  const tieneLoteVencido = lotesUsados.some(
    (lote) =>

      typeof lote.fechaVencimiento === "string" &&

      /^\d{4}-\d{2}-\d{2}$/.test(
        lote.fechaVencimiento
      ) &&

      lote.fechaVencimiento < fechaActual
  );


  // ========================================
  // L. COMPROBAR TRAZABILIDAD
  // ========================================

  const faltaTrazabilidad =
    controlaVencimiento && (

      lotesUsados.length === 0 ||

      lotesUsados.some(
        (lote) =>

          !lote.loteId ||

          !/^\d{4}-\d{2}-\d{2}$/.test(
            lote.fechaVencimiento || ""
          )
      )
    );


  // ========================================
  // M. PERMITIR REINGRESO
  // ========================================

  // SI ALGUN LOTE ESTA VENCIDO O NO TIENE
  // TRAZABILIDAD, NO OFRECEMOS REINGRESO.

  const permiteReingreso =
    !tieneLoteVencido &&
    !faltaTrazabilidad;


  // ========================================
  // N. FILTRAR HISTORIAL
  // ========================================

  const filtered = useMemo(() => {

    const texto = search.trim().toLowerCase();

    return devoluciones.filter((row) => {

      const coincideBusqueda =

        !texto ||

        [
          row.id,
          row.ventaId,
          row.productoId,
          row.productoNombre,
          row.motivo,
          row.resolucion,
          row.usuarioId

        ].some(
          (valor) =>
            String(valor || "")
              .toLowerCase()
              .includes(texto)
        );


      return coincideBusqueda && (

        resolutionFilter === "TODOS" ||

        row.resolucion === resolutionFilter
      );

    });

  }, [
    devoluciones,
    search,
    resolutionFilter
  ]);


  // ========================================
  // O. CAMBIAR VENTA
  // ========================================

  function cambiarVenta(id) {

    setVentaId(id);

    setDetalleVentaId("");

    setCantidad("1");

    setReingresaStock(false);

    setError("");

    setOk("");
  }


  // ========================================
  // P. CAMBIAR PRODUCTO
  // ========================================

  function cambiarDetalle(id) {

    setDetalleVentaId(id);

    setCantidad("1");

    // EL REINGRESO SE ACTIVA MANUALMENTE.

    setReingresaStock(false);

    setError("");

    setOk("");
  }


  // ========================================
  // Q. GUARDAR DEVOLUCION
  // ========================================

  async function save(evento) {

    evento.preventDefault();

    if (saving) return;

    setError("");

    setOk("");


    // VALIDAR CANTIDAD

    const qty = Number(cantidad);

    if (!ventaId || !detalleVentaId) {

      setError(
        "Selecciona una venta y un producto."
      );

      return;
    }


    if (
      !Number.isFinite(qty) ||
      qty <= 0 ||
      qty > maxCantidad
    ) {

      setError(
        `La cantidad debe ser mayor que cero y no superar ${mostrarNumero(maxCantidad)}.`
      );

      return;
    }


    // VALIDAR MOTIVO

    if (motivo.trim().length < 3) {

      setError(
        "Escribe el motivo de la devolución."
      );

      return;
    }


    // VALIDAR REINGRESO

    if (
      reingresaStock &&
      !permiteReingreso
    ) {

      setError(
        "No es seguro reingresar este producto: tiene un lote vencido o sin trazabilidad."
      );

      return;
    }


    // CONFIRMACION

    const confirmado = window.confirm(

      `¿Registrar devolución de ${mostrarNumero(qty)} unidad(es)?\n` +

      `Stock: ${reingresaStock
        ? "Sí, reingresar"
        : "No reingresar"}.\n\n` +

      "La devolución quedará registrada en el historial."
    );

    if (!confirmado) return;


    setSaving(true);

    try {

      await registrarDevolucion({

        empresaId,

        ventaId,

        detalleVentaId,

        cantidad: qty,

        motivo: motivo.trim(),

        resolucion,

        reingresaStock,

        usuarioId: usuario.uid,

        usuarioNombre:
          usuario.nombreCompleto ||
          usuario.correo ||
          usuario.email ||
          ""

      });


      // LIMPIAR FORMULARIO

      setDetalleVentaId("");

      setCantidad("1");

      setMotivo("");

      setResolucion("REINTEGRO");

      setReingresaStock(false);


      setOk(
        "Devolución registrada correctamente. Revisa el historial y el inventario."
      );


      // ACTUALIZAR DATOS

      await load();

    } catch (err) {

      console.error(err);

      setError(
        err.message ||
        "No se pudo registrar la devolución."
      );

    } finally {

      setSaving(false);

    }

  }


  // ========================================
  // R. INTERFAZ
  // ========================================

  return (

    <div className="module-page">

      {/* ================================= */}
      {/* ENCABEZADO */}
      {/* ================================= */}

      <div className="module-page-header">

        <div>

          <span className="eyebrow">
            VENTAS
          </span>

          <h1>
            Devoluciones
          </h1>

          <p>
            Registra devoluciones y controla
            el reingreso de productos por lote.
          </p>

        </div>


        <button
          type="button"
          className="secondary-action"
          onClick={load}
          disabled={loading || saving}
        >

          <RotateCcw size={16} />

          Actualizar

        </button>

      </div>


      {/* ================================= */}
      {/* FORMULARIO */}
      {/* ================================= */}

      <section className="data-card glass-3d return-form-card">

        <div className="card-title">

          <Undo2 size={24} />

          <div>

            <h3>
              Nueva devolución
            </h3>

            <p>
              Selecciona la venta, el producto
              y la cantidad que regresa.
            </p>

          </div>

        </div>


        <form
          className="smart-form"
          onSubmit={save}
        >

          {/* ============================= */}
          {/* SELECCIONAR VENTA */}
          {/* ============================= */}

          <label className="field-block">

            <span>
              Venta *
            </span>

            <select
              value={ventaId}
              onChange={(e) =>
                cambiarVenta(e.target.value)
              }
              required
            >

              <option value="">
                Seleccionar venta
              </option>


              {ventasValidas.map((venta) => (

                <option
                  key={venta.id}
                  value={venta.id}
                >

                  {venta.id.slice(0, 12)}

                  {" · Bs "}

                  {Number(
                    venta.total || 0
                  ).toFixed(2)}

                  {" · "}

                  {fechaDe(
                    venta.fechaRegistro
                  )?.toLocaleDateString("es-BO") || ""}

                </option>

              ))}

            </select>

          </label>


          {/* ============================= */}
          {/* SELECCIONAR PRODUCTO */}
          {/* ============================= */}

          <label className="field-block">

            <span>
              Producto *
            </span>

            <select
              value={detalleVentaId}
              onChange={(e) =>
                cambiarDetalle(e.target.value)
              }
              required
              disabled={!ventaId}
            >

              <option value="">
                Seleccionar producto
              </option>


              {detallesVenta.map((detalle) => {

                const devuelto = devoluciones

                  .filter(
                    (dev) =>
                      dev.detalleVentaId === detalle.id &&
                      dev.estado !== "ANULADA"
                  )

                  .reduce(
                    (suma, dev) =>
                      suma + Number(dev.cantidad || 0),
                    0
                  );


                const disponible = Math.max(

                  0,

                  Number(detalle.cantidad || 0) -
                  devuelto
                );


                return (

                  <option
                    key={detalle.id}
                    value={detalle.id}
                    disabled={disponible <= 0}
                  >

                    {detalle.nombreProducto ||
                      detalle.productoId}

                    {" · Disponible "}

                    {mostrarNumero(disponible)}

                    {"/"}

                    {mostrarNumero(detalle.cantidad)}

                  </option>

                );

              })}

            </select>

          </label>


          {/* ============================= */}
          {/* CANTIDAD */}
          {/* ============================= */}

          <label className="field-block">

            <span>

              Cantidad *

              {detalleElegido
                ? ` (máx. ${mostrarNumero(maxCantidad)})`
                : ""}

            </span>


            <input
              type="number"
              min="0.01"
              step="0.01"
              max={maxCantidad || undefined}
              value={cantidad}
              onChange={(e) =>
                setCantidad(e.target.value)
              }
              required
              disabled={!detalleVentaId}
            />

          </label>


          {/* ============================= */}
          {/* RESOLUCION */}
          {/* ============================= */}

          <label className="field-block">

            <span>
              Resolución
            </span>

            <select
              value={resolucion}
              onChange={(e) =>
                setResolucion(e.target.value)
              }
            >

              <option value="REINTEGRO">
                Reintegro
              </option>

              <option value="CAMBIO">
                Cambio de producto
              </option>

              <option value="NOTA_CREDITO">
                Nota de crédito
              </option>

              <option value="GARANTIA">
                Garantía
              </option>

            </select>

          </label>


          {/* ================================= */}
          {/* INFORMACION DE LOTES */}
          {/* ================================= */}

          {detalleElegido &&
            controlaVencimiento && (

            <div
              className="field-block field-span-2"
              style={{

                padding: 16,

                border:
                  "1px solid rgba(155,123,255,.3)",

                borderRadius: 14,

                background:
                  "rgba(112,72,205,.1)"

              }}
            >

              <strong
                style={{

                  display: "flex",

                  alignItems: "center",

                  gap: 8

                }}
              >

                <CalendarDays size={18} />

                Lotes de la venta original

              </strong>


              {lotesUsados.length ? (

                <div
                  style={{

                    display: "grid",

                    gap: 8,

                    marginTop: 12

                  }}
                >

                  {lotesUsados.map(
                    (lote, indice) => {

                      const vencido =
                        typeof lote.fechaVencimiento ===
                          "string" &&

                        lote.fechaVencimiento <
                          fechaActual;


                      return (

                        <div
                          key={`${lote.loteId}-${indice}`}
                          style={{

                            padding: "10px 12px",

                            borderRadius: 10,

                            border:
                              "1px solid rgba(255,255,255,.08)",

                            display: "flex",

                            justifyContent:
                              "space-between",

                            gap: 12,

                            flexWrap: "wrap"

                          }}
                        >

                          <span>

                            <b>
                              {lote.numeroLote ||
                                "Sin número"}
                            </b>

                            {" · "}

                            {mostrarNumero(
                              lote.cantidad
                            )}

                            {" unidad(es)"}

                          </span>


                          <span
                            style={{

                              color: vencido
                                ? "#ff888f"
                                : "#66dfb8"

                            }}
                          >

                            Vence:{" "}

                            {lote.fechaVencimiento ||
                              "Sin fecha"}

                            {vencido
                              ? " · VENCIDO"
                              : ""}

                          </span>

                        </div>

                      );

                    }
                  )}

                </div>

              ) : (

                <p>

                  Esta venta antigua no tiene
                  información de lotes.

                  No se puede reingresar
                  automáticamente.

                </p>

              )}

            </div>

          )}


          {/* ================================= */}
          {/* REINGRESO AL INVENTARIO */}
          {/* ================================= */}

          <label className="field-block">

            <span>
              ¿Reingresa al stock?
            </span>

            <select
              value={
                reingresaStock
                  ? "SI"
                  : "NO"
              }

              onChange={(e) =>
                setReingresaStock(
                  e.target.value === "SI"
                )
              }

              disabled={
                !reingresaStock &&
                !permiteReingreso
              }
            >

              <option value="NO">
                No, se retira o no es vendible
              </option>

              {permiteReingreso && (

                <option value="SI">
                  Sí, revisado y apto para venta
                </option>

              )}

            </select>

          </label>


          <div
            className="field-block"
            style={{

              display: "flex",

              alignItems: "center",

              gap: 8,

              fontSize: 12,

              opacity: 0.88

            }}
          >

            <PackageCheck size={18} />

            El reingreso solo debe elegirse
            si las unidades están en buen estado.

          </div>


          {/* ================================= */}
          {/* ALERTA DE VENCIMIENTO */}
          {/* ================================= */}

          {detalleElegido &&
            !permiteReingreso && (

            <div
              className="field-span-2"
              style={{

                padding: 12,

                borderRadius: 12,

                color: "#ffc783",

                background:
                  "rgba(244,163,75,.1)",

                border:
                  "1px solid rgba(244,163,75,.3)"

              }}
            >

              <AlertTriangle
                size={17}
                style={{

                  verticalAlign: "middle",

                  marginRight: 7

                }}
              />

              Este producto tiene un lote vencido
              o sin trazabilidad.

              Registra la devolución sin
              reingresar al inventario.

            </div>

          )}


          {/* ================================= */}
          {/* MOTIVO */}
          {/* ================================= */}

          <label
            className="field-block field-span-2"
          >

            <span>
              Motivo *
            </span>

            <textarea
              rows="3"
              value={motivo}
              onChange={(e) =>
                setMotivo(e.target.value)
              }
              placeholder={
                "Explica por qué el cliente devuelve el producto"
              }
              required
            />

          </label>


          {/* ================================= */}
          {/* AVISO FINANCIERO */}
          {/* ================================= */}

          <div
            className="field-span-2"
            style={{

              padding: 12,

              borderRadius: 12,

              fontSize: 12,

              background:
                "rgba(112,72,205,.08)",

              border:
                "1px solid rgba(112,72,205,.2)"

            }}
          >

            La resolución registra el tipo
            de devolución.

            No realiza automáticamente un
            reembolso de dinero ni modifica
            caja o cuentas por cobrar.

          </div>


          {/* ================================= */}
          {/* MENSAJES */}
          {/* ================================= */}

          {error && (

            <div className="form-error field-span-2">
              {error}
            </div>

          )}


          {ok && (

            <div className="success-banner field-span-2">
              {ok}
            </div>

          )}


          {/* ================================= */}
          {/* BOTON GUARDAR */}
          {/* ================================= */}

          <div className="modal-actions field-span-2">

            <button
              type="submit"
              className="primary-action"
              disabled={

                saving ||

                loading ||

                !detalleVentaId ||

                maxCantidad <= 0 ||

                Number(cantidad) > maxCantidad
              }
            >

              {saving
                ? "Procesando..."
                : "Registrar devolución"}

            </button>

          </div>

        </form>

      </section>


      {/* ================================= */}
      {/* FILTROS DEL HISTORIAL */}
      {/* ================================= */}

      <AdvancedFilterBar

        search={search}

        onSearch={setSearch}

        searchPlaceholder={
          "Venta, producto, motivo, usuario..."
        }

        filters={[

          {

            key: "resolucion",

            label: "Todas las resoluciones",

            value: resolutionFilter,

            onChange: setResolutionFilter,

            options: [

              {
                value: "REINTEGRO",
                label: "Reintegro"
              },

              {
                value: "CAMBIO",
                label: "Cambio"
              },

              {
                value: "NOTA_CREDITO",
                label: "Nota de crédito"
              },

              {
                value: "GARANTIA",
                label: "Garantía"
              }

            ]

          }

        ]}

        onClear={() => {

          setSearch("");

          setResolutionFilter("TODOS");

        }}
      />


      {/* ================================= */}
      {/* HISTORIAL DE DEVOLUCIONES */}
      {/* ================================= */}

      <section className="data-card glass-3d">

        {loading ? (

          <div className="empty-state">

            Cargando devoluciones...

          </div>

        ) : (

          <div className="table-scroll">

            <table className="modern-table">

              <thead>

                <tr>

                  <th>DEVOLUCIÓN</th>

                  <th>VENTA</th>

                  <th>PRODUCTO</th>

                  <th>CANT.</th>

                  <th>RESOLUCIÓN</th>

                  <th>STOCK</th>

                  <th>LOTES REINTEGRADOS</th>

                  <th>MOTIVO</th>

                  <th>FECHA</th>

                </tr>

              </thead>


              <tbody>

                {filtered.map((row) => (

                  <tr key={row.id}>

                    <td>

                      <code>
                        {row.id.slice(0, 9)}
                      </code>

                    </td>


                    <td>

                      <code>

                        {String(
                          row.ventaId || ""
                        ).slice(0, 9)}

                      </code>

                    </td>


                    <td>

                      {row.productoNombre ||
                        row.productoId}

                    </td>


                    <td>

                      {mostrarNumero(
                        row.cantidad
                      )}

                    </td>


                    <td>
                      {row.resolucion}
                    </td>


                    <td>

                      <span
                        className={
                          `status-pill ${
                            row.reingresaStock
                              ? "active"
                              : "warning"
                          }`
                        }
                      >

                        {row.reingresaStock
                          ? "REINGRESADO"
                          : "NO REINGRESA"}

                      </span>

                    </td>


                    <td>

                      {Array.isArray(
                        row.lotesReintegrados
                      ) &&
                      row.lotesReintegrados.length

                        ? row.lotesReintegrados.map(
                            (lote) =>

                              `${lote.numeroLote ||
                                lote.loteId}: ${mostrarNumero(
                                  lote.cantidad
                                )}`

                          ).join(" · ")

                        : "-"}

                    </td>


                    <td>
                      {row.motivo}
                    </td>


                    <td>

                      {fechaDe(
                        row.fechaRegistro
                      )?.toLocaleString("es-BO") || "-"}

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>


            {!filtered.length && (

              <div className="empty-state">

                <Search size={28} />

                Sin devoluciones para
                los filtros seleccionados.

              </div>

            )}

          </div>

        )}

      </section>

    </div>
  );
}