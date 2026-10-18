import {
  useEffect,
  useState
} from "react";

import {
  Bell,
  Building2,
  LogOut
} from "lucide-react";

import {
  doc,
  getDoc
} from "firebase/firestore";

import { useNavigate } from "react-router-dom";

import useAuth from "../../hooks/useAuth";

import { db } from "../../services/firebase/firebaseConfig";

function Header() {
  const {
    usuario,
    cerrarSesion
  } = useAuth();

  const navigate = useNavigate();

  const [
    nombreRol,
    setNombreRol
  ] = useState("");

  useEffect(() => {
    let activo = true;

    const cargarRol = async () => {
      if (!usuario) return;

      if (
        usuario.tipoUsuario === "TRABAJADOR" &&
        usuario.rolId
      ) {
        try {
          const snapshot = await getDoc(
            doc(
              db,
              "rolesEmpresa",
              usuario.rolId
            )
          );

          if (!activo) return;

          if (snapshot.exists()) {
            setNombreRol(
              snapshot.data().nombre ||
              "Trabajador"
            );
          } else {
            setNombreRol("Trabajador");
          }

        } catch (error) {
          console.error(error);

          if (activo) {
            setNombreRol("Trabajador");
          }
        }

        return;
      }

      if (usuario.tipoUsuario === "ADMIN") {
        setNombreRol("Administrador");
        return;
      }

      setNombreRol(
        usuario.tipoUsuario || ""
      );
    };

    cargarRol();

    return () => {
      activo = false;
    };

  }, [
    usuario?.tipoUsuario,
    usuario?.rolId
  ]);

  const salir = async () => {
    await cerrarSesion();

    navigate("/login");
  };

  return (
    <header className="admin-header">

      <div>
        <span className="admin-header-label">
          PANEL EMPRESARIAL
        </span>
      </div>

      <div className="admin-header-right">

        <button
          className="admin-icon-button"
          title="Notificaciones"
        >
          <Bell size={19} />
        </button>

        <div className="admin-user">

          <div className="admin-avatar">
            <Building2 size={19} />
          </div>

          <div>

            <strong>
              {usuario?.nombreCompleto}
            </strong>

            <span>
              {nombreRol}
            </span>

          </div>

        </div>

        <button
          className="admin-logout"
          onClick={salir}
        >
          <LogOut size={17} />
          Salir
        </button>

      </div>

    </header>
  );
}

export default Header;