import { useEffect, useMemo, useState } from "react";
import mensajeError from "../../utils/mensajeError";

import { AnimatePresence, motion } from "framer-motion";

import {
  AlertTriangle,
  Barcode,
  CalendarDays,
  Camera,
  CheckCircle2,
  Image as ImageIcon,
  Eye,
  Info,
  Package,
  Pencil,
  Plus,
  Power,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  Wallet,
  X
} from "lucide-react";

import useAuth from "../../hooks/useAuth";

import { suscribirCategorias } from "../../services/categoriaService";

import { suscribirMarcas } from "../../services/marcaService";

import {
  actualizarProducto,
  cambiarEstadoProducto,
  crearProducto,
  suscribirProductos
} from "../../services/productoService";

import { eliminarRegistro } from "../../services/genericCrudService";

import { subirImagenEmpresa } from "../../services/storageService";

import AdvancedFilterBar from "../../components/filters/AdvancedFilterBar";
import DetalleProductoModal from "../../components/inventario/DetalleProductoModal";

import "../../styles/productos-premium.css";
import "../../styles/productos-tema.css";


// ==========================================
// A. FORMULARIO VACIO
// ==========================================

const VACIO = {

  sku: "",

  codigoBarras: "",

  nombre: "",

  descripcion: "",

  categoriaId: "",

  marcaId: "",

  costo: "",

  precioVenta: "",

  stockMinimo: "0",

  unidad: "unidad",

  imagenUrl: "",

  controlaVencimiento: false,

  diasAlertaVencimiento: "15",

  fechaVencimientoReferencia: ""

};


// ==========================================
// B. FORMATEAR DINERO
// ==========================================

const moneda = (valor) =>
  `Bs ${Number(valor || 0).toFixed(2)}`;


// ==========================================
// C. ESTADO DE FECHA DE REFERENCIA
// ==========================================

// ESTA FECHA ES INFORMATIVA.
// LOS VENCIMIENTOS REALES SE CONTROLAN
// MEDIANTE LOS LOTES DEL INVENTARIO.

function estadoFechaReferencia(producto) {

  if (!producto.controlaVencimiento) {

    return {
      texto: "No aplica",
      clase: "no"
    };

  }

  const fecha = producto.fechaVencimientoReferencia;

  if (!fecha) {

    return {
      texto: "Sin fecha de referencia",
      clase: "si"
    };

  }

  const partes = String(fecha)
    .split("-")
    .map(Number);

  if (
    partes.length !== 3 ||
    partes.some((n) => !Number.isInteger(n))
  ) {

    return {
      texto: "Fecha incorrecta",
      clase: "si"
    };

  }

  const hoy = new Date();

  const diaHoy = Date.UTC(
    hoy.getFullYear(),
    hoy.getMonth(),
    hoy.getDate()
  );

  const diaVence = Date.UTC(
    partes[0],
    partes[1] - 1,
    partes[2]
  );

  const restantes = Math.round(
    (diaVence - diaHoy) / 86400000
  );

  const aviso = Number(
    producto.diasAlertaVencimiento ?? 15
  );

  if (restantes < 0) {

    return {
      texto: `Referencia vencida (${fecha})`,
      clase: "si"
    };

  }

  if (restantes === 0) {

    return {
      texto: "Referencia vence hoy",
      clase: "si"
    };

  }

  if (restantes <= aviso) {

    return {
      texto: `Referencia: ${restantes} días`,
      clase: "si"
    };

  }

  return {
    texto: `Referencia: ${fecha}`,
    clase: "si"
  };

}


// ==========================================
// D. COMPONENTE DE CAMPOS
// ==========================================

function Campo({
  titulo,
  ayuda,
  obligatorio = false,
  children,
  ancho = ""
}) {

  return (

    <label className={`pp-campo ${ancho}`}>

      <span className="pp-etiqueta">

        {titulo}

        {obligatorio && <b> *</b>}

      </span>

      {children}

      {ayuda && (
        <small>{ayuda}</small>
      )}

    </label>

  );

}


// ==========================================
// E. COMPONENTE PRINCIPAL
// ==========================================

