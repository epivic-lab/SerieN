import canonical from "./canonical-layout.json" with {type:"json"};
// Shared hard surfaces: level ground, vegetation exclusion and rendered paving.
const HARDSTANDING = Object.freeze([
  {id:'goods-apron',x:655,z:355,w:140,d:47},
  {id:'maintenance-apron',x:450,z:335,w:70,d:24},
  {id:'goods-loading-dock',x:565,z:355,w:34,d:32},
  {id:'station-forecourt',x:750,z:489,w:154,d:18},
  {id:'farm-lane',x:1144,z:225,w:196,d:8},
  {id:'farm-access',x:1174,z:214,w:8,d:20},
  {id:'farmyard',x:1220,z:208,w:42,d:28}
].map(Object.freeze));
function seeded(seed = 7342) {
  return () => {
    seed = Math.imul(seed, 1664525) + 1013904223 >>> 0;
    return seed / 4294967296;
  };
}
function clearance(network, buildings = []) {
  const segments = Object.values(network.edges).flatMap((e) => e.points.slice(1).map((p, i) => [e.points[i], p]));
  const track = (x, z) => {
    let best = Infinity;
    for (const [a, b] of segments) {
      const dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)));
      best = Math.min(best, Math.hypot(x - a.x - t * dx, z - a.z - t * dz));
    }
    return best;
  };
  const building = (x, z, pad = 0) => buildings.some((b) => Math.abs(x - b.x) < b.w / 2 + pad && Math.abs(z - b.z) < b.d / 2 + pad);
  const road = (x, z) => x > 135 && x < 1165 && z > 478 && z < 522;
  const height = (x, z) => {
    if (building(x, z, 14) || road(x, z) || HARDSTANDING.some(p=>Math.abs(x-p.x)<=p.w/2+5&&Math.abs(z-p.z)<=p.d/2+5)) return 0.35;
    const d = track(x, z), fade = Math.max(0, Math.min(1, (d - 19) / 35));
    const bump = (cx, cz, rx, rz) => Math.exp(-(((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2));
    const h = 36 * bump(1190, 430, 145, 90) + 29 * bump(215, 405, 105, 76)
      + 22 * bump(760, 385, 175, 55) + 14 * bump(475, 350, 95, 65);
    // Broad intersecting ridges keep the hills continuous while avoiding
    // identical smooth mounds. Fade remains exactly zero at railway edges.
    const ridges=2.2*Math.sin(x*.018+Math.sin(z*.022))*Math.cos(z*.027)+1.1*Math.sin(x*.041-z*.016);
    const relief=Math.max(0,h*(.94+.07*Math.sin(x*.011+z*.014))+ridges);
    return 0.35 + relief * fade * fade * (3 - 2 * fade);
  };
  return { track, building, road, height };
}
function forestSites(mask) {
  const rnd = seeded(), trees = [];
  const clusters = [[230, 400, 115, 70], [730, 380, 155, 65], [1220, 440, 110, 85], [1250, 180, 75, 65], [235, 170, 85, 70], [800, 16, 260, 22]];
  for (let i = 0; i < 12000 && trees.length < 185; i++) {
    const x = 18 + rnd() * 1464, z = 15 + rnd() * 670;
    const density = clusters.reduce((m, [cx, cz, rx, rz]) => Math.max(m, Math.exp(-(((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2))), 0.07);
    const clearing = Math.hypot((x - 600) / 110, (z - 370) / 65) < 1;
    const h = 30 + rnd() * 37, radius = h * .5;
    if (rnd() > density || clearing || x-radius<3 || x+radius>1497 || z-radius<3 || z+radius>697
      || mask.track(x, z) < 18 + radius || mask.building(x, z, radius+4) || mask.road(x, z)
      || canonical.controllers.some(c=>Math.hypot(x-c.x,z-c.z)<40+radius)
      || x > 590 && x < 915 && z > 510) continue;
    if (Array.from({length:9},(_,i)=>i===8?[x,z]:[x+Math.cos(i*Math.PI/4)*radius,z+Math.sin(i*Math.PI/4)*radius])
      .some(([px,pz])=>mask.reserved?.(px,pz)||mask.road(px,pz))) continue;
    if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < (t.h+h)*.26)) continue;
    trees.push({ x, z, y: mask.height(x, z), h, radius, pine: rnd() < 0.28, hue: rnd(), rotation: rnd() * Math.PI * 2, species: ["maple", "beech", "oak", "birch"][Math.floor(rnd() * 4)] });
  }
  return trees;
}
export {
  clearance,
  forestSites,
  seeded,
  HARDSTANDING
};
