import { useEffect, useMemo, useState } from "react";
import mensajeError from "../../utils/mensajeError";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Ban, Check, ChevronDown, Info, Pencil, Plus, Receipt, Search, TrendingDown, Wallet, X } from "lucide-react";

import useAuth from "../../hooks/useAuth";
import useConfirmar from "../../hooks/useConfirmar";
import { suscribirColeccionEmpresa } from "../../services/genericCrudService";
import { suscribirSucursales } from "../../services/sucursalService";
import { obtenerSaldoCaja, suscribirCajas } from "../../services/cajaService";
import { anularGasto, corregirGasto, registrarGasto } from "../../services/gastoService";
import { sonidoCaja, sonidoClick, sonidoError, sonidoExito } from "../../utils/sonidos";

import "../../styles/roles-empresa.css";
import "../../styles/trabajadores-empresa.css";
import "../../styles/inventario-empresa.css";
import "../../styles/crud-generico.css";
import "../../styles/compras-empresa.css";
import "../../styles/cajas-empresa.css";

const POR_PAGINA = 30;

const CATEGORIAS = {
  OPERATIVO: "Operativo",
  SERVICIOS: "Servicios (luz, agua, internet)",
  PERSONAL: "Personal",
  TRANSPORTE: "Transporte",
  IMPUESTOS: "Impuestos",
  OTRO: "Otro"
};

const METODOS = {
  EFECTIVO: "Efectivo",
  QR: "QR",
  TRANSFERENCIA: "Transferencia",
  TARJETA: "Tarjeta"
};

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

const hoyLocal = () => {
  const h = new Date();
  return [h.getFullYear(), String(h.getMonth() + 1).padStart(2, "0"), String(h.getDate()).padStart(2, "0")].join("-");
};

function fechaCorta(texto) {
  if (!texto) return "—";
  const [anio, mes, dia] = String(texto).split("-").map(Number);
  return new Date(anio, mes - 1, dia).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" });
}

