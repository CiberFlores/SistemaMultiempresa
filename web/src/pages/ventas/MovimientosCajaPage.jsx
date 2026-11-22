import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { ArrowDownRight, ArrowUpRight, ChevronDown, Download, Scale, Search, Wallet } from "lucide-react";

import useAuth from "../../hooks/useAuth";
import { db } from "../../services/firebase/firebaseConfig";
import { suscribirSucursales } from "../../services/sucursalService";
import { suscribirCajas } from "../../services/cajaService";

import "../../styles/roles-empresa.css";
import "../../styles/trabajadores-empresa.css";
import "../../styles/inventario-empresa.css";
import "../../styles/crud-generico.css";
import "../../styles/compras-empresa.css";
import "../../styles/cajas-empresa.css";

const POR_PAGINA = 40;

const CATEGORIAS = {
  VENTA: "Venta",
  COMPRA: "Compra a proveedor",
  GASTO: "Gasto",
  ANULACION_GASTO: "Gasto anulado",
  ANULACION_VENTA: "Venta anulada",
  COBRO_CREDITO: "Cobro de crédito",
  PAGO_PROVEEDOR: "Pago a proveedor",
  APERTURA: "Apertura"
};

const normalizar = (valor) =>
  String(valor ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

const dinero = (valor) => {
  const n = Number(valor || 0);
  return `${n < 0 ? "−" : ""}Bs ${Math.abs(n).toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const fechaDe = (valor) => {
  const fecha = valor?.toDate?.() || null;
  return fecha && !Number.isNaN(fecha.getTime()) ? fecha : null;
};

const etiquetaCategoria = (c) =>
  CATEGORIAS[c] || String(c || "Movimiento").toLowerCase().replace(/_/g, " ").replace(/^./, (x) => x.toUpperCase());

// Los códigos largos se acortan para que la descripción se lea
const descripcionLegible = (texto) =>
  texto ? String(texto).replace(/\b[A-Za-z0-9]{20}\b/g, (codigo) => `#${codigo.slice(0, 6)}`) : "—";

export default function MovimientosCajaPage() {
  const { usuario } = useAuth();
  const empresaId = usuario?.empresaId;
  const [params, setParams] = useSearchParams();

  const [movimientos, setMovimientos] = useState([]);
  const [cajas, setCajas] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [busqueda, setBusqueda] = useState("");
  const [tipo, setTipo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [limite, setLimite] = useState(POR_PAGINA);

  const cajaId = params.get("caja") || "";

  useEffect(() => {
    if (!empresaId) return undefined;

    const cancelarMov = onSnapshot(
      query(collection(db, "movimientosCaja"), where("empresaId", "==", empresaId)),
      (snapshot) => {
        const lista = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        lista.sort((a, b) => (b.fechaRegistro?.toMillis?.() || 0) - (a.fechaRegistro?.toMillis?.() || 0));
        setMovimientos(lista);
        setCargando(false);
      },
      (error) => {
        console.error(error);
        setCargando(false);
      }
    );

    const cancelarCajas = suscribirCajas(empresaId, setCajas, console.error);
    const cancelarSucursales = suscribirSucursales(empresaId, setSucursales, console.error);

    return () => {
      cancelarMov?.();
      cancelarCajas?.();
      cancelarSucursales?.();
    };
  }, [empresaId]);

  const nombreCaja = (id) => {
    const caja = cajas.find((c) => c.id === id);
    if (!caja) return "Caja eliminada";
    const sucursal = sucursales.find((s) => s.id === caja.sucursalId)?.nombre;
    return sucursal ? `${caja.nombre} · ${sucursal}` : caja.nombre;
  };

  const categoriasPresentes = useMemo(() => [...new Set(movimientos.map((m) => m.categoria).filter(Boolean))], [movimientos]);

  const filtrados = useMemo(() => {
    const texto = normalizar(busqueda);
    const inicio = desde ? new Date(`${desde}T00:00:00`) : null;
    const fin = hasta ? new Date(`${hasta}T23:59:59`) : null;

    return movimientos.filter((m) => {
      if (cajaId && m.cajaId !== cajaId) return false;
      if (tipo && m.tipo !== tipo) return false;
      if (categoria && m.categoria !== categoria) return false;

      const fecha = fechaDe(m.fechaRegistro);
      if (inicio && fecha && fecha < inicio) return false;
      if (fin && fecha && fecha > fin) return false;

      if (!texto) return true;

      return [m.descripcion, etiquetaCategoria(m.categoria), nombreCaja(m.cajaId)].some((v) => normalizar(v).includes(texto));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movimientos, cajas, sucursales, busqueda, tipo, categoria, desde, hasta, cajaId]);

  const entro = filtrados.filter((m) => m.tipo === "INGRESO").reduce((s, m) => s + Number(m.monto || 0), 0);
  const salio = filtrados.filter((m) => m.tipo === "EGRESO").reduce((s, m) => s + Number(m.monto || 0), 0);
  const visibles = filtrados.slice(0, limite);
  const hayFiltros = Boolean(busqueda || tipo || categoria || desde || hasta || cajaId);

  const cambiar = (fijar) => (e) => {
    fijar(e.target.value);
    setLimite(POR_PAGINA);
  };

  const limpiar = () => {
    setBusqueda("");
    setTipo("");
    setCategoria("");
    setDesde("");
    setHasta("");
    setLimite(POR_PAGINA);
    setParams({});
  };

  function exportar() {
    const comillas = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const filas = [
      ["Fecha", "Movimiento", "Concepto", "Descripción", "Monto (Bs)", "Caja"],
      ...filtrados.map((m) => [
        fechaDe(m.fechaRegistro)?.toLocaleString("es-BO") || "",
        m.tipo === "INGRESO" ? "Entró" : "Salió",
        etiquetaCategoria(m.categoria),
        descripcionLegible(m.descripcion),
        Number(m.monto || 0).toFixed(2),
        nombreCaja(m.cajaId)
      ])
    ];

    const csv = "﻿" + filas.map((fila) => fila.map(comillas).join(";")).join("\r\n");
    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    enlace.download = `movimientos-de-caja-${new Date().toISOString().slice(0, 10)}.csv`;
    enlace.click();
    URL.revokeObjectURL(enlace.href);
  }

  return (
    <div className="re inv">
      <header className="re-cabecera">
        <div>
          <h1>Movimientos de caja</h1>
          <p>Todo el dinero que entró y salió de tus cajas, con su motivo.</p>
        </div>

        <button type="button" className="re-boton re-boton--suave" onClick={exportar} disabled={filtrados.length === 0}>
          <Download size={17} />
          Descargar Excel
        </button>
      </header>

      <section className="inv-metricas inv-metricas--tres co-metricas" aria-label="Resumen">
        <article className="inv-metrica">
          <span className="inv-metrica__icono" aria-hidden="true">
            <ArrowUpRight size={22} />
          </span>
          <div>
            <small>Entró</small>
            <strong>{dinero(entro)}</strong>
            <em>ventas y cobros</em>
          </div>
        </article>
        <article className="inv-metrica" data-tono="alerta">
          <span className="inv-metrica__icono" aria-hidden="true">
            <ArrowDownRight size={22} />
          </span>
          <div>
            <small>Salió</small>
            <strong>{dinero(salio)}</strong>
            <em>compras, gastos y pagos</em>
          </div>
        </article>
        <article className="inv-metrica">
          <span className="inv-metrica__icono" aria-hidden="true">
            <Scale size={22} />
          </span>
          <div>
            <small>Diferencia</small>
            <strong>{dinero(entro - salio)}</strong>
            <em>{filtrados.length.toLocaleString("es-BO")} movimientos</em>
          </div>
        </article>
      </section>

      {cajaId && (
        <div className="re-aviso inv-guia">
          <Wallet size={18} />
          <span>
            Estás viendo solo <b>{nombreCaja(cajaId)}</b>.
          </span>
          <button type="button" className="re-chip" onClick={() => setParams({})}>
            Ver todas las cajas
          </button>
        </div>
      )}

      <div className="re-herramientas">
        <label className="re-busqueda">
          <Search size={19} aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar por motivo o caja…"
            aria-label="Buscar movimientos"
            value={busqueda}
            onChange={cambiar(setBusqueda)}
          />
        </label>

        <label className="tr-selector">
          <select value={tipo} onChange={cambiar(setTipo)} aria-label="Entró o salió">
            <option value="">Entró y salió</option>
            <option value="INGRESO">Solo lo que entró</option>
            <option value="EGRESO">Solo lo que salió</option>
          </select>
          <ChevronDown size={17} aria-hidden="true" />
        </label>

        <label className="tr-selector">
          <select value={categoria} onChange={cambiar(setCategoria)} aria-label="Concepto">
            <option value="">Todos los conceptos</option>
            {categoriasPresentes.map((c) => (
              <option key={c} value={c}>
                {etiquetaCategoria(c)}
              </option>
            ))}
          </select>
          <ChevronDown size={17} aria-hidden="true" />
        </label>

        {hayFiltros && (
          <button type="button" className="re-chip" onClick={limpiar}>
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="cg-rangos">
        <label>
          <span>Desde</span>
          <input type="date" value={desde} onChange={cambiar(setDesde)} />
        </label>
        <label>
          <span>Hasta</span>
          <input type="date" value={hasta} onChange={cambiar(setHasta)} />
        </label>
      </div>

      {cargando ? (
        <div className="re-vacio">Cargando movimientos…</div>
      ) : filtrados.length === 0 ? (
        <div className="re-vacio">
          <Wallet size={34} />
          <strong>{movimientos.length === 0 ? "Todavía no hay movimientos" : "No encontramos movimientos"}</strong>
          <span>
            {movimientos.length === 0
              ? "Cada venta en efectivo, compra o gasto quedará anotado aquí."
              : "Prueba con otras fechas o limpia los filtros."}
          </span>
        </div>
      ) : (
        <section className="inv-bloque">
          <div className="inv-tabla-caja">
            <table className="inv-tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Concepto</th>
                  <th>Motivo</th>
                  <th>Caja</th>
                  <th className="inv-der">Monto</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((m) => {
                  const entra = m.tipo === "INGRESO";
                  const fecha = fechaDe(m.fechaRegistro);

                  return (
                    <tr key={m.id}>
                      <td data-label="Fecha">
                        <div className="inv-celda">
                          <strong>{fecha ? fecha.toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</strong>
                          <small>{fecha ? fecha.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" }) : ""}</small>
                        </div>
                      </td>
                      <td data-label="Concepto">
                        <span className="inv-pastilla" data-mov={entra ? "entra" : "sale"}>
                          {etiquetaCategoria(m.categoria)}
                        </span>
                      </td>
                      <td data-label="Motivo">{descripcionLegible(m.descripcion)}</td>
                      <td data-label="Caja">{nombreCaja(m.cajaId)}</td>
                      <td data-label="Monto" className="inv-der">
                        <strong className="inv-delta" data-mov={entra ? "entra" : "sale"}>
                          {entra ? "+" : "−"} {dinero(m.monto)}
                        </strong>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filtrados.length > limite && (
            <button type="button" className="re-boton re-boton--suave cg-mas" onClick={() => setLimite((previo) => previo + POR_PAGINA)}>
              Mostrar más ({filtrados.length - limite} restantes)
            </button>
          )}
        </section>
      )}
    </div>
  );
}
