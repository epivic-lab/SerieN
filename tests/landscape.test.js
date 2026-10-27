import test from "node:test";
import assert from "node:assert/strict";
import { createNetwork } from "../src/network.js";
import { clearance, forestSites, seeded } from "../src/landscape.js";
const network = createNetwork();
const buildings = [{ x: 750, z: 525, w: 135, d: 40 }, { x: 1033, z: 333, w: 125, d: 80 }];
const mask = clearance(network, buildings);
test("forest generation is deterministic with railway and building clearance", () => {
  const trees = forestSites(mask);
  assert.ok(trees.length > 70);
  assert.deepEqual(trees, forestSites(mask));
  for (const t of trees) {
    assert.ok(mask.track(t.x, t.z) >= 27);
    assert.ok(!mask.building(t.x, t.z, 24));
    assert.ok(!mask.road(t.x, t.z));
    assert.ok(Number.isFinite(t.y + t.h));
  }
});
test("terrain stays flat on tracks and underneath buildings", () => {
  for (const e of Object.values(network.edges)) for (const p of e.points) assert.equal(mask.height(p.x, p.z), 0.35);
  for (const b of buildings) assert.equal(mask.height(b.x, b.z), 0.35);
});
test("landscape heights remain finite and below scenic ceiling", () => {
  for (let x = 0; x <= 1500; x += 20) for (let z = 0; z <= 700; z += 20) {
    const y = mask.height(x, z);
    assert.ok(y >= 0.35 && y < 50);
  }
});
test("seeded random does not depend on frame rate or browser random state", () => {
  const a = seeded(73), b = seeded(73);
  for (let i = 0; i < 100; i++) assert.equal(a(), b());
});
