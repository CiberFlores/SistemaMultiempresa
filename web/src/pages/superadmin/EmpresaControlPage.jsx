import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Blocks, Building2, Check, Palette, Save, ShieldCheck } from "lucide-react";
import LocationPicker from "../../components/common/LocationPicker";
import IdentidadVisualEditor from "../../components/empresa/IdentidadVisualEditor";
import VistaPreviaPanel from "../../components/empresa/VistaPreviaPanel";
import { cargarControlEmpresa, guardarConfiguracionEmpresaGlobal } from "../../services/platformService";
import { quitarLogoEmpresa, subirLogoEmpresa } from "../../services/brandingEmpresaService";
import { IDENTIDAD_BASE, resumenIdentidad } from "../../utils/identidadEmpresa";

export default function EmpresaControlPage() {
  const { empresaId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [logoArchivo, setLogoArchivo] = useState(null);
  const [logoQuitado, setLogoQuitado] = useState(false);

  useEffect(() => {
    cargarControlEmpresa(empresaId)
      .then((res) => {
        const p = res.personalizacion || {};
        const e = res.empresa;

        setData({
          ...res,
          empresaForm: {
            nombreComercial: e.nombreComercial || "",
            razonSocial: e.razonSocial || "",
            rubro: e.rubro || "",
            nit: e.nit || "",
            telefono: e.telefono || "",
            correo: e.correo || "",
            ubicacion: e.ubicacion || {
              paisCodigo: e.paisCodigo || "BO",
              paisNombre: e.pais || "Bolivia",
              regionCodigo: e.regionCodigo || "",
              regionNombre: e.region || "",
              ciudad: e.ciudad || "",
              direccion: e.direccion || ""
            }
          },
          configForm: {
            moneda: res.config.moneda || "BOB",
            impuestoNombre: res.config.impuestoNombre || "IVA",
            impuestoPorcentaje: res.config.impuestoPorcentaje ?? 13,
            numeracionComprobante: res.config.numeracionComprobante || "000001",
            zonaHoraria: res.config.zonaHoraria || "America/La_Paz"
          },
          identidad: {
            ...IDENTIDAD_BASE,
            ...(e.identidad || {}),
            colorPrimario: p.colorPrimario || e.identidad?.colorPrimario || IDENTIDAD_BASE.colorPrimario,
            colorSecundario: p.colorSecundario || e.identidad?.colorSecundario || IDENTIDAD_BASE.colorSecundario,
            fondo: p.fondo || e.identidad?.fondo || IDENTIDAD_BASE.fondo,
            tipografia: p.tipografia || e.identidad?.tipografia || IDENTIDAD_BASE.tipografia,
            nombreVisual: p.nombreVisual || e.identidad?.nombreVisual || e.nombreComercial || "",
            logoUrl: p.logoUrl || e.logoUrl || ""
          }
        });
        setLoading(false);
      })
      .catch((e) => {
        setMessage(e.message);
        setLoading(false);
      });
  }, [empresaId]);

  const save = async () => {
    try {
      setSaving(true);
      setMessage("");

      const u = data.empresaForm.ubicacion;
      let logoUrl = data.identidad.logoUrl;

      if (logoArchivo) {
        logoUrl = await subirLogoEmpresa(empresaId, logoArchivo.blob, logoArchivo.extension);
      } else if (logoQuitado) {
        await quitarLogoEmpresa(empresaId);
        logoUrl = "";
      } else if (logoUrl.startsWith("blob:")) {
        logoUrl = "";
      }

      const resumen = resumenIdentidad(data.identidad);

      await guardarConfiguracionEmpresaGlobal(empresaId, {
        empresa: {
          nombreComercial: data.empresaForm.nombreComercial,
          razonSocial: data.empresaForm.razonSocial,
          rubro: data.empresaForm.rubro,
          nit: data.empresaForm.nit,
          telefono: data.empresaForm.telefono,
          correo: data.empresaForm.correo,
          pais: u.paisNombre,
          paisCodigo: u.paisCodigo,
          region: u.regionNombre,
          regionCodigo: u.regionCodigo,
          ciudad: u.ciudad,
          direccion: u.direccion,
          ubicacion: u,
          logoUrl,
          identidad: resumen
        },
        config: data.configForm,
        personalizacion: { ...resumen, logoUrl }
      });

      setData((previo) => ({ ...previo, identidad: { ...previo.identidad, logoUrl } }));
      setLogoArchivo(null);
      setLogoQuitado(false);
      setMessage("Configuración guardada correctamente.");
    } catch (e) {
      setMessage(e.message || "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="empty-state">Cargando centro de control…</div>;
  if (!data) return <div className="form-error">{message || "No se pudo cargar."}</div>;

  const cambiarIdentidad = (parcial) =>
    setData((previo) => ({ ...previo, identidad: { ...previo.identidad, ...parcial } }));

  const cambiarEmpresa = (campo, valor) =>
    setData((previo) => ({ ...previo, empresaForm: { ...previo.empresaForm, [campo]: valor } }));

  const cambiarConfig = (campo, valor) =>
    setData((previo) => ({ ...previo, configForm: { ...previo.configForm, [campo]: valor } }));

  return (
    <div className="module-page">
      <div className="module-page-header">
        <div>
          <button className="back-link" onClick={() => navigate("/superadmin/empresas")}>
            <ArrowLeft size={16} /> Volver
          </button>
          <h1>{data.empresa.nombreComercial}</h1>
          <p>Identidad visual, ubicación y configuración comercial.</p>
        </div>
        <button className="primary-action" onClick={save} disabled={saving}>
          <Save size={17} />
          {saving ? "Guardando…" : "Guardar todo"}
        </button>
      </div>

      {message && (
        <div className={message.includes("correctamente") ? "success-banner" : "form-error"} role="status">
          {message}
        </div>
      )}

      <section className="control-grid">
        <article className="data-card glass-3d control-card control-card--ancha">
          <div className="card-title">
            <Palette />
            <div>
              <h3>Identidad visual</h3>
              <p>Logo y colores del panel de esta empresa. La vista previa cambia al instante.</p>
            </div>
          </div>

          <div className="control-identidad">
            <IdentidadVisualEditor
              valor={data.identidad}
              onChange={cambiarIdentidad}
              rubro={data.empresaForm.rubro}
              nombre={data.empresaForm.nombreComercial}
              alLogo={(resultado) => {
                setLogoArchivo(resultado);
                setLogoQuitado(false);
                cambiarIdentidad({ logoUrl: resultado.vistaPrevia });
              }}
              alQuitarLogo={() => {
                setLogoArchivo(null);
                setLogoQuitado(true);
                cambiarIdentidad({ logoUrl: "" });
              }}
            />

            <div className="control-identidad__vista">
              <VistaPreviaPanel
                identidad={data.identidad}
                nombre={data.empresaForm.nombreComercial}
                rubro={data.empresaForm.rubro}
              />
            </div>
          </div>
        </article>

        <article className="data-card glass-3d control-card">
          <div className="card-title">
            <Building2 />
            <div>
              <h3>Datos comerciales</h3>
              <p>Datos visibles y administrativos de la empresa.</p>
            </div>
          </div>

          <div className="smart-form">
            <label className="field-block">
              <span>Nombre comercial</span>
              <input value={data.empresaForm.nombreComercial} onChange={(e) => cambiarEmpresa("nombreComercial", e.target.value)} />
            </label>
            <label className="field-block">
              <span>Razón social</span>
              <input value={data.empresaForm.razonSocial} onChange={(e) => cambiarEmpresa("razonSocial", e.target.value)} />
            </label>
            <label className="field-block">
              <span>Rubro</span>
              <input value={data.empresaForm.rubro} onChange={(e) => cambiarEmpresa("rubro", e.target.value)} />
            </label>
            <label className="field-block">
              <span>NIT / documento fiscal</span>
              <input value={data.empresaForm.nit} onChange={(e) => cambiarEmpresa("nit", e.target.value)} />
            </label>
            <label className="field-block">
              <span>Correo</span>
              <input value={data.empresaForm.correo} onChange={(e) => cambiarEmpresa("correo", e.target.value)} />
            </label>
            <label className="field-block">
              <span>Teléfono</span>
              <input value={data.empresaForm.telefono} onChange={(e) => cambiarEmpresa("telefono", e.target.value)} />
            </label>
          </div>

          <LocationPicker
            value={data.empresaForm.ubicacion}
            onChange={(ubicacion) => cambiarEmpresa("ubicacion", ubicacion)}
          />
        </article>

        <article className="data-card glass-3d control-card">
          <div className="card-title">
            <ShieldCheck />
            <div>
              <h3>Configuración general</h3>
              <p>Parámetros comerciales base para esta empresa.</p>
            </div>
          </div>

          <div className="smart-form">
            <label className="field-block">
              <span>Moneda</span>
              <select value={data.configForm.moneda} onChange={(e) => cambiarConfig("moneda", e.target.value)}>
                <option>BOB</option>
                <option>USD</option>
                <option>EUR</option>
                <option>PEN</option>
                <option>CLP</option>
                <option>ARS</option>
                <option>BRL</option>
                <option>MXN</option>
                <option>COP</option>
              </select>
            </label>
            <label className="field-block">
              <span>Impuesto</span>
              <input value={data.configForm.impuestoNombre} onChange={(e) => cambiarConfig("impuestoNombre", e.target.value)} />
            </label>
            <label className="field-block">
              <span>Porcentaje</span>
              <input type="number" value={data.configForm.impuestoPorcentaje} onChange={(e) => cambiarConfig("impuestoPorcentaje", Number(e.target.value))} />
            </label>
            <label className="field-block">
              <span>Próximo comprobante</span>
              <input value={data.configForm.numeracionComprobante} onChange={(e) => cambiarConfig("numeracionComprobante", e.target.value)} />
            </label>
          </div>
        </article>

        <article className="data-card glass-3d control-card control-card--ancha">
          <div className="card-title">
            <Blocks />
            <div>
              <h3>Módulos de la empresa</h3>
              <p>
                Esta empresa tiene acceso a todos los módulos. El dueño decide qué puede
                hacer cada trabajador desde «Roles y permisos».
              </p>
            </div>
          </div>

          <ul className="control-modulos">
            {data.modulos.map((m) => (
              <li key={m.id}>
                <Check size={15} aria-hidden="true" />
                {m.nombre}
              </li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}
