import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute.jsx";
import RoleRoute from "./RoleRoute.jsx";
import PermissionRoute from "./PermissionRoute.jsx";
import SuperAdminLayout from "../layouts/SuperAdminLayout.jsx";
import DashboardLayout from "../layouts/DashboardLayout.jsx";
import LoginPage from "../pages/auth/LoginPage.jsx";
import ForgotPasswordPage from "../pages/auth/ForgotPasswordPage.jsx";
import DashboardGlobalPage from "../pages/superadmin/DashboardGlobalPage.jsx";
import EmpresasPage from "../pages/superadmin/EmpresasPage.jsx";
import AdministradoresPage from "../pages/superadmin/AdministradoresPage.jsx";
import EmpresaControlPage from "../pages/superadmin/EmpresaControlPage.jsx";
import PlanesPage from "../pages/superadmin/PlanesPage.jsx";
import LicenciasPage from "../pages/superadmin/LicenciasPage.jsx";
import ModulosGlobalesPage from "../pages/superadmin/ModulosGlobalesPage.jsx";
import AuditoriaGlobalPage from "../pages/superadmin/AuditoriaGlobalPage.jsx";
import NotificacionesGlobalesPage from "../pages/superadmin/NotificacionesGlobalesPage.jsx";
import SeguridadPage from "../pages/superadmin/SeguridadPage.jsx";
import RespaldosPage from "../pages/superadmin/RespaldosPage.jsx";
import DashboardPage from "../pages/empresa/DashboardPage.jsx";
import ConfiguracionEmpresaPage from "../pages/empresa/ConfiguracionEmpresaPage.jsx";
import SucursalesPage from "../pages/empresa/SucursalesPage.jsx";
import RolesEmpresaPage from "../pages/usuarios/RolesEmpresaPage.jsx";
import TrabajadoresPage from "../pages/usuarios/TrabajadoresPage.jsx";
import SeguridadCuentaPage from "../pages/usuarios/SeguridadCuentaPage.jsx";
import CategoriasPage from "../pages/inventario/CategoriasPage.jsx";
import MarcasPage from "../pages/inventario/MarcasPage.jsx";
import ProductosPage from "../pages/inventario/ProductosPage.jsx";
import InventarioPage from "../pages/inventario/InventarioPage.jsx";
import MovimientosInventarioPage from "../pages/inventario/MovimientosInventarioPage.jsx";
import StockAlertasPage from "../pages/inventario/StockAlertasPage.jsx";
import ClientesPage from "../pages/clientes/ClientesPage.jsx";
import ProveedoresPage from "../pages/compras/ProveedoresPage.jsx";
import ComprasPage from "../pages/compras/ComprasPage.jsx";
import HistorialComprasPage from "../pages/compras/HistorialComprasPage.jsx";
import CajasPage from "../pages/ventas/CajasPage.jsx";
import MovimientosCajaPage from "../pages/ventas/MovimientosCajaPage.jsx";
import PosPage from "../pages/ventas/PosPage.jsx";
import VentasPage from "../pages/ventas/VentasPage.jsx";
import DevolucionesPage from "../pages/ventas/DevolucionesPage.jsx";
import PromocionesPage from "../pages/ventas/PromocionesPage.jsx";
import MetodosPagoPage from "../pages/ventas/MetodosPagoPage.jsx";
import GastosPage from "../pages/finanzas/GastosPage.jsx";
import CuentasCobrarPage from "../pages/finanzas/CuentasCobrarPage.jsx";
import CuentasPagarPage from "../pages/finanzas/CuentasPagarPage.jsx";
import ReportesVentasPage from "../pages/reportes/ReportesVentasPage.jsx";
import ReportesComprasPage from "../pages/reportes/ReportesComprasPage.jsx";
import ReportesInventarioPage from "../pages/reportes/ReportesInventarioPage.jsx";
import ReportesFinanzasPage from "../pages/reportes/ReportesFinanzasPage.jsx";
import NotificacionesPage from "../pages/sistema/NotificacionesPage.jsx";
import AuditoriaPage from "../pages/sistema/AuditoriaPage.jsx";
import UnauthorizedPage from "../pages/UnauthorizedPage.jsx";
import NotFoundPage from "../pages/NotFoundPage.jsx";


