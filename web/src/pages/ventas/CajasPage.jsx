import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, ChevronDown, Info, Lock, LockKeyhole, Plus, Store, Wallet, X } from "lucide-react";

import useAuth from "../../hooks/useAuth";
import { db } from "../../services/firebase/firebaseConfig";
import { suscribirSucursales } from "../../services/sucursalService";
import { abrirCaja, cerrarCaja, resumirCaja, suscribirCajas } from "../../services/cajaService";
import { sonidoCaja, sonidoClick, sonidoError } from "../../utils/sonidos";

import "../../styles/roles-empresa.css";
import "../../styles/trabajadores-empresa.css";
import "../../styles/inventario-empresa.css";
import "../../styles/compras-empresa.css";
import "../../styles/cajas-empresa.css";

const dinero = (valor) => {
  const n = Number(valor || 0);
  return `${n < 0 ? "−" : ""}Bs ${Math.abs(n).toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const fechaDe = (valor) => {
  const fecha = valor?.toDate?.() || null;
  return fecha && !Number.isNaN(fecha.getTime()) ? fecha : null;
};

const formatoFecha = (fecha) =>
  fecha ? fecha.toLocaleString("es-BO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

const limpiarNombre = (v) =>
  String(v ?? "")
    .replace(/[^\p{L}\p{N}\s.'-]/gu, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^\s+/, "")
    .slice(0, 40);

const sinSignos = (e) => {
  if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
};

const INICIAL = { sucursalId: "", nombre: "Caja principal", saldoInicial: "0" };

export default function CajasPage() {
  const { usuario } = useAuth();
  const empresaId = usuario?.empresaId;

  const [cajas, setCajas] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [abrir, setAbrir] = useState(false);
  const [formulario, setFormulario] = useState(INICIAL);
  const [errorAbrir, setErrorAbrir] = useState("");

  const [aCerrar, setACerrar] = useState(null);
  const [contado, setContado] = useState("");
  const [errorCerrar, setErrorCerrar] = useState("");

  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    if (!empresaId) return undefined;

    const cancelarCajas = suscribirCajas(
      empresaId,
      (datos) => {
        setCajas(datos);
        setCargando(false);
      },
      (error) => {
        console.error(error);
        setCargando(false);
      }
    );

    const cancelarSucursales = suscribirSucursales(empresaId, setSucursales, console.error);

    const cancelarMovimientos = onSnapshot(
      query(collection(db, "movimientosCaja"), where("empresaId", "==", empresaId)),
      (snapshot) => setMovimientos(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
      console.error
    );

    return () => {
      cancelarCajas?.();
      cancelarSucursales?.();
      cancelarMovimientos?.();
    };
  }, [empresaId]);

  const nombreSucursal = (id) => sucursales.find((s) => s.id === id)?.nombre || "Sucursal";

  const resumenes = useMemo(() => {
    const porCaja = new Map();
    movimientos.forEach((m) => {
      if (!m.cajaId) return;
      if (!porCaja.has(m.cajaId)) porCaja.set(m.cajaId, []);
      porCaja.get(m.cajaId).push(m);
    });

    return new Map(cajas.map((c) => [c.id, resumirCaja(c, porCaja.get(c.id) || [])]));
  }, [cajas, movimientos]);

  const abiertas = cajas.filter((c) => c.estado === "ABIERTA");
  const cerradas = cajas.filter((c) => c.estado !== "ABIERTA");
  const dineroEnCajas = abiertas.reduce((suma, c) => suma + (resumenes.get(c.id)?.saldo || 0), 0);

  const sucursalesLibres = sucursales.filter(
    (s) => s.estado === "ACTIVA" && !abiertas.some((c) => c.sucursalId === s.id)
  );

  function abrirFormulario() {
    setFormulario({
      ...INICIAL,
      sucursalId: sucursalesLibres.length === 1 ? sucursalesLibres[0].id : ""
    });
    setErrorAbrir("");
    setAbrir(true);
    sonidoClick();
  }

  async function guardarApertura(evento) {
    evento.preventDefault();
    if (guardando) return;

    const saldo = Number(formulario.saldoInicial === "" ? 0 : formulario.saldoInicial);

    const fallar = (texto) => {
      setErrorAbrir(texto);
      sonidoError();
    };

    if (!formulario.sucursalId) return fallar("Elige la sucursal donde abrirás la caja.");
    if (formulario.nombre.trim().length < 3) return fallar("Ponle un nombre de al menos 3 letras. Ej. Caja principal.");
    if (!Number.isFinite(saldo) || saldo < 0) return fallar("El dinero con que empiezas no puede ser negativo.");
    if (saldo > 1000000) return fallar("Ese monto es demasiado grande. Revísalo.");

    setGuardando(true);
    setErrorAbrir("");

    try {
      await abrirCaja({
        empresaId,
        sucursalId: formulario.sucursalId,
        nombre: formulario.nombre,
        saldoInicial: Math.round(saldo * 100) / 100,
        usuarioId: usuario.uid
      });

      sonidoCaja();
      setAviso(`Caja abierta. Ya puedes cobrar en ${nombreSucursal(formulario.sucursalId)}.`);
      setAbrir(false);
    } catch (error) {
      console.error(error);
      fallar(error.message || "No pudimos abrir la caja. Inténtalo otra vez.");
    } finally {
      setGuardando(false);
    }
  }

  function abrirCierre(caja) {
    setACerrar(caja);
    setContado("");
    setErrorCerrar("");
    sonidoClick();
  }

  async function confirmarCierre(evento) {
    evento.preventDefault();
    if (guardando || !aCerrar) return;

    setGuardando(true);
    setErrorCerrar("");

    try {
      await cerrarCaja(aCerrar, usuario.uid, { saldoContado: contado });
      sonidoCaja();
      setAviso(`Caja cerrada. Quedó guardado todo lo que entró y salió.`);
      setACerrar(null);
    } catch (error) {
      console.error(error);
      sonidoError();
      setErrorCerrar(error.message || "No pudimos cerrar la caja. Inténtalo otra vez.");
    } finally {
      setGuardando(false);
    }
  }

  const resumenCierre = aCerrar ? resumenes.get(aCerrar.id) || resumirCaja(aCerrar, []) : null;
  const diferencia = contado === "" || !resumenCierre ? null : Math.round((Number(contado) - resumenCierre.saldo) * 100) / 100;

  return (
    <div className="re inv">
      <header className="re-cabecera">
        <div>
          <h1>Cajas</h1>
          <p>Abre la caja al empezar el día y ciérrala al terminar. Aquí ves cuánto dinero hay en cada una.</p>
        </div>

        <button type="button" className="re-boton" onClick={abrirFormulario}>
          <Plus size={17} />
          Abrir caja
        </button>
      </header>

      <section className="inv-metricas inv-metricas--tres co-metricas" aria-label="Resumen">
        <article className="inv-metrica">
          <span className="inv-metrica__icono" aria-hidden="true">
            <Store size={22} />
          </span>
          <div>
            <small>Cajas abiertas</small>
            <strong>{abiertas.length}</strong>
            <em>listas para cobrar</em>
          </div>
        </article>
        <article className="inv-metrica">
          <span className="inv-metrica__icono" aria-hidden="true">
            <Wallet size={22} />
          </span>
          <div>
            <small>Dinero en cajas</small>
            <strong>{dinero(dineroEnCajas)}</strong>
            <em>sumando las abiertas</em>
          </div>
        </article>
        <article className="inv-metrica">
          <span className="inv-metrica__icono" aria-hidden="true">
            <LockKeyhole size={22} />
          </span>
          <div>
            <small>Cajas cerradas</small>
            <strong>{cerradas.length}</strong>
            <em>en el historial</em>
          </div>
        </article>
      </section>

      {aviso && (
        <div className="re-aviso re-aviso--ok" role="status">
          {aviso}
        </div>
      )}

      {cargando ? (
        <div className="re-vacio">Cargando cajas…</div>
      ) : (
        <>
          <h2 className="cj-titulo">Cajas abiertas</h2>

          {abiertas.length === 0 ? (
            <div className="re-vacio">
              <Lock size={34} />
              <strong>No hay ninguna caja abierta</strong>
              <span>Sin caja abierta no se puede cobrar en efectivo ni pagar compras con dinero de caja.</span>
              <button type="button" className="re-boton" onClick={abrirFormulario}>
                <Plus size={17} />
                Abrir una caja
              </button>
            </div>
          ) : (
            <div className="cj-lista">
              {abiertas.map((caja) => {
                const r = resumenes.get(caja.id) || resumirCaja(caja, []);

                return (
                  <article className="cj-tarjeta" key={caja.id} data-negativo={r.saldo < 0}>
                    <header>
                      <div>
                        <h3>{caja.nombre}</h3>
                        <span>
                          {nombreSucursal(caja.sucursalId)} · desde {formatoFecha(fechaDe(caja.fechaApertura))}
                        </span>
                      </div>
                      <span className="inv-pastilla" data-estado="VIGENTE">
                        Abierta
                      </span>
                    </header>

                    <div className="cj-saldo">
                      <small>Dinero en caja ahora</small>
                      <strong>{dinero(r.saldo)}</strong>
                    </div>

                    {r.saldo < 0 && (
                      <p className="cj-alerta">
                        <AlertTriangle size={16} /> Salió más dinero del que había. Revisa los movimientos.
                      </p>
                    )}

                    <dl>
                      <div>
                        <dt>Empezó con</dt>
                        <dd>{dinero(caja.saldoInicial)}</dd>
                      </div>
                      <div>
                        <dt>
                          <ArrowUpRight size={14} /> Entró
                        </dt>
                        <dd className="cj-entra">{dinero(r.ingresos)}</dd>
                      </div>
                      <div>
                        <dt>
                          <ArrowDownRight size={14} /> Salió
                        </dt>
                        <dd className="cj-sale">{dinero(r.egresos)}</dd>
                      </div>
                    </dl>

                    <footer>
                      <Link to={`/ventas/caja-movimientos?caja=${caja.id}`} className="re-boton re-boton--suave re-boton--chico">
                        Ver movimientos
                      </Link>
                      <button type="button" className="re-boton re-boton--chico" onClick={() => abrirCierre(caja)}>
                        <Lock size={15} />
                        Cerrar caja
                      </button>
                    </footer>
                  </article>
                );
              })}
            </div>
          )}

          {cerradas.length > 0 && (
            <section className="inv-bloque">
              <h2 className="cj-titulo">Cajas cerradas</h2>

              <div className="inv-tabla-caja">
                <table className="inv-tabla">
                  <thead>
                    <tr>
                      <th>Caja</th>
                      <th>Cerró</th>
                      <th className="inv-der">Entró</th>
                      <th className="inv-der">Salió</th>
                      <th className="inv-der">Quedó</th>
                      <th className="inv-der">Contado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cerradas.map((caja) => {
                      const r = resumenes.get(caja.id) || resumirCaja(caja, []);
                      const dif = caja.diferencia;

                      return (
                        <tr key={caja.id}>
                          <td data-label="Caja">
                            <div className="inv-celda">
                              <strong>{caja.nombre}</strong>
                              <small>{nombreSucursal(caja.sucursalId)}</small>
                            </div>
                          </td>
                          <td data-label="Cerró">{formatoFecha(fechaDe(caja.fechaCierre))}</td>
                          <td data-label="Entró" className="inv-der">
                            {dinero(caja.totalIngresos ?? r.ingresos)}
                          </td>
                          <td data-label="Salió" className="inv-der">
                            {dinero(caja.totalEgresos ?? r.egresos)}
                          </td>
                          <td data-label="Quedó" className="inv-der">
                            <strong>{dinero(caja.saldoFinal ?? r.saldo)}</strong>
                          </td>
                          <td data-label="Contado" className="inv-der">
                            {caja.saldoContado == null ? (
                              <span className="inv-sin">No se contó</span>
                            ) : (
                              <div className="inv-celda" style={{ justifyItems: "end" }}>
                                <strong>{dinero(caja.saldoContado)}</strong>
                                <small className={dif === 0 ? "" : dif > 0 ? "inv-ok" : "inv-vencido"}>
                                  {dif === 0 ? "Cuadró justo" : dif > 0 ? `Sobraron ${dinero(dif)}` : `Faltaron ${dinero(Math.abs(dif))}`}
                                </small>
                              </div>
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
        </>
      )}

      {/* ---------- Abrir caja ---------- */}
      <AnimatePresence>
        {abrir && (
          <motion.div className="re-fondo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => !guardando && setAbrir(false)}>
            <motion.form
              className="re-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="cj-abrir-titulo"
              initial={{ opacity: 0, scale: 0.96, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              onMouseDown={(e) => e.stopPropagation()}
              onSubmit={guardarApertura}
              noValidate
            >
              <header className="re-modal__cabecera">
                <div>
                  <h2 id="cj-abrir-titulo">Abrir caja</h2>
                  <p>Cuenta el dinero con el que empiezas el día.</p>
                </div>
                <button type="button" className="re-cerrar" onClick={() => setAbrir(false)} aria-label="Cerrar" disabled={guardando}>
                  <X size={18} />
                </button>
              </header>

              <div className="re-modal__cuerpo">
                {sucursalesLibres.length === 0 ? (
                  <div className="re-aviso inv-guia">
                    <Info size={18} />
                    <span>Todas tus sucursales ya tienen una caja abierta. Cierra una para abrir otra.</span>
                  </div>
                ) : (
                  <label className="re-campo">
                    <span className="re-etiqueta-campo">
                      Sucursal <b>*</b>
                    </span>
                    <span className="tr-selector tr-selector--formulario">
                      <select value={formulario.sucursalId} onChange={(e) => setFormulario((f) => ({ ...f, sucursalId: e.target.value }))}>
                        <option value="">Elige la sucursal</option>
                        {sucursalesLibres.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.nombre}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={17} aria-hidden="true" />
                    </span>
                  </label>
                )}

                <div className="re-campos co-iguales">
                  <label className="re-campo">
                    <span className="re-etiqueta-campo">
                      Nombre de la caja <b>*</b>
                    </span>
                    <input
                      type="text"
                      value={formulario.nombre}
                      onChange={(e) => setFormulario((f) => ({ ...f, nombre: limpiarNombre(e.target.value) }))}
                      placeholder="Ej. Caja principal"
                    />
                  </label>

                  <label className="re-campo">
                    <span className="re-etiqueta-campo">Empiezas con (Bs)</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={formulario.saldoInicial}
                      onKeyDown={sinSignos}
                      onChange={(e) => setFormulario((f) => ({ ...f, saldoInicial: e.target.value }))}
                      placeholder="0.00"
                    />
                  </label>
                </div>

                {errorAbrir && (
                  <div className="re-aviso re-aviso--error" role="alert">
                    {errorAbrir}
                  </div>
                )}
              </div>

              <footer className="re-modal__pie">
                <button type="button" className="re-boton re-boton--suave" onClick={() => setAbrir(false)} disabled={guardando}>
                  Cancelar
                </button>
                <button type="submit" className="re-boton" disabled={guardando || sucursalesLibres.length === 0}>
                  {guardando ? "Abriendo…" : "Abrir caja"}
                </button>
              </footer>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------- Cerrar caja ---------- */}
      <AnimatePresence>
        {aCerrar && resumenCierre && (
          <motion.div className="re-fondo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => !guardando && setACerrar(null)}>
            <motion.form
              className="re-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="cj-cerrar-titulo"
              initial={{ opacity: 0, scale: 0.96, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              onMouseDown={(e) => e.stopPropagation()}
              onSubmit={confirmarCierre}
              noValidate
            >
              <header className="re-modal__cabecera">
                <div>
                  <h2 id="cj-cerrar-titulo">Cerrar {aCerrar.nombre}</h2>
                  <p>{nombreSucursal(aCerrar.sucursalId)} · revisa que el dinero cuadre.</p>
                </div>
                <button type="button" className="re-cerrar" onClick={() => setACerrar(null)} aria-label="Cerrar" disabled={guardando}>
                  <X size={18} />
                </button>
              </header>

              <div className="re-modal__cuerpo">
                <div className="co-detalle-resumen">
                  <div>
                    <small>Empezó con</small>
                    <strong>{dinero(aCerrar.saldoInicial)}</strong>
                  </div>
                  <div>
                    <small>Entró</small>
                    <strong className="cj-entra">{dinero(resumenCierre.ingresos)}</strong>
                  </div>
                  <div>
                    <small>Salió</small>
                    <strong className="cj-sale">{dinero(resumenCierre.egresos)}</strong>
                  </div>
                  <div>
                    <small>Debería haber</small>
                    <strong>{dinero(resumenCierre.saldo)}</strong>
                  </div>
                </div>

                <label className="re-campo">
                  <span className="re-etiqueta-campo">Dinero que contaste (opcional)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={contado}
                    onKeyDown={sinSignos}
                    onChange={(e) => setContado(e.target.value)}
                    placeholder="Cuenta los billetes y monedas"
                    autoFocus
                  />
                </label>

                {diferencia !== null && (
                  <div className={`re-aviso ${diferencia === 0 ? "re-aviso--ok" : "re-aviso--error"}`} role="status">
                    {diferencia === 0
                      ? "La caja cuadra justo."
                      : diferencia > 0
                        ? `Sobran ${dinero(diferencia)} respecto a lo esperado.`
                        : `Faltan ${dinero(Math.abs(diferencia))} respecto a lo esperado.`}
                  </div>
                )}

                <div className="re-aviso inv-guia">
                  <Info size={18} />
                  <span>Al cerrar, esta caja ya no recibe cobros ni pagos. Para seguir vendiendo abre una nueva.</span>
                </div>

                {errorCerrar && (
                  <div className="re-aviso re-aviso--error" role="alert">
                    {errorCerrar}
                  </div>
                )}
              </div>

              <footer className="re-modal__pie">
                <button type="button" className="re-boton re-boton--suave" onClick={() => setACerrar(null)} disabled={guardando}>
                  Cancelar
                </button>
                <button type="submit" className="re-boton" disabled={guardando}>
                  {guardando ? "Cerrando…" : "Cerrar caja"}
                </button>
              </footer>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
