import { createStationMaterials } from "./station-materials.js";
import { buildStationBuilding } from "./station-building.js";
import { buildStationPlatform } from "./station-platform.js";
import { buildZones } from "./zones.js";
import { clearance } from "./landscape.js";
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
function enrich(scene, renderer, { ballast, ground, wood, network, roofMaterials, wallMaterials, foundation }) {
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
  const stationMaterials = createStationMaterials(renderer);
  const stationBuilding = buildStationBuilding(scene, { materials: stationMaterials });
  const stationPlatform = buildStationPlatform(scene, { materials: { stationIron: stationMaterials.metal, stationWood: stationMaterials.wood, canopyZinc: stationMaterials.roofDark, platformCurb: stationMaterials.stone } });
  const station = { building: stationBuilding, platform: stationPlatform, materials: stationMaterials, update(night) {
    stationMaterials.update(night);
    stationPlatform.update(night);
  } };
  ground.visible = false;
  const initialBuildings = scene.children.filter((o) => o.userData.building).map((o) => ({ x: o.position.x, z: o.position.z, ...o.userData.building }));
  const zones = buildZones(scene, network, { wood, mask: clearance(network, initialBuildings) });
  const reserved = (x, z) => zones.footprints.some((f) => f.kind === "reserve" && Math.abs(x - f.x) <= f.w / 2 && Math.abs(z - f.z) <= f.d / 2);
  const scenic = diorama(scene, renderer, network, wood, { foundation, reserved });
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
    b.originals.forEach((o) => {
      o.visible = false;
      o.geometry.dispose();
      o.parent?.remove(o);
    });
    b.geometries.forEach((g) => g.dispose());
  }
  return { environment: env, ...scenic, zones, station };
}
export {
  enrich,
  surface
};
