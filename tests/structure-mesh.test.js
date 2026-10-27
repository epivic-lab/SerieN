import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createNetwork } from "../src/network.js";
import { railwayWorks } from "../src/railway-works.js";
import { TUNNEL } from "../src/structure-layout.js";
import { railGeometry, RAIL_PROFILE } from "../src/rail-profile.js";
const network = createNetwork();
function works() {
  const scene = new THREE.Scene(), foundation = new THREE.Mesh(new THREE.BoxGeometry(1500, 18, 700), new THREE.MeshStandardMaterial());
  scene.add(foundation);
  const w = railwayWorks(scene, network, { height: () => 0.35 }, foundation);
  scene.updateMatrixWorld(true);
  return w;
}
test("actual portal meshes leave clear body-sized openings in both directions", () => {
  const w = works();
  for (const radius of [249, 282]) for (const angle of [TUNNEL.start, TUNNEL.end]) for (const lateral of [-9, 0, 9]) for (const y of [8, 30, 50]) {
    const tangent = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)), p = new THREE.Vector3(1122 + (radius + lateral) * Math.sin(angle), y, 350 - (radius + lateral) * Math.cos(angle));
    const direction = angle === TUNNEL.start ? tangent : tangent.clone().negate(), origin = p.clone().addScaledVector(direction, -5);
    const ray = new THREE.Raycaster(origin, direction, 0, 10);
    assert.equal(ray.intersectObject(w.root, true).length, 0, `Portal obstruction at radius${radius}, y${y}, lateral${lateral}`);
  }
});
test("bridge spans an open space below deck, not a hidden solid foundation", () => {
  const w = works(), ray = new THREE.Raycaster(new THREE.Vector3(416, -2, 68), new THREE.Vector3(0, -1, 0), 0, 8);
  assert.equal(ray.intersectObject(w.root, true).length, 0);
});
test("rail profile rests on sleepers and preserves original railhead height", () => {
  assert.equal(Math.min(...RAIL_PROFILE.map((p2) => p2[1])), 3.55);
  assert.equal(Math.max(...RAIL_PROFILE.map((p2) => p2[1])), 5.95);
  const p = network.edges["L1-0"], g = railGeometry(p, 1);
  g.computeBoundingBox();
  assert.ok(g.boundingBox.min.z > 70);
  assert.ok(g.attributes.position.array.every(Number.isFinite));
  g.dispose();
});
