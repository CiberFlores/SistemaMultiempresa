import { useEffect, useState } from "react";

import {
  Boxes,
  CircleCheck,
  Pencil,
  Plus,
  Power,
  Search,
  X
} from "lucide-react";

import { AnimatePresence, motion } from "framer-motion";

import {
  actualizarModulo,
  cambiarEstadoModulo,
  crearModulo,
  suscribirModulos
} from "../../services/moduloService";

const formularioInicial = {
  nombre: "",
  codigo: "",
  descripcion: "",
  icono: ""
};

function ModulosGlobalesPage() {
  const [modulos, setModulos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);

  const [mostrarModal, setMostrarModal] = useState(false);
  const [moduloEditando, setModuloEditando] = useState(null);

  const [formulario, setFormulario] =
    useState(formularioInicial);

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const cancelar = suscribirModulos(
      (datos) => {
        setModulos(datos);
        setCargando(false);
      },
      () => {
        setError("No se pudieron cargar los módulos.");
        setCargando(false);
      }
    );

    return () => cancelar();
  }, []);

  const abrirNuevo = () => {
    setModuloEditando(null);
    setFormulario(formularioInicial);
    setError("");
    setMostrarModal(true);
  };

  const abrirEditar = (modulo) => {
    setModuloEditando(modulo);

    setFormulario({
      nombre: modulo.nombre || "",
      codigo: modulo.codigo || "",
      descripcion: modulo.descripcion || "",
      icono: modulo.icono || ""
    });

    setError("");
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    if (guardando) {
      return;
    }

    setMostrarModal(false);
    setModuloEditando(null);
    setFormulario(formularioInicial);
    setError("");
  };

  const manejarCambio = (e) => {
    const { name, value } = e.target;

    setFormulario((anterior) => ({
      ...anterior,
      [name]: value
    }));
  };

  const guardar = async (e) => {
    e.preventDefault();

    if (!formulario.nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }

    if (!formulario.codigo.trim()) {
      setError("El código es obligatorio.");
      return;
    }

    try {
      setGuardando(true);
      setError("");

      if (moduloEditando) {
        await actualizarModulo(
          moduloEditando.id,
          formulario
        );
      } else {
        await crearModulo(formulario);
      }

      cerrarModal();
    } catch (error) {
      console.error(error);
      setError("No se pudo guardar el módulo.");
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (modulo) => {
    const nuevoEstado = !modulo.activo;

    const confirmar = window.confirm(
      `¿Deseas ${
        nuevoEstado ? "activar" : "desactivar"
      } el módulo "${modulo.nombre}"?`
    );

    if (!confirmar) {
      return;
    }

    try {
      await cambiarEstadoModulo(
        modulo.id,
        nuevoEstado
      );
    } catch (error) {
      console.error(error);
      alert("No se pudo cambiar el estado.");
    }
  };

  const modulosFiltrados = modulos.filter((modulo) => {
    const texto = busqueda.toLowerCase();

    return (
      modulo.nombre?.toLowerCase().includes(texto) ||
      modulo.codigo?.toLowerCase().includes(texto) ||
      modulo.descripcion?.toLowerCase().includes(texto)
    );
  });

  return (
    <div>
      <div className="sa-page-header">
        <div>
          <h1>Módulos</h1>
          <p>
            Configura las funcionalidades disponibles
            dentro de la plataforma.
          </p>
        </div>

        <button
          className="sa-primary-button"
          onClick={abrirNuevo}
        >
          <Plus size={17} />
          Nuevo módulo
        </button>
      </div>

      <section className="sa-panel">
        <div className="sa-table-toolbar">
          <div className="sa-table-search">
            <Search size={17} />

            <input
              placeholder="Buscar módulo..."
              value={busqueda}
              onChange={(e) =>
                setBusqueda(e.target.value)
              }
            />
          </div>

          <span>
            {modulos.length} módulos
          </span>
        </div>

        {cargando ? (
          <div className="sa-empty">
            Cargando módulos...
          </div>
        ) : modulosFiltrados.length === 0 ? (
          <div className="sa-empty">
            <Boxes size={40} />

            <strong>
              Sin módulos registrados
            </strong>

            <span>
              Crea los módulos que posteriormente
              podrán asignarse a los planes.
            </span>
          </div>
        ) : (
          <div className="sa-table-container">
            <table className="sa-table">
              <thead>
                <tr>
                  <th>MÓDULO</th>
                  <th>CÓDIGO</th>
                  <th>DESCRIPCIÓN</th>
                  <th>ESTADO</th>
                  <th>ACCIONES</th>
                </tr>
              </thead>

              <tbody>
                {modulosFiltrados.map((modulo) => (
                  <tr key={modulo.id}>
                    <td>
                      <strong>
                        {modulo.nombre}
                      </strong>
                    </td>

                    <td>
                      <span className="sa-slug">
                        {modulo.codigo}
                      </span>
                    </td>

                    <td>
                      {modulo.descripcion || "-"}
                    </td>

                    <td>
                      <span
                        className={
                          modulo.activo
                            ? "sa-badge active"
                            : "sa-badge suspended"
                        }
                      >
                        {modulo.activo
                          ? "ACTIVO"
                          : "INACTIVO"}
                      </span>
                    </td>

                    <td>
                      <div className="sa-actions">
                        <button
                          title="Editar"
                          onClick={() =>
                            abrirEditar(modulo)
                          }
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          title={
                            modulo.activo
                              ? "Desactivar"
                              : "Activar"
                          }
                          onClick={() =>
                            cambiarEstado(modulo)
                          }
                        >
                          {modulo.activo ? (
                            <Power size={16} />
                          ) : (
                            <CircleCheck size={16} />
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
        {mostrarModal && (
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
                y: 20,
                scale: 0.96
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1
              }}
              exit={{
                opacity: 0,
                y: 20,
                scale: 0.96
              }}
            >
              <div className="sa-modal-header">
                <div>
                  <h2>
                    {moduloEditando
                      ? "Editar módulo"
                      : "Nuevo módulo"}
                  </h2>

                  <p>
                    Configura una funcionalidad global.
                  </p>
                </div>

                <button onClick={cerrarModal}>
                  <X size={19} />
                </button>
              </div>

              <form onSubmit={guardar}>
                <div className="sa-form-grid">
                  <div className="sa-form-group">
                    <label>Nombre *</label>

                    <input
                      name="nombre"
                      value={formulario.nombre}
                      onChange={manejarCambio}
                      placeholder="Inventario"
                    />
                  </div>

                  <div className="sa-form-group">
                    <label>Código *</label>

                    <input
                      name="codigo"
                      value={formulario.codigo}
                      onChange={manejarCambio}
                      placeholder="INVENTARIO"
                    />
                  </div>

                  <div className="sa-form-group full">
                    <label>Descripción</label>

                    <textarea
                      name="descripcion"
                      value={formulario.descripcion}
                      onChange={manejarCambio}
                      placeholder="Descripción del módulo..."
                    />
                  </div>

                  <div className="sa-form-group full">
                    <label>Icono</label>

                    <input
                      name="icono"
                      value={formulario.icono}
                      onChange={manejarCambio}
                      placeholder="Opcional"
                    />
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
                    onClick={cerrarModal}
                  >
                    Cancelar
                  </button>

                  <button
                    className="sa-primary-button"
                    disabled={guardando}
                  >
                    {guardando
                      ? "Guardando..."
                      : moduloEditando
                        ? "Guardar cambios"
                        : "Crear módulo"}
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

export default ModulosGlobalesPage;