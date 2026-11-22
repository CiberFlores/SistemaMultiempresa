import { useCallback, useEffect, useRef, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Bell } from "lucide-react";
import useAuth from "../../hooks/useAuth";
import { db } from "../../services/firebase/firebaseConfig";
import { suscribirAvisosPara } from "../../services/avisosEquipoService";
import { sonidoPop } from "../../utils/sonidos";

const CLAVE_VISTO = "an-avisos-vistos";
const ETIQUETA_PRIORIDAD = { BAJA: "Baja", MEDIA: "Media", ALTA: "Alta", URGENTE: "Urgente" };

function milisegundos(valor) {
  if (valor?.toMillis) return valor.toMillis();
  const fecha = new Date(valor).getTime();
  return Number.isNaN(fecha) ? 0 : fecha;
}

function leerVisto() {
  try {
    return Number(localStorage.getItem(CLAVE_VISTO)) || 0;
  } catch {
    return 0;
  }
}

function guardarVisto(valor) {
  try {
    localStorage.setItem(CLAVE_VISTO, String(valor));
  } catch {
    /* sin almacenamiento: el contador solo se reinicia al recargar */
  }
}

// Avisos que el super admin envía a las empresas. Cada persona ve los de su
// audiencia: todos, administradores o trabajadores.
export default function CampanaAvisosEmpresa() {
  const { usuario } = useAuth();
  const contenedor = useRef(null);
  const [abierto, setAbierto] = useState(false);
  const [estado, setEstado] = useState("cargando");
  const [avisos, setAvisos] = useState([]);
  const [visto, setVisto] = useState(leerVisto);
  const [equipo, setEquipo] = useState([]);
  const conocidos = useRef(null);

  const tipo = usuario?.tipoUsuario;

  const cargar = useCallback(async () => {
    const audiencias = ["TODOS"];
    if (tipo === "ADMIN") audiencias.push("ADMINS");
    if (tipo === "TRABAJADOR") audiencias.push("TRABAJADORES");

    try {
      // Una consulta por audiencia: así cada una cumple las reglas de Firestore.
      const respuestas = await Promise.all(
        audiencias.map((audiencia) =>
          getDocs(
            query(
              collection(db, "notificacionesGlobales"),
              where("estado", "==", "ACTIVO"),
              where("audiencia", "==", audiencia)
            )
          )
        )
      );
      const filas = respuestas
        .flatMap((r) => r.docs.map((d) => ({ id: d.id, ...d.data() })))
        .sort((a, b) => milisegundos(b.fechaRegistro) - milisegundos(a.fechaRegistro))
        .slice(0, 8);
      setAvisos(filas);
      setEstado("listo");
    } catch (error) {
      console.error("No se pudieron cargar los avisos:", error);
      setEstado("error");
    }
  }, [tipo]);

  useEffect(() => {
    if (tipo !== "ADMIN" && tipo !== "TRABAJADOR") return undefined;

    let activo = true;
    Promise.resolve().then(() => {
      if (activo) cargar();
    });

    return () => {
      activo = false;
    };
  }, [tipo, cargar]);

  // Avisos de tu jefe: llegan en tiempo real y suenan cuando entra uno nuevo
  useEffect(() => {
    if (tipo !== "TRABAJADOR" || !usuario?.empresaId) return undefined;

    const cancelar = suscribirAvisosPara(
      usuario,
      (lista) => {
        const ids = new Set(lista.map((a) => a.id));

        if (conocidos.current && lista.some((a) => !conocidos.current.has(a.id))) {
          sonidoPop();
        }

        conocidos.current = ids;
        setEquipo(lista.map((a) => ({ ...a, origen: "EQUIPO" })));
      },
      (error) => console.error("No se pudieron leer los avisos del equipo:", error)
    );

    return () => cancelar?.();
  }, [tipo, usuario]);

  useEffect(() => {
    if (!abierto) return undefined;

    const alPulsarFuera = (evento) => {
      if (!contenedor.current?.contains(evento.target)) setAbierto(false);
    };
    const alTeclear = (evento) => {
      if (evento.key === "Escape") setAbierto(false);
    };

    document.addEventListener("pointerdown", alPulsarFuera);
    document.addEventListener("keydown", alTeclear);

    return () => {
      document.removeEventListener("pointerdown", alPulsarFuera);
      document.removeEventListener("keydown", alTeclear);
    };
  }, [abierto]);

  const todos = [...equipo, ...avisos.map((a) => ({ ...a, origen: "ARCA" }))]
    .sort((a, b) => milisegundos(b.fechaRegistro) - milisegundos(a.fechaRegistro))
    .slice(0, 12);

  const nuevos = todos.filter((a) => milisegundos(a.fechaRegistro) > visto).length;

  const alternar = () => {
    const siguiente = !abierto;
    setAbierto(siguiente);

    if (siguiente) {
      cargar();
      const masReciente = todos.reduce((m, a) => Math.max(m, milisegundos(a.fechaRegistro)), 0);
      if (masReciente > visto) {
        guardarVisto(masReciente);
        setVisto(masReciente);
      }
    }
  };

  return (
    <div className="admin-campana" ref={contenedor}>
      <button
        type="button"
        className="admin-icon-button"
        title="Notificaciones"
        aria-label={nuevos ? `Notificaciones, ${nuevos} nuevas` : "Notificaciones"}
        aria-haspopup="true"
        aria-expanded={abierto}
        onClick={alternar}
      >
        <Bell size={19} />
        {nuevos > 0 && (
          <span className="admin-campana__punto" aria-hidden="true">
            {nuevos > 9 ? "9+" : nuevos}
          </span>
        )}
      </button>

      {abierto && (
        <div className="admin-campana__panel" role="dialog" aria-label="Notificaciones">
          <header>Notificaciones</header>

          {estado === "cargando" && <p className="admin-campana__vacio">Cargando…</p>}
          {estado === "error" && (
            <p className="admin-campana__vacio">No se pudieron cargar. Inténtalo de nuevo.</p>
          )}
          {estado !== "cargando" && todos.length === 0 && estado === "listo" && (
            <p className="admin-campana__vacio">Todavía no tienes notificaciones.</p>
          )}
          {todos.length > 0 && (
            <ul>
              {todos.map((aviso) => (
                <li key={aviso.id} data-prioridad={aviso.prioridad} data-nuevo={milisegundos(aviso.fechaRegistro) > visto}>
                  <span className="admin-campana__origen">{aviso.origen === "EQUIPO" ? "De tu jefe" : "Arca Nova"}</span>
                  <strong>{aviso.titulo || "Sin título"}</strong>
                  {aviso.mensaje && <small>{aviso.mensaje}</small>}
                  {(aviso.prioridad === "ALTA" || aviso.prioridad === "URGENTE") && (
                    <em>{aviso.prioridad === "ALTA" && aviso.origen === "EQUIPO" ? "Importante" : ETIQUETA_PRIORIDAD[aviso.prioridad]}</em>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
