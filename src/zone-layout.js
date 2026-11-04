import { seeded, HARDSTANDING } from "./landscape.js";
const FARM = Object.freeze({ id: "farmhouse", kind: "building", x: 1174, z: 183, w: 76, d: 46, h: 34 });
const GOODS_OFFICE = Object.freeze({ id: "goods-office", kind: "building", x: 520, z: 355, w: 58, d: 34, h: 26 });
const VINEYARD = Object.freeze({ id: "vineyard", kind: "reserve", x: 1050, z: 186, w: 140, d: 56 });
import canonical from "./canonical-layout.json" with {type:"json"};
const switchPoints=canonical.controllers.map((c)=>[c.x,c.z]);
function safeScenicPosition(mask, x, z, radius = 0, extraBuildings = []) {
  return mask.track(x, z) >= 18 + radius && !mask.building(x, z, radius + 4) && !mask.road(x, z) && !extraBuildings.some((b) => Math.abs(x - b.x) < b.w / 2 + radius + 5 && Math.abs(z - b.z) < b.d / 2 + radius + 5) && switchPoints.every(([sx, sz]) => Math.hypot(x - sx, z - sz) >= 40 + radius);
}
function buildZoneLayout(network, mask) {
  const buildings = [FARM, GOODS_OFFICE].map((b) => ({ ...b }));
  const random = seeded(40852), cargo = [];
  // Two loading rows leave a continuous 16mm working aisle on the main apron.
  const cargoSites=[...Array.from({length:18},(_,i)=>[595+i%9*15,340+Math.floor(i/9)*30]),
    ...Array.from({length:5},(_,i)=>[422+i*14,335])];
  for (const [x,z] of cargoSites) {
    const radius = 7;
    if (!safeScenicPosition(mask, x, z, radius, buildings) || cargo.some((p) => Math.hypot(p.x - x, p.z - z) < 13)) continue;
    cargo.push({ id: `cargo-${cargo.length}`, x, z, y: mask.height(x, z), radius, type: ["crates", "barrels", "pallets", "rails"][cargo.length % 4], rotation: (random() - 0.5) * 0.12 });
  }
  const vineyard = [];
  for (let x = 984; x <= 1119; x += 15) for (let z = 161; z <= 211; z += 10) {
    if (!safeScenicPosition(mask, x, z, 4, buildings)) continue;
    vineyard.push({ x, z, y: mask.height(x, z), row: Math.round((x - 984) / 15), post: (z - 161) % 30 === 0 });
  }
  const stops = [], pendingStops = [];
  for (const edge of Object.values(network.edges)) for (const [end, key] of [[0, edge.from], [1, edge.to]]) {
    if (network.nodes[key].length !== 1) continue;
    const point = end ? edge.points.at(-1) : edge.points[0], previous = end ? edge.points.at(-2) : edge.points[1];
    const length = Math.hypot(point.x - previous.x, point.z - previous.z), dx = (point.x - previous.x) / length, dz = (point.z - previous.z) / length;
    // A buffer is placed at the actual terminal, never on a fictitious 34mm
    // rail extension. The simulator checks the full consist envelope.
    stops.push({edge:edge.id,node:key,x:point.x,z:point.z,dx,dz,angle:-Math.atan2(dz,dx),beamOffset:0});
  }
  const people = [640, 670, 812, 850].map((x, i) => ({ x, z: 550 + i % 2 * 2, y: 4.5, h: 9.6 + i % 3 * 0.45, color: ["#5f6551", "#6b4c3b", "#476277", "#7b4740"][i] }));
  const luggage = [{ x: 652, z: 553 }, { x: 824, z: 551 }];
  return { buildings, cargo, vineyard, stops, pendingStops, people, luggage, footprints: [...buildings, { ...VINEYARD }, ...HARDSTANDING.map(p=>({...p,kind:'reserve'})), ...cargo.map((p) => ({ id: p.id, kind: "reserve", x: p.x, z: p.z, w: 16, d: 16 }))] };
}
export {
  FARM,
  GOODS_OFFICE,
  VINEYARD,
  buildZoneLayout,
  safeScenicPosition
};
