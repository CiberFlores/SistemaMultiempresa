import { useState } from "react";
import { BellRing, Boxes, Check, Copy, Download, MessageCircle, Package, Receipt, ShieldCheck, Smartphone, TrendingUp, UsersRound } from "lucide-react";

import useMarcaEmpresa from "../../hooks/useMarcaEmpresa";
import useInstalarApp from "../../hooks/useInstalarApp";
import { detectarNavegador } from "../../utils/instalacionApp";

import "../../styles/roles-empresa.css";
import "../../styles/inventario-empresa.css";
import "../../styles/compras-empresa.css";
import "../../styles/app-movil-pagina.css";

const BENEFICIOS = [
  { icono: TrendingUp, titulo: "Ventas en vivo", texto: "Mira cuánto vendió tu negocio hoy, sin estar en la tienda." },
  { icono: Boxes, titulo: "Stock al instante", texto: "Qué se agota o se vence pronto, por sucursal y por lote." },
  { icono: UsersRound, titulo: "Tu equipo", texto: "Quién está conectado y quién está cobrando ahora." },
  { icono: BellRing, titulo: "Alertas en el celular", texto: "Te avisa cuando algo necesita tu atención." }
];

// Los pasos cambian según el navegador del celular
function pasosDeInstalacion(n) {
  if (n.dentroDeApp) {
    return [
      "Este enlace está abierto dentro de otra aplicación (WhatsApp, Facebook…) y ahí no se puede instalar.",
      "Toca los tres puntos ⋮ de arriba y elige «Abrir en Chrome» o «Abrir en el navegador».",
      "Ya en el navegador, entra con tu cuenta de dueño y vuelve a esta página."
    ];
  }

  if (n.ios) {
    return [
      "Abre esta página en Safari (en iPhone solo Safari puede instalarla).",
      "Toca el botón Compartir (el cuadrado con la flecha hacia arriba).",
      "Elige «Añadir a pantalla de inicio» y toca «Añadir»."
    ];
  }

  if (n.firefox) {
    return [
      "Firefox no instala bien esta aplicación. Abre el enlace en Chrome.",
      "En Chrome toca el menú ⋮ de arriba a la derecha.",
      "Elige «Instalar aplicación» o «Agregar a la pantalla principal»."
    ];
  }

  if (n.samsung) {
    return [
      "Toca el menú ☰ de abajo a la derecha.",
      "Elige «Agregar página a» y luego «Pantalla de inicio».",
      "Toca «Agregar». Si no aparece, abre el enlace en Chrome."
    ];
  }

  return [
    "Abre esta página desde el celular, con tu cuenta de dueño.",
    "Toca el menú ⋮ de Chrome (arriba a la derecha) y elige «Instalar aplicación» o «Agregar a la pantalla principal».",
    "Confirma con «Instalar». El icono con el logo de tu empresa aparece en tu pantalla de inicio."
  ];
}

