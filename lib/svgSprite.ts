// lib/svgSprite.ts
export function svgPlaceholderFor(id: number, fid: number, label = "TamaBot") {
  // deterministic hues from fid
  const hue = (fid * 37) % 360;
  const hue2 = (fid * 53) % 360;
  const bg = `hsl(${hue} 45% 16%)`;
  const fg = `hsl(${hue2} 70% 62%)`;
  const text = label.length > 14 ? label.slice(0, 14) + "…" : label;

  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='1024' height='1024'>
      <defs>
        <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0%' stop-color='${bg}'/>
          <stop offset='100%' stop-color='${fg}'/>
        </linearGradient>
      </defs>
      <rect width='100%' height='100%' fill='url(#g)'/>
      <g transform='translate(512 520)'>
        <circle cx='0' cy='-40' r='240' fill='rgba(255,255,255,0.10)' stroke='rgba(255,255,255,0.25)' stroke-width='6'/>
        <circle cx='-70' cy='-80' r='32' fill='white'/>
        <circle cx='70' cy='-80' r='32' fill='white'/>
        <rect x='-90' y='-10' width='180' height='18' rx='9' fill='rgba(0,0,0,0.35)'/>
      </g>
      <text x='512' y='950' font-size='64' text-anchor='middle' font-family='Inter, system-ui' fill='white' opacity='0.9'>
        #${id} ${text}
      </text>
    </svg>`
  )}`;
}
