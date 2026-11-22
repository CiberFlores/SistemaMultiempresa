import { LockKeyhole, MailCheck, ShieldAlert, ShieldCheck } from "lucide-react";

const POLITICAS = [
  {
    icono: ShieldCheck,
    titulo: "Aislamiento multiempresa",
    texto:
      "Cada registro pertenece a una sola empresa y las reglas de acceso validan esa pertenencia en cada consulta."
  },
  {
    icono: MailCheck,
    titulo: "Correo verificado",
    texto:
      "El acceso se bloquea hasta que la persona confirme el enlace que recibe en su correo."
  },
  {
    icono: LockKeyhole,
    titulo: "Contraseña fuerte",
    texto:
      "Mínimo 10 caracteres, con mayúscula, minúscula, número y símbolo, y sin espacios."
  },
  {
    icono: ShieldAlert,
    titulo: "Privilegios por rol",
    texto:
      "El super administrador controla la plataforma, el dueño controla su empresa y cada trabajador opera según sus permisos."
  }
];

export default function SeguridadPage() {
  return (
    <div className="module-page">
      <div className="module-page-header">
        <div>
          <h1>Seguridad de plataforma</h1>
          <p>
            Políticas activas para reducir accesos indebidos y errores de
            configuración.
          </p>
        </div>
      </div>

      <section className="security-grid">
        {POLITICAS.map(({ icono: Icono, titulo, texto }) => (
          <article className="security-card glass-3d" key={titulo}>
            <Icono />
            <h3>{titulo}</h3>
            <p>{texto}</p>
            <span className="status-pill active">ACTIVO</span>
          </article>
        ))}
      </section>
    </div>
  );
}
