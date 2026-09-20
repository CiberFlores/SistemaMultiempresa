import { useEffect, useMemo, useState } from "react";
import {
  CircleDollarSign,
  LockKeyhole,
  Plus,
  Store,
  X
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import useAuth from "../../hooks/useAuth";
import { suscribirSucursales } from "../../services/sucursalService";
import {
  abrirCaja,
  cerrarCaja,
  suscribirCajas
} from "../../services/cajaService";

const inicial = {
  sucursalId: "",
  nombre: "Caja principal",
  saldoInicial: "0"
};

function CajasPage() {
  const { usuario } = useAuth();

  const [cajas, setCajas] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [mostrar, setMostrar] = useState(false);
  const [formulario, setFormulario] = useState(inicial);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!usuario?.empresaId) return;

    const cancelarCajas = suscribirCajas(
      usuario.empresaId,
      setCajas,
      console.error
    );

    const cancelarSucursales = suscribirSucursales(
      usuario.empresaId,
      setSucursales,
      console.error
    );

    return () => {
      cancelarCajas();
      cancelarSucursales();
    };
  }, [usuario]);

  const nombreSucursal = (id) =>
    sucursales.find((s) => s.id === id)?.nombre || "Sucursal";

  const stats = useMemo(() => ({
    total: cajas.length,
    abiertas: cajas.filter((c) => c.estado === "ABIERTA").length,
    cerradas: cajas.filter((c) => c.estado === "CERRADA").length
  }), [cajas]);

  const abrirModal = () => {
    setFormulario(inicial);
    setError("");
    setMostrar(true);
  };

  const cerrarModal = () => {
    if (guardando) return;
    setMostrar(false);
    setFormulario(inicial);
    setError("");
  };

  const guardar = async (e) => {
    e.preventDefault();

    try {
      setGuardando(true);
      setError("");

      await abrirCaja({
        empresaId: usuario.empresaId,
        sucursalId: formulario.sucursalId,
        nombre: formulario.nombre,
        saldoInicial: formulario.saldoInicial,
        usuarioId: usuario.uid
      });

      setMostrar(false);
      setFormulario(inicial);
    } catch (error) {
      console.error(error);
      setError(error.message || "No se pudo abrir la caja.");
    } finally {
      setGuardando(false);
    }
  };

  const cerrarSesionCaja = async (caja) => {
    if (!window.confirm(`¿Cerrar \"${caja.nombre}\"?`)) return;

    try {
      await cerrarCaja(caja, usuario.uid);
    } catch (error) {
      console.error(error);
      alert(error.message || "No se pudo cerrar la caja.");
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1>Cajas</h1>
          <p>Apertura, cierre y control de movimientos en efectivo.</p>
        </div>

        <button className="admin-primary-button" onClick={abrirModal}>
          <Plus size={18}/>
          Abrir caja
        </button>
      </div>

      <section className="commerce-metrics">
        <article><CircleDollarSign size={20}/><div><span>Sesiones</span><strong>{stats.total}</strong></div></article>
        <article><Store size={20}/><div><span>Abiertas</span><strong>{stats.abiertas}</strong></div></article>
        <article><LockKeyhole size={20}/><div><span>Cerradas</span><strong>{stats.cerradas}</strong></div></article>
      </section>

      <section className="admin-card">
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Caja</th>
                <th>Sucursal</th>
                <th>Saldo inicial</th>
                <th>Ingresos</th>
                <th>Egresos</th>
                <th>Saldo final</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>

            <tbody>
              {cajas.map((caja)=>(
                <tr key={caja.id}>
                  <td><strong>{caja.nombre}</strong></td>
                  <td>{nombreSucursal(caja.sucursalId)}</td>
                  <td>Bs {Number(caja.saldoInicial || 0).toFixed(2)}</td>
                  <td>Bs {Number(caja.totalIngresos || 0).toFixed(2)}</td>
                  <td>Bs {Number(caja.totalEgresos || 0).toFixed(2)}</td>
                  <td>{caja.saldoFinal == null ? "-" : `Bs ${Number(caja.saldoFinal).toFixed(2)}`}</td>
                  <td>
                    <span className={caja.estado==="ABIERTA"?"admin-badge active":"admin-badge inactive"}>
                      {caja.estado}
                    </span>
                  </td>
                  <td>
                    {caja.estado === "ABIERTA" && (
                      <button className="admin-mini-button" onClick={()=>cerrarSesionCaja(caja)}>
                        Cerrar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {cajas.length === 0 && (
          <div className="admin-empty">No existen cajas registradas.</div>
        )}
      </section>

      <AnimatePresence>
        {mostrar && (
          <motion.div className="admin-modal-overlay" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
            <motion.div className="admin-modal" initial={{opacity:0,y:18,scale:.96}} animate={{opacity:1,y:0,scale:1}}>
              <div className="admin-modal-header">
                <div><h2>Abrir caja</h2><p>Inicia una nueva sesión de caja.</p></div>
                <button onClick={cerrarModal}><X size={20}/></button>
              </div>

              <form onSubmit={guardar}>
                <div className="admin-form-grid">
                  <div className="admin-form-group">
                    <label>Sucursal *</label>
                    <select
                      value={formulario.sucursalId}
                      onChange={(e)=>setFormulario(a=>({...a,sucursalId:e.target.value}))}
                      required
                    >
                      <option value="">Seleccionar</option>
                      {sucursales.filter(s=>s.estado==="ACTIVA").map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}
                    </select>
                  </div>
                  <div className="admin-form-group">
                    <label>Nombre *</label>
                    <input value={formulario.nombre} onChange={(e)=>setFormulario(a=>({...a,nombre:e.target.value}))} required/>
                  </div>
                  <div className="admin-form-group full">
                    <label>Saldo inicial</label>
                    <input type="number" min="0" step="0.01" value={formulario.saldoInicial} onChange={(e)=>setFormulario(a=>({...a,saldoInicial:e.target.value}))}/>
                  </div>
                </div>

                {error && <div className="admin-message error">{error}</div>}

                <div className="admin-modal-footer">
                  <button type="button" className="admin-secondary-button" onClick={cerrarModal}>Cancelar</button>
                  <button className="admin-primary-button" disabled={guardando}>{guardando?"Abriendo...":"Abrir caja"}</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CajasPage;
