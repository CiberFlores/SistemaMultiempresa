import { derivarTema, IDENTIDAD_BASE } from "./identidadEmpresa";

// Exporta un reporte con el logo, el nombre y los colores de la empresa.
//
//   datos = {
//     titulo, subtitulo, filtros: "Hoy · Todas las sucursales",
//     resumen: [{ etiqueta, valor }],
//     secciones: [{ titulo, nota, columnas: [{ etiqueta, tipo: "texto"|"dinero"|"numero", total?: true }], filas: [[...]] }]
//   }
//
//   - Excel: archivo .xls (tabla con estilos) que Excel y Google Sheets abren con colores y formatos.
//   - PDF: hoja lista para imprimir o "Guardar como PDF".

function escapar(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function logoSeguro(url) {
  if (!url) return "";
  try {
    const d = new URL(url, window.location.origin);
    return d.protocol === "https:" || d.origin === window.location.origin ? d.href : "";
  } catch {
    return "";
  }
}

function identidadDe(empresa = {}, personalizacion = {}) {
  const identidad = {
    ...IDENTIDAD_BASE,
    colorPrimario: personalizacion.colorPrimario || empresa.identidad?.colorPrimario || IDENTIDAD_BASE.colorPrimario,
    colorSecundario: personalizacion.colorSecundario || empresa.identidad?.colorSecundario || IDENTIDAD_BASE.colorSecundario,
    fondo: personalizacion.fondo || empresa.identidad?.fondo || IDENTIDAD_BASE.fondo,
    tipografia: personalizacion.tipografia || empresa.identidad?.tipografia || IDENTIDAD_BASE.tipografia
  };

  return {
    tema: derivarTema(identidad),
    tipografia: String(identidad.tipografia || "Inter").replace(/[^\w\s-]/g, ""),
    nombre: personalizacion.nombreVisual || empresa.nombreComercial || empresa.nombre || empresa.razonSocial || "Empresa",
    logo: logoSeguro(personalizacion.logoUrl || empresa.logoUrl || empresa.logo || "")
  };
}

const formatoDinero = (v) =>
  Number(v || 0).toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatoNumero = (v) => Number(v || 0).toLocaleString("es-BO", { maximumFractionDigits: 2 });

function celda(valor, tipo) {
  if (valor === null || valor === undefined || valor === "") return "—";
  if (tipo === "dinero") return `Bs ${formatoDinero(valor)}`;
  if (tipo === "numero") return formatoNumero(valor);
  return String(valor);
}

function totalesDe(seccion) {
  return seccion.columnas.map((columna, indice) => {
    if (!columna.total) return null;
    return seccion.filas.reduce((suma, fila) => suma + (Number(fila[indice]) || 0), 0);
  });
}

function nombreArchivo(titulo) {
  const base = String(titulo || "reporte")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base}-${new Date().toISOString().slice(0, 10)}`;
}

// ------------------------------------------------------------------
// EXCEL
// ------------------------------------------------------------------

export function descargarExcel(datos, empresa, personalizacion) {
  const { tema, tipografia, nombre } = identidadDe(empresa, personalizacion);
  const ancho = Math.max(2, ...datos.secciones.map((s) => s.columnas.length));

  const tablaResumen = datos.resumen?.length
    ? `<tr>${datos.resumen
        .map((r) => `<td colspan="1" class="kpi"><div class="kpi-e">${escapar(r.etiqueta)}</div><div class="kpi-v">${escapar(r.valor)}</div></td>`)
        .join("")}</tr><tr><td></td></tr>`
    : "";

  const secciones = datos.secciones
    .map((s) => {
      const totales = totalesDe(s);
      const hayTotales = totales.some((t) => t !== null);

      const cabecera = `<tr>${s.columnas.map((c) => `<th class="${c.tipo === "dinero" || c.tipo === "numero" ? "der" : ""}">${escapar(c.etiqueta)}</th>`).join("")}</tr>`;

      const cuerpo = s.filas
        .map(
          (fila, i) =>
            `<tr class="${i % 2 ? "par" : ""}">${s.columnas
              .map((c, j) => {
                const v = fila[j];
                if ((c.tipo === "dinero" || c.tipo === "numero") && v !== null && v !== undefined && v !== "") {
                  const formato = c.tipo === "dinero" ? "#,##0.00" : "#,##0.##";
                  return `<td class="der" style="mso-number-format:'${formato}'" x:num="${Number(v)}">${Number(v)}</td>`;
                }
                return `<td>${escapar(celda(v, c.tipo))}</td>`;
              })
              .join("")}</tr>`
        )
        .join("");

      const pie = hayTotales
        ? `<tr class="total">${s.columnas
            .map((c, j) => {
              if (totales[j] === null) return `<td>${j === 0 ? "Total" : ""}</td>`;
              const formato = c.tipo === "dinero" ? "#,##0.00" : "#,##0.##";
              return `<td class="der" style="mso-number-format:'${formato}'" x:num="${totales[j]}">${totales[j]}</td>`;
            })
            .join("")}</tr>`
        : "";

      return `<tr><td colspan="${ancho}" class="seccion">${escapar(s.titulo)}</td></tr>
        ${s.nota ? `<tr><td colspan="${ancho}" class="nota">${escapar(s.nota)}</td></tr>` : ""}
        ${s.filas.length ? cabecera + cuerpo + pie : `<tr><td colspan="${ancho}" class="nota">Sin datos en este período.</td></tr>`}
        <tr><td></td></tr>`;
    })
    .join("");

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8">
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>${escapar(datos.titulo.slice(0, 28))}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>
  body { font-family: "${escapar(tipografia)}", Calibri, Arial, sans-serif; font-size: 11pt; }
  td, th { padding: 4px 8px; border: 1px solid #e3dfe8; vertical-align: middle; }
  .empresa { font-size: 11pt; font-weight: bold; color: ${tema.primario}; border: none; }
  .titulo { font-size: 20pt; font-weight: bold; border: none; }
  .sub { color: #6d6676; border: none; }
  .kpi { background: #f6f4f8; }
  .kpi-e { font-size: 9pt; color: #6d6676; }
  .kpi-v { font-size: 14pt; font-weight: bold; color: ${tema.primario}; }
  .seccion { background: ${tema.primario}; color: ${tema.sobrePrimario}; font-size: 13pt; font-weight: bold; }
  .nota { color: #6d6676; font-style: italic; border: none; }
  th { background: ${tema.secundario}; color: ${tema.sobrePrimario}; text-align: left; }
  .der { text-align: right; }
  .par td { background: #f6f4f8; }
  .total td { font-weight: bold; background: #ece8f0; border-top: 2px solid ${tema.primario}; }
</style></head>
<body>
<table>
  <tr><td colspan="${ancho}" class="empresa">${escapar(nombre)}</td></tr>
  <tr><td colspan="${ancho}" class="titulo">${escapar(datos.titulo)}</td></tr>
  <tr><td colspan="${ancho}" class="sub">${escapar(datos.subtitulo || "")}</td></tr>
  <tr><td colspan="${ancho}" class="sub">${escapar(datos.filtros || "")} · Generado el ${escapar(new Date().toLocaleString("es-BO"))}</td></tr>
  <tr><td></td></tr>
  ${tablaResumen}
  ${secciones}
</table>
</body></html>`;

  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(new Blob(["﻿", html], { type: "application/vnd.ms-excel;charset=utf-8" }));
  enlace.download = `${nombreArchivo(datos.titulo)}.xls`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(enlace.href), 2000);
}

