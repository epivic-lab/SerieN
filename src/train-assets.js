import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
const loader = new GLTFLoader(), cache = /* @__PURE__ */ new Map(), targets = /* @__PURE__ */ new Set();
let enabled = true;
const files = { steam: "train-locomotive-a", diesel: "train-diesel-a", shunter: "train-diesel-box-a", lumber: "train-carriage-lumber", tank: "train-carriage-tank", box: "train-carriage-box" };
function load(type) {
  const name = files[type];
  if (!cache.has(name)) cache.set(name, loader.loadAsync(new URL(`./assets/kenney/${name}.glb`, document.baseURI).href));
  return cache.get(name);
}
function visibility(record) {
  for (const child of record.native) child.visible = !enabled || !record.model;
  if (record.model) record.model.visible = enabled;
}
function importedTrains(value) {
  enabled = value;
  for (const record of targets) {
    if (!record.target.parent) {
      targets.delete(record);
      continue;
    }
    visibility(record);
  }
}
async function attachTrainAsset(target, type, locomotive = false) {
  const record = { target, native: target.children.filter((o) => !o.isLight && !target.children.some((l) => l.isLight && l.target === o)), model: null };
  targets.add(record);
  try {
    const gltf = await load(type), model = gltf.scene.clone(true);
    const bounds = new THREE.Box3().setFromObject(model), size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
    const length = locomotive ? 58 : 50, width = locomotive ? 15 : 13, sy = length / size.z * 0.8;
    const oriented = new THREE.Group();
    model.position.set(-center.x, -bounds.min.y, -center.z);
    oriented.add(model);
    oriented.scale.set(width / size.x, sy, length / size.z);
    oriented.rotation.y = Math.PI / 2;
    oriented.position.y = locomotive ? -1.5 : 1.5;
    oriented.userData.imported = true;
    model.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = o.receiveShadow = true;
        if (o.material) {
          o.material = o.material.clone();
          o.material.roughness = 0.72;
          o.material.metalness = 0.12;
        }
        if (o.name === "wheel") {
          o.userData.importedWheel = true;
          o.userData.wheelRadius = 0.27 * sy;
        }
      }
    });
    record.model = oriented;
    target.add(oriented);
    visibility(record);
    return true;
  } catch (error) {
    visibility(record);
    console.warn("Modello Kenney non disponibile; uso il rotabile originale.", type, error.message);
    return false;
  }
}
export {
  attachTrainAsset,
  importedTrains
};
