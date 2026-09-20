# BLOQUE COMERCIO - SISTEMA MULTIEMPRESA

Incluye:

- PermissionRoute.jsx
- rolEmpresaService actualizado con permisos nuevos
- Clientes CRUD
- Proveedores CRUD
- Cajas: apertura y cierre
- Compras con detalle
- Compras aumentan inventario automáticamente
- Compras en efectivo generan egreso de caja
- POS / Ventas
- Ventas reducen inventario automáticamente
- Ventas en efectivo generan ingreso de caja
- Historial de ventas
- Sidebar dinámico por permisos
- AppRoutes completo
- commerce.css
- Firestore Rules completas

## Archivos anteriores requeridos

Debes conservar los módulos ya creados:

- pages/usuarios/RolesEmpresaPage.jsx
- pages/usuarios/TrabajadoresPage.jsx
- pages/inventario/CategoriasPage.jsx
- pages/inventario/MarcasPage.jsx
- pages/inventario/ProductosPage.jsx
- pages/inventario/InventarioPage.jsx
- styles/sprint2.css
- services/sucursalService.js
- services/firebase/firebaseConfig.js

## Copiar

Copia las carpetas respetando la estructura dentro de tu proyecto.

Los archivos Sidebar.jsx, DashboardLayout.jsx, AppRoutes.jsx y rolEmpresaService.js
reemplazan las versiones anteriores.

## Firebase Rules

Abre:

Firebase Console -> Firestore Database -> Reglas

Copia firestore.rules y pulsa Publicar.

## Orden correcto para probar

1. Inicia como ADMIN.
2. Crea al menos una sucursal.
3. Crea categorías, marcas y productos.
4. Abre una caja en /ventas/cajas.
5. Crea clientes.
6. Crea proveedores.
7. Registra una compra.
   - aumenta stock
   - efectivo -> egreso de caja
8. Entra a /ventas/pos.
9. Selecciona sucursal y vende productos.
   - valida stock
   - reduce stock
   - efectivo -> ingreso de caja
10. Revisa /ventas.
11. Cierra la caja.

## Colecciones nuevas

- clientes
- proveedores
- cajas
- movimientosCaja
- compras
- detalleCompras
- ventas
- detalleVentas

También utiliza:

- sucursales
- productos
- inventarios
- movimientosStock
- rolesEmpresa
- usuarios

## Nota de seguridad

Este bloque es correcto para el proyecto académico con Firebase client SDK y Rules.
En producción, operaciones críticas como creación de cuentas de trabajadores,
facturación fiscal, anulaciones y algunas validaciones monetarias deberían pasar
por Cloud Functions / Firebase Admin SDK.
