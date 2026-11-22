import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Check, ChevronDown, CircleCheck, HandCoins, Info, Search, Users, Wallet, X } from "lucide-react";

import useAuth from "../../hooks/useAuth";
import { db } from "../../services/firebase/firebaseConfig";
import { registrarPagoCuenta, suscribirCuentas } from "../../services/financeService";
import { obtenerSaldoCaja, suscribirCajas } from "../../services/cajaService";
import { suscribirSucursales } from "../../services/sucursalService";
import { sonidoCaja, sonidoClick, sonidoError } from "../../utils/sonidos";

import "../../styles/roles-empresa.css";
import "../../styles/trabajadores-empresa.css";
import "../../styles/inventario-empresa.css";
import "../../styles/compras-empresa.css";
import "../../styles/cajas-empresa.css";

const METODOS = {
  EFECTIVO: "Efectivo",
  QR: "QR",
  TRANSFERENCIA: "Transferencia",
  TARJETA: "Tarjeta"
};

const FILTROS = [
  ["TODAS", "Todas"],
  ["PENDIENTE", "Sin pagar"],
  ["PARCIAL", "Pago parcial"],
  ["PAGADA", "Pagadas"]
];

const ETIQUETA_ESTADO = { PENDIENTE: "Sin pagar", PARCIAL: "Pago parcial", PAGADA: "Pagada" };

