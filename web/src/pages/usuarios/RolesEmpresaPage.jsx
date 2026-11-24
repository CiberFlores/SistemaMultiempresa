import { useEffect, useMemo, useRef, useState } from "react";
import mensajeError from "../../utils/mensajeError";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Pencil,
  Plus,
  Power,
  Search,
  ShieldCheck,
  Sparkles,
  X
} from "lucide-react";

import useAuth from "../../hooks/useAuth";
import useConfirmar from "../../hooks/useConfirmar";
import {
  PERMISOS_DISPONIBLES,
  actualizarRolEmpresa,
  cambiarEstadoRolEmpresa,
  crearRolEmpresa,
  suscribirRolesEmpresa
} from "../../services/rolEmpresaService";

import "../../styles/roles-empresa.css";

// Permisos agrupados por área para encontrarlos rápido
const GRUPOS = [
  { titulo: "Inicio", ids: ["dashboard.ver"] },
  { titulo: "Ventas", ids: ["ventas.registrar", "ventas.ver", "promociones.gestionar"] },
  {
    titulo: "Inventario y catálogo",
    ids: ["inventario.ver", "inventario.ajustar", "productos.gestionar", "categorias.gestionar", "marcas.gestionar"]
  },
  { titulo: "Compras", ids: ["proveedores.gestionar", "compras.gestionar"] },
  { titulo: "Dinero", ids: ["caja.gestionar", "finanzas.gestionar"] },
  { titulo: "Negocio", ids: ["configuracion.gestionar", "sucursales.ver"] },
  { titulo: "Análisis", ids: ["reportes.ver", "auditoria.ver", "notificaciones.ver"] }
];

// Combinaciones de uso común para empezar más rápido
const PLANTILLAS = [
  {
    nombre: "Vendedor",
    descripcion: "Cobra en el punto de venta y consulta las ventas.",
    permisos: ["dashboard.ver", "ventas.registrar", "ventas.ver"]
  },
  {
    nombre: "Cajero",
    descripcion: "Cobra y maneja la caja.",
    permisos: ["ventas.registrar", "ventas.ver", "caja.gestionar"]
  },
  {
    nombre: "Encargado de inventario",
    descripcion: "Controla productos, existencias y compras.",
    permisos: [
      "inventario.ver",
      "inventario.ajustar",
      "productos.gestionar",
      "categorias.gestionar",
      "marcas.gestionar",
      "proveedores.gestionar",
      "compras.gestionar"
    ]
  }
];

const MAX_NOMBRE = 40;
const MAX_DESCRIPCION = 120;

const porId = new Map(PERMISOS_DISPONIBLES.map((permiso) => [permiso.id, permiso]));

const formularioInicial = { nombre: "", descripcion: "", permisos: [] };

