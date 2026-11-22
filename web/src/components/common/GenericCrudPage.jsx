import { useContext, useEffect, useMemo, useState } from "react";
import { ConfirmContext } from "../../context/ConfirmContext";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Eye, Pencil, Plus, Power, Search, Trash2, X } from "lucide-react";
import useAuth from "../../hooks/useAuth";
import {
  actualizarRegistro,
  crearRegistro,
  eliminarRegistro,
  suscribirColeccionEmpresa
} from "../../services/genericCrudService";
import { registrarAuditoria } from "../../services/auditService";
import { sonidoExito } from "../../utils/sonidos";

import "../../styles/roles-empresa.css";
import "../../styles/trabajadores-empresa.css";
import "../../styles/crud-generico.css";

const POR_PAGINA = 24;
const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const normalizar = (valor) =>
  String(valor ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

function formatDetailValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (value?.toDate) return value.toDate().toLocaleString("es-BO");
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

// Cada campo se limpia según lo que es: teléfono solo números, correo en minúsculas,
// código en mayúsculas, y el resto texto sin espacios de más.
function reglaDelCampo(campo) {
  const clave = normalizar(campo.key);

  if (campo.type === "email" || /correo|email/.test(clave)) {
    return {
      limpiar: (v) => String(v ?? "").replace(/\s/g, "").toLowerCase().slice(0, 80),
      validar: (v) => (v && !REGEX_CORREO.test(v) ? "El correo no tiene un formato válido." : "")
    };
  }

  if (/telefono|celular|whatsapp/.test(clave)) {
    return {
      limpiar: (v) => String(v ?? "").replace(/\D/g, "").slice(0, 12),
      validar: (v) => (v && v.length < 7 ? "Escribe entre 7 y 12 números." : ""),
      numerico: true
    };
  }

  if (clave === "nit") {
    return {
      limpiar: (v) => String(v ?? "").replace(/\D/g, "").slice(0, 15),
      validar: (v) => (v && v.length < 5 ? "El NIT o documento lleva entre 5 y 15 números." : ""),
      numerico: true
    };
  }

  if (clave === "contacto") {
    return {
      limpiar: (v) =>
        String(v ?? "")
          .replace(/[^\p{L}\s.'-]/gu, "")
          .replace(/\s{2,}/g, " ")
          .replace(/^\s+/, "")
          .slice(0, 60),
      validar: (v) => (v && v.trim().length < 3 ? "Escribe el nombre de la persona (mínimo 3 letras)." : ""),
      maximo: 60
    };
  }

  if (clave === "codigo") {
    return {
      limpiar: (v) => String(v ?? "").toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, campo.maxLength || 20),
      validar: () => ""
    };
  }

  if (campo.type === "number" || campo.type === "date" || campo.type === "select") {
    return { limpiar: (v) => v, validar: () => "" };
  }

  const maximo = campo.maxLength || (campo.type === "textarea" ? 300 : 80);

  return {
    limpiar: (v) => String(v ?? "").replace(/[ \t]{2,}/g, " ").replace(/^\s+/, "").slice(0, maximo),
    validar: () => "",
    maximo
  };
}

export default function GenericCrudPage({
  title,
  description,
  collectionName,
  fields,
  searchFields,
  entityLabel = "registro",
  defaultValues = {},
  statusField = "estado",
  statusActive = "ACTIVO",
  statusInactive = "INACTIVO",
  extraFilters = [],
  transformBeforeSave,
  columns,
  allowDelete = true,
  globalCollection = false,
  unicos = []
}) {
  const { usuario } = useAuth();
  const confirmar = useContext(ConfirmContext);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("TODOS");
  const [filters, setFilters] = useState(() => Object.fromEntries(extraFilters.map((f) => [f.key, "TODOS"])));
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minNumber, setMinNumber] = useState("");
  const [maxNumber, setMaxNumber] = useState("");
  const dateField = fields.find((f) => f.type === "date");
  const numberField = fields.find((f) => f.type === "number");
  const [form, setForm] = useState(defaultValues);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [tocado, setTocado] = useState({});
  const [limite, setLimite] = useState(POR_PAGINA);

  const reglas = useMemo(() => Object.fromEntries(fields.map((f) => [f.key, reglaDelCampo(f)])), [fields]);

  useEffect(() => {
    if (!globalCollection && !usuario?.empresaId) return undefined;
    return suscribirColeccionEmpresa(
      collectionName,
      globalCollection ? null : usuario.empresaId,
      (data) => {
        setRows(data);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError("No se pudo cargar la información.");
        setLoading(false);
      },
      { globalCollection }
    );
  }, [collectionName, globalCollection, usuario?.empresaId]);

  useEffect(() => {
    if (!aviso) return undefined;
    const temporizador = setTimeout(() => setAviso(""), 4500);
    return () => clearTimeout(temporizador);
  }, [aviso]);

  useEffect(() => {
    if (!open && !detail) return undefined;

    const alTeclear = (evento) => {
      if (evento.key !== "Escape") return;
      if (detail) setDetail(null);
      else if (!saving) {
        setOpen(false);
        setEditing(null);
      }
    };

    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [open, detail, saving]);

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        const matchesSearch =
          !search ||
          (searchFields || fields.map((f) => f.key)).some((key) => normalizar(row[key]).includes(normalizar(search)));

        const currentStatus = row[statusField] ?? statusActive;
        const matchesStatus = status === "TODOS" || currentStatus === status;
        const matchesExtra = extraFilters.every(
          (filter) => filters[filter.key] === "TODOS" || String(row[filter.key] ?? "") === String(filters[filter.key])
        );

        const rowDate = dateField ? row[dateField.key] : null;
        const dateValue = rowDate?.toDate?.() || (rowDate ? new Date(`${rowDate}T12:00:00`) : null);
        const matchesDate =
          !dateField ||
          ((!dateFrom || !dateValue || dateValue >= new Date(`${dateFrom}T00:00:00`)) &&
            (!dateTo || !dateValue || dateValue <= new Date(`${dateTo}T23:59:59`)));

        const numeric = numberField ? Number(row[numberField.key] || 0) : 0;
        const matchesNumber =
          !numberField ||
          ((minNumber === "" || numeric >= Number(minNumber)) && (maxNumber === "" || numeric <= Number(maxNumber)));

        return matchesSearch && matchesStatus && matchesExtra && matchesDate && matchesNumber;
      }),
    [
      rows,
      search,
      status,
      filters,
      fields,
      searchFields,
      statusField,
      statusActive,
      extraFilters,
      dateFrom,
      dateTo,
      minNumber,
      maxNumber,
      dateField,
      numberField
    ]
  );

  const activos = rows.filter((row) => (row[statusField] ?? statusActive) === statusActive).length;
  const visibles = filtered.slice(0, limite);
  const hayMas = filtered.length > limite;
  const esFemenino = /(a|ción|sión|dad)$/i.test(entityLabel);
  const nuevoTexto = `${esFemenino ? "Nueva" : "Nuevo"} ${entityLabel}`;

  const visibleColumns = columns || fields.slice(0, 5).map((field) => ({ key: field.key, label: field.label }));
  const columnaTitulo = visibleColumns[0];
  const otrasColumnas = visibleColumns.slice(1);

  const openNew = () => {
    setEditing(null);
    setForm(defaultValues);
    setError("");
    setTocado({});
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({ ...defaultValues, ...row });
    setError("");
    setTocado({});
    setOpen(true);
  };

  const close = () => {
    if (!saving) {
      setOpen(false);
      setEditing(null);
      setForm(defaultValues);
      setError("");
    }
  };

  const cambiarCampo = (campo, valor) => {
    const regla = reglas[campo.key];
    setForm((prev) => ({ ...prev, [campo.key]: regla ? regla.limpiar(valor) : valor }));
  };

  // Validación de cada campo
  const errorDe = (campo) => {
    const valor = String(form[campo.key] ?? "").trim();

    if (campo.required && !valor) return `${campo.label} es obligatorio.`;

    const mensaje = reglas[campo.key]?.validar(valor);
    if (mensaje) return mensaje;

    if (valor && unicos.includes(campo.key)) {
      const repetido = rows.some(
        (fila) => fila.id !== editing?.id && normalizar(fila[campo.key]) === normalizar(valor)
      );
      if (repetido) return `Ya existe ${esFemenino ? "una" : "un"} ${entityLabel} con ese ${campo.label.toLowerCase()}.`;
    }

    return "";
  };

  const errores = Object.fromEntries(fields.map((campo) => [campo.key, errorDe(campo)]));
  const primerError = fields.map((campo) => errores[campo.key]).find(Boolean) || "";

  const save = async (event) => {
    event.preventDefault();
    setTocado(Object.fromEntries(fields.map((campo) => [campo.key, true])));

    if (primerError) {
      setError(primerError);
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payloadBase = Object.fromEntries(
        fields.map((f) => [
          f.key,
          f.type === "number" ? Number(form[f.key] || 0) : typeof form[f.key] === "string" ? form[f.key].trim() : form[f.key] ?? ""
        ])
      );
      const payload = transformBeforeSave ? transformBeforeSave(payloadBase, form) : payloadBase;

      if (editing) {
        await actualizarRegistro(collectionName, editing.id, payload);
        await registrarAuditoria({
          empresaId: globalCollection ? null : usuario?.empresaId,
          usuarioId: usuario?.uid,
          usuarioNombre: usuario?.nombreCompleto || usuario?.correo || "",
          accion: "ACTUALIZAR",
          modulo: collectionName,
          entidad: entityLabel,
          entidadId: editing.id,
          detalle: `Actualizó ${entityLabel}`
        });
        setAviso(`Se guardaron los cambios.`);
      } else {
        const creado = await crearRegistro(
          collectionName,
          globalCollection ? null : usuario.empresaId,
          { ...payload, [statusField]: statusActive },
          { globalCollection }
        );
        await registrarAuditoria({
          empresaId: globalCollection ? null : usuario?.empresaId,
          usuarioId: usuario?.uid,
          usuarioNombre: usuario?.nombreCompleto || usuario?.correo || "",
          accion: "CREAR",
          modulo: collectionName,
          entidad: entityLabel,
          entidadId: creado?.id || "",
          detalle: `Creó ${entityLabel}`
        });
        setAviso(`${esFemenino ? "Nueva" : "Nuevo"} ${entityLabel} creado${esFemenino ? "a" : ""}.`);
      }

      sonidoExito();
      setOpen(false);
      setEditing(null);
      setForm(defaultValues);
      setError("");
    } catch (err) {
      setError(err.message || "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (row) => {
    const current = row[statusField] ?? statusActive;
    const next = current === statusActive ? statusInactive : statusActive;
    const desactivar = next === statusInactive;

    if (confirmar) {
      const confirmado = await confirmar({
        titulo: desactivar ? `Desactivar ${entityLabel}` : `Activar ${entityLabel}`,
        mensaje: desactivar
          ? `Este ${entityLabel} dejará de estar disponible hasta que lo actives otra vez.`
          : `Este ${entityLabel} volverá a estar disponible.`,
        accion: desactivar ? "Desactivar" : "Activar",
        peligro: desactivar
      });
      if (!confirmado) return;
    }

    try {
      await actualizarRegistro(collectionName, row.id, { [statusField]: next });
      await registrarAuditoria({
        empresaId: globalCollection ? null : usuario?.empresaId,
        usuarioId: usuario?.uid,
        usuarioNombre: usuario?.nombreCompleto || usuario?.correo || "",
        accion: "CAMBIAR_ESTADO",
        modulo: collectionName,
        entidad: entityLabel,
        entidadId: row.id,
        detalle: `${current} → ${next}`
      });
      setAviso(desactivar ? "Quedó desactivado." : "Quedó activado.");
    } catch (err) {
      console.error(err);
      setError(err.message || "No se pudo cambiar el estado.");
    }
  };

  const remove = async (row) => {
    const confirmado = confirmar
      ? await confirmar({
          titulo: `Eliminar ${entityLabel}`,
          mensaje: `Se eliminará definitivamente este ${entityLabel}. Esta acción no se puede deshacer.`,
          accion: "Eliminar",
          peligro: true
        })
      : window.confirm(`¿Eliminar definitivamente este ${entityLabel}? Esta acción no se puede deshacer.`);

    if (!confirmado) return;
    try {
      await eliminarRegistro(collectionName, row.id);
      await registrarAuditoria({
        empresaId: globalCollection ? null : usuario?.empresaId,
        usuarioId: usuario?.uid,
        usuarioNombre: usuario?.nombreCompleto || usuario?.correo || "",
        accion: "ELIMINAR",
        modulo: collectionName,
        entidad: entityLabel,
        entidadId: row.id,
        detalle: `Eliminó ${entityLabel}`
      });
      setAviso(`Se eliminó el ${entityLabel}.`);
    } catch (err) {
      setError(err.message || "No se pudo eliminar.");
    }
  };

  const limpiarFiltros = () => {
    setSearch("");
    setStatus("TODOS");
    setFilters(Object.fromEntries(extraFilters.map((f) => [f.key, "TODOS"])));
    setDateFrom("");
    setDateTo("");
    setMinNumber("");
    setMaxNumber("");
    setLimite(POR_PAGINA);
  };

  const hayFiltros =
    Boolean(search) ||
    status !== "TODOS" ||
    extraFilters.some((f) => filters[f.key] !== "TODOS") ||
    Boolean(dateFrom || dateTo || minNumber || maxNumber);

  const estadoDe = (row) => row[statusField] ?? statusActive;
  const estaActivo = (row) => estadoDe(row) === statusActive;

  const valorDeColumna = (col, row) => (col.render ? col.render(row) : String(row[col.key] ?? "").trim());
  const vacioValor = (valor) => valor === "" || valor === null || valor === undefined || valor === "-";

  const inicial = (row) => {
    const texto = String(row[columnaTitulo?.key] ?? "").trim();
    return (texto[0] || "•").toUpperCase();
  };

  const metricas = [
    { titulo: "Total", valor: rows.length, nota: "en total" },
    { titulo: "Activos", valor: activos, nota: "disponibles" },
    { titulo: "Inactivos", valor: rows.length - activos, nota: "desactivados" }
  ];

  return (
    <div className="re cg">
      <header className="re-cabecera">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <button type="button" className="re-boton" onClick={openNew}>
          <Plus size={19} />
          {nuevoTexto}
        </button>
      </header>

      {aviso && (
        <div className="re-aviso re-aviso--ok" role="status">
          <Check size={18} />
          {aviso}
        </div>
      )}

      {error && !open && (
        <div className="re-aviso re-aviso--error" role="alert">
          {error}
        </div>
      )}

      <section className="cg-metricas" aria-label="Resumen">
        {metricas.map((metrica) => (
          <article className="cg-metrica" key={metrica.titulo}>
            <small>{metrica.titulo}</small>
            <strong>{metrica.valor}</strong>
            <em>{metrica.nota}</em>
          </article>
        ))}
      </section>

      <div className="re-herramientas">
        <label className="re-busqueda">
          <Search size={19} aria-hidden="true" />
          <input
            type="search"
            placeholder={`Buscar ${entityLabel}…`}
            aria-label={`Buscar ${entityLabel}`}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setLimite(POR_PAGINA);
            }}
          />
        </label>

        <div className="re-filtros" role="radiogroup" aria-label="Estado">
          {[
            ["TODOS", "Todos"],
            [statusActive, "Activos"],
            [statusInactive, "Inactivos"]
          ].map(([valor, texto]) => (
            <button
              key={valor}
              type="button"
              role="radio"
              aria-checked={status === valor}
              className="re-chip"
              data-activo={status === valor}
              onClick={() => {
                setStatus(valor);
                setLimite(POR_PAGINA);
              }}
            >
              {texto}
            </button>
          ))}
        </div>

        {extraFilters.map((filter) => (
          <label className="tr-selector" key={filter.key}>
            <select
              value={filters[filter.key]}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, [filter.key]: e.target.value }));
                setLimite(POR_PAGINA);
              }}
              aria-label={filter.label}
            >
              <option value="TODOS">{filter.label}</option>
              {(filter.options || []).map((opcion) => (
                <option key={String(opcion.value)} value={opcion.value}>
                  {opcion.label}
                </option>
              ))}
            </select>
            <ChevronDown size={17} aria-hidden="true" />
          </label>
        ))}

        {hayFiltros && (
          <button type="button" className="re-chip" onClick={limpiarFiltros}>
            Limpiar filtros
          </button>
        )}

        <span className="re-contador">
          {filtered.length} de {rows.length}
        </span>
      </div>

      {(dateField || numberField) && (
        <div className="cg-rangos">
          {dateField && (
            <>
              <label>
                <span>Desde</span>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </label>
              <label>
                <span>Hasta</span>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </label>
            </>
          )}
          {numberField && (
            <>
              <label>
                <span>{numberField.label} mínimo</span>
                <input type="number" step="0.01" min="0" value={minNumber} onChange={(e) => setMinNumber(e.target.value)} />
              </label>
              <label>
                <span>{numberField.label} máximo</span>
                <input type="number" step="0.01" min="0" value={maxNumber} onChange={(e) => setMaxNumber(e.target.value)} />
              </label>
            </>
          )}
        </div>
      )}

      {loading ? (
        <div className="re-vacio">Cargando…</div>
      ) : filtered.length === 0 ? (
        <div className="re-vacio">
          <Search size={34} />
          <strong>{rows.length === 0 ? `Todavía no hay ${entityLabel}s` : "No encontramos resultados"}</strong>
          <span>
            {rows.length === 0
              ? `Crea ${esFemenino ? "la primera" : "el primero"} para empezar.`
              : "Prueba con otra búsqueda o limpia los filtros."}
          </span>
          {rows.length === 0 ? (
            <button type="button" className="re-boton" onClick={openNew}>
              <Plus size={18} /> {nuevoTexto}
            </button>
          ) : (
            hayFiltros && (
              <button type="button" className="re-boton re-boton--suave" onClick={limpiarFiltros}>
                Limpiar filtros
              </button>
            )
          )}
        </div>
      ) : (
        <>
          <ul className="re-lista cg-lista">
            {visibles.map((row) => (
              <li key={row.id} className="re-rol cg-tarjeta" data-inactivo={!estaActivo(row)}>
                <div className="cg-tarjeta__cabecera">
                  <span className="cg-inicial" aria-hidden="true">
                    {inicial(row)}
                  </span>
                  <div className="cg-titulo">{columnaTitulo ? valorDeColumna(columnaTitulo, row) || "—" : "—"}</div>
                  <span className="re-estado" data-estado={estaActivo(row) ? "ACTIVO" : "INACTIVO"}>
                    {estaActivo(row) ? "Activo" : "Inactivo"}
                  </span>
                </div>

                {otrasColumnas.length > 0 && (
                  <dl className="cg-datos">
                    {otrasColumnas
                      .map((col) => ({ col, valor: valorDeColumna(col, row) }))
                      .filter(({ valor }) => !vacioValor(valor))
                      .map(({ col, valor }) => (
                        <div key={col.key}>
                          <dt>{col.label}</dt>
                          <dd>{valor}</dd>
                        </div>
                      ))}
                  </dl>
                )}

                <div className="re-rol__acciones">
                  <button type="button" className="re-boton re-boton--suave" onClick={() => openEdit(row)}>
                    <Pencil size={16} />
                    Editar
                  </button>
                  <button
                    type="button"
                    className="re-boton re-boton--suave re-boton--icono"
                    onClick={() => setDetail(row)}
                    title="Ver detalles"
                    aria-label="Ver detalles"
                  >
                    <Eye size={17} />
                  </button>
                  <button
                    type="button"
                    className="re-boton re-boton--suave re-boton--icono"
                    onClick={() => toggleStatus(row)}
                    title={estaActivo(row) ? "Desactivar" : "Activar"}
                    aria-label={estaActivo(row) ? "Desactivar" : "Activar"}
                  >
                    <Power size={17} />
                  </button>
                  {allowDelete && (
                    <button
                      type="button"
                      className="re-boton re-boton--suave re-boton--icono cg-peligro"
                      onClick={() => remove(row)}
                      title="Eliminar"
                      aria-label="Eliminar"
                    >
                      <Trash2 size={17} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {hayMas && (
            <button
              type="button"
              className="re-boton re-boton--suave cg-mas"
              onClick={() => setLimite((previo) => previo + POR_PAGINA)}
            >
              Mostrar más ({filtered.length - limite} restantes)
            </button>
          )}
        </>
      )}

      <AnimatePresence>
        {detail && (
          <motion.div
            className="re-fondo"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={() => setDetail(null)}
          >
            <motion.div
              className="re-modal cg-detalle"
              role="dialog"
              aria-modal="true"
              aria-label={`Detalle de ${entityLabel}`}
              initial={{ opacity: 0, scale: 0.96, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <header className="re-modal__cabecera">
                <div>
                  <h2>Detalle de {entityLabel}</h2>
                  <span className="re-estado" data-estado={estaActivo(detail) ? "ACTIVO" : "INACTIVO"}>
                    {estaActivo(detail) ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <button type="button" className="re-cerrar" onClick={() => setDetail(null)} aria-label="Cerrar">
                  <X size={18} />
                </button>
              </header>

              <div className="re-modal__cuerpo">
                <dl className="cg-ficha">
                  {fields.map((field) => (
                    <div key={field.key} data-ancho={field.wide ? "completo" : "normal"}>
                      <dt>{field.label}</dt>
                      <dd>{formatDetailValue(detail[field.key])}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <footer className="re-modal__pie">
                <button type="button" className="re-boton re-boton--suave" onClick={() => setDetail(null)}>
                  Cerrar
                </button>
                <button
                  type="button"
                  className="re-boton"
                  onClick={() => {
                    const fila = detail;
                    setDetail(null);
                    openEdit(fila);
                  }}
                >
                  <Pencil size={16} />
                  Editar
                </button>
              </footer>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            className="re-fondo"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={close}
          >
            <motion.form
              className="re-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="cg-modal-titulo"
              initial={{ opacity: 0, scale: 0.96, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              onMouseDown={(e) => e.stopPropagation()}
              onSubmit={save}
              noValidate
              autoComplete="off"
            >
              <header className="re-modal__cabecera">
                <div>
                  <h2 id="cg-modal-titulo">{editing ? `Editar ${entityLabel}` : nuevoTexto}</h2>
                  <p>Los campos con * son obligatorios.</p>
                </div>
                <button type="button" className="re-cerrar" onClick={close} aria-label="Cerrar" disabled={saving}>
                  <X size={18} />
                </button>
              </header>

              <div className="re-modal__cuerpo">
                <div className="cg-campos">
                  {fields.map((field, indice) => {
                    const regla = reglas[field.key];
                    const mostrarError = tocado[field.key] && errores[field.key];
                    const valor = form[field.key] ?? "";

                    return (
                      <label key={field.key} className="re-campo" data-ancho={field.wide ? "completo" : "normal"}>
                        <span className="re-etiqueta-campo">
                          {field.label}
                          {field.required && <b> *</b>}
                        </span>

                        {field.type === "select" ? (
                          <span className="tr-selector tr-selector--formulario">
                            <select
                              value={valor}
                              onChange={(e) => cambiarCampo(field, e.target.value)}
                              onBlur={() => setTocado((prev) => ({ ...prev, [field.key]: true }))}
                              disabled={saving}
                              aria-invalid={Boolean(mostrarError)}
                            >
                              <option value="">Seleccionar</option>
                              {(field.options || []).map((opt) => (
                                <option key={String(opt.value)} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                            <ChevronDown size={17} aria-hidden="true" />
                          </span>
                        ) : field.type === "textarea" ? (
                          <textarea
                            rows="3"
                            value={valor}
                            maxLength={regla?.maximo}
                            onChange={(e) => cambiarCampo(field, e.target.value)}
                            onBlur={() => setTocado((prev) => ({ ...prev, [field.key]: true }))}
                            placeholder={field.placeholder || ""}
                            disabled={saving}
                            aria-invalid={Boolean(mostrarError)}
                          />
                        ) : (
                          <input
                            name={`${collectionName}-${field.key}`}
                            type={field.type === "email" ? "text" : field.type || "text"}
                            inputMode={regla?.numerico ? "numeric" : field.type === "email" ? "email" : undefined}
                            value={valor}
                            maxLength={regla?.maximo}
                            onChange={(e) => cambiarCampo(field, e.target.value)}
                            onBlur={() => setTocado((prev) => ({ ...prev, [field.key]: true }))}
                            placeholder={field.placeholder || ""}
                            autoComplete="off"
                            autoFocus={indice === 0}
                            disabled={saving}
                            aria-invalid={Boolean(mostrarError)}
                          />
                        )}

                        <small className="re-ayuda" data-error={Boolean(mostrarError)}>
                          {mostrarError
                            ? errores[field.key]
                            : regla?.maximo && field.type !== "select"
                              ? `${String(valor).length}/${regla.maximo}`
                              : " "}
                        </small>
                      </label>
                    );
                  })}
                </div>

                {error && (
                  <div className="re-aviso re-aviso--error" role="alert">
                    {error}
                  </div>
                )}
              </div>

              <footer className="re-modal__pie">
                <button type="button" className="re-boton re-boton--suave" onClick={close} disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" className="re-boton" disabled={saving}>
                  {saving ? "Guardando…" : editing ? "Guardar cambios" : "Guardar"}
                </button>
              </footer>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
