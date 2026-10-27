import test from "node:test";
import assert from "node:assert/strict";
import { createNetwork } from "../src/network.js";
import { TUNNEL, tunnelPath, tunnelClearance, bridgeAt, valleyHeight, tunnelAt } from "../src/structure-layout.js";
const n = createNetwork();
test("both tunnel bores follow the original measured track continuously", () => {
  for (const lane of [0, 1]) {
    const points = tunnelPath(n, lane);
    assert.equal(points.length, 41);
    for (let i = 1; i < points.length; i++) assert.ok(Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z) < 5);
  }
});
test("curved loading gauge clears 94mm envelope, 15mm wide rolling stock below 50mm", () => {
  const overhang = Math.hypot(249, 47) - 249;
  assert.ok(tunnelClearance(7.5 + overhang) > 50);
  assert.ok(TUNNEL.capBottom > tunnelClearance(0));
  for (const radius of [249, 282]) assert.ok(radius + 16 < 315 - 9);
});
test("third running line stays outside the roof and sidewalls", () => {
  for (let i = 0; i < 40; i++) {
    const a = 0.45 + i * 0.6 / 40;
    assert.equal(tunnelAt(1122 + 315 * Math.sin(a), 350 - 315 * Math.cos(a)), false);
  }
});
test("level bridge spans an actual lowering of the terrain without changing track data", () => {
  const before = JSON.stringify(n);
  assert.ok(bridgeAt(416, 68));
  assert.equal(valleyHeight(416, 68), -16);
  assert.equal(valleyHeight(390, 68), 0.35);
  assert.equal(JSON.stringify(n), before);
  assert.ok(n.edges["L1-0"].points.every((p) => p.z === 68));
});
