import {
  Navigate,
  Route,
  Routes
} from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute.jsx";
import RoleRoute from "./RoleRoute.jsx";
import PermissionRoute from "./PermissionRoute.jsx";

// ======================================================
// LAYOUTS
// ======================================================

import SuperAdminLayout from "../layouts/SuperAdminLayout.jsx";
import DashboardLayout from "../layouts/DashboardLayout.jsx";

// ======================================================
// PÁGINAS PÚBLICAS
// ======================================================

import LoginPage from "../pages/auth/LoginPage.jsx";
import ForgotPasswordPage from "../pages/auth/ForgotPasswordPage.jsx";

// ======================================================
// SUPER ADMIN
// ======================================================

import DashboardGlobalPage from "../pages/superadmin/DashboardGlobalPage.jsx";
import EmpresasPage from "../pages/superadmin/EmpresasPage.jsx";
import PlanesPage from "../pages/superadmin/PlanesPage.jsx";
import ModulosGlobalesPage from "../pages/superadmin/ModulosGlobalesPage.jsx";
import LicenciasPage from "../pages/superadmin/LicenciasPage.jsx";

// ======================================================
// EMPRESA
// ======================================================

import DashboardPage from "../pages/empresa/DashboardPage.jsx";
import ConfiguracionEmpresaPage from "../pages/empresa/ConfiguracionEmpresaPage.jsx";
import PersonalizacionPage from "../pages/empresa/PersonalizacionPage.jsx";
import SucursalesPage from "../pages/empresa/SucursalesPage.jsx";

// ======================================================
// USUARIOS
// ======================================================

import RolesEmpresaPage from "../pages/usuarios/RolesEmpresaPage.jsx";
import TrabajadoresPage from "../pages/usuarios/TrabajadoresPage.jsx";

// ======================================================
// INVENTARIO
// ======================================================

import CategoriasPage from "../pages/inventario/CategoriasPage.jsx";
import MarcasPage from "../pages/inventario/MarcasPage.jsx";
import ProductosPage from "../pages/inventario/ProductosPage.jsx";
import InventarioPage from "../pages/inventario/InventarioPage.jsx";

// ======================================================
// CLIENTES
// ======================================================

import ClientesPage from "../pages/clientes/ClientesPage.jsx";

// ======================================================
// COMPRAS
// ======================================================

import ProveedoresPage from "../pages/compras/ProveedoresPage.jsx";
import ComprasPage from "../pages/compras/ComprasPage.jsx";

// ======================================================
// VENTAS
// ======================================================

import CajasPage from "../pages/ventas/CajasPage.jsx";
import PosPage from "../pages/ventas/PosPage.jsx";
import VentasPage from "../pages/ventas/VentasPage.jsx";

// ======================================================
// ERRORES
// ======================================================

import UnauthorizedPage from "../pages/UnauthorizedPage.jsx";
import NotFoundPage from "../pages/NotFoundPage.jsx";

