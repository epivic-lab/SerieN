import { sample } from "./network.js";
const BRIDGE = { x: 416, z: 68, width: 38, depth: 28, bottom: -16, deckY: 0.15 };
const TUNNEL = { start: 0.45, end: 1.05, halfWidth: 14, archCenter: 48, outerHalfWidth: 16, innerRadius: 249, outerRadius: 282, capBottom: 65 };
function tunnelPath(network, lane) {
  const edge = network.edges[`L${lane}-return`], radius = [249, 282][lane];
  return Array.from({ length: 41 }, (_, i) => sample(edge, radius * (TUNNEL.start + (TUNNEL.end - TUNNEL.start) * i / 40)));
}
function tunnelAt(x, z) {
  const r = Math.hypot(x - 1122, z - 350), a = Math.atan2(x - 1122, 350 - z);
  return a >= TUNNEL.start && a <= TUNNEL.end && r >= 233 && r <= 298;
}
function bridgeAt(x, z) {
  return Math.abs(x - BRIDGE.x) < BRIDGE.width / 2 && Math.abs(z - BRIDGE.z) < BRIDGE.depth / 2;
}
function valleyHeight(x, z) {
  if (!bridgeAt(x, z)) return 0.35;
  const u = (x - BRIDGE.x) / (BRIDGE.width / 2), v = (z - BRIDGE.z) / (BRIDGE.depth / 2);
  return 0.35 + (BRIDGE.bottom - 0.35) * (1 - u * u) * (1 - v * v);
}
function tunnelClearance(lateral) {
  if (Math.abs(lateral) > TUNNEL.halfWidth) return -Infinity;
  return TUNNEL.archCenter + Math.sqrt(TUNNEL.halfWidth ** 2 - lateral ** 2);
}
export {
  BRIDGE,
  TUNNEL,
  bridgeAt,
  tunnelAt,
  tunnelClearance,
  tunnelPath,
  valleyHeight
};
