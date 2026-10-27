import { diorama, roofTexture, wallTexture } from "./diorama.js";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
function surface(colors, seed = 27) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = colors[0];
  ctx.fillRect(0, 0, 256, 256);
  const random = () => {
    seed = seed * 1664525 + 1013904223 >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 16e3; i++) {
    ctx.fillStyle = colors[Math.floor(random() * colors.length)];
    const r = 0.3 + random() * 2;
    ctx.fillRect(random() * 256, random() * 256, r, r);
  }
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function enrich(scene, renderer, { ballast, ground, wood, network, roofMaterials, wallMaterials }) {
  const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
  const env = pmrem.fromScene(room, 0.04);
  scene.environment = env.texture;
  scene.environmentIntensity = 0.35;
  room.dispose();
  pmrem.dispose();
  ballast.map = surface(["#8d8676", "#aea48d", "#6b685f", "#b7aa91", "#575b53"]);
  ballast.map.repeat.set(2, 1);
  ballast.bumpMap = ballast.map;
  ballast.bumpScale = 0.65;
  ballast.needsUpdate = true;
  ground.material.map = surface(["#7e8955", "#8d975c", "#6b7749", "#a29667", "#747849"]);
  ground.material.map.repeat.set(26, 13);
  ground.material.bumpMap = ground.material.map;
  ground.material.bumpScale = 0.5;
  ground.material.needsUpdate = true;
  for (const material of roofMaterials) {
    material.map = roofTexture();
    material.map.wrapS = material.map.wrapT = THREE.RepeatWrapping;
    material.map.repeat.set(5, 2);
    material.bumpMap = material.map.clone();
    material.bumpMap.colorSpace = THREE.NoColorSpace;
    material.bumpScale = 0.8;
    material.roughness = 0.9;
    material.needsUpdate = true;
  }
  for (const material of wallMaterials) {
    material.map = wallTexture();
    material.map.wrapS = material.map.wrapT = THREE.RepeatWrapping;
    material.map.repeat.set(2, 2);
    material.bumpMap = material.map.clone();
    material.bumpMap.colorSpace = THREE.NoColorSpace;
    material.bumpScale = 0.35;
    material.needsUpdate = true;
  }
  const m = new THREE.MeshStandardMaterial({ color: "#999684", roughness: 1 });
  const stones = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), m, 420), dummy = new THREE.Object3D();
  let i = 0;
  for (const [x, z, len] of [[240, 390, 180], [1e3, 399, 240], [480, 385, 180]]) for (let row = 0; row < 3; row++) for (let j = 0; j < Math.floor(len / 6); j++) {
    if (i >= 420) break;
    dummy.position.set(x + j * 6 + row % 2 * 3, 2 + row * 3, z);
    dummy.rotation.set(0, Math.sin(j * 13) * 0.08, 0);
    dummy.scale.set(5.5, 2.7, 4);
    dummy.updateMatrix();
    stones.setMatrixAt(i++, dummy.matrix);
  }
  stones.count = i;
  stones.castShadow = stones.receiveShadow = true;
  scene.add(stones);
  const platform = new THREE.Mesh(new THREE.BoxGeometry(270, 4, 18), new THREE.MeshStandardMaterial({ color: "#b6ac92", roughness: 0.95 }));
  platform.position.set(750, 2, 550);
  platform.receiveShadow = true;
  scene.add(platform);
  const trim = new THREE.Mesh(new THREE.BoxGeometry(270, 0.5, 1.8), new THREE.MeshStandardMaterial({ color: "#eddfb8" }));
  trim.position.set(750, 4.4, 559);
  scene.add(trim);
  for (let x = 635; x < 880; x += 39) {
    const bench = new THREE.Mesh(new THREE.BoxGeometry(14, 1.5, 4), wood);
    bench.position.set(x, 8, 546);
    bench.castShadow = true;
    scene.add(bench);
    for (const dx of [-5, 5]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(1, 5, 3), m);
      leg.position.set(x + dx, 5, 546);
      scene.add(leg);
    }
  }
  const scenic = diorama(scene, renderer, network, wood);
  scene.updateMatrixWorld(true);
  const batches = /* @__PURE__ */ new Map();
  scene.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material) || !o.visible) return;
    let a = o;
    while (a) {
      if (a.userData.dynamic || a.userData.switchId || a.userData.trainId !== void 0) return;
      a = a.parent;
    }
    const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrixWorld);
    const key = o.material.uuid + "/" + o.castShadow + "/" + o.receiveShadow;
    if (!batches.has(key)) batches.set(key, { geometries: [], originals: [], material: o.material, cast: o.castShadow, receive: o.receiveShadow });
    batches.get(key).geometries.push(g);
    batches.get(key).originals.push(o);
  });
  for (const b of batches.values()) {
    const geometry = mergeGeometries(b.geometries, false);
    if (!geometry) continue;
    const mesh = new THREE.Mesh(geometry, b.material);
    mesh.castShadow = b.cast;
    mesh.receiveShadow = b.receive;
    scene.add(mesh);
    b.originals.forEach((o) => o.visible = false);
    b.geometries.forEach((g) => g.dispose());
  }
  return { environment: env, ...scenic };
}
export {
  enrich,
  surface
};
