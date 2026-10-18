# Control de cobertura WEB

| # | Requisito / módulo | Implementación Web |
|---|---|---|
| 1 | Inicio de sesión | Login + Firebase Auth + verificación de correo |
| 2 | Gestión de usuarios | Administradores + Trabajadores |
| 3 | Roles y permisos | Roles dinámicos por empresa |
| 4 | Configuración del negocio | ConfiguracionEmpresaPage |
| 5 | Personalización visual | Centro de control SUPER ADMIN |
| 6 | Configuración general | Centro de control + configuración empresa |
| 7 | Sucursales | CRUD + ubicación internacional |
| 8 | Categorías | CRUD + filtros |
| 9 | Marcas | CRUD + filtros |
| 10 | Productos | CRUD + filtros |
| 11 | Imágenes de productos | Firebase Storage |
| 12 | Proveedores | CRUD + filtros |
| 13 | Compras | Registro de compra |
| 14 | Detalle de compras | detalleCompras + historial detallado |
| 15 | Inventario | Existencias por sucursal |
| 16 | Movimientos inventario | entradas/salidas/ajustes/ventas/compras/devoluciones |
| 17 | Stock mínimo | stockMinimo producto |
| 18 | Alertas inventario | StockAlertasPage |
| 19 | Ventas | Registro transaccional |
| 20 | POS | PosPage |
| 21 | Clientes | CRUD + filtros |
| 22 | Detalle venta | detalleVentas + modal detalle |
| 23 | Métodos de pago | CRUD configurable |
| 24 | Descuentos/promociones | CRUD promociones |
| 25 | Devoluciones | flujo con control de cantidades y stock |
| 26 | Anulación ventas | reversión de stock + caja/crédito |
| 27 | Comprobantes | impresión desde historial ventas |
| 28 | Historial ventas | filtros avanzados + detalle |
| 29 | Historial compras | filtros avanzados + detalle |
| 30 | Búsqueda productos | nombre/SKU/código barras |
| 31 | Código barras | campo + búsqueda POS/productos |
| 32 | Precios | costo/precio producto |
| 33 | Cuentas por cobrar | crédito + pagos |
| 34 | Cuentas por pagar | compras crédito + pagos |
| 35 | Caja | apertura/cierre/movimientos |
| 36 | Gastos | CRUD + filtros |
| 37 | Reportes ventas | filtros + CSV |
| 38 | Reportes inventario | filtros + CSV |
| 39 | Reportes compras | filtros + CSV |
| 40 | Reportes financieros | resumen financiero |
| 41 | Dashboard | dashboard empresa |
| 42 | Notificaciones/alertas | notificaciones + stock alertas |
| 43 | Auditoría | empresarial + global |
| 44 | Configuración módulos | módulos globales + módulos por empresa |
| 45 | Respaldo/config sistema | JSON lógico + configuración |
| 46 | Panel administrador general | SuperAdminLayout |
| 47 | Gestión de empresas | CRUD + centro de control |
| 48 | Planes/licencias | planes + licencias |
| 49 | Configuración por empresa | centro de control |
| 50 | Dashboard global | DashboardGlobalPage |

## Pendiente externo al código Web

- publicar las reglas Firestore;
- publicar las reglas Storage;
- verificar dominios autorizados en Authentication;
- activar Email/Password;
- configurar Password Policy en Firebase Console;
- probar con dos empresas distintas para validar aislamiento;
- ejecutar `npm run build` en Windows después de `npm install`;
- Mobile queda fuera del alcance de este paquete.
