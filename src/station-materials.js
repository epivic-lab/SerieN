import * as THREE from "three";
const STATION_MATERIAL_SPECS = Object.freeze({
  plaster: Object.freeze({ tileMm: [32, 32], roughness: 0.94, bumpMm: 0.105 }),
  stone: Object.freeze({ tileMm: [16, 8], roughness: 0.92, bumpMm: 0.19 }),
  brick: Object.freeze({ tileMm: [12, 8], roughness: 0.88, bumpMm: 0.13 }),
  roof: Object.freeze({ tileMm: [8, 8], roughness: 1, bumpMm: 0.17 }),
  wood: Object.freeze({ tileMm: [20, 8], roughness: 0.82, bumpMm: 0.075 })
});
const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const smooth = (a, b, value) => {
  const t = clamp((value - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const cellHash = (x, y, seed) => {
  let n = Math.imul(x + 13, 374761393) ^ Math.imul(y + 17, 668265263) ^ seed;
  n = Math.imul(n ^ n >>> 13, 1274126177);
  return ((n ^ n >>> 16) >>> 0) / 4294967295;
};
function stationSurfaceData(kind, size = 512) {
  if (!STATION_MATERIAL_SPECS[kind]) throw new RangeError(`Unknown station surface: ${kind}`);
  if (!Number.isInteger(size) || size < 64 || size > 2048) throw new RangeError("Station texture size must be 64\u20132048");
  const albedo = new Uint8ClampedArray(size * size * 4);
  const height = new Uint8ClampedArray(size * size * 4);
  const roughness = kind === "roof" ? new Uint8ClampedArray(size * size * 4) : null;
  const tau = Math.PI * 2;
  let seed = 1947;
  const noise = () => {
    seed = Math.imul(seed, 1664525) + 1013904223 >>> 0;
    return seed / 4294967296;
  };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size, grain = noise() - 0.5;
    const broad = Math.sin(tau * u * 2) * Math.cos(tau * v * 3);
    const fine = Math.sin(tau * (u * 13 + v * 7)) * Math.cos(tau * (u * 9 - v * 11));
    let color, h, r = 0.85;
    if (kind === "plaster") {
      const marks = 2.4 * broad + 1.5 * fine + grain * 11;
      const stain = 1.5 * Math.sin(tau * v * 5 + Math.sin(tau * u * 4));
      color = [207 + marks + stain, 199 + marks + stain, 177 + marks + stain];
      h = 0.49 + grain * 0.22 + fine * 0.028 + broad * 0.012;
    } else if (kind === "stone" || kind === "brick") {
      const cols = kind === "stone" ? 4 : 8, rows = kind === "stone" ? 4 : 16;
      const row = Math.floor(v * rows), sx = u * cols + row % 2 * 0.5;
      const col = Math.floor(sx), lx = sx - col, ly = v * rows - row;
      const cell = cellHash(col % cols, row, kind === "stone" ? 53 : 97);
      const edge = Math.min(lx * size / cols, (1 - lx) * size / cols, ly * size / rows, (1 - ly) * size / rows);
      const raised = smooth(1, kind === "stone" ? 4.4 : 2.6, edge * size / 512);
      const variation = (cell - 0.5) * (kind === "stone" ? 20 : 29);
      const face = kind === "stone" ? [166 + variation, 157 + variation, 137 + variation] : [145 + variation, 106 + variation * 0.8, 79 + variation * 0.65];
      const mortar = kind === "stone" ? [124, 123, 111] : [170, 163, 143];
      const mottling = grain * 15 + fine * 2.6 + broad * 1.9;
      color = face.map((c, i) => mortar[i] + (c - mortar[i]) * raised + mottling);
      h = 0.17 + raised * (0.43 + cell * 0.08) + grain * 0.045 + fine * 0.015;
    } else if (kind === "roof") {
      const cols = 6, rows = 8, row = Math.floor(v * rows), col = Math.floor(u * cols);
      const lx = u * cols - col, ly = v * rows - row;
      const variation = (cellHash(col, row, 101) - 0.5) * 22;
      const seam = Math.min(lx, 1 - lx) < 0.035 || ly < 0.055;
      const pan = 0.5 + 0.5 * Math.cos((lx - 0.5) * tau);
      const rim = smooth(0.78, 0.91, ly) * (1 - smooth(0.95, 1, ly));
      const tone = variation + grain * 11 + pan * 8 - rim * 5;
      color = seam ? [79 + grain * 8, 63 + grain * 7, 49 + grain * 6] : [130 + tone, 83 + tone * 0.8, 61 + tone * 0.65];
      h = seam ? 0.2 : 0.43 + pan * 0.22 + rim * 0.1 + grain * 0.017;
      r = seam ? 0.91 : 0.67 + grain * 0.15 + (1 - pan) * 0.08;
    } else {
      const row = Math.floor(v * 4), ly = v * 4 - row;
      const ripple = Math.sin(tau * (v * 59 + 0.22 * Math.sin(u * tau * 2))) + 0.3 * Math.sin(v * tau * 113 + Math.sin(u * tau * 5));
      const board = (cellHash(0, row, 211) - 0.5) * 16;
      const seam = Math.min(ly, 1 - ly) < 0.014;
      const tone = board + grain * 8 + ripple * 4 + broad * 3;
      color = seam ? [54, 47, 36] : [132 + tone, 112 + tone * 0.87, 82 + tone * 0.7];
      h = seam ? 0.19 : 0.49 + ripple * 0.027 + grain * 0.022;
    }
    const k = (y * size + x) * 4, hb = Math.round(clamp(h) * 255), rb = Math.round(clamp(r) * 255);
    for (let c = 0; c < 3; c++) {
      albedo[k + c] = Math.round(clamp(color[c], 0, 255));
      height[k + c] = hb;
      if (roughness) roughness[k + c] = rb;
    }
    albedo[k + 3] = height[k + 3] = 255;
    if (roughness) roughness[k + 3] = 255;
  }
  return { size, albedo, height, roughness };
}
function textureFromPixels(bytes, size, color, anisotropy) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const image = ctx.createImageData(size, size);
  image.data.set(bytes);
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = anisotropy;
  return texture;
}
function createStationMaterials(renderer) {
  const max = renderer?.capabilities?.getMaxAnisotropy?.() ?? 1;
  const anisotropy = Math.max(1, Math.min(8, max));
  const textures = /* @__PURE__ */ new Set(), made = /* @__PURE__ */ new Set();
  const own = (material) => {
    made.add(material);
    return material;
  };
  const maps = {};
  for (const [kind, spec] of Object.entries(STATION_MATERIAL_SPECS)) {
    const pixels = stationSurfaceData(kind);
    const map = textureFromPixels(pixels.albedo, pixels.size, true, anisotropy);
    const bumpMap = textureFromPixels(pixels.height, pixels.size, false, anisotropy);
    textures.add(map);
    textures.add(bumpMap);
    const roughnessMap = pixels.roughness ? textureFromPixels(pixels.roughness, pixels.size, false, anisotropy) : null;
    if (roughnessMap) textures.add(roughnessMap);
    maps[kind] = { map, bumpMap, roughnessMap };
  }
  const textured = (kind, overrides = {}) => {
    const spec = STATION_MATERIAL_SPECS[kind];
    const material = own(new THREE.MeshStandardMaterial({ color: "#ffffff", ...maps[kind], roughness: spec.roughness, bumpScale: spec.bumpMm, ...overrides }));
    material.userData.tileMm = [...spec.tileMm];
    material.userData.stationSurface = kind;
    return material;
  };
  const plaster = textured("plaster"), stone = textured("stone"), brick = textured("brick"), roof = textured("roof"), wood = textured("wood");
  const roofDark = textured("roof", { color: "#5d655f", map: null, roughness: 0.83, metalness: 0.25 });
  const paint = own(new THREE.MeshStandardMaterial({ color: "#344941", roughness: 0.72, metalness: 0.08 }));
  const metal = own(new THREE.MeshStandardMaterial({ color: "#4f5650", roughness: 0.56, metalness: 0.68 }));
  const glass = own(new THREE.MeshPhysicalMaterial({ color: "#8aabb0", roughness: 0.16, metalness: 0.06, clearcoat: 0.25, clearcoatRoughness: 0.13, ior: 1.48, transparent: true, opacity: 0.34, depthWrite: false, side: THREE.DoubleSide }));
  const roughGlass = own(new THREE.MeshStandardMaterial({ color: "#a9b6ae", roughness: 0.48, transparent: true, opacity: 0.65, depthWrite: false, side: THREE.DoubleSide }));
  const interior = own(new THREE.MeshStandardMaterial({ color: "#514d3c", roughness: 0.95, emissive: "#e8ad60", emissiveIntensity: 0.01, side: THREE.DoubleSide }));
  const brass = own(new THREE.MeshStandardMaterial({ color: "#b2a16c", roughness: 0.42, metalness: 0.75 }));
  const lights = own(new THREE.MeshStandardMaterial({ color: "#e6dec5", roughness: 0.48, emissive: "#ffd397", emissiveIntensity: 0.03 }));
  let disposed = false;
  return {
    plaster,
    stone,
    brick,
    roof,
    roofDark,
    wood,
    paint,
    metal,
    glass,
    interior,
    roughGlass,
    brass,
    lights,
    textureCount: textures.size,
    update(night) {
      const n = clamp(Number.isFinite(night) ? night : 0);
      interior.emissiveIntensity = 0.01 + n * 0.28;
      lights.emissiveIntensity = 0.03 + n * 1.9;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      made.forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());
    }
  };
}
export {
  STATION_MATERIAL_SPECS,
  createStationMaterials,
  stationSurfaceData
};
