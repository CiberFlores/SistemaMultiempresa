import "../../styles/empresa-identidad.css";
import { normalizarHex, textoSobre } from "../../utils/identidadEmpresa";

// Logo de la empresa; si no tiene, muestra su inicial con su color
function LogoEmpresa({ logoUrl, nombre, color = "#FE7C01", tamano = 44, className = "" }) {
  const fondo = normalizarHex(color, "#FE7C01");
  const inicial = (nombre || "?").trim().charAt(0).toUpperCase();

  return (
    <span
      className={`idv-logo ${className}`.trim()}
      style={{
        width: tamano,
        height: tamano,
        fontSize: Math.round(tamano * 0.46),
        background: logoUrl ? "rgba(255,249,240,0.96)" : fondo,
        color: textoSobre(fondo)
      }}
    >
      {logoUrl ? <img src={logoUrl} alt="" /> : inicial}
    </span>
  );
}

export default LogoEmpresa;
