import { seeded } from "./landscape.js";
const FARM = Object.freeze({ id: "farmhouse", kind: "building", x: 1020, z: 430, w: 76, d: 46, h: 34 });
const GOODS_OFFICE = Object.freeze({ id: "goods-office", kind: "building", x: 520, z: 355, w: 58, d: 34, h: 26 });
const VINEYARD = Object.freeze({ id: "vineyard", kind: "reserve", x: 1160, z: 442.5, w: 140, d: 65 });
const switchPoints = [[595, 84], [955, 51], [812, 101], [665, 168], [410, 284], [410, 310], [825, 247], [880, 247]];
function safeScenicPosition(mask, x, z, radius = 0, extraBuildings = []) {
  return mask.track(x, z) >= 18 + radius && !mask.building(x, z, radius + 4) && !mask.road(x, z) && !extraBuildings.some((b) => Math.abs(x - b.x) < b.w / 2 + radius + 5 && Math.abs(z - b.z) < b.d / 2 + radius + 5) && switchPoints.every(([sx, sz]) => Math.hypot(x - sx, z - sz) >= 40 + radius);
}
function buildZoneLayout(network, mask) {
  const buildings = [FARM, GOODS_OFFICE].map((b) => ({ ...b }));
  const random = seeded(40852), cargo = [];
  for (let i = 0; i < 600 && cargo.length < 34; i++) {
    const x = 290 + random() * 640, z = 320 + random() * 74, radius = 6;
    if (!safeScenicPosition(mask, x, z, radius, buildings) || cargo.some((p) => Math.hypot(p.x - x, p.z - z) < 17)) continue;
    cargo.push({ id: `cargo-${cargo.length}`, x, z, y: mask.height(x, z), radius, type: ["crates", "barrels", "pallets", "rails"][cargo.length % 4], rotation: (random() - 0.5) * 0.4 });
  }
  const vineyard = [];
  for (let x = 1092; x <= 1228; x += 15) for (let z = 414; z <= 470; z += 10) {
    if (!safeScenicPosition(mask, x, z, 2, buildings)) continue;
    vineyard.push({ x, z, y: mask.height(x, z), row: Math.round((x - 1092) / 15), post: (z - 414) % 30 === 0 });
  }
  const stops = [], pendingStops = [];
  for (const edge of Object.values(network.edges)) for (const [end, key] of [[0, edge.from], [1, edge.to]]) {
    if (network.nodes[key].length !== 1) continue;
    const point = end ? edge.points.at(-1) : edge.points[0], previous = end ? edge.points.at(-2) : edge.points[1];
    const length = Math.hypot(point.x - previous.x, point.z - previous.z), dx = (point.x - previous.x) / length, dz = (point.z - previous.z) / length;
    const stop = { edge: edge.id, x: point.x, z: point.z, dx, dz, angle: -Math.atan2(dz, dx), beamOffset: 34 };
    const allOther = Object.values(network.edges).filter((e) => e.id !== edge.id);
    const distance = (x, z) => {
      let best = Infinity;
      for (const e of allOther) for (let i = 1; i < e.points.length; i++) {
        const a = e.points[i - 1], b = e.points[i], vx = b.x - a.x, vz = b.z - a.z, t = Math.max(0, Math.min(1, ((x - a.x) * vx + (z - a.z) * vz) / (vx * vx + vz * vz || 1)));
        best = Math.min(best, Math.hypot(x - a.x - t * vx, z - a.z - t * vz));
      }
      return best;
    };
    const samples = [];
    for (const along of [32, 35, 40, 46]) for (const across of [-10, 0, 10]) samples.push({ x: point.x + dx * along - dz * across, z: point.z + dz * along + dx * across });
    const minClearance = Math.min(...samples.map((p) => distance(p.x, p.z)));
    if (minClearance >= 12) stops.push({ ...stop, minClearance });
    else pendingStops.push({ ...stop, minClearance, reason: "Offset buffer volume would interfere with another running track" });
  }
  const people = [640, 670, 812, 850].map((x, i) => ({ x, z: 550 + i % 2 * 2, y: 4.5, h: 9.6 + i % 3 * 0.45, color: ["#5f6551", "#6b4c3b", "#476277", "#7b4740"][i] }));
  const luggage = [{ x: 652, z: 553 }, { x: 824, z: 551 }];
  return { buildings, cargo, vineyard, stops, pendingStops, people, luggage, footprints: [...buildings, { ...VINEYARD }, { id: "goods-apron", kind: "reserve", x: 655, z: 355, w: 140, d: 47 }, ...cargo.map((p) => ({ id: p.id, kind: "reserve", x: p.x, z: p.z, w: 16, d: 16 }))] };
}
export {
  FARM,
  GOODS_OFFICE,
  VINEYARD,
  buildZoneLayout,
  safeScenicPosition
};
