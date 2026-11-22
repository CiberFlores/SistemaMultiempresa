import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  CircleCheck,
  ExternalLink,
  Eye,
  Hash,
  Mail,
  MapPin,
  Palette,
  Pencil,
  Phone,
  Plus,
  Power,
  Store,
  Trash2,
  X
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import AdvancedFilterBar from "../../components/filters/AdvancedFilterBar";
import LocationPicker from "../../components/common/LocationPicker";
import IdentidadVisualEditor from "../../components/empresa/IdentidadVisualEditor";
import LogoEmpresa from "../../components/empresa/LogoEmpresa";
import VistaPreviaPanel from "../../components/empresa/VistaPreviaPanel";
import {
  actualizarEmpresa,
  cambiarEstadoEmpresa,
  crearEmpresa,
  suscribirEmpresas,
  verificarSlugDisponible
} from "../../services/empresaService";
import {
  guardarIdentidadEmpresa,
  obtenerIdentidadEmpresa,
  quitarLogoEmpresa,
  subirLogoEmpresa
} from "../../services/brandingEmpresaService";
import { eliminarEmpresaDefinitivamente } from "../../services/platformService";
import { registrarAuditoria } from "../../services/auditService";
import { generarSlug } from "../../utils/slug";
import {
  IDENTIDAD_BASE,
  derivarTema,
  paletaPorRubro,
  textoSobre
} from "../../utils/identidadEmpresa";
import { RUBROS_EMPRESA, RUBROS_PLANOS } from "../../data/businessCategories";
import useAuth from "../../hooks/useAuth";
import useConfirmar from "../../hooks/useConfirmar";
import "../../styles/superadmin-empresas.css";

const initial = {
  nombreComercial: "",
  razonSocial: "",
  rubro: "",
  rubroPersonalizado: "",
  nit: "",
  telefono: "",
  correo: "",
  slugPublico: "",
  ubicacion: {
    paisCodigo: "BO",
    paisNombre: "Bolivia",
    regionCodigo: "",
    regionNombre: "",
    provincia: "",
    ciudad: "",
    direccion: ""
  }
};

const CLAVES_COLOR = ["colorPrimario", "colorSecundario", "fondo"];

function normalizarRubro(valor) {
  return String(valor || "").trim();
}

// Une partes de la ubicación sin repetir y con el país en lenguaje común
function textoUbicacion(row) {
  const partes = [
    row.ubicacion?.ciudad || row.ciudad,
    row.ubicacion?.regionNombre || row.region,
    row.ubicacion?.paisNombre || row.pais
  ]
    .filter(Boolean)
    .map((parte) => String(parte).replace(/,\s*Plurinational State of/i, ""));

  return [...new Set(partes)].join(", ") || "-";
}

function identidadDe(row) {
  return {
    ...IDENTIDAD_BASE,
    ...(row?.identidad || {}),
    logoUrl: row?.logoUrl || ""
  };
}

function Dato({ icono: Icono, etiqueta, valor, ancho = false }) {
  return (
    <div className="emp-dato" data-ancho={ancho}>
      <span className="emp-dato__icono" aria-hidden="true">
        <Icono size={17} />
      </span>
      <div>
        <small>{etiqueta}</small>
        <strong>{valor || "-"}</strong>
      </div>
    </div>
  );
}

