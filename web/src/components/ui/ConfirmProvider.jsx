import { Trash2, TriangleAlert, Check } from "lucide-react";

import { useCallback, useEffect, useRef, useState } from "react";

import { ConfirmContext } from "../../context/ConfirmContext";

import {
  sonidoClick,
  sonidoMantener,
  sonidoPeligroConfirmado
} from "../../utils/sonidos";

import "../../styles/confirmar.css";

const DURACION_MANTENER_MS = 1100;

// Botón que solo confirma si se mantiene pulsado (ratón, dedo o teclado)
function BotonMantener({ accion, onConfirmar }) {
  const [pulsando, setPulsando] = useState(false);

  const temporizador = useRef(null);
  const cortarSonido = useRef(null);
  const terminado = useRef(false);

  const empezar = useCallback(() => {
    if (terminado.current || temporizador.current) {
      return;
    }

    setPulsando(true);
    cortarSonido.current = sonidoMantener(DURACION_MANTENER_MS / 1000);

    temporizador.current = setTimeout(() => {
      terminado.current = true;
      temporizador.current = null;
      setPulsando(false);
      sonidoPeligroConfirmado();
      onConfirmar();
    }, DURACION_MANTENER_MS);
  }, [onConfirmar]);

  const soltar = useCallback(() => {
    if (!temporizador.current) {
      return;
    }

    clearTimeout(temporizador.current);
    temporizador.current = null;
    cortarSonido.current?.();
    setPulsando(false);
  }, []);

  useEffect(() => () => {
    clearTimeout(temporizador.current);
    cortarSonido.current?.();
  }, []);

  return (
    <button
      type="button"
      className="an-hold"
      data-holding={pulsando}
      data-sonido="ninguno"
      onPointerDown={(evento) => {
        evento.currentTarget.setPointerCapture?.(evento.pointerId);
        empezar();
      }}
      onPointerUp={soltar}
      onPointerCancel={soltar}
      onLostPointerCapture={soltar}
      onKeyDown={(evento) => {
        if ((evento.key === " " || evento.key === "Enter") && !evento.repeat) {
          evento.preventDefault();
          empezar();
        }
      }}
      onKeyUp={(evento) => {
        if (evento.key === " " || evento.key === "Enter") {
          soltar();
        }
      }}
      onBlur={soltar}
      onContextMenu={(evento) => evento.preventDefault()}
    >
      <span className="an-hold__fill" aria-hidden="true" />

      <span className="an-hold__label">
        <Trash2 size={18} aria-hidden="true" />
        {pulsando ? "Mantén pulsado…" : accion}
      </span>
    </button>
  );
}

function ConfirmProvider({ children }) {
  const [pedido, setPedido] = useState(null);
  const resolver = useRef(null);
  const cancelarRef = useRef(null);

  const confirmar = useCallback(
    (opciones) =>
      new Promise((resolve) => {
        resolver.current = resolve;
        setPedido({
          titulo: "¿Confirmas esta acción?",
          mensaje: "",
          accion: "Confirmar",
          peligro: false,
          ...opciones
        });
      }),
    []
  );

  const cerrar = useCallback((resultado) => {
    resolver.current?.(resultado);
    resolver.current = null;
    setPedido(null);
  }, []);

  useEffect(() => {
    if (!pedido) {
      return undefined;
    }

    cancelarRef.current?.focus();

    const alTeclear = (evento) => {
      if (evento.key === "Escape") {
        cerrar(false);
      }
    };

    window.addEventListener("keydown", alTeclear);

    return () => window.removeEventListener("keydown", alTeclear);
  }, [pedido, cerrar]);

  return (
    <ConfirmContext.Provider value={confirmar}>
      {children}

      {pedido && (
        <div
          className="an-confirm"
          onMouseDown={(evento) => {
            if (evento.target === evento.currentTarget) {
              cerrar(false);
            }
          }}
        >
          <div
            className="an-confirm__box"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="an-confirm-titulo"
            aria-describedby="an-confirm-mensaje"
            data-peligro={pedido.peligro}
          >
            <span className="an-confirm__icon" aria-hidden="true">
              {pedido.peligro ? (
                <TriangleAlert size={26} strokeWidth={1.9} />
              ) : (
                <Check size={26} strokeWidth={2.2} />
              )}
            </span>

            <h2 id="an-confirm-titulo">{pedido.titulo}</h2>

            {pedido.mensaje && <p id="an-confirm-mensaje">{pedido.mensaje}</p>}

            <div className="an-confirm__actions">
              <button
                ref={cancelarRef}
                type="button"
                className="an-confirm__cancel"
                onClick={() => cerrar(false)}
              >
                Cancelar
              </button>

              {pedido.peligro ? (
                <BotonMantener
                  accion={pedido.accion}
                  onConfirmar={() => cerrar(true)}
                />
              ) : (
                <button
                  type="button"
                  className="an-confirm__ok"
                  onClick={() => {
                    sonidoClick();
                    cerrar(true);
                  }}
                >
                  {pedido.accion}
                </button>
              )}
            </div>

            {pedido.peligro && (
              <small className="an-confirm__hint">
                Mantén pulsado el botón rojo para confirmar. Suéltalo para cancelar.
              </small>
            )}
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export default ConfirmProvider;