function AppRoutes() {
  return (
    <Routes>

      {/* ==================================================
          INICIO
          Al entrar a localhost:5173 redirige al login
      ================================================== */}

      <Route
        path="/"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />

      {/* ==================================================
          RUTAS PÚBLICAS
      ================================================== */}

      <Route
        path="/login"
        element={<LoginPage />}
      />

      <Route
        path="/recuperar-contrasena"
        element={<ForgotPasswordPage />}
      />

      <Route
        path="/sin-permiso"
        element={<UnauthorizedPage />}
      />

      {/* ==================================================
          RUTAS PROTEGIDAS
      ================================================== */}

      <Route element={<ProtectedRoute />}>

        {/* ==================================================
            SUPER ADMIN
        ================================================== */}

        <Route
          element={
            <RoleRoute
              rolesPermitidos={[
                "SUPER_ADMIN"
              ]}
            />
          }
        >
          <Route
            path="/superadmin"
            element={<SuperAdminLayout />}
          >
            <Route
              index
              element={
                <Navigate
                  to="dashboard"
                  replace
                />
              }
            />

            <Route
              path="dashboard"
              element={
                <DashboardGlobalPage />
              }
            />

            <Route
              path="empresas"
              element={
                <EmpresasPage />
              }
            />

            <Route
              path="planes"
              element={
                <PlanesPage />
              }
            />

            <Route
              path="licencias"
              element={
                <LicenciasPage />
              }
            />

            <Route
              path="modulos"
              element={
                <ModulosGlobalesPage />
              }
            />
          </Route>
        </Route>

        {/* ==================================================
            ADMIN + TRABAJADOR
        ================================================== */}

        <Route
          element={
            <RoleRoute
              rolesPermitidos={[
                "ADMIN",
                "TRABAJADOR"
              ]}
            />
          }
        >
          <Route
            element={
              <DashboardLayout />
            }
          >

            {/* ==============================================
                DASHBOARD
            ============================================== */}

            <Route
              path="/dashboard"
              element={
                <DashboardPage />
              }
            />

            {/* ==============================================
                SOLO ADMIN
            ============================================== */}

            <Route
              element={
                <RoleRoute
                  rolesPermitidos={[
                    "ADMIN"
                  ]}
                />
              }
            >

              <Route
                path="/empresa/configuracion"
                element={
                  <ConfiguracionEmpresaPage />
                }
              />

              <Route
                path="/empresa/personalizacion"
                element={
                  <PersonalizacionPage />
                }
              />

              <Route
                path="/empresa/sucursales"
                element={
                  <SucursalesPage />
                }
              />

              <Route
                path="/usuarios/roles"
                element={
                  <RolesEmpresaPage />
                }
              />

              <Route
                path="/usuarios/trabajadores"
                element={
                  <TrabajadoresPage />
                }
              />

            </Route>

            {/* ==============================================
                CATEGORÍAS
            ============================================== */}

            <Route
              element={
                <PermissionRoute
                  permiso="categorias.gestionar"
                />
              }
            >
              <Route
                path="/inventario/categorias"
                element={
                  <CategoriasPage />
                }
              />
            </Route>

            {/* ==============================================
                MARCAS
            ============================================== */}

            <Route
              element={
                <PermissionRoute
                  permiso="marcas.gestionar"
                />
              }
            >
              <Route
                path="/inventario/marcas"
                element={
                  <MarcasPage />
                }
              />
            </Route>

            {/* ==============================================
                PRODUCTOS
            ============================================== */}

            <Route
              element={
                <PermissionRoute
                  permiso="productos.gestionar"
                />
              }
            >
              <Route
                path="/inventario/productos"
                element={
                  <ProductosPage />
                }
              />
            </Route>

            {/* ==============================================
                INVENTARIO
            ============================================== */}

            <Route
              element={
                <PermissionRoute
                  permiso="inventario.ver"
                />
              }
            >
              <Route
                path="/inventario"
                element={
                  <InventarioPage />
                }
              />
            </Route>

            {/* ==============================================
                CLIENTES
            ============================================== */}

            <Route
              element={
                <PermissionRoute
                  permiso="clientes.gestionar"
                />
              }
            >
              <Route
                path="/clientes"
                element={
                  <ClientesPage />
                }
              />
            </Route>

            {/* ==============================================
                PROVEEDORES
            ============================================== */}

            <Route
              element={
                <PermissionRoute
                  permiso="proveedores.gestionar"
                />
              }
            >
              <Route
                path="/compras/proveedores"
                element={
                  <ProveedoresPage />
                }
              />
            </Route>

            {/* ==============================================
                COMPRAS
            ============================================== */}

            <Route
              element={
                <PermissionRoute
                  permiso="compras.gestionar"
                />
              }
            >
              <Route
                path="/compras"
                element={
                  <ComprasPage />
                }
              />
            </Route>

            {/* ==============================================
                CAJAS
            ============================================== */}

            <Route
              element={
                <PermissionRoute
                  permiso="caja.gestionar"
                />
              }
            >
              <Route
                path="/ventas/cajas"
                element={
                  <CajasPage />
                }
              />
            </Route>

            {/* ==============================================
                PUNTO DE VENTA
            ============================================== */}

            <Route
              element={
                <PermissionRoute
                  permiso="ventas.registrar"
                />
              }
            >
              <Route
                path="/ventas/pos"
                element={
                  <PosPage />
                }
              />
            </Route>

            {/* ==============================================
                HISTORIAL DE VENTAS
            ============================================== */}

            <Route
              element={
                <PermissionRoute
                  permiso="ventas.ver"
                />
              }
            >
              <Route
                path="/ventas"
                element={
                  <VentasPage />
                }
              />
            </Route>

          </Route>
        </Route>

      </Route>

      {/* ==================================================
          404
      ================================================== */}

      <Route
        path="*"
        element={
          <NotFoundPage />
        }
      />

    </Routes>
  );
}

export default AppRoutes;