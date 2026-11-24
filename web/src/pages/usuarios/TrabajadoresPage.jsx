import { useEffect, useMemo, useState } from "react";
import mensajeError from "../../utils/mensajeError";
import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeCheck,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Pencil,
  Phone,
  Plus,
  Power,
  Search,
  Store,
  UserRound,
  Users,
  X
} from "lucide-react";

import useAuth from "../../hooks/useAuth";
import useConfirmar from "../../hooks/useConfirmar";
import {
  actualizarTrabajador,
  cambiarEstadoTrabajador,
  suscribirTrabajadores
} from "../../services/trabajadorService";
import { suscribirRolesEmpresa } from "../../services/rolEmpresaService";
import { suscribirSucursales } from "../../services/sucursalService";
import { provisionarUsuario } from "../../services/userProvisionService";
import PasswordStrength from "../../components/common/PasswordStrength";
import { validarPassword } from "../../utils/password";
import { sonidoExito } from "../../utils/sonidos";

import "../../styles/roles-empresa.css";
import "../../styles/trabajadores-empresa.css";

const formularioInicial = {
  nombreCompleto: "",
  correo: "",
  telefono: "",
  rolId: "",
  sucursales: [],
  password: ""
};

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function normalizar(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// Nombre: solo letras, espacios, punto, apóstrofo y guion
function limpiarNombre(valor) {
  return String(valor ?? "")
    .replace(/[^\p{L}\s.'-]/gu, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^\s+/, "")
    .slice(0, 60);
}

function capitalizarNombre(valor) {
  return String(valor ?? "")
    .trim()
    .toLocaleLowerCase("es")
    .replace(/(^|[\s'-])(\p{L})/gu, (_, antes, letra) => antes + letra.toLocaleUpperCase("es"));
}

// Teléfono: solo números, hasta 12
function limpiarTelefono(valor) {
  return String(valor ?? "").replace(/\D/g, "").slice(0, 12);
}

function iniciales(nombre) {
  const partes = String(nombre || "?").trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] || "?") + (partes[1]?.[0] || "")).toUpperCase();
}

// Contraseña aleatoria que cumple todas las reglas de seguridad
function generarPassword() {
  const mayus = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const minus = "abcdefghijkmnopqrstuvwxyz";
  const numeros = "23456789";
  const especiales = "!@#$%&*?";
  const todo = mayus + minus + numeros + especiales;

  const azar = (cuantos) => {
    const bytes = new Uint32Array(cuantos);
    crypto.getRandomValues(bytes);
    return Array.from(bytes);
  };

  const elegir = (conjunto, numero) => conjunto[numero % conjunto.length];
  const semillas = azar(16);

  const caracteres = [
    elegir(mayus, semillas[0]),
    elegir(minus, semillas[1]),
    elegir(numeros, semillas[2]),
    elegir(especiales, semillas[3]),
    ...semillas.slice(4).map((numero) => elegir(todo, numero))
  ];

  // Mezcla
  const orden = azar(caracteres.length);
  return caracteres
    .map((caracter, indice) => ({ caracter, clave: orden[indice] }))
    .sort((a, b) => a.clave - b.clave)
    .map((item) => item.caracter)
    .join("");
}

export default function TrabajadoresPage() {
  const { usuario } = useAuth();
  const confirmar = useConfirmar();

  const [rows, setRows] = useState([]);
  const [roles, setRoles] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState("TODOS");
  const [rolFiltro, setRolFiltro] = useState("TODOS");
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(formularioInicial);
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [tocado, setTocado] = useState({});

  useEffect(() => {
    if (!usuario?.empresaId) return undefined;

    const a = suscribirTrabajadores(
      usuario.empresaId,
      (datos) => {
        setRows(datos);
        setCargando(false);
      },
      console.error
    );
    const b = suscribirRolesEmpresa(usuario.empresaId, setRoles, console.error);
    const c = suscribirSucursales(usuario.empresaId, setSucursales, console.error);

    return () => {
      a?.();
      b?.();
      c?.();
    };
  }, [usuario?.empresaId]);

  useEffect(() => {
    if (!abierto) return undefined;

    const alTeclear = (evento) => {
      if (evento.key === "Escape" && !guardando) setAbierto(false);
    };

    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [abierto, guardando]);

  useEffect(() => {
    if (!aviso) return undefined;
    const temporizador = setTimeout(() => setAviso(""), 4500);
    return () => clearTimeout(temporizador);
  }, [aviso]);

  const nombreRol = (id) => roles.find((rol) => rol.id === id)?.nombre || "Sin rol";
  const nombresSucursales = (ids = []) =>
    (Array.isArray(ids) ? ids : [])
      .map((id) => sucursales.find((s) => s.id === id)?.nombre)
      .filter(Boolean);

  const filtrados = useMemo(() => {
    const texto = normalizar(busqueda);

    return rows.filter((fila) => {
      const coincide =
        !texto ||
        [
          fila.nombreCompleto,
          fila.correo,
          fila.telefono,
          roles.find((rol) => rol.id === fila.rolId)?.nombre,
          (Array.isArray(fila.sucursales) ? fila.sucursales : [])
            .map((id) => sucursales.find((s) => s.id === id)?.nombre)
            .join(" ")
        ].some((valor) => normalizar(valor).includes(texto));

      const estadoOk =
        estado === "TODOS" || (estado === "ACTIVO" ? fila.estado === true : fila.estado !== true);
      const rolOk = rolFiltro === "TODOS" || fila.rolId === rolFiltro;

      return coincide && estadoOk && rolOk;
    });
  }, [rows, busqueda, estado, rolFiltro, roles, sucursales]);

  const activos = rows.filter((fila) => fila.estado === true).length;
  const verificados = rows.filter((fila) => fila.correoVerificado === true).length;

  const abrirNuevo = () => {
    setEditando(null);
    setForm(formularioInicial);
    setError("");
    setTocado({});
    setVerPassword(false);
    setAbierto(true);
  };

  const abrirEditar = (fila) => {
    setEditando(fila);
    setForm({
      nombreCompleto: fila.nombreCompleto || "",
      correo: fila.correo || "",
      telefono: limpiarTelefono(fila.telefono || ""),
      rolId: fila.rolId || "",
      sucursales: Array.isArray(fila.sucursales) ? fila.sucursales : [],
      password: ""
    });
    setError("");
    setTocado({});
    setAbierto(true);
  };

  const cerrar = () => {
    if (guardando) return;
    setAbierto(false);
  };

  const alternarSucursal = (id) => {
    setForm((actual) => ({
      ...actual,
      sucursales: actual.sucursales.includes(id)
        ? actual.sucursales.filter((item) => item !== id)
        : [...actual.sucursales, id]
    }));
  };

  // Validación
  const nombreLimpio = form.nombreCompleto.trim();
  const correoLimpio = form.correo.trim().toLowerCase();

  let errorNombre = "";
  if (!nombreLimpio) errorNombre = "Escribe el nombre completo.";
  else if (nombreLimpio.length < 3) errorNombre = "El nombre necesita al menos 3 letras.";

  let errorCorreo = "";
  if (!correoLimpio) errorCorreo = "Escribe el correo.";
  else if (!REGEX_CORREO.test(correoLimpio)) errorCorreo = "El correo no tiene un formato válido.";
  else if (
    !editando &&
    rows.some((fila) => String(fila.correo || "").toLowerCase() === correoLimpio)
  ) {
    errorCorreo = "Ya existe un trabajador con ese correo.";
  }

  const errorTelefono =
    form.telefono && form.telefono.length < 7 ? "El teléfono tiene entre 7 y 12 números." : "";

  const errorPassword =
    !editando && !validarPassword(form.password).valid
      ? "La contraseña debe cumplir todos los requisitos."
      : "";

  const valido = !errorNombre && !errorCorreo && !errorTelefono && !errorPassword;

  const marcar = (campo) => setTocado((previo) => ({ ...previo, [campo]: true }));

  const guardar = async (evento) => {
    evento.preventDefault();
    setTocado({ nombreCompleto: true, correo: true, telefono: true, password: true });

    if (!valido) {
      setError(errorNombre || errorCorreo || errorTelefono || errorPassword);
      return;
    }

    try {
      setGuardando(true);
      setError("");

      const datos = { ...form, nombreCompleto: nombreLimpio, correo: correoLimpio };

      if (editando) {
        await actualizarTrabajador(editando.id, datos);
        setAviso(`Datos de ${nombreLimpio} actualizados.`);
      } else {
        const { correoEnviado } = await provisionarUsuario({
          ...datos,
          empresaId: usuario.empresaId,
          tipoUsuario: "TRABAJADOR"
        });
        setAviso(
          correoEnviado
            ? `Cuenta de ${nombreLimpio} creada. Le llegó un correo para verificarla.`
            : `Cuenta de ${nombreLimpio} creada. El correo de verificación no salió; se enviará cuando intente entrar.`
        );
      }

      sonidoExito();
      setAbierto(false);
      setForm(formularioInicial);
    } catch (fallo) {
      console.error(fallo);
      const mensaje = String(fallo?.code || mensajeError(fallo, ""));
      setError(
        mensaje.includes("email-already-in-use")
          ? "Ese correo ya tiene una cuenta en el sistema."
          : mensajeError(fallo, "No se pudo guardar.")
      );
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (fila) => {
    const activar = fila.estado !== true;

    const confirmado = await confirmar({
      titulo: activar ? "Activar trabajador" : "Desactivar trabajador",
      mensaje: activar
        ? `${fila.nombreCompleto} volverá a poder entrar al sistema.`
        : `${fila.nombreCompleto} no podrá entrar al sistema hasta que lo actives otra vez.`,
      accion: activar ? "Activar" : "Desactivar",
      peligro: !activar
    });

    if (!confirmado) return;

    try {
      await cambiarEstadoTrabajador(fila.id, activar);
      setAviso(`${fila.nombreCompleto} ${activar ? "activado" : "desactivado"}.`);
    } catch (fallo) {
      console.error(fallo);
      setError("No se pudo cambiar el estado del trabajador.");
    }
  };

  const metricas = [
    { titulo: "Trabajadores", valor: rows.length, nota: "en tu empresa", icono: Users },
    { titulo: "Activos", valor: activos, nota: "pueden entrar", icono: BadgeCheck },
    { titulo: "Correo verificado", valor: verificados, nota: "cuentas confirmadas", icono: Mail }
  ];

  const rolesActivos = roles.filter((rol) => rol.estado === "ACTIVO");

  return (
    <div className="re tr">
      <header className="re-cabecera">
        <div>
          <h1>Trabajadores</h1>
          <p>Crea las cuentas de tu equipo y asígnales un rol y sus sucursales.</p>
        </div>

        <button type="button" className="re-boton" onClick={abrirNuevo}>
          <Plus size={19} />
          Nuevo trabajador
        </button>
      </header>

      {aviso && (
        <div className="re-aviso re-aviso--ok" role="status">
          <Check size={18} />
          {aviso}
        </div>
      )}

      {error && !abierto && (
        <div className="re-aviso re-aviso--error" role="alert">
          {error}
        </div>
      )}

      <section className="tr-metricas" aria-label="Resumen">
        {metricas.map(({ titulo, valor, nota, icono: Icono }) => (
          <article className="tr-metrica" key={titulo}>
            <span className="tr-metrica__icono" aria-hidden="true">
              <Icono size={22} />
            </span>
            <div>
              <small>{titulo}</small>
              <strong>{valor}</strong>
              <em>{nota}</em>
            </div>
          </article>
        ))}
      </section>

      <div className="re-herramientas">
        <label className="re-busqueda">
          <Search size={19} aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar por nombre, correo, rol o sucursal…"
            aria-label="Buscar trabajador"
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
              aria-checked={estado === valor}
              className="re-chip"
              data-activo={estado === valor}
              onClick={() => setEstado(valor)}
            >
              {texto}
            </button>
          ))}
        </div>

        <label className="tr-selector">
          <select value={rolFiltro} onChange={(e) => setRolFiltro(e.target.value)} aria-label="Filtrar por rol">
            <option value="TODOS">Todos los roles</option>
            {roles.map((rol) => (
              <option key={rol.id} value={rol.id}>
                {rol.nombre}
              </option>
            ))}
          </select>
          <ChevronDown size={17} aria-hidden="true" />
        </label>

        <span className="re-contador">
          {filtrados.length} {filtrados.length === 1 ? "trabajador" : "trabajadores"}
        </span>
      </div>

      {cargando ? (
        <div className="re-vacio">Cargando trabajadores…</div>
      ) : filtrados.length === 0 ? (
        <div className="re-vacio">
          <UserRound size={36} />
          <strong>{rows.length === 0 ? "Todavía no tienes trabajadores" : "No encontramos trabajadores"}</strong>
          <span>
            {rows.length === 0
              ? "Crea la primera cuenta para que tu equipo pueda entrar al sistema."
              : "Prueba con otra búsqueda o cambia los filtros."}
          </span>
          {rows.length === 0 && (
            <button type="button" className="re-boton" onClick={abrirNuevo}>
              <Plus size={18} /> Crear un trabajador
            </button>
          )}
        </div>
      ) : (
        <ul className="re-lista tr-lista">
          {filtrados.map((fila) => {
            const lugares = nombresSucursales(fila.sucursales);

            return (
              <li key={fila.id} className="re-rol tr-tarjeta" data-inactivo={fila.estado !== true}>
                <div className="tr-tarjeta__cabecera">
                  <span className="tr-avatar" aria-hidden="true">
                    {iniciales(fila.nombreCompleto)}
                  </span>
                  <div className="tr-tarjeta__titulo">
                    <h2>{fila.nombreCompleto}</h2>
                    <span className="tr-rol">{nombreRol(fila.rolId)}</span>
                  </div>
                </div>

                <dl className="tr-datos">
                  <div>
                    <dt>
                      <Mail size={15} aria-hidden="true" />
                      <span className="tr-oculto">Correo</span>
                    </dt>
                    <dd>{fila.correo}</dd>
                  </div>
                  <div>
                    <dt>
                      <Phone size={15} aria-hidden="true" />
                      <span className="tr-oculto">Teléfono</span>
                    </dt>
                    <dd>{fila.telefono || "Sin teléfono"}</dd>
                  </div>
                  <div>
                    <dt>
                      <Store size={15} aria-hidden="true" />
                      <span className="tr-oculto">Sucursales</span>
                    </dt>
                    <dd>{lugares.length ? lugares.join(", ") : "Sin sucursal"}</dd>
                  </div>
                </dl>

                <div className="tr-estados">
                  <span className="re-estado" data-estado={fila.estado === true ? "ACTIVO" : "INACTIVO"}>
                    {fila.estado === true ? "Activo" : "Inactivo"}
                  </span>
                  <span className="tr-verificacion" data-verificado={Boolean(fila.correoVerificado)}>
                    {fila.correoVerificado ? "Correo verificado" : "Correo pendiente"}
                  </span>
                </div>

                <div className="re-rol__acciones">
                  <button type="button" className="re-boton re-boton--suave" onClick={() => abrirEditar(fila)}>
                    <Pencil size={16} />
                    Editar
                  </button>
                  <button
                    type="button"
                    className="re-boton re-boton--suave re-boton--icono"
                    onClick={() => cambiarEstado(fila)}
                    title={fila.estado === true ? "Desactivar" : "Activar"}
                    aria-label={
                      fila.estado === true
                        ? `Desactivar a ${fila.nombreCompleto}`
                        : `Activar a ${fila.nombreCompleto}`
                    }
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
        {abierto && (
          <motion.div
            className="re-fondo"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={cerrar}
          >
            <motion.form
              className="re-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="tr-modal-titulo"
              initial={{ opacity: 0, scale: 0.96, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              onMouseDown={(e) => e.stopPropagation()}
              onSubmit={guardar}
              noValidate
              autoComplete="off"
            >
              <header className="re-modal__cabecera">
                <div>
                  <h2 id="tr-modal-titulo">{editando ? "Editar trabajador" : "Nuevo trabajador"}</h2>
                  <p>
                    {editando
                      ? "Cambia sus datos, su rol o sus sucursales."
                      : "Se crea su cuenta y le llega un correo para verificarla."}
                  </p>
                </div>
                <button type="button" className="re-cerrar" onClick={cerrar} aria-label="Cerrar" disabled={guardando}>
                  <X size={18} />
                </button>
              </header>

              <div className="re-modal__cuerpo">
                <div className="re-campos">
                  <label className="re-campo">
                    <span className="re-etiqueta-campo">
                      Nombre completo <b>*</b>
                    </span>
                    <input
                      name="trabajador-nombre"
                      value={form.nombreCompleto}
                      onChange={(e) => setForm({ ...form, nombreCompleto: limpiarNombre(e.target.value) })}
                      onBlur={() => {
                        marcar("nombreCompleto");
                        setForm((f) => ({ ...f, nombreCompleto: capitalizarNombre(f.nombreCompleto) }));
                      }}
                      placeholder="Ej. Ana María Rojas"
                      maxLength={60}
                      autoComplete="off"
                      autoFocus
                      aria-invalid={Boolean(tocado.nombreCompleto && errorNombre)}
                      disabled={guardando}
                    />
                    <small className="re-ayuda" data-error={Boolean(tocado.nombreCompleto && errorNombre)}>
                      {tocado.nombreCompleto && errorNombre ? errorNombre : "Solo letras y espacios."}
                    </small>
                  </label>

                  <label className="re-campo">
                    <span className="re-etiqueta-campo">
                      Correo <b>*</b>
                    </span>
                    <input
                      name="trabajador-correo"
                      type="email"
                      value={form.correo}
                      onChange={(e) => setForm({ ...form, correo: e.target.value.replace(/\s/g, "").slice(0, 80) })}
                      onBlur={() => marcar("correo")}
                      placeholder="nombre@correo.com"
                      autoComplete="off"
                      inputMode="email"
                      readOnly={Boolean(editando)}
                      aria-invalid={Boolean(tocado.correo && errorCorreo)}
                      disabled={guardando}
                    />
                    <small className="re-ayuda" data-error={Boolean(tocado.correo && errorCorreo)}>
                      {tocado.correo && errorCorreo
                        ? errorCorreo
                        : editando
                          ? "El correo no se puede cambiar."
                          : "Aquí recibirá el enlace de verificación."}
                    </small>
                  </label>

                  <label className="re-campo">
                    <span className="re-etiqueta-campo">Teléfono (opcional)</span>
                    <input
                      name="trabajador-telefono"
                      value={form.telefono}
                      onChange={(e) => setForm({ ...form, telefono: limpiarTelefono(e.target.value) })}
                      onBlur={() => marcar("telefono")}
                      placeholder="Solo números"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={12}
                      autoComplete="off"
                      aria-invalid={Boolean(tocado.telefono && errorTelefono)}
                      disabled={guardando}
                    />
                    <small className="re-ayuda" data-error={Boolean(tocado.telefono && errorTelefono)}>
                      {tocado.telefono && errorTelefono ? errorTelefono : "Entre 7 y 12 números."}
                    </small>
                  </label>

                  <label className="re-campo">
                    <span className="re-etiqueta-campo">Rol</span>
                    <span className="tr-selector tr-selector--formulario">
                      <select
                        name="trabajador-rol"
                        value={form.rolId}
                        onChange={(e) => setForm({ ...form, rolId: e.target.value })}
                        disabled={guardando}
                      >
                        <option value="">Sin rol (no podrá hacer nada)</option>
                        {rolesActivos.map((rol) => (
                          <option key={rol.id} value={rol.id}>
                            {rol.nombre}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={17} aria-hidden="true" />
                    </span>
                    <small className="re-ayuda">Define sus permisos. Se crean en «Roles y permisos».</small>
                  </label>
                </div>

                <fieldset className="re-grupo">
                  <legend>
                    <span>Sucursales asignadas</span>
                    <span className="re-ayuda">
                      {form.sucursales.length} de {sucursales.length}
                    </span>
                  </legend>

                  {sucursales.length === 0 ? (
                    <p className="re-ayuda">Todavía no hay sucursales. Créalas en «Sucursales».</p>
                  ) : (
                    <div className="re-grupo__opciones">
                      {sucursales.map((sucursal) => {
                        const activa = form.sucursales.includes(sucursal.id);

                        return (
                          <label className="re-permiso" data-activo={activa} key={sucursal.id}>
                            <input
                              type="checkbox"
                              checked={activa}
                              onChange={() => alternarSucursal(sucursal.id)}
                              disabled={guardando}
                            />
                            <span className="re-permiso__marca" aria-hidden="true">
                              {activa && <Check size={14} strokeWidth={3} />}
                            </span>
                            <span className="re-permiso__nombre">
                              {sucursal.nombre}
                              {sucursal.direccion && <small className="tr-sub">{sucursal.direccion}</small>}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </fieldset>

                {!editando && (
                  <div className="tr-clave">
                    <label className="re-campo">
                      <span className="re-etiqueta-campo">
                        Contraseña temporal <b>*</b>
                      </span>
                      <span className="tr-clave__campo">
                        <KeyRound size={18} aria-hidden="true" />
                        <input
                          name="trabajador-clave-temporal"
                          type={verPassword ? "text" : "password"}
                          value={form.password}
                          onChange={(e) => setForm({ ...form, password: e.target.value.replace(/\s/g, "").slice(0, 64) })}
                          onBlur={() => marcar("password")}
                          autoComplete="new-password"
                          placeholder="Escríbela o genera una"
                          aria-invalid={Boolean(tocado.password && errorPassword)}
                          disabled={guardando}
                        />
                        <button
                          type="button"
                          className="tr-clave__ojo"
                          onClick={() => setVerPassword((visible) => !visible)}
                          aria-label={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        >
                          {verPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </span>
                    </label>

                    <button
                      type="button"
                      className="re-boton re-boton--suave"
                      onClick={() => {
                        setForm((f) => ({ ...f, password: generarPassword() }));
                        setVerPassword(true);
                      }}
                      disabled={guardando}
                    >
                      <KeyRound size={17} />
                      Generar contraseña segura
                    </button>

                    <PasswordStrength value={form.password} />
                  </div>
                )}

                {error && (
                  <div className="re-aviso re-aviso--error" role="alert">
                    {error}
                  </div>
                )}
              </div>

              <footer className="re-modal__pie">
                <button type="button" className="re-boton re-boton--suave" onClick={cerrar} disabled={guardando}>
                  Cancelar
                </button>
                <button type="submit" className="re-boton" disabled={guardando}>
                  {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Crear trabajador"}
                </button>
              </footer>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
