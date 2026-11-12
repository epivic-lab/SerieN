// Presentation geometry derived from Claude's frozen 100×100 gauge.
// Scale and needle consume the simulator's existing 0–150 layout-units/s readout.
// No demonstration state, timing, train logic or units are imported.
export function speedometerDefinitions(id) {
  return `<pattern id="${id}-spun" width="100" height="100" patternUnits="userSpaceOnUse"><image href="./ui/assets/textures/brass-spun.jpg" width="100" height="100" preserveAspectRatio="xMidYMid slice"/></pattern><radialGradient id="${id}-glass" cx=".35" cy=".25"><stop stop-color="#ffffff25"/><stop offset="1" stop-color="#00000030"/></radialGradient>`;
}
export function speedometer(id) {
  const point=(radius,angle)=>{const r=angle*Math.PI/180;return [(50+Math.sin(r)*radius).toFixed(2),(50-Math.cos(r)*radius).toFixed(2)];};
  let ticks='';
  for(let value=0;value<=150;value+=5){const a=-120+value/150*240,major=value%30===0,p=point(37,a),q=point(major?30:33,a),t=point(24,a);ticks+=`<path d="M${p.join(' ')}L${q.join(' ')}" stroke="currentColor" stroke-width="${major?1.1:.55}"/>`;if(major)ticks+=`<text x="${t[0]}" y="${Number(t[1])+1.5}" text-anchor="middle">${value}</text>`;}
  return `<svg class="gg u5-gauge" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="48.6" fill="#2a1d08"/><circle cx="50" cy="50" r="48" fill="url(#${id}-spun)"/><circle cx="50" cy="50" r="42.6" fill="#1a1308"/><circle class="gauge-face" cx="50" cy="50" r="40.6"/><circle cx="50" cy="50" r="40.6" fill="url(#${id}-glass)"/>${ticks}<text x="50" y="77" text-anchor="middle">LAYOUT/S</text><g class="u5-needle"><path d="M50 57L48.6 42 50 16 51.4 42Z" fill="#7a1d12"/><circle cx="50" cy="50" r="4" fill="url(#${id}-spun)" stroke="#1a1308" stroke-width=".6"/></g><path d="M16 38A38 38 0 0 1 80 20 50 40 0 0 0 16 38Z" fill="#fff" opacity=".2"/></svg>`;
}