// ------------------------------------------------------------------
// PDF / IMPRESIÓN
// ------------------------------------------------------------------

export function imprimirReporte(datos, empresa, personalizacion) {
  const ventana = window.open("", "_blank", "width=1100,height=900");

  if (!ventana) return false;

  const { tema, tipografia, nombre, logo } = identidadDe(empresa, personalizacion);
  const fuenteUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(tipografia)}:wght@400;600;700;800&display=swap`;

  const resumen = datos.resumen?.length
    ? `<section class="kpis">${datos.resumen
        .map((r) => `<div class="kpi"><small>${escapar(r.etiqueta)}</small><strong>${escapar(r.valor)}</strong></div>`)
        .join("")}</section>`
    : "";

  const secciones = datos.secciones
    .map((s) => {
      const totales = totalesDe(s);
      const hayTotales = totales.some((t) => t !== null);
      const derecha = (c) => (c.tipo === "dinero" || c.tipo === "numero" ? ' class="der"' : "");

      return `<section class="bloque">
        <h2>${escapar(s.titulo)}</h2>
        ${s.nota ? `<p class="nota">${escapar(s.nota)}</p>` : ""}
        ${
          s.filas.length
            ? `<table><thead><tr>${s.columnas.map((c) => `<th${derecha(c)}>${escapar(c.etiqueta)}</th>`).join("")}</tr></thead>
        <tbody>${s.filas
          .map((fila) => `<tr>${s.columnas.map((c, j) => `<td${derecha(c)}>${escapar(celda(fila[j], c.tipo))}</td>`).join("")}</tr>`)
          .join("")}</tbody>
        ${
          hayTotales
            ? `<tfoot><tr>${s.columnas
                .map((c, j) => (totales[j] === null ? `<td>${j === 0 ? "Total" : ""}</td>` : `<td class="der">${escapar(celda(totales[j], c.tipo))}</td>`))
                .join("")}</tr></tfoot>`
            : ""
        }</table>`
            : '<p class="vacio">Sin datos en este período.</p>'
        }
      </section>`;
    })
    .join("");

  ventana.document.write(`<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapar(datos.titulo)} · ${escapar(nombre)}</title>
