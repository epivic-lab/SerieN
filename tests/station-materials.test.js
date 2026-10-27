import test from "node:test";
import assert from "node:assert/strict";
import { stationSurfaceData, STATION_MATERIAL_SPECS, createStationMaterials } from "../src/station-materials.js";
test("station surface data is deterministic, opaque and valid for all material types", () => {
  for (const type of Object.keys(STATION_MATERIAL_SPECS)) {
    const a = stationSurfaceData(type, 64), b = stationSurfaceData(type, 64);
    assert.deepEqual(a, b);
    assert.equal(a.albedo.length, 64 * 64 * 4);
    assert.equal(a.height.length, a.albedo.length);
    for (let i = 3; i < a.albedo.length; i += 4) {
      assert.equal(a.albedo[i], 255);
      assert.equal(a.height[i], 255);
    }
  }
});
test("roof curvature data drives both relief and physical roughness", () => {
  const roof = stationSurfaceData("roof", 128);
  assert.ok(roof.roughness);
  const relief = /* @__PURE__ */ new Set(), roughness = /* @__PURE__ */ new Set();
  for (let i = 0; i < roof.height.length; i += 4) {
    relief.add(roof.height[i]);
    roughness.add(roof.roughness[i]);
  }
  assert.ok(relief.size > 20);
  assert.ok(roughness.size > 20);
});
test("texture footprint remains bounded and uses millimetres independently of geometry size", () => {
  for (const spec of Object.values(STATION_MATERIAL_SPECS)) {
    assert.ok(spec.tileMm.every((v) => v >= 8 && v <= 32));
    assert.ok(spec.bumpMm > 0 && spec.bumpMm < 0.25);
    assert.ok(spec.roughness >= 0.8 && spec.roughness <= 1);
  }
  assert.throws(() => stationSurfaceData("unknown"), /Unknown/);
  assert.throws(() => stationSurfaceData("plaster", 16), /64/);
});
test("shared station maps respect the texture budget and cleanup is idempotent", () => {
  const previous = globalThis.document;
  globalThis.document = { createElement() {
    return { width: 0, height: 0, getContext() {
      return { createImageData(w, h) {
        return { data: new Uint8ClampedArray(w * h * 4) };
      }, putImageData() {
      } };
    } };
  } };
  try {
    const materials = createStationMaterials({ capabilities: { getMaxAnisotropy: () => 16 } });
    assert.ok(materials.textureCount <= 12);
    const textures = /* @__PURE__ */ new Set();
    const owned = Object.values(materials).filter((v) => v?.isMaterial);
    for (const material of owned) for (const v of Object.values(material)) if (v?.isTexture) textures.add(v);
    assert.equal(textures.size, materials.textureCount);
    for (const texture of textures) assert.equal(texture.anisotropy, 8);
    const counts = /* @__PURE__ */ new Map();
    for (const resource of [...owned, ...textures]) {
      counts.set(resource, 0);
      resource.addEventListener("dispose", () => counts.set(resource, counts.get(resource) + 1));
    }
    materials.update(1);
    assert.ok(materials.lights.emissiveIntensity > 1);
    materials.update(0);
    assert.ok(materials.lights.emissiveIntensity < 0.1);
    materials.dispose();
    materials.dispose();
    for (const count of counts.values()) assert.equal(count, 1);
  } finally {
    if (previous === void 0) delete globalThis.document;
    else globalThis.document = previous;
  }
});
