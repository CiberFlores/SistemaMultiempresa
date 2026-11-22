// Escenas ilustrativas de la bienvenida, dibujadas en SVG con la paleta del logo.
// Cada elemento entra con un retraso (--d) para que la escena "se arme" sola.

const CIRUELA = "#42054E";
const CIRUELA_OSCURO = "#2C0335";
const CIRUELA_VIDRIO = "#4A1456";
const NARANJA = "#FE7C01";
const CREMA = "#FFF9F0";
const LUZ = "#FFD28A";

const retraso = (ms) => ({ "--d": `${ms}ms` });

function Destello({ x, y, tam = 16, d }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${tam / 24})`}>
      <path
        className="esc-spark"
        style={retraso(d)}
        d="M12 0c.9 6.4 4.6 10.6 12 12-7.4 1.4-11.1 5.6-12 12-.9-6.4-4.6-10.6-12-12C7.4 10.6 11.1 6.4 12 0Z"
        fill={NARANJA}
      />
    </g>
  );
}

// Toldo de rayas con festón, como el del logo
function Toldo({ x, ancho, y, rayas, d }) {
  const franja = ancho / rayas;

  return (
    <g className="esc-drop" style={retraso(d)}>
      <rect x={x - 6} y={y - 14} width={ancho + 12} height={14} rx={4} fill={CIRUELA} />

      {Array.from({ length: rayas }, (_, i) => (
        <rect
          key={`r${i}`}
          x={x + i * franja}
          y={y}
          width={franja + 0.4}
          height={26}
          fill={i % 2 ? CREMA : NARANJA}
        />
      ))}

      {Array.from({ length: rayas }, (_, i) => (
        <circle
          key={`c${i}`}
          cx={x + franja / 2 + i * franja}
          cy={y + 26}
          r={franja / 2}
          fill={i % 2 ? CREMA : NARANJA}
          stroke={CIRUELA}
          strokeWidth={3}
        />
      ))}
    </g>
  );
}

function Suelo() {
  return <rect x={0} y={252} width={420} height={48} fill={CIRUELA_OSCURO} />;
}

// ---------------------------------------------------------------
// DUEÑO DE EMPRESA · una tienda que abre
// ---------------------------------------------------------------

export function EscenaTienda() {
  return (
    <svg viewBox="0 0 420 300" aria-hidden="true" focusable="false">
      <Suelo />

      <g className="esc-rise" style={retraso(450)}>
        <rect x={86} y={112} width={248} height={140} rx={8} fill={CREMA} />

        {/* Vitrina */}
        <rect x={106} y={154} width={124} height={82} rx={8} fill={CIRUELA_VIDRIO} />
        <rect
          className="esc-lit"
          style={retraso(1300)}
          x={106}
          y={154}
          width={124}
          height={82}
          rx={8}
          fill={LUZ}
        />
        <rect x={110} y={200} width={116} height={4} rx={2} fill={CIRUELA} />

        {[130, 158, 186, 212].map((cx, i) => (
          <ellipse
            key={cx}
            className="esc-pop"
            style={retraso(1500 + i * 90)}
            cx={cx}
            cy={190}
            rx={12}
            ry={9}
            fill={i % 2 ? "#E8892C" : NARANJA}
          />
        ))}

        {[122, 150, 178, 206].map((x, i) => (
          <rect
            key={x}
            className="esc-pop"
            style={retraso(1650 + i * 90)}
            x={x}
            y={212}
            width={16}
            height={22}
            rx={4}
            fill={i % 2 ? CIRUELA : NARANJA}
          />
        ))}

        {/* Puerta */}
        <rect x={252} y={154} width={64} height={98} rx={6} fill={CIRUELA} />
        <rect x={262} y={164} width={44} height={50} rx={4} fill={CIRUELA_VIDRIO} />
        <circle cx={304} cy={214} r={3} fill={NARANJA} />
      </g>

      <Toldo x={76} ancho={268} y={100} rayas={6} d={250} />

      {/* Letrero del negocio */}
      <g className="esc-pop" style={retraso(900)}>
        <rect x={146} y={50} width={128} height={28} rx={10} fill={NARANJA} />
        <text
          x={210}
          y={69}
          textAnchor="middle"
          fontSize={14}
          fontWeight={800}
          letterSpacing={1.5}
          fill={CIRUELA}
        >
          ARCA NOVA
        </text>
      </g>

      {/* Cartel de la puerta: de CERRADO a ABIERTO */}
      <g className="esc-flip-out" style={retraso(1800)}>
        <rect x={264} y={176} width={40} height={20} rx={4} fill={CREMA} />
        <text x={284} y={189.5} textAnchor="middle" fontSize={7.5} fontWeight={800} fill={CIRUELA}>
          CERRADO
        </text>
      </g>

      <g className="esc-flip-in" style={retraso(2060)}>
        <rect x={264} y={176} width={40} height={20} rx={4} fill={NARANJA} />
        <text x={284} y={189.5} textAnchor="middle" fontSize={7.5} fontWeight={800} fill={CIRUELA}>
          ABIERTO
        </text>
      </g>

      <rect x={246} y={250} width={76} height={6} rx={3} fill={NARANJA} />

      <Destello x={40} y={70} tam={20} d={1100} />
      <Destello x={360} y={96} tam={26} d={1250} />
      <Destello x={366} y={200} tam={14} d={1400} />
    </svg>
  );
}

// ---------------------------------------------------------------
// SUPER ADMIN · varios negocios conectados
// ---------------------------------------------------------------

function Local({ x, ancho, alto, rayas, d, luz }) {
  const arriba = 252 - alto;
  const ventana = (ancho - 36) / 2;

  return (
    <g>
      <g className="esc-rise" style={retraso(d)}>
        <rect x={x} y={arriba} width={ancho} height={alto} rx={6} fill={CREMA} />

        {[0, 1].map((i) => (
          <g key={i}>
            <rect
              x={x + 12 + i * (ventana + 12)}
              y={arriba + 46}
              width={ventana}
              height={alto - 74}
              rx={5}
              fill={CIRUELA_VIDRIO}
            />
            <rect
              className="esc-lit"
              style={retraso(luz + i * 160)}
              x={x + 12 + i * (ventana + 12)}
              y={arriba + 46}
              width={ventana}
              height={alto - 74}
              rx={5}
              fill={LUZ}
            />
          </g>
        ))}

        <rect x={x + ancho / 2 - 8} y={252 - 22} width={16} height={22} rx={3} fill={CIRUELA} />
      </g>

      <Toldo x={x} ancho={ancho} y={arriba + 14} rayas={rayas} d={d - 150} />
    </g>
  );
}

export function EscenaRed() {
  return (
    <svg viewBox="0 0 420 300" aria-hidden="true" focusable="false">
      <Suelo />

      {/* Conexiones entre los negocios */}
      <path
        className="esc-draw"
        style={retraso(1500)}
        pathLength={1}
        d="M 75 132 Q 140 48 210 82 Q 280 48 345 118"
        fill="none"
        stroke={NARANJA}
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray="1"
      />

      {[
        [75, 132, 1500],
        [210, 82, 1900],
        [345, 118, 2300]
      ].map(([cx, cy, d]) => (
        <circle
          key={cx}
          className="esc-pop"
          style={retraso(d)}
          cx={cx}
          cy={cy}
          r={7}
          fill={CREMA}
          stroke={NARANJA}
          strokeWidth={3}
        />
      ))}

      <Local x={22} ancho={106} alto={106} rayas={4} d={400} luz={1200} />
      <Local x={152} ancho={116} alto={150} rayas={5} d={650} luz={1400} />
      <Local x={292} ancho={106} alto={118} rayas={4} d={900} luz={1600} />

      {/* Corona sobre el negocio central */}
      <g className="esc-pop" style={retraso(2000)}>
        <path
          d="M190 60 L198 36 L210 52 L222 36 L230 60 Z"
          fill={NARANJA}
          stroke={CIRUELA}
          strokeWidth={3}
          strokeLinejoin="round"
        />
      </g>

      <Destello x={30} y={50} tam={18} d={1000} />
      <Destello x={372} y={60} tam={24} d={1200} />
    </svg>
  );
}

// ---------------------------------------------------------------
// TRABAJADOR · el mostrador listo para atender
// ---------------------------------------------------------------

export function EscenaMostrador() {
  return (
    <svg viewBox="0 0 420 300" aria-hidden="true" focusable="false">
      <Suelo />

      {/* Estantería de fondo */}
      <g className="esc-rise" style={retraso(350)}>
        <rect x={40} y={60} width={340} height={116} rx={10} fill={CIRUELA_VIDRIO} />
        <rect x={52} y={104} width={316} height={5} rx={2.5} fill={CREMA} />
        <rect x={52} y={150} width={316} height={5} rx={2.5} fill={CREMA} />

        {[64, 100, 136, 172, 208, 244, 280, 316].map((x, i) => (
          <rect
            key={x}
            className="esc-pop"
            style={retraso(800 + i * 80)}
            x={x}
            y={i % 2 ? 76 : 70}
            width={26}
            height={i % 2 ? 28 : 34}
            rx={6}
            fill={i % 3 === 0 ? NARANJA : i % 3 === 1 ? CREMA : "#E8892C"}
          />
        ))}

        {[70, 118, 166, 214, 262, 310].map((x, i) => (
          <circle
            key={x}
            className="esc-pop"
            style={retraso(1100 + i * 80)}
            cx={x + 12}
            cy={136}
            r={13}
            fill={i % 2 ? CREMA : NARANJA}
          />
        ))}
      </g>

      {/* Lámpara que se enciende */}
      <g className="esc-pop" style={retraso(1300)}>
        <line x1={210} y1={0} x2={210} y2={30} stroke={CREMA} strokeWidth={3} />
        <path d="M188 52 Q210 22 232 52 Z" fill={NARANJA} stroke={CIRUELA} strokeWidth={3} strokeLinejoin="round" />
        <circle className="esc-lit" style={retraso(1450)} cx={210} cy={58} r={9} fill={LUZ} />
      </g>

      {/* Mostrador */}
      <g className="esc-rise" style={retraso(250)}>
        <rect x={24} y={190} width={372} height={66} rx={10} fill={CREMA} />
        <rect x={16} y={180} width={388} height={16} rx={8} fill={NARANJA} stroke={CIRUELA} strokeWidth={3} />
        <rect x={44} y={214} width={332} height={5} rx={2.5} fill={CIRUELA} opacity={0.18} />
      </g>

      {/* Caja registradora */}
      <g className="esc-rise" style={retraso(1000)}>
        <rect x={226} y={128} width={110} height={54} rx={8} fill={CIRUELA} />
        <rect x={238} y={110} width={64} height={30} rx={6} fill={CIRUELA_OSCURO} />
        <rect x={244} y={116} width={52} height={18} rx={3} fill={CREMA} />
        <text x={270} y={129.5} textAnchor="middle" fontSize={11} fontWeight={800} fill={CIRUELA}>
          29.50
        </text>
        {[250, 266, 282, 298, 314].map((x, i) => (
          <circle key={x} cx={x} cy={158} r={5} fill={i === 4 ? NARANJA : CREMA} />
        ))}
      </g>

      {/* Campanilla */}
      <g className="esc-rise" style={retraso(1400)}>
        <path d="M82 180 Q82 150 108 150 Q134 150 134 180 Z" fill={NARANJA} stroke={CIRUELA} strokeWidth={3} strokeLinejoin="round" />
        <rect x={74} y={176} width={68} height={8} rx={4} fill={CIRUELA} />
        <circle cx={108} cy={144} r={5} fill={CIRUELA} />
      </g>

      {/* Ondas de la campanilla */}
      <path className="esc-ring" style={retraso(2000)} d="M72 150 Q64 164 72 178" fill="none" stroke={CREMA} strokeWidth={3} strokeLinecap="round" />
      <path className="esc-ring" style={retraso(2150)} d="M144 150 Q152 164 144 178" fill="none" stroke={CREMA} strokeWidth={3} strokeLinecap="round" />

      {/* Bolsa lista para entregar */}
      <g className="esc-pop" style={retraso(1800)}>
        <path d="M346 150 L394 150 L390 180 L350 180 Z" fill={NARANJA} stroke={CIRUELA} strokeWidth={3} strokeLinejoin="round" />
        <path d="M358 150 Q358 136 370 136 Q382 136 382 150" fill="none" stroke={CIRUELA} strokeWidth={3} />
      </g>

      <Destello x={30} y={48} tam={18} d={1100} />
      <Destello x={372} y={48} tam={24} d={1250} />
    </svg>
  );
}
