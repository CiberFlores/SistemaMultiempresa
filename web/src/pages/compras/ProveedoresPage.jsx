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
import { AnimatePresence, motion } from "framer-motion";

import useAuth from "../../hooks/useAuth";
import {
  actualizarProveedor,
  cambiarEstadoProveedor,
  crearProveedor,
  suscribirProveedores
} from "../../services/proveedorService";

const inicial = {
  nombre: "",
  nit: "",
  contacto: "",
  telefono: "",
  correo: "",
  direccion: ""
};

function ProveedoresPage() {
  const { usuario } = useAuth();

  const [proveedores, setProveedores] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [editando, setEditando] = useState(null);
  const [formulario, setFormulario] = useState(inicial);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!usuario?.empresaId) return;

    const cancelar = suscribirProveedores(
      usuario.empresaId,
      setProveedores,
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

  const abrirEditar = (proveedor) => {
    setEditando(proveedor);
    setFormulario({
      nombre: proveedor.nombre || "",
      nit: proveedor.nit || "",
      contacto: proveedor.contacto || "",
      telefono: proveedor.telefono || "",
      correo: proveedor.correo || "",
      direccion: proveedor.direccion || ""
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
        await actualizarProveedor(editando.id, formulario);
      } else {
        await crearProveedor(usuario.empresaId, formulario);
      }

      setMostrar(false);
      setEditando(null);
      setFormulario(inicial);
    } catch (error) {
      console.error(error);
      setError(error.message || "No se pudo guardar el proveedor.");
    } finally {
      setGuardando(false);
    }
  };

  const estado = async (proveedor) => {
    const nuevo = proveedor.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO";

    if (!window.confirm(`¿Cambiar \"${proveedor.nombre}\" a ${nuevo}?`)) {
      return;
    }

    await cambiarEstadoProveedor(proveedor.id, nuevo);
  };

  const filtrados = proveedores.filter((p) => {
    const texto = busqueda.toLowerCase();

    return (
      p.nombre?.toLowerCase().includes(texto) ||
      p.nit?.toLowerCase().includes(texto) ||
      p.contacto?.toLowerCase().includes(texto) ||
      p.correo?.toLowerCase().includes(texto)
    );
  });

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1>Proveedores</h1>
          <p>Gestiona proveedores utilizados en el módulo de compras.</p>
        </div>

        <button className="admin-primary-button" onClick={abrirNuevo}>
          <Plus size={18} />
          Nuevo proveedor
        </button>
      </div>

      <section className="admin-card">
        <div className="admin-toolbar">
          <div className="admin-search">
            <Search size={18} />
            <input
              placeholder="Buscar proveedor..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          <span>{proveedores.length} proveedor(es)</span>
        </div>

        {filtrados.length === 0 ? (
          <div className="admin-empty admin-empty-column">
            <Building2 size={42} />
            <strong>No existen proveedores</strong>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Proveedor</th>
                  <th>NIT</th>
                  <th>Contacto</th>
                  <th>Teléfono</th>
                  <th>Correo</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {filtrados.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.nombre}</strong>
                      <small>{p.direccion || "Sin dirección"}</small>
                    </td>
                    <td>{p.nit || "-"}</td>
                    <td>{p.contacto || "-"}</td>
                    <td>{p.telefono || "-"}</td>
                    <td>{p.correo || "-"}</td>
                    <td>
                      <span
                        className={
                          p.estado === "ACTIVO"
                            ? "admin-badge active"
                            : "admin-badge inactive"
                        }
                      >
                        {p.estado}
                      </span>
                    </td>
                    <td>
                      <div className="admin-actions">
                        <button onClick={() => abrirEditar(p)}>
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => estado(p)}>
                          {p.estado === "ACTIVO"
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
          <motion.div className="admin-modal-overlay" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
            <motion.div className="admin-modal" initial={{opacity:0,y:18,scale:.96}} animate={{opacity:1,y:0,scale:1}}>
              <div className="admin-modal-header">
                <div>
                  <h2>{editando ? "Editar proveedor" : "Nuevo proveedor"}</h2>
                  <p>Información comercial del proveedor.</p>
                </div>
                <button onClick={cerrar}><X size={20}/></button>
              </div>

              <form onSubmit={guardar}>
                <div className="admin-form-grid">
                  <div className="admin-form-group">
                    <label>Nombre *</label>
                    <input name="nombre" value={formulario.nombre} onChange={cambio} required/>
                  </div>
                  <div className="admin-form-group">
                    <label>NIT</label>
                    <input name="nit" value={formulario.nit} onChange={cambio}/>
                  </div>
                  <div className="admin-form-group">
                    <label>Contacto</label>
                    <input name="contacto" value={formulario.contacto} onChange={cambio}/>
                  </div>
                  <div className="admin-form-group">
                    <label>Teléfono</label>
                    <input name="telefono" value={formulario.telefono} onChange={cambio}/>
                  </div>
                  <div className="admin-form-group full">
                    <label>Correo</label>
                    <input type="email" name="correo" value={formulario.correo} onChange={cambio}/>
                  </div>
                  <div className="admin-form-group full">
                    <label>Dirección</label>
                    <input name="direccion" value={formulario.direccion} onChange={cambio}/>
                  </div>
                </div>

                {error && <div className="admin-message error">{error}</div>}

                <div className="admin-modal-footer">
                  <button type="button" className="admin-secondary-button" onClick={cerrar}>Cancelar</button>
                  <button className="admin-primary-button" disabled={guardando}>{guardando?"Guardando...":"Guardar proveedor"}</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ProveedoresPage;
