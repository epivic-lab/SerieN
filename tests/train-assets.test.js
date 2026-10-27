import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createTrainAssetManager } from "../src/train-assets.js";
import { fitTrainDimensions, trainCouplers } from "../src/asset-placement.js";
function fixture() {
  const texture = new THREE.Texture(), geometry = new THREE.BoxGeometry(1.4, 1.6, 2.6);
  const material = new THREE.MeshStandardMaterial({ map: texture }), scene = new THREE.Group();
  const body = new THREE.Mesh(geometry, material);
  body.position.y = 0.8;
  scene.add(body);
  const counts = { texture: 0, geometry: 0, material: 0 };
  texture.addEventListener("dispose", () => counts.texture++);
  geometry.addEventListener("dispose", () => counts.geometry++);
  material.addEventListener("dispose", () => counts.material++);
  return { gltf: { scene }, geometry, material, texture, counts };
}
function vehicle(parent) {
  const target = new THREE.Group(), native = new THREE.Mesh(new THREE.BoxGeometry(50, 20, 13), new THREE.MeshStandardMaterial());
  native.position.y = 10;
  target.add(native);
  parent.add(target);
  return { target, native };
}
function importedMeshes(target) {
  const list = [];
  target.children.filter((o) => o.userData.imported).forEach((o) => o.traverse((n) => {
    if (n.isMesh) list.push(n);
  }));
  return list;
}
test("uniform fitting preserves source proportions within the N-scale envelope", () => {
  const d = fitTrainDimensions({ x: 1.4, y: 1.6, z: 2.6 }, true);
  assert.ok(d.width <= 15 && d.length <= 58 && d.height <= 42);
  assert.ok(Math.abs(d.length / d.width - 2.6 / 1.4) < 1e-10);
  const c = trainCouplers(d);
  assert.equal(c.front.x, -c.back.x);
  assert.equal(c.front.x, d.length / 2 + 0.75);
  assert.ok(c.front.y > d.bottom);
  assert.throws(() => fitTrainDimensions({ x: 0, y: 1, z: 2 }));
});
test("twenty vehicle replacements share template resources and release registry records", async () => {
  const f = fixture(), scene = new THREE.Scene();
  let loads = 0;
  const manager = createTrainAssetManager({ loadAsset: async () => {
    loads++;
    return f.gltf;
  } });
  for (let i = 0; i < 20; i++) {
    const { target, native } = vehicle(scene);
    assert.equal(await manager.attach(target, "steam", true), true);
    const mesh = importedMeshes(target)[0];
    assert.equal(mesh.material, f.material);
    assert.equal(mesh.geometry, f.geometry);
    assert.equal(native.visible, false);
    assert.ok(target.userData.couplers.front.x > 0);
    const model = target.children.find((o) => o.userData.imported);
    assert.equal(model.scale.x, model.scale.y);
    assert.equal(model.scale.y, model.scale.z);
    manager.release(target);
    scene.remove(target);
    assert.equal(target.children.length, 1);
    assert.equal(native.visible, true);
    assert.equal(manager.stats.targets, 0);
  }
  assert.equal(loads, 1);
  assert.deepEqual(f.counts, { texture: 0, geometry: 0, material: 0 });
  manager.dispose();
  manager.dispose();
  assert.deepEqual(f.counts, { texture: 1, geometry: 1, material: 1 });
});
test("releasing one clone does not invalidate another and visibility restores native children", async () => {
  const f = fixture(), scene = new THREE.Scene();
  const manager = createTrainAssetManager({ loadAsset: async () => f.gltf });
  const a = vehicle(scene), b = vehicle(scene);
  await Promise.all([manager.attach(a.target, "steam", true), manager.attach(b.target, "steam", true)]);
  manager.release(a.target);
  assert.equal(importedMeshes(b.target).length, 1);
  assert.deepEqual(f.counts, { texture: 0, geometry: 0, material: 0 });
  manager.setEnabled(false);
  assert.equal(b.native.visible, true);
  assert.equal(b.target.children.at(-1).visible, false);
  assert.equal(b.target.userData.assetDimensions, void 0);
  manager.setEnabled(true);
  assert.equal(b.native.visible, false);
  assert.equal(b.target.userData.assetDimensions.stylized, true);
  manager.dispose();
});
test("release during asynchronous loading never reattaches an obsolete model", async () => {
  const f = fixture(), scene = new THREE.Scene();
  let resolve;
  const manager = createTrainAssetManager({ loadAsset: () => new Promise((r) => {
    resolve = r;
  }) });
  const { target, native } = vehicle(scene), pending = manager.attach(target, "steam", true);
  await Promise.resolve();
  manager.release(target);
  scene.remove(target);
  resolve(f.gltf);
  assert.equal(await pending, false);
  assert.equal(target.children.length, 1);
  assert.equal(native.visible, true);
  assert.equal(manager.stats.targets, 0);
  manager.dispose();
});
test("global disposal also frees templates arriving after cancellation exactly once", async () => {
  const f = fixture(), scene = new THREE.Scene();
  let resolve;
  const manager = createTrainAssetManager({ loadAsset: () => new Promise((r) => {
    resolve = r;
  }) });
  const { target } = vehicle(scene), pending = manager.attach(target, "steam", true);
  await Promise.resolve();
  manager.dispose();
  resolve(f.gltf);
  assert.equal(await pending, false);
  assert.deepEqual(f.counts, { texture: 1, geometry: 1, material: 1 });
  assert.equal(manager.stats.targets, 0);
  assert.equal(await manager.attach(target, "steam", true), false);
});
test("failed loading leaves the original playable and permits a later retry", async () => {
  const f = fixture(), scene = new THREE.Scene();
  let attempts = 0, failures = 0;
  const manager = createTrainAssetManager({ loadAsset: async () => {
    if (++attempts === 1) throw Error("offline");
    return f.gltf;
  }, onError: () => failures++ });
  const { target, native } = vehicle(scene);
  assert.equal(await manager.attach(target, "steam", true), false);
  assert.equal(native.visible, true);
  assert.equal(failures, 1);
  assert.equal(await manager.attach(target, "steam", true), true);
  assert.equal(attempts, 2);
  manager.dispose();
});
test("a newer attach supersedes an older pending request without duplicating the model", async () => {
  const f = fixture(), scene = new THREE.Scene();
  let resolve, loads = 0;
  const manager = createTrainAssetManager({ loadAsset: () => {
    loads++;
    return new Promise((r) => {
      resolve = r;
    });
  } });
  const { target } = vehicle(scene);
  const first = manager.attach(target, "steam", true);
  await Promise.resolve();
  const second = manager.attach(target, "steam", true);
  resolve(f.gltf);
  assert.equal(await first, false);
  assert.equal(await second, true);
  assert.equal(loads, 1);
  assert.equal(importedMeshes(target).length, 1);
  assert.equal(manager.stats.targets, 1);
  assert.equal(manager.stats.pending, 0);
  manager.dispose();
});
