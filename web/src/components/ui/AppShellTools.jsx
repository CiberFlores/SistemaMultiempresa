import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, Search, X, ZoomIn } from "lucide-react";
import { useNavigate } from "react-router-dom";

const COMMANDS = [
  ["Dashboard", "/dashboard"], ["Productos", "/inventario/productos"], ["Inventario", "/inventario"],
  ["Clientes", "/clientes"], ["Proveedores", "/compras/proveedores"], ["Compras", "/compras"],
  ["Punto de venta", "/ventas/pos"], ["Ventas", "/ventas"], ["Gastos", "/finanzas/gastos"],
  ["Cuentas por cobrar", "/finanzas/cuentas-cobrar"], ["Cuentas por pagar", "/finanzas/cuentas-pagar"],
  ["Reportes", "/reportes/ventas"], ["Super Admin", "/superadmin/dashboard"], ["Empresas", "/superadmin/empresas"]
];

export default function AppShellTools() {
  const navigate = useNavigate();
  const [zoom, setZoom] = useState(() => Number(localStorage.getItem("appZoom")) || 100);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    document.documentElement.style.setProperty("--app-zoom", String(zoom / 100));
    localStorage.setItem("appZoom", String(zoom));
  }, [zoom]);

  useEffect(() => {
    const onKey = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault(); setOpen((value) => !value);
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = useMemo(() => COMMANDS.filter(([label]) => label.toLowerCase().includes(query.toLowerCase())), [query]);

  return (
    <>
      <div className="shell-tools" aria-label="Herramientas de interfaz">
        <button onClick={() => setZoom((z) => Math.max(80, z - 5))} title="Alejar"><Minus size={15} /></button>
        <span><ZoomIn size={14} /> {zoom}%</span>
        <button onClick={() => setZoom((z) => Math.min(125, z + 5))} title="Acercar"><Plus size={15} /></button>
        <button onClick={() => { setZoom(100); setOpen(true); }} title="Paleta de comandos"><Search size={15} /></button>
      </div>

      {open && (
        <div className="command-overlay" onMouseDown={() => setOpen(false)}>
          <div className="command-palette glass-3d" onMouseDown={(e) => e.stopPropagation()}>
            <div className="command-search"><Search size={18} /><input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ir a un módulo… Ctrl + K"/><button onClick={() => setOpen(false)}><X size={17}/></button></div>
            <div className="command-list">
              {filtered.map(([label, route]) => (
                <button key={route} onClick={() => { navigate(route); setOpen(false); setQuery(""); }}>
                  <span>{label}</span><small>{route}</small>
                </button>
              ))}
              {!filtered.length && <div className="command-empty">No hay coincidencias.</div>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
