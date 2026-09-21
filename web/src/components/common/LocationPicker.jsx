import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { COUNTRIES, getSubdivisions } from "../../data/locations";

const normalize=(v)=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();

export default function LocationPicker({ value = {}, onChange, prefix = "" }) {
  const countryCode = value.paisCodigo || "BO";
  const [countrySearch,setCountrySearch]=useState("");
  const [regionSearch,setRegionSearch]=useState("");
  const subdivisions = useMemo(() => getSubdivisions(countryCode), [countryCode]);
  const countriesFiltered=useMemo(()=>COUNTRIES.filter(c=>!countrySearch||normalize(c.name).includes(normalize(countrySearch))||normalize(c.code).includes(normalize(countrySearch))),[countrySearch]);
  const regionsFiltered=useMemo(()=>subdivisions.filter(r=>!regionSearch||normalize(r.name).includes(normalize(regionSearch))||normalize(r.type).includes(normalize(regionSearch))||normalize(r.code).includes(normalize(regionSearch))),[subdivisions,regionSearch]);

  const update = (patch) => onChange?.({ ...value, ...patch });

  return (
    <div className="location-panel">
      <div className="location-search-grid">
        <label className="mini-search-field"><span><Search size={14}/> Buscar país</span><input value={countrySearch} onChange={e=>setCountrySearch(e.target.value)} placeholder="Bolivia, España, Perú, US…"/></label>
        <label className="mini-search-field"><span><Search size={14}/> Buscar estado / región / provincia</span><input value={regionSearch} onChange={e=>setRegionSearch(e.target.value)} placeholder="Cochabamba, Madrid, Lima…"/></label>
      </div>
      <div className="location-grid">
        <label className="field-block">
          <span>País</span>
          <select
            value={countryCode}
            onChange={(e) => {
              const selected = COUNTRIES.find((item) => item.code === e.target.value);
              setRegionSearch("");
              update({
                paisCodigo: e.target.value,
                paisNombre: selected?.name || "",
                regionCodigo: "",
                regionNombre: "",
                provincia: "",
                ciudad: ""
              });
            }}
          >
            {countriesFiltered.length===0&&<option value={countryCode}>{value.paisNombre||countryCode}</option>}
            {countriesFiltered.map((country) => (
              <option key={country.code} value={country.code}>{country.name} ({country.code})</option>
            ))}
          </select>
          <small>{COUNTRIES.length} países y territorios disponibles</small>
        </label>

        <label className="field-block">
          <span>Estado / Departamento / Región</span>
          <select
            value={value.regionCodigo || ""}
            onChange={(e) => {
              const selected = subdivisions.find((item) => item.code === e.target.value);
              update({ regionCodigo: e.target.value, regionNombre: selected?.name || "", provincia:"" });
            }}
          >
            <option value="">Seleccionar</option>
            {regionsFiltered.map((item) => (
              <option key={item.code} value={item.code}>{item.name}{item.type ? ` · ${item.type}` : ""}</option>
            ))}
          </select>
          <small>{subdivisions.length ? `${subdivisions.length} divisiones administrativas disponibles` : "Este país no tiene subdivisiones cargadas"}</small>
        </label>

        <label className="field-block">
          <span>Provincia / Distrito / Condado</span>
          <input
            value={value.provincia || ""}
            onChange={(e) => update({ provincia: e.target.value })}
            placeholder="Opcional según el país"
          />
        </label>

        <label className="field-block">
          <span>Ciudad / Municipio</span>
          <input
            value={value.ciudad || ""}
            onChange={(e) => update({ ciudad: e.target.value })}
            placeholder="Ej. Cochabamba, Madrid, Lima..."
          />
        </label>

        <label className="field-block field-span-2">
          <span>Dirección</span>
          <input
            value={value.direccion || ""}
            onChange={(e) => update({ direccion: e.target.value })}
            placeholder="Avenida, calle, zona, número..."
          />
        </label>

        {prefix && <input type="hidden" name={`${prefix}Pais`} value={countryCode} readOnly />}
      </div>
    </div>
  );
}