const normalizar = (valor) =>
  String(valor ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

const dinero = (valor) => {
  const n = Number(valor || 0);
  return `${n < 0 ? "−" : ""}Bs ${Math.abs(n).toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const fechaDe = (valor) => {
  const fecha = valor?.toDate?.() || null;
  return fecha && !Number.isNaN(fecha.getTime()) ? fecha : null;
};

const corto = (texto) => (texto ? `#${String(texto).slice(0, 6)}` : "");

const sinSignos = (e) => {
  if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
};

const leer = (nombre, empresaId) =>
  getDocs(query(collection(db, nombre), where("empresaId", "==", empresaId))).then((r) =>
    r.docs.map((d) => ({ id: d.id, ...d.data() }))
  );

export default function CuentaFinancieraPage({ tipo }) {
  const { usuario } = useAuth();
  const empresaId = usuario?.empresaId;
  const esCobrar = tipo === "COBRAR";

  const [cuentas, setCuentas] = useState([]);
  const [cajas, setCajas] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [nombres, setNombres] = useState({ clientes: new Map(), ventas: new Map(), proveedores: new Map() });
  const [cargando, setCargando] = useState(true);

  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("TODAS");

  const [elegida, setElegida] = useState(null);
  const [monto, setMonto] = useState("");
  const [metodo, setMetodo] = useState("EFECTIVO");
  const [sucursalId, setSucursalId] = useState("");
  const [cajaId, setCajaId] = useState("");
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [saldoCaja, setSaldoCaja] = useState(null);

  useEffect(() => {
    if (!empresaId) return undefined;

    setCargando(true);

    const cancelarCuentas = suscribirCuentas(
      tipo,
      empresaId,
      (datos) => {
        setCuentas(datos);
        setCargando(false);
      },
      (e) => {
        console.error(e);
        setCargando(false);
      }
    );

    const cancelarCajas = suscribirCajas(empresaId, setCajas, console.error);
    const cancelarSucursales = suscribirSucursales(empresaId, setSucursales, console.error);

    // Los nombres de clientes y proveedores se leen aparte; si algo falla, se muestran sin nombre
    const nombreDe = (promesa) => promesa.catch(() => []);

    Promise.all(
      esCobrar
        ? [nombreDe(leer("clientes", empresaId)), nombreDe(leer("ventas", empresaId)), Promise.resolve([])]
        : [Promise.resolve([]), Promise.resolve([]), nombreDe(leer("proveedores", empresaId))]
    ).then(([clientes, ventas, proveedores]) =>
      setNombres({
        clientes: new Map(clientes.map((c) => [c.id, c])),
        ventas: new Map(ventas.map((v) => [v.id, v])),
        proveedores: new Map(proveedores.map((p) => [p.id, p]))
      })
    );

    return () => {
      cancelarCuentas?.();
      cancelarCajas?.();
      cancelarSucursales?.();
    };
  }, [tipo, empresaId, esCobrar]);

  const quien = (cuenta) => {
    if (esCobrar) {
      return (
        cuenta.clienteNombre ||
        nombres.clientes.get(cuenta.clienteId)?.nombre ||
        nombres.ventas.get(cuenta.ventaId)?.clienteNombre ||
        "Cliente sin nombre"
      );
    }
    return cuenta.proveedorNombre || nombres.proveedores.get(cuenta.proveedorId)?.nombre || "Proveedor";
  };

  const referencia = (cuenta) => {
    if (cuenta.referencia && String(cuenta.referencia).length < 20) return cuenta.referencia;
    if (cuenta.ventaId) return `Venta ${corto(cuenta.ventaId)}`;
    if (cuenta.compraId) return `Compra ${corto(cuenta.compraId)}`;
    return "—";
  };

  const nombreSucursal = (id) => sucursales.find((s) => s.id === id)?.nombre || "";
  const estadoDe = (c) => c.estadoCuenta || "PENDIENTE";

  const pendientes = cuentas.filter((c) => estadoDe(c) !== "PAGADA");
  const totalSaldo = pendientes.reduce((suma, c) => suma + Number(c.saldo || 0), 0);
  const saldadas = cuentas.length - pendientes.length;

  const visibles = cuentas.filter((c) => {
    if (filtro !== "TODAS" && estadoDe(c) !== filtro) return false;
    const texto = normalizar(busqueda);
    return !texto || normalizar(quien(c)).includes(texto) || normalizar(referencia(c)).includes(texto);
  });

  const cajasAbiertas = cajas.filter((c) => c.estado === "ABIERTA");
  const sucursalesConCaja = sucursales.filter(
    (s) => cajasAbiertas.some((c) => c.sucursalId === s.id) && (!elegida?.sucursalId || elegida.sucursalId === s.id)
  );
  const sucursalEfectiva = sucursalId || (sucursalesConCaja.length === 1 ? sucursalesConCaja[0].id : "");
  const cajasSucursal = cajasAbiertas.filter((c) => c.sucursalId === sucursalEfectiva);
  const cajaEfectiva = cajaId || (cajasSucursal.length === 1 ? cajasSucursal[0].id : "");
  const cajaElegida = cajasAbiertas.find((c) => c.id === cajaEfectiva) || null;

  const esEfectivo = metodo === "EFECTIVO";
  const saldoPendiente = Number(elegida?.saldo || 0);
  const montoNumero = Number(monto);
  const despues = Math.max(0, saldoPendiente - (Number.isFinite(montoNumero) ? montoNumero : 0));

  // Para pagar a un proveedor en efectivo, la caja debe tener ese dinero
  useEffect(() => {
    let activo = true;

    if (!elegida || esCobrar || !esEfectivo || !cajaElegida) {
      return undefined;
    }

    obtenerSaldoCaja(cajaElegida)
      .then((saldo) => activo && setSaldoCaja(saldo))
      .catch(() => activo && setSaldoCaja(null));

    return () => {
      activo = false;
    };
  }, [elegida, esCobrar, esEfectivo, cajaElegida]);

  const superaCaja = !esCobrar && esEfectivo && cajaElegida && saldoCaja !== null && montoNumero > saldoCaja;

  function abrirPago(cuenta) {
    setElegida(cuenta);
    setMonto("");
    setMetodo("EFECTIVO");
    setSucursalId(cuenta.sucursalId || "");
    setCajaId("");
    setNota("");
    setError("");
    setSaldoCaja(null);
    setAviso("");
    sonidoClick();
  }

  async function pagar(evento) {
    evento.preventDefault();
    if (guardando || !elegida) return;

    const fallar = (texto) => {
      setError(texto);
      sonidoError();
    };

    if (monto === "" || !Number.isFinite(montoNumero) || montoNumero <= 0) return fallar("Escribe cuánto se paga.");
    if (Math.round(montoNumero * 100) / 100 !== montoNumero) return fallar("El monto admite hasta dos decimales.");
    if (montoNumero > saldoPendiente) return fallar(`No puede ser más de lo que falta: ${dinero(saldoPendiente)}.`);

    if (esEfectivo) {
      if (!sucursalEfectiva) return fallar("Elige la sucursal.");
      if (!cajaEfectiva) return fallar("Elige la caja abierta donde entra o sale el dinero.");
      if (superaCaja) return fallar(`En la caja solo hay ${dinero(saldoCaja)}. Paga con otro método o abre más dinero en caja.`);
    }

    setGuardando(true);
    setError("");

    try {
      await registrarPagoCuenta({
        tipo,
        cuentaId: elegida.id,
        empresaId,
        monto: montoNumero,
        metodoPago: metodo,
        observacion: nota,
        usuarioId: usuario.uid,
        cajaId: esEfectivo ? cajaEfectiva : ""
      });

      sonidoCaja();
      setAviso(
        montoNumero === saldoPendiente
          ? `Listo: la cuenta de ${quien(elegida)} quedó saldada.`
          : `${esCobrar ? "Cobro" : "Pago"} registrado. Aún faltan ${dinero(saldoPendiente - montoNumero)}.`
      );
      setElegida(null);
    } catch (e) {
      console.error(e);
      fallar(e.message || "No pudimos registrar el movimiento. Inténtalo otra vez.");
    } finally {
      setGuardando(false);
    }
  }

  const verbo = esCobrar ? "cobro" : "pago";

  return (
    <div className="re inv">
      <header className="re-cabecera">
        <div>
          <h1>{esCobrar ? "Cuentas por cobrar" : "Cuentas por pagar"}</h1>
          <p>
            {esCobrar
              ? "Lo que tus clientes te deben por ventas a crédito. Registra cada cobro cuando te paguen."
              : "Lo que debes a tus proveedores por compras a crédito. Registra cada pago cuando lo hagas."}
          </p>
        </div>
      </header>

      <section className="inv-metricas inv-metricas--tres co-metricas" aria-label="Resumen">
        <article className="inv-metrica" data-tono={totalSaldo > 0 ? "alerta" : undefined}>
          <span className="inv-metrica__icono" aria-hidden="true">
            <Wallet size={22} />
          </span>
          <div>
            <small>{esCobrar ? "Te deben" : "Debes"}</small>
            <strong>{dinero(totalSaldo)}</strong>
            <em>en total</em>
          </div>
        </article>
        <article className="inv-metrica">
          <span className="inv-metrica__icono" aria-hidden="true">
            <Users size={22} />
          </span>
          <div>
            <small>Cuentas abiertas</small>
            <strong>{pendientes.length}</strong>
            <em>{esCobrar ? "clientes por cobrar" : "proveedores por pagar"}</em>
          </div>
        </article>
        <article className="inv-metrica">
          <span className="inv-metrica__icono" aria-hidden="true">
            <CircleCheck size={22} />
          </span>
          <div>
            <small>{esCobrar ? "Ya cobradas" : "Ya pagadas"}</small>
            <strong>{saldadas}</strong>
            <em>saldadas</em>
          </div>
        </article>
      </section>

      <div className="re-herramientas">
        <label className="re-busqueda">
          <Search size={19} aria-hidden="true" />
          <input
            type="search"
            placeholder={esCobrar ? "Buscar cliente…" : "Buscar proveedor…"}
            aria-label="Buscar cuentas"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </label>

        <div className="re-filtros" role="radiogroup" aria-label="Estado">
          {FILTROS.map(([valor, texto]) => (
            <button
              key={valor}
              type="button"
              role="radio"
              aria-checked={filtro === valor}
              className="re-chip"
              data-activo={filtro === valor}
              onClick={() => setFiltro(valor)}
            >
              {texto}
            </button>
          ))}
        </div>
      </div>

      {aviso && (
        <div className="re-aviso re-aviso--ok" role="status">
          <Check size={18} />
          <span>{aviso}</span>
        </div>
      )}

      {cargando ? (
        <div className="re-vacio">Cargando cuentas…</div>
      ) : visibles.length === 0 ? (
        <div className="re-vacio">
          <HandCoins size={34} />
          <strong>{cuentas.length === 0 ? "No hay cuentas por el momento" : "No encontramos cuentas"}</strong>
          <span>
            {cuentas.length === 0
              ? esCobrar
                ? "Aquí aparecerán las ventas que dejes a crédito."
                : "Aquí aparecerán las compras que hagas a crédito. Elige «A crédito» al registrar una compra."
              : "Prueba con otra búsqueda o cambia el filtro."}
          </span>
        </div>
      ) : (
        <section className="inv-bloque">
          <div className="inv-tabla-caja">
            <table className="inv-tabla">
              <thead>
                <tr>
                  <th>{esCobrar ? "Cliente" : "Proveedor"}</th>
                  <th>De qué</th>
                  <th>Fecha</th>
                  <th className="inv-der">Total</th>
                  <th className="inv-der">Falta</th>
                  <th>Estado</th>
                  <th className="inv-der">Acción</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((cuenta) => {
                  const estado = estadoDe(cuenta);
                  const fecha = fechaDe(cuenta.fechaRegistro);

                  return (
                    <tr key={cuenta.id}>
                      <td data-label={esCobrar ? "Cliente" : "Proveedor"}>
                        <strong>{quien(cuenta)}</strong>
                      </td>
                      <td data-label="De qué">{referencia(cuenta)}</td>
                      <td data-label="Fecha">{fecha ? fecha.toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</td>
                      <td data-label="Total" className="inv-der">
                        {dinero(cuenta.total)}
                      </td>
                      <td data-label="Falta" className="inv-der">
                        <strong data-bajo={estado !== "PAGADA" ? "true" : undefined}>{dinero(cuenta.saldo)}</strong>
                      </td>
                      <td data-label="Estado">
                        <span className="inv-pastilla" data-estado={estado === "PAGADA" ? "VIGENTE" : estado === "PARCIAL" ? "POR_VENCER" : "VENCIDO"}>
                          {ETIQUETA_ESTADO[estado] || estado}
                        </span>
                      </td>
                      <td data-label="Acción" className="inv-der">
                        {estado !== "PAGADA" ? (
                          <button type="button" className="re-boton re-boton--chico" onClick={() => abrirPago(cuenta)}>
                            <HandCoins size={15} />
                            {esCobrar ? "Registrar cobro" : "Registrar pago"}
                          </button>
                        ) : (
                          <span className="inv-sin">Saldada</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <AnimatePresence>
        {elegida && (
          <motion.div className="re-fondo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => !guardando && setElegida(null)}>
            <motion.form
              className="re-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="cf-titulo"
              initial={{ opacity: 0, scale: 0.96, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              onMouseDown={(e) => e.stopPropagation()}
              onSubmit={pagar}
              noValidate
            >
              <header className="re-modal__cabecera">
                <div>
                  <h2 id="cf-titulo">{esCobrar ? "Registrar cobro" : "Registrar pago"}</h2>
                  <p>
                    {esCobrar ? "Dinero recibido de" : "Dinero entregado a"} <b>{quien(elegida)}</b>
                  </p>
                </div>
                <button type="button" className="re-cerrar" onClick={() => setElegida(null)} aria-label="Cerrar" disabled={guardando}>
                  <X size={18} />
                </button>
              </header>

              <div className="re-modal__cuerpo">
                <div className="co-detalle-resumen">
                  <div>
                    <small>Falta {esCobrar ? "cobrar" : "pagar"}</small>
                    <strong>{dinero(saldoPendiente)}</strong>
                  </div>
                  <div>
                    <small>Después quedará</small>
                    <strong className={despues === 0 ? "cj-entra" : undefined}>{dinero(despues)}</strong>
                  </div>
                </div>

                <label className="re-campo">
                  <span className="re-etiqueta-campo">
                    ¿Cuánto {esCobrar ? "te pagan" : "pagas"}? (Bs) <b>*</b>
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={monto}
                    onKeyDown={sinSignos}
                    onChange={(e) => {
                      setMonto(e.target.value);
                      setError("");
                    }}
                    placeholder="0.00"
                    autoFocus
                  />
                  <span className="co-atajos">
                    <button
                      type="button"
                      className="re-chip"
                      onClick={() => {
                        setMonto(String(saldoPendiente));
                        sonidoClick();
                      }}
                    >
                      Todo: {dinero(saldoPendiente)}
                    </button>
                  </span>
                </label>

                <div className="re-campo">
                  <span className="re-etiqueta-campo">¿Cómo {esCobrar ? "te pagaron" : "pagas"}?</span>
                  <div className="co-pagos" role="radiogroup" aria-label="Forma de pago">
                    {Object.entries(METODOS).map(([valor, texto]) => (
                      <button
                        key={valor}
                        type="button"
                        role="radio"
                        aria-checked={metodo === valor}
                        className="co-pago"
                        data-activo={metodo === valor}
                        onClick={() => {
                          setMetodo(valor);
                          setCajaId("");
                          sonidoClick();
                        }}
                      >
                        <span>{texto}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {esEfectivo &&
                  (cajasAbiertas.length === 0 ? (
                    <div className="re-aviso re-aviso--error" role="status">
                      <Info size={18} />
                      <span>
                        No hay una caja abierta. <Link to="/ventas/cajas">Abre la caja</Link> o usa otro método.
                      </span>
                    </div>
                  ) : (
                    <>
                      {!elegida.sucursalId && sucursalesConCaja.length > 1 && (
                        <label className="re-campo">
                          <span className="re-etiqueta-campo">
                            Sucursal <b>*</b>
                          </span>
                          <span className="tr-selector tr-selector--formulario">
                            <select
                              value={sucursalId}
                              onChange={(e) => {
                                setSucursalId(e.target.value);
                                setCajaId("");
                              }}
                            >
                              <option value="">Elige la sucursal</option>
                              {sucursalesConCaja.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.nombre}
                                </option>
                              ))}
                            </select>
                            <ChevronDown size={17} aria-hidden="true" />
                          </span>
                        </label>
                      )}

                      {sucursalEfectiva && cajasSucursal.length === 0 && (
                        <div className="re-aviso re-aviso--error" role="status">
                          <Info size={18} />
                          <span>
                            {nombreSucursal(sucursalEfectiva) || "Esa sucursal"} no tiene caja abierta. <Link to="/ventas/cajas">Abre la caja</Link>.
                          </span>
                        </div>
                      )}

                      {cajasSucursal.length > 1 && (
                        <label className="re-campo">
                          <span className="re-etiqueta-campo">
                            Caja <b>*</b>
                          </span>
                          <span className="tr-selector tr-selector--formulario">
                            <select value={cajaEfectiva} onChange={(e) => setCajaId(e.target.value)}>
                              <option value="">Elige la caja</option>
                              {cajasSucursal.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.nombre}
                                </option>
                              ))}
                            </select>
                            <ChevronDown size={17} aria-hidden="true" />
                          </span>
                        </label>
                      )}

                      {cajaElegida && (
                        <p className="co-nota">
                          <Check size={16} />
                          <span>
                            {esCobrar ? "Entrará en" : "Saldrá de"} <b>{cajaElegida.nombre}</b>
                            {!esCobrar && saldoCaja !== null ? (
                              <>
                                , donde hay <b>{dinero(saldoCaja)}</b>.
                              </>
                            ) : (
                              "."
                            )}
                          </span>
                        </p>
                      )}

                      {superaCaja && (
                        <div className="re-aviso re-aviso--error" role="status">
                          Estás pagando más de lo que hay en la caja.
                        </div>
                      )}
                    </>
                  ))}

                <label className="re-campo">
                  <span className="re-etiqueta-campo">Nota (opcional)</span>
                  <textarea
                    className="inv-texto"
                    rows="2"
                    maxLength={200}
                    value={nota}
                    onChange={(e) => setNota(e.target.value)}
                    placeholder={`Ej. ${verbo} de la primera cuota`}
                  />
                </label>

                {error && (
                  <div className="re-aviso re-aviso--error" role="alert">
                    {error}
                  </div>
                )}
              </div>

              <footer className="re-modal__pie">
                <button type="button" className="re-boton re-boton--suave" onClick={() => setElegida(null)} disabled={guardando}>
                  Cancelar
                </button>
                <button type="submit" className="re-boton" disabled={guardando}>
                  {guardando ? "Guardando…" : esCobrar ? "Registrar cobro" : "Registrar pago"}
                </button>
              </footer>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