export default function AppRoutes(){return <Routes>
  <Route path="/" element={<Navigate to="/login" replace/>}/><Route path="/login" element={<LoginPage/>}/><Route path="/recuperar-contrasena" element={<ForgotPasswordPage/>}/><Route path="/sin-permiso" element={<UnauthorizedPage/>}/>
  <Route element={<ProtectedRoute/>}>
    <Route element={<RoleRoute rolesPermitidos={["SUPER_ADMIN"]}/>}> <Route path="/superadmin" element={<SuperAdminLayout/>}>
      <Route index element={<Navigate to="dashboard" replace/>}/><Route path="dashboard" element={<DashboardGlobalPage/>}/><Route path="empresas" element={<EmpresasPage/>}/><Route path="empresas/:empresaId/control" element={<EmpresaControlPage/>}/><Route path="administradores" element={<AdministradoresPage/>}/><Route path="planes" element={<PlanesPage/>}/><Route path="licencias" element={<LicenciasPage/>}/><Route path="modulos" element={<ModulosGlobalesPage/>}/><Route path="auditoria" element={<AuditoriaGlobalPage/>}/><Route path="notificaciones" element={<NotificacionesGlobalesPage/>}/><Route path="seguridad" element={<SeguridadPage/>}/><Route path="respaldos" element={<RespaldosPage/>}/><Route path="mi-seguridad" element={<SeguridadCuentaPage/>}/>
    </Route></Route>
    <Route element={<RoleRoute rolesPermitidos={["ADMIN","TRABAJADOR"]}/>}> <Route element={<DashboardLayout/>}>
      <Route element={<PermissionRoute permiso="dashboard.ver"/>}><Route path="/dashboard" element={<DashboardPage/>}/></Route>
      <Route element={<RoleRoute rolesPermitidos={["ADMIN"]}/>}> <Route path="/empresa/configuracion" element={<ConfiguracionEmpresaPage/>}/><Route path="/empresa/sucursales" element={<SucursalesPage/>}/><Route path="/usuarios/roles" element={<RolesEmpresaPage/>}/><Route path="/usuarios/trabajadores" element={<TrabajadoresPage/>}/></Route>
      <Route element={<PermissionRoute permiso="categorias.gestionar"/>}><Route path="/inventario/categorias" element={<CategoriasPage/>}/></Route>
      <Route element={<PermissionRoute permiso="marcas.gestionar"/>}><Route path="/inventario/marcas" element={<MarcasPage/>}/></Route>
      <Route element={<PermissionRoute permiso="productos.gestionar"/>}><Route path="/inventario/productos" element={<ProductosPage/>}/></Route>
      <Route element={<PermissionRoute permiso="inventario.ver"/>}><Route path="/inventario" element={<InventarioPage/>}/><Route path="/inventario/movimientos" element={<MovimientosInventarioPage/>}/><Route path="/inventario/alertas" element={<StockAlertasPage/>}/></Route>
      <Route element={<PermissionRoute permiso="clientes.gestionar"/>}><Route path="/clientes" element={<ClientesPage/>}/></Route>
      <Route element={<PermissionRoute permiso="proveedores.gestionar"/>}><Route path="/compras/proveedores" element={<ProveedoresPage/>}/></Route>
      <Route element={<PermissionRoute permiso="compras.gestionar"/>}><Route path="/compras" element={<ComprasPage/>}/><Route path="/compras/historial" element={<HistorialComprasPage/>}/></Route>
      <Route element={<PermissionRoute permiso="caja.gestionar"/>}><Route path="/ventas/cajas" element={<CajasPage/>}/><Route path="/ventas/caja-movimientos" element={<MovimientosCajaPage/>}/><Route path="/finanzas/gastos" element={<GastosPage/>}/></Route>
      <Route element={<PermissionRoute permiso="ventas.registrar"/>}><Route path="/ventas/pos" element={<PosPage/>}/></Route>
      <Route element={<PermissionRoute permiso="ventas.ver"/>}><Route path="/ventas" element={<VentasPage/>}/><Route path="/ventas/devoluciones" element={<DevolucionesPage/>}/></Route>
      <Route element={<PermissionRoute permiso="promociones.gestionar"/>}><Route path="/ventas/promociones" element={<PromocionesPage/>}/></Route>
      <Route element={<PermissionRoute permiso="configuracion.gestionar"/>}><Route path="/ventas/metodos-pago" element={<MetodosPagoPage/>}/></Route>
      <Route element={<PermissionRoute permiso="finanzas.gestionar"/>}><Route path="/finanzas/cuentas-cobrar" element={<CuentasCobrarPage/>}/><Route path="/finanzas/cuentas-pagar" element={<CuentasPagarPage/>}/></Route>
      <Route element={<PermissionRoute permiso="reportes.ver"/>}><Route path="/reportes/ventas" element={<ReportesVentasPage/>}/><Route path="/reportes/compras" element={<ReportesComprasPage/>}/><Route path="/reportes/inventario" element={<ReportesInventarioPage/>}/><Route path="/reportes/finanzas" element={<ReportesFinanzasPage/>}/></Route>
      <Route element={<PermissionRoute permiso="notificaciones.ver"/>}><Route path="/sistema/notificaciones" element={<NotificacionesPage/>}/></Route>
      <Route element={<PermissionRoute permiso="auditoria.ver"/>}><Route path="/sistema/auditoria" element={<AuditoriaPage/>}/></Route>
      <Route path="/mi-cuenta/seguridad" element={<SeguridadCuentaPage/>}/>
    </Route></Route>
  </Route>
  <Route path="*" element={<NotFoundPage/>}/>
</Routes>}