function normalizar(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// Nombre: letras, números, espacios y . - / &
function limpiarNombre(valor) {
  return String(valor ?? "")
    .replace(/[^\p{L}\p{N}\s.\-/&]/gu, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^\s+/, "")
    .slice(0, MAX_NOMBRE);
}

function limpiarDescripcion(valor) {
  return String(valor ?? "").replace(/\s{2,}/g, " ").replace(/^\s+/, "").slice(0, MAX_DESCRIPCION);
}

function RolesEmpresaPage() {
  const { usuario } = useAuth();
  const confirmar = useConfirmar();
  const primerCampo = useRef(null);

  const [roles, setRoles] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("TODOS");
  const [mostrarModal, setMostrarModal] = useState(false);
  const [rolEditando, setRolEditando] = useState(null);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    if (!usuario?.empresaId) {
      return undefined;
    }

    return suscribirRolesEmpresa(
      usuario.empresaId,
      (datos) => {
        setRoles(datos);
        setCargando(false);
      },
      (fallo) => {
        console.error(fallo);
        setCargando(false);
      }
    );
  }, [usuario?.empresaId]);

  // Escape cierra la ventana
  useEffect(() => {
    if (!mostrarModal) return undefined;

    const alTeclear = (evento) => {
      if (evento.key === "Escape" && !guardando) {
        setMostrarModal(false);
        setRolEditando(null);
      }
    };

    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [mostrarModal, guardando]);

  const abrirNuevo = () => {
    setRolEditando(null);
    setFormulario(formularioInicial);
    setError("");
    setMostrarModal(true);
  };

  const abrirEditar = (rol) => {
    setRolEditando(rol);
    setFormulario({
      nombre: rol.nombre || "",
      descripcion: rol.descripcion || "",
      permisos: (rol.permisos || []).filter((id) => porId.has(id))
    });
    setError("");
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    if (guardando) return;
    setMostrarModal(false);
    setRolEditando(null);
    setError("");
  };

  const alternarPermiso = (id) => {
    setFormulario((anterior) => ({
      ...anterior,
      permisos: anterior.permisos.includes(id)
        ? anterior.permisos.filter((actual) => actual !== id)
        : [...anterior.permisos, id]
    }));
  };

  const alternarGrupo = (ids) => {
    setFormulario((anterior) => {
      const todos = ids.every((id) => anterior.permisos.includes(id));

      return {
        ...anterior,
        permisos: todos
          ? anterior.permisos.filter((id) => !ids.includes(id))
          : [...new Set([...anterior.permisos, ...ids])]
      };
    });
  };

  const aplicarPlantilla = (plantilla) => {
    setFormulario((anterior) => ({
      nombre: anterior.nombre.trim() ? anterior.nombre : plantilla.nombre,
      descripcion: anterior.descripcion.trim() ? anterior.descripcion : plantilla.descripcion,
      permisos: [...plantilla.permisos]
    }));
  };

  // Validación del formulario
  const nombreLimpio = formulario.nombre.trim();
  const repetido = roles.some(
    (rol) =>
      rol.id !== rolEditando?.id &&
      normalizar(rol.nombre) === normalizar(nombreLimpio)
  );

  let errorNombre = "";
  if (!nombreLimpio) errorNombre = "Escribe un nombre para el rol.";
  else if (nombreLimpio.length < 3) errorNombre = "El nombre necesita al menos 3 caracteres.";
  else if (repetido) errorNombre = "Ya existe un rol con ese nombre.";

  const errorPermisos = formulario.permisos.length === 0 ? "Elige al menos un permiso." : "";
  const formularioValido = !errorNombre && !errorPermisos;

  const guardarRol = async (evento) => {
    evento.preventDefault();

    if (!formularioValido) {
      setError(errorNombre || errorPermisos);
      return;
    }

    try {
      setGuardando(true);
      setError("");

      const datos = { ...formulario, nombre: nombreLimpio, descripcion: formulario.descripcion.trim() };

      if (rolEditando) {
        await actualizarRolEmpresa(rolEditando.id, datos);
        setAviso(`Rol «${nombreLimpio}» actualizado.`);
      } else {
        await crearRolEmpresa(usuario.empresaId, datos);
        setAviso(`Rol «${nombreLimpio}» creado.`);
      }

      setMostrarModal(false);
      setRolEditando(null);
      setFormulario(formularioInicial);
    } catch (fallo) {
      console.error(fallo);
      setError(mensajeError(fallo, "No se pudo guardar el rol."));
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (rol) => {
    const estado = rol.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO";
    const desactivar = estado === "INACTIVO";

    const confirmado = await confirmar({
      titulo: desactivar ? "Desactivar rol" : "Activar rol",
      mensaje: desactivar
        ? `Los trabajadores con el rol «${rol.nombre}» perderán sus permisos hasta que lo actives otra vez.`
        : `Los trabajadores con el rol «${rol.nombre}» recuperarán sus permisos.`,
      accion: desactivar ? "Desactivar" : "Activar",
      peligro: desactivar
    });

    if (!confirmado) return;

    try {
      await cambiarEstadoRolEmpresa(rol.id, estado);
      setAviso(`Rol «${rol.nombre}» ${desactivar ? "desactivado" : "activado"}.`);
    } catch (fallo) {
      console.error(fallo);
      setAviso("");
      setError("No se pudo cambiar el estado del rol.");
    }
  };

  useEffect(() => {
    if (!aviso) return undefined;
    const temporizador = setTimeout(() => setAviso(""), 4000);
    return () => clearTimeout(temporizador);
  }, [aviso]);

  const filtrados = useMemo(() => {
    const texto = normalizar(busqueda);

    return roles.filter((rol) => {
      const coincide =
        !texto ||
        normalizar(rol.nombre).includes(texto) ||
        normalizar(rol.descripcion).includes(texto);

      const estadoOk = filtro === "TODOS" || rol.estado === filtro;

      return coincide && estadoOk;
    });
  }, [roles, busqueda, filtro]);

  const total = PERMISOS_DISPONIBLES.length;

  return (
    <div className="re">
      <header className="re-cabecera">
        <div>
          <h1>Roles y permisos</h1>
          <p>Decide qué puede hacer cada trabajador en el sistema.</p>
        </div>

        <button type="button" className="re-boton" onClick={abrirNuevo}>
          <Plus size={19} />
          Nuevo rol
        </button>
      </header>

      {aviso && (
        <div className="re-aviso re-aviso--ok" role="status">
          <Check size={18} />
          {aviso}
        </div>
      )}

      {error && !mostrarModal && (
        <div className="re-aviso re-aviso--error" role="alert">
          {error}
        </div>
      )}

      <div className="re-herramientas">
        <label className="re-busqueda">
          <Search size={19} aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar rol…"
            aria-label="Buscar rol"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </label>

        <div className="re-filtros" role="radiogroup" aria-label="Estado">
          {[
            ["TODOS", "Todos"],
            ["ACTIVO", "Activos"],
            ["INACTIVO", "Inactivos"]
          ].map(([valor, texto]) => (
            <button
              key={valor}
              type="button"
              role="radio"
              aria-checked={filtro === valor}
              className="re-chip"
              data-activo={filtro === valor}
              onClick={() => setFiltro(valor)}
            >
              {texto}
            </button>
          ))}
        </div>

        <span className="re-contador">
          {filtrados.length} {filtrados.length === 1 ? "rol" : "roles"}
        </span>
      </div>

      {cargando ? (
        <div className="re-vacio">Cargando roles…</div>
      ) : filtrados.length === 0 ? (
        <div className="re-vacio">
          <ShieldCheck size={36} />
          <strong>{roles.length === 0 ? "Todavía no hay roles" : "No encontramos roles"}</strong>
          <span>
            {roles.length === 0
              ? "Crea el primero para asignar permisos a tus trabajadores."
              : "Prueba con otra búsqueda o cambia el filtro."}
          </span>
          {roles.length === 0 && (
            <button type="button" className="re-boton" onClick={abrirNuevo}>
              <Plus size={18} /> Crear un rol
            </button>
          )}
        </div>
      ) : (
        <ul className="re-lista">
          {filtrados.map((rol) => {
            const permisos = (rol.permisos || []).filter((id) => porId.has(id));
            const porcentaje = Math.round((permisos.length / total) * 100);
            const areas = GRUPOS.filter((grupo) => grupo.ids.some((id) => permisos.includes(id)));

            return (
              <li key={rol.id} className="re-rol" data-inactivo={rol.estado !== "ACTIVO"}>
                <div className="re-rol__cabecera">
                  <span className="re-rol__icono" aria-hidden="true">
                    <ShieldCheck size={22} />
                  </span>
                  <div className="re-rol__titulo">
                    <h2>{rol.nombre}</h2>
                    <p>{rol.descripcion || "Sin descripción"}</p>
                  </div>
                </div>

                <div className="re-rol__medidor">
                  <div className="re-rol__medidor-texto">
                    <strong>
                      {permisos.length} de {total}
                    </strong>
                    <span>permisos</span>
                    <span className="re-estado" data-estado={rol.estado}>
                      {rol.estado === "ACTIVO" ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                  <div className="re-barra" aria-hidden="true">
                    <span style={{ width: `${porcentaje}%` }} />
                  </div>
                </div>

                <div className="re-rol__areas">
                  {areas.length === 0 ? (
                    <span className="re-etiqueta re-etiqueta--vacia">Sin permisos</span>
                  ) : (
                    areas.map((grupo) => (
                      <span className="re-etiqueta" key={grupo.titulo}>
                        {grupo.titulo}
                      </span>
                    ))
                  )}
                </div>

                <div className="re-rol__acciones">
                  <button type="button" className="re-boton re-boton--suave" onClick={() => abrirEditar(rol)}>
                    <Pencil size={16} />
                    Editar
                  </button>
                  <button
                    type="button"
                    className="re-boton re-boton--suave re-boton--icono"
                    onClick={() => cambiarEstado(rol)}
                    title={rol.estado === "ACTIVO" ? "Desactivar rol" : "Activar rol"}
                    aria-label={rol.estado === "ACTIVO" ? `Desactivar ${rol.nombre}` : `Activar ${rol.nombre}`}
                  >
                    <Power size={17} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AnimatePresence>
        {mostrarModal && (
          <motion.div
            className="re-fondo"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={cerrarModal}
          >
            <motion.form
              className="re-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="re-modal-titulo"
              initial={{ opacity: 0, scale: 0.96, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              onMouseDown={(e) => e.stopPropagation()}
              onSubmit={guardarRol}
              noValidate
            >
              <header className="re-modal__cabecera">
                <div>
                  <h2 id="re-modal-titulo">{rolEditando ? "Editar rol" : "Nuevo rol"}</h2>
                  <p>Elige qué podrán hacer los trabajadores con este rol.</p>
                </div>
                <button type="button" className="re-cerrar" onClick={cerrarModal} aria-label="Cerrar" disabled={guardando}>
                  <X size={18} />
                </button>
              </header>

              <div className="re-modal__cuerpo">
                {!rolEditando && (
                  <div className="re-plantillas">
                    <span className="re-etiqueta-campo">
                      <Sparkles size={15} /> Empezar con una plantilla
                    </span>
                    <div className="re-plantillas__lista">
                      {PLANTILLAS.map((plantilla) => (
                        <button
                          key={plantilla.nombre}
                          type="button"
                          className="re-chip"
                          onClick={() => aplicarPlantilla(plantilla)}
                        >
                          {plantilla.nombre}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="re-campos">
                  <label className="re-campo">
                    <span className="re-etiqueta-campo">
                      Nombre del rol <b>*</b>
                    </span>
                    <input
                      ref={primerCampo}
                      value={formulario.nombre}
                      onChange={(e) => setFormulario({ ...formulario, nombre: limpiarNombre(e.target.value) })}
                      placeholder="Ej. Vendedor de tarde"
                      maxLength={MAX_NOMBRE}
                      autoComplete="off"
                      autoFocus
                      aria-invalid={Boolean(formulario.nombre) && Boolean(errorNombre)}
                      disabled={guardando}
                    />
                    <small className="re-ayuda" data-error={Boolean(formulario.nombre) && Boolean(errorNombre)}>
                      {formulario.nombre && errorNombre ? errorNombre : `${formulario.nombre.length}/${MAX_NOMBRE}`}
                    </small>
                  </label>

                  <label className="re-campo">
                    <span className="re-etiqueta-campo">Descripción (opcional)</span>
                    <input
                      value={formulario.descripcion}
                      onChange={(e) => setFormulario({ ...formulario, descripcion: limpiarDescripcion(e.target.value) })}
                      placeholder="Para qué sirve este rol"
                      maxLength={MAX_DESCRIPCION}
                      autoComplete="off"
                      disabled={guardando}
                    />
                    <small className="re-ayuda">
                      {formulario.descripcion.length}/{MAX_DESCRIPCION}
                    </small>
                  </label>
                </div>

                <div className="re-permisos">
                  <div className="re-permisos__cabecera">
                    <div>
                      <span className="re-etiqueta-campo">
                        Permisos <b>*</b>
                      </span>
                      <small className="re-ayuda" data-error={Boolean(errorPermisos)}>
                        {formulario.permisos.length} de {total} seleccionados
                      </small>
                    </div>
                    <div className="re-permisos__atajos">
                      <button
                        type="button"
                        className="re-chip"
                        onClick={() => setFormulario({ ...formulario, permisos: PERMISOS_DISPONIBLES.map((p) => p.id) })}
                        disabled={guardando}
                      >
                        Todos
                      </button>
                      <button
                        type="button"
                        className="re-chip"
                        onClick={() => setFormulario({ ...formulario, permisos: [] })}
                        disabled={guardando}
                      >
                        Ninguno
                      </button>
                    </div>
                  </div>

                  {GRUPOS.map((grupo) => {
                    const completos = grupo.ids.every((id) => formulario.permisos.includes(id));
                    const marcados = grupo.ids.filter((id) => formulario.permisos.includes(id)).length;

                    return (
                      <fieldset className="re-grupo" key={grupo.titulo}>
                        <legend>
                          <span>{grupo.titulo}</span>
                          <button
                            type="button"
                            className="re-grupo__todo"
                            onClick={() => alternarGrupo(grupo.ids)}
                            disabled={guardando}
                          >
                            {completos ? "Quitar todos" : `Marcar todos (${marcados}/${grupo.ids.length})`}
                          </button>
                        </legend>

                        <div className="re-grupo__opciones">
                          {grupo.ids.map((id) => {
                            const permiso = porId.get(id);
                            if (!permiso) return null;
                            const activo = formulario.permisos.includes(id);

                            return (
                              <label className="re-permiso" data-activo={activo} key={id}>
                                <input
                                  type="checkbox"
                                  checked={activo}
                                  onChange={() => alternarPermiso(id)}
                                  disabled={guardando}
                                />
                                <span className="re-permiso__marca" aria-hidden="true">
                                  {activo && <Check size={14} strokeWidth={3} />}
                                </span>
                                <span className="re-permiso__nombre">{permiso.nombre}</span>
                              </label>
                            );
                          })}
                        </div>
                      </fieldset>
                    );
                  })}
                </div>

                {error && (
                  <div className="re-aviso re-aviso--error" role="alert">
                    {error}
                  </div>
                )}
              </div>

              <footer className="re-modal__pie">
                <button type="button" className="re-boton re-boton--suave" onClick={cerrarModal} disabled={guardando}>
                  Cancelar
                </button>
                <button type="submit" className="re-boton" disabled={guardando || !formularioValido}>
                  {guardando ? "Guardando…" : rolEditando ? "Guardar cambios" : "Crear rol"}
                </button>
              </footer>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default RolesEmpresaPage;