<link rel="stylesheet" href="${fuenteUrl}">
<style>
  @page { size: A4; margin: 12mm; }
  :root { --p: ${tema.primario}; --s: ${tema.secundario}; --sobre: ${tema.sobrePrimario}; --tinta: #1b1722; --apagado: #6d6676; --linea: #e8e4ec; --suave: #f6f4f8; }
  * { box-sizing: border-box; margin: 0; }
  html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { padding: 24px 16px 60px; background: #ebe8ef; color: var(--tinta); font-family: "${escapar(tipografia)}", "Inter", system-ui, sans-serif; font-size: 13px; line-height: 1.45; }
  .barra { position: sticky; top: 0; z-index: 5; display: flex; justify-content: center; gap: 10px; padding: 10px; margin: -24px -16px 20px; background: #1b1722; }
  .barra button { min-height: 40px; padding: 0 20px; border: 0; border-radius: 10px; background: var(--p); color: var(--sobre); font: inherit; font-weight: 700; font-size: 14px; cursor: pointer; }
  .barra button.sec { background: transparent; color: #fff; border: 1px solid #ffffff55; }
  .hoja { max-width: 980px; margin: 0 auto; padding: 30px; background: #fff; border-radius: 14px; box-shadow: 0 10px 40px #0002; }
  header.cab { display: flex; align-items: center; gap: 16px; padding-bottom: 18px; border-bottom: 4px solid var(--p); }
  header.cab img { width: 64px; height: 64px; object-fit: contain; border-radius: 12px; }
  header.cab .ini { display: grid; place-items: center; width: 64px; height: 64px; border-radius: 12px; background: var(--p); color: var(--sobre); font-size: 28px; font-weight: 800; }
  header.cab small { font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--apagado); }
  header.cab h1 { font-size: 26px; letter-spacing: -.02em; }
  header.cab p { color: var(--apagado); }
  .meta { margin: 14px 0; color: var(--apagado); font-size: 12px; }
  .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-bottom: 20px; }
  .kpi { padding: 12px 14px; border: 1px solid var(--linea); border-left: 5px solid var(--p); border-radius: 10px; background: var(--suave); }
  .kpi small { display: block; font-size: 11px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: var(--apagado); }
  .kpi strong { font-size: 19px; color: var(--p); }
  .bloque { margin-top: 22px; break-inside: avoid-page; }
  .bloque h2 { padding: 8px 14px; border-radius: 8px; background: var(--p); color: var(--sobre); font-size: 15px; }
  .nota, .vacio { margin: 6px 2px; color: var(--apagado); font-size: 12px; }
  table { width: 100%; margin-top: 8px; border-collapse: collapse; }
  th { padding: 8px 10px; background: var(--suave); border-bottom: 2px solid var(--s); text-align: left; font-size: 11px; letter-spacing: .05em; text-transform: uppercase; color: var(--apagado); }
  td { padding: 8px 10px; border-bottom: 1px solid var(--linea); }
  tbody tr:nth-child(even) td { background: #fbfafc; }
  tfoot td { padding-top: 10px; border-top: 2px solid var(--p); border-bottom: 0; font-weight: 800; background: transparent; }
  .der { text-align: right; font-variant-numeric: tabular-nums; }
  footer.pie { margin-top: 26px; padding-top: 12px; border-top: 1px solid var(--linea); color: var(--apagado); font-size: 11px; text-align: center; }
  @media print { body { padding: 0; background: #fff; } .barra { display: none; } .hoja { max-width: none; padding: 0; box-shadow: none; border-radius: 0; } }
</style></head>
<body>
<div class="barra"><button onclick="window.print()">Imprimir o guardar como PDF</button><button class="sec" onclick="window.close()">Cerrar</button></div>
<main class="hoja">
  <header class="cab">
    ${logo ? `<img src="${escapar(logo)}" alt="Logo de ${escapar(nombre)}">` : `<div class="ini">${escapar(nombre.charAt(0).toUpperCase())}</div>`}
    <div><small>${escapar(nombre)}</small><h1>${escapar(datos.titulo)}</h1><p>${escapar(datos.subtitulo || "")}</p></div>
  </header>
  <p class="meta">${escapar(datos.filtros || "")} · Generado el ${escapar(new Date().toLocaleString("es-BO"))}</p>
  ${resumen}
  ${secciones}
  <footer class="pie">${escapar(nombre)} · Reporte generado con Arca Nova</footer>
</main>
<script>window.addEventListener("load", function(){ setTimeout(function(){ window.focus(); }, 300); });</script>
</body></html>`);
  ventana.document.close();

  return true;
}
