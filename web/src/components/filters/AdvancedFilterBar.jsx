import { RotateCcw, Search, SlidersHorizontal } from "lucide-react";

export default function AdvancedFilterBar({
  search,
  onSearch,
  searchPlaceholder = "Buscar por nombre, código, correo...",
  status,
  onStatus,
  statusOptions = [
    { value: "TODOS", label: "Todos los estados" },
    { value: "ACTIVO", label: "Activos" },
    { value: "INACTIVO", label: "Inactivos" }
  ],
  filters = [],
  onClear
}) {
  return (
    <div className="advanced-filter-bar glass-3d">
      <div className="advanced-filter-search">
        <Search size={18} />
        <input value={search || ""} onChange={(e) => onSearch?.(e.target.value)} placeholder={searchPlaceholder} />
      </div>

      {onStatus && (
        <select value={status || "TODOS"} onChange={(e) => onStatus(e.target.value)}>
          {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      )}

      {filters.map((filter) => (
        <select
          key={filter.key}
          value={filter.value ?? "TODOS"}
          onChange={(e) => filter.onChange?.(e.target.value)}
          title={filter.label}
        >
          <option value="TODOS">{filter.allLabel || filter.label}</option>
          {(filter.options || []).map((option) => (
            <option key={String(option.value)} value={option.value}>{option.label}</option>
          ))}
        </select>
      ))}

      <div className="filter-spacer" />
      <span className="filter-icon-label"><SlidersHorizontal size={16} /> Filtros</span>
      <button className="icon-button subtle" type="button" onClick={onClear} title="Limpiar filtros">
        <RotateCcw size={17} />
      </button>
    </div>
  );
}
