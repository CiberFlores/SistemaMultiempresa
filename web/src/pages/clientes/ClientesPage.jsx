import { useEffect, useState } from "react";
import {
  CircleCheck,
  Pencil,
  Plus,
  Power,
  Search,
  UserRound,
  X
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import useAuth from "../../hooks/useAuth";
import {
  actualizarCliente,
  cambiarEstadoCliente,
  crearCliente,
  suscribirClientes
} from "../../services/clienteService";

const inicial = {
  nombre: "",
  documento: "",
  telefono: "",
  correo: "",
  direccion: "",
  tipo: "PERSONA"
};

function ClientesPage() {
  const { usuario } = useAuth();

  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [editando, setEditando] = useState(null);
  const [formulario, setFormulario] = useState(inicial);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!usuario?.empresaId) return;

    const cancelar = suscribirClientes(
      usuario.empresaId,
      setClientes,
      console.error
    );

    return () => cancelar();
  }, [usuario]);

  const abrirNuevo = () => {
    setEditando(null);
    setFormulario(inicial);
    setError("");
    setMostrar(true);
  };

  const abrirEditar = (cliente) => {
    setEditando(cliente);
    setFormulario({
      nombre: cliente.nombre || "",
      documento: cliente.documento || "",
      telefono: cliente.telefono || "",
      correo: cliente.correo || "",
      direccion: cliente.direccion || "",
      tipo: cliente.tipo || "PERSONA"
    });
    setError("");
    setMostrar(true);
  };

  const cerrar = () => {
    if (guardando) return;
    setMostrar(false);
    setEditando(null);
    setFormulario(inicial);
    setError("");
  };

  const cambio = (e) => {
    const { name, value } = e.target;
    setFormulario((a) => ({ ...a, [name]: value }));
  };

  const guardar = async (e) => {
    e.preventDefault();

    try {
      setGuardando(true);
      setError("");

      if (editando) {
        await actualizarCliente(editando.id, formulario);
      } else {
        await crearCliente(usuario.empresaId, formulario);
      }

      setMostrar(false);
      setEditando(null);
      setFormulario(inicial);
    } catch (error) {
      console.error(error);
      setError(error.message || "No se pudo guardar el cliente.");
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (cliente) => {
    const estado = cliente.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO";

    if (!window.confirm(`¿Cambiar \"${cliente.nombre}\" a ${estado}?`)) {
      return;
    }

    await cambiarEstadoCliente(cliente.id, estado);
  };

  const filtrados = clientes.filter((cliente) => {
    const texto = busqueda.toLowerCase();

    return (
      cliente.nombre?.toLowerCase().includes(texto) ||
      cliente.documento?.toLowerCase().includes(texto) ||
      cliente.correo?.toLowerCase().includes(texto) ||
      cliente.telefono?.toLowerCase().includes(texto)
    );
  });

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1>Clientes</h1>
          <p>Gestiona los clientes utilizados en ventas y facturación.</p>
        </div>

        <button className="admin-primary-button" onClick={abrirNuevo}>
          <Plus size={18} />
          Nuevo cliente
        </button>
      </div>

      <section className="admin-card">
        <div className="admin-toolbar">
          <div className="admin-search">
            <Search size={18} />
            <input
              placeholder="Buscar cliente..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          <span>{clientes.length} cliente(s)</span>
        </div>

        {filtrados.length === 0 ? (
          <div className="admin-empty admin-empty-column">
            <UserRound size={42} />
            <strong>No existen clientes</strong>
            <span>Registra el primer cliente.</span>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Documento</th>
                  <th>Teléfono</th>
                  <th>Correo</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {filtrados.map((cliente) => (
                  <tr key={cliente.id}>
                    <td>
                      <strong>{cliente.nombre}</strong>
                      <small>{cliente.direccion || "Sin dirección"}</small>
                    </td>
                    <td>{cliente.documento || "-"}</td>
                    <td>{cliente.telefono || "-"}</td>
                    <td>{cliente.correo || "-"}</td>
                    <td>{cliente.tipo}</td>
                    <td>
                      <span
                        className={
                          cliente.estado === "ACTIVO"
                            ? "admin-badge active"
                            : "admin-badge inactive"
                        }
                      >
                        {cliente.estado}
                      </span>
                    </td>
                    <td>
                      <div className="admin-actions">
                        <button onClick={() => abrirEditar(cliente)}>
                          <Pencil size={16} />
                        </button>

                        <button onClick={() => cambiarEstado(cliente)}>
                          {cliente.estado === "ACTIVO"
                            ? <Power size={16} />
                            : <CircleCheck size={16} />
                          }
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
        {mostrar && (
          <motion.div
            className="admin-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="admin-modal"
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
            >
              <div className="admin-modal-header">
                <div>
                  <h2>{editando ? "Editar cliente" : "Nuevo cliente"}</h2>
                  <p>Información comercial del cliente.</p>
                </div>

                <button onClick={cerrar}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={guardar}>
                <div className="admin-form-grid">
                  <div className="admin-form-group">
                    <label>Nombre *</label>
                    <input name="nombre" value={formulario.nombre} onChange={cambio} required />
                  </div>

                  <div className="admin-form-group">
                    <label>Documento / NIT / CI</label>
                    <input name="documento" value={formulario.documento} onChange={cambio} />
                  </div>

                  <div className="admin-form-group">
                    <label>Teléfono</label>
                    <input name="telefono" value={formulario.telefono} onChange={cambio} />
                  </div>

                  <div className="admin-form-group">
                    <label>Correo</label>
                    <input type="email" name="correo" value={formulario.correo} onChange={cambio} />
                  </div>

                  <div className="admin-form-group">
                    <label>Tipo</label>
                    <select name="tipo" value={formulario.tipo} onChange={cambio}>
                      <option value="PERSONA">Persona</option>
                      <option value="EMPRESA">Empresa</option>
                    </select>
                  </div>

                  <div className="admin-form-group full">
                    <label>Dirección</label>
                    <input name="direccion" value={formulario.direccion} onChange={cambio} />
                  </div>
                </div>

                {error && <div className="admin-message error">{error}</div>}

                <div className="admin-modal-footer">
                  <button type="button" className="admin-secondary-button" onClick={cerrar}>
                    Cancelar
                  </button>

                  <button className="admin-primary-button" disabled={guardando}>
                    {guardando ? "Guardando..." : "Guardar cliente"}
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

export default ClientesPage;
