import test from "node:test";
import assert from "node:assert/strict";
import { createNetwork } from "../src/network.js";
import { bridgeAt, valleyHeight } from "../src/structure-layout.js";
const n = createNetwork();
test("level bridge spans an actual lowering of the terrain without changing track data", () => {
  const before = JSON.stringify(n);
  assert.ok(bridgeAt(416, 68));
  assert.equal(valleyHeight(416, 68), -16);
  assert.equal(valleyHeight(390, 68), 0.35);
  assert.equal(JSON.stringify(n), before);
  assert.ok(n.edges["L1-0"].points.every((p) => p.z === 68));
});