const limpiarConcepto = (v) =>
  String(v ?? "")
    .replace(/[^\p{L}\p{N}\s.,()#/&'-]/gu, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^\s+/, "")
    .slice(0, 80);

const sinSignos = (e) => {
  if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
};

const anulado = (g) => g.estado === "ANULADO" || g.estado === "INACTIVO";

const VACIO = () => ({
  concepto: "",
  categoria: "OPERATIVO",
  monto: "",
  metodoPago: "EFECTIVO",
  fecha: hoyLocal(),
  observacion: "",
  sucursalId: "",
  cajaId: ""
});

export default function GastosPage() {
  const { usuario } = useAuth();
  const confirmar = useConfirmar();
  const empresaId = usuario?.empresaId;

  const [gastos, setGastos] = useState([]);
  const [cajas, setCajas] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [busqueda, setBusqueda] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [limite, setLimite] = useState(POR_PAGINA);

  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [errorLista, setErrorLista] = useState("");
  const [saldoCaja, setSaldoCaja] = useState(null);

  useEffect(() => {
    if (!empresaId) return undefined;

    const cancelarGastos = suscribirColeccionEmpresa(
      "gastos",
      empresaId,
      (datos) => {
        setGastos(datos);
        setCargando(false);
      },
      (e) => {
        console.error(e);
        setCargando(false);
      }
    );

    const cancelarCajas = suscribirCajas(empresaId, setCajas, console.error);
    const cancelarSucursales = suscribirSucursales(empresaId, setSucursales, console.error);

    return () => {
      cancelarGastos?.();
      cancelarCajas?.();
      cancelarSucursales?.();
    };
  }, [empresaId]);

  const cajasAbiertas = cajas.filter((c) => c.estado === "ABIERTA");
  const nombreSucursal = (id) => sucursales.find((s) => s.id === id)?.nombre || "";

  const esEfectivo = form.metodoPago === "EFECTIVO";
  const cajasDeSucursal = cajasAbiertas.filter((c) => !form.sucursalId || c.sucursalId === form.sucursalId);
  const sucursalesConCaja = sucursales.filter((s) => cajasAbiertas.some((c) => c.sucursalId === s.id));
  const cajaEfectiva = form.cajaId || (cajasDeSucursal.length === 1 && form.sucursalId ? cajasDeSucursal[0].id : "");
  const cajaElegida = cajasAbiertas.find((c) => c.id === cajaEfectiva) || null;

  // Dinero que hay en la caja elegida, para no gastar más de lo que hay
  useEffect(() => {
    let activo = true;

    if (!abierto || editando || !esEfectivo || !cajaElegida) {
      return undefined;
    }

    obtenerSaldoCaja(cajaElegida)
      .then((saldo) => activo && setSaldoCaja(saldo))
      .catch(() => activo && setSaldoCaja(null));

    return () => {
      activo = false;
    };
  }, [abierto, editando, esEfectivo, cajaElegida]);

  const montoNumero = Number(form.monto);
  const superaCaja =
    esEfectivo && cajaElegida && saldoCaja !== null && Number.isFinite(montoNumero) && montoNumero > saldoCaja;

  const filtrados = useMemo(() => {
    const texto = normalizar(busqueda);

    return gastos
      .filter((g) => {
        if (categoriaFiltro && g.categoria !== categoriaFiltro) return false;
        if (desde && g.fecha && g.fecha < desde) return false;
        if (hasta && g.fecha && g.fecha > hasta) return false;
        if (!texto) return true;
        return [g.concepto, CATEGORIAS[g.categoria], METODOS[g.metodoPago], g.observacion].some((v) => normalizar(v).includes(texto));
      })
      .sort((a, b) => String(b.fecha || "").localeCompare(String(a.fecha || "")));
  }, [gastos, busqueda, categoriaFiltro, desde, hasta]);

  const mes = hoyLocal().slice(0, 7);
  const vigentes = gastos.filter((g) => !anulado(g));
  const delMes = vigentes.filter((g) => String(g.fecha || "").startsWith(mes)).reduce((s, g) => s + Number(g.monto || 0), 0);

  const mayor = (() => {
    const porCategoria = new Map();
    vigentes
      .filter((g) => String(g.fecha || "").startsWith(mes))
      .forEach((g) => porCategoria.set(g.categoria, (porCategoria.get(g.categoria) || 0) + Number(g.monto || 0)));
    const orden = [...porCategoria.entries()].sort((a, b) => b[1] - a[1]);
    return orden[0] ? { nombre: CATEGORIAS[orden[0][0]]?.split(" (")[0] || "Otro", monto: orden[0][1] } : null;
  })();

  const visibles = filtrados.slice(0, limite);
  const hayFiltros = Boolean(busqueda || categoriaFiltro || desde || hasta);

  const poner = (campo, valor) => {
    setForm((f) => ({ ...f, [campo]: valor }));
    setError("");
  };

  function abrirNuevo() {
    const base = VACIO();
    if (sucursalesConCaja.length === 1) base.sucursalId = sucursalesConCaja[0].id;
    setEditando(null);
    setForm(base);
    setSaldoCaja(null);
    setError("");
    setAbierto(true);
    sonidoClick();
  }

  function abrirEditar(gasto) {
    setEditando(gasto);
    setForm({
      concepto: gasto.concepto || "",
      categoria: CATEGORIAS[gasto.categoria] ? gasto.categoria : "OTRO",
      monto: String(gasto.monto ?? ""),
      metodoPago: gasto.metodoPago || "EFECTIVO",
      fecha: gasto.fecha || hoyLocal(),
      observacion: gasto.observacion || "",
      sucursalId: gasto.sucursalId || "",
      cajaId: gasto.cajaId || ""
    });
    setError("");
    setAbierto(true);
    sonidoClick();
  }

  async function guardar(evento) {
    evento.preventDefault();
    if (guardando) return;

    const fallar = (texto) => {
      setError(texto);
      sonidoError();
    };

    if (form.concepto.trim().length < 3) return fallar("Escribe en qué se gastó (mínimo 3 letras). Ej. Pago de luz.");

    setGuardando(true);
    setError("");

    try {
      if (editando) {
        await corregirGasto(editando.id, form);
        sonidoExito();
        setAviso("Cambios guardados.");
      } else {
        if (form.monto === "" || !Number.isFinite(montoNumero) || montoNumero <= 0) {
          setGuardando(false);
          return fallar("Escribe cuánto se gastó.");
        }
        if (form.fecha > hoyLocal()) {
          setGuardando(false);
          return fallar("La fecha no puede ser futura.");
        }
        if (esEfectivo && !cajaEfectiva) {
          setGuardando(false);
          return fallar("Elige la caja de donde salió el dinero.");
        }
        if (superaCaja) {
          setGuardando(false);
          return fallar(`En la caja solo hay ${dinero(saldoCaja)}. Paga con otro método o abre más dinero en caja.`);
        }

        await registrarGasto({
          empresaId,
          usuarioId: usuario.uid,
          concepto: form.concepto,
          categoria: form.categoria,
          monto: montoNumero,
          metodoPago: form.metodoPago,
          fecha: form.fecha,
          observacion: form.observacion,
          sucursalId: form.sucursalId,
          cajaId: esEfectivo ? cajaEfectiva : ""
        });

        sonidoCaja();
        setAviso(esEfectivo ? "Gasto registrado. El dinero ya salió de la caja." : "Gasto registrado.");
      }

      setAbierto(false);
    } catch (e) {
      console.error(e);
      fallar(mensajeError(e, "No pudimos guardar el gasto. Inténtalo otra vez."));
    } finally {
      setGuardando(false);
    }
  }

  async function anular(gasto) {
    const ok = await confirmar({
      titulo: "Anular este gasto",
      mensaje: gasto.cajaId
        ? `Se anulará "${gasto.concepto}" y los ${dinero(gasto.monto)} vuelven a la caja.`
        : `Se anulará "${gasto.concepto}". Dejará de sumarse en tus gastos.`,
      accion: "Anular gasto",
      peligro: true
    });
    if (!ok) return;

    setErrorLista("");
    setAviso("");

    try {
      await anularGasto({ gasto, empresaId, usuarioId: usuario.uid });
      sonidoExito();
      setAviso("Gasto anulado.");
    } catch (e) {
      console.error(e);
      sonidoError();
      setErrorLista(mensajeError(e, "No pudimos anular el gasto."));
    }
  }

  return (
    <div className="re inv">
      <header className="re-cabecera">
        <div>
          <h1>Gastos</h1>
          <p>Anota lo que gastas en el negocio: luz, sueldos, transporte… Si pagas en efectivo, sale de la caja.</p>
        </div>

        <button type="button" className="re-boton" onClick={abrirNuevo}>
          <Plus size={17} />
          Nuevo gasto
        </button>
      </header>

      <section className="inv-metricas inv-metricas--tres co-metricas" aria-label="Resumen">
        <article className="inv-metrica" data-tono="alerta">
          <span className="inv-metrica__icono" aria-hidden="true">
            <TrendingDown size={22} />
          </span>
          <div>
            <small>Gastado este mes</small>
            <strong>{dinero(delMes)}</strong>
            <em>sin contar anulados</em>
          </div>
        </article>
        <article className="inv-metrica">
          <span className="inv-metrica__icono" aria-hidden="true">
            <Receipt size={22} />
          </span>
          <div>
            <small>Gastos registrados</small>
            <strong>{vigentes.length}</strong>
            <em>en total</em>
          </div>
        </article>
        <article className="inv-metrica">
          <span className="inv-metrica__icono" aria-hidden="true">
            <Wallet size={22} />
          </span>
          <div>
            <small>Donde más gastas</small>
            <strong>{mayor ? mayor.nombre : "—"}</strong>
            <em>{mayor ? `${dinero(mayor.monto)} este mes` : "aún sin gastos este mes"}</em>
          </div>
        </article>
      </section>

      <div className="re-herramientas">
        <label className="re-busqueda">
          <Search size={19} aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar gasto…"
            aria-label="Buscar gastos"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setLimite(POR_PAGINA);
            }}
          />
        </label>

        <label className="tr-selector">
          <select
            value={categoriaFiltro}
            onChange={(e) => {
              setCategoriaFiltro(e.target.value);
              setLimite(POR_PAGINA);
            }}
            aria-label="Categoría"
          >
            <option value="">Todas las categorías</option>
            {Object.entries(CATEGORIAS).map(([valor, texto]) => (
              <option key={valor} value={valor}>
                {texto.split(" (")[0]}
              </option>
            ))}
          </select>
          <ChevronDown size={17} aria-hidden="true" />
        </label>

        {hayFiltros && (
          <button
            type="button"
            className="re-chip"
            onClick={() => {
              setBusqueda("");
              setCategoriaFiltro("");
              setDesde("");
              setHasta("");
            }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="cg-rangos">
        <label>
          <span>Desde</span>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </label>
        <label>
          <span>Hasta</span>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </label>
      </div>

      {aviso && (
        <div className="re-aviso re-aviso--ok" role="status">
          <Check size={18} />
          <span>{aviso}</span>
        </div>
      )}
      {errorLista && (
        <div className="re-aviso re-aviso--error" role="alert">
          {errorLista}
        </div>
      )}

      {cargando ? (
        <div className="re-vacio">Cargando gastos…</div>
      ) : filtrados.length === 0 ? (
        <div className="re-vacio">
          <Receipt size={34} />
          <strong>{gastos.length === 0 ? "Todavía no registraste gastos" : "No encontramos gastos"}</strong>
          <span>{gastos.length === 0 ? "Anota el primero, por ejemplo el pago de la luz." : "Prueba con otra búsqueda o limpia los filtros."}</span>
          {gastos.length === 0 && (
            <button type="button" className="re-boton" onClick={abrirNuevo}>
              <Plus size={17} />
              Registrar mi primer gasto
            </button>
          )}
        </div>
      ) : (
        <section className="inv-bloque">
          <div className="inv-tabla-caja">
            <table className="inv-tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Gasto</th>
                  <th>Categoría</th>
                  <th>Pagado con</th>
                  <th className="inv-der">Monto</th>
                  <th className="inv-der">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((g) => (
                  <tr key={g.id}>
                    <td data-label="Fecha">{fechaCorta(g.fecha)}</td>
                    <td data-label="Gasto">
                      <div className="inv-celda">
                        <strong>{g.concepto}</strong>
                        <small>
                          {anulado(g) ? "Anulado" : g.cajaId ? `Salió de caja · ${nombreSucursal(g.sucursalId) || "sucursal"}` : g.observacion || ""}
                        </small>
                      </div>
                    </td>
                    <td data-label="Categoría">{(CATEGORIAS[g.categoria] || "Otro").split(" (")[0]}</td>
                    <td data-label="Pagado con">
                      <span className="co-pastilla-pago" data-estado={anulado(g) ? "ANULADA" : undefined}>
                        {anulado(g) ? "Anulado" : METODOS[g.metodoPago] || g.metodoPago || "—"}
                      </span>
                    </td>
                    <td data-label="Monto" className="inv-der">
                      <strong style={anulado(g) ? { textDecoration: "line-through", opacity: 0.6 } : undefined}>{dinero(g.monto)}</strong>
                    </td>
                    <td data-label="Acciones" className="inv-der">
                      {anulado(g) ? (
                        <span className="inv-sin">—</span>
                      ) : (
                        <div className="inv-fila-acciones">
                          <button type="button" className="re-boton re-boton--suave re-boton--chico" onClick={() => abrirEditar(g)}>
                            <Pencil size={15} />
                            Editar
                          </button>
                          <button
                            type="button"
                            className="re-boton re-boton--suave re-boton--chico inv-baja"
                            onClick={() => anular(g)}
                            aria-label={`Anular el gasto ${g.concepto}`}
                          >
                            <Ban size={15} />
                            Anular
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtrados.length > limite && (
            <button type="button" className="re-boton re-boton--suave cg-mas" onClick={() => setLimite((p) => p + POR_PAGINA)}>
              Mostrar más ({filtrados.length - limite} restantes)
            </button>
          )}
        </section>
      )}

      <AnimatePresence>
        {abierto && (
          <motion.div className="re-fondo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => !guardando && setAbierto(false)}>
            <motion.form
              className="re-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="gs-titulo"
              initial={{ opacity: 0, scale: 0.96, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              onMouseDown={(e) => e.stopPropagation()}
              onSubmit={guardar}
              noValidate
            >
              <header className="re-modal__cabecera">
                <div>
                  <h2 id="gs-titulo">{editando ? "Corregir gasto" : "Nuevo gasto"}</h2>
                  <p>{editando ? "El monto y la forma de pago no se cambian: anula el gasto y regístralo otra vez." : "Anota en qué se fue el dinero."}</p>
                </div>
                <button type="button" className="re-cerrar" onClick={() => setAbierto(false)} aria-label="Cerrar" disabled={guardando}>
                  <X size={18} />
                </button>
              </header>

              <div className="re-modal__cuerpo">
                <label className="re-campo">
                  <span className="re-etiqueta-campo">
                    ¿En qué gastaste? <b>*</b>
                  </span>
                  <input
                    type="text"
                    value={form.concepto}
                    onChange={(e) => poner("concepto", limpiarConcepto(e.target.value))}
                    placeholder="Ej. Pago de luz"
                    autoFocus
                  />
                </label>

                <div className="re-campos co-iguales">
                  <label className="re-campo">
                    <span className="re-etiqueta-campo">Categoría</span>
                    <span className="tr-selector tr-selector--formulario">
                      <select value={form.categoria} onChange={(e) => poner("categoria", e.target.value)}>
                        {Object.entries(CATEGORIAS).map(([valor, texto]) => (
                          <option key={valor} value={valor}>
                            {texto}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={17} aria-hidden="true" />
                    </span>
                  </label>

                  <label className="re-campo">
                    <span className="re-etiqueta-campo">
                      Monto (Bs) <b>*</b>
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={form.monto}
                      onKeyDown={sinSignos}
                      onChange={(e) => poner("monto", e.target.value)}
                      placeholder="0.00"
                      disabled={Boolean(editando)}
                    />
                  </label>
                </div>

                {!editando && (
                  <>
                    <div className="re-campo">
                      <span className="re-etiqueta-campo">¿Cómo pagaste?</span>
                      <div className="co-pagos" role="radiogroup" aria-label="Forma de pago">
                        {Object.entries(METODOS).map(([valor, texto]) => (
                          <button
                            key={valor}
                            type="button"
                            role="radio"
                            aria-checked={form.metodoPago === valor}
                            className="co-pago"
                            data-activo={form.metodoPago === valor}
                            onClick={() => {
                              setForm((f) => ({ ...f, metodoPago: valor, cajaId: "" }));
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
                            No hay una caja abierta. <Link to="/ventas/cajas">Abre la caja</Link> o paga con QR, transferencia o tarjeta.
                          </span>
                        </div>
                      ) : (
                        <>
                          {sucursalesConCaja.length > 1 && (
                            <label className="re-campo">
                              <span className="re-etiqueta-campo">Sucursal</span>
                              <span className="tr-selector tr-selector--formulario">
                                <select value={form.sucursalId} onChange={(e) => setForm((f) => ({ ...f, sucursalId: e.target.value, cajaId: "" }))}>
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

                          {cajasDeSucursal.length > 1 && form.sucursalId && (
                            <label className="re-campo">
                              <span className="re-etiqueta-campo">
                                ¿De qué caja sale el dinero? <b>*</b>
                              </span>
                              <span className="tr-selector tr-selector--formulario">
                                <select value={cajaEfectiva} onChange={(e) => poner("cajaId", e.target.value)}>
                                  <option value="">Elige la caja</option>
                                  {cajasDeSucursal.map((c) => (
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
                                Saldrá de <b>{cajaElegida.nombre}</b>
                                {saldoCaja !== null ? (
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
                              Estás gastando más de lo que hay en la caja.
                            </div>
                          )}
                        </>
                      ))}

                    <label className="re-campo">
                      <span className="re-etiqueta-campo">
                        Fecha del gasto <b>*</b>
                      </span>
                      <input type="date" value={form.fecha} max={hoyLocal()} onChange={(e) => poner("fecha", e.target.value)} />
                    </label>
                  </>
                )}

                <label className="re-campo">
                  <span className="re-etiqueta-campo">Nota (opcional)</span>
                  <textarea
                    className="inv-texto"
                    rows="2"
                    maxLength={200}
                    value={form.observacion}
                    onChange={(e) => poner("observacion", e.target.value)}
                    placeholder="Ej. factura de octubre"
                  />
                </label>

                {error && (
                  <div className="re-aviso re-aviso--error" role="alert">
                    {error}
                  </div>
                )}
              </div>

              <footer className="re-modal__pie">
                <button type="button" className="re-boton re-boton--suave" onClick={() => setAbierto(false)} disabled={guardando}>
                  Cancelar
                </button>
                <button type="submit" className="re-boton" disabled={guardando}>
                  {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Registrar gasto"}
                </button>
              </footer>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
