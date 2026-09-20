import { useEffect, useState } from "react";
import { ReceiptText, RefreshCw } from "lucide-react";

import useAuth from "../../hooks/useAuth";
import { suscribirClientes } from "../../services/clienteService";
import { suscribirSucursales } from "../../services/sucursalService";
import { listarVentas } from "../../services/ventaService";

function VentasPage() {
  const { usuario } = useAuth();

  const [ventas, setVentas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [cargando, setCargando] = useState(true);

  const cargarVentas = async () => {
    if (!usuario?.empresaId) return;

    try {
      setCargando(true);
      setVentas(await listarVentas(usuario.empresaId));
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (!usuario?.empresaId) return;

    cargarVentas();

    const cancelarClientes = suscribirClientes(
      usuario.empresaId,
      setClientes,
      console.error
    );

    const cancelarSucursales = suscribirSucursales(
      usuario.empresaId,
      setSucursales,
      console.error
    );

    return () => {
      cancelarClientes();
      cancelarSucursales();
    };
  }, [usuario]);

  const cliente = (id) =>
    id
      ? clientes.find((c) => c.id === id)?.nombre || "Cliente"
      : "Consumidor final";

  const sucursal = (id) =>
    sucursales.find((s) => s.id === id)?.nombre || "Sucursal";

  const totalVentas = ventas.reduce(
    (total, venta) => total + Number(venta.total || 0),
    0
  );

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1>Ventas</h1>
          <p>Historial de operaciones registradas desde el punto de venta.</p>
        </div>

        <button className="admin-refresh-button" onClick={cargarVentas}>
          <RefreshCw size={18}/>
        </button>
      </div>

      <section className="commerce-metrics">
        <article>
          <ReceiptText size={20}/>
          <div><span>Ventas</span><strong>{ventas.length}</strong></div>
        </article>

        <article>
          <ReceiptText size={20}/>
          <div><span>Total vendido</span><strong>Bs {totalVentas.toFixed(2)}</strong></div>
        </article>
      </section>

      <section className="admin-card">
        {cargando ? (
          <div className="admin-empty">Cargando ventas...</div>
        ) : ventas.length === 0 ? (
          <div className="admin-empty admin-empty-column">
            <ReceiptText size={42}/>
            <strong>No existen ventas</strong>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Venta</th>
                  <th>Cliente</th>
                  <th>Sucursal</th>
                  <th>Pago</th>
                  <th>Subtotal</th>
                  <th>Descuento</th>
                  <th>Total</th>
                  <th>Estado</th>
                </tr>
              </thead>

              <tbody>
                {ventas.map((venta)=>(
                  <tr key={venta.id}>
                    <td><span className="admin-code-chip">{venta.id.slice(0,8)}</span></td>
                    <td>{cliente(venta.clienteId)}</td>
                    <td>{sucursal(venta.sucursalId)}</td>
                    <td>{venta.metodoPago}</td>
                    <td>Bs {Number(venta.subtotal || 0).toFixed(2)}</td>
                    <td>Bs {Number(venta.descuento || 0).toFixed(2)}</td>
                    <td><strong>Bs {Number(venta.total || 0).toFixed(2)}</strong></td>
                    <td><span className="admin-badge active">{venta.estado}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default VentasPage;
