const fs=require('fs');
const defs=`<defs><linearGradient id="g" x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0" stop-color="#B03BEA"/><stop offset="1" stop-color="#5B0F8F"/></linearGradient><linearGradient id="o" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#FF8A14"/><stop offset="1" stop-color="#FFA83D"/></linearGradient></defs>`;
const mark=(o={})=>{const hole=o.hole||'#2E0A47',gap=o.gap||'#fff';return `
<g stroke-linejoin="round" stroke-linecap="round">
<polygon points="100,28 170,164 30,164" fill="url(#g)" stroke="url(#g)" stroke-width="30"/>
<polygon points="100,64 139,148 61,148" fill="${hole}" stroke="${hole}" stroke-width="18"/>
</g>
<g fill="#fff" transform="translate(-10 -42) scale(1.1)"><path d="M78 96h9l4 8h34l-8 22H98z" /><path d="M78 96h9" stroke="#fff" stroke-width="5" stroke-linecap="round"/><circle cx="101" cy="133" r="5"/><circle cx="123" cy="133" r="5"/></g>
<path d="M20 172C64 128 128 146 184 98C178 130 142 152 102 160C68 166 40 168 20 172Z" fill="url(#o)" stroke="${gap}" stroke-width="6" paint-order="stroke" stroke-linejoin="round"/>`};
const font=`font-family="Nunito,Poppins,'Segoe UI',Arial,sans-serif" font-weight="900"`;
const word=(a,b,x)=>`<text x="${x}" y="150" font-size="104" ${font} letter-spacing="-3"><tspan fill="${a}">Arca</tspan><tspan fill="${b}">Nova</tspan></text><path d="M${x+392} 52l6 15 15 6-15 6-6 15-6-15-15-6 15-6z" fill="#FF8A14"/>`;
const w=(vb,body,bg)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${defs}${bg||''}${body}</svg>`;
fs.writeFileSync('icon.svg',w('0 0 200 200',mark()));
fs.writeFileSync('logo-horizontal.svg',w('0 0 770 200',mark()+word('#2E0A47','#FF8A14',210)));
fs.writeFileSync('logo-dark.svg',w('0 0 770 200',mark({hole:'#1E0630',gap:'#1E0630'})+word('#FFF6EC','#FF8A14',210),'<rect width="770" height="200" rx="28" fill="#1E0630"/>'));
// favicon: sin carrito, mas grueso
fs.writeFileSync('favicon.svg',w('0 0 200 200','<rect width="200" height="200" rx="44" fill="#4A0F78"/><g transform="translate(18 14) scale(.82)"><g stroke-linejoin="round"><polygon points="100,28 170,164 30,164" fill="#fff" stroke="#fff" stroke-width="30"/><polygon points="100,78 128,142 72,142" fill="#4A0F78" stroke="#4A0F78" stroke-width="16"/></g><path d="M20 172C64 128 128 146 184 98C178 130 142 152 102 160C68 166 40 168 20 172Z" fill="#FF8A14" stroke="#4A0F78" stroke-width="7" paint-order="stroke" stroke-linejoin="round"/></g>'));
// monocromatica
const mono=mark({hole:'#fff',gap:'#fff'}).replace(/url\(#g\)/g,'#222').replace(/url\(#o\)/g,'#222').replace(/<g fill="#fff">/,'<g fill="#fff">').replace(/fill="#2E0A47"|fill="#fff" stroke="#fff"/,'$&');
fs.writeFileSync('logo-mono.svg',w('0 0 770 200',mono.replace(/<polygon points="100,70[^>]*>/,'<polygon points="100,70 133,146 67,146" fill="#fff" stroke="#fff" stroke-width="18"/>')+word('#222','#222',210).replace('#FF8A14','#222')));
fs.writeFileSync('preview.html',`<body style="margin:0;padding:24px;background:#f6f2fa;font:14px sans-serif;display:grid;gap:16px;grid-template-columns:repeat(2,1fr)"><div><img src=logo-horizontal.svg width=100%></div><div><img src=logo-dark.svg width=100%></div><div style="background:#fff"><img src=logo-mono.svg width=100%></div><div style="display:flex;gap:24px;align-items:end"><img src=icon.svg width=160><img src=favicon.svg width=96><img src=favicon.svg width=32><img src=favicon.svg width=16></div></body>`);
