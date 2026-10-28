import test from "node:test";
import assert from "node:assert/strict";
import { createNetwork } from "../src/network.js";
import { bridgeAt, valleyHeight } from "../src/structure-layout.js";
const n = createNetwork();
test("level bridge spans an actual lowering of the terrain without changing track data", () => {
  const before = JSON.stringify(n);
  assert.ok(bridgeAt(750, 665));
  assert.equal(valleyHeight(750, 665), -16);
  assert.equal(valleyHeight(720, 665), 0.35);
  assert.equal(JSON.stringify(n), before);
  assert.ok(n.edges.T36.points.every((p) => Math.abs(p.z-665)<1e-8));
});
