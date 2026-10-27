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
    if (building(x, z, 14) || road(x, z)) return 0.35;
    const d = track(x, z), fade = Math.max(0, Math.min(1, (d - 19) / 35));
    const bump = (cx, cz, rx, rz) => Math.exp(-(((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2));
    const h = 30 * bump(1100, 438, 130, 95) + 22 * bump(245, 394, 105, 72) + 15 * bump(720, 372, 150, 48);
    return 0.35 + h * fade * fade * (3 - 2 * fade);
  };
  return { track, building, road, height };
}
function forestSites(mask) {
  const rnd = seeded(), trees = [];
  const clusters = [[230, 380, 110, 65], [730, 370, 135, 60], [1220, 445, 120, 100], [1200, 165, 100, 90], [250, 165, 90, 80], [800, 20, 260, 28]];
  for (let i = 0; i < 6e3 && trees.length < 155; i++) {
    const x = 18 + rnd() * 1464, z = 15 + rnd() * 670;
    const density = clusters.reduce((m, [cx, cz, rx, rz]) => Math.max(m, Math.exp(-(((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2))), 0.07);
    const clearing = Math.hypot((x - 600) / 110, (z - 370) / 65) < 1;
    if (rnd() > density || clearing || mask.reserved?.(x, z) || mask.track(x, z) < 28 || mask.building(x, z, 24) || mask.road(x, z) || x > 600 && x < 905 && z > 520) continue;
    if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < 19)) continue;
    trees.push({ x, z, y: mask.height(x, z), h: 38 + rnd() * 35, pine: rnd() < 0.23, hue: rnd(), rotation: rnd() * Math.PI * 2, species: ["maple", "beech", "oak", "birch"][Math.floor(rnd() * 4)] });
  }
  return trees;
}
export {
  clearance,
  forestSites,
  seeded
};
