import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute.jsx";
import RoleRoute from "./RoleRoute.jsx";
import PermissionRoute from "./PermissionRoute.jsx";
import SuperAdminLayout from "../layouts/SuperAdminLayout.jsx";
import DashboardLayout from "../layouts/DashboardLayout.jsx";
import pagina from "./pagina.jsx";
import LoginPage from "../pages/auth/LoginPage.jsx";


const ForgotPasswordPage = pagina(() => import("../pages/auth/ForgotPasswordPage.jsx"));
const DashboardGlobalPage = pagina(() => import("../pages/superadmin/DashboardGlobalPage.jsx"));
const EmpresasPage = pagina(() => import("../pages/superadmin/EmpresasPage.jsx"));
const AdministradoresPage = pagina(() => import("../pages/superadmin/AdministradoresPage.jsx"));
const EmpresaControlPage = pagina(() => import("../pages/superadmin/EmpresaControlPage.jsx"));
const ModulosGlobalesPage = pagina(() => import("../pages/superadmin/ModulosGlobalesPage.jsx"));
const AuditoriaGlobalPage = pagina(() => import("../pages/superadmin/AuditoriaGlobalPage.jsx"));
const NotificacionesGlobalesPage = pagina(() => import("../pages/superadmin/NotificacionesGlobalesPage.jsx"));
const SeguridadPage = pagina(() => import("../pages/superadmin/SeguridadPage.jsx"));
const RespaldosPage = pagina(() => import("../pages/superadmin/RespaldosPage.jsx"));
const DashboardPage = pagina(() => import("../pages/empresa/DashboardPage.jsx"));
const ConfiguracionEmpresaPage = pagina(() => import("../pages/empresa/ConfiguracionEmpresaPage.jsx"));
const SucursalesPage = pagina(() => import("../pages/empresa/SucursalesPage.jsx"));
const RolesEmpresaPage = pagina(() => import("../pages/usuarios/RolesEmpresaPage.jsx"));
const TrabajadoresPage = pagina(() => import("../pages/usuarios/TrabajadoresPage.jsx"));
const AppMovilPage = pagina(() => import("../pages/empresa/AppMovilPage.jsx"));
const SeguridadCuentaPage = pagina(() => import("../pages/usuarios/SeguridadCuentaPage.jsx"));
const CategoriasPage = pagina(() => import("../pages/inventario/CategoriasPage.jsx"));
const MarcasPage = pagina(() => import("../pages/inventario/MarcasPage.jsx"));
const ProductosPage = pagina(() => import("../pages/inventario/ProductosPage.jsx"));
const InventarioPage = pagina(() => import("../pages/inventario/InventarioPage.jsx"));
const MovimientosInventarioPage = pagina(() => import("../pages/inventario/MovimientosInventarioPage.jsx"));
const StockAlertasPage = pagina(() => import("../pages/inventario/StockAlertasPage.jsx"));
const AccionCuentaPage = pagina(() => import("../pages/auth/AccionCuentaPage.jsx"));
const CuentaBloqueadaPage = pagina(() => import("../pages/auth/CuentaBloqueadaPage.jsx"));
const ProveedoresPage = pagina(() => import("../pages/compras/ProveedoresPage.jsx"));
const ComprasPage = pagina(() => import("../pages/compras/ComprasPage.jsx"));
const HistorialComprasPage = pagina(() => import("../pages/compras/HistorialComprasPage.jsx"));
const CajasPage = pagina(() => import("../pages/ventas/CajasPage.jsx"));
const MovimientosCajaPage = pagina(() => import("../pages/ventas/MovimientosCajaPage.jsx"));
const PosPage = pagina(() => import("../pages/ventas/PosPage.jsx"));
const VentasPage = pagina(() => import("../pages/ventas/VentasPage.jsx"));
const PromocionesPage = pagina(() => import("../pages/ventas/PromocionesPage.jsx"));
const GastosPage = pagina(() => import("../pages/finanzas/GastosPage.jsx"));
const CuentasCobrarPage = pagina(() => import("../pages/finanzas/CuentasCobrarPage.jsx"));
const CuentasPagarPage = pagina(() => import("../pages/finanzas/CuentasPagarPage.jsx"));
const ReportesVentasPage = pagina(() => import("../pages/reportes/ReportesVentasPage.jsx"));
const ReportesComprasPage = pagina(() => import("../pages/reportes/ReportesComprasPage.jsx"));
const ReportesInventarioPage = pagina(() => import("../pages/reportes/ReportesInventarioPage.jsx"));
const ReportesFinanzasPage = pagina(() => import("../pages/reportes/ReportesFinanzasPage.jsx"));
const NotificacionesPage = pagina(() => import("../pages/sistema/NotificacionesPage.jsx"));
const AuditoriaPage = pagina(() => import("../pages/sistema/AuditoriaPage.jsx"));
const UnauthorizedPage = pagina(() => import("../pages/UnauthorizedPage.jsx"));
const NotFoundPage = pagina(() => import("../pages/NotFoundPage.jsx"));

