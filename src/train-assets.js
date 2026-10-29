import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { fitTrainDimensions, trainCouplers } from "./asset-placement.js";
const files = {
  steam: "train-locomotive-a",
  diesel: "train-diesel-a",
  shunter: "train-diesel-box-a",
  lumber: "train-carriage-lumber",
  tank: "train-carriage-tank",
  box: "train-carriage-box"
};
const loader = new GLTFLoader();
function nativeChildren(target) {
  return target.children.filter((o) => !o.isLight && !o.userData.imported && !target.children.some((l) => l.isLight && l.target === o));
}
function nativeCouplers(target, children) {
  target.updateWorldMatrix(true, true);
  const inverse = target.matrixWorld.clone().invert(), bounds = new THREE.Box3();
  for (const child of children) child.traverse((o) => {
    if (!o.isMesh) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    bounds.union(o.geometry.boundingBox.clone().applyMatrix4(inverse.clone().multiply(o.matrixWorld)));
  });
  if (bounds.isEmpty()) return null;
  return { front: { x: bounds.max.x + 2, y: 6, z: 0 }, back: { x: bounds.min.x - 2, y: 6, z: 0 } };
}
function createTrainAssetManager({
  loadAsset = (name) => loader.loadAsync(new URL(`./assets/kenney/${name}.glb`, document.baseURI).href),
  onError = (error, type) => console.warn("Modello Kenney non disponibile; uso il rotabile originale.", type, error.message)
} = {}) {
  const cache = /* @__PURE__ */ new Map(), records = /* @__PURE__ */ new Map(), templates = /* @__PURE__ */ new Set(), disposedResources = /* @__PURE__ */ new WeakSet();
  let enabled = true, disposed = false;
  function disposeResource(resource) {
    if (!resource || disposedResources.has(resource)) return;
    disposedResources.add(resource);
    resource.dispose();
  }
  function disposeTemplate(template) {
    template.scene.traverse((o) => {
      if (!o.isMesh) return;
      disposeResource(o.geometry);
      for (const material of Array.isArray(o.material) ? o.material : [o.material]) {
        if (!material) continue;
        for (const value of Object.values(material)) if (value?.isTexture) disposeResource(value);
        disposeResource(material);
      }
    });
  }
  function load(type) {
    const name = files[type];
    if (!name) return Promise.reject(new Error(`Unknown train asset type: ${type}`));
    if (!cache.has(name)) {
      const promise = Promise.resolve().then(() => loadAsset(name)).then((gltf) => {
        if (!gltf?.scene) throw new Error(`Missing model scene: ${name}`);
        gltf.scene.traverse((o) => {
          if (!o.isMesh) return;
          o.castShadow = o.receiveShadow = true;
          for (const material of Array.isArray(o.material) ? o.material : [o.material]) {
            if (material) {
              material.roughness = 0.72;
              material.metalness = 0.12;
            }
          }
        });
        if (disposed) disposeTemplate(gltf);
        else templates.add(gltf);
        return gltf;
      }).catch((error) => {
        cache.delete(name);
        throw error;
      });
      cache.set(name, promise);
    }
    return cache.get(name);
  }
  function visibility(record) {
    for (const [child, visible] of record.native) child.visible = (!enabled || !record.model) && visible;
    if (record.model) record.model.visible = enabled;
    if (enabled && record.model) {
      record.target.userData.couplers = trainCouplers(record.dimensions);
      record.target.userData.assetDimensions = { ...record.dimensions, source: "Kenney CC0", stylized: true };
    } else {
      if (record.nativeCouplers) record.target.userData.couplers = record.nativeCouplers;
      else delete record.target.userData.couplers;
      delete record.target.userData.assetDimensions;
    }
  }
  function release(target) {
    const record = records.get(target);
    if (!record) return;
    record.released = true;
    if (record.model) target.remove(record.model);
    for (const [child, visible] of record.native) child.visible = visible;
    if (record.nativeCouplers) target.userData.couplers = record.nativeCouplers;
    else delete target.userData.couplers;
    delete target.userData.assetDimensions;
    records.delete(target);
  }
  async function attach(target, type, locomotive = false) {
    if (disposed) return false;
    release(target);
    const children = nativeChildren(target);
    const record = {
      target,
      native: children.map((o) => [o, o.visible]),
      nativeCouplers: target.userData.stock ? structuredClone(target.userData.couplers) : nativeCouplers(target, children),
      model: null,
      dimensions: null,
      released: false,
      pending: true
    };
    records.set(target, record);
    try {
      const gltf = await load(type);
      record.pending = false;
      if (disposed || record.released || records.get(target) !== record) return false;
      const model = gltf.scene.clone(true);
      const bounds = new THREE.Box3().setFromObject(model), size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3()), dimensions = fitTrainDimensions(size, locomotive);
      const oriented = new THREE.Group();
      model.position.set(-center.x, -bounds.min.y, -center.z);
      oriented.add(model);
      oriented.scale.setScalar(dimensions.scale);
      oriented.rotation.y = Math.PI / 2;
      oriented.position.y = dimensions.bottom;
      oriented.userData.imported = true;
      model.traverse((o) => {
        if (o.isMesh && o.name === "wheel") {
          o.userData.importedWheel = true;
          o.userData.wheelRadius = 0.27 * dimensions.scale;
        }
      });
      record.model = oriented;
      record.dimensions = dimensions;
      target.add(oriented);
      visibility(record);
      return true;
    } catch (error) {
      record.pending = false;
      if (!disposed && !record.released && records.get(target) === record) {
        visibility(record);
        onError(error, type);
      }
      return false;
    }
  }
  function setEnabled(value) {
    enabled = Boolean(value);
    for (const record of [...records.values()]) {
      if (!record.target.parent && record.model) release(record.target);
      else visibility(record);
    }
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const target of [...records.keys()]) release(target);
    for (const template of templates) disposeTemplate(template);
    templates.clear();
    cache.clear();
  }
  return {
    attach,
    release,
    setEnabled,
    dispose,
    get stats() {
      return { targets: records.size, templates: templates.size, pending: [...records.values()].filter((r) => r.pending).length, disposed };
    }
  };
}
const manager = createTrainAssetManager();
const attachTrainAsset = (target, type, locomotive = false) => manager.attach(target, type, locomotive);
const importedTrains = (value) => manager.setEnabled(value);
const releaseTrainAsset = (target) => manager.release(target);
const disposeTrainAssets = () => manager.dispose();
export {
  attachTrainAsset,
  createTrainAssetManager,
  disposeTrainAssets,
  importedTrains,
  releaseTrainAsset
};
