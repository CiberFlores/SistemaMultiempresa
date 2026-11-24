import { useCallback, useEffect, useMemo, useState } from "react";
import mensajeError from "../../utils/mensajeError";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Banknote,
  CalendarDays,
  Check,
  ChevronDown,
  CreditCard,
  History,
  Info,
  Landmark,
  Plus,
  QrCode,
  ShoppingBag,
  Trash2,
  Truck
} from "lucide-react";

import useAuth from "../../hooks/useAuth";
import useConfirmar from "../../hooks/useConfirmar";
import SelectorBuscable from "../../components/common/SelectorBuscable";
import { obtenerCatalogosCompra, registrarCompra } from "../../services/compraService";
import { obtenerSaldoCaja } from "../../services/cajaService";
import { sonidoCaja, sonidoClick, sonidoError, sonidoPop } from "../../utils/sonidos";

import "../../styles/roles-empresa.css";
import "../../styles/trabajadores-empresa.css";
import "../../styles/inventario-empresa.css";
import "../../styles/compras-empresa.css";

const MAX_LINEAS = 12;
const CLAVE_SUCURSAL = "an-compra-sucursal";

const METODOS = [
  { valor: "EFECTIVO", texto: "Efectivo", icono: Banknote },
  { valor: "QR", texto: "QR", icono: QrCode },
  { valor: "TARJETA", texto: "Tarjeta", icono: CreditCard },
  { valor: "CREDITO", texto: "A crédito", icono: Landmark }
];

const ATAJOS_FECHA = [
  { texto: "1 mes", meses: 1 },
  { texto: "3 meses", meses: 3 },
  { texto: "6 meses", meses: 6 },
  { texto: "1 año", meses: 12 }
];

