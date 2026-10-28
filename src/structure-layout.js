const BRIDGE = { x: 750, z: 665, width: 38, depth: 28, bottom: -16, deckY: 0.15 };
function bridgeAt(x, z) {
  return Math.abs(x - BRIDGE.x) < BRIDGE.width / 2 && Math.abs(z - BRIDGE.z) < BRIDGE.depth / 2;
}
function valleyHeight(x, z) {
  if (!bridgeAt(x, z)) return 0.35;
  const u = (x - BRIDGE.x) / (BRIDGE.width / 2), v = (z - BRIDGE.z) / (BRIDGE.depth / 2);
  return 0.35 + (BRIDGE.bottom - 0.35) * (1 - u * u) * (1 - v * v);
}
export { BRIDGE, bridgeAt, valleyHeight };
