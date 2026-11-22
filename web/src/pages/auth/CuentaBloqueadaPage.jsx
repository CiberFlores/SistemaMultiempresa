import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, Phone, ShieldAlert } from "lucide-react";

import { CLAVE_EMPRESA_BLOQUEADA } from "../../services/firebase/authService";

import "../../styles/cuenta-bloqueada.css";

// Encargados de la plataforma. Los números son de Bolivia (+591).
const ENCARGADOS = [
  { nombre: "José Manuel Yanarico Quispe", telefono: "62623078" },
  { nombre: "Joel Axel Flores Coyo", telefono: "68516570" }
];

const formatoTelefono = (telefono) => `+591 ${telefono.slice(0, 3)} ${telefono.slice(3)}`;

function leerEmpresa() {
  try {
    return JSON.parse(sessionStorage.getItem(CLAVE_EMPRESA_BLOQUEADA) || "{}").nombre || "";
  } catch {
    return "";
  }
}

export default function CuentaBloqueadaPage() {
  const navigate = useNavigate();
  const [empresa] = useState(leerEmpresa);

  const mensaje = `Hola, soy de la empresa ${empresa || "mi empresa"}. Mi cuenta en Arca Nova está bloqueada y quisiera saber cómo activarla de nuevo.`;

  const volver = () => {
    try {
      sessionStorage.removeItem(CLAVE_EMPRESA_BLOQUEADA);
    } catch {
      /* sin almacenamiento */
    }
    navigate("/login", { replace: true });
  };

  return (
    <main className="cb">
      <div className="cb__columna">
        <img className="cb__logo" src="/brand/arca-nova-logo.png" alt="Arca Nova" width={1536} height={1024} />

        <section className="cb__tarjeta" aria-labelledby="cb-titulo">
          <span className="cb__icono" aria-hidden="true">
            <ShieldAlert size={34} strokeWidth={2} />
          </span>

          <p className="cb__etiqueta">Cuenta bloqueada</p>
          <h1 id="cb-titulo">Tu cuenta fue bloqueada</h1>
          <p className="cb__texto">
            {empresa ? (
              <>
                La empresa <b>{empresa}</b> fue desactivada, por eso nadie puede entrar por ahora.
              </>
            ) : (
              "Tu empresa fue desactivada, por eso nadie puede entrar por ahora."
            )}{" "}
            Habla con los encargados de la plataforma para activarla de nuevo.
          </p>

          <ul className="cb__encargados">
            {ENCARGADOS.map((encargado) => (
              <li key={encargado.telefono}>
                <div className="cb__persona">
                  <strong>{encargado.nombre}</strong>
                  <span>Encargado de la plataforma · {formatoTelefono(encargado.telefono)}</span>
                </div>

                <div className="cb__acciones">
                  <a
                    className="cb__boton cb__boton--whatsapp"
                    href={`https://wa.me/591${encargado.telefono}?text=${encodeURIComponent(mensaje)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle size={19} aria-hidden="true" />
                    Escribir por WhatsApp
                  </a>
                  <a className="cb__boton cb__boton--llamar" href={`tel:+591${encargado.telefono}`} aria-label={`Llamar a ${encargado.nombre}`}>
                    <Phone size={18} aria-hidden="true" />
                    Llamar
                  </a>
                </div>
              </li>
            ))}
          </ul>

          <button type="button" className="cb__volver" onClick={volver}>
            <ArrowLeft size={17} aria-hidden="true" />
            Volver al inicio de sesión
          </button>
        </section>
      </div>
    </main>
  );
}