export default function AppMovilPage() {
  const marca = useMarcaEmpresa();
  const { disponible, instalada, resultado, instalar } = useInstalarApp();
  const [copiado, setCopiado] = useState(false);
  const navegador = detectarNavegador();
  const pasos = pasosDeInstalacion(navegador);

  const enlace = `${window.location.origin}/admin-movil`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(enlace);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2200);
    } catch {
      setCopiado(false);
    }
  }

  const mensaje = encodeURIComponent(`Abre el panel de ${marca.nombre} en tu celular: ${enlace}`);

  return (
    <div className="re inv">
      <header className="re-cabecera">
        <div>
          <h1>Aplicación móvil</h1>
          <p>Tu negocio en el bolsillo. Solo la ve y la instala el dueño de la empresa.</p>
        </div>
      </header>

      <section className="am-hero">
        <div className="am-hero__texto">
          <span className="am-etiqueta">
            <ShieldCheck size={15} aria-hidden="true" /> Solo para el dueño
          </span>
          <h2>{marca.nombre} en tu celular</h2>
          <p>
            Es una versión liviana del sistema para que veas cómo va tu negocio estés donde estés. Se instala como cualquier aplicación,
            con el logo y los colores de tu empresa, y no ocupa casi espacio. Tus trabajadores no la ven.
          </p>

          <div className="am-acciones">
            {instalada ? (
              <span className="am-ok">
                <Check size={18} aria-hidden="true" /> Ya está instalada en este dispositivo
              </span>
            ) : (
              <button type="button" className="re-boton am-instalar" onClick={instalar}>
                {disponible ? <Download size={18} aria-hidden="true" /> : <Smartphone size={18} aria-hidden="true" />}
                Instalar en mi celular
              </button>
            )}

            <button type="button" className="re-boton re-boton--suave" onClick={copiar}>
              {copiado ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
              {copiado ? "Enlace copiado" : "Copiar enlace"}
            </button>

            <a className="re-boton re-boton--suave" href={`https://wa.me/?text=${mensaje}`} target="_blank" rel="noreferrer">
              <MessageCircle size={18} aria-hidden="true" /> Enviármelo por WhatsApp
            </a>
          </div>

          {resultado === "manual" && !instalada && (
            <div className="am-nota am-guia" role="status">
              <strong>{navegador.movil ? "Instálala con estos pasos" : "Instálala desde tu celular"}</strong>
              {!navegador.movil && <p>Desde la computadora no se instala. Envíate el enlace por WhatsApp o cópialo y ábrelo en tu celular.</p>}
              <ol>
                {pasos.map((texto) => (
                  <li key={texto}>{texto}</li>
                ))}
              </ol>
            </div>
          )}
          {resultado === "instalada" && (
            <p className="am-nota" role="status">
              ¡Instalada! Búscala en tu pantalla de inicio.
            </p>
          )}
        </div>

        <div className="am-celular" aria-hidden="true">
          <div className="am-celular__marco">
            <div className="am-celular__cabecera">
              <span className="am-celular__logo">
                {marca.logoUrl ? <img src={marca.logoUrl} alt="" /> : <b>{(marca.nombre || "?").charAt(0).toUpperCase()}</b>}
              </span>
              <span>
                <small>Hola, dueño</small>
                <strong>{marca.nombre}</strong>
              </span>
            </div>

            <div className="am-celular__venta">
              <small>Ventas de hoy</small>
              <strong>Bs 1,240.00</strong>
              <i />
            </div>

            <div className="am-celular__fila">
              <span>
                <Receipt size={16} />
                <b>18</b> ventas
              </span>
              <span>
                <Package size={16} />
                <b>3</b> por agotar
              </span>
            </div>

            <div className="am-celular__alerta">
              <BellRing size={15} /> Yogurt: quedan pocas unidades
            </div>
          </div>
        </div>
      </section>

      <section className="inv-bloque">
        <header className="co-paso__cabecera">
          <span className="co-paso__numero" aria-hidden="true">
            <TrendingUp size={20} />
          </span>
          <div>
            <h2>¿Para qué sirve?</h2>
            <p>Lo que puedes hacer desde el celular.</p>
          </div>
        </header>

        <ul className="am-beneficios">
          {BENEFICIOS.map(({ icono: Icono, titulo, texto }) => (
            <li key={titulo}>
              <span aria-hidden="true">
                <Icono size={22} />
              </span>
              <div>
                <strong>{titulo}</strong>
                <p>{texto}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="inv-bloque">
        <header className="co-paso__cabecera">
          <span className="co-paso__numero" aria-hidden="true">
            <Smartphone size={20} />
          </span>
          <div>
            <h2>Cómo instalarla</h2>
            <p>Son tres pasos y toma un minuto.</p>
          </div>
        </header>

        <ol className="am-pasos">
          {pasos.map((texto, i) => (
            <li key={texto}>
              <b>{i + 1}</b>
              <span>{texto}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
