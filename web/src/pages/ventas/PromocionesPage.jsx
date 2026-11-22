import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { collection, getDocs, query, where } from "firebase/firestore";
import { CalendarDays, Check, Info, Pencil, Percent, Plus, Power, Search, Tag, Trash2, X } from "lucide-react";

import useAuth from "../../hooks/useAuth";
import useConfirmar from "../../hooks/useConfirmar";
import SelectorBuscable from "../../components/common/SelectorBuscable";
import { db } from "../../services/firebase/firebaseConfig";
import {
  actualizarRegistro,
  crearRegistro,
  eliminarRegistro,
  suscribirColeccionEmpresa
} from "../../services/genericCrudService";
import { describirDescuento, estadoPromocion, hoyLocal } from "../../utils/promociones";
import { sonidoClick, sonidoError, sonidoExito } from "../../utils/sonidos";

import "../../styles/roles-empresa.css";
import "../../styles/trabajadores-empresa.css";
import "../../styles/inventario-empresa.css";
import "../../styles/compras-empresa.css";
import "../../styles/promociones-empresa.css";

const ETIQUETAS = {
  VIGENTE: "Vigente",
  PROGRAMADA: "Programada",
  VENCIDA: "Vencida",
  DESACTIVADA: "Desactivada"
};

const FILTROS = [
  ["TODAS", "Todas"],
  ["VIGENTE", "Vigentes"],
  ["PROGRAMADA", "Programadas"],
  ["VENCIDA", "Vencidas"],
  ["DESACTIVADA", "Desactivadas"]
];

const VACIO = {
  nombre: "",
  tipo: "PORCENTAJE",
  valor: "",
  aplicaA: "TODOS",
  referenciaId: "",
  cantidadMinima: "1",
  fechaInicio: "",
  fechaFin: "",
  activa: true
};

