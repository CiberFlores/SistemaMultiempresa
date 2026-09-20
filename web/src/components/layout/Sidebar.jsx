import { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import {
  Boxes,
  Building2,
  CircleDollarSign,
  FolderTree,
  Gauge,
  PackageSearch,
  Palette,
  ReceiptText,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Store,
  Tags,
  UserRound,
  UsersRound
} from "lucide-react";
import { NavLink } from "react-router-dom";

import useAuth from "../../hooks/useAuth";
import { db } from "../../services/firebase/firebaseConfig";

const enlaces = [
  { to: "/dashboard", label: "Dashboard", icon: Gauge },

  { to: "/empresa/configuracion", label: "Configuración", icon: Settings2, soloAdmin: true },
  { to: "/empresa/personalizacion", label: "Personalización", icon: Palette, soloAdmin: true },
  { to: "/empresa/sucursales", label: "Sucursales", icon: Store, soloAdmin: true },

  { to: "/usuarios/roles", label: "Roles y permisos", icon: ShieldCheck, soloAdmin: true },
  { to: "/usuarios/trabajadores", label: "Trabajadores", icon: UsersRound, soloAdmin: true },

  { to: "/inventario/categorias", label: "Categorías", icon: FolderTree, permiso: "categorias.gestionar" },
  { to: "/inventario/marcas", label: "Marcas", icon: Tags, permiso: "marcas.gestionar" },
  { to: "/inventario/productos", label: "Productos", icon: PackageSearch, permiso: "productos.gestionar" },
  { to: "/inventario", label: "Inventario", icon: Boxes, permiso: "inventario.ver" },

  { to: "/clientes", label: "Clientes", icon: UserRound, permiso: "clientes.gestionar" },

  { to: "/compras/proveedores", label: "Proveedores", icon: Building2, permiso: "proveedores.gestionar" },
  { to: "/compras", label: "Compras", icon: ShoppingBag, permiso: "compras.gestionar" },

  { to: "/ventas/cajas", label: "Cajas", icon: CircleDollarSign, permiso: "caja.gestionar" },
  { to: "/ventas/pos", label: "Punto de venta", icon: ShoppingCart, permiso: "ventas.registrar" },
  { to: "/ventas", label: "Ventas", icon: ReceiptText, permiso: "ventas.ver" }
];

function Sidebar() {
  const { usuario } = useAuth();
  const [permisos, setPermisos] = useState([]);

  useEffect(() => {
    let activo = true;

    async function cargarPermisos() {
      if (usuario?.tipoUsuario !== "TRABAJADOR" || !usuario?.rolId) {
        if (activo) setPermisos([]);
        return;
      }

      try {
        const snapshot = await getDoc(
          doc(db, "rolesEmpresa", usuario.rolId)
        );

        if (!activo) return;

        if (
          snapshot.exists() &&
          snapshot.data().estado === "ACTIVO" &&
          snapshot.data().empresaId === usuario.empresaId
        ) {
          setPermisos(snapshot.data().permisos || []);
        } else {
          setPermisos([]);
        }
      } catch (error) {
        console.error("Error cargando permisos del sidebar:", error);
        if (activo) setPermisos([]);
      }
    }

    cargarPermisos();

    return () => {
      activo = false;
    };
  }, [usuario]);

  const visibles = useMemo(() => {
    if (usuario?.tipoUsuario === "ADMIN") {
      return enlaces;
    }

    return enlaces.filter((enlace) => {
      if (enlace.to === "/dashboard") return true;
      if (enlace.soloAdmin) return false;
      return enlace.permiso && permisos.includes(enlace.permiso);
    });
  }, [usuario, permisos]);

  return (
    <aside className="admin-sidebar">
      <div className="admin-brand">
        <div className="admin-brand-logo">
          <Building2 size={20} />
        </div>

        <div>
          <strong>MultiEmpresa</strong>
          <span>
            {usuario?.tipoUsuario === "TRABAJADOR"
              ? "Panel trabajador"
              : "Panel empresarial"}
          </span>
        </div>
      </div>

      <div className="admin-menu-title">
        OPERACIONES
      </div>

      <nav className="admin-nav">
        {visibles.map((enlace) => {
          const Icono = enlace.icon;

          return (
            <NavLink
              key={enlace.to}
              to={enlace.to}
              end={enlace.to === "/dashboard"}
              className={({ isActive }) =>
                isActive
                  ? "admin-nav-item active"
                  : "admin-nav-item"
              }
            >
              <Icono size={18} />
              <span>{enlace.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="admin-sidebar-bottom">
        <ShieldCheck size={16} />
        <span>Entorno protegido</span>
      </div>
    </aside>
  );
}

export default Sidebar;