export default function ProductosPage() {

  const { usuario } = useAuth();


  // ========================================
  // DATOS DEL CATALOGO
  // ========================================

  const [productos, setProductos] = useState([]);

  const [categorias, setCategorias] = useState([]);

  const [marcas, setMarcas] = useState([]);


  // ========================================
  // FILTROS
  // ========================================

  const [busqueda, setBusqueda] = useState("");

  const [estado, setEstado] = useState("TODOS");

  const [categoriaFiltro, setCategoriaFiltro] = useState("TODOS");

  const [marcaFiltro, setMarcaFiltro] = useState("TODOS");

  const [vencimientoFiltro, setVencimientoFiltro] = useState("TODOS");


  // ========================================
  // FORMULARIO
  // ========================================

  const [abierto, setAbierto] = useState(false);

  const [detalle, setDetalle] = useState(null);

  const [editando, setEditando] = useState(null);

  const [formulario, setFormulario] = useState(VACIO);


  // ========================================
  // FOTOGRAFIAS
  // ========================================

  const [archivo, setArchivo] = useState(null);

  const [vistaLocal, setVistaLocal] = useState("");


  // ========================================
  // GUARDADO Y MENSAJES
  // ========================================

  const [guardando, setGuardando] = useState(false);

  const [etapa, setEtapa] = useState("");

  const [error, setError] = useState("");

  const [errorLista, setErrorLista] = useState("");

  const [avisoLista, setAvisoLista] = useState("");


  // ========================================
  // F. ESCUCHAR FIREBASE
  // ========================================

  useEffect(() => {

    if (!usuario?.empresaId) return;

    const fallo = (err) => {

      setErrorLista(
        mensajeError(err, "Error al cargar los productos.")
      );

    };

    const a = suscribirProductos(
      usuario.empresaId,
      setProductos,
      fallo
    );

    const b = suscribirCategorias(
      usuario.empresaId,
      setCategorias,
      fallo
    );

    const c = suscribirMarcas(
      usuario.empresaId,
      setMarcas,
      fallo
    );

    return () => {

      a?.();

      b?.();

      c?.();

    };

  }, [usuario?.empresaId]);


  // ========================================
  // G. VISTA PREVIA DE LA FOTOGRAFIA
  // ========================================

  useEffect(() => {

    if (!archivo) return;

    const url = URL.createObjectURL(archivo);

    setVistaLocal(url);

    return () => {

      URL.revokeObjectURL(url);

    };

  }, [archivo]);


  // ========================================
  // H. BLOQUEAR SCROLL AL ABRIR MODAL
  // ========================================

  useEffect(() => {

    if (!abierto) return;

    const anterior = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const tecla = (e) => {

      if (
        e.key === "Escape" &&
        !guardando
      ) {

        setAbierto(false);

      }

    };

    window.addEventListener(
      "keydown",
      tecla
    );

    return () => {

      window.removeEventListener(
        "keydown",
        tecla
      );

      document.body.style.overflow = anterior;

    };

  }, [abierto, guardando]);


  // ========================================
  // I. MAPAS DE CATEGORIAS Y MARCAS
  // ========================================

  const nombresCategorias = useMemo(

    () => new Map(
      categorias.map(
        (c) => [c.id, c.nombre]
      )
    ),

    [categorias]

  );


  const nombresMarcas = useMemo(

    () => new Map(
      marcas.map(
        (m) => [m.id, m.nombre]
      )
    ),

    [marcas]

  );


  // ========================================
  // J. FILTRAR PRODUCTOS
  // ========================================

  const filtrados = useMemo(() => {

    return productos.filter((p) => {

      const texto = busqueda
        .trim()
        .toLowerCase();

      const encontrado =

        !texto ||

        [

          p.nombre,

          p.sku,

          p.codigoBarras,

          p.descripcion,

          nombresCategorias.get(p.categoriaId),

          nombresMarcas.get(p.marcaId)

        ].some(
          (v) =>
            String(v || "")
              .toLowerCase()
              .includes(texto)
        );


      const vence =

        vencimientoFiltro === "TODOS" ||

        (
          vencimientoFiltro === "SI"

            ? Boolean(p.controlaVencimiento)

            : !p.controlaVencimiento
        );


      return (

        encontrado &&

        vence &&

        (
          estado === "TODOS" ||
          p.estado === estado
        ) &&

        (
          categoriaFiltro === "TODOS" ||
          p.categoriaId === categoriaFiltro
        ) &&

        (
          marcaFiltro === "TODOS" ||
          p.marcaId === marcaFiltro
        )

      );

    });

  }, [

    productos,

    busqueda,

    estado,

    categoriaFiltro,

    marcaFiltro,

    vencimientoFiltro,

    nombresCategorias,

    nombresMarcas

  ]);


  // ========================================
  // K. ACTUALIZAR CAMPO
  // ========================================

  const actualizar = (campo, valor) => {

    setFormulario((anterior) => ({

      ...anterior,

      [campo]: valor

    }));

  };


  // ========================================
  // L. CERRAR MODAL
  // ========================================

  const cerrar = () => {

    if (!guardando) {

      setAbierto(false);

    }

  };


  // ========================================
  // M. NUEVO PRODUCTO
  // ========================================

  const nuevo = () => {

    setEditando(null);

    setFormulario({
      ...VACIO
    });

    setArchivo(null);

    setVistaLocal("");

    setError("");

    setAvisoLista("");

    setAbierto(true);

  };


  // ========================================
  // N. EDITAR PRODUCTO
  // ========================================

  const editar = (producto) => {

    setEditando(producto);

    setFormulario({

      ...VACIO,

      ...producto,

      costo:
        String(producto.costo ?? 0),

      precioVenta:
        String(producto.precioVenta ?? 0),

      stockMinimo:
        String(producto.stockMinimo ?? 0),

      controlaVencimiento:
        Boolean(producto.controlaVencimiento),

      diasAlertaVencimiento:
        String(producto.diasAlertaVencimiento ?? 15),

      fechaVencimientoReferencia:
        String(producto.fechaVencimientoReferencia || "")

    });

    setArchivo(null);

    setVistaLocal("");

    setError("");

    setAvisoLista("");

    setAbierto(true);

  };


  // ========================================
  // O. SELECCIONAR FOTOGRAFIA
  // ========================================

  const seleccionarFoto = (foto) => {

    if (!foto) return;


    // VALIDAR FORMATO

    if (

      ![
        "image/jpeg",
        "image/png",
        "image/webp"
      ].includes(foto.type)

    ) {

      setError(
        "La fotografía debe ser JPG, PNG o WEBP."
      );

      return;

    }


    // VALIDAR TAMAÑO

    if (foto.size > 5 * 1024 * 1024) {

      setError(
        "La fotografía no puede superar 5 MB."
      );

      return;

    }


    // GUARDAR FOTO TEMPORAL

    setVistaLocal("");

    setArchivo(foto);

    setError("");

  };


  // ==========================================
  // P. GUARDAR PRODUCTO
  // ==========================================

  // NUEVA FUNCION CORREGIDA:
  //
  // 1. VALIDA LOS DATOS.
  // 2. INTENTA SUBIR LA FOTO A CLOUDINARY.
  // 3. SI FALLA, PREGUNTA SI QUIERE CONTINUAR.
  // 4. CONSERVA LA FOTO ANTERIOR.
  // 5. GUARDA LOS DEMAS CAMBIOS EN FIREBASE.

  const guardar = async (e) => {

    e.preventDefault();

    if (guardando) return;

    try {

      setGuardando(true);

      setError("");

      setErrorLista("");

      setAvisoLista("");


      // ====================================
      // VALIDAR EMPRESA
      // ====================================

      if (!usuario?.empresaId) {

        throw new Error(
          "No tienes una empresa asignada."
        );

      }


      // ====================================
      // VALIDAR SKU Y NOMBRE
      // ====================================

      if (

        !formulario.sku.trim() ||

        !formulario.nombre.trim()

      ) {

        throw new Error(
          "El SKU y el nombre del producto son obligatorios."
        );

      }


      // ====================================
      // VALIDAR SKU DUPLICADO
      // ====================================

      const duplicado = productos.some(
        (p) =>

          p.id !== editando?.id &&

          String(p.sku || "")
            .trim()
            .toUpperCase() ===

          formulario.sku
            .trim()
            .toUpperCase()
      );


      if (duplicado) {

        throw new Error(
          "Ya existe un producto con ese SKU."
        );

      }


      // ====================================
      // VALIDAR NUMEROS
      // ====================================

      for (const [nombre, valor] of [

        ["El costo", formulario.costo],

        ["El precio de venta", formulario.precioVenta],

        ["El stock mínimo", formulario.stockMinimo]

      ]) {

        if (

          valor !== "" &&

          (
            !Number.isFinite(Number(valor)) ||

            Number(valor) < 0
          )

        ) {

          throw new Error(
            `${nombre} debe ser mayor o igual a cero.`
          );

        }

      }


      // ====================================
      // VALIDAR DIAS DE VENCIMIENTO
      // ====================================

      if (

        formulario.controlaVencimiento &&

        (

          !Number.isInteger(
            Number(formulario.diasAlertaVencimiento)
          ) ||

          Number(formulario.diasAlertaVencimiento) < 1 ||

          Number(formulario.diasAlertaVencimiento) > 365

        )

      ) {

        throw new Error(
          "Los días de aviso deben estar entre 1 y 365."
        );

      }


      // ====================================
      // PREPARAR PRODUCTO
      // ====================================

      const datos = {

        ...formulario,

        fechaVencimientoReferencia:

          formulario.controlaVencimiento

            ? formulario.fechaVencimientoReferencia

            : ""

      };


      // ====================================
      // AVISO SI CLOUDINARY FALLA
      // ====================================

      let avisoFoto = "";


      // ====================================
      // INTENTAR SUBIR FOTOGRAFIA
      // ====================================

      if (archivo) {

        setEtapa(
          "Subiendo la fotografía..."
        );


        try {

          // SUBIR FOTO NORMALMENTE

          const nuevaUrl = await subirImagenEmpresa({

            empresaId:
              usuario.empresaId,

            carpeta:
              "productos",

            archivo,

            nombre:
              `${formulario.sku}_${archivo.name}`

          });


          // GUARDAR URL RECIBIDA

          datos.imagenUrl = nuevaUrl;


        } catch (errorFoto) {

          console.error(
            "Cloudinary no pudo subir la fotografía:",
            errorFoto
          );


          // =================================
          // MOSTRAR ERROR REAL
          // =================================

          const detalle =

            errorFoto?.message ||

            "No se pudo subir la fotografía.";


          // =================================
          // PREGUNTAR AL USUARIO
          // =================================

          const continuar = window.confirm(

            "No se pudo subir la nueva fotografía.\n\n" +

            detalle +

            "\n\n¿Quieres guardar los demás cambios " +

            "SIN SUBIR ESTA FOTO?\n\n" +

            (
              editando

                ? "Se conservará la fotografía anterior."

                : "El producto se guardará sin fotografía " +
                  "si no escribiste una URL."
            )

          );


          // =================================
          // SI NO ACEPTA, CANCELAR GUARDADO
          // =================================

          if (!continuar) {

            throw errorFoto;

          }


          // =================================
          // CONSERVAR FOTO ANTERIOR
          // =================================

          // SI EL USUARIO ESCRIBIO UNA URL,
          // CONSERVAMOS ESA URL.
          //
          // SI NO ESCRIBIO NINGUNA,
          // CONSERVAMOS LA FOTO DEL PRODUCTO
          // QUE ESTAMOS EDITANDO.

          datos.imagenUrl =

            String(
              formulario.imagenUrl ||
              editando?.imagenUrl ||
              ""
            ).trim();


          // =================================
          // MENSAJE DESPUES DE GUARDAR
          // =================================

          avisoFoto =

            "Los datos del producto se guardaron, " +

            "pero no se pudo subir la nueva fotografía. " +

            (
              datos.imagenUrl

                ? "Se conservó la fotografía o URL disponible."

                : "El producto quedó sin fotografía."
            );

        }

      }


      // ====================================
      // GUARDAR PRODUCTO EN FIREBASE
      // ====================================

      setEtapa(
        "Guardando el producto..."
      );


      if (editando) {

        // EDITAR PRODUCTO EXISTENTE

        await actualizarProducto(

          editando.id,

          usuario.empresaId,

          datos

        );

      } else {

        // CREAR PRODUCTO NUEVO

        await crearProducto(

          usuario.empresaId,

          datos

        );

      }


      // ====================================
      // LIMPIAR FORMULARIO
      // ====================================

      setAbierto(false);

      setArchivo(null);

      setVistaLocal("");

      setFormulario({
        ...VACIO
      });


      // ====================================
      // MOSTRAR RESULTADO
      // ====================================

      if (avisoFoto) {

        setAvisoLista(avisoFoto);

      } else {

        setAvisoLista(
          editando

            ? "Producto actualizado correctamente."

            : "Producto registrado correctamente."
        );

      }

    } catch (err) {

      console.error(
        "No se pudo guardar el producto:",
        err
      );

      setError(
        mensajeError(err, "No se pudo guardar el producto.")
      );

    } finally {

      setGuardando(false);

      setEtapa("");

    }

  };


  // ========================================
  // Q. ACTIVAR O DESACTIVAR PRODUCTO
  // ========================================

  const alternar = async (p) => {

    try {

      setErrorLista("");

      setAvisoLista("");

      await cambiarEstadoProducto(

        p.id,

        p.estado === "ACTIVO"

          ? "INACTIVO"

          : "ACTIVO"

      );

    } catch (err) {

      setErrorLista(
        mensajeError(err, "No se pudo cambiar el estado.")
      );

    }

  };


  // ========================================
  // R. ELIMINAR PRODUCTO
  // ========================================

  const eliminar = async (p) => {

    const confirmado = window.confirm(

      `¿Eliminar definitivamente «${p.nombre}»?\n\n` +

      "No lo hagas si tiene compras, ventas o movimientos. " +

      "En ese caso utiliza Desactivar."

    );

    if (!confirmado) return;

    try {

      setErrorLista("");

      setAvisoLista("");

      await eliminarRegistro(
        "productos",
        p.id
      );

    } catch (err) {

      setErrorLista(
        mensajeError(err, "No se pudo eliminar el producto.")
      );

    }

  };


  // ========================================
  // S. DATOS VISUALES
  // ========================================

  const fotoActual =
    vistaLocal || formulario.imagenUrl;

  const activos = productos.filter(
    (p) => p.estado === "ACTIVO"
  ).length;

  const perecederos = productos.filter(
    (p) => p.controlaVencimiento
  ).length;


  // ==========================================
  // T. INTERFAZ
  // ==========================================

  return (

    <div className="module-page pp-pagina">

      {/* ================================= */}
      {/* ENCABEZADO */}
      {/* ================================= */}

      <header className="pp-cabecera">

        <div>

          <span className="eyebrow">
            CATÁLOGO INTELIGENTE
          </span>

          <h1>
            Productos
          </h1>

          <p>
            Administra tu catálogo, fotografías,
            precios y productos perecederos.
          </p>

        </div>


        <button
          type="button"
          className="primary-action pp-boton-nuevo"
          onClick={nuevo}
        >

          <Plus size={18} />

          Nuevo producto

        </button>

      </header>


      {/* ================================= */}
      {/* INDICADORES */}
      {/* ================================= */}

      <div className="pp-indicadores">

        <article>

          <span className="pp-indicador-icono">
            <Package size={19} />
          </span>

          <div>

            <small>
              Productos registrados
            </small>

            <strong>
              {productos.length}
            </strong>

          </div>

        </article>


        <article>

          <span className="pp-indicador-icono verde">
            <CheckCircle2 size={19} />
          </span>

          <div>

            <small>
              Productos activos
            </small>

            <strong>
              {activos}
            </strong>

          </div>

        </article>


        <article>

          <span className="pp-indicador-icono naranja">
            <CalendarDays size={19} />
          </span>

          <div>

            <small>
              Control de vencimiento
            </small>

            <strong>
              {perecederos}
            </strong>

          </div>

        </article>

      </div>


      {/* ================================= */}
      {/* FILTROS */}
      {/* ================================= */}

      <AdvancedFilterBar

        search={busqueda}

        onSearch={setBusqueda}

        searchPlaceholder="Buscar nombre, SKU, código de barras, categoría..."

        status={estado}

        onStatus={setEstado}

        statusOptions={[

          {
            value: "TODOS",
            label: "Todos"
          },

          {
            value: "ACTIVO",
            label: "Activos"
          },

          {
            value: "INACTIVO",
            label: "Inactivos"
          }

        ]}

        filters={[

          {
            key: "categoria",
            label: "Todas las categorías",
            value: categoriaFiltro,
            onChange: setCategoriaFiltro,

            options: categorias.map((c) => ({
              value: c.id,
              label: c.nombre
            }))
          },

          {
            key: "marca",
            label: "Todas las marcas",
            value: marcaFiltro,
            onChange: setMarcaFiltro,

            options: marcas.map((m) => ({
              value: m.id,
              label: m.nombre
            }))
          },

          {
            key: "vence",
            label: "Todos los tipos",
            value: vencimientoFiltro,
            onChange: setVencimientoFiltro,

            options: [

              {
                value: "SI",
                label: "Con vencimiento"
              },

              {
                value: "NO",
                label: "Sin vencimiento"
              }

            ]
          }

        ]}

        onClear={() => {

          setBusqueda("");

          setEstado("TODOS");

          setCategoriaFiltro("TODOS");

          setMarcaFiltro("TODOS");

          setVencimientoFiltro("TODOS");

        }}
      />


      {/* ================================= */}
      {/* MENSAJE DE ERROR */}
      {/* ================================= */}

      {errorLista && (

        <div
          className="pp-aviso-error"
          role="alert"
        >

          {errorLista}

          <button
            type="button"
            onClick={() => setErrorLista("")}
          >
            Cerrar
          </button>

        </div>

      )}


      {/* ================================= */}
      {/* MENSAJE DE EXITO O ADVERTENCIA */}
      {/* ================================= */}

      {avisoLista && (

        <div
          className="pp-aviso-error"
          role="status"
          style={{

            background: "rgba(30, 160, 120, 0.13)",

            border: "1px solid rgba(65, 210, 160, 0.35)",

            color: "#baf5df",

            display: "flex",

            alignItems: "center",

            gap: 10

          }}
        >

          <CheckCircle2 size={18} />

          <span style={{ flex: 1 }}>

            {avisoLista}

          </span>


          <button
            type="button"
            onClick={() => setAvisoLista("")}
          >

            Cerrar

          </button>

        </div>

      )}


      {/* ================================= */}
      {/* TABLA DE PRODUCTOS */}
      {/* ================================= */}

      <section className="data-card glass-3d pp-tabla">

        <div className="data-card-meta">

          <strong>
            {filtrados.length}
          </strong>

          <span>
            de {productos.length} producto(s)
          </span>

        </div>


        <div className="table-scroll">

          <table className="modern-table">

            <thead>

              <tr>

                <th>PRODUCTO</th>

                <th>SKU</th>

                <th>CÓD. BARRAS</th>

                <th>CATEGORÍA</th>

                <th>MARCA</th>

                <th>PRECIO</th>

                <th>STOCK MÍN.</th>

                <th>VENCIMIENTO</th>

                <th>ESTADO</th>

                <th>ACCIONES</th>

              </tr>

            </thead>


            <tbody>

              {filtrados.map((p) => (

                <tr key={p.id}>

                  <td>

                    <div className="product-mini pp-producto-mini">

                      <span>

                        {p.imagenUrl ? (

                          <img
                            src={p.imagenUrl}
                            alt={p.nombre}
                            loading="lazy"
                          />

                        ) : (

                          <ImageIcon size={18} />

                        )}

                      </span>


                      <div>

                        <strong>
                          {p.nombre}
                        </strong>

                        <small>
                          {p.unidad || "unidad"}
                        </small>

                      </div>

                    </div>

                  </td>


                  <td>
                    <code>{p.sku}</code>
                  </td>


                  <td>

                    {p.codigoBarras ? (

                      <span className="barcode-chip">

                        <Barcode size={13} />

                        {p.codigoBarras}

                      </span>

                    ) : (

                      "-"

                    )}

                  </td>


                  <td>

                    {nombresCategorias.get(p.categoriaId) ||
                      "Sin categoría"}

                  </td>


                  <td>

                    {nombresMarcas.get(p.marcaId) ||
                      "Sin marca"}

                  </td>


                  <td>

                    <strong>
                      {moneda(p.precioVenta)}
                    </strong>

                  </td>


                  <td>

                    {p.stockMinimo ?? 0}

                  </td>


                  <td>

                    <span
                      className={`pp-etiqueta-vence ${
                        estadoFechaReferencia(p).clase
                      }`}
                      title="Esta fecha es informativa; el stock real se controla por lotes"
                    >

                      {estadoFechaReferencia(p).texto}

                    </span>

                  </td>


                  <td>

                    <span
                      className={`status-pill ${
                        p.estado === "ACTIVO"
                          ? "active"
                          : "inactive"
                      }`}
                    >

                      {p.estado}

                    </span>

                  </td>


                  <td>

                    <div className="row-actions">

                      {/* VER DETALLE */}
                      <button
                        type="button"
                        title="Ver detalle"
                        aria-label={`Ver detalle de ${p.nombre}`}
                        onClick={() => setDetalle(p)}
                      >
                        <Eye size={16} />
                      </button>

                      {/* EDITAR */}

                      <button
                        type="button"
                        title="Editar"
                        onClick={() => editar(p)}
                      >

                        <Pencil size={16} />

                      </button>


                      {/* ACTIVAR / DESACTIVAR */}

                      <button
                        type="button"
                        title={
                          p.estado === "ACTIVO"
                            ? "Desactivar"
                            : "Activar"
                        }
                        onClick={() => alternar(p)}
                      >

                        <Power size={16} />

                      </button>


                      {/* ELIMINAR */}

                      <button
                        type="button"
                        title="Eliminar"
                        className="danger"
                        onClick={() => eliminar(p)}
                      >

                        <Trash2 size={16} />

                      </button>

                    </div>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>


          {!filtrados.length && (

            <div className="empty-state">

              No hay productos con esos filtros.

            </div>

          )}

        </div>

      </section>


      {/* ================================= */}
      {/* MODAL PARA REGISTRAR O EDITAR */}
      {/* ================================= */}

      <AnimatePresence>
        {detalle && (
          <DetalleProductoModal
            producto={detalle}
            categorias={categorias}
            marcas={marcas}
            empresaId={usuario?.empresaId}
            alCerrar={() => setDetalle(null)}
            alEditar={() => {
              const producto = detalle;
              setDetalle(null);
              editar(producto);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>

        {abierto && (

          <motion.div
            className="pp-fondo-modal"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={cerrar}
          >

            <motion.section
              className="pp-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="pp-titulo-modal"
              initial={{
                opacity: 0,
                y: 28,
                scale: 0.97
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1
              }}
              exit={{
                opacity: 0,
                y: 12,
                scale: 0.98
              }}
              transition={{
                duration: 0.2
              }}
              onMouseDown={(e) =>
                e.stopPropagation()
              }
            >

              {/* ========================== */}
              {/* ENCABEZADO DEL MODAL */}
              {/* ========================== */}

              <div className="pp-modal-cabecera">

                <div className="pp-modal-identidad">

                  <span className="pp-modal-logo">

                    <Package size={24} />

                  </span>


                  <div>

                    <small>

                      {editando
                        ? "EDITANDO REGISTRO"
                        : "NUEVO REGISTRO"}

                    </small>


                    <h2 id="pp-titulo-modal">

                      {editando
                        ? "Editar producto"
                        : "Registrar producto"}

                    </h2>


                    <p>

                      Información organizada para
                      cualquier tipo de negocio.

                    </p>

                  </div>

                </div>


                <button
                  type="button"
                  aria-label="Cerrar"
                  className="pp-cerrar"
                  onClick={cerrar}
                  disabled={guardando}
                >

                  <X size={21} />

                </button>

              </div>


              {/* ========================== */}
              {/* FORMULARIO */}
              {/* ========================== */}

              <form
                onSubmit={guardar}
                className="pp-formulario"
              >

                <div className="pp-formulario-contenido">

                  {/* ====================== */}
                  {/* COLUMNA PRINCIPAL */}
                  {/* ====================== */}

                  <div className="pp-formulario-principal">

                    {/* ==================== */}
                    {/* INFORMACION PRODUCTO */}
                    {/* ==================== */}

                    <section className="pp-seccion">

                      <h3>

                        <span>
                          <Package size={17} />
                        </span>

                        Información del producto

                      </h3>


                      <p>

                        Identificación, descripción
                        y unidad de venta.

                      </p>


                      <div className="pp-grid-campos">

                        {/* NOMBRE */}

                        <Campo
                          titulo="Nombre del producto"
                          obligatorio
                          ancho="pp-ancho-total"
                        >

                          <input
                            required
                            maxLength={120}
                            value={formulario.nombre}
                            onChange={(e) =>
                              actualizar(
                                "nombre",
                                e.target.value
                              )
                            }
                            placeholder="Ej. Papas Lays Clásicas 45 g"
                          />

                        </Campo>


                        {/* SKU */}

                        <Campo
                          titulo="Código SKU"
                          obligatorio
                          ayuda="Debe ser único en esta empresa."
                        >

                          <input
                            required
                            maxLength={60}
                            value={formulario.sku}
                            onChange={(e) =>
                              actualizar(
                                "sku",
                                e.target.value.toUpperCase()
                              )
                            }
                            placeholder="PROD-003"
                          />

                        </Campo>


                        {/* CODIGO DE BARRAS */}

                        <Campo titulo="Código de barras">

                          <input
                            maxLength={80}
                            value={formulario.codigoBarras}
                            onChange={(e) =>
                              actualizar(
                                "codigoBarras",
                                e.target.value
                              )
                            }
                            placeholder="EAN, UPC o código interno"
                          />

                        </Campo>


                        {/* CATEGORIA */}

                        <Campo titulo="Categoría">

                          <select
                            value={formulario.categoriaId || ""}
                            onChange={(e) =>
                              actualizar(
                                "categoriaId",
                                e.target.value
                              )
                            }
                          >

                            <option value="">
                              Sin categoría
                            </option>


                            {categorias

                              .filter(
                                (c) =>
                                  c.estado === "ACTIVA" ||
                                  c.id === formulario.categoriaId
                              )

                              .map((c) => (

                                <option
                                  key={c.id}
                                  value={c.id}
                                >

                                  {c.nombre}

                                </option>

                              ))}

                          </select>

                        </Campo>


                        {/* MARCA */}

                        <Campo titulo="Marca">

                          <select
                            value={formulario.marcaId || ""}
                            onChange={(e) =>
                              actualizar(
                                "marcaId",
                                e.target.value
                              )
                            }
                          >

                            <option value="">
                              Sin marca
                            </option>


                            {marcas

                              .filter(
                                (m) =>
                                  m.estado === "ACTIVA" ||
                                  m.id === formulario.marcaId
                              )

                              .map((m) => (

                                <option
                                  key={m.id}
                                  value={m.id}
                                >

                                  {m.nombre}

                                </option>

                              ))}

                          </select>

                        </Campo>


                        {/* UNIDAD */}

                        <Campo titulo="Unidad de venta">

                          <select
                            value={formulario.unidad}
                            onChange={(e) =>
                              actualizar(
                                "unidad",
                                e.target.value
                              )
                            }
                          >

                            <option value="unidad">
                              Unidad
                            </option>

                            <option value="kg">
                              Kilogramo (kg)
                            </option>

                            <option value="g">
                              Gramo (g)
                            </option>

                            <option value="litro">
                              Litro
                            </option>

                            <option value="caja">
                              Caja
                            </option>

                            <option value="paquete">
                              Paquete
                            </option>

                            <option value="metro">
                              Metro
                            </option>

                            <option value="docena">
                              Docena
                            </option>

                          </select>

                        </Campo>


                        {/* DESCRIPCION */}

                        <Campo
                          titulo="Descripción"
                          ancho="pp-ancho-total"
                        >

                          <textarea
                            rows={3}
                            maxLength={800}
                            value={formulario.descripcion}
                            onChange={(e) =>
                              actualizar(
                                "descripcion",
                                e.target.value
                              )
                            }
                            placeholder="Describe las características del producto..."
                          />

                        </Campo>

                      </div>

                    </section>


                    {/* ==================== */}
                    {/* PRECIO E INVENTARIO */}
                    {/* ==================== */}

                    <section className="pp-seccion">

                      <h3>

                        <span>
                          <Wallet size={17} />
                        </span>

                        Precio e inventario

                      </h3>


                      <p>

                        Estos campos mantienen
                        la compatibilidad con compras
                        y punto de venta.

                      </p>


                      <div className="pp-grid-campos pp-grid-tres">

                        {/* COSTO */}

                        <Campo titulo="Costo de compra (Bs)">

                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formulario.costo}
                            onChange={(e) =>
                              actualizar(
                                "costo",
                                e.target.value
                              )
                            }
                            placeholder="0.00"
                          />

                        </Campo>


                        {/* PRECIO */}

                        <Campo titulo="Precio de venta (Bs)">

                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formulario.precioVenta}
                            onChange={(e) =>
                              actualizar(
                                "precioVenta",
                                e.target.value
                              )
                            }
                            placeholder="0.00"
                          />

                        </Campo>


                        {/* STOCK MINIMO */}

                        <Campo
                          titulo="Stock mínimo"
                          ayuda="Es una alerta, no el stock real."
                        >

                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={formulario.stockMinimo}
                            onChange={(e) =>
                              actualizar(
                                "stockMinimo",
                                e.target.value
                              )
                            }
                          />

                        </Campo>

                      </div>


                      <div className="pp-nota">

                        <Info size={16} />

                        Las existencias reales se actualizan
                        por sucursal desde Compras,
                        Ventas o Ajustar stock.

                      </div>

                    </section>


                    {/* ==================== */}
                    {/* VENCIMIENTOS */}
                    {/* ==================== */}

                    <section className="pp-seccion">

                      <h3>

                        <span>
                          <CalendarDays size={17} />
                        </span>

                        Productos con vencimiento

                        <em>OPCIONAL</em>

                      </h3>


                      <p>

                        Útil para alimentos, bebidas,
                        cosméticos y otros productos
                        perecederos.

                      </p>


                      <label className="pp-switch-fila">

                        <span>

                          <strong>
                            ¿Requiere control de vencimiento?
                          </strong>

                          <small>
                            Actívalo únicamente cuando
                            el producto tenga caducidad.
                          </small>

                        </span>


                        <input
                          type="checkbox"
                          checked={Boolean(
                            formulario.controlaVencimiento
                          )}
                          onChange={(e) =>
                            actualizar(
                              "controlaVencimiento",
                              e.target.checked
                            )
                          }
                        />


                        <span
                          className="pp-switch"
                          aria-hidden="true"
                        />

                      </label>


                      <AnimatePresence initial={false}>

                        {formulario.controlaVencimiento && (

                          <motion.div
                            className="pp-vencimiento-extra"
                            initial={{
                              opacity: 0,
                              height: 0
                            }}
                            animate={{
                              opacity: 1,
                              height: "auto"
                            }}
                            exit={{
                              opacity: 0,
                              height: 0
                            }}
                          >

                            <div className="pp-grid-campos">

                              {/* FECHA DE REFERENCIA */}

                              <Campo
                                titulo="Fecha de vencimiento de referencia"
                                ayuda="Opcional. Es informativa; los vencimientos reales se registran en los lotes."
                              >

                                <input
                                  type="date"
                                  value={
                                    formulario.fechaVencimientoReferencia || ""
                                  }
                                  onChange={(e) =>
                                    actualizar(
                                      "fechaVencimientoReferencia",
                                      e.target.value
                                    )
                                  }
                                />

                              </Campo>


                              {/* DIAS DE ALERTA */}

                              <Campo
                                titulo="Avisar con cuántos días de anticipación"
                                ayuda="Sirve para mostrar alertas de lotes próximos a vencer."
                              >

                                <input
                                  type="number"
                                  min="1"
                                  max="365"
                                  step="1"
                                  value={
                                    formulario.diasAlertaVencimiento
                                  }
                                  onChange={(e) =>
                                    actualizar(
                                      "diasAlertaVencimiento",
                                      e.target.value
                                    )
                                  }
                                />

                              </Campo>

                            </div>


                            {formulario.fechaVencimientoReferencia && (

                              <div className="pp-nota">

                                <CalendarDays size={17} />

                                {estadoFechaReferencia(formulario).texto}

                                {" "}

                                (solo fecha informativa).

                              </div>

                            )}


                            <div className="pp-nota advertencia">

                              <AlertTriangle size={17} />

                              La fecha de referencia
                              no sustituye los vencimientos
                              reales. Cada lote se registra
                              desde Compras o mediante
                              regularización en Inventario.
                              Las ventas utilizan los lotes
                              vigentes disponibles.

                            </div>

                          </motion.div>

                        )}

                      </AnimatePresence>

                    </section>

                  </div>


                  {/* ====================== */}
                  {/* COLUMNA FOTOGRAFIA */}
                  {/* ====================== */}

                  <aside className="pp-lateral">

                    <section className="pp-seccion pp-imagen-seccion">

                      <h3>

                        <span>
                          <Camera size={17} />
                        </span>

                        Fotografía

                      </h3>


                      <p>
                        Una foto clara ayuda a encontrar el producto al vender.
                      </p>


                      {/* VISTA PREVIA */}

                      <div className="pp-imagen-vista">

                        {fotoActual ? (

                          <img
                            src={fotoActual}
                            alt="Vista previa del producto"
                          />

                        ) : (

                          <div className="pp-imagen-vacia">

                            <ImageIcon size={45} />

                            <strong>
                              Sin fotografía
                            </strong>

                            <small>
                              Agrega una imagen de tu producto
                            </small>

                          </div>

                        )}


                        {archivo && (

                          <span className="pp-foto-lista">

                            <CheckCircle2 size={13} />

                            Lista para subir

                          </span>

                        )}

                      </div>


                      {/* SELECCIONAR FOTO */}

                      <label
                        className="pp-subir-foto"
                        onDragOver={(e) =>
                          e.preventDefault()
                        }
                        onDrop={(e) => {

                          e.preventDefault();

                          seleccionarFoto(
                            e.dataTransfer.files?.[0]
                          );

                        }}
                      >

                        <Upload size={18} />

                        <span>

                          {archivo

                            ? "Cambiar fotografía"

                            : "Seleccionar fotografía"}

                        </span>


                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(e) =>
                            seleccionarFoto(
                              e.target.files?.[0]
                            )
                          }
                        />

                      </label>


                      <small className="pp-ayuda-foto">

                        JPG, PNG o WEBP · Máximo 5 MB.
                        Se comprime antes de subir.

                      </small>


                      {/* CANCELAR FOTO NUEVA */}

                      {archivo && (

                        <button
                          className="pp-quitar-foto"
                          type="button"
                          onClick={() => {

                            setArchivo(null);

                            setVistaLocal("");

                          }}
                        >

                          Cancelar nueva foto

                        </button>

                      )}


                      {/* URL MANUAL */}

                      <div className="pp-separador">

                        <span>
                          O utilizar una URL
                        </span>

                      </div>


                      <Campo
                        titulo="URL de imagen"
                        ayuda="Opcional. Se conserva al editar."
                      >

                        <input
                          type="url"
                          placeholder="https://..."
                          value={
                            formulario.imagenUrl || ""
                          }
                          onChange={(e) =>
                            actualizar(
                              "imagenUrl",
                              e.target.value
                            )
                          }
                        />

                      </Campo>

                    </section>


                    {/* SEGURIDAD */}

                    <div className="pp-seguridad">

                      <ShieldCheck size={18} />

                      <div>

                        <strong>
                          Solo tu empresa lo ve
                        </strong>

                        <span>

                          Este producto es privado de tu negocio y
                          solo lo ven las personas que tú autorices.

                        </span>

                      </div>

                    </div>

                  </aside>

                </div>


                {/* ========================== */}
                {/* MENSAJE DE ERROR DEL MODAL */}
                {/* ========================== */}

                {error && (

                  <div
                    className="pp-aviso-error"
                    role="alert"
                  >

                    <AlertTriangle size={17} />

                    {error}

                  </div>

                )}


                {/* ========================== */}
                {/* BOTONES DEL FORMULARIO */}
                {/* ========================== */}

                <footer className="pp-modal-pie">

                  <span>

                    {guardando ? (

                      etapa

                    ) : (

                      <>

                        <CheckCircle2 size={15} />

                        Campos con * obligatorios

                      </>

                    )}

                  </span>


                  <div>

                    {/* CANCELAR */}

                    <button
                      type="button"
                      className="pp-cancelar"
                      disabled={guardando}
                      onClick={cerrar}
                    >

                      Cancelar

                    </button>


                    {/* GUARDAR */}

                    <button
                      type="submit"
                      className="primary-action pp-guardar"
                      disabled={guardando}
                    >

                      <Save size={17} />

                      {guardando

                        ? "Guardando..."

                        : editando

                          ? "Guardar cambios"

                          : "Registrar producto"}

                    </button>

                  </div>

                </footer>

              </form>

            </motion.section>

          </motion.div>

        )}

      </AnimatePresence>

    </div>

  );

}