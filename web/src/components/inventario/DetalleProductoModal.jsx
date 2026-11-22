import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Barcode,
  CalendarClock,
  CheckCircle2,
  Layers,
  Package,
  Pencil,
  Store,
  X
} from "lucide-react";

import { db } from "../../services/firebase/firebaseConfig";

import "../../styles/roles-empresa.css";
import "../../styles/detalle-producto.css";

const dinero = (valor) => `Bs ${Number(valor || 0).toFixed(2)}`;

const numero = (valor) =>
  Number(valor || 0).toLocaleString("es-BO", { maximumFractionDigits: 2 });

// Días que faltan para una fecha YYYY-MM-DD (negativo si ya pasó)
function diasHasta(fecha) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fecha || ""))) return null;

  const [anio, mes, dia] = fecha.split("-").map(Number);
  const destino = new Date(anio, mes - 1, dia);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  return Math.round((destino - hoy) / 86400000);
}

function textoFecha(fecha) {
  const dias = diasHasta(fecha);
  if (dias === null) return "—";

  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Date(anio, mes - 1, dia).toLocaleDateString("es-BO", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function textoDias(dias) {
  if (dias === null) return "—";
  if (dias < 0) return `Venció hace ${Math.abs(dias)} ${Math.abs(dias) === 1 ? "día" : "días"}`;
  if (dias === 0) return "Vence hoy";
  if (dias === 1) return "Vence mañana";
  return `Faltan ${dias} días`;
}

const ETIQUETAS = {
  VIGENTE: "Vigente",
  POR_VENCER: "Por vencer",
  VENCIDO: "Vencido",
  AGOTADO: "Agotado"
};

export default function DetalleProductoModal({ producto, categorias = [], marcas = [], empresaId, alCerrar, alEditar }) {
  const [lotes, setLotes] = useState([]);
  const [inventarios, setInventarios] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;

    const consulta = (nombre) =>
      getDocs(
        query(collection(db, nombre), where("empresaId", "==", empresaId), where("productoId", "==", producto.id))
      );

    Promise.allSettled([
      producto.controlaVencimiento ? consulta("lotesInventario") : Promise.resolve({ docs: [] }),
      consulta("inventarios"),
      getDocs(query(collection(db, "sucursales"), where("empresaId", "==", empresaId)))
    ]).then(([resLotes, resInventarios, resSucursales]) => {
      if (!activo) return;

      if (resLotes.status === "fulfilled") {
        setLotes(resLotes.value.docs.map((d) => ({ id: d.id, ...d.data() })));
      } else {
        setError("No se pudieron leer los lotes de este producto.");
      }

      if (resInventarios.status === "fulfilled") {
        setInventarios(resInventarios.value.docs.map((d) => ({ id: d.id, ...d.data() })));
      }

      if (resSucursales.status === "fulfilled") {
        setSucursales(resSucursales.value.docs.map((d) => ({ id: d.id, ...d.data() })));
      }

      setCargando(false);
    });

    return () => {
      activo = false;
    };
  }, [empresaId, producto.id, producto.controlaVencimiento]);

  useEffect(() => {
    const alTeclear = (evento) => {
      if (evento.key === "Escape") alCerrar();
    };

    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [alCerrar]);

  const nombreSucursal = (id) => sucursales.find((s) => s.id === id)?.nombre || "Sucursal";
  const categoria = categorias.find((c) => c.id === producto.categoriaId)?.nombre || "Sin categoría";
  const marca = marcas.find((m) => m.id === producto.marcaId)?.nombre || "Sin marca";

  const diasAlerta = Number(producto.diasAlertaVencimiento ?? 15);

  // Cada lote con su estado; el que vence antes aparece primero (así se vende)
  const lotesOrdenados = useMemo(() => {
    const conEstado = lotes.map((lote) => {
      const disponible = Number(lote.cantidadDisponible || 0);
      const dias = diasHasta(lote.fechaVencimiento);

      let estado = "VIGENTE";
      if (lote.estado !== "ACTIVO" || disponible <= 0) estado = "AGOTADO";
      else if (dias !== null && dias < 0) estado = "VENCIDO";
      else if (dias !== null && dias <= diasAlerta) estado = "POR_VENCER";

      return { ...lote, disponible, dias, estadoLote: estado };
    });

    const peso = { VIGENTE: 0, POR_VENCER: 0, VENCIDO: 1, AGOTADO: 2 };

    return conEstado.sort(
      (a, b) =>
        peso[a.estadoLote] - peso[b.estadoLote] ||
        String(a.fechaVencimiento || "").localeCompare(String(b.fechaVencimiento || ""))
    );
  }, [lotes, diasAlerta]);

  const resumen = useMemo(() => {
    const suma = (estados) =>
      lotesOrdenados.filter((l) => estados.includes(l.estadoLote)).reduce((total, l) => total + l.disponible, 0);

    return {
      vendible: suma(["VIGENTE", "POR_VENCER"]),
      porVencer: suma(["POR_VENCER"]),
      vencido: suma(["VENCIDO"])
    };
  }, [lotesOrdenados]);

  const stockFisico = inventarios.reduce((total, fila) => total + Number(fila.stockFisico ?? fila.stock ?? 0), 0);
  const stockMinimo = Number(producto.stockMinimo || 0);
  const bajo = stockFisico <= stockMinimo;
  const margen =
    Number(producto.precioVenta) > 0 && Number(producto.costo) >= 0
      ? Math.round(((Number(producto.precioVenta) - Number(producto.costo)) / Number(producto.precioVenta)) * 100)
      : null;

  return (
    <div className="re dp-raiz">
      <motion.div
        className="dp-fondo"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onMouseDown={alCerrar}
      >
        <motion.div
          className="dp-modal"
          role="dialog"
          aria-modal="true"
          aria-label={`Detalle de ${producto.nombre}`}
          initial={{ opacity: 0, scale: 0.96, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <header className="dp-cabecera">
            <span className="dp-foto" aria-hidden="true">
              {producto.imagenUrl ? <img src={producto.imagenUrl} alt="" /> : <Package size={30} />}
            </span>

            <div className="dp-titulo">
              <h2>{producto.nombre}</h2>
              <div className="dp-etiquetas">
                <span className="dp-sku">{producto.sku || "Sin SKU"}</span>
                <span className="re-estado" data-estado={producto.estado === "ACTIVO" ? "ACTIVO" : "INACTIVO"}>
                  {producto.estado === "ACTIVO" ? "Activo" : "Inactivo"}
                </span>
                {producto.controlaVencimiento && (
                  <span className="dp-vence">
                    <CalendarClock size={14} aria-hidden="true" /> Control por lotes
                  </span>
                )}
              </div>
            </div>

            <button type="button" className="re-cerrar" onClick={alCerrar} aria-label="Cerrar">
              <X size={18} />
            </button>
          </header>

          <div className="dp-cuerpo">
            <section className="dp-indicadores" aria-label="Resumen">
              <article>
                <small>Precio de venta</small>
                <strong>{dinero(producto.precioVenta)}</strong>
                {margen !== null && <em>Ganancia {margen}%</em>}
              </article>
              <article>
                <small>Stock total</small>
                <strong>{cargando ? "…" : numero(stockFisico)}</strong>
                <em data-alerta={!cargando && bajo}>{!cargando && bajo ? "En o bajo el mínimo" : `Mínimo ${stockMinimo}`}</em>
              </article>
              <article>
                <small>Costo</small>
                <strong>{dinero(producto.costo)}</strong>
                <em>por {producto.unidad || "unidad"}</em>
              </article>
            </section>

            <dl className="dp-datos">
              <div>
                <dt>Código de barras</dt>
                <dd>
                  <Barcode size={15} aria-hidden="true" /> {producto.codigoBarras || "—"}
                </dd>
              </div>
              <div>
                <dt>Categoría</dt>
                <dd>{categoria}</dd>
              </div>
              <div>
                <dt>Marca</dt>
                <dd>{marca}</dd>
              </div>
              <div>
                <dt>Se vende por</dt>
                <dd>{producto.unidad || "unidad"}</dd>
              </div>
              {producto.descripcion && (
                <div className="dp-datos__ancho">
                  <dt>Descripción</dt>
                  <dd>{producto.descripcion}</dd>
                </div>
              )}
            </dl>

            {error && (
              <div className="re-aviso re-aviso--error" role="alert">
                {error}
              </div>
            )}

            <section className="dp-bloque">
              <h3>
                <Store size={18} aria-hidden="true" /> Stock por sucursal
              </h3>

              {cargando ? (
                <p className="dp-nota">Cargando…</p>
              ) : inventarios.length === 0 ? (
                <p className="dp-nota">Este producto todavía no tiene existencias. Se cargan al registrar una compra.</p>
              ) : (
                <ul className="dp-sucursales">
                  {inventarios.map((fila) => (
                    <li key={fila.id}>
                      <span>{nombreSucursal(fila.sucursalId)}</span>
                      <strong>{numero(fila.stockFisico ?? fila.stock)}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {producto.controlaVencimiento && (
              <section className="dp-bloque">
                <h3>
                  <Layers size={18} aria-hidden="true" /> Lotes y vencimientos
                </h3>
                <p className="dp-nota">
                  Se vende primero el lote que vence antes. Los lotes vencidos no se pueden vender. Avisamos {diasAlerta}{" "}
                  días antes de que venza.
                </p>

                {!cargando && lotesOrdenados.length > 0 && (
                  <div className="dp-lotes-resumen">
                    <span data-tono="ok">
                      <CheckCircle2 size={16} aria-hidden="true" />
                      <b>{numero(resumen.vendible)}</b> para vender
                    </span>
                    <span data-tono="alerta" data-vacio={resumen.porVencer === 0}>
                      <AlertTriangle size={16} aria-hidden="true" />
                      <b>{numero(resumen.porVencer)}</b> vencen pronto
                    </span>
                    <span data-tono="peligro" data-vacio={resumen.vencido === 0}>
                      <X size={16} aria-hidden="true" />
                      <b>{numero(resumen.vencido)}</b> vencidas
                    </span>
                  </div>
                )}

                {cargando ? (
                  <p className="dp-nota">Cargando lotes…</p>
                ) : lotesOrdenados.length === 0 ? (
                  <div className="dp-vacio">
                    <Layers size={30} />
                    <strong>Todavía no hay lotes</strong>
                    <span>
                      Cada vez que compras este producto, registras su lote y su fecha de vencimiento en Compras. Así
                      aparece aquí.
                    </span>
                  </div>
                ) : (
                  <div className="dp-tabla-caja">
                    <table className="dp-tabla">
                      <thead>
                        <tr>
                          <th>Lote</th>
                          <th>Sucursal</th>
                          <th className="dp-der">Quedan</th>
                          <th>Vence</th>
                          <th>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lotesOrdenados.map((lote, indice) => (
                          <tr key={lote.id} data-estado={lote.estadoLote}>
                            <td data-label="Lote">
                              <span className="dp-codigo">{lote.numeroLote || "Sin número"}</span>
                              {indice === 0 && lote.estadoLote !== "AGOTADO" && lote.estadoLote !== "VENCIDO" && (
                                <small className="dp-primero">Sale primero</small>
                              )}
                            </td>
                            <td data-label="Sucursal">{nombreSucursal(lote.sucursalId)}</td>
                            <td data-label="Quedan" className="dp-der">
                              <strong>{numero(lote.disponible)}</strong>
                            </td>
                            <td data-label="Vence">
                              {textoFecha(lote.fechaVencimiento)}
                              <small>{textoDias(lote.dias)}</small>
                            </td>
                            <td data-label="Estado">
                              <span className="dp-pastilla" data-estado={lote.estadoLote}>
                                {ETIQUETAS[lote.estadoLote]}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}
          </div>

          <footer className="dp-pie">
            <button type="button" className="re-boton re-boton--suave" onClick={alCerrar}>
              Cerrar
            </button>
            <button type="button" className="re-boton" onClick={alEditar}>
              <Pencil size={16} />
              Editar producto
            </button>
          </footer>
        </motion.div>
      </motion.div>
    </div>
  );
}
