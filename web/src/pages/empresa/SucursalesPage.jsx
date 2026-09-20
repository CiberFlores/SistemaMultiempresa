import { useEffect, useState } from "react";

import {
  Building2,
  CircleCheck,
  Pencil,
  Plus,
  Power,
  Search,
  X
} from "lucide-react";

import {
  AnimatePresence,
  motion
} from "framer-motion";

import useAuth from "../../hooks/useAuth";

import {
  actualizarSucursal,
  cambiarEstadoSucursal,
  crearSucursal,
  suscribirSucursales
} from "../../services/sucursalService";

const formularioInicial = {
  nombre: "",
  codigo: "",
  telefono: "",
  direccion: "",
  ciudad: "Cochabamba"
};

function SucursalesPage() {
  const { usuario } = useAuth();

  const [sucursales, setSucursales] = useState([]);
  const [busqueda, setBusqueda] = useState("");

  const [mostrarFormulario, setMostrarFormulario] =
    useState(false);

  const [sucursalEditando, setSucursalEditando] =
    useState(null);

  const [formulario, setFormulario] =
    useState(formularioInicial);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!usuario?.empresaId) {
      return;
    }

    const cancelar = suscribirSucursales(
      usuario.empresaId,

      (datos) => {
        setSucursales(datos);
        setCargando(false);
      },

      (error) => {
        console.error(error);

        setError(
          "No se pudieron cargar las sucursales."
        );

        setCargando(false);
      }
    );

    return () => cancelar();
  }, [usuario]);

  const manejarCambio = (e) => {
    const { name, value } = e.target;

    setFormulario((anterior) => ({
      ...anterior,
      [name]: value
    }));
  };

  const nuevaSucursal = () => {
    setSucursalEditando(null);
    setFormulario(formularioInicial);
    setError("");
    setMostrarFormulario(true);
  };

  const editarSucursal = (sucursal) => {
    setSucursalEditando(sucursal);

    setFormulario({
      nombre: sucursal.nombre || "",
      codigo: sucursal.codigo || "",
      telefono: sucursal.telefono || "",
      direccion: sucursal.direccion || "",
      ciudad: sucursal.ciudad || ""
    });

    setError("");
    setMostrarFormulario(true);
  };

  const cerrarFormulario = () => {
    if (guardando) {
      return;
    }

    setMostrarFormulario(false);
    setSucursalEditando(null);
    setFormulario(formularioInicial);
    setError("");
  };

  const guardar = async (e) => {
    e.preventDefault();

    setError("");

    if (
      !formulario.nombre.trim() ||
      !formulario.codigo.trim()
    ) {
      setError(
        "Nombre y código de sucursal son obligatorios."
      );

      return;
    }

    try {
      setGuardando(true);

      if (sucursalEditando) {
        await actualizarSucursal(
          sucursalEditando.id,
          formulario
        );
      } else {
        await crearSucursal(
          usuario.empresaId,
          formulario
        );
      }

      setMostrarFormulario(false);
      setSucursalEditando(null);
      setFormulario(formularioInicial);
    } catch (error) {
      console.error(error);

      setError(
        "No se pudo guardar la sucursal."
      );
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (sucursal) => {
    const nuevoEstado =
      sucursal.estado === "ACTIVA"
        ? "INACTIVA"
        : "ACTIVA";

    const confirmar = window.confirm(
      `¿Deseas ${
        nuevoEstado === "ACTIVA"
          ? "reactivar"
          : "desactivar"
      } "${sucursal.nombre}"?`
    );

    if (!confirmar) {
      return;
    }

    try {
      await cambiarEstadoSucursal(
        sucursal.id,
        nuevoEstado
      );
    } catch (error) {
      console.error(error);

      alert(
        "No se pudo modificar el estado."
      );
    }
  };

  const sucursalesFiltradas =
    sucursales.filter((sucursal) => {
      const texto =
        busqueda.toLowerCase();

      return (
        sucursal.nombre
          ?.toLowerCase()
          .includes(texto) ||

        sucursal.codigo
          ?.toLowerCase()
          .includes(texto) ||

        sucursal.ciudad
          ?.toLowerCase()
          .includes(texto)
      );
    });

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1>Sucursales</h1>

          <p>
            Administra los establecimientos
            de tu empresa.
          </p>
        </div>

        <button
          className="admin-primary-button"
          onClick={nuevaSucursal}
        >
          <Plus size={18} />
          Nueva sucursal
        </button>
      </div>

      <section className="admin-card">
        <div className="admin-toolbar">
          <div className="admin-search">
            <Search size={18} />

            <input
              placeholder="Buscar sucursal..."
              value={busqueda}
              onChange={(e) =>
                setBusqueda(e.target.value)
              }
            />
          </div>

          <span>
            {sucursales.length} sucursal
            {sucursales.length !== 1 && "es"}
          </span>
        </div>

        {cargando ? (
          <div className="admin-empty">
            Cargando sucursales...
          </div>
        ) : sucursalesFiltradas.length === 0 ? (
          <div className="admin-empty admin-empty-column">
            <Building2 size={42} />

            <strong>
              No existen sucursales
            </strong>

            <span>
              Registra la primera sucursal.
            </span>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Sucursal</th>
                  <th>Código</th>
                  <th>Ciudad</th>
                  <th>Teléfono</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {sucursalesFiltradas.map(
                  (sucursal) => (
                    <tr key={sucursal.id}>
                      <td>
                        <strong>
                          {sucursal.nombre}
                        </strong>

                        <small>
                          {sucursal.direccion ||
                            "Sin dirección"}
                        </small>
                      </td>

                      <td>
                        {sucursal.codigo}
                      </td>

                      <td>
                        {sucursal.ciudad}
                      </td>

                      <td>
                        {sucursal.telefono ||
                          "Sin teléfono"}
                      </td>

                      <td>
                        <span
                          className={
                            sucursal.estado === "ACTIVA"
                              ? "admin-badge active"
                              : "admin-badge inactive"
                          }
                        >
                          {sucursal.estado}
                        </span>
                      </td>

                      <td>
                        <div className="admin-actions">
                          <button
                            title="Editar"
                            onClick={() =>
                              editarSucursal(
                                sucursal
                              )
                            }
                          >
                            <Pencil size={17} />
                          </button>

                          <button
                            title={
                              sucursal.estado ===
                              "ACTIVA"
                                ? "Desactivar"
                                : "Reactivar"
                            }
                            onClick={() =>
                              cambiarEstado(
                                sucursal
                              )
                            }
                          >
                            {sucursal.estado ===
                            "ACTIVA" ? (
                              <Power size={17} />
                            ) : (
                              <CircleCheck
                                size={17}
                              />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <AnimatePresence>
        {mostrarFormulario && (
          <motion.div
            className="admin-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="admin-modal"
              initial={{
                opacity: 0,
                scale: 0.96,
                y: 15
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0
              }}
              exit={{
                opacity: 0,
                scale: 0.96,
                y: 15
              }}
            >
              <div className="admin-modal-header">
                <div>
                  <h2>
                    {sucursalEditando
                      ? "Editar sucursal"
                      : "Nueva sucursal"}
                  </h2>

                  <p>
                    Información del establecimiento.
                  </p>
                </div>

                <button
                  onClick={cerrarFormulario}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={guardar}>
                <div className="admin-form-grid">
                  <div className="admin-form-group">
                    <label>
                      Nombre *
                    </label>

                    <input
                      name="nombre"
                      value={formulario.nombre}
                      onChange={manejarCambio}
                      required
                    />
                  </div>

                  <div className="admin-form-group">
                    <label>
                      Código *
                    </label>

                    <input
                      name="codigo"
                      value={formulario.codigo}
                      onChange={manejarCambio}
                      placeholder="SUC-001"
                      required
                    />
                  </div>

                  <div className="admin-form-group">
                    <label>
                      Ciudad
                    </label>

                    <input
                      name="ciudad"
                      value={formulario.ciudad}
                      onChange={manejarCambio}
                    />
                  </div>

                  <div className="admin-form-group">
                    <label>
                      Teléfono
                    </label>

                    <input
                      name="telefono"
                      value={formulario.telefono}
                      onChange={manejarCambio}
                    />
                  </div>

                  <div className="admin-form-group full">
                    <label>
                      Dirección
                    </label>

                    <input
                      name="direccion"
                      value={formulario.direccion}
                      onChange={manejarCambio}
                    />
                  </div>
                </div>

                {error && (
                  <div className="admin-message error">
                    {error}
                  </div>
                )}

                <div className="admin-modal-footer">
                  <button
                    type="button"
                    className="admin-secondary-button"
                    onClick={cerrarFormulario}
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className="admin-primary-button"
                    disabled={guardando}
                  >
                    {guardando
                      ? "Guardando..."
                      : sucursalEditando
                        ? "Guardar cambios"
                        : "Crear sucursal"}
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

export default SucursalesPage;