import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { Bell, Building2, CornerDownLeft, LogOut, Menu, Search } from "lucide-react";
import useAuth from "../../hooks/useAuth";
import { db } from "../../services/firebase/firebaseConfig";

const SECCIONES = [
  { texto: "Dashboard Global", ruta: "/superadmin/dashboard", claves: "inicio resumen metricas" },
  { texto: "Empresas", ruta: "/superadmin/empresas", claves: "negocios clientes crear" },
  { texto: "Administradores", ruta: "/superadmin/administradores", claves: "dueños cuentas usuarios" },
  { texto: "Módulos", ruta: "/superadmin/modulos", claves: "catalogo funciones" },
  { texto: "Auditoría global", ruta: "/superadmin/auditoria", claves: "historial registro acciones" },
  { texto: "Notificaciones", ruta: "/superadmin/notificaciones", claves: "avisos mensajes alertas" },
  { texto: "Seguridad", ruta: "/superadmin/seguridad", claves: "politicas acceso" },
  { texto: "Mi seguridad", ruta: "/superadmin/mi-seguridad", claves: "contraseña cuenta" },
  { texto: "Respaldos", ruta: "/superadmin/respaldos", claves: "copia exportar backup" }
];

function normalizar(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function milisegundos(valor) {
  if (valor?.toMillis) return valor.toMillis();
  const fecha = new Date(valor).getTime();
  return Number.isNaN(fecha) ? 0 : fecha;
}

function BuscadorGlobal() {
  const navigate = useNavigate();
  const contenedor = useRef(null);
  const [texto, setTexto] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [indice, setIndice] = useState(0);
  const [empresas, setEmpresas] = useState(null);

  // Las empresas se cargan una sola vez, al primer uso del buscador.
  const cargarEmpresas = useCallback(async () => {
    if (empresas !== null) return;
    setEmpresas([]);
    try {
      const instantanea = await getDocs(collection(db, "empresas"));
      setEmpresas(instantanea.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("No se pudieron cargar las empresas para la búsqueda:", error);
    }
  }, [empresas]);

  useEffect(() => {
    if (!abierto) return undefined;

    const alPulsarFuera = (evento) => {
      if (!contenedor.current?.contains(evento.target)) setAbierto(false);
    };

    document.addEventListener("pointerdown", alPulsarFuera);
    return () => document.removeEventListener("pointerdown", alPulsarFuera);
  }, [abierto]);

  const resultados = useMemo(() => {
    const consulta = normalizar(texto.trim());
    if (!consulta) return [];

    const secciones = SECCIONES.filter((s) =>
      normalizar(`${s.texto} ${s.claves}`).includes(consulta)
    ).map((s) => ({ clave: s.ruta, titulo: s.texto, detalle: "Sección", ruta: s.ruta, tipo: "seccion" }));

    const lasEmpresas = (empresas || [])
      .filter((e) =>
        normalizar(`${e.nombreComercial} ${e.razonSocial} ${e.rubro} ${e.nit}`).includes(consulta)
      )
      .slice(0, 6)
      .map((e) => ({
        clave: `empresa-${e.id}`,
        titulo: e.nombreComercial || "Empresa sin nombre",
        detalle: e.rubro || "Empresa",
        ruta: `/superadmin/empresas/${e.id}/control`,
        tipo: "empresa"
      }));

    return [...secciones, ...lasEmpresas];
  }, [texto, empresas]);

  const ir = (resultado) => {
    if (!resultado) return;
    navigate(resultado.ruta);
    setTexto("");
    setAbierto(false);
  };

  const alTeclear = (evento) => {
    if (evento.key === "Escape") {
      setAbierto(false);
      return;
    }

    if (!resultados.length) return;

    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setAbierto(true);
      setIndice((previo) => (previo + 1) % resultados.length);
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setIndice((previo) => (previo - 1 + resultados.length) % resultados.length);
    } else if (evento.key === "Enter") {
      evento.preventDefault();
      ir(resultados[Math.min(indice, resultados.length - 1)]);
    }
  };

  const hayConsulta = texto.trim().length > 0;

  return (
    <div className="sa-search-wrap" ref={contenedor}>
      <div className="sa-search">
        <Search size={18} />

        <input
          type="text"
          role="combobox"
          aria-label="Buscar en la plataforma"
          aria-expanded={abierto && hayConsulta}
          aria-controls="sa-resultados-busqueda"
          aria-autocomplete="list"
          placeholder="Buscar en la plataforma..."
          value={texto}
          onChange={(evento) => {
            setTexto(evento.target.value);
            setIndice(0);
            setAbierto(true);
          }}
          onFocus={() => {
            setAbierto(true);
            cargarEmpresas();
          }}
          onKeyDown={alTeclear}
        />
      </div>

      {abierto && hayConsulta && (
        <ul className="sa-pop sa-resultados" id="sa-resultados-busqueda" role="listbox">
          {resultados.length === 0 ? (
            <li className="sa-pop__vacio">Sin resultados para «{texto.trim()}»</li>
          ) : (
            resultados.map((resultado, posicion) => (
              <li key={resultado.clave} role="option" aria-selected={posicion === indice}>
                <button
                  type="button"
                  className="sa-resultado"
                  data-activo={posicion === indice}
                  onMouseEnter={() => setIndice(posicion)}
                  onClick={() => ir(resultado)}
                >
                  <span className="sa-resultado__icono" aria-hidden="true">
                    {resultado.tipo === "empresa" ? <Building2 size={16} /> : <Search size={16} />}
                  </span>
                  <span className="sa-resultado__texto">
                    <strong>{resultado.titulo}</strong>
                    <small>{resultado.detalle}</small>
                  </span>
                  {posicion === indice && <CornerDownLeft size={14} aria-hidden="true" />}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

function CampanaAvisos() {
  const navigate = useNavigate();
  const contenedor = useRef(null);
  const [abierto, setAbierto] = useState(false);
  const [estado, setEstado] = useState("inicial");
  const [avisos, setAvisos] = useState([]);

  const cargar = useCallback(async () => {
    setEstado("cargando");
    try {
      const instantanea = await getDocs(collection(db, "notificacionesGlobales"));
      const filas = instantanea.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((fila) => fila.estado !== "INACTIVO" && fila.eliminado !== true)
        .sort(
          (a, b) =>
            milisegundos(b.fechaCreacion || b.fechaRegistro) -
            milisegundos(a.fechaCreacion || a.fechaRegistro)
        )
        .slice(0, 5);
      setAvisos(filas);
      setEstado("listo");
    } catch (error) {
      console.error("No se pudieron cargar las notificaciones:", error);
      setEstado("error");
    }
  }, []);

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

  const alternar = () => {
    const siguiente = !abierto;
    setAbierto(siguiente);
    if (siguiente) cargar();
  };

  return (
    <div className="sa-campana" ref={contenedor}>
      <button
        type="button"
        className="sa-icon-button"
        aria-label="Notificaciones"
        aria-haspopup="true"
        aria-expanded={abierto}
        title="Notificaciones"
        onClick={alternar}
      >
        <Bell size={20} />
      </button>

      {abierto && (
        <div className="sa-pop sa-avisos" role="dialog" aria-label="Últimas notificaciones">
          <header className="sa-avisos__titulo">Últimas notificaciones</header>

          {(estado === "cargando" || estado === "inicial") && (
            <p className="sa-pop__vacio">Cargando…</p>
          )}
          {estado === "error" && (
            <p className="sa-pop__vacio">No se pudieron cargar. Inténtalo de nuevo.</p>
          )}
          {estado === "listo" && avisos.length === 0 && (
            <p className="sa-pop__vacio">Todavía no hay notificaciones.</p>
          )}
          {estado === "listo" && avisos.length > 0 && (
            <ul>
              {avisos.map((aviso) => (
                <li className="sa-aviso" key={aviso.id}>
                  <strong>{aviso.titulo || "Sin título"}</strong>
                  {aviso.mensaje && <small>{aviso.mensaje}</small>}
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            className="sa-avisos__todas"
            onClick={() => {
              setAbierto(false);
              navigate("/superadmin/notificaciones");
            }}
          >
            Ver todas las notificaciones
          </button>
        </div>
      )}
    </div>
  );
}

function SuperAdminHeader({ menuAbierto = false, onAbrirMenu }) {
  const { usuario, cerrarSesion } = useAuth();

  return (
    <header className="sa-header">
      <div className="sa-header-left">
        <button
          type="button"
          className="sa-menu-button"
          onClick={onAbrirMenu}
          aria-label="Abrir menú"
          aria-expanded={menuAbierto}
          aria-controls="menu-lateral"
        >
          <Menu size={22} />
        </button>

        <BuscadorGlobal />
      </div>

      <div className="sa-header-right">
        <CampanaAvisos />

        <div className="sa-user">
          <div className="sa-avatar" aria-hidden="true">
            {(usuario?.nombreCompleto || "A").trim().charAt(0).toUpperCase()}
          </div>

          <div className="sa-user-info">
            <strong>{usuario?.nombreCompleto}</strong>
            <span>Super Administrador</span>
          </div>
        </div>

        <button className="sa-logout" onClick={cerrarSesion} aria-label="Salir">
          <LogOut size={16} aria-hidden="true" />
          <span>Salir</span>
        </button>
      </div>
    </header>
  );
}

export default SuperAdminHeader;
