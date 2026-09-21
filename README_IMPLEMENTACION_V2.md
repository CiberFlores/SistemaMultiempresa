# Sistema Multiempresa WEB V2

Refactor web del sistema genérico de ventas e inventario. La arquitectura separa claramente:

- `SUPER_ADMIN`: propietario de la plataforma SaaS.
- `ADMIN`: administrador de una empresa específica.
- `TRABAJADOR`: usuario operativo con `rolId` y permisos dinámicos.
- Los clientes **no son usuarios de Authentication**: son registros comerciales.

## Cambios principales

### SUPER ADMIN
- Dashboard global.
- CRUD de empresas con filtros por texto, estado y país.
- Centro de control por empresa: datos comerciales, ubicación internacional, personalización visual, módulos habilitados y configuración general.
- Administradores por empresa con creación de cuenta Firebase, contraseña fuerte y correo de verificación.
- Planes, licencias y módulos.
- Auditoría global, notificaciones globales, seguridad y respaldos JSON.

### EMPRESA
- Usuarios, roles y permisos.
- Sucursales con catálogo de 249 países y más de 5.000 subdivisiones ISO.
- Categorías, marcas y productos con CRUD, filtros y eliminación controlada.
- Productos con SKU, código de barras e imagen mediante Firebase Storage.
- Inventario, movimientos y alertas de stock mínimo.
- Proveedores, compras e historial.
- Clientes, POS, ventas, comprobante imprimible y anulación con reversión de stock.
- Promociones, devoluciones y métodos de pago.
- Cajas, movimientos y gastos.
- Cuentas por cobrar/pagar y registro de pagos.
- Reportes de ventas, compras, inventario y finanzas con exportación CSV.
- Notificaciones y auditoría.

### Seguridad
- Verificación obligatoria de correo para iniciar sesión.
- Contraseñas nuevas: mínimo 10 caracteres, mayúscula, minúscula, número, carácter especial y sin espacios.
- Reglas Firestore con aislamiento por `empresaId` y permisos por rol.
- Reglas Storage para imágenes de productos y branding.
- Las operaciones históricas (ventas, compras, movimientos) no se borran físicamente: se anulan o conservan por integridad y auditoría.

## Diseño
- Glassmorphism oscuro y tarjetas con profundidad 3D.
- Animaciones y transiciones con Framer Motion.
- Hover tridimensional en tarjetas y productos.
- Control de zoom flotante.
- Paleta de navegación `Ctrl + K`.
- Interfaz responsive.

## Instalación

1. Conserva tu `.env` actual o copia `.env.example` a `.env` y completa las variables.
2. Elimina cualquier `node_modules` copiado desde otro sistema operativo.
3. Ejecuta:

```bash
npm install
npm run dev
```

Para compilar:

```bash
npm run build
```

## Firebase

En Firebase Console:

1. Authentication > Sign-in method > habilita **Email/Password**.
2. Firestore Database > Rules > pega `firestore.rules` y publica.
3. Storage > Rules > pega `storage.rules` y publica.
4. Verifica que el bucket configurado en `.env` sea correcto.

### Usuarios existentes y verificación

Desde esta versión, un usuario con `emailVerified == false` no podrá entrar. Al intentar iniciar sesión se intentará reenviar automáticamente un correo de verificación.

### Creación de usuarios desde Web

La versión universitaria crea ADMIN/TRABAJADOR usando una instancia secundaria de Firebase Auth para no cerrar la sesión del administrador actual. Para un entorno productivo real, la creación/eliminación de cuentas debe migrarse a **Cloud Functions + Firebase Admin SDK**, porque la administración de Authentication no debe depender únicamente del cliente web.

## Planes, licencias y módulos

Conceptualmente:

```text
MÓDULO = funcionalidad existente
PLAN = conjunto de módulos + límites
LICENCIA = asignación de un plan a una empresa y su vigencia
EMPRESA = recibe módulos del plan y puede tener ajustes específicos desde SUPER_ADMIN
```

El centro de control por empresa guarda excepciones en `modulosEmpresa/{empresaId}`.

## Ubicación internacional

`src/data/locations.js` fue generado con datos ISO de países y subdivisiones. La ciudad/municipio queda como texto libre para no depender de una API externa ni una API key.

## Nota sobre CRUD y borrado

Los catálogos simples permiten eliminación definitiva. En documentos históricos o sensibles (ventas, compras, movimientos, usuarios) se conserva el registro y se usa estado/anulación/desactivación. Esto evita romper referencias y mantiene trazabilidad.
