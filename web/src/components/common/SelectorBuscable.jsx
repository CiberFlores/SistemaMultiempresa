import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

import "../../styles/selector-buscable.css";

function normalizar(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// Lista desplegable con buscador, pensada para listas largas (países, regiones…).
// Funciona con ratón, teclado y pantalla táctil.
export default function SelectorBuscable({
  valor = "",
  opciones = [],
  onChange,
  etiqueta,
  placeholder = "Seleccionar",
  placeholderBusqueda = "Buscar…",
  vacio = "No hay resultados",
  ayuda,
  deshabilitado = false
}) {
  const id = useId();
  const contenedor = useRef(null);
  const entrada = useRef(null);
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [indice, setIndice] = useState(0);

  const seleccionada = opciones.find((opcion) => opcion.valor === valor);

  const filtradas = useMemo(() => {
    const consulta = normalizar(texto);
    if (!consulta) return opciones;

    return opciones.filter(
      (opcion) =>
        normalizar(opcion.etiqueta).includes(consulta) || normalizar(opcion.valor).includes(consulta)
    );
  }, [opciones, texto]);

  useEffect(() => {
    if (!abierto) return undefined;

    const alPulsarFuera = (evento) => {
      if (!contenedor.current?.contains(evento.target)) {
        setAbierto(false);
        setTexto("");
      }
    };

    document.addEventListener("pointerdown", alPulsarFuera);
    return () => document.removeEventListener("pointerdown", alPulsarFuera);
  }, [abierto]);

  useEffect(() => {
    if (abierto) entrada.current?.focus();
  }, [abierto]);

  // La opción activa siempre queda a la vista
  useEffect(() => {
    if (!abierto) return;
    document.getElementById(`${id}-opcion-${indice}`)?.scrollIntoView({ block: "nearest" });
  }, [indice, abierto, id]);

  const abrir = () => {
    if (deshabilitado) return;
    const posicion = opciones.findIndex((opcion) => opcion.valor === valor);
    setIndice(posicion >= 0 ? posicion : 0);
    setTexto("");
    setAbierto(true);
  };

  const cerrar = () => {
    setAbierto(false);
    setTexto("");
  };

  const elegir = (opcion) => {
    if (!opcion) return;
    onChange?.(opcion.valor, opcion);
    cerrar();
  };

  const alTeclear = (evento) => {
    if (evento.key === "Escape") {
      evento.preventDefault();
      cerrar();
    } else if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setIndice((previo) => Math.min(previo + 1, Math.max(filtradas.length - 1, 0)));
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setIndice((previo) => Math.max(previo - 1, 0));
    } else if (evento.key === "Enter") {
      evento.preventDefault();
      elegir(filtradas[indice]);
    }
  };

  return (
    <div className="sb" ref={contenedor} data-abierto={abierto}>
      {etiqueta && <span className="sb-etiqueta">{etiqueta}</span>}

      <button
        type="button"
        className="sb-boton"
        onClick={abierto ? cerrar : abrir}
        disabled={deshabilitado}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={`${id}-lista`}
      >
        <span className="sb-boton__texto" data-vacio={!seleccionada}>
          {seleccionada ? seleccionada.etiqueta : placeholder}
        </span>
        <ChevronDown size={18} aria-hidden="true" />
      </button>

      {ayuda && <small className="sb-ayuda">{ayuda}</small>}

      {abierto && (
        <div className="sb-panel">
          <label className="sb-busqueda">
            <Search size={17} aria-hidden="true" />
            <input
              ref={entrada}
              type="text"
              role="combobox"
              aria-expanded="true"
              aria-controls={`${id}-lista`}
              aria-autocomplete="list"
              placeholder={placeholderBusqueda}
              value={texto}
              autoComplete="off"
              onChange={(evento) => {
                setTexto(evento.target.value);
                setIndice(0);
              }}
              onKeyDown={alTeclear}
            />
          </label>

          <ul className="sb-lista" id={`${id}-lista`} role="listbox">
            {filtradas.length === 0 ? (
              <li className="sb-vacio">{vacio}</li>
            ) : (
              filtradas.map((opcion, posicion) => (
                <li
                  key={opcion.valor}
                  id={`${id}-opcion-${posicion}`}
                  role="option"
                  aria-selected={opcion.valor === valor}
                  data-activa={posicion === indice}
                  onMouseEnter={() => setIndice(posicion)}
                  onClick={() => elegir(opcion)}
                >
                  <span>{opcion.etiqueta}</span>
                  {opcion.valor === valor && <Check size={16} aria-hidden="true" />}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
