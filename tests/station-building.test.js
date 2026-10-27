import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { buildStationBuilding, STATION_SPEC, STATION_OPENINGS } from "../src/station-building.js";
import { createNetwork } from "../src/network.js";
import { clearance } from "../src/landscape.js";
const keys = ["plaster", "stone", "brick", "roof", "roofDark", "wood", "paint", "metal", "glass", "interior", "brass"];
function build() {
  const materials = Object.fromEntries(keys.map((k) => [k, new THREE.MeshStandardMaterial()])), scene = new THREE.Scene(), station = buildStationBuilding(scene, { materials });
  scene.updateMatrixWorld(true);
  return { scene, materials, station };
}
test("station occupies the existing site with a credible central body and two lower wings", () => {
  const { station } = build();
  assert.deepEqual(station.root.position.toArray(), [750, 0.35, 525]);
  const b = new THREE.Box3().setFromObject(station.root);
  assert.ok(b.min.x > 678 && b.max.x < 822);
  assert.ok(b.min.z > 499 && b.max.z < 548);
  assert.ok(b.max.y < 62);
  assert.equal(station.root.userData.building.id, "station");
});
test("ground floor windows and entry are real openings through structural walls", () => {
  const { scene, materials } = build();
  for (const h of STATION_OPENINGS.filter((h2) => h2.y < 24)) {
    const ray = new THREE.Raycaster(new THREE.Vector3(750 + h.x, 0.35 + h.y + h.h * 0.4, 548), new THREE.Vector3(0, 0, -1), 0, 5);
    const hits = ray.intersectObject(scene, true).filter((hit) => [materials.plaster, materials.brick].includes(hit.object.material));
    assert.equal(hits.length, 0);
  }
});
test("full building and roofing envelope remain outside the railway loading gauge", () => {
  const { station } = build(), mask = clearance(createNetwork()), b = new THREE.Box3().setFromObject(station.root);
  for (let x = b.min.x; x <= b.max.x; x += 2) for (let z = b.min.z; z <= b.max.z; z += 2) assert.ok(mask.track(x, z) > 15);
});
test("terracotta roof uses shared instanced tiles and no unbounded per-tile objects", () => {
  const { station } = build();
  let roofs = 0, tiles = 0, meshes = 0;
  station.root.traverse((o) => {
    if (o.isMesh) meshes++;
    if (o.isInstancedMesh) {
      roofs++;
      tiles += o.count;
    }
    if (o.isMesh) assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));
  });
  assert.equal(roofs, 6);
  assert.ok(tiles > 800 && tiles < 1800);
  assert.ok(meshes < 800);
});
