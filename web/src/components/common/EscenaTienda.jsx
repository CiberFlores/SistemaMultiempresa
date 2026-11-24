// Tienda de Arca Nova con la persiana abajo y un letrero colgante.
// "bloqueo" muestra un candado; "mantenimiento", una llave y conos.
export default function EscenaTienda({ tipo = "bloqueo", letrero }) {
  const obra = tipo === "mantenimiento";
  const franjas = Array.from({ length: 8 }, (_, i) => i);

  return (
    <svg className="et" data-tipo={tipo} viewBox="0 0 480 330" role="img" aria-label={letrero}>
      <ellipse cx="240" cy="312" rx="218" ry="13" fill="#1e0724" opacity=".28" />

      <rect x="58" y="84" width="364" height="226" rx="10" fill="#5b1468" />
      <rect x="58" y="84" width="364" height="226" rx="10" fill="none" stroke="#2c0335" strokeWidth="5" />
      <rect x="42" y="300" width="396" height="14" rx="5" fill="#2c0335" />

      <rect x="92" y="120" width="296" height="182" rx="6" fill="#e6ddd6" />
      {Array.from({ length: 10 }, (_, i) => (
        <rect key={i} x="92" y={124 + i * 18} width="296" height="4" fill="#c9b8c9" />
      ))}
      <rect x="92" y="290" width="296" height="12" rx="3" fill="#8a4fa0" />
      <rect x="224" y="286" width="32" height="10" rx="5" fill="#42054e" />

      <g>
        <rect x="40" y="52" width="400" height="26" rx="8" fill="#42054e" />
        {franjas.map((i) => (
          <path key={i} d={`M${40 + i * 50} 76h50v38a25 25 0 0 1-50 0z`} fill={i % 2 ? "#fcf7f5" : "#fe7c01"} stroke="#42054e" strokeWidth="2.5" />
        ))}
        <path d="M40 76h400v12H40z" fill="#1e0724" opacity=".16" />
      </g>

      <path d="M240 8l7 20 20 7-20 7-7 20-7-20-20-7 20-7z" fill="#ffd479" className="et__brillo" />

      <g className="et__letrero">
        <path d="M240 128L178 168M240 128l62 40" stroke="#2c0335" strokeWidth="4" strokeLinecap="round" />
        <circle cx="240" cy="128" r="7" fill="#fe7c01" />
        <rect x="132" y="166" width="216" height="92" rx="16" fill={obra ? "#ffd479" : "#42054e"} stroke="#fe7c01" strokeWidth="5" />
        <text x="266" y="219" textAnchor="middle" fontFamily='"Fraunces", Georgia, serif' fontSize={letrero.length > 9 ? 21 : 27} fontWeight="650" fill={obra ? "#42054e" : "#fcf7f5"}>
          {letrero}
        </text>
        {obra ? (
          <g transform="translate(160 212) rotate(-38)">
            <rect x="-5" y="-12" width="10" height="38" rx="5" fill="#42054e" />
            <path d="M-13-28a14 14 0 1 0 26 0l-6 9H-7z" fill="#42054e" />
          </g>
        ) : (
          <g>
            <path d="M157 204v-8a12 12 0 0 1 24 0v8" fill="none" stroke="#fe7c01" strokeWidth="6" />
            <rect x="150" y="203" width="38" height="31" rx="7" fill="#fe7c01" />
            <circle cx="169" cy="218" r="4.5" fill="#42054e" />
          </g>
        )}
      </g>

      {obra &&
        [86, 394].map((x) => (
          <g key={x} transform={`translate(${x} 0)`}>
            <path d="M-9 256h18l14 48h-46z" fill="#fe7c01" />
            <path d="M-13 270h26l5 14h-36z" fill="#fcf7f5" />
            <rect x="-30" y="302" width="60" height="10" rx="4" fill="#42054e" />
          </g>
        ))}
    </svg>
  );
}
