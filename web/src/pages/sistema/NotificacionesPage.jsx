import { useEffect, useMemo, useState } from "react";
import mensajeError from "../../utils/mensajeError";
import { AnimatePresence, motion } from "framer-motion";
import { BellRing, Check, Inbox, Megaphone, Pencil, Plus, Power, Search, Trash2, Users, X } from "lucide-react";

import useAuth from "../../hooks/useAuth";
import useConfirmar from "../../hooks/useConfirmar";
import SelectorBuscable from "../../components/common/SelectorBuscable";
import { suscribirTrabajadores } from "../../services/trabajadorService";
import { suscribirRolesEmpresa } from "../../services/rolEmpresaService";
import {
  PRIORIDADES,
  actualizarAviso,
  cambiarEstadoAviso,
  crearAviso,
  eliminarAviso,
  estaVencido,
  milisegundos,
  suscribirAvisosEmpresa,
  suscribirAvisosPara
} from "../../services/avisosEquipoService";
import { sonidoClick, sonidoError, sonidoExito } from "../../utils/sonidos";

import "../../styles/roles-empresa.css";
import "../../styles/trabajadores-empresa.css";
import "../../styles/inventario-empresa.css";
import "../../styles/compras-empresa.css";
import "../../styles/cajas-empresa.css";
import "../../styles/promociones-empresa.css";

const FILTROS = [
  ["TODOS", "Todos"],
  ["ACTIVO", "Activos"],
  ["PAUSADO", "Pausados"],
  ["VENCIDO", "Vencidos"]
];

const PLANTILLAS = [
  { texto: "Cierre de caja", titulo: "Cierren su caja al terminar", mensaje: "Recuerden contar el dinero y cerrar su caja antes de irse." },
  { texto: "Stock bajo", titulo: "Revisen el stock", mensaje: "Se están acabando algunos productos. Avisen si falta mercadería en el estante." },
  { texto: "Reunión", titulo: "Reunión del equipo", mensaje: "Habrá una reunión corta del equipo. Les confirmo la hora." }
];

const VACIO = {
  titulo: "",
  mensaje: "",
  prioridad: "NORMAL",
  audiencia: "TODOS",
  rolId: "",
  destinatarioId: "",
  vence: "",
  activo: true
};

