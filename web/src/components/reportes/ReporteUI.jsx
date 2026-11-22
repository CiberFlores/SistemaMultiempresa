import { useState } from "react";
import { ChevronDown, FileSpreadsheet, Printer } from "lucide-react";

import { PERIODOS, dinero } from "../../utils/reporteHelpers";

import "../../styles/roles-empresa.css";
import "../../styles/trabajadores-empresa.css";
import "../../styles/inventario-empresa.css";
import "../../styles/compras-empresa.css";
import "../../styles/cajas-empresa.css";
import "../../styles/reportes-empresa.css";

// ------------------------------------------------------------------

export function CabeceraReporte({ titulo, descripcion, onExcel, onPdf, deshabilitado, aviso }) {
  const [descargando, setDescargando] = useState(false);

  const excel = () => {
    setDescargando(true);
    try {
      onExcel();
    } finally {
      setTimeout(() => setDescargando(false), 700);
    }
  };

  return (
    <>
      <header className="re-cabecera">
        <div>
          <h1>{titulo}</h1>
          <p>{descripcion}</p>
        </div>

        <div className="inv-acciones">
          <span className="rp-vivo" title="Se actualiza solo cuando cambian tus datos">
            <i aria-hidden="true" /> En vivo
          </span>
          <button type="button" className="re-boton re-boton--suave" onClick={onPdf} disabled={deshabilitado}>
            <Printer size={17} />
            PDF
          </button>
          <button type="button" className="re-boton" onClick={excel} disabled={deshabilitado || descargando}>
            <FileSpreadsheet size={17} />
            {descargando ? "Preparando…" : "Descargar Excel"}
          </button>
        </div>
      </header>

      {aviso && (
        <div className="re-aviso re-aviso--error" role="status">
          {aviso}
        </div>
      )}
    </>
  );
}

export function FiltroPeriodo({ periodo, setPeriodo, desde, setDesde, hasta, setHasta }) {
  return (
    <div className="rp-periodo">
      <div className="re-filtros" role="radiogroup" aria-label="Período">
        {PERIODOS.map(([valor, texto]) => (
          <button
            key={valor}
            type="button"
            role="radio"
            aria-checked={periodo === valor}
            className="re-chip"
            data-activo={periodo === valor}
            onClick={() => setPeriodo(valor)}
          >
            {texto}
          </button>
        ))}
      </div>

      {periodo === "FECHAS" && (
        <div className="cg-rangos">
          <label>
            <span>Desde</span>
            <input type="date" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)} />
          </label>
          <label>
            <span>Hasta</span>
            <input type="date" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} />
          </label>
        </div>
      )}
    </div>
  );
}

export function SelectorFiltro({ valor, onChange, opciones, etiqueta }) {
  return (
    <label className="tr-selector">
      <select value={valor} onChange={(e) => onChange(e.target.value)} aria-label={etiqueta}>
        {opciones.map(([v, texto]) => (
          <option key={v} value={v}>
            {texto}
          </option>
        ))}
      </select>
      <ChevronDown size={17} aria-hidden="true" />
    </label>
  );
}

export function TarjetasResumen({ items }) {
  return (
    <section className={`inv-metricas co-metricas rp-tarjetas${items.length === 3 ? " rp-tres" : ""}`} aria-label="Resumen">
      {items.map(({ icono: Icono, titulo, valor, nota, tono }) => (
        <article className="inv-metrica" key={titulo} data-tono={tono || undefined}>
          <span className="inv-metrica__icono" aria-hidden="true">
            <Icono size={22} />
          </span>
          <div>
            <small>{titulo}</small>
            <strong>{valor}</strong>
            <em>{nota}</em>
          </div>
        </article>
      ))}
    </section>
  );
}

// Barras horizontales sencillas: una por elemento, la más larga es el máximo
export function BarrasReporte({ titulo, subtitulo, items, formato = dinero, vacio = "Sin datos en este período." }) {
  const maximo = Math.max(0, ...items.map((i) => i.valor));

  return (
    <section className="inv-bloque rp-barras">
      <header>
        <h2>{titulo}</h2>
        {subtitulo && <p>{subtitulo}</p>}
      </header>

      {items.length === 0 ? (
        <p className="inv-sin">{vacio}</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.etiqueta}>
              <span className="rp-barra__texto">
                <b>{item.etiqueta}</b>
                <em>{formato(item.valor)}</em>
              </span>
              <span className="rp-barra" aria-hidden="true">
                <i style={{ width: `${maximo ? Math.max(3, (item.valor / maximo) * 100) : 0}%` }} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Tabla con paginación; en el móvil cada fila se vuelve una tarjeta
export function TablaReporte({ columnas, filas, claveFila, porPagina = 40, titulo, vacio }) {
  const [limite, setLimite] = useState(porPagina);
  const visibles = filas.slice(0, limite);

  if (filas.length === 0) {
    return (
      <div className="re-vacio">
        <strong>{vacio?.titulo || "No hay datos para mostrar"}</strong>
        <span>{vacio?.texto || "Prueba con otro período o limpia los filtros."}</span>
      </div>
    );
  }

  return (
    <section className="inv-bloque">
      {titulo && <h2 className="cj-titulo">{titulo}</h2>}

      <div className="inv-tabla-caja">
        <table className="inv-tabla">
          <thead>
            <tr>
              {columnas.map((c) => (
                <th key={c.etiqueta} className={c.der ? "inv-der" : undefined}>
                  {c.etiqueta}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibles.map((fila) => (
              <tr key={claveFila(fila)}>
                {columnas.map((c) => (
                  <td key={c.etiqueta} data-label={c.etiqueta} className={c.der ? "inv-der" : undefined}>
                    {c.render(fila)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filas.length > limite && (
        <button type="button" className="re-boton re-boton--suave cg-mas" onClick={() => setLimite((p) => p + porPagina)}>
          Mostrar más ({filas.length - limite} restantes)
        </button>
      )}
    </section>
  );
}

export function GraficoDias({ titulo, subtitulo, serie, formato = dinero }) {
  const maximo = Math.max(0, ...serie.map((d) => d.valor));
  const corto = (f) => f.toLocaleDateString("es-BO", { day: "2-digit", month: "short" });

  return (
    <section className="inv-bloque rp-barras">
      <header>
        <h2>{titulo}</h2>
        {subtitulo && <p>{subtitulo}</p>}
      </header>

      {serie.length === 0 || maximo === 0 ? (
        <p className="inv-sin">Sin movimiento en este período.</p>
      ) : (
        <>
          <div className="rp-dias" role="img" aria-label={titulo}>
            {serie.map((d) => (
              <span className="rp-dia" key={d.fecha.getTime()} title={`${corto(d.fecha)}: ${formato(d.valor)}`}>
                <i style={{ height: `${Math.max(2, (d.valor / maximo) * 100)}%` }} />
              </span>
            ))}
          </div>
          <div className="rp-eje">
            <span>{corto(serie[0].fecha)}</span>
            <span>Día más alto: {formato(maximo)}</span>
            <span>{corto(serie[serie.length - 1].fecha)}</span>
          </div>
        </>
      )}
    </section>
  );
}
