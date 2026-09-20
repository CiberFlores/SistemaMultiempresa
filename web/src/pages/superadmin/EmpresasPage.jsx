import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import {
  Building2,
  Plus,
  Pencil,
  Search,
  Ban,
  CircleCheck,
  X
} from "lucide-react";

import {
  actualizarEmpresa,
  cambiarEstadoEmpresa,
  crearEmpresa,
  suscribirEmpresas,
  verificarSlugDisponible
} from "../../services/empresaService";

import { generarSlug } from "../../utils/slug";

const empresaInicial = {
  nombreComercial: "",
  razonSocial: "",
  rubro: "",
  nit: "",
  telefono: "",
  correo: "",
  direccion: "",
  ciudad: "Cochabamba",
  pais: "Bolivia",
  slugPublico: ""
};

function EmpresasPage() {
  const [empresas, setEmpresas] = useState([]);
  const [busqueda, setBusqueda] = useState("");

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [empresaEditando, setEmpresaEditando] = useState(null);

  const [formulario, setFormulario] = useState(empresaInicial);

  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const cancelarSuscripcion = suscribirEmpresas(
      (datos) => {
        setEmpresas(datos);
        setCargando(false);
      },
      (error) => {
        console.error(error);
        setError("No se pudieron cargar las empresas.");
        setCargando(false);
      }
    );

    return () => cancelarSuscripcion();
  }, []);

  const manejarCambio = (e) => {
    const { name, value } = e.target;

    if (name === "nombreComercial" && !empresaEditando) {
      setFormulario((anterior) => ({
        ...anterior,
        nombreComercial: value,
        slugPublico: generarSlug(value)
      }));

      return;
    }

    setFormulario((anterior) => ({
      ...anterior,
      [name]: value
    }));
  };

  const abrirNuevaEmpresa = () => {
    setEmpresaEditando(null);
    setFormulario(empresaInicial);
    setError("");
    setMostrarFormulario(true);
  };

  const abrirEditar = (empresa) => {
    setEmpresaEditando(empresa);

    setFormulario({
      nombreComercial: empresa.nombreComercial || "",
      razonSocial: empresa.razonSocial || "",
      rubro: empresa.rubro || "",
      nit: empresa.nit || "",
      telefono: empresa.telefono || "",
      correo: empresa.correo || "",
      direccion: empresa.direccion || "",
      ciudad: empresa.ciudad || "",
      pais: empresa.pais || "",
      slugPublico: empresa.slugPublico || ""
    });

    setError("");
    setMostrarFormulario(true);
  };

  const cerrarFormulario = () => {
    if (guardando) return;

    setMostrarFormulario(false);
    setEmpresaEditando(null);
    setFormulario(empresaInicial);
    setError("");
  };

  const guardarEmpresa = async (e) => {
    e.preventDefault();

    setError("");

    if (
      !formulario.nombreComercial.trim() ||
      !formulario.slugPublico.trim()
    ) {
      setError("El nombre comercial y el slug son obligatorios.");
      return;
    }

    try {
      setGuardando(true);

      const slug = generarSlug(formulario.slugPublico);

      const disponible = await verificarSlugDisponible(
        slug,
        empresaEditando?.id
      );

      if (!disponible) {
        setError(
          "La dirección pública ya pertenece a otra empresa."
        );

        return;
      }

      const datos = {
        nombreComercial: formulario.nombreComercial.trim(),
        razonSocial: formulario.razonSocial.trim(),
        rubro: formulario.rubro.trim(),
        nit: formulario.nit.trim(),
        telefono: formulario.telefono.trim(),
        correo: formulario.correo.trim(),
        direccion: formulario.direccion.trim(),
        ciudad: formulario.ciudad.trim(),
        pais: formulario.pais.trim(),
        slugPublico: slug
      };

      if (empresaEditando) {
        await actualizarEmpresa(empresaEditando.id, datos);
      } else {
        await crearEmpresa(datos);
      }

      cerrarFormulario();
    } catch (error) {
      console.error(error);

      setError(
        "Ocurrió un error al guardar la empresa."
      );
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (empresa) => {
    const nuevoEstado =
      empresa.estado === "ACTIVA"
        ? "SUSPENDIDA"
        : "ACTIVA";

    const accion =
      nuevoEstado === "SUSPENDIDA"
        ? "suspender"
        : "reactivar";

    const confirmar = window.confirm(
      `¿Deseas ${accion} la empresa "${empresa.nombreComercial}"?`
    );

    if (!confirmar) return;

    try {
      await cambiarEstadoEmpresa(
        empresa.id,
        nuevoEstado
      );
    } catch (error) {
      console.error(error);
      alert("No se pudo actualizar el estado.");
    }
  };

  const empresasFiltradas = empresas.filter((empresa) => {
    const texto = busqueda.toLowerCase();

    return (
      empresa.nombreComercial
        ?.toLowerCase()
        .includes(texto) ||
      empresa.razonSocial
        ?.toLowerCase()
        .includes(texto) ||
      empresa.rubro
        ?.toLowerCase()
        .includes(texto) ||
      empresa.nit
        ?.toLowerCase()
        .includes(texto)
    );
  });

  return (
    <div>
      <div className="sa-page-header">
        <div>
          <h1>Empresas</h1>

          <p>
            Administra las empresas registradas en la
            plataforma SaaS.
          </p>
        </div>

        <button
          className="sa-primary-button"
          onClick={abrirNuevaEmpresa}
        >
          <Plus size={18} />
          Nueva empresa
        </button>
      </div>

      <section className="sa-panel">
        <div className="sa-table-toolbar">
          <div className="sa-table-search">
            <Search size={18} />

            <input
              type="text"
              placeholder="Buscar empresa..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          <span>
            {empresas.length} empresa
            {empresas.length !== 1 && "s"}
          </span>
        </div>

        {cargando ? (
          <div className="sa-empty">
            <Building2 size={42} />
            <strong>Cargando empresas...</strong>
          </div>
        ) : empresasFiltradas.length === 0 ? (
          <div className="sa-empty">
            <Building2 size={42} />

            <strong>
              {empresas.length === 0
                ? "Aún no existen empresas"
                : "No se encontraron resultados"}
            </strong>

            <span>
              {empresas.length === 0
                ? "Registra la primera empresa de la plataforma."
                : "Prueba utilizando otra búsqueda."}
            </span>
          </div>
        ) : (
          <div className="sa-table-container">
            <table className="sa-table">
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Rubro</th>
                  <th>Ciudad</th>
                  <th>Vitrina</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {empresasFiltradas.map((empresa) => (
                  <tr key={empresa.id}>
                    <td>
                      <div className="sa-company-cell">
                        <div className="sa-company-avatar">
                          {empresa.nombreComercial
                            ?.charAt(0)
                            .toUpperCase()}
                        </div>

                        <div>
                          <strong>
                            {empresa.nombreComercial}
                          </strong>

                          <span>
                            {empresa.correo || "Sin correo"}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      {empresa.rubro || "Sin definir"}
                    </td>

                    <td>
                      {empresa.ciudad || "Sin definir"}
                    </td>

                    <td>
                      <span className="sa-slug">
                        /tienda/{empresa.slugPublico}
                      </span>
                    </td>

                    <td>
                      <span
                        className={
                          empresa.estado === "ACTIVA"
                            ? "sa-badge active"
                            : "sa-badge suspended"
                        }
                      >
                        {empresa.estado}
                      </span>
                    </td>

                    <td>
                      <div className="sa-actions">
                        <button
                          title="Editar"
                          onClick={() =>
                            abrirEditar(empresa)
                          }
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          title={
                            empresa.estado === "ACTIVA"
                              ? "Suspender"
                              : "Reactivar"
                          }
                          onClick={() =>
                            cambiarEstado(empresa)
                          }
                        >
                          {empresa.estado === "ACTIVA" ? (
                            <Ban size={17} />
                          ) : (
                            <CircleCheck size={17} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <AnimatePresence>
        {mostrarFormulario && (
          <motion.div
            className="sa-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="sa-modal"
              initial={{
                opacity: 0,
                scale: 0.95,
                y: 15
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0
              }}
              exit={{
                opacity: 0,
                scale: 0.95,
                y: 15
              }}
            >
              <div className="sa-modal-header">
                <div>
                  <h2>
                    {empresaEditando
                      ? "Editar empresa"
                      : "Nueva empresa"}
                  </h2>

                  <p>
                    Información comercial de la empresa.
                  </p>
                </div>

                <button
                  onClick={cerrarFormulario}
                  disabled={guardando}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={guardarEmpresa}>
                <div className="sa-form-grid">
                  <div className="sa-form-group">
                    <label>Nombre comercial *</label>

                    <input
                      name="nombreComercial"
                      value={formulario.nombreComercial}
                      onChange={manejarCambio}
                      required
                    />
                  </div>

                  <div className="sa-form-group">
                    <label>Razón social</label>

                    <input
                      name="razonSocial"
                      value={formulario.razonSocial}
                      onChange={manejarCambio}
                    />
                  </div>

                  <div className="sa-form-group">
                    <label>Rubro</label>

                    <input
                      name="rubro"
                      value={formulario.rubro}
                      onChange={manejarCambio}
                      placeholder="Ferretería, farmacia..."
                    />
                  </div>

                  <div className="sa-form-group">
                    <label>NIT</label>

                    <input
                      name="nit"
                      value={formulario.nit}
                      onChange={manejarCambio}
                    />
                  </div>

                  <div className="sa-form-group">
                    <label>Teléfono</label>

                    <input
                      name="telefono"
                      value={formulario.telefono}
                      onChange={manejarCambio}
                    />
                  </div>

                  <div className="sa-form-group">
                    <label>Correo</label>

                    <input
                      name="correo"
                      type="email"
                      value={formulario.correo}
                      onChange={manejarCambio}
                    />
                  </div>

                  <div className="sa-form-group full">
                    <label>Dirección</label>

                    <input
                      name="direccion"
                      value={formulario.direccion}
                      onChange={manejarCambio}
                    />
                  </div>

                  <div className="sa-form-group">
                    <label>Ciudad</label>

                    <input
                      name="ciudad"
                      value={formulario.ciudad}
                      onChange={manejarCambio}
                    />
                  </div>

                  <div className="sa-form-group">
                    <label>País</label>

                    <input
                      name="pais"
                      value={formulario.pais}
                      onChange={manejarCambio}
                    />
                  </div>

                  <div className="sa-form-group full">
                    <label>Dirección pública *</label>

                    <div className="sa-url-input">
                      <span>/tienda/</span>

                      <input
                        name="slugPublico"
                        value={formulario.slugPublico}
                        onChange={manejarCambio}
                        required
                      />
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="sa-form-error">
                    {error}
                  </div>
                )}

                <div className="sa-modal-footer">
                  <button
                    type="button"
                    className="sa-secondary-button"
                    onClick={cerrarFormulario}
                    disabled={guardando}
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className="sa-primary-button"
                    disabled={guardando}
                  >
                    {guardando
                      ? "Guardando..."
                      : empresaEditando
                        ? "Guardar cambios"
                        : "Registrar empresa"}
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

export default EmpresasPage;