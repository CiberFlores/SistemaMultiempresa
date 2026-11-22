import { useMemo } from "react";
import { COUNTRIES, getSubdivisions } from "../../data/locations";
import SelectorBuscable from "./SelectorBuscable";

// Nombres de países en español (el catálogo viene en inglés)
let traductor = null;
try {
  traductor = new Intl.DisplayNames(["es"], { type: "region" });
} catch {
  traductor = null;
}

function nombrePais(codigo, respaldo) {
  try {
    return traductor?.of(codigo) || respaldo;
  } catch {
    return respaldo;
  }
}

const PAISES = COUNTRIES.map((pais) => ({
  valor: pais.code,
  etiqueta: nombrePais(pais.code, pais.name)
})).sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, "es"));

// Lugar de una empresa o sucursal: país y región se eligen buscando,
// la ciudad y la dirección se escriben.
export default function LocationPicker({ value = {}, onChange }) {
  const codigoPais = value.paisCodigo || "BO";

  const regiones = useMemo(
    () =>
      getSubdivisions(codigoPais)
        .map((region) => ({ valor: region.code, etiqueta: region.name }))
        .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, "es")),
    [codigoPais]
  );

  const actualizar = (parcial) => onChange?.({ ...value, ...parcial });

  return (
    <div className="location-panel">
      <div className="location-grid">
        <SelectorBuscable
          etiqueta="País"
          valor={codigoPais}
          opciones={PAISES}
          placeholder="Elige un país"
          placeholderBusqueda="Buscar país…"
          vacio="No encontramos ese país"
          onChange={(codigo, opcion) =>
            actualizar({
              paisCodigo: codigo,
              paisNombre: opcion?.etiqueta || "",
              regionCodigo: "",
              regionNombre: "",
              provincia: "",
              ciudad: ""
            })
          }
        />

        <SelectorBuscable
          etiqueta="Departamento / Región"
          valor={value.regionCodigo || ""}
          opciones={regiones}
          placeholder={regiones.length ? "Elige una región" : "Sin divisiones para este país"}
          placeholderBusqueda="Buscar región…"
          vacio="No encontramos esa región"
          deshabilitado={regiones.length === 0}
          onChange={(codigo, opcion) =>
            actualizar({ regionCodigo: codigo, regionNombre: opcion?.etiqueta || "", provincia: "" })
          }
        />

        <label className="field-block">
          <span>Ciudad / Municipio</span>
          <input
            value={value.ciudad || ""}
            onChange={(evento) => actualizar({ ciudad: evento.target.value.slice(0, 60) })}
            placeholder="Ej. Cochabamba"
            maxLength={60}
            autoComplete="off"
          />
        </label>

        <label className="field-block">
          <span>Provincia / Distrito (opcional)</span>
          <input
            value={value.provincia || ""}
            onChange={(evento) => actualizar({ provincia: evento.target.value.slice(0, 60) })}
            placeholder="Si tu país lo usa"
            maxLength={60}
            autoComplete="off"
          />
        </label>

        <label className="field-block field-span-2">
          <span>Dirección</span>
          <input
            value={value.direccion || ""}
            onChange={(evento) => actualizar({ direccion: evento.target.value.slice(0, 120) })}
            placeholder="Avenida, calle, zona, número…"
            maxLength={120}
            autoComplete="off"
          />
        </label>
      </div>
    </div>
  );
}
