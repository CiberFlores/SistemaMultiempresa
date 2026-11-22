import "../../styles/empresa-identidad.css";
import {
  Bell,
  Boxes,
  LayoutDashboard,
  Monitor,
  Search,
  ShoppingCart,
  Smartphone,
  TrendingUp,
  Users
} from "lucide-react";

import { useState } from "react";

import { derivarTema } from "../../utils/identidadEmpresa";

import LogoEmpresa from "./LogoEmpresa";

const MENU = [
  { texto: "Panel", icono: LayoutDashboard },
  { texto: "Ventas", icono: ShoppingCart },
  { texto: "Inventario", icono: Boxes },
  { texto: "Clientes", icono: Users }
];

const BARRAS = [38, 56, 44, 72, 60, 88, 68];

// Miniatura del panel de la empresa con la identidad elegida.
// Todo se recalcula en cada cambio: no hay nada que "aplicar".
function VistaPreviaPanel({ identidad, nombre, rubro }) {
  const [vista, setVista] = useState("escritorio");

  const tema = derivarTema(identidad);
  const titulo = (identidad.nombreVisual || nombre || "Tu empresa").trim() || "Tu empresa";

  const variables = {
    "--p-primario": tema.primario,
    "--p-secundario": tema.secundario,
    "--p-fondo": tema.fondo,
    "--p-texto": tema.texto,
    "--p-superficie": tema.superficie,
    "--p-superficie2": tema.superficie2,
    "--p-borde": tema.borde,
    "--p-apagado": tema.apagado,
    "--p-sobre-primario": tema.sobrePrimario,
    "--p-sobre-secundario": tema.sobreSecundario,
    "--p-legible": tema.primarioLegible,
    fontFamily: `"${identidad.tipografia || "Inter"}", system-ui, sans-serif`
  };

  return (
    <aside className="idv-preview" aria-label="Vista previa en vivo del panel de la empresa">
      <div className="idv-preview__bar">
        <span className="idv-live">
          <i aria-hidden="true" />
          Vista previa en vivo
        </span>

        <div className="idv-switch" role="group" aria-label="Tamaño de la vista previa">
          <button
            type="button"
            data-sonido="pop"
            aria-pressed={vista === "escritorio"}
            onClick={() => setVista("escritorio")}
          >
            <Monitor size={15} aria-hidden="true" />
            Escritorio
          </button>

          <button
            type="button"
            data-sonido="pop"
            aria-pressed={vista === "celular"}
            onClick={() => setVista("celular")}
          >
            <Smartphone size={15} aria-hidden="true" />
            Celular
          </button>
        </div>
      </div>

      <div className="idv-stage" data-vista={vista}>
        <div className="idv-device" style={variables}>
          {vista === "escritorio" ? (
            <div className="idv-screen idv-screen--desktop">
              <div className="idv-chrome" aria-hidden="true">
                <span />
                <span />
                <span />
                <em>{titulo}</em>
              </div>

              <div className="idv-app">
                <nav className="idv-side">
                  <div className="idv-side__brand">
                    <LogoEmpresa
                      logoUrl={identidad.logoUrl}
                      nombre={titulo}
                      color={tema.primario}
                      tamano={34}
                    />
                    <div>
                      <strong>{titulo}</strong>
                      <span>{rubro || "Panel empresarial"}</span>
                    </div>
                  </div>

                  {MENU.map(({ texto, icono: Icono }, indice) => (
                    <span className="idv-side__item" data-activo={indice === 0} key={texto}>
                      <Icono size={14} aria-hidden="true" />
                      {texto}
                    </span>
                  ))}
                </nav>

                <div className="idv-main">
                  <header className="idv-head">
                    <span className="idv-search">
                      <Search size={12} aria-hidden="true" />
                      Buscar productos
                    </span>
                    <Bell size={14} aria-hidden="true" />
                    <span className="idv-avatar">{titulo.charAt(0).toUpperCase()}</span>
                  </header>

                  <h4 className="idv-title">Hola, {titulo}</h4>

                  <div className="idv-kpis">
                    <div>
                      <small>Ventas de hoy</small>
                      <strong>1.250</strong>
                      <em>
                        <TrendingUp size={11} aria-hidden="true" /> +12 %
                      </em>
                    </div>
                    <div>
                      <small>Productos</small>
                      <strong>348</strong>
                    </div>
                    <div>
                      <small>Clientes</small>
                      <strong>96</strong>
                    </div>
                  </div>

                  <div className="idv-row">
                    <div className="idv-card idv-chart">
                      <small>Ventas de la semana</small>
                      <div className="idv-bars">
                        {BARRAS.map((alto, indice) => (
                          <i
                            key={indice}
                            style={{
                              height: `${alto}%`,
                              background: indice === BARRAS.length - 2 ? "var(--p-primario)" : "var(--p-secundario)"
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="idv-card idv-actions">
                      <small>Acciones</small>
                      <span className="idv-btn idv-btn--primary">Nueva venta</span>
                      <span className="idv-btn idv-btn--secondary">Agregar producto</span>
                      <span className="idv-badge">Stock bajo · 4</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="idv-screen idv-screen--phone">
              <div className="idv-notch" aria-hidden="true" />

              <header className="idv-phone-head">
                <LogoEmpresa
                  logoUrl={identidad.logoUrl}
                  nombre={titulo}
                  color={tema.primario}
                  tamano={30}
                />
                <strong>{titulo}</strong>
                <Bell size={15} aria-hidden="true" />
              </header>

              <div className="idv-phone-body">
                <h4 className="idv-title">Resumen de hoy</h4>

                <div className="idv-kpis idv-kpis--two">
                  <div>
                    <small>Ventas</small>
                    <strong>1.250</strong>
                  </div>
                  <div>
                    <small>Clientes</small>
                    <strong>96</strong>
                  </div>
                </div>

                <div className="idv-card idv-chart">
                  <small>Semana</small>
                  <div className="idv-bars">
                    {BARRAS.map((alto, indice) => (
                      <i
                        key={indice}
                        style={{
                          height: `${alto}%`,
                          background: indice === BARRAS.length - 2 ? "var(--p-primario)" : "var(--p-secundario)"
                        }}
                      />
                    ))}
                  </div>
                </div>

                <span className="idv-btn idv-btn--primary idv-btn--block">Nueva venta</span>
              </div>

              <nav className="idv-tabs" aria-hidden="true">
                {MENU.map(({ texto, icono: Icono }, indice) => (
                  <span data-activo={indice === 0} key={texto}>
                    <Icono size={16} />
                    {texto}
                  </span>
                ))}
              </nav>
            </div>
          )}
        </div>
      </div>

      <p className="idv-preview__note">
        Así verá su panel esta empresa. Los números son de ejemplo.
      </p>
    </aside>
  );
}

export default VistaPreviaPanel;