const normalizar = (valor) =>
  String(valor ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

const limpiarTitulo = (v) =>
  String(v ?? "")
    .replace(/[^\p{L}\p{N}\s.,:;!¡?¿()#/&'%-]/gu, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^\s+/, "")
    .slice(0, 60);

function cuando(valor) {
  const ms = milisegundos(valor);
  if (!ms) return "";
  const dif = Date.now() - ms;
  if (dif < 60000) return "Ahora mismo";
  if (dif < 3600000) return `Hace ${Math.floor(dif / 60000)} min`;
  if (dif < 86400000) return `Hace ${Math.floor(dif / 3600000)} h`;
  return new Date(ms).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" });
}

function fechaCorta(texto) {
  if (!texto) return "";
  const [anio, mes, dia] = texto.split("-").map(Number);
  return new Date(anio, mes - 1, dia).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" });
}

// ---------------------------------------------------------------------------
// Bandeja del trabajador: solo lee los avisos que le tocan
// ---------------------------------------------------------------------------

function BandejaTrabajador({ usuario }) {
  const [avisos, setAvisos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cancelar = suscribirAvisosPara(usuario, (datos) => {
      setAvisos(datos);
      setCargando(false);
    }, console.error);

    return () => cancelar?.();
  }, [usuario]);

  return (
    <div className="re inv">
      <header className="re-cabecera">
        <div>
          <h1>Mis avisos</h1>
          <p>Los mensajes que tu jefe envía al equipo. Llegan solos, sin recargar.</p>
        </div>
      </header>

      {cargando ? (
        <div className="re-vacio">Cargando avisos…</div>
      ) : avisos.length === 0 ? (
        <div className="re-vacio">
          <Inbox size={34} />
          <strong>No tienes avisos</strong>
          <span>Cuando tu jefe envíe un mensaje, aparecerá aquí y en la campana de arriba.</span>
        </div>
      ) : (
        <div className="pr-lista">
          {avisos.map((aviso) => (
            <article className="pr-tarjeta" key={aviso.id} data-prioridad={aviso.prioridad}>
              <header>
                <span className="ne-prioridad" data-prioridad={aviso.prioridad}>
                  {PRIORIDADES[aviso.prioridad] || "Normal"}
                </span>
                <small className="ne-cuando">{cuando(aviso.fechaRegistro)}</small>
              </header>
              <h2>{aviso.titulo}</h2>
              <p className="ne-mensaje">{aviso.mensaje}</p>
              {aviso.vence && <small className="ne-cuando">Vigente hasta el {fechaCorta(aviso.vence)}</small>}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel del dueño
// ---------------------------------------------------------------------------

function PanelDueno({ usuario }) {
  const confirmar = useConfirmar();
  const empresaId = usuario.empresaId;

  const [avisos, setAvisos] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  const [roles, setRoles] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("TODOS");

  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    const a = suscribirAvisosEmpresa(
      empresaId,
      (datos) => {
        setAvisos(datos);
        setCargando(false);
      },
      (e) => {
        console.error(e);
        setCargando(false);
      }
    );
    const b = suscribirTrabajadores(empresaId, setTrabajadores, console.error);
    const c = suscribirRolesEmpresa(empresaId, setRoles, console.error);

    return () => {
      a?.();
      b?.();
      c?.();
    };
  }, [empresaId]);

  const equipoActivo = trabajadores.filter((t) => t.estado === true);
  const rolesActivos = roles.filter((r) => r.estado === "ACTIVO");

  const nombreRol = (id) => roles.find((r) => r.id === id)?.nombre || "Cargo eliminado";
  const nombreTrabajador = (id) => trabajadores.find((t) => t.id === id)?.nombreCompleto || "Persona eliminada";

  const estadoDe = (a) => (a.estado !== "ACTIVO" ? "PAUSADO" : estaVencido(a) ? "VENCIDO" : "ACTIVO");

  const paraQuien = (a) => {
    if (a.audiencia === "ROL") return `Cargo: ${nombreRol(a.rolId)}`;
    if (a.audiencia === "PERSONA") return `Solo para ${nombreTrabajador(a.destinatarioId)}`;
    return "Todo el equipo";
  };

  const cuantos = (a) => {
    if (a.audiencia === "ROL") return equipoActivo.filter((t) => t.rolId === a.rolId).length;
    if (a.audiencia === "PERSONA") return equipoActivo.some((t) => t.id === a.destinatarioId) ? 1 : 0;
    return equipoActivo.length;
  };

  const conEstado = useMemo(() => avisos.map((a) => ({ ...a, situacion: estadoDe(a) })), [avisos]);

  const visibles = conEstado.filter((a) => {
    if (filtro !== "TODOS" && a.situacion !== filtro) return false;
    const texto = normalizar(busqueda);
    return !texto || normalizar(a.titulo).includes(texto) || normalizar(a.mensaje).includes(texto);
  });

  const activos = conEstado.filter((a) => a.situacion === "ACTIVO").length;

  const destinatarios = form.audiencia === "TODOS" ? equipoActivo.length : form.audiencia === "ROL" ? equipoActivo.filter((t) => t.rolId === form.rolId).length : form.destinatarioId ? 1 : 0;

  const poner = (campo, valor) => {
    setForm((f) => ({ ...f, [campo]: valor }));
    setError("");
  };

  function abrirNuevo() {
    setEditando(null);
    setForm(VACIO);
    setError("");
    setAbierto(true);
    sonidoClick();
  }

  function abrirEditar(a) {
    setEditando(a);
    setForm({
      titulo: a.titulo || "",
      mensaje: a.mensaje || "",
      prioridad: PRIORIDADES[a.prioridad] ? a.prioridad : "NORMAL",
      audiencia: ["ROL", "PERSONA"].includes(a.audiencia) ? a.audiencia : "TODOS",
      rolId: a.rolId || "",
      destinatarioId: a.destinatarioId || "",
      vence: a.vence || "",
      activo: a.estado === "ACTIVO"
    });
    setError("");
    setAbierto(true);
    sonidoClick();
  }

  async function guardar(evento) {
    evento.preventDefault();
    if (guardando) return;

    setGuardando(true);
    setError("");

    const datos = {
      ...form,
      rolNombre: form.audiencia === "ROL" ? nombreRol(form.rolId) : "",
      destinatarioNombre: form.audiencia === "PERSONA" ? nombreTrabajador(form.destinatarioId) : ""
    };

    try {
      if (editando) await actualizarAviso(editando.id, datos);
      else await crearAviso(empresaId, usuario.uid, datos);

      sonidoExito();
      setAviso(editando ? "Cambios guardados." : "Aviso enviado. Tu equipo lo verá al instante en su campana.");
      setAbierto(false);
    } catch (e) {
      console.error(e);
      sonidoError();
      setError(mensajeError(e, "No pudimos enviar el aviso. Inténtalo otra vez."));
    } finally {
      setGuardando(false);
    }
  }

  async function alternar(a) {
    setAviso("");
    try {
      await cambiarEstadoAviso(a.id, a.estado !== "ACTIVO");
      sonidoClick();
    } catch (e) {
      console.error(e);
      sonidoError();
      setAviso("No pudimos cambiar el estado. Inténtalo otra vez.");
    }
  }

  async function borrar(a) {
    const ok = await confirmar({
      titulo: "Eliminar este aviso",
      mensaje: `"${a.titulo}" dejará de verse para tu equipo.`,
      accion: "Eliminar",
      peligro: true
    });
    if (!ok) return;

    try {
      await eliminarAviso(a.id);
      sonidoExito();
      setAviso("Aviso eliminado.");
    } catch (e) {
      console.error(e);
      sonidoError();
      setAviso("No pudimos eliminarlo. Inténtalo otra vez.");
    }
  }

  return (
    <div className="re inv">
      <header className="re-cabecera">
        <div>
          <h1>Avisos para tu equipo</h1>
          <p>Escribe un mensaje y llega al instante a la campana de tus trabajadores: a todos, a un cargo o a una persona.</p>
        </div>

        <button type="button" className="re-boton" onClick={abrirNuevo}>
          <Plus size={17} />
          Nuevo aviso
        </button>
      </header>

      <section className="inv-metricas inv-metricas--tres co-metricas" aria-label="Resumen">
        <article className="inv-metrica">
          <span className="inv-metrica__icono" aria-hidden="true">
            <Megaphone size={22} />
          </span>
          <div>
            <small>Avisos activos</small>
            <strong>{activos}</strong>
            <em>los ve tu equipo ahora</em>
          </div>
        </article>
        <article className="inv-metrica">
          <span className="inv-metrica__icono" aria-hidden="true">
            <Users size={22} />
          </span>
          <div>
            <small>Tu equipo</small>
            <strong>{equipoActivo.length}</strong>
            <em>{equipoActivo.length === 1 ? "trabajador activo" : "trabajadores activos"}</em>
          </div>
        </article>
        <article className="inv-metrica">
          <span className="inv-metrica__icono" aria-hidden="true">
            <BellRing size={22} />
          </span>
          <div>
            <small>Enviados</small>
            <strong>{avisos.length}</strong>
            <em>en total</em>
          </div>
        </article>
      </section>

      <div className="re-herramientas">
        <label className="re-busqueda">
          <Search size={19} aria-hidden="true" />
          <input type="search" placeholder="Buscar aviso…" aria-label="Buscar avisos" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
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
        <div className="re-vacio">Cargando avisos…</div>
      ) : visibles.length === 0 ? (
        <div className="re-vacio">
          <Megaphone size={34} />
          <strong>{avisos.length === 0 ? "Todavía no enviaste avisos" : "No encontramos avisos"}</strong>
          <span>{avisos.length === 0 ? "Envía el primero: por ejemplo, un recordatorio de cierre de caja." : "Prueba con otra búsqueda o cambia el filtro."}</span>
          {avisos.length === 0 && (
            <button type="button" className="re-boton" onClick={abrirNuevo}>
              <Plus size={17} />
              Enviar mi primer aviso
            </button>
          )}
        </div>
      ) : (
        <div className="pr-lista">
          {visibles.map((a) => (
            <article className="pr-tarjeta" key={a.id} data-estado={a.situacion === "ACTIVO" ? "VIGENTE" : "DESACTIVADA"}>
              <header>
                <span className="ne-prioridad" data-prioridad={a.prioridad}>
                  {PRIORIDADES[a.prioridad] || "Normal"}
                </span>
                <span className="inv-pastilla" data-estado={a.situacion === "ACTIVO" ? "VIGENTE" : a.situacion === "VENCIDO" ? "VENCIDO" : "SIN_EXISTENCIAS"}>
                  {a.situacion === "ACTIVO" ? "Activo" : a.situacion === "VENCIDO" ? "Vencido" : "Pausado"}
                </span>
              </header>

              <h2>{a.titulo}</h2>
              <p className="ne-mensaje">{a.mensaje}</p>

              <dl>
                <div>
                  <dt>Para</dt>
                  <dd>{paraQuien(a)}</dd>
                </div>
                <div>
                  <dt>Lo reciben</dt>
                  <dd>
                    {cuantos(a)} {cuantos(a) === 1 ? "persona" : "personas"}
                  </dd>
                </div>
                <div>
                  <dt>Enviado</dt>
                  <dd>{cuando(a.fechaRegistro) || "—"}</dd>
                </div>
                {a.vence && (
                  <div>
                    <dt>Vigente hasta</dt>
                    <dd>{fechaCorta(a.vence)}</dd>
                  </div>
                )}
              </dl>

              <footer>
                <button type="button" className="re-boton re-boton--suave re-boton--chico" onClick={() => abrirEditar(a)}>
                  <Pencil size={15} />
                  Editar
                </button>
                <button type="button" className="re-boton re-boton--suave re-boton--chico" onClick={() => alternar(a)}>
                  <Power size={15} />
                  {a.estado === "ACTIVO" ? "Pausar" : "Activar"}
                </button>
                <button type="button" className="re-boton re-boton--suave re-boton--chico re-boton--icono" onClick={() => borrar(a)} aria-label={`Eliminar ${a.titulo}`}>
                  <Trash2 size={15} />
                </button>
              </footer>
            </article>
          ))}
        </div>
      )}

      <AnimatePresence>
        {abierto && (
          <motion.div className="re-fondo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => !guardando && setAbierto(false)}>
            <motion.form
              className="re-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="av-titulo"
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
                  <h2 id="av-titulo">{editando ? "Editar aviso" : "Nuevo aviso"}</h2>
                  <p>Tu equipo lo verá en la campana de arriba, al instante.</p>
                </div>
                <button type="button" className="re-cerrar" onClick={() => setAbierto(false)} aria-label="Cerrar" disabled={guardando}>
                  <X size={18} />
                </button>
              </header>

              <div className="re-modal__cuerpo">
                {!editando && (
                  <div className="co-atajos" aria-label="Plantillas">
                    <span>Empezar con:</span>
                    {PLANTILLAS.map((p) => (
                      <button
                        key={p.texto}
                        type="button"
                        className="re-chip"
                        onClick={() => {
                          setForm((f) => ({ ...f, titulo: p.titulo, mensaje: p.mensaje }));
                          sonidoClick();
                        }}
                      >
                        {p.texto}
                      </button>
                    ))}
                  </div>
                )}

                <label className="re-campo">
                  <span className="re-etiqueta-campo">
                    Título <b>*</b>
                  </span>
                  <input type="text" value={form.titulo} onChange={(e) => poner("titulo", limpiarTitulo(e.target.value))} placeholder="Ej. Cambio de horario" autoFocus />
                </label>

                <label className="re-campo">
                  <span className="re-etiqueta-campo">
                    Mensaje <b>*</b>
                  </span>
                  <textarea
                    className="inv-texto"
                    rows="3"
                    maxLength={300}
                    value={form.mensaje}
                    onChange={(e) => poner("mensaje", e.target.value)}
                    placeholder="Escribe lo que quieres que sepa tu equipo"
                  />
                  <small className="re-ayuda">{form.mensaje.length}/300</small>
                </label>

                <div className="re-campo">
                  <span className="re-etiqueta-campo">¿Qué tan importante es?</span>
                  <div className="pr-opciones pr-opciones--tres" role="radiogroup" aria-label="Importancia">
                    {Object.entries(PRIORIDADES).map(([valor, texto]) => (
                      <button
                        key={valor}
                        type="button"
                        role="radio"
                        aria-checked={form.prioridad === valor}
                        className="pr-opcion pr-opcion--simple"
                        data-activo={form.prioridad === valor}
                        onClick={() => {
                          poner("prioridad", valor);
                          sonidoClick();
                        }}
                      >
                        <strong>{texto}</strong>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="re-campo">
                  <span className="re-etiqueta-campo">¿Para quién?</span>
                  <div className="pr-opciones pr-opciones--tres" role="radiogroup" aria-label="Destinatarios">
                    {[
                      ["TODOS", "Todo el equipo"],
                      ["ROL", "Un cargo"],
                      ["PERSONA", "Una persona"]
                    ].map(([valor, texto]) => (
                      <button
                        key={valor}
                        type="button"
                        role="radio"
                        aria-checked={form.audiencia === valor}
                        className="pr-opcion pr-opcion--simple"
                        data-activo={form.audiencia === valor}
                        onClick={() => {
                          setForm((f) => ({ ...f, audiencia: valor, rolId: "", destinatarioId: "" }));
                          setError("");
                          sonidoClick();
                        }}
                      >
                        <strong>{texto}</strong>
                      </button>
                    ))}
                  </div>
                </div>

                {form.audiencia === "ROL" && (
                  <div className="re-campo">
                    <SelectorBuscable
                      etiqueta="Cargo *"
                      valor={form.rolId}
                      opciones={rolesActivos.map((r) => ({ valor: r.id, etiqueta: r.nombre }))}
                      onChange={(valor) => poner("rolId", valor)}
                      placeholder="Elige el cargo"
                      placeholderBusqueda="Buscar cargo…"
                      vacio="No tienes cargos creados"
                    />
                  </div>
                )}

                {form.audiencia === "PERSONA" && (
                  <div className="re-campo">
                    <SelectorBuscable
                      etiqueta="Persona *"
                      valor={form.destinatarioId}
                      opciones={equipoActivo.map((t) => ({ valor: t.id, etiqueta: t.nombreCompleto }))}
                      onChange={(valor) => poner("destinatarioId", valor)}
                      placeholder="Elige al trabajador"
                      placeholderBusqueda="Buscar por nombre…"
                      vacio="No tienes trabajadores activos"
                    />
                  </div>
                )}

                <label className="re-campo">
                  <span className="re-etiqueta-campo">Vigente hasta (opcional)</span>
                  <input type="date" value={form.vence} min={new Date().toISOString().slice(0, 10)} max="2099-12-31" onChange={(e) => poner("vence", e.target.value)} />
                  <small className="re-ayuda">Después de esa fecha el aviso deja de mostrarse solo.</small>
                </label>

                <label className="pr-activa">
                  <input type="checkbox" checked={form.activo} onChange={(e) => poner("activo", e.target.checked)} />
                  <span>
                    <strong>Aviso activo</strong>
                    <small>Si lo pausas, tu equipo deja de verlo.</small>
                  </span>
                </label>

                <p className="co-nota">
                  <Users size={16} />
                  <span>
                    Lo recibirán <b>{destinatarios}</b> {destinatarios === 1 ? "persona" : "personas"}.
                  </span>
                </p>

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
                  {guardando ? "Enviando…" : editando ? "Guardar cambios" : "Enviar aviso"}
                </button>
              </footer>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function NotificacionesPage() {
  const { usuario } = useAuth();

  if (!usuario?.empresaId) return null;

  return usuario.tipoUsuario === "ADMIN" ? <PanelDueno usuario={usuario} /> : <BandejaTrabajador usuario={usuario} />;
}
