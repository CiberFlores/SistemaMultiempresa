# Arca Nova · Sistema web multiempresa de ventas e inventario

Proyecto de Sistemas I. Varias empresas usan la misma aplicación y cada una ve solo sus datos.

- **Aplicación publicada:** https://sistema-multiempresa.web.app
- **Integrantes:** Joel Axel Flores Coyo y José Manuel Yanarico Quispe
- **Docente:** Ing. Christian Max Montaño Salvatierra

## Tipos de usuario

| Usuario | Qué hace |
| --- | --- |
| Super Admin | Administra la plataforma: empresas, administradores, módulos, personalización visual, auditoría, notificaciones y respaldos. |
| Admin | Administra su empresa: configuración, sucursales, roles, trabajadores y la operación diaria. |
| Trabajador | Usa solo las funciones que su rol le permite. |

Los clientes de una empresa no inician sesión.

## Funciones

- **Acceso:** inicio de sesión con correo y contraseña, verificación de correo y recuperación de contraseña.
- **Catálogo:** categorías, marcas y productos con precio, código de barras e imagen.
- **Inventario:** existencias por sucursal, lotes con vencimiento, movimientos y alertas de stock.
- **Compras:** proveedores, compras al contado o a crédito e historial.
- **Ventas:** punto de venta con pago en efectivo, QR o tarjeta (simulado, sin pasarela bancaria), comprobante imprimible, anulación y promociones.
- **Caja y finanzas:** apertura y cierre de caja, movimientos, gastos y cuentas por pagar a proveedores.
- **Reportes:** ventas, compras, inventario y finanzas, exportables a Excel o a PDF (impresión).
- **App en el celular:** la web se puede instalar como aplicación (PWA), con el logo de cada empresa.

## Tecnologías

| Parte | Herramienta |
| --- | --- |
| Interfaz | React 19, Vite 8, React Router, Framer Motion, Chart.js |
| Usuarios | Firebase Authentication |
| Base de datos | Cloud Firestore, con reglas de seguridad |
| Imágenes | Cloudinary |
| Publicación | Firebase Hosting |

No hay un servidor propio: la aplicación se conecta directamente a Firebase y las reglas de Firestore controlan quién puede leer y escribir.

## Cómo ejecutarlo

### 1. Requisitos

- [Node.js](https://nodejs.org) 22.13 o superior (incluye `npm`).
- Git.
- Acceso al proyecto de Firebase `sistema-multiempresa`, o un proyecto propio.

### 2. Descargar e instalar

```bash
git clone https://github.com/CiberFlores/SistemaMultiempresa.git
cd SistemaMultiempresa/web
npm install
```

### 3. Configurar Firebase

El archivo `.env` no está en el repositorio. Se crea copiando el ejemplo, dentro de la carpeta `web`:

```bash
cp .env.example .env
```

Se completan sus valores con los de la consola de Firebase: **Configuración del proyecto → General → Tus apps → Configuración del SDK**.

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Las imágenes se suben a la cuenta de Cloudinary del proyecto. Para usar otra, se agregan `VITE_CLOUDINARY_CLOUD_NAME` y `VITE_CLOUDINARY_UPLOAD_PRESET` (un preset de subida sin firma).

### 4. Iniciar

```bash
npm run dev
```

La terminal muestra la dirección local, normalmente http://localhost:5173.

## Usar un proyecto de Firebase nuevo

Solo hace falta si no se usa el proyecto `sistema-multiempresa`.

1. Crear el proyecto y registrar una app web.
2. En **Authentication**, activar el método **Correo electrónico/contraseña**.
3. Crear la base **Firestore Database**.
4. Publicar las reglas desde la carpeta `web`:
   ```bash
   npx firebase-tools login
   npx firebase-tools deploy --only firestore:rules --project ID_DEL_PROYECTO
   ```
5. Crear el primer Super Admin a mano:
   - En **Authentication**, agregar un usuario y copiar su UID.
   - En Firestore, crear el documento `usuarios/{UID}` con `tipoUsuario` = `"SUPER_ADMIN"` (texto), `estado` = `true` (booleano), `nombreCompleto` y `correo`.
   - Iniciar sesión. La primera vez llega un correo de verificación que hay que confirmar.

Desde ese usuario se crean las empresas y sus administradores.

## Comandos

Se ejecutan dentro de `web`.

| Comando | Para qué |
| --- | --- |
| `npm run dev` | Ejecutar en la computadora |
| `npm run build` | Generar la versión final en `web/dist` |
| `npm run preview` | Probar la versión final |
| `npm run lint` | Revisar el código |

## Publicar

```bash
npm run build
npx firebase-tools deploy --only hosting,firestore:rules --project sistema-multiempresa
```

## Carpetas

```
web/
├── public/            logo, iconos y archivos de la app instalable
├── src/
│   ├── pages/         pantallas, agrupadas por módulo
│   ├── components/    piezas reutilizables
│   ├── services/      lectura y escritura en Firebase y Cloudinary
│   ├── routes/        rutas y control de acceso
│   ├── context/       sesión del usuario
│   ├── hooks/  utils/  data/  styles/
├── firestore.rules    reglas de seguridad de la base de datos
├── storage.rules      reglas de Firebase Storage
├── firebase.json      configuración de publicación
└── .env.example       variables que hay que completar
```
