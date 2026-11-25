import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Download, LoaderCircle } from "lucide-react";

import useInstalarApp from "../../hooks/useInstalarApp";
import useMarcaEmpresa from "../../hooks/useMarcaEmpresa";
import { iconoDeEmpresa } from "../../utils/appMovilMarca";
import { detectarNavegador, pasosDeInstalacion } from "../../utils/instalacionApp";

import "../../styles/instalar-app.css";

const ESPERA_MS = 7000;

// Página propia de instalación: aquí el celular ya tiene el nombre, el icono y la
// dirección de ESTA empresa, así cada empresa se instala como una app distinta.
export default function InstalarAppPage({ empresaId }) {
  const marca = useMarcaEmpresa();
  const navigate = useNavigate();
  const navegador = detectarNavegador();
  const { disponible, instalada, resultado, instalar } = useInstalarApp();
  const [tarde, setTarde] = useState(false);

  useEffect(() => {
    const reloj = setTimeout(() => setTarde(true), ESPERA_MS);
    return () => clearTimeout(reloj);
  }, []);

  const lista = instalada || resultado === "instalada";
  const guia = !lista && (navegador.ios || navegador.dentroDeApp || navegador.firefox || resultado === "manual" || (tarde && !disponible));
  const primario = marca.tema.primario;

  return (
    <main className="ia" style={{ "--ia-p": primario, "--ia-on": marca.tema.sobrePrimario }}>
      <section>
        <span className="ia__icono">
          <img src={iconoDeEmpresa(marca.logoUrl, 192)} alt="" />
        </span>

        <h1>{lista ? "App instalada" : `Instala ${marca.nombre}`}</h1>
        <p>{lista ? "Búscala en tu pantalla de inicio. Puede tardar unos segundos en aparecer." : "Tu negocio en el celular, con tu logo y tus colores."}</p>

        {lista ? (
          <span className="ia__listo">
            <Check size={20} aria-hidden="true" /> Listo
          </span>
        ) : (
          !guia && (
            <button type="button" className="ia__boton" onClick={instalar} disabled={!disponible || resultado === "esperando"}>
              {disponible ? <Download size={20} aria-hidden="true" /> : <LoaderCircle className="ia__gira" size={20} aria-hidden="true" />}
              {resultado === "esperando" ? "Confirma en la ventana…" : disponible ? "Instalar ahora" : "Preparando la app…"}
            </button>
          )
        )}

        {guia && (
          <div className="ia__guia" role="status">
            {disponible && (
              <button type="button" className="ia__boton" onClick={instalar}>
                <Download size={20} aria-hidden="true" /> Intentar otra vez
              </button>
            )}
            <strong>Instálala desde el menú del navegador</strong>
            <ol>
              {pasosDeInstalacion(navegador).slice(navegador.chrome && !navegador.ios && !navegador.dentroDeApp ? 1 : 0).map((paso) => (
                <li key={paso}>{paso}</li>
              ))}
            </ol>
            {navegador.android && (
              <p>
                <b>¿Ya tenías instalada la app de otra empresa?</b> Las versiones de antes chocan con esta. Desinstálala (mantén pulsado su
                icono y elige «Desinstalar»), vuelve aquí y recarga la página.
              </p>
            )}
          </div>
        )}

        <button type="button" className="ia__volver" onClick={() => navigate(lista ? `/admin-movil/${empresaId}` : "/empresa/app-movil", { replace: true })}>
          <ArrowLeft size={17} aria-hidden="true" /> {lista ? "Ver el panel aquí" : "Volver"}
        </button>
      </section>
    </main>
  );
}
