import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, PackageX, Search, ShoppingBag } from "lucide-react";

import useAuth from "../../hooks/useAuth";
import {
  listarLotesInventario,
  obtenerCatalogosInventario,
  suscribirInventario
} from "../../services/inventarioService";

import "../../styles/roles-empresa.css";
import "../../styles/trabajadores-empresa.css";
import "../../styles/inventario-empresa.css";

const cantidad = (valor) => Number(valor || 0).toLocaleString("es-BO", { maximumFractionDigits: 2 });

const normalizar = (valor) =>
  String(valor ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

function hoyLocal() {
  const hoy = new Date();
  return [
    hoy.getFullYear(),
    String(hoy.getMonth() + 1).padStart(2, "0"),
    String(hoy.getDate()).padStart(2, "0")
  ].join("-");
}

export default function StockAlertasPage() {
  const { usuario } = useAuth();
  const empresaId = usuario?.empresaId;

  const [inventarios, setInventarios] = useState([]);
  const [productos, setProductos] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("TODAS");

  useEffect(() => {
    if (!empresaId) return undefined;

    let activo = true;

    const cancelar = suscribirInventario(
      empresaId,
      (datos) => {
        if (!activo) return;
        setInventarios(datos);
        setCargando(false);
      },
      (error) => {
        console.error(error);
        if (activo) setCargando(false);
      }
    );

    obtenerCatalogosInventario(empresaId)
      .then((datos) => {
        if (!activo) return;
        setProductos(datos.productos || []);
        setSucursales(datos.sucursales || []);
      })
      .catch(console.error);

    listarLotesInventario(empresaId)
      .then((datos) => activo && setLotes(datos))
      .catch(console.error);

    return () => {
      activo = false;
      if (typeof cancelar === "function") cancelar();
    };
  }, [empresaId]);

  const alertas = useMemo(() => {
    const productosPorId = new Map(productos.map((p) => [p.id, p]));
    const sucursalesPorId = new Map(sucursales.map((s) => [s.id, s]));
    const hoy = hoyLocal();

    // Lo que realmente se puede vender: los lotes vencidos no cuentan
    const vendiblePorClave = new Map();
    const vencidoPorClave = new Map();

    lotes.forEach((lote) => {
      const disponible = Number(lote.cantidadDisponible || 0);
      if (disponible <= 0 || lote.estado !== "ACTIVO") return;

      const clave = `${lote.sucursalId}_${lote.productoId}`;
      const vencido = !lote.fechaVencimiento || lote.fechaVencimiento < hoy;
      const mapa = vencido ? vencidoPorClave : vendiblePorClave;
      mapa.set(clave, (mapa.get(clave) || 0) + disponible);
    });

    return inventarios
      .map((inventario) => {
        const producto = productosPorId.get(inventario.productoId);
        if (!producto) return null;

        const fisico = Number(inventario.stock || 0);
        const minimo = Number(producto.stockMinimo || 0);
        const clave = `${inventario.sucursalId}_${inventario.productoId}`;
        const controla = producto.controlaVencimiento === true;

        const vendible = controla ? Math.min(fisico, vendiblePorClave.get(clave) || 0) : fisico;
        const vencido = controla ? vencidoPorClave.get(clave) || 0 : 0;

        if (vendible > minimo) return null;

        let estado = "BAJO";
        if (vendible <= 0) estado = fisico > 0 && vencido > 0 ? "SOLO_VENCIDO" : "AGOTADO";

        return {
          id: inventario.id,
          producto,
          sucursal: sucursalesPorId.get(inventario.sucursalId),
          fisico,
          vendible,
          vencido,
          minimo,
          estado
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.vendible - b.vendible);
  }, [inventarios, productos, sucursales, lotes]);

  const agotados = alertas.filter((a) => a.estado === "AGOTADO" || a.estado === "SOLO_VENCIDO").length;
  const bajos = alertas.filter((a) => a.estado === "BAJO").length;

  const visibles = alertas.filter((alerta) => {
    if (filtro === "AGOTADOS" && alerta.estado === "BAJO") return false;
    if (filtro === "BAJOS" && alerta.estado !== "BAJO") return false;

    const texto = normalizar(busqueda);
    return (
      !texto ||
      [alerta.producto.nombre, alerta.producto.sku, alerta.producto.codigoBarras, alerta.sucursal?.nombre].some((valor) =>
        normalizar(valor).includes(texto)
      )
    );
  });

  const ETIQUETAS = { AGOTADO: "Agotado", SOLO_VENCIDO: "Solo vencido", BAJO: "Stock bajo" };

  return (
    <div className="re inv">
      <header className="re-cabecera">
        <div>
          <h1>Stock bajo</h1>
          <p>Lo que se está acabando y conviene reponer. Los lotes vencidos no cuentan como stock.</p>
        </div>

        <Link to="/compras" className="re-boton">
          <ShoppingBag size={17} />
          Registrar compra
        </Link>
      </header>

      <section className="inv-metricas inv-metricas--tres" aria-label="Resumen">
        <article className="inv-metrica" data-tono={alertas.length ? "alerta" : ""}>
          <span className="inv-metrica__icono" aria-hidden="true">
            <AlertTriangle size={22} />
          </span>
          <div>
            <small>Productos en alerta</small>
            <strong>{alertas.length}</strong>
            <em>{alertas.length ? "piden reposición" : "todo en orden"}</em>
          </div>
        </article>
        <article className="inv-metrica" data-tono={agotados ? "peligro" : ""}>
          <span className="inv-metrica__icono" aria-hidden="true">
            <PackageX size={22} />
          </span>
          <div>
            <small>Sin stock para vender</small>
            <strong>{agotados}</strong>
            <em>no se pueden vender</em>
          </div>
        </article>
        <article className="inv-metrica" data-tono={bajos ? "alerta" : ""}>
          <span className="inv-metrica__icono" aria-hidden="true">
            <AlertTriangle size={22} />
          </span>
          <div>
            <small>Stock bajo</small>
            <strong>{bajos}</strong>
            <em>en o bajo su mínimo</em>
          </div>
        </article>
      </section>

      <div className="re-herramientas">
        <label className="re-busqueda">
          <Search size={19} aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar producto, código o sucursal…"
            aria-label="Buscar alertas"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </label>

        <div className="re-filtros" role="radiogroup" aria-label="Tipo de alerta">
          {[
            ["TODAS", "Todas"],
            ["AGOTADOS", "Agotados"],
            ["BAJOS", "Stock bajo"]
          ].map(([valor, texto]) => (
            <button
              key={valor}
              type="button"
              role="radio"
              aria-checked={filtro === valor}
              className="re-chip"
              data-activo={filtro === valor}
              onClick={() => setFiltro(valor)}
            >
              {texto}
            </button>
          ))}
        </div>
      </div>

      {cargando ? (
        <div className="re-vacio">Revisando existencias…</div>
      ) : visibles.length === 0 ? (
        <div className="re-vacio">
          <CheckCircle2 size={36} />
          <strong>{alertas.length === 0 ? "Todo en orden" : "No encontramos alertas"}</strong>
          <span>
            {alertas.length === 0
              ? "Ningún producto está en su mínimo. Te avisamos aquí cuando alguno se esté acabando."
              : "Prueba con otra búsqueda o cambia el filtro."}
          </span>
        </div>
      ) : (
        <section className="inv-bloque">
          <div className="inv-tabla-caja">
            <table className="inv-tabla">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Sucursal</th>
                  <th className="inv-der">Para vender</th>
                  <th className="inv-der">Mínimo</th>
                  <th>Alerta</th>
                  <th className="inv-der">Acción</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((alerta) => (
                  <tr key={alerta.id}>
                    <td data-label="Producto">
                      <div className="inv-celda">
                        <strong>{alerta.producto.nombre}</strong>
                        <small>{alerta.producto.sku || "Sin código"}</small>
                      </div>
                    </td>
                    <td data-label="Sucursal">{alerta.sucursal?.nombre || "Sucursal"}</td>
                    <td data-label="Para vender" className="inv-der">
                      <strong data-bajo="true">{cantidad(alerta.vendible)}</strong>
                      {alerta.vencido > 0 && <small className="inv-vencido">{cantidad(alerta.vencido)} vencidas</small>}
                    </td>
                    <td data-label="Mínimo" className="inv-der">
                      {cantidad(alerta.minimo)}
                    </td>
                    <td data-label="Alerta">
                      <span className="inv-pastilla" data-estado={alerta.estado === "BAJO" ? "POR_VENCER" : "VENCIDO"}>
                        {ETIQUETAS[alerta.estado]}
                      </span>
                    </td>
                    <td data-label="Acción" className="inv-der">
                      <Link to="/compras" className="re-boton re-boton--suave re-boton--chico">
                        <ShoppingBag size={15} />
                        Comprar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
