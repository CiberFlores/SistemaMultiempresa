import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where
} from "firebase/firestore";

import {
  db
} from "./firebase/firebaseConfig";

export function suscribirInventario(
  empresaId,
  callback,
  errorCallback
) {
  const consulta = query(
    collection(
      db,
      "inventarios"
    ),

    where(
      "empresaId",
      "==",
      empresaId
    )
  );

  return onSnapshot(
    consulta,

    (snapshot) => {
      callback(
        snapshot.docs.map(
          (documento) => ({
            id:
              documento.id,

            ...documento.data()
          })
        )
      );
    },

    errorCallback
  );
}

export async function obtenerCatalogosInventario(
  empresaId
) {
  const [
    productosSnapshot,
    sucursalesSnapshot
  ] = await Promise.all([
    getDocs(
      query(
        collection(
          db,
          "productos"
        ),

        where(
          "empresaId",
          "==",
          empresaId
        )
      )
    ),

    getDocs(
      query(
        collection(
          db,
          "sucursales"
        ),

        where(
          "empresaId",
          "==",
          empresaId
        )
      )
    )
  ]);

  return {
    productos:
      productosSnapshot.docs
        .map(
          (documento) => ({
            id:
              documento.id,

            ...documento.data()
          })
        )
        .filter(
          (producto) =>
            producto.estado ===
            "ACTIVO"
        ),

    sucursales:
      sucursalesSnapshot.docs
        .map(
          (documento) => ({
            id:
              documento.id,

            ...documento.data()
          })
        )
        .filter(
          (sucursal) =>
            sucursal.estado ===
            "ACTIVA"
        )
  };
}

export async function ajustarStock({
  empresaId,
  sucursalId,
  productoId,
  tipo,
  cantidad,
  motivo,
  usuarioId
}) {
  const cantidadNumero =
    Number(
      cantidad
    );

  if (
    !empresaId ||
    !sucursalId ||
    !productoId
  ) {
    throw new Error(
      "Empresa, sucursal y producto son obligatorios."
    );
  }

  if (
    !Number.isFinite(
      cantidadNumero
    ) ||
    cantidadNumero <= 0
  ) {
    throw new Error(
      "La cantidad debe ser mayor que cero."
    );
  }

  const tiposPermitidos = [
    "ENTRADA",
    "SALIDA",
    "AJUSTE_POSITIVO",
    "AJUSTE_NEGATIVO"
  ];

  if (
    !tiposPermitidos.includes(
      tipo
    )
  ) {
    throw new Error(
      "Tipo de movimiento inválido."
    );
  }

  const inventarioId =
    `${sucursalId}_${productoId}`;

  const inventarioRef = doc(
    db,
    "inventarios",
    inventarioId
  );

  const movimientoRef = doc(
    collection(
      db,
      "movimientosStock"
    )
  );

  await runTransaction(
    db,

    async (transaccion) => {
      const inventarioSnapshot =
        await transaccion.get(
          inventarioRef
        );

      const stockActual =
        inventarioSnapshot.exists()
          ? Number(
              inventarioSnapshot
                .data()
                .stock || 0
            )
          : 0;

      const esEntrada =
        tipo === "ENTRADA" ||
        tipo ===
          "AJUSTE_POSITIVO";

      const stockNuevo =
        esEntrada
          ? stockActual +
            cantidadNumero
          : stockActual -
            cantidadNumero;

      if (
        stockNuevo < 0
      ) {
        throw new Error(
          `Stock insuficiente. Stock actual: ${stockActual}.`
        );
      }

      transaccion.set(
        inventarioRef,

        {
          empresaId,
          sucursalId,
          productoId,

          stock:
            stockNuevo,

          fechaActualizacion:
            serverTimestamp()
        },

        {
          merge: true
        }
      );

      transaccion.set(
        movimientoRef,
        {
          empresaId,
          sucursalId,
          productoId,

          tipo,

          cantidad:
            cantidadNumero,

          stockAnterior:
            stockActual,

          stockNuevo,

          motivo:
            motivo?.trim() ||
            "",

          usuarioId:
            usuarioId || null,

          fechaRegistro:
            serverTimestamp()
        }
      );
    }
  );
}