const normalizar = (valor) =>
  String(valor ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

const limpiarNombre = (v) =>
  String(v ?? "")
    .replace(/[^\p{L}\p{N}\s.,%+&'-]/gu, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^\s+/, "")
    .slice(0, 50);

const sinSignos = (e) => {
  if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
};

function fechaCorta(texto) {
  if (!texto) return "";
  const [anio, mes, dia] = texto.split("-").map(Number);
  return new Date(anio, mes - 1, dia).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" });
}

function vigencia(p) {
  if (p.fechaInicio && p.fechaFin) return `Del ${fechaCorta(p.fechaInicio)} al ${fechaCorta(p.fechaFin)}`;
  if (p.fechaInicio) return `Desde el ${fechaCorta(p.fechaInicio)}`;
  if (p.fechaFin) return `Hasta el ${fechaCorta(p.fechaFin)}`;
  return "Sin fecha límite";
}

export default function PromocionesPage() {
  const { usuario } = useAuth();
  const confirmar = useConfirmar();
  const empresaId = usuario?.empresaId;

  const [promos, setPromos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("TODAS");

  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState("");
  const [aviso, setAviso] = useState("");

  const hoy = hoyLocal();

  useEffect(() => {
    if (!empresaId) return undefined;

    const cancelar = suscribirColeccionEmpresa(
      "promociones",
      empresaId,
      (datos) => {
        setPromos(datos);
        setCargando(false);
      },
      (error) => {
        console.error(error);
        setCargando(false);
      }
    );

    const leer = (nombre) =>
      getDocs(query(collection(db, nombre), where("empresaId", "==", empresaId))).then((r) =>
        r.docs.map((d) => ({ id: d.id, ...d.data() }))
      );

    leer("productos").then(setProductos).catch(console.error);
    leer("categorias").then(setCategorias).catch(console.error);

    return () => {
      if (typeof cancelar === "function") cancelar();
    };
  }, [empresaId]);

  const nombreProducto = (id) => productos.find((p) => p.id === id)?.nombre || "Producto eliminado";
  const nombreCategoria = (id) => categorias.find((c) => c.id === id)?.nombre || "Categoría eliminada";

  const aQuienAplica = (p) => {
    if (p.aplicaA === "PRODUCTO") return nombreProducto(p.referenciaId);
    if (p.aplicaA === "CATEGORIA") return `Categoría ${nombreCategoria(p.referenciaId)}`;
    return "Todos los productos";
  };

  const conEstado = useMemo(() => promos.map((p) => ({ ...p, vigencia: estadoPromocion(p, hoy) })), [promos, hoy]);

  const vigentes = conEstado.filter((p) => p.vigencia === "VIGENTE").length;
  const apagadas = conEstado.filter((p) => p.vigencia === "DESACTIVADA").length;

  const visibles = conEstado.filter((p) => {
    if (filtro !== "TODAS" && p.vigencia !== filtro) return false;
    const texto = normalizar(busqueda);
    return !texto || normalizar(p.nombre).includes(texto) || normalizar(aQuienAplica(p)).includes(texto);
  });

  const opcionesProducto = productos
    .filter((p) => p.estado === "ACTIVO")
    .map((p) => ({ valor: p.id, etiqueta: p.sku ? `${p.nombre} · ${p.sku}` : p.nombre }));

  const opcionesCategoria = categorias
    .filter((c) => c.estado !== "INACTIVA")
    .map((c) => ({ valor: c.id, etiqueta: c.nombre }));

  function abrirNueva() {
    setEditando(null);
    setForm(VACIO);
    setErrores({});
    setErrorGeneral("");
    setAbierto(true);
    sonidoClick();
  }

  function abrirEditar(p) {
    setEditando(p);
    setForm({
      nombre: p.nombre || "",
      tipo: p.tipo === "MONTO" ? "MONTO" : "PORCENTAJE",
      valor: String(p.valor ?? ""),
      aplicaA: ["PRODUCTO", "CATEGORIA"].includes(p.aplicaA) ? p.aplicaA : "TODOS",
      referenciaId: p.referenciaId || "",
      cantidadMinima: String(p.cantidadMinima || 1),
      fechaInicio: p.fechaInicio || "",
      fechaFin: p.fechaFin || "",
      activa: p.estado === "ACTIVO"
    });
    setErrores({});
    setErrorGeneral("");
    setAbierto(true);
    sonidoClick();
  }

  const poner = (campo, valor) => {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: "" }));
  };

  function validar() {
    const e = {};
    const nombre = form.nombre.trim();
    const valor = Number(form.valor);
    const minima = Number(form.cantidadMinima);

    if (nombre.length < 3) e.nombre = "Ponle un nombre de al menos 3 letras. Ej. Oferta de verano.";
    else if (promos.some((p) => p.id !== editando?.id && normalizar(p.nombre) === normalizar(nombre))) {
      e.nombre = "Ya tienes una promoción con ese nombre.";
    }

    if (form.valor === "" || !Number.isFinite(valor) || valor <= 0) e.valor = "Escribe cuánto se descuenta.";
    else if (form.tipo === "PORCENTAJE" && valor > 100) e.valor = "El porcentaje no puede pasar de 100.";
    else if (form.tipo === "MONTO" && valor > 100000) e.valor = "Ese monto es demasiado grande.";

    if (form.aplicaA !== "TODOS" && !form.referenciaId) {
      e.referenciaId = form.aplicaA === "PRODUCTO" ? "Elige el producto." : "Elige la categoría.";
    }

    if (!Number.isFinite(minima) || minima < 1 || !Number.isInteger(minima)) e.cantidadMinima = "Debe ser un número entero desde 1.";
    else if (minima > 10000) e.cantidadMinima = "Ese número es demasiado grande.";

    if (form.fechaInicio && form.fechaFin && form.fechaFin < form.fechaInicio) {
      e.fechaFin = "La fecha final no puede ser antes que la inicial.";
    } else if (form.fechaFin && form.fechaFin < hoy && !editando) {
      e.fechaFin = "Esa fecha ya pasó.";
    }

    return e;
  }

  async function guardar(evento) {
    evento.preventDefault();
    if (guardando) return;

    const e = validar();
    setErrores(e);
    setErrorGeneral("");

    if (Object.keys(e).length) {
      sonidoError();
      return;
    }

    const datos = {
      nombre: form.nombre.trim(),
      tipo: form.tipo,
      valor: Number(form.valor),
      aplicaA: form.aplicaA,
      referenciaId: form.aplicaA === "TODOS" ? "" : form.referenciaId,
      cantidadMinima: Number(form.cantidadMinima),
      fechaInicio: form.fechaInicio || "",
      fechaFin: form.fechaFin || "",
      estado: form.activa ? "ACTIVO" : "INACTIVO"
    };

    setGuardando(true);

    try {
      if (editando) await actualizarRegistro("promociones", editando.id, datos);
      else await crearRegistro("promociones", empresaId, datos);

      sonidoExito();
      setAviso(editando ? "Cambios guardados." : "Promoción creada. Ya se aplica sola en el punto de venta.");
      setAbierto(false);
    } catch (error) {
      console.error(error);
      sonidoError();
      setErrorGeneral("No pudimos guardar la promoción. Inténtalo otra vez.");
    } finally {
      setGuardando(false);
    }
  }

  async function alternar(p) {
    setAviso("");
    try {
      await actualizarRegistro("promociones", p.id, { estado: p.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO" });
      sonidoClick();
    } catch (error) {
      console.error(error);
      sonidoError();
      setAviso("No pudimos cambiar el estado. Inténtalo otra vez.");
    }
  }

  async function borrar(p) {
    const ok = await confirmar({
      titulo: "Eliminar promoción",
      mensaje: `Se eliminará "${p.nombre}". Las ventas ya hechas no cambian.`,
      accion: "Eliminar",
      peligro: true
    });
    if (!ok) return;

    try {
      await eliminarRegistro("promociones", p.id);
      sonidoExito();
      setAviso("Promoción eliminada.");
    } catch (error) {
      console.error(error);
      sonidoError();
      setAviso("No pudimos eliminarla. Inténtalo otra vez.");
    }
  }

  const resumen = (() => {
    if (!form.valor || Number(form.valor) <= 0) return "";
    const oferta = describirDescuento({ tipo: form.tipo, valor: form.valor });
    const donde =
      form.aplicaA === "PRODUCTO" && form.referenciaId
        ? `en ${nombreProducto(form.referenciaId)}`
        : form.aplicaA === "CATEGORIA" && form.referenciaId
          ? `en la categoría ${nombreCategoria(form.referenciaId)}`
          : form.aplicaA === "TODOS"
            ? "en todos los productos"
            : "";
    const minimo = Number(form.cantidadMinima) > 1 ? ` al llevar ${form.cantidadMinima} o más` : "";
    return `${oferta[0].toUpperCase()}${oferta.slice(1)} ${donde}${minimo}.`;
  })();

  return (
    <div className="re inv">
      <header className="re-cabecera">
        <div>
          <h1>Promociones</h1>
          <p>Descuentos que se aplican solos al cobrar. Tú los creas una vez y el punto de venta se encarga.</p>
        </div>

        <button type="button" className="re-boton" onClick={abrirNueva}>
          <Plus size={17} />
          Nueva promoción
        </button>
      </header>

      <section className="inv-metricas inv-metricas--tres" aria-label="Resumen">
        <article className="inv-metrica">
          <span className="inv-metrica__icono" aria-hidden="true">
            <Tag size={22} />
          </span>
          <div>
            <small>Promociones</small>
            <strong>{promos.length}</strong>
            <em>creadas</em>
          </div>
        </article>
        <article className="inv-metrica">
          <span className="inv-metrica__icono" aria-hidden="true">
            <Percent size={22} />
          </span>
          <div>
            <small>Vigentes hoy</small>
            <strong>{vigentes}</strong>
            <em>se aplican al cobrar</em>
          </div>
        </article>
        <article className="inv-metrica" data-tono={apagadas ? "alerta" : undefined}>
          <span className="inv-metrica__icono" aria-hidden="true">
            <Power size={22} />
          </span>
          <div>
            <small>Desactivadas</small>
            <strong>{apagadas}</strong>
            <em>en pausa</em>
          </div>
        </article>
      </section>

      <div className="re-herramientas">
        <label className="re-busqueda">
          <Search size={19} aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar promoción o producto…"
            aria-label="Buscar promociones"
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
        <div className="re-vacio">Cargando promociones…</div>
      ) : visibles.length === 0 ? (
        <div className="re-vacio">
          <Tag size={34} />
          <strong>{promos.length === 0 ? "Todavía no tienes promociones" : "No encontramos promociones"}</strong>
          <span>
            {promos.length === 0
              ? "Crea la primera: por ejemplo, 10% de descuento en una categoría."
              : "Prueba con otra búsqueda o cambia el filtro."}
          </span>
          {promos.length === 0 && (
            <button type="button" className="re-boton" onClick={abrirNueva}>
              <Plus size={17} />
              Crear mi primera promoción
            </button>
          )}
        </div>
      ) : (
        <div className="pr-lista">
          {visibles.map((p) => (
            <article className="pr-tarjeta" key={p.id} data-estado={p.vigencia}>
              <header>
                <span className="pr-oferta">
                  <b>{p.tipo === "MONTO" ? `Bs ${Number(p.valor)}` : `${Number(p.valor)}%`}</b>
                  <small>{p.tipo === "MONTO" ? "menos por unidad" : "de descuento"}</small>
                </span>
                <span className="inv-pastilla" data-estado={p.vigencia === "VIGENTE" ? "VIGENTE" : p.vigencia === "PROGRAMADA" ? "POR_VENCER" : p.vigencia === "VENCIDA" ? "VENCIDO" : "SIN_EXISTENCIAS"}>
                  {ETIQUETAS[p.vigencia]}
                </span>
              </header>

              <h2>{p.nombre}</h2>

              <dl>
                <div>
                  <dt>Aplica a</dt>
                  <dd>{aQuienAplica(p)}</dd>
                </div>
                {Number(p.cantidadMinima) > 1 && (
                  <div>
                    <dt>Al llevar</dt>
                    <dd>{p.cantidadMinima} unidades o más</dd>
                  </div>
                )}
                <div>
                  <dt>Vigencia</dt>
                  <dd>{vigencia(p)}</dd>
                </div>
              </dl>

              <footer>
                <button type="button" className="re-boton re-boton--suave re-boton--chico" onClick={() => abrirEditar(p)}>
                  <Pencil size={15} />
                  Editar
                </button>
                <button
                  type="button"
                  className="re-boton re-boton--suave re-boton--chico"
                  onClick={() => alternar(p)}
                  aria-label={p.estado === "ACTIVO" ? `Desactivar ${p.nombre}` : `Activar ${p.nombre}`}
                >
                  <Power size={15} />
                  {p.estado === "ACTIVO" ? "Pausar" : "Activar"}
                </button>
                <button
                  type="button"
                  className="re-boton re-boton--suave re-boton--chico re-boton--icono"
                  onClick={() => borrar(p)}
                  aria-label={`Eliminar ${p.nombre}`}
                >
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
              aria-labelledby="pr-titulo"
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
                  <h2 id="pr-titulo">{editando ? "Editar promoción" : "Nueva promoción"}</h2>
                  <p>Se aplica sola al cobrar, sin que el cajero haga nada.</p>
                </div>
                <button type="button" className="re-cerrar" onClick={() => setAbierto(false)} aria-label="Cerrar" disabled={guardando}>
                  <X size={18} />
                </button>
              </header>

              <div className="re-modal__cuerpo">
                <label className="re-campo">
                  <span className="re-etiqueta-campo">
                    Nombre <b>*</b>
                  </span>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={(e) => poner("nombre", limpiarNombre(e.target.value))}
                    placeholder="Ej. Oferta de verano"
                    aria-invalid={Boolean(errores.nombre)}
                    autoFocus
                  />
                  {errores.nombre && <small className="re-ayuda" data-error="true">{errores.nombre}</small>}
                </label>

                <div className="re-campo">
                  <span className="re-etiqueta-campo">¿Cómo descuentas?</span>
                  <div className="pr-opciones" role="radiogroup" aria-label="Tipo de descuento">
                    {[
                      ["PORCENTAJE", "Un porcentaje", "Ej. 10% menos"],
                      ["MONTO", "Un monto fijo", "Ej. Bs 2 menos por unidad"]
                    ].map(([valor, titulo, ejemplo]) => (
                      <button
                        key={valor}
                        type="button"
                        role="radio"
                        aria-checked={form.tipo === valor}
                        className="pr-opcion"
                        data-activo={form.tipo === valor}
                        onClick={() => {
                          poner("tipo", valor);
                          sonidoClick();
                        }}
                      >
                        <strong>{titulo}</strong>
                        <small>{ejemplo}</small>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="re-campos co-iguales">
                  <label className="re-campo">
                    <span className="re-etiqueta-campo">
                      {form.tipo === "PORCENTAJE" ? "Porcentaje (%)" : "Descuento por unidad (Bs)"} <b>*</b>
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={form.valor}
                      onKeyDown={sinSignos}
                      onChange={(e) => poner("valor", e.target.value)}
                      placeholder={form.tipo === "PORCENTAJE" ? "10" : "2.00"}
                      aria-invalid={Boolean(errores.valor)}
                    />
                    {errores.valor && <small className="re-ayuda" data-error="true">{errores.valor}</small>}
                  </label>

                  <label className="re-campo">
                    <span className="re-etiqueta-campo">Se aplica desde (unidades)</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      step="1"
                      value={form.cantidadMinima}
                      onKeyDown={sinSignos}
                      onChange={(e) => poner("cantidadMinima", e.target.value)}
                      aria-invalid={Boolean(errores.cantidadMinima)}
                    />
                    <small className="re-ayuda" data-error={Boolean(errores.cantidadMinima)}>
                      {errores.cantidadMinima || "1 = siempre. 3 = al llevar 3 o más."}
                    </small>
                  </label>
                </div>

                <div className="re-campo">
                  <span className="re-etiqueta-campo">¿En qué productos?</span>
                  <div className="pr-opciones pr-opciones--tres" role="radiogroup" aria-label="A qué se aplica">
                    {[
                      ["TODOS", "Todos"],
                      ["PRODUCTO", "Un producto"],
                      ["CATEGORIA", "Una categoría"]
                    ].map(([valor, titulo]) => (
                      <button
                        key={valor}
                        type="button"
                        role="radio"
                        aria-checked={form.aplicaA === valor}
                        className="pr-opcion pr-opcion--simple"
                        data-activo={form.aplicaA === valor}
                        onClick={() => {
                          setForm((f) => ({ ...f, aplicaA: valor, referenciaId: "" }));
                          setErrores((er) => ({ ...er, referenciaId: "" }));
                          sonidoClick();
                        }}
                      >
                        <strong>{titulo}</strong>
                      </button>
                    ))}
                  </div>
                </div>

                {form.aplicaA !== "TODOS" && (
                  <div className="re-campo">
                    <SelectorBuscable
                      etiqueta={form.aplicaA === "PRODUCTO" ? "Producto *" : "Categoría *"}
                      valor={form.referenciaId}
                      opciones={form.aplicaA === "PRODUCTO" ? opcionesProducto : opcionesCategoria}
                      onChange={(valor) => poner("referenciaId", valor)}
                      placeholder={form.aplicaA === "PRODUCTO" ? "Busca el producto" : "Elige la categoría"}
                      placeholderBusqueda="Escribe para buscar…"
                      vacio="No encontramos nada con ese nombre"
                    />
                    {errores.referenciaId && <small className="re-ayuda" data-error="true">{errores.referenciaId}</small>}
                  </div>
                )}

                <div className="re-campos co-iguales">
                  <label className="re-campo">
                    <span className="re-etiqueta-campo">
                      <CalendarDays size={14} /> Empieza (opcional)
                    </span>
                    <input type="date" value={form.fechaInicio} max="2099-12-31" onChange={(e) => poner("fechaInicio", e.target.value)} />
                  </label>

                  <label className="re-campo">
                    <span className="re-etiqueta-campo">
                      <CalendarDays size={14} /> Termina (opcional)
                    </span>
                    <input
                      type="date"
                      value={form.fechaFin}
                      min={form.fechaInicio || undefined}
                      max="2099-12-31"
                      onChange={(e) => poner("fechaFin", e.target.value)}
                      aria-invalid={Boolean(errores.fechaFin)}
                    />
                    {errores.fechaFin && <small className="re-ayuda" data-error="true">{errores.fechaFin}</small>}
                  </label>
                </div>

                <label className="pr-activa">
                  <input type="checkbox" checked={form.activa} onChange={(e) => poner("activa", e.target.checked)} />
                  <span>
                    <strong>Promoción activa</strong>
                    <small>Si la pausas, deja de aplicarse al cobrar.</small>
                  </span>
                </label>

                {resumen && (
                  <div className="re-aviso inv-guia">
                    <Info size={18} />
                    <span>{resumen}</span>
                  </div>
                )}

                {errorGeneral && (
                  <div className="re-aviso re-aviso--error" role="alert">
                    {errorGeneral}
                  </div>
                )}
              </div>

              <footer className="re-modal__pie">
                <button type="button" className="re-boton re-boton--suave" onClick={() => setAbierto(false)} disabled={guardando}>
                  Cancelar
                </button>
                <button type="submit" className="re-boton" disabled={guardando}>
                  {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Crear promoción"}
                </button>
              </footer>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
