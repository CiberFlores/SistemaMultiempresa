import { useEffect, useMemo, useState } from "react";
import mensajeError from "../../utils/mensajeError";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Power,
  Search,
  Store,
  Trash2,
  X
} from "lucide-react";

import useAuth from "../../hooks/useAuth";
import useConfirmar from "../../hooks/useConfirmar";
import LocationPicker from "../../components/common/LocationPicker";
import {
  actualizarSucursal,
  cambiarEstadoSucursal,
  crearSucursal,
  eliminarSucursal,
  suscribirSucursales
} from "../../services/sucursalService";
import { sonidoExito } from "../../utils/sonidos";

import "../../styles/roles-empresa.css";
import "../../styles/trabajadores-empresa.css";
import "../../styles/sucursales-empresa.css";

const ubicacionInicial = {
  paisCodigo: "BO",
  paisNombre: "Bolivia",
  regionCodigo: "",
  regionNombre: "",
  ciudad: "",
  provincia: "",
  direccion: ""
};

const formularioInicial = { nombre: "", codigo: "", telefono: "", ubicacion: ubicacionInicial };

function normalizar(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// Nombre: letras, números, espacios y . - / & '
function limpiarNombre(valor) {
  return String(valor ?? "")
    .replace(/[^\p{L}\p{N}\s.\-/&']/gu, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^\s+/, "")
    .slice(0, 50);
}

// Código: letras, números y guion, en mayúsculas
function limpiarCodigo(valor) {
  return String(valor ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 12);
}

function limpiarTelefono(valor) {
  return String(valor ?? "").replace(/\D/g, "").slice(0, 12);
}

const lugarDe = (fila) => {
  const u = fila.ubicacion || {};
  return [u.ciudad || fila.ciudad, u.regionNombre || fila.region, u.paisNombre || fila.pais]
    .filter(Boolean)
    .join(", ");
};

export default function SucursalesPage() {
  const { usuario } = useAuth();
  const confirmar = useConfirmar();

  const [rows, setRows] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState("TODOS");
  const [pais, setPais] = useState("TODOS");
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(formularioInicial);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [tocado, setTocado] = useState({});

  useEffect(() => {
    if (!usuario?.empresaId) return undefined;

    return suscribirSucursales(
      usuario.empresaId,
      (datos) => {
        setRows(datos);
        setCargando(false);
      },
      console.error
    );
  }, [usuario?.empresaId]);

  useEffect(() => {
    if (!abierto) return undefined;

    const alTeclear = (evento) => {
      if (evento.key === "Escape" && !guardando) setAbierto(false);
    };

    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [abierto, guardando]);

  useEffect(() => {
    if (!aviso) return undefined;
    const temporizador = setTimeout(() => setAviso(""), 4500);
    return () => clearTimeout(temporizador);
  }, [aviso]);

  const paises = useMemo(() => {
    const mapa = new Map();
    rows.forEach((fila) => {
      const codigo = fila.paisCodigo || fila.ubicacion?.paisCodigo;
      const nombre = fila.ubicacion?.paisNombre || fila.pais;
      if (codigo) mapa.set(codigo, nombre || codigo);
    });
    return [...mapa.entries()].map(([valor, etiqueta]) => ({ valor, etiqueta }));
  }, [rows]);

  const filtradas = useMemo(() => {
    const texto = normalizar(busqueda);

    return rows.filter((fila) => {
      const u = fila.ubicacion || {};
      const coincide =
        !texto ||
        [fila.nombre, fila.codigo, fila.telefono, lugarDe(fila), u.direccion || fila.direccion].some(
          (valor) => normalizar(valor).includes(texto)
        );

      const estadoOk = estado === "TODOS" || fila.estado === estado;
      const paisOk = pais === "TODOS" || (fila.paisCodigo || u.paisCodigo) === pais;

      return coincide && estadoOk && paisOk;
    });
  }, [rows, busqueda, estado, pais]);

  const activas = rows.filter((fila) => fila.estado === "ACTIVA").length;
  const ciudades = new Set(rows.map((fila) => normalizar(fila.ubicacion?.ciudad || fila.ciudad)).filter(Boolean)).size;

  const abrirNueva = () => {
    setEditando(null);
    setForm(formularioInicial);
    setError("");
    setTocado({});
    setAbierto(true);
  };

  const abrirEditar = (fila) => {
    setEditando(fila);
    setForm({
      nombre: fila.nombre || "",
      codigo: fila.codigo || "",
      telefono: limpiarTelefono(fila.telefono || ""),
      ubicacion: fila.ubicacion || {
        ...ubicacionInicial,
        paisCodigo: fila.paisCodigo || "BO",
        paisNombre: fila.pais || "Bolivia",
        regionCodigo: fila.regionCodigo || "",
        regionNombre: fila.region || "",
        ciudad: fila.ciudad || "",
        direccion: fila.direccion || ""
      }
    });
    setError("");
    setTocado({});
    setAbierto(true);
  };

  const cerrar = () => {
    if (guardando) return;
    setAbierto(false);
  };

  // Validación
  const nombreLimpio = form.nombre.trim();
  const codigoLimpio = form.codigo.trim();

  let errorNombre = "";
  if (!nombreLimpio) errorNombre = "Escribe el nombre de la sucursal.";
  else if (nombreLimpio.length < 3) errorNombre = "El nombre necesita al menos 3 caracteres.";
  else if (
    rows.some((fila) => fila.id !== editando?.id && normalizar(fila.nombre) === normalizar(nombreLimpio))
  ) {
    errorNombre = "Ya tienes una sucursal con ese nombre.";
  }

  let errorCodigo = "";
  if (!codigoLimpio) errorCodigo = "Escribe un código corto, por ejemplo SUC-01.";
  else if (codigoLimpio.length < 2) errorCodigo = "El código necesita al menos 2 caracteres.";
  else if (rows.some((fila) => fila.id !== editando?.id && String(fila.codigo || "").toUpperCase() === codigoLimpio)) {
    errorCodigo = "Ese código ya lo usa otra sucursal.";
  }

  const errorTelefono =
    form.telefono && form.telefono.length < 7 ? "El teléfono tiene entre 7 y 12 números." : "";

  const valido = !errorNombre && !errorCodigo && !errorTelefono;
  const marcar = (campo) => setTocado((previo) => ({ ...previo, [campo]: true }));

  const guardar = async (evento) => {
    evento.preventDefault();
    setTocado({ nombre: true, codigo: true, telefono: true });

    if (!valido) {
      setError(errorNombre || errorCodigo || errorTelefono);
      return;
    }

    try {
      setGuardando(true);
      setError("");

      const datos = { ...form, nombre: nombreLimpio, codigo: codigoLimpio };

      if (editando) {
        await actualizarSucursal(editando.id, datos);
        setAviso(`Sucursal «${nombreLimpio}» actualizada.`);
      } else {
        await crearSucursal(usuario.empresaId, datos);
        setAviso(`Sucursal «${nombreLimpio}» creada.`);
      }

      sonidoExito();
      setAbierto(false);
    } catch (fallo) {
      console.error(fallo);
      setError(mensajeError(fallo, "No se pudo guardar la sucursal."));
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (fila) => {
    const activar = fila.estado !== "ACTIVA";

    const confirmado = await confirmar({
      titulo: activar ? "Activar sucursal" : "Desactivar sucursal",
      mensaje: activar
        ? `«${fila.nombre}» volverá a aparecer para vender y asignar trabajadores.`
        : `«${fila.nombre}» dejará de aparecer en el punto de venta mientras esté inactiva.`,
      accion: activar ? "Activar" : "Desactivar",
      peligro: !activar
    });

    if (!confirmado) return;

    try {
      await cambiarEstadoSucursal(fila.id, activar ? "ACTIVA" : "INACTIVA");
      setAviso(`«${fila.nombre}» ${activar ? "activada" : "desactivada"}.`);
    } catch (fallo) {
      console.error(fallo);
      setError("No se pudo cambiar el estado de la sucursal.");
    }
  };

  const borrar = async (fila) => {
    const confirmado = await confirmar({
      titulo: "Eliminar sucursal",
      mensaje: `Se eliminará «${fila.nombre}» para siempre. Si ya tiene ventas o inventario, mejor desactívala.`,
      accion: "Eliminar",
      peligro: true
    });

    if (!confirmado) return;

    try {
      await eliminarSucursal(fila.id);
      setAviso(`Sucursal «${fila.nombre}» eliminada.`);
    } catch (fallo) {
      console.error(fallo);
      setError(
        fallo?.code === "permission-denied"
          ? "No se puede eliminar esta sucursal porque ya tiene movimientos. Desactívala."
          : "No se pudo eliminar la sucursal."
      );
    }
  };

  const metricas = [
    { titulo: "Sucursales", valor: rows.length, nota: "registradas", icono: Store },
    { titulo: "Activas", valor: activas, nota: "pueden vender", icono: Check },
    { titulo: "Ciudades", valor: ciudades, nota: "donde tienes presencia", icono: MapPin }
  ];

  return (
    <div className="re tr su">
      <header className="re-cabecera">
        <div>
          <h1>Sucursales</h1>
          <p>Los locales de tu negocio. Ahí vendes y asignas a tus trabajadores.</p>
        </div>

        <button type="button" className="re-boton" onClick={abrirNueva}>
          <Plus size={19} />
          Nueva sucursal
        </button>
      </header>

      {aviso && (
        <div className="re-aviso re-aviso--ok" role="status">
          <Check size={18} />
          {aviso}
        </div>
      )}

      {error && !abierto && (
        <div className="re-aviso re-aviso--error" role="alert">
          {error}
        </div>
      )}

      <section className="tr-metricas" aria-label="Resumen">
        {metricas.map(({ titulo, valor, nota, icono: Icono }) => (
          <article className="tr-metrica" key={titulo}>
            <span className="tr-metrica__icono" aria-hidden="true">
              <Icono size={22} />
            </span>
            <div>
              <small>{titulo}</small>
              <strong>{valor}</strong>
              <em>{nota}</em>
            </div>
          </article>
        ))}
      </section>

      <div className="re-herramientas">
        <label className="re-busqueda">
          <Search size={19} aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar por nombre, código, ciudad o dirección…"
            aria-label="Buscar sucursal"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </label>

        <div className="re-filtros" role="radiogroup" aria-label="Estado">
          {[
            ["TODOS", "Todas"],
            ["ACTIVA", "Activas"],
            ["INACTIVA", "Inactivas"]
          ].map(([valor, texto]) => (
            <button
              key={valor}
              type="button"
              role="radio"
              aria-checked={estado === valor}
              className="re-chip"
              data-activo={estado === valor}
              onClick={() => setEstado(valor)}
            >
              {texto}
            </button>
          ))}
        </div>

        {paises.length > 1 && (
          <label className="tr-selector">
            <select value={pais} onChange={(e) => setPais(e.target.value)} aria-label="Filtrar por país">
              <option value="TODOS">Todos los países</option>
              {paises.map((item) => (
                <option key={item.valor} value={item.valor}>
                  {item.etiqueta}
                </option>
              ))}
            </select>
            <ChevronDown size={17} aria-hidden="true" />
          </label>
        )}

        <span className="re-contador">
          {filtradas.length} {filtradas.length === 1 ? "sucursal" : "sucursales"}
        </span>
      </div>

      {cargando ? (
        <div className="re-vacio">Cargando sucursales…</div>
      ) : filtradas.length === 0 ? (
        <div className="re-vacio">
          <Store size={36} />
          <strong>{rows.length === 0 ? "Todavía no tienes sucursales" : "No encontramos sucursales"}</strong>
          <span>
            {rows.length === 0
              ? "Crea la primera para empezar a vender y asignar trabajadores."
              : "Prueba con otra búsqueda o cambia los filtros."}
          </span>
          {rows.length === 0 && (
            <button type="button" className="re-boton" onClick={abrirNueva}>
              <Plus size={18} /> Crear una sucursal
            </button>
          )}
        </div>
      ) : (
        <ul className="re-lista tr-lista">
          {filtradas.map((fila) => {
            const u = fila.ubicacion || {};
            const direccion = u.direccion || fila.direccion;

            return (
              <li key={fila.id} className="re-rol tr-tarjeta" data-inactivo={fila.estado !== "ACTIVA"}>
                <div className="tr-tarjeta__cabecera">
                  <span className="tr-avatar su-icono" aria-hidden="true">
                    <Store size={24} />
                  </span>
                  <div className="tr-tarjeta__titulo">
                    <h2>{fila.nombre}</h2>
                    <span className="su-codigo">{fila.codigo || "Sin código"}</span>
                  </div>
                </div>

                <dl className="tr-datos">
                  <div>
                    <dt>
                      <MapPin size={15} aria-hidden="true" />
                      <span className="tr-oculto">Ubicación</span>
                    </dt>
                    <dd>
                      {lugarDe(fila) || "Sin ubicación"}
                      {direccion && <small className="su-direccion">{direccion}</small>}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      <Phone size={15} aria-hidden="true" />
                      <span className="tr-oculto">Teléfono</span>
                    </dt>
                    <dd>{fila.telefono || "Sin teléfono"}</dd>
                  </div>
                </dl>

                <div className="tr-estados">
                  <span className="re-estado" data-estado={fila.estado === "ACTIVA" ? "ACTIVO" : "INACTIVO"}>
                    {fila.estado === "ACTIVA" ? "Activa" : "Inactiva"}
                  </span>
                </div>

                <div className="re-rol__acciones">
                  <button type="button" className="re-boton re-boton--suave" onClick={() => abrirEditar(fila)}>
                    <Pencil size={16} />
                    Editar
                  </button>
                  <button
                    type="button"
                    className="re-boton re-boton--suave re-boton--icono"
                    onClick={() => cambiarEstado(fila)}
                    title={fila.estado === "ACTIVA" ? "Desactivar" : "Activar"}
                    aria-label={fila.estado === "ACTIVA" ? `Desactivar ${fila.nombre}` : `Activar ${fila.nombre}`}
                  >
                    <Power size={17} />
                  </button>
                  <button
                    type="button"
                    className="re-boton re-boton--suave re-boton--icono su-peligro"
                    onClick={() => borrar(fila)}
                    title="Eliminar"
                    aria-label={`Eliminar ${fila.nombre}`}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AnimatePresence>
        {abierto && (
          <motion.div
            className="re-fondo"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={cerrar}
          >
            <motion.form
              className="re-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="su-modal-titulo"
              initial={{ opacity: 0, scale: 0.96, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              onMouseDown={(e) => e.stopPropagation()}
              onSubmit={guardar}
              noValidate
              autoComplete="off"
            >
              <header className="re-modal__cabecera">
                <div>
                  <h2 id="su-modal-titulo">{editando ? "Editar sucursal" : "Nueva sucursal"}</h2>
                  <p>Datos del local y dónde queda.</p>
                </div>
                <button type="button" className="re-cerrar" onClick={cerrar} aria-label="Cerrar" disabled={guardando}>
                  <X size={18} />
                </button>
              </header>

              <div className="re-modal__cuerpo">
                <div className="re-campos">
                  <label className="re-campo">
                    <span className="re-etiqueta-campo">
                      Nombre <b>*</b>
                    </span>
                    <input
                      name="sucursal-nombre"
                      value={form.nombre}
                      onChange={(e) => setForm({ ...form, nombre: limpiarNombre(e.target.value) })}
                      onBlur={() => marcar("nombre")}
                      placeholder="Ej. Sucursal Central"
                      maxLength={50}
                      autoComplete="off"
                      autoFocus
                      aria-invalid={Boolean(tocado.nombre && errorNombre)}
                      disabled={guardando}
                    />
                    <small className="re-ayuda" data-error={Boolean(tocado.nombre && errorNombre)}>
                      {tocado.nombre && errorNombre ? errorNombre : `${form.nombre.length}/50`}
                    </small>
                  </label>

                  <label className="re-campo">
                    <span className="re-etiqueta-campo">
                      Código <b>*</b>
                    </span>
                    <input
                      name="sucursal-codigo"
                      value={form.codigo}
                      onChange={(e) => setForm({ ...form, codigo: limpiarCodigo(e.target.value) })}
                      onBlur={() => marcar("codigo")}
                      placeholder="SUC-01"
                      maxLength={12}
                      autoComplete="off"
                      aria-invalid={Boolean(tocado.codigo && errorCodigo)}
                      disabled={guardando}
                    />
                    <small className="re-ayuda" data-error={Boolean(tocado.codigo && errorCodigo)}>
                      {tocado.codigo && errorCodigo ? errorCodigo : "Letras, números y guion. No se repite."}
                    </small>
                  </label>

                  <label className="re-campo">
                    <span className="re-etiqueta-campo">Teléfono (opcional)</span>
                    <input
                      name="sucursal-telefono"
                      value={form.telefono}
                      onChange={(e) => setForm({ ...form, telefono: limpiarTelefono(e.target.value) })}
                      onBlur={() => marcar("telefono")}
                      placeholder="Solo números"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={12}
                      autoComplete="off"
                      aria-invalid={Boolean(tocado.telefono && errorTelefono)}
                      disabled={guardando}
                    />
                    <small className="re-ayuda" data-error={Boolean(tocado.telefono && errorTelefono)}>
                      {tocado.telefono && errorTelefono ? errorTelefono : "Entre 7 y 12 números."}
                    </small>
                  </label>
                </div>

                <fieldset className="re-grupo su-lugar">
                  <legend>
                    <span>Ubicación</span>
                  </legend>
                  <LocationPicker value={form.ubicacion} onChange={(ubicacion) => setForm({ ...form, ubicacion })} />
                </fieldset>

                {error && (
                  <div className="re-aviso re-aviso--error" role="alert">
                    {error}
                  </div>
                )}
              </div>

              <footer className="re-modal__pie">
                <button type="button" className="re-boton re-boton--suave" onClick={cerrar} disabled={guardando}>
                  Cancelar
                </button>
                <button type="submit" className="re-boton" disabled={guardando}>
                  {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Crear sucursal"}
                </button>
              </footer>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