export default function AppRoutes(){return <Routes>
  <Route path="/" element={<Navigate to="/login" replace/>}/><Route path="/login" element={<LoginPage/>}/><Route path="/recuperar-contrasena" element={<ForgotPasswordPage/>}/><Route path="/sin-permiso" element={<UnauthorizedPage/>}/><Route path="/cuenta-bloqueada" element={<CuentaBloqueadaPage/>}/><Route path="/auth/accion" element={<AccionCuentaPage/>}/>
  <Route element={<ProtectedRoute/>}>
    <Route element={<RoleRoute rolesPermitidos={["SUPER_ADMIN"]}/>}> <Route path="/superadmin" element={<SuperAdminLayout/>}>
      <Route index element={<Navigate to="dashboard" replace/>}/><Route path="dashboard" element={<DashboardGlobalPage/>}/><Route path="empresas" element={<EmpresasPage/>}/><Route path="empresas/:empresaId/control" element={<EmpresaControlPage/>}/><Route path="administradores" element={<AdministradoresPage/>}/><Route path="modulos" element={<ModulosGlobalesPage/>}/><Route path="auditoria" element={<AuditoriaGlobalPage/>}/><Route path="notificaciones" element={<NotificacionesGlobalesPage/>}/><Route path="seguridad" element={<SeguridadPage/>}/><Route path="respaldos" element={<RespaldosPage/>}/><Route path="mi-seguridad" element={<SeguridadCuentaPage/>}/>
    </Route></Route>
    <Route element={<RoleRoute rolesPermitidos={["ADMIN","TRABAJADOR"]}/>}> <Route element={<DashboardLayout/>}>
      <Route element={<PermissionRoute permiso="dashboard.ver"/>}><Route path="/dashboard" element={<DashboardPage/>}/></Route>
      <Route element={<RoleRoute rolesPermitidos={["ADMIN"]}/>}> <Route path="/empresa/configuracion" element={<ConfiguracionEmpresaPage/>}/><Route path="/empresa/sucursales" element={<SucursalesPage/>}/><Route path="/empresa/app-movil" element={<AppMovilPage/>}/><Route path="/usuarios/roles" element={<RolesEmpresaPage/>}/><Route path="/usuarios/trabajadores" element={<TrabajadoresPage/>}/></Route>
      <Route element={<PermissionRoute permiso="categorias.gestionar"/>}><Route path="/inventario/categorias" element={<CategoriasPage/>}/></Route>
      <Route element={<PermissionRoute permiso="marcas.gestionar"/>}><Route path="/inventario/marcas" element={<MarcasPage/>}/></Route>
      <Route element={<PermissionRoute permiso="productos.gestionar"/>}><Route path="/inventario/productos" element={<ProductosPage/>}/></Route>
      <Route element={<PermissionRoute permiso="inventario.ver"/>}><Route path="/inventario" element={<InventarioPage/>}/><Route path="/inventario/movimientos" element={<MovimientosInventarioPage/>}/><Route path="/inventario/alertas" element={<StockAlertasPage/>}/></Route>
      <Route element={<PermissionRoute permiso="proveedores.gestionar"/>}><Route path="/compras/proveedores" element={<ProveedoresPage/>}/></Route>
      <Route element={<PermissionRoute permiso="compras.gestionar"/>}><Route path="/compras" element={<ComprasPage/>}/><Route path="/compras/historial" element={<HistorialComprasPage/>}/></Route>
      <Route element={<PermissionRoute permiso="caja.gestionar"/>}><Route path="/ventas/cajas" element={<CajasPage/>}/><Route path="/ventas/caja-movimientos" element={<MovimientosCajaPage/>}/><Route path="/finanzas/gastos" element={<GastosPage/>}/></Route>
      <Route element={<PermissionRoute permiso="ventas.registrar"/>}><Route path="/ventas/pos" element={<PosPage/>}/></Route>
      <Route element={<PermissionRoute permiso="ventas.ver"/>}><Route path="/ventas" element={<VentasPage/>}/></Route>
      <Route element={<PermissionRoute permiso="promociones.gestionar"/>}><Route path="/ventas/promociones" element={<PromocionesPage/>}/></Route>
      <Route element={<PermissionRoute permiso="finanzas.gestionar"/>}><Route path="/finanzas/cuentas-cobrar" element={<CuentasCobrarPage/>}/><Route path="/finanzas/cuentas-pagar" element={<CuentasPagarPage/>}/></Route>
      <Route element={<PermissionRoute permiso="reportes.ver"/>}><Route path="/reportes/ventas" element={<ReportesVentasPage/>}/><Route path="/reportes/compras" element={<ReportesComprasPage/>}/><Route path="/reportes/inventario" element={<ReportesInventarioPage/>}/><Route path="/reportes/finanzas" element={<ReportesFinanzasPage/>}/></Route>
      <Route element={<PermissionRoute permiso="notificaciones.ver"/>}><Route path="/sistema/notificaciones" element={<NotificacionesPage/>}/></Route>
      <Route element={<PermissionRoute permiso="auditoria.ver"/>}><Route path="/sistema/auditoria" element={<AuditoriaPage/>}/></Route>
      <Route path="/mi-cuenta/seguridad" element={<SeguridadCuentaPage/>}/>
    </Route></Route>
  </Route>
  <Route path="*" element={<NotFoundPage/>}/>
</Routes>}
