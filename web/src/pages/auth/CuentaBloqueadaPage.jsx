import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Database, MessageCircle, Phone, ShieldAlert, UserRound } from "lucide-react";

import EscenaTienda from "../../components/common/EscenaTienda";
import { borrarBloqueo, leerBloqueo } from "../../utils/bloqueo";

import "../../styles/cuenta-bloqueada.css";
import "../../styles/mantenimiento.css";

// Encargados de la plataforma. Los números son de Bolivia (+591).
const ENCARGADOS = [
  { nombre: "José Manuel Yanarico Quispe", telefono: "62623078" },
  { nombre: "Joel Axel Flores Coyo", telefono: "68516570" }
];

const formatoTelefono = (telefono) => `+591 ${telefono.slice(0, 3)} ${telefono.slice(3)}`;

function Encargados({ mensaje }) {
  return (
    <ul className="cb__encargados">
      {ENCARGADOS.map((encargado) => (
        <li key={encargado.telefono}>
          <div className="cb__persona">
            <strong>{encargado.nombre}</strong>
            <span>Encargado de Arca Nova · {formatoTelefono(encargado.telefono)}</span>
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
  );
}

// Qué se le dice a cada persona según lo que se bloqueó
function contenidoDe({ motivo, rol, empresa }) {
  const nombre = empresa ? <b>{empresa}</b> : "tu empresa";

  if (motivo === "CUENTA") {
    return rol === "TRABAJADOR"
      ? {
          etiqueta: "Cuenta bloqueada",
          titulo: "Tu cuenta fue bloqueada",
          texto: "El dueño de la empresa desactivó tu acceso. Habla con él o ella para que lo active de nuevo.",
          letrero: "Bloqueada",
          pasos: [
            [UserRound, "Solo el dueño de tu empresa puede volver a activar tu cuenta."],
            [Database, "Lo que registraste sigue guardado."]
          ]
        }
      : {
          etiqueta: "Cuenta bloqueada",
          titulo: "Tu cuenta fue bloqueada",
          texto: "Los encargados de Arca Nova desactivaron tu acceso. Escríbenos y lo revisamos contigo.",
          letrero: "Bloqueada",
          contactos: "Hola, mi cuenta de administrador en Arca Nova está bloqueada y quisiera saber cómo activarla de nuevo."
        };
  }

  if (rol === "TRABAJADOR") {
    return {
      etiqueta: "Empresa bloqueada",
      titulo: "La empresa fue bloqueada",
      texto: <>Por ahora nadie puede entrar al sistema de {nombre}. Habla con el dueño de la empresa.</>,
      letrero: "Bloqueada",
      pasos: [[Database, "Lo que registraste sigue guardado."]]
    };
  }

  return {
    etiqueta: "Empresa bloqueada",
    titulo: "Bloqueamos tu empresa",
    texto: <>Suspendimos el acceso a {nombre} por seguridad o por un pendiente con tu cuenta. Habla con nosotros y te ayudamos a activarla.</>,
    letrero: "Bloqueada",
    pasos: [
      [ShieldAlert, "Ni tú ni tus trabajadores pueden entrar mientras dure el bloqueo."],
      [Database, "Tus ventas, productos y reportes siguen guardados."]
    ],
    contactos: `Hola, soy el administrador de ${empresa || "mi empresa"}. Mi empresa está bloqueada en Arca Nova y quisiera saber cómo activarla de nuevo.`
  };
}

export default function CuentaBloqueadaPage() {
  const navigate = useNavigate();
  const [bloqueo] = useState(leerBloqueo);
  const c = contenidoDe(bloqueo);

  const volver = () => {
    borrarBloqueo();
    navigate("/login", { replace: true });
  };

  return (
    <main className="cb">
      <div className="cb__columna">
        <img className="cb__logo" src="/brand/arca-nova-logo.png" alt="Arca Nova" width={1536} height={1024} />

        <section className="cb__tarjeta" aria-labelledby="cb-titulo">
          <div className="cb__escena">
            <EscenaTienda tipo="bloqueo" letrero={c.letrero} />
          </div>

          <p className="cb__etiqueta">{c.etiqueta}</p>
          <h1 id="cb-titulo">{c.titulo}</h1>
          <p className="cb__texto">{c.texto}</p>

          {c.pasos && (
            <ul className="cb__pasos">
              {c.pasos.map(([Icono, texto]) => (
                <li key={texto}>
                  <Icono size={20} aria-hidden="true" />
                  {texto}
                </li>
              ))}
            </ul>
          )}

          {c.contactos && <Encargados mensaje={c.contactos} />}

          <button type="button" className="cb__volver" onClick={volver}>
            <ArrowLeft size={17} aria-hidden="true" />
            Volver al inicio de sesión
          </button>
        </section>
      </div>
    </main>
  );
}
