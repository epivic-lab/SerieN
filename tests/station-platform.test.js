import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { STATION_PLATFORM, stationPlatformLayout, buildStationPlatform } from "../src/station-platform.js";
import { createNetwork } from "../src/network.js";
import { clearance } from "../src/landscape.js";
const mask = clearance(createNetwork());
test("crafted paving covers the existing platform with physical joints inside its footprint", () => {
  const a = stationPlatformLayout(), b = stationPlatformLayout();
  assert.deepEqual(a, b);
  assert.equal(a.paving.length, 135);
  for (const p of a.paving) {
    assert.ok(p.x - p.w / 2 >= STATION_PLATFORM.xMin);
    assert.ok(p.x + p.w / 2 <= STATION_PLATFORM.xMax);
    assert.ok(p.z - p.d / 2 >= STATION_PLATFORM.zMin);
    assert.ok(p.z + p.d / 2 <= STATION_PLATFORM.zMax);
  }
});
test("canopy columns and furniture do not invade the train side of the platform", () => {
  const l = stationPlatformLayout();
  for (const p of l.columns) assert.ok(mask.track(p.x, p.z) > 13 + p.r);
  for (const p of l.benches) {
    assert.ok(p.z + p.d / 2 < 557);
    assert.ok(p.z - p.d / 2 > 545);
  }
  for (const p of l.passengers) {
    assert.ok(p.h >= 7.5 && p.h < 11);
    assert.ok(mask.track(p.x, p.z) > 12);
  }
});
test("real platform mesh respects rail clearance above the platform edge", () => {
  const scene = new THREE.Scene(), p = buildStationPlatform(scene);
  scene.updateMatrixWorld(true);
  let top = 0;
  p.root.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry.computeBoundingBox();
    if (o.isInstancedMesh) {
      const m = new THREE.Matrix4();
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, m);
        const box = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld.clone().multiply(m));
        assert.ok(box.max.z <= 559.02);
        top = Math.max(top, box.max.y);
      }
    } else {
      const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
      assert.ok(b.max.z <= 559.02, `${o.geometry.type}: ${b.max.z}`);
      assert.ok(b.min.z >= 540.98);
      if (b.min.y > 5) assert.ok(b.max.z < 558);
      top = Math.max(top, b.max.y);
    }
  });
  assert.ok(top < 31);
  assert.ok(top > 29);
});
test("night lights have bounded intensity and do not require external assets", () => {
  const p = buildStationPlatform(new THREE.Scene());
  assert.equal(p.lights.length, 2);
  p.update(-3);
  assert.ok(p.lights.every((l) => !l.visible && l.intensity === 0));
  p.update(1);
  assert.ok(p.lights.every((l) => l.visible && l.intensity === 0.65));
  p.update(9);
  assert.ok(p.lights.every((l) => l.intensity === 0.65));
});
