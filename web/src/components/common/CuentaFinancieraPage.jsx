import { useEffect, useMemo, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";

import {
  HandCoins,
  X,
  Wallet,
  Building2,
  CheckCircle2,
  AlertCircle,
  CreditCard
} from "lucide-react";

import useAuth from "../../hooks/useAuth";

import AdvancedFilterBar from "../filters/AdvancedFilterBar";

import {
  registrarPagoCuenta,
  suscribirCuentas
} from "../../services/financeService";

import {
  suscribirCajas
} from "../../services/cajaService";

import {
  suscribirSucursales
} from "../../services/sucursalService";


// ==========================================
// FORMATEAR DINERO
// ==========================================

const formatoDinero = (valor) => {
  return Number(valor || 0).toFixed(2);
};


// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function CuentaFinancieraPage({ tipo }) {

  const { usuario } = useAuth();

  const isCobrar = tipo === "COBRAR";

  // ========================================
  // DATOS DE FIREBASE
  // ========================================

  const [rows, setRows] = useState([]);

  const [cajas, setCajas] = useState([]);

  const [sucursales, setSucursales] = useState([]);

  const [errorCajas, setErrorCajas] = useState("");

  // ========================================
  // FILTROS
  // ========================================

  const [q, setQ] = useState("");

  const [status, setStatus] = useState("TODOS");

  // ========================================
  // FORMULARIO DE PAGO
  // ========================================

  const [selected, setSelected] = useState(null);

  const [monto, setMonto] = useState("");

  const [metodo, setMetodo] = useState("EFECTIVO");

  const [sucursalId, setSucursalId] = useState("");

  const [cajaId, setCajaId] = useState("");

  const [obs, setObs] = useState("");

  const [error, setError] = useState("");

  const [saving, setSaving] = useState(false);


  // ========================================
  // CONSULTAR CUENTAS
  // ========================================

  useEffect(() => {

    if (!usuario?.empresaId) {
      setRows([]);
      return;
    }

    const cancelar = suscribirCuentas(
      tipo,
      usuario.empresaId,
      setRows,
      console.error
    );

    return () => {
      cancelar();
    };

  }, [tipo, usuario?.empresaId]);


  // ========================================
  // CONSULTAR CAJAS Y SUCURSALES
  // ========================================

  useEffect(() => {

    if (!usuario?.empresaId) {
      setCajas([]);
      setSucursales([]);
      return;
    }

    setErrorCajas("");

    const cancelarCajas = suscribirCajas(

      usuario.empresaId,

      setCajas,

      (err) => {
        console.error(err);

        setErrorCajas(
          "No se pudieron cargar las cajas. Revisa los permisos."
        );
      }

    );

    const cancelarSucursales = suscribirSucursales(

      usuario.empresaId,

      setSucursales,

      (err) => {
        console.error(err);

        setErrorCajas(
          "No se pudieron cargar las sucursales."
        );
      }

    );

    return () => {

      cancelarCajas();

      cancelarSucursales();

    };

  }, [usuario?.empresaId]);


  // ========================================
  // FILTRAR CUENTAS
  // ========================================

  const cuentasFiltradas = useMemo(() => {

    return rows.filter((cuenta) => {

      const texto = q.toLowerCase().trim();

      const coincideBusqueda =
        !texto ||
        JSON.stringify(cuenta)
          .toLowerCase()
          .includes(texto);

      const coincideEstado =
        status === "TODOS" ||
        cuenta.estadoCuenta === status;

      return coincideBusqueda && coincideEstado;

    });

  }, [rows, q, status]);


  // ========================================
  // OBTENER NOMBRE DE SUCURSAL
  // ========================================

  const nombreSucursal = (id) => {

    const sucursal = sucursales.find(
      (s) => s.id === id
    );

    return sucursal?.nombre || "Sucursal";
  };


  // ========================================
  // SUCURSALES DISPONIBLES
  // ========================================

  const sucursalesDisponibles = useMemo(() => {

    return sucursales.filter((sucursal) => {

      const estaActiva =
        sucursal.estado === "ACTIVA";

      if (!estaActiva) return false;

      // SI LA CUENTA PERTENECE A UNA
      // SUCURSAL, NO PERMITIR OTRA.

      if (
        selected?.sucursalId &&
        selected.sucursalId !== sucursal.id
      ) {
        return false;
      }

      return true;

    });

  }, [sucursales, selected]);


  // ========================================
  // CAJAS ABIERTAS DE LA SUCURSAL
  // ========================================

  const cajasDisponibles = useMemo(() => {

    if (!sucursalId) {
      return [];
    }

    return cajas.filter((caja) => {

      return (
        caja.estado === "ABIERTA" &&
        caja.sucursalId === sucursalId
      );

    });

  }, [cajas, sucursalId]);


  // ========================================
  // ABRIR FORMULARIO
  // ========================================

  const abrirPago = (cuenta) => {

    setSelected(cuenta);

    setMonto("");

    setMetodo("EFECTIVO");

    setSucursalId(cuenta.sucursalId || "");

    setCajaId("");

    setObs("");

    setError("");

  };


  // ========================================
  // CERRAR FORMULARIO
  // ========================================

  const cerrarPago = () => {

    if (saving) return;

    setSelected(null);

    setMonto("");

    setMetodo("EFECTIVO");

    setSucursalId("");

    setCajaId("");

    setObs("");

    setError("");

  };


  // ========================================
  // CAMBIAR MÉTODO DE PAGO
  // ========================================

  const cambiarMetodo = (valor) => {

    setMetodo(valor);

    // LAS CAJAS SOLO SE USAN
    // PARA PAGOS EN EFECTIVO.

    if (valor !== "EFECTIVO") {
      setCajaId("");
    }

  };


  // ========================================
  // CAMBIAR SUCURSAL
  // ========================================

  const cambiarSucursal = (valor) => {

    setSucursalId(valor);

    // LIMPIAR LA CAJA CUANDO
    // CAMBIA LA SUCURSAL.

    setCajaId("");

  };


  // ========================================
  // REGISTRAR PAGO
  // ========================================

  const registrarPago = async (e) => {

    e.preventDefault();

    if (!selected || saving) return;

    try {

      setSaving(true);

      setError("");

      const montoNumero = Number(monto);

      const saldoPendiente = Number(
        selected.saldo || 0
      );

      // VALIDAR MONTO

      if (
        !Number.isFinite(montoNumero) ||
        montoNumero <= 0
      ) {
        throw new Error(
          "Ingresa un monto válido mayor a cero."
        );
      }

      if (montoNumero > saldoPendiente) {

        throw new Error(
          "El monto no puede superar el saldo pendiente."
        );

      }

      // ====================================
      // VALIDAR PAGO EN EFECTIVO
      // ====================================

      if (metodo === "EFECTIVO") {

        if (!sucursalId) {

          throw new Error(
            "Debes seleccionar una sucursal."
          );

        }

        if (!cajaId) {

          throw new Error(
            "Debes seleccionar una caja abierta."
          );

        }

        const cajaSeleccionada = cajasDisponibles.find(
          (caja) => caja.id === cajaId
        );

        if (!cajaSeleccionada) {

          throw new Error(
            "La caja seleccionada no está disponible."
          );

        }

      }

      // ====================================
      // GUARDAR PAGO EN FIREBASE
      // ====================================

      await registrarPagoCuenta({

        tipo,

        cuentaId: selected.id,

        empresaId: usuario.empresaId,

        monto: montoNumero,

        metodoPago: metodo,

        observacion: obs,

        usuarioId: usuario.uid,

        // SOLO ENVIAMOS CAJA
        // CUANDO EL PAGO ES EFECTIVO.

        cajaId: metodo === "EFECTIVO"
          ? cajaId
          : ""

      });

      cerrarFormularioDespuesDeGuardar();

    } catch (err) {

      console.error(err);

      setError(
        err.message || "No se pudo registrar el pago."
      );

    } finally {

      setSaving(false);

    }

  };


  // ========================================
  // LIMPIAR FORMULARIO AL GUARDAR
  // ========================================

  const cerrarFormularioDespuesDeGuardar = () => {

    setSelected(null);

    setMonto("");

    setMetodo("EFECTIVO");

    setSucursalId("");

    setCajaId("");

    setObs("");

    setError("");

  };


  // ========================================
  // DATOS DE LA CUENTA SELECCIONADA
  // ========================================

  const saldoActual = Number(
    selected?.saldo || 0
  );

  const montoIngresado = Number(monto || 0);

  const saldoDespuesDelPago = Math.max(
    0,
    saldoActual - montoIngresado
  );


  // ========================================
  // INTERFAZ PRINCIPAL
  // ========================================

  return (

    <div className="module-page">

      {/* ================================= */}
      {/* ENCABEZADO */}
      {/* ================================= */}

      <div className="module-page-header">

        <div>

          <span className="eyebrow">
            FINANZAS
          </span>

          <h1>
            {isCobrar
              ? "Cuentas por cobrar"
              : "Cuentas por pagar"}
          </h1>

          <p>
            {isCobrar
              ? "Ventas a crédito, saldos de clientes y pagos recibidos."
              : "Obligaciones con proveedores y pagos realizados."}
          </p>

        </div>

      </div>


      {/* ================================= */}
      {/* FILTROS */}
      {/* ================================= */}

      <AdvancedFilterBar

        search={q}

        onSearch={setQ}

        filters={[

          {

            key: "estado",

            label: "Todos los estados",

            value: status,

            onChange: setStatus,

            options: [

              {
                value: "PENDIENTE",
                label: "Pendiente"
              },

              {
                value: "PARCIAL",
                label: "Parcial"
              },

              {
                value: "PAGADA",
                label: "Pagada"
              }

            ]

          }

        ]}

        onClear={() => {

          setQ("");

          setStatus("TODOS");

        }}

      />


      {/* ================================= */}
      {/* TABLA */}
      {/* ================================= */}

      <section className="data-card glass-3d">

        <div className="table-scroll">

          <table className="modern-table">

            <thead>

              <tr>

                <th>
                  {isCobrar ? "CLIENTE" : "PROVEEDOR"}
                </th>

                <th>REFERENCIA</th>

                <th>TOTAL</th>

                <th>SALDO</th>

                <th>ESTADO</th>

                <th>ACCIÓN</th>

              </tr>

            </thead>

            <tbody>

              {cuentasFiltradas.map((cuenta) => (

                <tr key={cuenta.id}>

                  <td>

                    {isCobrar
                      ? (
                          cuenta.clienteNombre ||
                          cuenta.clienteId ||
                          "-"
                        )
                      : (
                          cuenta.proveedorNombre ||
                          cuenta.proveedorId ||
                          "-"
                        )}

                  </td>

                  <td>

                    {cuenta.referencia ||
                      cuenta.ventaId ||
                      cuenta.compraId ||
                      "-"}

                  </td>

                  <td>

                    Bs {formatoDinero(cuenta.total)}

                  </td>

                  <td>

                    <strong>

                      Bs {formatoDinero(cuenta.saldo)}

                    </strong>

                  </td>

                  <td>

                    <span
                      className={`
                        status-pill
                        ${
                          cuenta.estadoCuenta === "PAGADA"
                            ? "active"
                            : cuenta.estadoCuenta === "PARCIAL"
                              ? "warning"
                              : "inactive"
                        }
                      `}
                    >

                      {cuenta.estadoCuenta || "PENDIENTE"}

                    </span>

                  </td>

                  <td>

                    {cuenta.estadoCuenta !== "PAGADA" && (

                      <button

                        className="primary-action mini"

                        onClick={() => abrirPago(cuenta)}

                      >

                        <HandCoins size={15} />

                        Registrar pago

                      </button>

                    )}

                  </td>

                </tr>

              ))}

            </tbody>

          </table>


          {/* SIN REGISTROS */}

          {!cuentasFiltradas.length && (

            <div className="empty-state">

              Sin cuentas con esos filtros.

            </div>

          )}

        </div>

      </section>


      {/* ================================= */}
      {/* MODAL DE REGISTRAR PAGO */}
      {/* ================================= */}

      <AnimatePresence>

        {selected && (

          <motion.div

            className="modal-backdrop"

            initial={{ opacity: 0 }}

            animate={{ opacity: 1 }}

            exit={{ opacity: 0 }}

            onMouseDown={cerrarPago}

          >

            <motion.div

              className="modal-card glass-3d"

              initial={{
                opacity: 0,
                scale: 0.95,
                y: 20
              }}

              animate={{
                opacity: 1,
                scale: 1,
                y: 0
              }}

              exit={{
                opacity: 0,
                scale: 0.95,
                y: 20
              }}

              onMouseDown={(e) => e.stopPropagation()}

              style={{
                maxWidth: "720px",
                width: "calc(100% - 32px)",
                maxHeight: "90vh",
                overflowY: "auto"
              }}

            >

              {/* ENCABEZADO */}

              <div className="modal-head">

                <div>

                  <span className="eyebrow">
                    GESTIÓN FINANCIERA
                  </span>

                  <h2>

                    {isCobrar
                      ? "Registrar cobro"
                      : "Registrar pago"}

                  </h2>

                  <p style={{
                    marginTop: "8px",
                    color: "#9696b5",
                    fontSize: "13px"
                  }}>

                    {isCobrar
                      ? "Registra el dinero recibido de tu cliente."
                      : "Registra el pago realizado a tu proveedor."}

                  </p>

                </div>

                <button
                  type="button"
                  onClick={cerrarPago}
                  disabled={saving}
                >

                  <X size={18} />

                </button>

              </div>


              {/* ================================= */}
              {/* RESUMEN DE DEUDA */}
              {/* ================================= */}

              <div

                style={{

                  display: "grid",

                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(170px, 1fr))",

                  gap: "12px",

                  marginBottom: "24px"

                }}

              >

                <div

                  style={{

                    padding: "18px",

                    borderRadius: "14px",

                    background: "rgba(130, 90, 255, 0.08)",

                    border:
                      "1px solid rgba(150, 110, 255, 0.18)"

                  }}

                >

                  <span

                    style={{

                      display: "block",

                      color: "#9999b8",

                      fontSize: "12px",

                      marginBottom: "8px"

                    }}

                  >

                    Saldo pendiente

                  </span>

                  <strong

                    style={{

                      fontSize: "23px",

                      color: "#ffffff"

                    }}

                  >

                    Bs {formatoDinero(saldoActual)}

                  </strong>

                </div>


                <div

                  style={{

                    padding: "18px",

                    borderRadius: "14px",

                    background: "rgba(60, 190, 160, 0.06)",

                    border:
                      "1px solid rgba(60, 190, 160, 0.18)"

                  }}

                >

                  <span

                    style={{

                      display: "block",

                      color: "#9999b8",

                      fontSize: "12px",

                      marginBottom: "8px"

                    }}

                  >

                    Saldo después del pago

                  </span>

                  <strong

                    style={{

                      fontSize: "23px",

                      color: "#54e3c3"

                    }}

                  >

                    Bs {formatoDinero(saldoDespuesDelPago)}

                  </strong>

                </div>

              </div>


              {/* ================================= */}
              {/* FORMULARIO */}
              {/* ================================= */}

              <form

                className="smart-form"

                onSubmit={registrarPago}

              >

                {/* MONTO */}

                <label className="field-block">

                  <span>
                    Monto a pagar *
                  </span>

                  <input

                    type="number"

                    min="0.01"

                    step="0.01"

                    max={saldoActual}

                    value={monto}

                    required

                    placeholder="0.00"

                    onChange={(e) =>
                      setMonto(e.target.value)
                    }

                  />

                </label>


                {/* MÉTODO */}

                <label className="field-block">

                  <span>
                    Método de pago *
                  </span>

                  <select

                    value={metodo}

                    onChange={(e) =>
                      cambiarMetodo(e.target.value)
                    }

                  >

                    <option value="EFECTIVO">
                      Efectivo
                    </option>

                    <option value="QR">
                      QR
                    </option>

                    <option value="TRANSFERENCIA">
                      Transferencia
                    </option>

                    <option value="TARJETA">
                      Tarjeta
                    </option>

                  </select>

                </label>


                {/* ================================= */}
                {/* SUCURSAL Y CAJA */}
                {/* ================================= */}

                {metodo === "EFECTIVO" && (

                  <>

                    {/* SUCURSAL */}

                    <label className="field-block">

                      <span>

                        <Building2
                          size={15}
                          style={{
                            marginRight: "6px",
                            verticalAlign: "middle"
                          }}
                        />

                        Sucursal *

                      </span>

                      <select

                        value={sucursalId}

                        required

                        onChange={(e) =>
                          cambiarSucursal(e.target.value)
                        }

                      >

                        <option value="">
                          Seleccionar sucursal
                        </option>

                        {sucursalesDisponibles.map(
                          (sucursal) => (

                            <option
                              key={sucursal.id}
                              value={sucursal.id}
                            >

                              {sucursal.nombre}

                            </option>

                          )
                        )}

                      </select>

                    </label>


                    {/* CAJA */}

                    <label className="field-block">

                      <span>

                        <Wallet
                          size={15}
                          style={{
                            marginRight: "6px",
                            verticalAlign: "middle"
                          }}
                        />

                        Caja abierta *

                      </span>

                      <select

                        value={cajaId}

                        required

                        disabled={!sucursalId}

                        onChange={(e) =>
                          setCajaId(e.target.value)
                        }

                      >

                        <option value="">
                          Seleccionar caja
                        </option>

                        {cajasDisponibles.map((caja) => (

                          <option
                            key={caja.id}
                            value={caja.id}
                          >

                            {caja.nombre} - {nombreSucursal(caja.sucursalId)}

                          </option>

                        ))}

                      </select>

                    </label>


                    {/* MENSAJE SIN CAJA */}

                    {sucursalId &&
                      cajasDisponibles.length === 0 && (

                        <div

                          className="field-span-2"

                          style={{

                            display: "flex",

                            alignItems: "center",

                            gap: "10px",

                            padding: "14px",

                            borderRadius: "12px",

                            background:
                              "rgba(255, 180, 60, 0.08)",

                            border:
                              "1px solid rgba(255, 180, 60, 0.20)",

                            color: "#ffc978",

                            fontSize: "13px"

                          }}

                        >

                          <AlertCircle size={18} />

                          No hay cajas abiertas en esta sucursal.
                          Primero debes abrir una caja.

                        </div>

                      )}

                  </>

                )}


                {/* ================================= */}
                {/* AVISO SEGÚN MÉTODO */}
                {/* ================================= */}

                <div

                  className="field-span-2"

                  style={{

                    display: "flex",

                    alignItems: "center",

                    gap: "10px",

                    padding: "13px 15px",

                    borderRadius: "12px",

                    background:
                      "rgba(110, 90, 255, 0.07)",

                    border:
                      "1px solid rgba(140, 120, 255, 0.15)",

                    color: "#b6b1d7",

                    fontSize: "13px"

                  }}

                >

                  {metodo === "EFECTIVO" ? (

                    <>

                      <Wallet size={18} />

                      El pago se registrará como movimiento
                      de efectivo en la caja seleccionada.

                    </>

                  ) : (

                    <>

                      <CreditCard size={18} />

                      El pago se registrará con este método,
                      sin modificar la caja de efectivo.

                    </>

                  )}

                </div>


                {/* OBSERVACIÓN */}

                <label
                  className="field-block field-span-2"
                >

                  <span>
                    Observación
                  </span>

                  <textarea

                    rows="3"

                    value={obs}

                    placeholder="Escribe una observación opcional..."

                    onChange={(e) =>
                      setObs(e.target.value)
                    }

                  />

                </label>


                {/* ================================= */}
                {/* ERROR */}
                {/* ================================= */}

                {error && (

                  <div
                    className="form-error field-span-2"
                  >

                    <AlertCircle
                      size={16}
                      style={{
                        marginRight: "8px",
                        verticalAlign: "middle"
                      }}
                    />

                    {error}

                  </div>

                )}


                {errorCajas && metodo === "EFECTIVO" && (

                  <div
                    className="form-error field-span-2"
                  >

                    {errorCajas}

                  </div>

                )}


                {/* ================================= */}
                {/* BOTONES */}
                {/* ================================= */}

                <div
                  className="modal-actions field-span-2"
                >

                  <button

                    type="button"

                    className="secondary-action"

                    onClick={cerrarPago}

                    disabled={saving}

                  >

                    Cancelar

                  </button>


                  <button

                    type="submit"

                    className="primary-action"

                    disabled={
                      saving ||
                      montoIngresado <= 0 ||
                      montoIngresado > saldoActual ||
                      (
                        metodo === "EFECTIVO" &&
                        (
                          !sucursalId ||
                          !cajaId
                        )
                      )
                    }

                  >

                    {saving ? (

                      "Registrando..."

                    ) : (

                      <>

                        <CheckCircle2 size={17} />

                        Confirmar pago

                      </>

                    )}

                  </button>

                </div>

              </form>

            </motion.div>

          </motion.div>

        )}

      </AnimatePresence>

    </div>

  );

}