export default function EmpresasPage() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const confirmar = useConfirmar();
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("TODOS");
  const [country, setCountry] = useState("TODOS");
  const [rubroFilter, setRubroFilter] = useState("TODOS");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState(initial);
  const [identidad, setIdentidad] = useState(IDENTIDAD_BASE);
  const [logoArchivo, setLogoArchivo] = useState(null);
  const [logoQuitado, setLogoQuitado] = useState(false);
  const [coloresTocados, setColoresTocados] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [paso, setPaso] = useState("");
  const [loading, setLoading] = useState(true);
  const edicionActual = useRef(null);

  useEffect(
    () =>
      suscribirEmpresas(
        (data) => {
          setRows(data);
          setLoading(false);
        },
        (err) => {
          console.error(err);
          setError("No se pudieron cargar las empresas.");
          setLoading(false);
        }
      ),
    []
  );

  // Escape cierra la ventana abierta
  useEffect(() => {
    if (!open && !detail) {
      return undefined;
    }

    const alTeclear = (evento) => {
      if (evento.key === "Escape") {
        setOpen(false);
        setDetail(null);
      }
    };

    window.addEventListener("keydown", alTeclear);

    return () => window.removeEventListener("keydown", alTeclear);
  }, [open, detail]);

  const countries = useMemo(
    () =>
      Array.from(
        new Map(
          rows.map((row) => [
            row.paisCodigo || row.ubicacion?.paisCodigo || row.pais || "",
            row.pais || row.ubicacion?.paisNombre || row.paisCodigo || ""
          ])
        ).entries()
      )
        .filter(([value]) => value)
        .map(([value, label]) => ({ value, label })),
    [rows]
  );

  const rubrosDisponibles = useMemo(
    () =>
      Array.from(
        new Set([
          ...RUBROS_PLANOS,
          ...rows.map((row) => normalizarRubro(row.rubro)).filter(Boolean)
        ])
      )
        .sort((a, b) => a.localeCompare(b))
        .map((value) => ({ value, label: value })),
    [rows]
  );

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        const q = search.toLowerCase();
        const loc = row.ubicacion || {};
        const match =
          !q ||
          [
            row.nombreComercial,
            row.razonSocial,
            row.rubro,
            row.nit,
            row.correo,
            row.telefono,
            row.slugPublico,
            row.pais,
            loc.paisNombre,
            row.region,
            loc.regionNombre,
            row.provincia,
            loc.provincia,
            row.ciudad,
            loc.ciudad
          ].some((value) => String(value || "").toLowerCase().includes(q));

        const statusOk = status === "TODOS" || row.estado === status;
        const code = row.paisCodigo || loc.paisCodigo || row.pais || "";
        const countryOk = country === "TODOS" || code === country;
        const rubroOk = rubroFilter === "TODOS" || row.rubro === rubroFilter;
        return match && statusOk && countryOk && rubroOk;
      }),
    [rows, search, status, country, rubroFilter]
  );

  // ---------------------------------------------------------
  // Abrir crear / editar
  // ---------------------------------------------------------

  const reiniciarLogo = () => {
    setLogoArchivo(null);
    setLogoQuitado(false);
  };

  const openNew = () => {
    edicionActual.current = null;
    setEditing(null);
    setForm(initial);
    setIdentidad(IDENTIDAD_BASE);
    setColoresTocados(false);
    reiniciarLogo();
    setError("");
    setOpen(true);
  };

  const openEdit = (row) => {
    const loc = row.ubicacion || {
      paisCodigo: row.paisCodigo || "BO",
      paisNombre: row.pais || "Bolivia",
      regionCodigo: row.regionCodigo || "",
      regionNombre: row.region || "",
      provincia: row.provincia || "",
      ciudad: row.ciudad || "",
      direccion: row.direccion || ""
    };
    const rubroConocido = RUBROS_PLANOS.includes(row.rubro || "");

    edicionActual.current = row.id;
    setEditing(row);
    setForm({
      nombreComercial: row.nombreComercial || "",
      razonSocial: row.razonSocial || "",
      rubro: rubroConocido ? row.rubro : row.rubro ? "OTRO" : "",
      rubroPersonalizado: rubroConocido ? "" : row.rubro || "",
      nit: row.nit || "",
      telefono: row.telefono || "",
      correo: row.correo || "",
      slugPublico: row.slugPublico || "",
      ubicacion: {
        ...initial.ubicacion,
        ...loc
      }
    });
    setIdentidad(identidadDe(row));
    setColoresTocados(true);
    reiniciarLogo();
    setError("");
    setOpen(true);
    setDetail(null);

    // La identidad completa vive en su propio documento
    obtenerIdentidadEmpresa(row.id)
      .then((datos) => {
        if (!datos || edicionActual.current !== row.id) {
          return;
        }

        setIdentidad((previa) => ({
          ...previa,
          nombreVisual: datos.nombreVisual ?? previa.nombreVisual,
          colorPrimario: datos.colorPrimario || previa.colorPrimario,
          colorSecundario: datos.colorSecundario || previa.colorSecundario,
          fondo: datos.fondo || previa.fondo,
          tipografia: datos.tipografia || previa.tipografia,
          logoUrl: previa.logoUrl || datos.logoUrl || ""
        }));
      })
      .catch((err) => console.error("No se pudo leer la identidad:", err));
  };

  // ---------------------------------------------------------
  // Identidad visual (se refleja al instante en la vista previa)
  // ---------------------------------------------------------

  const cambiarIdentidad = (parcial) => {
    if (CLAVES_COLOR.some((clave) => clave in parcial)) {
      setColoresTocados(true);
    }

    setIdentidad((previa) => ({ ...previa, ...parcial }));
  };

  const cambiarRubro = (valor) => {
    setForm((previo) => ({
      ...previo,
      rubro: valor,
      rubroPersonalizado: valor === "OTRO" ? previo.rubroPersonalizado : ""
    }));

    // En una empresa nueva, sugiere la paleta del rubro mientras no se hayan tocado los colores
    if (!editing && !coloresTocados) {
      const paleta = paletaPorRubro(valor === "OTRO" ? "" : valor);

      if (paleta) {
        setIdentidad((previa) => ({
          ...previa,
          colorPrimario: paleta.colorPrimario,
          colorSecundario: paleta.colorSecundario,
          fondo: paleta.fondo
        }));
      }
    }
  };

  const recibirLogo = (resultado) => {
    setLogoArchivo(resultado);
    setLogoQuitado(false);
    setIdentidad((previa) => ({ ...previa, logoUrl: resultado.vistaPrevia }));
  };

  const quitarLogo = () => {
    setLogoArchivo(null);
    setLogoQuitado(true);
    setIdentidad((previa) => ({ ...previa, logoUrl: "" }));
  };

  // ---------------------------------------------------------
  // Guardar
  // ---------------------------------------------------------

  const guardarIdentidad = async (empresaId) => {
    let logoUrl = identidad.logoUrl;

    if (logoArchivo) {
      setPaso("Subiendo el logo…");
      logoUrl = await subirLogoEmpresa(empresaId, logoArchivo.blob, logoArchivo.extension);
    } else if (logoQuitado) {
      await quitarLogoEmpresa(empresaId);
      logoUrl = "";
    } else if (logoUrl.startsWith("blob:")) {
      logoUrl = "";
    }

    setPaso("Guardando la identidad…");
    await guardarIdentidadEmpresa(empresaId, { ...identidad, logoUrl });
  };

  const save = async (event) => {
    event.preventDefault();

    let empresaCreada = null;

    try {
      setSaving(true);
      setPaso("Guardando los datos…");
      setError("");

      if (!form.nombreComercial.trim()) {
        throw new Error("El nombre comercial es obligatorio.");
      }

      const rubroFinal =
        form.rubro === "OTRO"
          ? form.rubroPersonalizado.trim()
          : form.rubro.trim();

      if (!rubroFinal) {
        throw new Error("Selecciona un rubro o especifica uno personalizado.");
      }

      const slug = generarSlug(form.slugPublico || form.nombreComercial);
      if (!(await verificarSlugDisponible(slug, editing?.id))) {
        throw new Error("El slug público ya está en uso.");
      }

      const u = form.ubicacion;
      const payload = {
        nombreComercial: form.nombreComercial.trim(),
        razonSocial: form.razonSocial.trim(),
        rubro: rubroFinal,
        nit: form.nit.trim(),
        telefono: form.telefono.trim(),
        correo: form.correo.trim().toLowerCase(),
        slugPublico: slug,
        ubicacion: u,
        paisCodigo: u.paisCodigo,
        pais: u.paisNombre,
        regionCodigo: u.regionCodigo,
        region: u.regionNombre,
        provincia: u.provincia || "",
        ciudad: u.ciudad,
        direccion: u.direccion
      };

      if (editing) {
        await actualizarEmpresa(editing.id, payload);
        await guardarIdentidad(editing.id);
        await registrarAuditoria({
          empresaId: null,
          usuarioId: usuario?.uid,
          usuarioNombre: usuario?.nombreCompleto || usuario?.correo || "",
          accion: "ACTUALIZAR",
          modulo: "empresas",
          entidad: "empresa",
          entidadId: editing.id,
          detalle: `Actualizó la empresa ${payload.nombreComercial}`
        });
      } else {
        empresaCreada = await crearEmpresa(payload);
        await registrarAuditoria({
          empresaId: null,
          usuarioId: usuario?.uid,
          usuarioNombre: usuario?.nombreCompleto || usuario?.correo || "",
          accion: "CREAR",
          modulo: "empresas",
          entidad: "empresa",
          entidadId: empresaCreada?.id || "",
          detalle: `Creó la empresa ${payload.nombreComercial}`
        });

        if (empresaCreada?.id) {
          await guardarIdentidad(empresaCreada.id);
        }
      }

      setOpen(false);
    } catch (err) {
      if (empresaCreada?.id) {
        // La empresa ya existe: la ventana pasa a modo edición para reintentar el logo
        edicionActual.current = empresaCreada.id;
        setEditing({ id: empresaCreada.id, nombreComercial: form.nombreComercial });
        setError(
          `La empresa se creó, pero no se pudo guardar su identidad visual: ${err.message || "error desconocido"}`
        );
      } else {
        setError(err.message || "No se pudo guardar.");
      }
    } finally {
      setSaving(false);
      setPaso("");
    }
  };

  const toggle = async (row) => {
    const next = row.estado === "ACTIVA" ? "SUSPENDIDA" : "ACTIVA";
    const reactivar = next === "ACTIVA";

    const confirmado = await confirmar({
      titulo: reactivar ? "Reactivar empresa" : "Suspender empresa",
      mensaje: reactivar
        ? `${row.nombreComercial} volverá a tener acceso a la plataforma.`
        : `${row.nombreComercial} y sus usuarios perderán el acceso hasta que la reactives.`,
      accion: reactivar ? "Reactivar" : "Suspender",
      peligro: !reactivar
    });

    if (!confirmado) {
      return;
    }

    try {
      await cambiarEstadoEmpresa(row.id, next);
      await registrarAuditoria({
        empresaId: null,
        usuarioId: usuario?.uid,
        usuarioNombre: usuario?.nombreCompleto || usuario?.correo || "",
        accion: "CAMBIAR_ESTADO",
        modulo: "empresas",
        entidad: "empresa",
        entidadId: row.id,
        detalle: `${row.nombreComercial}: ${row.estado || "ACTIVA"} → ${next}`
      });
    } catch (err) {
      alert(err.message || "No se pudo cambiar el estado de la empresa.");
    }
  };

  const remove = async (row) => {
    const confirmado = await confirmar({
      titulo: "Eliminar empresa",
      mensaje: `Se eliminará definitivamente ${row.nombreComercial}. Solo se permite si no tiene usuarios u operaciones relacionadas.`,
      accion: "Eliminar",
      peligro: true
    });

    if (!confirmado) {
      return;
    }

    try {
      await eliminarEmpresaDefinitivamente(row.id);
      await registrarAuditoria({
        empresaId: null,
        usuarioId: usuario?.uid,
        usuarioNombre: usuario?.nombreCompleto || usuario?.correo || "",
        accion: "ELIMINAR",
        modulo: "empresas",
        entidad: "empresa",
        entidadId: row.id,
        detalle: `Eliminó la empresa ${row.nombreComercial}`
      });
    } catch (err) {
      alert(err.message || "No se pudo eliminar.");
    }
  };

  const rubroActual =
    form.rubro === "OTRO" ? form.rubroPersonalizado : form.rubro;

  const identidadDetalle = detail ? identidadDe(detail) : null;
  const temaDetalle = identidadDetalle ? derivarTema(identidadDetalle) : null;

  return (
    <div className="module-page">
      <div className="module-page-header">
        <div>
          <h1>Empresas</h1>
          <p>Control global de negocios, rubros, ubicación internacional y estado de acceso.</p>
        </div>
        <button className="primary-action" onClick={openNew}>
          <Plus size={17} /> Nueva empresa
        </button>
      </div>

      <AdvancedFilterBar
        search={search}
        onSearch={setSearch}
        status={status}
        onStatus={setStatus}
        statusOptions={[
          { value: "TODOS", label: "Todos los estados" },
          { value: "ACTIVA", label: "Activas" },
          { value: "SUSPENDIDA", label: "Suspendidas" }
        ]}
        filters={[
          {
            key: "rubro",
            label: "Todos los rubros",
            value: rubroFilter,
            onChange: setRubroFilter,
            options: rubrosDisponibles
          },
          {
            key: "pais",
            label: "Todos los países",
            value: country,
            onChange: setCountry,
            options: countries
          }
        ]}
        onClear={() => {
          setSearch("");
          setStatus("TODOS");
          setCountry("TODOS");
          setRubroFilter("TODOS");
        }}
      />

      <section className="data-card glass-3d">
        <div className="data-card-meta">
          <strong>{filtered.length}</strong>
          <span>de {rows.length} empresa(s)</span>
        </div>

        {loading ? (
          <div className="empty-state">Cargando empresas…</div>
        ) : (
          <div className="table-scroll">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>EMPRESA</th>
                  <th>RUBRO</th>
                  <th>UBICACIÓN</th>
                  <th>COLORES</th>
                  <th>ESTADO</th>
                  <th>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const idRow = identidadDe(row);

                  return (
                    <tr key={row.id}>
                      <td>
                        <div className="emp-nombre">
                          <LogoEmpresa
                            logoUrl={idRow.logoUrl}
                            nombre={row.nombreComercial}
                            color={idRow.colorPrimario}
                            tamano={46}
                          />
                          <div>
                            <strong>{row.nombreComercial}</strong>
                            <small className="table-sub">{row.razonSocial || row.correo || "Sin razón social"}</small>
                          </div>
                        </div>
                      </td>
                      <td>{row.rubro || "-"}</td>
                      <td>{textoUbicacion(row)}</td>
                      <td>
                        <span
                          className="emp-paleta"
                          role="img"
                          aria-label={`Colores: principal ${idRow.colorPrimario}, secundario ${idRow.colorSecundario}`}
                          style={{ background: idRow.fondo }}
                        >
                          <i style={{ background: idRow.colorPrimario }} />
                          <i style={{ background: idRow.colorSecundario }} />
                        </span>
                      </td>
                      <td>
                        <span className={`status-pill ${row.estado === "ACTIVA" ? "active" : "inactive"}`}>
                          {row.estado || "ACTIVA"}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button title="Ver detalles" aria-label={`Ver detalles de ${row.nombreComercial}`} onClick={() => setDetail(row)}><Eye size={16} /></button>
                          <button title="Centro de control" aria-label={`Centro de control de ${row.nombreComercial}`} onClick={() => navigate(`/superadmin/empresas/${row.id}/control`)}><ExternalLink size={16} /></button>
                          <button title="Editar" aria-label={`Editar ${row.nombreComercial}`} onClick={() => openEdit(row)}><Pencil size={16} /></button>
                          <button title="Activar/suspender" aria-label={`Activar o suspender ${row.nombreComercial}`} onClick={() => toggle(row)}><Power size={16} /></button>
                          <button title="Eliminar" aria-label={`Eliminar ${row.nombreComercial}`} className="danger" onClick={() => remove(row)}><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!filtered.length && <div className="empty-state">No hay empresas con esos filtros.</div>}
          </div>
        )}
      </section>

      {/* ---------------- DETALLE ---------------- */}
      <AnimatePresence>
        {detail && (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => setDetail(null)}>
            <motion.div
              className="modal-card emp-detalle glass-3d"
              role="dialog"
              aria-modal="true"
              aria-label={`Detalle de ${detail.nombreComercial}`}
              initial={{ opacity: 0, scale: 0.96, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div
                className="emp-banner"
                style={{
                  "--c1": identidadDetalle.colorPrimario,
                  "--c2": identidadDetalle.colorSecundario,
                  "--cf": identidadDetalle.fondo,
                  "--ct": textoSobre(identidadDetalle.colorPrimario)
                }}
              >
                <button className="emp-cerrar" onClick={() => setDetail(null)} aria-label="Cerrar"><X size={18} /></button>

                <div className="emp-banner__contenido">
                  <LogoEmpresa
                    logoUrl={identidadDetalle.logoUrl}
                    nombre={detail.nombreComercial}
                    color={identidadDetalle.colorPrimario}
                    tamano={92}
                    className="idv-logo--banner"
                  />

                  <div className="emp-banner__texto">
                    <h2>{detail.nombreComercial}</h2>
                    <div className="emp-chips">
                      <span>{detail.rubro || "Sin rubro"}</span>
                      <span className={`emp-estado ${detail.estado === "ACTIVA" ? "ok" : "no"}`}>{detail.estado || "ACTIVA"}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="emp-detalle__cuerpo">
                <section>
                  <h3>Contacto</h3>
                  <div className="emp-datos">
                    <Dato icono={Building2} etiqueta="Razón social" valor={detail.razonSocial} />
                    <Dato icono={Hash} etiqueta="NIT / documento" valor={detail.nit} />
                    <Dato icono={Mail} etiqueta="Correo" valor={detail.correo} />
                    <Dato icono={Phone} etiqueta="Teléfono" valor={detail.telefono} />
                  </div>
                </section>

                <section>
                  <h3>Ubicación</h3>
                  <div className="emp-datos">
                    <Dato icono={MapPin} etiqueta="País" valor={(detail.ubicacion?.paisNombre || detail.pais || "").replace(/,\s*Plurinational State of/i, "")} />
                    <Dato icono={MapPin} etiqueta="Región" valor={detail.ubicacion?.regionNombre || detail.region} />
                    <Dato icono={MapPin} etiqueta="Provincia / distrito" valor={detail.ubicacion?.provincia || detail.provincia} />
                    <Dato icono={MapPin} etiqueta="Ciudad" valor={detail.ubicacion?.ciudad || detail.ciudad} />
                    <Dato icono={MapPin} etiqueta="Dirección" valor={detail.ubicacion?.direccion || detail.direccion} ancho />
                  </div>
                </section>

                <section>
                  <h3>Identidad visual</h3>
                  <div className="emp-identidad">
                    <div className="emp-muestras">
                      {[
                        ["Principal", identidadDetalle.colorPrimario],
                        ["Secundario", identidadDetalle.colorSecundario],
                        ["Fondo", identidadDetalle.fondo]
                      ].map(([nombre, color]) => (
                        <div key={nombre}>
                          <span style={{ background: color }} />
                          <strong>{nombre}</strong>
                          <small>{color}</small>
                        </div>
                      ))}
                    </div>
                    <p>
                      Tipo de letra <b>{identidadDetalle.tipografia}</b>
                      {temaDetalle?.claro ? " · panel claro" : " · panel oscuro"} · dirección <b>/{detail.slugPublico || "-"}</b>
                    </p>
                  </div>
                </section>
              </div>

              <div className="emp-pie">
                <button className="secondary-action" onClick={() => setDetail(null)}>Cerrar</button>
                <button className="secondary-action" onClick={() => openEdit(detail)}><Pencil size={16} /> Editar</button>
                <button className="primary-action" onClick={() => { setDetail(null); navigate(`/superadmin/empresas/${detail.id}/control`); }}>Abrir centro de control</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------------- CREAR / EDITAR ---------------- */}
      <AnimatePresence>
        {open && (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => setOpen(false)}>
            <motion.div
              className="modal-card emp-modal glass-3d"
              role="dialog"
              aria-modal="true"
              aria-labelledby="emp-modal-titulo"
              initial={{ opacity: 0, scale: 0.97, y: 22 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="modal-head">
                <div>
                  <h2 id="emp-modal-titulo">{editing ? "Editar empresa" : "Nueva empresa"}</h2>
                  <p className="emp-modal__sub">
                    {editing
                      ? "Cambia los datos o la identidad visual y mira el resultado al instante."
                      : "Completa los datos y elige cómo se verá su panel."}
                  </p>
                </div>
                <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar"><X size={18} /></button>
              </div>

              <form className="emp-form" onSubmit={save}>
                <div className="emp-body">
                  <div className="emp-col emp-col--form">
                    <section className="emp-sec">
                      <h3><span aria-hidden="true"><Store size={18} /></span>Datos de la empresa</h3>

                      <div className="smart-form">
                        <label className="field-block">
                          <span>Nombre comercial *</span>
                          <input value={form.nombreComercial} onChange={(e) => setForm({ ...form, nombreComercial: e.target.value, slugPublico: editing ? form.slugPublico : generarSlug(e.target.value) })} />
                        </label>

                        <label className="field-block">
                          <span>Razón social</span>
                          <input value={form.razonSocial} onChange={(e) => setForm({ ...form, razonSocial: e.target.value })} />
                        </label>

                        <label className="field-block">
                          <span>Rubro *</span>
                          <select value={form.rubro} onChange={(e) => cambiarRubro(e.target.value)}>
                            <option value="">Seleccionar rubro</option>
                            {RUBROS_EMPRESA.map((grupo) => (
                              <optgroup key={grupo.grupo} label={grupo.grupo}>
                                {grupo.opciones.map((opcion) => <option key={opcion} value={opcion}>{opcion}</option>)}
                              </optgroup>
                            ))}
                            <option value="OTRO">Otro / rubro personalizado</option>
                          </select>
                        </label>

                        <label className="field-block">
                          <span>NIT / documento fiscal</span>
                          <input value={form.nit} onChange={(e) => setForm({ ...form, nit: e.target.value })} />
                        </label>

                        {form.rubro === "OTRO" && (
                          <label className="field-block field-span-2">
                            <span>Especificar rubro *</span>
                            <input value={form.rubroPersonalizado} onChange={(e) => setForm({ ...form, rubroPersonalizado: e.target.value })} placeholder="Ej. Distribuidora de insumos odontológicos" />
                          </label>
                        )}

                        <label className="field-block">
                          <span>Correo</span>
                          <input type="email" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} />
                        </label>

                        <label className="field-block">
                          <span>Teléfono</span>
                          <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
                        </label>

                        <label className="field-block field-span-2">
                          <span>Dirección web de la empresa</span>
                          <input value={form.slugPublico} onChange={(e) => setForm({ ...form, slugPublico: generarSlug(e.target.value) })} />
                        </label>
                      </div>
                    </section>

                    <section className="emp-sec">
                      <h3><span aria-hidden="true"><MapPin size={18} /></span>Ubicación</h3>
                      <LocationPicker value={form.ubicacion} onChange={(ubicacion) => setForm({ ...form, ubicacion })} />
                    </section>

                    <section className="emp-sec">
                      <h3><span aria-hidden="true"><Palette size={18} /></span>Identidad visual</h3>
                      <IdentidadVisualEditor
                        valor={identidad}
                        onChange={cambiarIdentidad}
                        rubro={rubroActual}
                        nombre={form.nombreComercial}
                        alLogo={recibirLogo}
                        alQuitarLogo={quitarLogo}
                      />
                    </section>
                  </div>

                  <div className="emp-col emp-col--preview">
                    <VistaPreviaPanel
                      identidad={identidad}
                      nombre={form.nombreComercial}
                      rubro={rubroActual}
                    />
                  </div>
                </div>

                {error && <div className="form-error" role="alert">{error}</div>}

                <div className="emp-foot">
                  <button type="button" className="secondary-action" onClick={() => setOpen(false)}>Cancelar</button>
                  <button className="primary-action" disabled={saving}><CircleCheck size={16} />{saving ? paso || "Guardando…" : editing ? "Guardar cambios" : "Crear empresa"}</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
