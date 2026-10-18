# Sistema Multiempresa WEB V3

Versión web consolidada del **Sistema Genérico de Ventas e Inventario Multiempresa**.

## Roles autenticados

- `SUPER_ADMIN`: propietario/operador global de la plataforma SaaS.
- `ADMIN`: administrador de una empresa específica.
- `TRABAJADOR`: usuario operativo con `rolId` y permisos dinámicos.
- `CLIENTE` no es un rol de Authentication; es un registro comercial relacionado con ventas, créditos, pagos, promociones y devoluciones.

## SUPER ADMIN

- Dashboard global.
- CRUD de empresas.
- Filtros por texto, estado, país y ubicación.
- Administradores por empresa.
- Planes.
- Licencias.
- Módulos globales.
- Centro de control por empresa.
- Personalización visual por empresa.
- Configuración comercial por empresa.
- Activación/desactivación de módulos por empresa.
- Ubicación internacional.
- Auditoría global.
- Notificaciones globales.
- Seguridad.
- Respaldo lógico JSON.
- Seguridad de la cuenta y cambio de contraseña.

## ADMIN / TRABAJADOR

- Dashboard empresarial.
- Roles y permisos.
- Trabajadores.
- Configuración del negocio.
- Sucursales.
- Categorías.
- Marcas.
- Productos.
- Imágenes de productos con Firebase Storage.
- SKU y códigos de barras.
- Inventario por sucursal.
- Movimientos de inventario.
- Stock mínimo y alertas.
- Proveedores.
- Compras y detalle de compra.
- Historial de compras con filtros y detalle.
- Clientes.
- Punto de venta (POS).
- Ventas y detalle de venta.
- Métodos de pago.
- Promociones y descuentos.
- Devoluciones con reintegro opcional de stock.
- Anulación de ventas con reversión de stock.
- Comprobantes imprimibles.
- Historial de ventas.
- Caja y movimientos.
- Gastos.
- Cuentas por cobrar y pagos.
- Cuentas por pagar y pagos.
- Reportes de ventas, compras, inventario y finanzas.
- Notificaciones.
- Auditoría.
- Seguridad de la cuenta y cambio de contraseña.

## Filtros

La Web utiliza filtros de búsqueda y selección en los módulos donde corresponde. Incluye combinaciones de:

- texto libre;
- código / SKU / código de barras;
- activo / inactivo;
- fechas desde / hasta;
- país;
- región / departamento / estado;
- rol;
- cliente;
- proveedor;
- método de pago;
- estado;
- sucursal;
- tipo de movimiento;
- categoría;
- marca;
- monto mínimo / máximo;
- stock mínimo / agotado.

## Ubicación internacional

`src/data/locations.js` contiene **249 países/territorios** y más de **5.000 subdivisiones administrativas** ISO. `LocationPicker.jsx` añade búsqueda por país y por estado/departamento/región, además de campos de provincia/distrito, ciudad/municipio y dirección.

## Seguridad

- Verificación obligatoria de correo para iniciar sesión.
- Reenvío del correo de verificación al intentar ingresar con una cuenta no verificada.
- Contraseñas nuevas con mínimo 10 caracteres, mayúscula, minúscula, número, carácter especial y sin espacios.
- Cambio de contraseña con reautenticación.
- Aislamiento multiempresa mediante `empresaId`.
- Roles dinámicos para trabajadores.
- Reglas Firestore por módulo y permiso.
- Reglas Storage para productos y branding.
- Ventas/compras/movimientos se conservan por trazabilidad; se anulan en lugar de borrar.

> Recomendado en Firebase Console: configurar también la **Password Policy** de Authentication para que Firebase aplique la política a nivel de proyecto y no solamente en la interfaz Web.

## Instalación

No copies `node_modules` de otra computadora.

```bash
cd web
npm install
npm run dev
```

Build final:

```bash
npm run build
```

## Variables de entorno

Conserva tu `.env` real. El ZIP solo incluye `.env.example`.

Variables esperadas:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

## Firebase Rules

Copiar y publicar:

- `firestore.rules` → Firebase Console → Firestore Database → Rules.
- `storage.rules` → Firebase Console → Storage → Rules.

Tener los archivos dentro de VS Code **no los publica automáticamente**.

## Creación de usuarios

Esta versión universitaria utiliza una instancia secundaria de Firebase Authentication para crear `ADMIN` y `TRABAJADOR` sin cerrar la sesión actual. Para una solución de producción, la creación/eliminación administrativa de cuentas debería migrarse a Cloud Functions + Admin SDK.

## Plan / Licencia / Módulo

```text
MÓDULO
  funcionalidad disponible en la plataforma

PLAN
  paquete de módulos y límites

LICENCIA
  asignación de un plan a una empresa y vigencia

EMPRESA
  recibe módulos del plan y ajustes individuales del SUPER ADMIN
```

## Diseño

- interfaz oscura tecnológica;
- glassmorphism;
- tarjetas con profundidad 3D;
- animaciones Framer Motion;
- hover tridimensional;
- zoom global;
- paleta `Ctrl + K`;
- tablas y modales responsivos;
- filtros avanzados reutilizables.

## Validación realizada antes de empaquetar

- análisis sintáctico de todos los archivos JS/JSX con Babel Parser;
- validación de imports relativos;
- revisión de rutas principales;
- reglas Firestore/Storage incluidas.

La validación funcional final debe hacerse contra tu proyecto Firebase real porque los permisos, usuarios, colecciones y Storage dependen de esa instancia.