const moneda = (valor) => `Bs ${Number(valor || 0).toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function textoFecha(fecha) {
  return [
    fecha.getFullYear(),
    String(fecha.getMonth() + 1).padStart(2, "0"),
    String(fecha.getDate()).padStart(2, "0")
  ].join("-");
}

function sumarMeses(meses) {
  const fecha = new Date();
  fecha.setMonth(fecha.getMonth() + meses);
  return textoFecha(fecha);
}

function fechaLegible(texto) {
  if (!texto) return "";
  const [anio, mes, dia] = texto.split("-").map(Number);
  return new Date(anio, mes - 1, dia).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" });
}

const limpiarDocumento = (v) =>
  String(v ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9/_-]/g, "")
    .slice(0, 30);

const limpiarLote = limpiarDocumento;

const sinSignos = (evento) => {
  if (["e", "E", "+", "-"].includes(evento.key)) evento.preventDefault();
};

export default function ComprasPage() {
  const { usuario } = useAuth();
  const confirmar = useConfirmar();
  const empresaId = usuario?.empresaId;

  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [cajas, setCajas] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [proveedorId, setProveedorId] = useState("");
  const [sucursalId, setSucursalId] = useState("");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [metodoPago, setMetodoPago] = useState("EFECTIVO");
  const [cajaId, setCajaId] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const [productoId, setProductoId] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [costoUnitario, setCostoUnitario] = useState("");
  const [numeroLote, setNumeroLote] = useState("");
  const [fechaVencimiento, setFechaVencimiento] = useState("");

  const [items, setItems] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState("");
  const [errorLinea, setErrorLinea] = useState("");
  const [errorCompra, setErrorCompra] = useState("");

  const hoy = textoFecha(new Date());

  const cargar = useCallback(async () => {
    if (!empresaId) return;

    try {
      const catalogos = await obtenerCatalogosCompra(empresaId);
      setProveedores(catalogos.proveedores);
      setProductos(catalogos.productos);
      setSucursales(catalogos.sucursales);
      setCajas(catalogos.cajas);

      setSucursalId((actual) => {
        if (actual) return actual;
        if (catalogos.sucursales.length === 1) return catalogos.sucursales[0].id;
        try {
          const guardada = localStorage.getItem(CLAVE_SUCURSAL);
          if (guardada && catalogos.sucursales.some((s) => s.id === guardada)) return guardada;
        } catch {
          /* sin almacenamiento */
        }
        return "";
      });
    } catch (error) {
      console.error(error);
      setErrorCompra("No pudimos cargar tus datos. Revisa tu conexión e inténtalo otra vez.");
    } finally {
      setCargando(false);
    }
  }, [empresaId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const productoElegido = productos.find((p) => p.id === productoId);
  const llevaLote = productoElegido?.controlaVencimiento === true;

  const cajasSucursal = useMemo(
    () => cajas.filter((c) => c.estado === "ABIERTA" && c.sucursalId === sucursalId),
    [cajas, sucursalId]
  );

  // Si hay una sola caja abierta, se usa sola
  const cajaEfectiva = cajaId || (cajasSucursal.length === 1 ? cajasSucursal[0].id : "");

  const [saldoCaja, setSaldoCaja] = useState(null);

  const cajaElegida = cajasSucursal.find((c) => c.id === cajaEfectiva) || null;

  const total = useMemo(
    () => items.reduce((suma, item) => suma + Number(item.cantidad) * Number(item.costoUnitario), 0),
    [items]
  );

  // Dinero disponible en la caja elegida, para no pagar más de lo que hay
  useEffect(() => {
    let activo = true;

    if (metodoPago !== "EFECTIVO" || !cajaElegida) return undefined;

    obtenerSaldoCaja(cajaElegida)
      .then((saldo) => activo && setSaldoCaja(saldo))
      .catch(() => activo && setSaldoCaja(null));

    return () => {
      activo = false;
    };
  }, [metodoPago, cajaElegida, exito]);

  const superaCaja = metodoPago === "EFECTIVO" && cajaElegida && saldoCaja !== null && total > saldoCaja;

  const opcionesProveedor = useMemo(
    () => proveedores.map((p) => ({ valor: p.id, etiqueta: p.nit ? `${p.nombre} · NIT ${p.nit}` : p.nombre })),
    [proveedores]
  );

  const opcionesProducto = useMemo(
    () =>
      productos.map((p) => ({
        valor: p.id,
        etiqueta: `${p.nombre}${p.sku ? ` · ${p.sku}` : ""}${p.controlaVencimiento ? " · con vencimiento" : ""}`
      })),
    [productos]
  );

  const faltante = (() => {
    if (!proveedorId) return "Elige a tu proveedor";
    if (!sucursalId) return "Elige la sucursal";
    if (metodoPago === "EFECTIVO" && !cajaEfectiva) return "Elige la caja de donde sale el dinero";
    if (!items.length) return "Agrega al menos un producto";
    if (superaCaja) return "En la caja no alcanza el dinero";
    return "";
  })();

  async function cambiarSucursal(nuevaId) {
    if (nuevaId === sucursalId) return;

    if (items.length) {
      const ok = await confirmar({
        titulo: "Cambiar de sucursal",
        mensaje: "Los productos ya agregados se quitarán de esta compra.",
        accion: "Cambiar",
        peligro: true
      });
      if (!ok) return;
      setItems([]);
    }

    setSucursalId(nuevaId);
    setCajaId("");
    try {
      localStorage.setItem(CLAVE_SUCURSAL, nuevaId);
    } catch {
      /* sin almacenamiento */
    }
  }

  function elegirProducto(id) {
    const producto = productos.find((p) => p.id === id);
    setProductoId(id);
    setCostoUnitario(producto && Number(producto.costo) > 0 ? String(producto.costo) : "");
    setNumeroLote("");
    setFechaVencimiento("");
    setErrorLinea("");
    sonidoClick();
  }

  function agregarItem() {
    setErrorLinea("");
    setExito("");

    const qty = Number(cantidad);
    const costo = Number(costoUnitario);

    const fallar = (texto) => {
      setErrorLinea(texto);
      sonidoError();
    };

    if (!sucursalId) return fallar("Primero elige la sucursal que recibe la mercadería.");
    if (!productoElegido) return fallar("Elige el producto que compraste.");
    if (!Number.isFinite(qty) || qty <= 0) return fallar("Escribe cuántas unidades compraste.");
    if (qty > 100000) return fallar("La cantidad es demasiado grande. Revísala.");
    if (costoUnitario === "" || !Number.isFinite(costo) || costo < 0) return fallar("Escribe cuánto costó cada unidad.");

    if (llevaLote) {
      if (numeroLote.trim().length < 2) return fallar("Este producto vence: escribe el número de lote que viene en el empaque.");
      if (!fechaVencimiento) return fallar("Este producto vence: elige la fecha de vencimiento.");
      if (fechaVencimiento < hoy) return fallar("Esa fecha ya pasó. No puedes ingresar mercadería vencida.");
    }

    const lote = llevaLote ? limpiarLote(numeroLote) : "";
    const vence = llevaLote ? fechaVencimiento : "";

    // El mismo lote del mismo producto con otra fecha sería un error del empaque
    if (
      llevaLote &&
      items.some((i) => i.productoId === productoElegido.id && i.numeroLote === lote && i.fechaVencimiento !== vence)
    ) {
      return fallar(`El lote ${lote} ya está en esta compra con otra fecha de vencimiento.`);
    }

    const existente = items.find(
      (i) =>
        i.productoId === productoElegido.id &&
        i.numeroLote === lote &&
        i.fechaVencimiento === vence &&
        Number(i.costoUnitario) === costo
    );

    if (!existente && items.length >= MAX_LINEAS) {
      return fallar(`Una compra admite hasta ${MAX_LINEAS} productos. Regístrala y haz otra.`);
    }

    setItems((anteriores) => {
      if (existente) {
        return anteriores.map((i) => (i.idLinea === existente.idLinea ? { ...i, cantidad: Number(i.cantidad) + qty } : i));
      }

      const idLinea =
        typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

      return [
        ...anteriores,
        {
          idLinea,
          productoId: productoElegido.id,
          nombreProducto: productoElegido.nombre,
          sku: productoElegido.sku,
          cantidad: qty,
          costoUnitario: costo,
          controlaVencimiento: llevaLote,
          numeroLote: lote,
          fechaVencimiento: vence
        }
      ];
    });

    sonidoPop();
    setProductoId("");
    setCantidad("1");
    setCostoUnitario("");
    setNumeroLote("");
    setFechaVencimiento("");
  }

  async function guardarCompra() {
    if (guardando) return;
    setExito("");
    setErrorCompra("");

    if (faltante) {
      setErrorCompra(`${faltante} para poder registrar la compra.`);
      sonidoError();
      return;
    }

    setGuardando(true);

    try {
      await registrarCompra({
        empresaId,
        sucursalId,
        proveedorId,
        numeroDocumento,
        metodoPago,
        cajaId: metodoPago === "EFECTIVO" ? cajaEfectiva : null,
        observaciones,
        items,
        usuarioId: usuario.uid
      });

      sonidoCaja();
      setExito(
        metodoPago === "CREDITO"
          ? "Compra registrada. El stock ya subió y quedó una cuenta por pagar al proveedor."
          : "Compra registrada. El stock ya subió en Existencias."
      );
      setNumeroDocumento("");
      setObservaciones("");
      setItems([]);
      setCajaId("");
      await cargar();
    } catch (error) {
      console.error(error);
      sonidoError();
      setErrorCompra(mensajeError(error, "No pudimos registrar la compra. Inténtalo otra vez."));
    } finally {
      setGuardando(false);
    }
  }

  const sinProveedores = !cargando && proveedores.length === 0;
  const sinCajaAbierta = metodoPago === "EFECTIVO" && sucursalId && cajasSucursal.length === 0;

  return (
    <div className="re co">
      <header className="re-cabecera">
        <div>
          <h1>Registrar compra</h1>
          <p>Aquí entra la mercadería: elige a tu proveedor, agrega los productos y el stock sube solo.</p>
        </div>

        <div className="inv-acciones">
          <Link to="/compras/historial" className="re-boton re-boton--suave">
            <History size={17} />
            Ver historial
          </Link>
        </div>
      </header>

      {sinProveedores && (
        <div className="re-aviso re-aviso--error" role="status">
          <Truck size={18} />
          <span>
            Todavía no tienes proveedores. <Link to="/compras/proveedores">Crea tu primer proveedor</Link> para registrar compras.
          </span>
        </div>
      )}

      <div className="co-grid">
        <div className="co-principal">
          {/* ---------- 1. Datos ---------- */}
          <section className="inv-bloque co-paso">
            <header className="co-paso__cabecera">
              <span className="co-paso__numero">1</span>
              <div>
                <h2>¿A quién le compraste?</h2>
                <p>Proveedor, sucursal que recibe y cómo pagaste.</p>
              </div>
            </header>

            <div className="re-campos">
              <div className="re-campo">
                <SelectorBuscable
                  etiqueta="Proveedor *"
                  valor={proveedorId}
                  opciones={opcionesProveedor}
                  onChange={(valor) => {
                    setProveedorId(valor);
                    setErrorCompra("");
                    sonidoClick();
                  }}
                  placeholder={cargando ? "Cargando…" : "Elige un proveedor"}
                  placeholderBusqueda="Buscar por nombre o NIT…"
                  vacio="No encontramos ese proveedor"
                />
                <small className="re-ayuda">
                  ¿No está en la lista? <Link to="/compras/proveedores">Crea un proveedor</Link>
                </small>
              </div>

              <label className="re-campo">
                <span className="re-etiqueta-campo">
                  Sucursal que recibe <b>*</b>
                </span>
                <span className="tr-selector tr-selector--formulario">
                  <select value={sucursalId} onChange={(e) => cambiarSucursal(e.target.value)} disabled={cargando}>
                    <option value="">Elige la sucursal</option>
                    {sucursales.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={17} aria-hidden="true" />
                </span>
              </label>

              <label className="re-campo">
                <span className="re-etiqueta-campo">Número de factura o nota</span>
                <input
                  type="text"
                  value={numeroDocumento}
                  onChange={(e) => setNumeroDocumento(limpiarDocumento(e.target.value))}
                  placeholder="Ej. FAC-001 (opcional)"
                  autoComplete="off"
                />
              </label>
            </div>

            <div className="re-campo">
              <span className="re-etiqueta-campo">¿Cómo pagaste?</span>
              <div className="co-pagos" role="radiogroup" aria-label="Forma de pago">
                {METODOS.map(({ valor, texto, icono: Icono }) => (
                  <button
                    key={valor}
                    type="button"
                    role="radio"
                    aria-checked={metodoPago === valor}
                    className="co-pago"
                    data-activo={metodoPago === valor}
                    onClick={() => {
                      setMetodoPago(valor);
                      setCajaId("");
                      sonidoClick();
                    }}
                  >
                    <Icono size={20} aria-hidden="true" />
                    <span>{texto}</span>
                  </button>
                ))}
              </div>
            </div>

            {metodoPago === "EFECTIVO" && sucursalId && !sinCajaAbierta && cajasSucursal.length > 1 && (
              <label className="re-campo">
                <span className="re-etiqueta-campo">
                  ¿De qué caja sale el dinero? <b>*</b>
                </span>
                <span className="tr-selector tr-selector--formulario">
                  <select value={cajaEfectiva} onChange={(e) => setCajaId(e.target.value)}>
                    <option value="">Elige la caja</option>
                    {cajasSucursal.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={17} aria-hidden="true" />
                </span>
              </label>
            )}

            {metodoPago === "EFECTIVO" && sucursalId && cajasSucursal.length === 1 && (
              <p className="co-nota">
                <Check size={16} />
                <span>
                  El dinero saldrá de <b>{cajasSucursal[0].nombre}</b>
                  {saldoCaja !== null ? (
                    <>
                      , donde hay <b>{moneda(saldoCaja)}</b>.
                    </>
                  ) : (
                    "."
                  )}
                </span>
              </p>
            )}

            {sinCajaAbierta && (
              <div className="re-aviso re-aviso--error" role="status">
                <Info size={18} />
                <span>
                  No hay una caja abierta en esta sucursal. <Link to="/ventas/cajas">Abre la caja</Link> o paga con QR, tarjeta o
                  a crédito.
                </span>
              </div>
            )}

            {superaCaja && (
              <div className="re-aviso re-aviso--error" role="status">
                <Info size={18} />
                <span>
                  La compra es de {moneda(total)} y en la caja solo hay {moneda(saldoCaja)}. Paga con QR, tarjeta o a crédito, o pon
                  más dinero en la caja.
                </span>
              </div>
            )}

            {metodoPago === "CREDITO" && (
              <p className="co-nota">
                <Info size={16} />
                <span>Quedará una cuenta por pagar a este proveedor.</span>
              </p>
            )}
          </section>

          {/* ---------- 2. Productos ---------- */}
          <section className="inv-bloque co-paso">
            <header className="co-paso__cabecera">
              <span className="co-paso__numero">2</span>
              <div>
                <h2>¿Qué compraste?</h2>
                <p>Agrega uno por uno. Si vence, anota el lote y la fecha del empaque.</p>
              </div>
            </header>

            <div className="re-campo">
              <SelectorBuscable
                etiqueta="Producto *"
                valor={productoId}
                opciones={opcionesProducto}
                onChange={elegirProducto}
                placeholder={cargando ? "Cargando…" : "Busca el producto por nombre o código"}
                placeholderBusqueda="Escribe el nombre o el código…"
                vacio="No encontramos ese producto"
              />
            </div>

            <div className="re-campos">
              <label className="re-campo">
                <span className="re-etiqueta-campo">
                  Cantidad <b>*</b>
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  value={cantidad}
                  onKeyDown={sinSignos}
                  onChange={(e) => setCantidad(e.target.value)}
                />
              </label>

              <label className="re-campo">
                <span className="re-etiqueta-campo">
                  Costo de cada unidad (Bs) <b>*</b>
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={costoUnitario}
                  onKeyDown={sinSignos}
                  onChange={(e) => setCostoUnitario(e.target.value)}
                  placeholder="0.00"
                />
              </label>
            </div>

            <AnimatePresence initial={false}>
              {llevaLote && (
                <motion.div
                  className="co-lote"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                >
                  <div className="co-lote__titulo">
                    <CalendarDays size={20} aria-hidden="true" />
                    <div>
                      <strong>Este producto vence</strong>
                      <span>Anota el lote y la fecha tal como están en el empaque.</span>
                    </div>
                  </div>

                  <div className="re-campos">
                    <label className="re-campo">
                      <span className="re-etiqueta-campo">
                        Número de lote <b>*</b>
                      </span>
                      <input
                        type="text"
                        value={numeroLote}
                        onChange={(e) => setNumeroLote(limpiarLote(e.target.value))}
                        placeholder="Ej. L2411"
                        autoComplete="off"
                      />
                    </label>

                    <label className="re-campo">
                      <span className="re-etiqueta-campo">
                        Fecha de vencimiento <b>*</b>
                      </span>
                      <input
                        type="date"
                        min={hoy}
                        max="2099-12-31"
                        value={fechaVencimiento}
                        onChange={(e) => setFechaVencimiento(e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="co-atajos" aria-label="Fechas rápidas">
                    <span>Vence en:</span>
                    {ATAJOS_FECHA.map((atajo) => (
                      <button
                        key={atajo.meses}
                        type="button"
                        className="re-chip"
                        data-activo={fechaVencimiento === sumarMeses(atajo.meses)}
                        onClick={() => {
                          setFechaVencimiento(sumarMeses(atajo.meses));
                          sonidoClick();
                        }}
                      >
                        {atajo.texto}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {errorLinea && (
              <div className="re-aviso re-aviso--error" role="alert">
                {errorLinea}
              </div>
            )}

            <button type="button" className="re-boton co-agregar" onClick={agregarItem}>
              <Plus size={18} />
              Agregar a la compra
            </button>
          </section>
        </div>

        {/* ---------- Resumen ---------- */}
        <aside className="co-resumen inv-bloque" aria-label="Resumen de la compra">
          <header className="co-resumen__cabecera">
            <h2>
              <ShoppingBag size={20} aria-hidden="true" /> Tu compra
            </h2>
            <span>
              {items.length} {items.length === 1 ? "producto" : "productos"}
            </span>
          </header>

          <ul className="co-lineas">
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <motion.li
                  key={item.idLinea}
                  className="co-linea"
                  layout="position"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                >
                  <div className="co-linea__texto">
                    <strong>{item.nombreProducto}</strong>
                    <span>
                      {Number(item.cantidad).toLocaleString("es-BO", { maximumFractionDigits: 2 })} × {moneda(item.costoUnitario)}
                    </span>
                    {item.controlaVencimiento && (
                      <small>
                        Lote {item.numeroLote} · vence {fechaLegible(item.fechaVencimiento)}
                      </small>
                    )}
                  </div>
                  <strong className="co-linea__subtotal">{moneda(item.cantidad * item.costoUnitario)}</strong>
                  <button
                    type="button"
                    className="re-boton re-boton--suave re-boton--icono co-quitar"
                    aria-label={`Quitar ${item.nombreProducto}`}
                    onClick={() => {
                      setItems((previos) => previos.filter((i) => i.idLinea !== item.idLinea));
                      sonidoClick();
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>

          {items.length === 0 && (
            <div className="co-vacio">
              <ShoppingBag size={30} aria-hidden="true" />
              <strong>Aún no agregaste nada</strong>
              <span>Los productos que agregues aparecerán aquí.</span>
            </div>
          )}

          <label className="re-campo">
            <span className="re-etiqueta-campo">Notas (opcional)</span>
            <textarea
              className="inv-texto"
              rows="2"
              maxLength={200}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Ej. entrega parcial, descuento por volumen…"
            />
          </label>

          <div className="co-total">
            <span>Total a pagar</span>
            <strong>{moneda(total)}</strong>
          </div>

          {exito && (
            <div className="re-aviso re-aviso--ok" role="status">
              <Check size={18} />
              <span>
                {exito} <Link to="/compras/historial">Ver historial</Link>
              </span>
            </div>
          )}

          {errorCompra && (
            <div className="re-aviso re-aviso--error" role="alert">
              {errorCompra}
            </div>
          )}

          <button type="button" className="re-boton co-registrar" onClick={guardarCompra} disabled={guardando || Boolean(faltante)}>
            {guardando ? "Registrando…" : "Registrar compra"}
          </button>

          {faltante && !guardando && <p className="co-falta">{faltante}.</p>}
        </aside>
      </div>
    </div>
  );
}
