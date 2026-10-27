import { mountTrainDeck } from "./src/train-deck.js";
import { captureLocomotiveThumbnail } from "./src/locomotive-thumbnails.js";
import { createSwitchTopology, traceJourney, occupiedRanges, siteSafety } from "./src/next-switch.js";
import { mountNextSwitchHUD } from "./src/next-switch-view.js";
import { LEGACY_BUILDINGS } from "./src/scenic-plan.js";
import { mountViewControls } from "./src/view-controls.js";
import { couplingDistance, consistLayout } from "./src/consist.js";
import { railGeometry } from "./src/rail-profile.js";
import { navigation } from "./src/navigation.js";
import { QualityController } from "./src/quality.js";
import { attachTrainAsset, importedTrains, releaseTrainAsset, disposeTrainAssets } from "./src/train-assets.js";
import { locomotiveDetails, wagonDetails, steam } from "./src/rolling-stock-art.js";
import { presentation } from "./src/presentation.js";
import { enrich } from "./src/scenery.js";
import { createNetwork, validateNetwork } from "./src/network.js";
import { Journey, routing, FixedClock } from "./src/simulation.js";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
const $ = (id) => document.getElementById(id);
const host = $("view3d");
let nextSwitchHUD = null, trainDeck = null;
importedTrains($("rollingModels").value === "kenney");
const scene = new THREE.Scene();
scene.background = new THREE.Color("#9fbcc5");
scene.fog = new THREE.Fog("#b8c3af", 1900, 3700);
const camera = new THREE.PerspectiveCamera(35, 1, 1, 6500);
camera.position.set(1580, 1150, 1570);
camera.lookAt(750, 0, 350);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.23;
host.prepend(renderer.domElement);
const effects = presentation(renderer, scene, camera);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(750, 0, 350);
controls.enableDamping = true;
controls.dampingFactor = 0.065;
controls.minPolarAngle = 0.25;
controls.maxPolarAngle = 1.38;
controls.minZoom = 0.65;
controls.minDistance = 250;
controls.maxDistance = 3600;
controls.maxZoom = 3.4;
controls.enablePan = true;
controls.update();
const materialCache = /* @__PURE__ */ new Map();
const mat = (hex, rough = 1, metal = 0) => {
  const key = [hex, rough, metal].join("/");
  if (!materialCache.has(key)) materialCache.set(key, new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: metal }));
  return materialCache.get(key);
};
const wood = mat("#876d4f"), earth = mat("#8d785f"), ballast = mat("#8c8476"), sleepers = mat("#50453b"), steel = mat("#889698", 0.46, 0.58);
const cream = mat("#cfbda3"), brick = mat("#a56b51"), roofRed = mat("#744a3f"), roofGray = mat("#5d655e"), gravel = mat("#9c9985");
const grassMaterials = [mat("#809767"), mat("#839b6b"), mat("#71895a"), mat("#91a470")];
const shadowCast = (o) => {
  o.castShadow = true;
  o.receiveShadow = true;
  return o;
};
const box = (w, h, d, m, parent = scene, x = 0, y = 0, z = 0) => {
  const o = shadowCast(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m));
  o.position.set(x, y, z);
  parent.add(o);
  return o;
};
const sphere = (r, m, parent = scene, x = 0, y = 0, z = 0) => {
  const o = shadowCast(new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), m));
  o.position.set(x, y, z);
  parent.add(o);
  return o;
};
const cylinder = (r1, r2, h, m, parent = scene, x = 0, y = 0, z = 0, n = 10) => {
  const o = shadowCast(new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, n), m));
  o.position.set(x, y, z);
  parent.add(o);
  return o;
};
const PI = Math.PI, lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => Math.min(b, Math.max(a, v)), mod = (v, n = 1) => (v % n + n) % n;
let seed = 20261027;
const rnd = () => {
  seed = seed * 1664525 + 1013904223 >>> 0;
  return seed / 4294967296;
};
const val = (v) => typeof v === "number" ? v : 0;
const topLights = [];
const sun = new THREE.DirectionalLight("#ffe7c7", 2.45);
sun.position.set(-280, 1e3, 150);
sun.target.position.set(750, 0, 350);
scene.add(sun.target);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -1150;
sun.shadow.camera.right = 1150;
sun.shadow.camera.top = 950;
sun.shadow.camera.bottom = -950;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 3e3;
sun.shadow.bias = -15e-5;
sun.shadow.normalBias = 0.8;
scene.add(sun);
const skyLight = new THREE.HemisphereLight("#e5eff2", "#506344", 1.2);
scene.add(skyLight);
const fill = new THREE.DirectionalLight("#d4e5f4", 0.65);
fill.position.set(900, 600, 950);
scene.add(fill);
const ballastLayer = box(1500, 18, 700, mat("#77664d"), scene, 750, -12, 350);
ballastLayer.castShadow = false;
const ground = box(1498, 3, 698, mat("#799461"), scene, 750, -1.3, 350);
ground.castShadow = false;
function ellipse(x, z, rx, rz, y, color) {
  const o = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 9), color);
  o.scale.set(rx, y, rz);
  o.position.set(x, -4, z);
  o.castShadow = true;
  o.receiveShadow = true;
  scene.add(o);
  return o;
}
box(1510, 30, 8, wood, scene, 750, -16, 702);
box(1510, 30, 8, wood, scene, 750, -16, -2);
box(8, 30, 706, wood, scene, -5, -16, 350);
box(8, 30, 706, wood, scene, 1505, -16, 350);
const network = createNetwork();
validateNetwork(network);
const toPath = (p) => ({ ...p, points: p.points.map((v) => new THREE.Vector3(v.x, 3.5, v.z)) });
const railPaths = Object.fromEntries(Object.entries(network.edges).map(([id, p]) => [id, toPath(p)]));
const loops = [0, 1, 2].map((lane) => {
  const parts = Object.values(railPaths).filter((p) => p.lane === lane);
  return { length: parts.reduce((n, p) => n + p.length, 0) };
});
const yard = railPaths;
function at(path, u) {
  const target = clamp(u, 0, 1) * path.length, ds = path.distance;
  let low = 0, high = ds.length - 1;
  while (high - low > 1) {
    const m = low + high >> 1;
    if (ds[m] < target) low = m;
    else high = m;
  }
  const t = clamp((target - ds[low]) / (ds[high] - ds[low] || 1), 0, 1);
  return path.points[low].clone().lerp(path.points[high], t);
}
function tangent(path, u) {
  let a = at(path, clamp(u - 1e-3, 0, 1)), b = at(path, clamp(u + 1e-3, 0, 1));
  return b.sub(a).normalize();
}
function pathAtLoop(path, u) {
  return at(path, mod(u));
}
function addRail(path, label) {
  const points = path.points;
  const railbed = new THREE.BufferGeometry();
  let verts = [], indices = [], uv = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i], t = tangent(path, path.distance[i] / path.length), side = new THREE.Vector3(-t.z, 0, t.x).multiplyScalar(12.3);
    verts.push(p.x - side.x, 1.3, p.z - side.z, p.x + side.x, 1.3, p.z + side.z);
    uv.push(0, path.distance[i] / 18, 1, path.distance[i] / 18);
    if (i) {
      const k = i * 2;
      indices.push(k - 2, k - 1, k, k - 1, k + 1, k);
    }
  }
  railbed.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  railbed.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  railbed.setIndex(indices);
  railbed.computeVertexNormals();
  const bedMesh = new THREE.Mesh(railbed, ballast);
  bedMesh.receiveShadow = true;
  scene.add(bedMesh);
  for (const signed of [-1, 1]) {
    const mesh = new THREE.Mesh(railGeometry(path, signed), steel);
    mesh.castShadow = true;
    scene.add(mesh);
  }
  const slpShape = new THREE.BoxGeometry(15, 1.8, 2.5), instances = Math.max(3, Math.floor(path.length / 12.5));
  const ties = new THREE.InstancedMesh(slpShape, sleepers, instances), obj = new THREE.Object3D();
  for (let i = 0; i < instances; i++) {
    const u = (i + 0.5) / instances, p = at(path, u), tan = tangent(path, u);
    obj.position.set(p.x, 2.65, p.z);
    obj.rotation.set(0, -Math.atan2(tan.z, tan.x), 0);
    obj.updateMatrix();
    ties.setMatrixAt(i, obj.matrix);
  }
  ties.instanceMatrix.needsUpdate = true;
  ties.receiveShadow = true;
  scene.add(ties);
  return { mesh: bedMesh, label };
}
Object.values(railPaths).forEach((p) => addRail(p, p.id));
const windowDay = mat("#3f5d62"), windowNight = new THREE.MeshStandardMaterial({ color: "#ebc174", emissive: "#ffbb58", emissiveIntensity: 0.2, roughness: 0.9 });
function buildHouse(x, z, w, d, h, wall, roof, type = "house", orientation = 0) {
  const g = new THREE.Group();
  g.position.set(x, 1.5, z);
  g.userData.building = { w, d, h };
  g.rotation.y = orientation;
  scene.add(g);
  const base = box(w, h, d, wall, g, 0, h / 2, 0);
  const pitch = type === "factory" ? 0.19 : 0.36, roofHeight = w * pitch * 0.5;
  const roofA = box(Math.hypot(w * 0.5, roofHeight) + 7, 3, d + 10, roof, g, -w * 0.25, h + roofHeight * 0.54, 0);
  roofA.rotation.z = Math.atan2(roofHeight, w * 0.5);
  const roofB = box(Math.hypot(w * 0.5, roofHeight) + 7, 3, d + 10, roof, g, w * 0.25, h + roofHeight * 0.54, 0);
  roofB.rotation.z = -Math.atan2(roofHeight, w * 0.5);
  const gable = new THREE.BufferGeometry();
  gable.setAttribute("position", new THREE.Float32BufferAttribute([-w / 2, h, d / 2, w / 2, h, d / 2, 0, h + roofHeight, d / 2, w / 2, h, -d / 2, -w / 2, h, -d / 2, 0, h + roofHeight, -d / 2], 3));
  gable.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 0.5, 1, 0, 0, 0, 0.5, 0.5], 2));
  gable.computeVertexNormals();
  const gableMesh = new THREE.Mesh(gable, wall);
  gableMesh.castShadow = true;
  gableMesh.receiveShadow = true;
  g.add(gableMesh);
  for (let side of [-1, 1]) {
    for (let i = -1; i <= 1; i++) {
      const pane = box(10, 13, 1, windowDay, g, i * w * 0.27, h * 0.52, side * (d / 2 + 0.8));
      const bright = box(8, 11, 1.5, windowNight, g, i * w * 0.27, h * 0.52, side * (d / 2 + 1.2));
      const trim = mat("#e1ceb0");
      box(12, 1.4, 2, trim, g, i * w * 0.27, h * 0.52 + 7, side * (d / 2 + 1.9));
      box(12, 1.4, 3, trim, g, i * w * 0.27, h * 0.52 - 7, side * (d / 2 + 1.9));
      box(0.7, 12, 2, trim, g, i * w * 0.27, h * 0.52, side * (d / 2 + 2));
      for (const dx of [-7, 7]) box(3.5, 14, 1.3, roofGray, g, i * w * 0.27 + dx, h * 0.52, side * (d / 2 + 1.2));
    }
  }
  box(15, 24, 1.2, roofRed, g, -w * 0.33, 12, d / 2 + 1);
  if (type === "factory") {
    box(8, h * 0.72, 8, mat("#996958"), g, w * 0.29, h * 0.99, -d * 0.3);
  }
  box(w + 8, 2, 2, mat("#534b40"), g, 0, h, d / 2 + 4);
  box(2, h, 2, mat("#645c4b"), g, w / 2 - 3, h / 2, d / 2 + 2);
  if (type !== "factory") {
    box(6, 14, 6, brick, g, w * 0.28, h + 10, -d * 0.22);
    box(8, 2, 8, mat("#6d6354"), g, w * 0.28, h + 18, -d * 0.22);
    box(20, 2, 7, mat("#a3977e"), g, -w * 0.33, 1, d / 2 + 4);
  }
  return g;
}
const hstyle = mat("#d8c4a6"), hbrick = mat("#b68d77"), hboard = mat("#98735b");
for (const b of LEGACY_BUILDINGS) {
  const building = buildHouse(b.x, b.z, b.w, b.d, b.h, [hstyle, hbrick, hboard, cream][b.style], [roofRed, roofGray][b.roof], b.type);
  building.name = b.id;
}
const logmat = mat("#7f6749");
for (let i = 0; i < 38; i++) {
  const x = 1070 + i % 10 * 8, z = 294 + Math.floor(i / 10) * 7;
  const l = cylinder(2.9, 2.9, 47, logmat, scene, x, 5.2 + Math.floor(i / 20) * 5, z, 7);
  l.rotation.z = PI / 2;
}
const tower = mat("#66665d");
cylinder(3.2, 3.2, 55, tower, scene, 915, 29, 331, 8);
const tank = cylinder(16, 14, 22, mat("#6a7d7c"), scene, 915, 65, 331, 12);
for (let j = 0; j < 4; j++) {
  const a = j * PI / 2;
  box(2, 46, 2, tower, scene, 915 + 11 * Math.cos(a), 25, 331 + 11 * Math.sin(a));
}
const round = mat("#9c8c72");
cylinder(7, 7, 2, round, scene, 915, 78, 331, 10);
const roadMat = mat("#686c61"), curb = mat("#aaa99a");
box(535, 1.2, 34, roadMat, scene, 412.5, 1.1, 500);
box(335, 1.2, 34, roadMat, scene, 987.5, 1.1, 500);
box(140, 1.2, 18, roadMat, scene, 750, 1.1, 489);
box(1008, 1, 2.5, curb, scene, 650, 1.8, 481);
box(535, 1, 2.5, curb, scene, 412.5, 1.8, 519);
box(335, 1, 2.5, curb, scene, 987.5, 1.8, 519);
box(140, 1, 2.5, curb, scene, 750, 1.8, 499);
for (let x = 198; x < 1110; x += 70) box(30, 0.5, 1.2, mat("#d2c8a5"), scene, x, 2, x > 680 && x < 820 ? 489 : 500);
const glow = new THREE.MeshStandardMaterial({ color: "#ead4a3", emissive: "#edb768", emissiveIntensity: 0.6 });
const lamps = [];
for (let x = 520; x <= 915; x += 78) {
  const pole = cylinder(0.7, 0.8, 27, tower, scene, x, 14, 522, 6);
  const ball = sphere(2.3, glow, scene, x, 29, 522);
  lamps.push(ball);
}
const signalGreen = new THREE.MeshStandardMaterial({ color: "#55b98a", emissive: "#259e58", emissiveIntensity: 0.4 });
const signalGold = new THREE.MeshStandardMaterial({ color: "#f0bd64", emissive: "#aa7724", emissiveIntensity: 0.6 });
const switchSpecs = [
  { id: "WX-A", name: "WX310 ovest", x: 595, z: 84, kind: "cross", lanes: [0, 1], on: false },
  { id: "WX-B", name: "WX310 est", x: 955, z: 51, kind: "cross", lanes: [1, 2], on: false },
  { id: "Y-IN", name: "Accesso merci", x: 812, z: 101, kind: "lead", on: false },
  { id: "Y-2", name: "Tronchino nord", x: 665, z: 168, kind: "upper", on: false },
  { id: "Y-3", name: "Tronchini ovest", x: 410, z: 284, kind: "west", on: false },
  { id: "Y-R1", name: "Runaround ovest", x: 410, z: 310, kind: "passing", on: false },
  { id: "Y-R2", name: "Runaround est", x: 825, z: 247, kind: "passing", on: false },
  { id: "Y-4", name: "Tronchino est", x: 880, z: 247, kind: "right", on: false }
];
const switchTopology = createSwitchTopology(network, switchSpecs);
const switchHandles = [];
function makeSwitch(s) {
  const group = new THREE.Group();
  group.position.set(s.x, 0, s.z);
  box(12, 2, 12, mat("#34473e"), group, 0, 6, 0);
  const bulb = sphere(6, signalGreen, group, 0, 14, 0);
  bulb.userData.switchId = s.id;
  group.userData.switchId = s.id;
  const stalk = cylinder(1.1, 1.1, 9, mat("#5b6d5a"), group, 0, 9, 0);
  stalk.userData.switchId = s.id;
  scene.add(group);
  s.group = group;
  s.bulb = bulb;
  switchHandles.push(group);
}
switchSpecs.forEach(makeSwitch);
const railWheel = mat("#292c2a", 0.8), chassisRed = mat("#9a3a30");
const locoBlack = mat("#323736", 0.62, 0.16), locoCrimson = mat("#b94334"), locoCream = mat("#d8c49a");
const wagonColors = ["#8f5c43", "#71826f", "#a27e50", "#7f6e5d"];
const wagonMats = wagonColors.map((c) => mat(c));
function wheelSet(group, len) {
  for (let a of [-len * 0.31, len * 0.31]) for (let side of [-6, 6]) {
    const o = cylinder(4.2, 4.2, 2, railWheel, group, a, 3.7, side, 12);
    o.rotation.x = PI / 2;
    o.userData.wheel = true;
  }
}
function freightWagon(i) {
  const g = new THREE.Group();
  g.userData.dynamic = true;
  box(50, 3, 13, mat("#4b4640"), g, 0, 6, 0);
  wheelSet(g, 43);
  box(44, 11, 12, wagonMats[i % wagonMats.length], g, 0, 14, 0);
  if (i % 3 === 0) {
    for (let j = -2; j <= 2; j++) {
      const log2 = cylinder(2.4, 2.4, 42, logmat, g, j * 0.2, 21, j * 2.2);
      log2.rotation.z = PI / 2;
    }
  } else {
    box(43, 2, 12, mat("#625a48"), g, 0, 20, 0);
  }
  wagonDetails(g);
  attachTrainAsset(g, ["lumber", "tank", "box"][i % 3]);
  return g;
}
function locoModel(id,trainId=id) {
  const g = new THREE.Group();
  g.userData.trainId = trainId;
  if (id === 0) {
    box(62, 3.6, 13, chassisRed, g, 2, 9, 0);
    wheelSet(g, 58);
    const boiler = cylinder(8, 8, 43, locoBlack, g, 7, 20, 0, 14);
    boiler.rotation.z = PI / 2;
    box(20, 22, 14, locoBlack, g, -24, 22, 0);
    box(17, 3, 17, locoBlack, g, -24, 36, 0);
    box(18, 16, 12, locoBlack, g, -38, 17, 0);
    for (let p of [16, 26]) cylinder(2, 2, 8, locoBlack, g, p, 29, 0);
    const cap = cylinder(4, 4, 2, locoBlack, g, 27, 33, 0);
    cap.userData.trainId = trainId;
    box(50, 1, 1, steel, g, 0, 8.5, -8);
    box(50, 1, 1, steel, g, 0, 8.5, 8);
  } else {
    const long = id === 1 ? 61 : 47;
    box(long, 4, 15, chassisRed, g, 0, 8, 0);
    wheelSet(g, long * 0.85);
    box(long - 6, id === 1 ? 19 : 16, 14, id === 1 ? locoCrimson : locoCrimson, g, 0, id === 1 ? 22 : 21, 0);
    if (id === 1) {
      box(long - 5, 5, 15, mat("#a72d28"), g, 0, 34, 0);
      for (let x of [-24, 24]) box(9, 8, 1, locoCream, g, x, 26, 7.6);
    } else {
      box(18, 8, 15, locoBlack, g, 0, 31, 0);
      box(16, 3, 16, locoBlack, g, 0, 37, 0);
    }
    for (let x of [-13, 0, 13]) {
      box(7, 3, 0.5, mat("#e8c6aa"), g, x, 28, -7.6);
    }
  }
  const headMaterial = new THREE.MeshStandardMaterial({ color: "#faf0cb", emissive: "#ffe6a2", emissiveIntensity: 0.05 });
  for (const side of [-1, 1]) {
    const p = sphere(2, headMaterial, g, id === 0 ? 32 : id === 1 ? 31 : 24, id === 0 ? 18 : 24, side * 4);
    p.userData.trainId = trainId;
  }
  const beam = new THREE.SpotLight("#ffe4a2", 2, 320, 0.38, 0.65, 0);
  beam.position.set(32, 18, 0);
  beam.target.position.set(200, 0, 0);
  g.add(beam, beam.target);
  g.userData.beam = beam;
  g.userData.headMaterial = headMaterial;
  g.traverse((o) => {
    if (o.isMesh) o.userData.trainId = trainId;
  });
  locomotiveDetails(g, id);
  scene.add(g);
  return g;
}
const trains = [
  { id: 0, name: "BR 055", desc: "Vapore DB \xB7 Epoca III", icon: "\u{1F682}", loop: 2, p: 0.19, speed: 0, dir: 1, cars: 3, lights: true, laps: 0, mode: "loop", group: locoModel(0), carObjs: [] },
  { id: 1, name: "BR 216", desc: "Diesel DB \xB7 Epoca IV", icon: "\u{1F686}", loop: 1, p: 0.59, speed: 0, dir: 1, cars: 2, lights: false, laps: 0, mode: "loop", group: locoModel(1), carObjs: [] },
  { id: 2, name: "BR 260", desc: "Diesel da manovra DB", icon: "\u{1F689}", loop: 0, p: 0.8, speed: 0, dir: 1, cars: 2, lights: false, laps: 0, mode: "loop", group: locoModel(2), carObjs: [] }
];
for (let t of trains) {
  for (let i = 0; i < t.cars; i++) {
    let g = freightWagon(i + t.id);
    scene.add(g);
    t.carObjs.push(g);
  }
}
trains.forEach((t) => {
  t.modelKey = ["steam", "diesel", "shunter"][t.id];
  t.initial = {loop:t.loop,cars:t.cars,fraction:[.22,.65,.45][t.id]};
  t.nativeName = t.name;
  t.nativeDescription = t.desc;
});
const kenneyNames = ["Vapore K1", "Diesel K2", "Manovra K3"];
let rollingModelMode = $("rollingModels").value;
const assetReady = Promise.all(trains.map((t) => attachTrainAsset(t.group, t.modelKey, true)));
assetReady.then((loaded) => {
  trains.forEach((t, i) => t.assetLoaded = loaded[i]);
  updateModels();
});
function updateModels() {
  const active = $("rollingModels").value === "kenney";
  importedTrains(active);
  if (trains.some((t) => t.journey && !t.journey.ensure(t.journey.position - layoutFor(t).tail, route))) {
    importedTrains(rollingModelMode === "kenney");
    $("rollingModels").value = rollingModelMode;
    log("Spazio insufficiente per i rotabili più lunghi: sposta prima il convoglio.");
    return;
  }
  rollingModelMode = $("rollingModels").value;
  for (const t of trains) {
    t.name = active && t.assetLoaded ? kenneyNames[["steam","diesel","shunter"].indexOf(t.modelKey)] : t.nativeName;
    t.desc = active && t.assetLoaded ? "Kenney Train Kit \xB7 modello stilizzato" : t.nativeDescription;
  }
  ui();
}
$("rollingModels").onchange = updateModels;
const detached = [];
const selectRing = new THREE.Mesh(new THREE.TorusGeometry(25, 1.5, 5, 34), new THREE.MeshBasicMaterial({ color: "#efdc9d" }));
selectRing.rotation.x = PI / 2;
scene.add(selectRing);
let selected = 0, paused = false, day = 48, changes = 0, transferred = false, visitedRunaround = false, didDetach = false, didAttach = false, mission = 0;
const statuses = [
  { title: "Primo giro", body: "Fai completare un giro alla locomotiva a vapore sul suo anello.", done: () => trains[0].laps >= 1, detail: () => "Giri completati: " + trains[0].laps + " / 1" },
  { title: "Cambiare binario", body: "Attiva WX-A o WX-B e fai transitare una locomotiva da un anello all\u2019altro.", done: () => transferred, detail: () => transferred ? "Trasferimento riuscito" : "Nessun trasferimento" },
  { title: "Il lungo runaround", body: "Predisponi il gruppo manovra e percorri con la locomotiva da manovra uno dei due rami del runaround lungo.", done: () => visitedRunaround, detail: () => visitedRunaround ? "Runaround percorso" : "In attesa della locomotiva da manovra" },
  { title: "Composizione merci", body: "Sgancia un carro a treno fermo e poi riaggancialo sullo stesso binario.", done: () => didDetach && didAttach, detail: () => "Sgancio " + (didDetach ? "\u2713" : "\u25CB") + " \xB7 Aggancio " + (didAttach ? "\u2713" : "\u25CB") }
];
function log(s) {
  $("log").textContent = s;
}
function switchBy(kind) {
  return switchSpecs.find((s) => s.kind === kind);
}
function ui() {
  trainDeck?.sync();
  $("switchCount").textContent = switchSpecs.filter((s) => s.on).length + " / " + switchSpecs.length;
  $("switchList").innerHTML = switchSpecs.map((s, i) => '<button class="sw ' + (s.on ? "active" : "") + '" data-switch="' + i + '"><b>' + s.id + "</b><small>" + s.name + "</small></button>").join("");
  $("switchList").querySelectorAll("button").forEach((b) => b.onclick = () => toggle(+b.dataset.switch));
  $("missionIndex").textContent = mission + 1 + " / 4";
  $("missionName").textContent = statuses[mission].title;
  $("missionText").textContent = statuses[mission].body;
  missionUI();
  nextSwitchHUD?.refresh(true);
}
function missionUI() {
  $("missionStatus").textContent = statuses[mission].done() ? "\u2713 Obiettivo completato" : statuses[mission].detail();
}
function select(id) {
  if(!trains[id])return;
  selected = id;
  trainDeck?.select(id);
  ui();
}
function toggle(index) {
  const s = switchSpecs[index];
  const status = getSwitchAssistance().safetyByControl.get(s.id);
  if (!status || status.blocked) {
    log(status?.message ?? "Dati di sicurezza insufficienti: manovra bloccata.");
    nextSwitchHUD?.refresh(true);
    return;
  }
  s.on = !s.on;
  s.bulb.material = s.on ? signalGold : signalGreen;
  changes++;
  log(s.name + ": " + (s.on ? "deviato" : "diritto"));
  ui();
}
function lineFraction(path, x, z) {
  let best = Infinity, out = 0;
  path.points.forEach((p, i) => {
    const d = (p.x - x) ** 2 + (p.z - z) ** 2;
    if (d < best) {
      best = d;
      out = path.distance[i] / path.length;
    }
  });
  return out;
}
const transfers = [
  { switchIndex: 0, x: 510, source: [0, 1] },
  { switchIndex: 1, x: 915, source: [1, 2] }
];
function crossed(before, after, needle, sign) {
  const a = mod(before), b = mod(after);
  return sign > 0 ? mod(needle - a) < mod(b - a) : mod(a - needle) < mod(a - b);
}
const route = routing(network, (id) => switchSpecs.find((s) => s.id === id)?.on || false);
function layoutFor(t, extra = []) {
  return consistLayout([t.group, ...t.carObjs, ...extra].map((o) => o.userData));
}
function vehiclePositions(t) {
  return layoutFor(t).offsets.map((offset, i) => ({
    train: t, vehicle: [t.group, ...t.carObjs][i], ...t.journey.locate(t.journey.position - offset)
  }));
}
function getSwitchAssistance() {
  const occupied = [], moving = [];
  for (const t of trains) {
    const vehicles = [t.group, ...t.carObjs], layout = layoutFor(t);
    const direction = Math.abs(t.velocity) > .1 ? Math.sign(t.velocity) : t.dir;
    const index = direction < 0 ? vehicles.length - 1 : 0;
    const leading = vehicles[index].userData.couplers;
    const preview = traceJourney(network, switchTopology, t.journey, direction, layout.offsets[index], route);
    moving.push({ preview, velocity:t.velocity, leadingExtent: direction < 0 ? -(leading?.back?.x ?? -48) : leading?.front?.x ?? 48 });
    vehicles.forEach((o,i)=>occupied.push(...occupiedRanges(network,t.journey,layout.offsets[i],o.userData.couplers)));
  }
  for (const d of detached) {
    const edge = network.edges[d.point.edge];
    if (!edge) continue;
    const c = d.group.userData.couplers, extent = Math.max(c?.front?.x ?? 48,-(c?.back?.x ?? -48));
    occupied.push({edge:edge.id,min:Math.max(0,d.point.s-extent),max:Math.min(edge.length,d.point.s+extent)});
  }
  const safetyByControl = new Map();
  for (const site of switchTopology.sites) {
    const safety = siteSafety(site, occupied, moving);
    for (const id of site.controls) safetyByControl.set(id,safety);
  }
  const preview = moving[selected].preview;
  return { preview, safety:preview.next?safetyByControl.get(preview.next.site.controls[0]):null,
    safetyByControl, trainName:trains[selected].name, controls:switchSpecs,
    inverting:Math.abs(trains[selected].velocity)>.1 && Math.sign(trains[selected].velocity)!==trains[selected].dir };
}
function switchHUDState() {
  const state = getSwitchAssistance();
  document.querySelectorAll("[data-switch]").forEach((b)=>{
    const sw=switchSpecs[Number(b.dataset.switch)], safety=state.safetyByControl.get(sw.id);
    b.disabled=!safety || safety.blocked;
    b.title=!safety?"Dati di sicurezza insufficienti":safety.blocked?safety.message:"Cambia posizione dello scambio";
  });
  return state;
}
function initializeJourney(t) {
  const edge = "L" + t.loop + "-return";
  t.journey = new Journey(network, edge, network.edges[edge].length * (t.initial?.fraction ?? .45));
  t.velocity = 0;
  t.odometer = 0;
  t.previousLane = t.loop;
  t.journey.ensure(t.journey.position - layoutFor(t).tail, route);
}
trains.forEach(initializeJourney);
function vehicleLocation(t, behind = 0) {
  const p = t.journey.locate(t.journey.position - behind);
  return { point: new THREE.Vector3(p.x, 3.5, p.z), angle: p.angle };
}
function renderVehicles() {
  for (const t of trains) {
    const layout = layoutFor(t);
    t.journey.ensure(t.journey.position - layout.tail, route);
    const pos = vehicleLocation(t);
    t.group.position.copy(pos.point).add(new THREE.Vector3(0, 3.6, 0));
    t.group.rotation.y = pos.angle;
    t.carObjs.forEach((o, i) => {
      o.visible = true;
      const q = vehicleLocation(t, layout.offsets[i + 1]);
      o.position.copy(q.point);
      o.rotation.y = q.angle;
    });
    for (const group of [t.group, ...t.carObjs]) group.traverse((o) => {
      if (o.userData.wheel) o.rotation.z = -t.odometer / 4.2;
      if (o.userData.importedWheel) o.rotation.x = -t.odometer / o.userData.wheelRadius;
    });
  }
  selectRing.position.copy(vehicleLocation(trains[selected]).point);
  selectRing.position.y = 5.2;
  for (const d of detached) {
    d.group.visible = true;
    d.group.position.set(d.point.x, 3.5, d.point.z);
    d.group.rotation.y = d.point.angle;
  }
}
function advance(t, dt) {
  const desired = t.dir * (t.speed / 100) * 150;
  const acceleration = Math.abs(desired) < Math.abs(t.velocity) ? 100 : 45;
  t.velocity += clamp(desired - t.velocity, -acceleration * dt, acceleration * dt);
  if (Math.abs(t.velocity) < 1e-3) return;
  if (!t.journey.move(t.velocity * dt, layoutFor(t).tail, route)) {
    t.speed = 0;
    t.velocity = 0;
    log(t.name + ": fine binario, inverti la marcia.");
    ui();
    return;
  }
  t.odometer += t.velocity * dt;
  const previousRoute = t.mode + "/" + t.loop + "/" + t.section;
  const location2 = t.journey.locate(), edge = network.edges[location2.edge];
  if (edge.lane !== void 0) {
    if (edge.lane !== t.previousLane) {
      transferred = true;
      t.previousLane = edge.lane;
    }
    t.loop = edge.lane;
    t.mode = "loop";
  } else {
    t.mode = "yard";
    t.section = edge.id;
    if (edge.id === "runMain" || edge.id === "runAround") visitedRunaround = true;
  }
  t.laps = Math.floor(t.journey.travel / loops[t.loop].length);
  if (previousRoute !== t.mode + "/" + t.loop + "/" + t.section) ui();
}
let protectionTimer = 0;
function updateTrainStatus(dt) {
  protectionTimer -= dt;
  if (protectionTimer > 0) return;
  protectionTimer = 0.08;
  const occupied = trains.map((t) => vehiclePositions(t));
  for (let a = 0; a < occupied.length; a++) for (let b = a + 1; b < occupied.length; b++) {
    if (occupied[a].some((u) => occupied[b].some((v) => u.edge === v.edge ? Math.abs(u.s - v.s) < (u.vehicle.userData.assetDimensions || v.vehicle.userData.assetDimensions ? Math.max(couplingDistance(u.vehicle.userData, v.vehicle.userData), couplingDistance(v.vehicle.userData, u.vehicle.userData)) : 58) : Math.hypot(u.x - v.x, u.z - v.z) < 17))) {
      const u = trains[a], v = trains[b];
      if (u.speed || v.speed || u.velocity || v.velocity) {
        u.speed = v.speed = u.velocity = v.velocity = 0;
        log("Protezione: convogli troppo vicini, arresto automatico.");
        ui();
      }
    }
  }
  for (const t of trains) if (detached.some((d) => vehiclePositions(t).some((p) => {
    return Math.hypot(p.x - d.point.x, p.z - d.point.z) < (p.vehicle.userData.assetDimensions || d.group.userData.assetDimensions ? couplingDistance(p.vehicle.userData, d.group.userData) + 4 : 48);
  })) && t.velocity) {
    t.speed = t.velocity = 0;
    log("Carro fermo davanti al convoglio: arresto per aggancio.");
    ui();
  }
}
function uncouple() {
  const t = trains[selected];
  if (Math.abs(t.velocity) > 0.1 || t.speed) {
    log("Ferma il convoglio prima di sganciare.");
    return;
  }
  if (!t.cars) return;
  const point = t.journey.locate(t.journey.position - layoutFor(t).offsets.at(-1)), group = t.carObjs.pop();
  detached.push({ point, group });
  t.cars = t.carObjs.length;
  didDetach = true;
  ui();
  log("Carro sganciato e lasciato sul binario.");
}
function couple() {
  const t = trains[selected];
  if (t.speed || Math.abs(t.velocity) > 0.1) {
    log("Ferma il convoglio prima di agganciare.");
    return;
  }
  if (t.cars >= 5) {
    log("Lunghezza massima: cinque carri.");
    return;
  }
  const tail = t.journey.locate(t.journey.position - layoutFor(t).offsets.at(-1));
  const i = detached.findIndex((d) => d.point.edge === tail.edge && Math.hypot(d.point.x - tail.x, d.point.z - tail.z) < 115);
  if (i < 0) {
    log("Nessun carro vicino alla coda sullo stesso binario.");
    return;
  }
  if (!t.journey.ensure(t.journey.position - layoutFor(t, [detached[i].group]).tail, route)) {
    log("Spazio insufficiente.");
    return;
  }
  t.carObjs.push(detached.splice(i, 1)[0].group);
  t.cars = t.carObjs.length;
  didAttach = true;
  ui();
  log("Carro agganciato.");
}
function removeWagon(group) {
  releaseTrainAsset(group);
  const geometries = /* @__PURE__ */ new Set();
  group.traverse((o) => {
    if (o.isMesh) geometries.add(o.geometry);
  });
  geometries.forEach((g) => g.dispose());
  scene.remove(group);
}
function reset() {
  if (!confirm("Riportare a zero locomotive, scambi e missioni?")) return;
  for (const d of detached) removeWagon(d.group);
  detached.length = 0;
  switchSpecs.forEach((s) => {
    s.on = false;
    s.bulb.material = signalGreen;
  });
  trains.forEach((t, i) => {
    t.carObjs.forEach(removeWagon);
    t.carObjs = [];
    Object.assign(t, { loop: t.initial.loop, speed: 0, dir: 1, cars: t.initial.cars, laps: 0, mode: "loop" });
    for (let j = 0; j < t.cars; j++) {
      const o = freightWagon(j + i);
      scene.add(o);
      t.carObjs.push(o);
    }
    initializeJourney(t);
  });
  paused = false;
  mission = 0;
  transferred = visitedRunaround = didDetach = didAttach = false;
  $("pause").textContent = "\u2161 Pausa";
  ui();
  log("Ripristino completato.");
}
function setTrainSpeed(id,value) {
  const t=trains[id];if(!t)return;
  t.speed=clamp(value,0,100);trainDeck?.sync();
}
function reverseTrain(id) {
  const t=trains[id];if(!t)return;
  t.dir*=-1;log(t.name+" ha invertito direzione");trainDeck?.sync();nextSwitchHUD?.refresh(true);
}
function stopTrain(id) {
  const t=trains[id];if(!t)return;
  t.speed=t.velocity=0;ui();log(t.name+" ferma");
}
function toggleTrainLights(id) {
  const t=trains[id];if(!t)return;
  t.lights=!t.lights;ui();
}
$("day").oninput = (e) => {
  day = +e.target.value;
  $("sun").textContent = day < 42 ? "\u2600" : day < 72 ? "\u25D0" : "\u263E";
};
$("nextMission").onclick = () => {
  mission = (mission + 1) % statuses.length;
  ui();
};
$("pause").onclick = () => {
  paused = !paused;
  $("pause").textContent = paused ? "\u25B6 Riprendi" : "\u2161 Pausa";
  log(paused ? "Simulazione sospesa." : "Simulazione ripresa.");
  trainDeck?.update();
};
$("reset").onclick = reset;
$("homeView").onclick = () => {
  nav.select("overview");
  $("cameraView").value = "overview";
};
$("cameraView").onchange = (e) => nav.select(e.target.value);
$("planBtn").onclick = () => {
  const paths = Object.values(network.edges).map((p) => '<polyline points="' + p.points.map((v) => v.x + "," + v.z).join(" ") + '" fill="none" stroke="' + (p.lane === void 0 ? "#a65c2e" : "#35483c") + '" stroke-width="4"/>').join("");
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1500 700"><rect width="1500" height="700" fill="#e4e7d9"/>' + paths + "</svg>";
  const img = document.querySelector(".planImage");
  if (img.dataset.blob) URL.revokeObjectURL(img.dataset.blob);
  img.dataset.blob = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  img.src = img.dataset.blob;
  $("planModal").hidden = false;
};
$("helpBtn").onclick = () => $("helpModal").hidden = false;
document.querySelectorAll("[data-close]").forEach((btn) => btn.onclick = () => $(btn.dataset.close).hidden = true);
document.querySelectorAll(".modal").forEach((el) => el.onclick = (e) => {
  if (e.target === el) el.hidden = true;
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") document.querySelectorAll(".modal").forEach((e2) => e2.hidden = true);
});
const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
let down = null;
renderer.domElement.addEventListener("pointerdown", (e) => down = { x: e.clientX, y: e.clientY });
renderer.domElement.addEventListener("pointerup", (e) => {
  if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 7) return;
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.set((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects([...switchHandles, ...trains.map((t) => t.group)], true);
  if (hit.length) {
    let node = hit[0].object;
    while (node && !node.userData.switchId && node.userData.trainId === void 0) node = node.parent;
    if (node?.userData.switchId) {
      let i = switchSpecs.findIndex((s) => s.id === node.userData.switchId);
      if (i >= 0) toggle(i);
    } else if (node?.userData.trainId !== void 0) select(node.userData.trainId);
  }
  down = null;
});
trains.forEach((t) => {
  t.group.userData.dynamic = true;
  t.carObjs.forEach((o) => o.userData.dynamic = true);
});
selectRing.userData.dynamic = true;
const scenic = enrich(scene, renderer, { ballast, ground, wood, network, roofMaterials: [roofRed, roofGray], wallMaterials: [hstyle, hbrick, hboard, cream], foundation: ballastLayer });
const nav = navigation(camera, controls, { height: scenic.cameraHeight, buildings: scenic.buildings });
const views = mountViewControls({ camera, controls, navigation: nav, host: $("viewControls"), onViewChange: (preset) => {
  $("cameraView").value = preset;
} });
trainDeck = mountTrainDeck({host:$("trainDeck"),tabs:$("tabs"),network,getTrains:()=>trains,getSelected:()=>selected,isPaused:()=>paused,
  onSelect:select,onSpeed:setTrainSpeed,onReverse:reverseTrain,onStop:stopTrain,onLights:toggleTrainLights,onUncouple:uncouple,onCouple:couple,
  onFocus:(id)=>{nav.focus(trains[id].journey.locate());$("cameraView").value="manual";}
});
nextSwitchHUD = mountNextSwitchHUD({host,network,getState:switchHUDState});
const quality = new QualityController({ profile: innerWidth < 700 ? "low" : "high" });
function applyQuality(profile) {
  $("quality").querySelector("[value=auto]").textContent = "Automatica \xB7 " + (profile === "low" ? "Leggera" : "Alta");
  renderer.setPixelRatio(profile === "low" ? 1 : Math.min(devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = profile !== "low";
  scenic.setQuality(profile);
  resize();
}
$("quality").onchange = (e) => applyQuality(quality.setMode(e.target.value));
quality.setMode("auto");
applyQuality(quality.profile);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) quality.update(0, false);
});
window.addEventListener("keydown", (e) => {
  if (e.code === "Space" && !["INPUT", "SELECT", "BUTTON"].includes(e.target.tagName)) {
    e.preventDefault();
    $("stop").click();
  }
});
const observer = new ResizeObserver(resize);
observer.observe(host);
function resize() {
  const w = host.clientWidth, h = host.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  effects.resize(w, h);
  camera.aspect = w / h;
  camera.fov = Math.max(35, Math.min(65, 49 / camera.aspect));
  camera.updateProjectionMatrix();
}
const smoke = steam(scene);
let animationHandle = 0;
window.addEventListener("pagehide", (e) => {
  if (e.persisted) return;
  cancelAnimationFrame(animationHandle);
  observer.disconnect();
  controls.dispose();
  views.dispose();
  nextSwitchHUD?.dispose();
  trainDeck?.dispose();
  nav.dispose();
  effects.dispose();
  disposeTrainAssets();
  const gs = /* @__PURE__ */ new Set(), ms = /* @__PURE__ */ new Set(), ts = /* @__PURE__ */ new Set();
  scene.traverse((o) => {
    if (o.geometry) gs.add(o.geometry);
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (m) {
      ms.add(m);
      for (const value of Object.values(m)) if (value?.isTexture) ts.add(value);
    }
  });
  gs.forEach((g) => g.dispose());
  ms.forEach((m) => m.dispose());
  ts.forEach((t) => t.dispose());
  scenic.environment.dispose();
  renderer.dispose();
});
const clock = new FixedClock();
let last = performance.now(), frame = 0;
function tick(now) {
  const realDt = Math.max(0, (now - last) / 1e3);
  const dt = Math.min(0.2, realDt);
  last = now;
  if (!paused) {
    clock.update(dt, (step) => {
      trains.forEach((t) => advance(t, step));
      updateTrainStatus(step);
    });
  }
  frame++;
  renderVehicles();
  trainDeck?.update();
  const night = clamp((day - 35) / 65, 0, 1);
  sun.intensity = lerp(3.1, 0.25, night);
  sun.color.set(day > 40 ? "#e8b87d" : "#ffe9c7");
  renderer.toneMappingExposure = lerp(1.12, 0.85, night);
  skyLight.intensity = lerp(0.85, 0.22, night);
  fill.intensity = lerp(0.65, 0.1, night);
  scene.environmentIntensity = lerp(0.25, 0.07, night);
  trains.forEach((t) => {
    t.group.userData.headMaterial.emissiveIntensity = t.lights ? lerp(0.5, 3, night) : 0;
    t.group.userData.beam.visible = t.lights && night > 0.3;
  });
  scene.background.copy(new THREE.Color("#c5b79f").lerp(new THREE.Color("#202d3a"), night));
  scene.fog.color.copy(scene.background);
  windowNight.emissiveIntensity = lerp(0.02, 2.4, night);
  windowNight.color.setRGB(lerp(0.15, 0.8, night), lerp(0.22, 0.56, night), lerp(0.24, 0.23, night));
  glow.emissiveIntensity = lerp(0.4, 2.8, night);
  controls.update();
  nav.update(realDt, trains[selected].journey.locate());
  views.update();
  nextSwitchHUD?.refresh();
  if ($("cameraView").value !== nav.preset && nav.preset === "manual") $("cameraView").value = "manual";
  document.querySelector(".titleScene").hidden = nav.preset !== "overview" && nav.preset !== "manual" || camera.zoom > 1.4;
  const nextQuality = quality.update(realDt, !document.hidden);
  if (nextQuality) applyQuality(nextQuality);
  scenic.zones.update(night, dt);
  scenic.station.update(night, dt);
  scenic.update(paused ? 0 : dt, camera);
  smoke.update(paused ? 0 : dt, trains[0].group, camera, Math.abs(trains[0].velocity) > 2, quality.profile === "low");
  effects.render(quality.profile === "cinema");
  if (frame % 35 === 0) {
    $("fps").textContent = Math.round(1 / (realDt || 1 / 60)) + " FPS \xB7 v0.7.0";
    missionUI();
    $("sceneInfo").textContent = trains.filter((t) => t.speed > 0).length + " CONVOGLI IN MARCIA \xB7 4 TRONCHINI \xB7 RUNAROUND LUNGO";
  }
  animationHandle = requestAnimationFrame(tick);
}
resize();
ui();
$("loadMsg").hidden = true;
animationHandle = requestAnimationFrame(tick);
if (new URLSearchParams(location.search).has("diagnostics")) window.__serienDiagnostics = {
  captureThumbnail(id) {
    const t=trains[id];if(!t)throw new RangeError("Unknown locomotive");
    return captureLocomotiveThumbnail(renderer,t.group,scene.environment);
  },
  addTrain() {
    const id=trains.length;
    const t={id,name:`BR 216 · ${id+1}`,nativeName:`BR 216 · ${id+1}`,desc:"Diesel DB · convoglio di collaudo",nativeDescription:"Diesel DB · convoglio di collaudo",modelKey:"diesel",initial:{loop:2,cars:0,fraction:.6},loop:2,speed:0,dir:1,cars:0,lights:false,laps:0,mode:"loop",group:locoModel(1,id),carObjs:[]};
    trains.push(t);initializeJourney(t);
    attachTrainAsset(t.group,"diesel",true).then((loaded)=>{t.assetLoaded=loaded;updateModels();});
    renderVehicles();ui();return id;
  },
  placeTrain(id, edge, s, direction=1) {
    const t=trains[id], track=network.edges[edge];
    if(!t || !track || !Number.isFinite(s) || s<0 || s>track.length || ![1,-1].includes(direction)) throw new RangeError("Invalid diagnostic train placement");
    t.journey=new Journey(network,edge,s);
    t.dir=direction;t.speed=t.velocity=0;
    if(!t.journey.ensure(t.journey.position-layoutFor(t).tail,route)) throw new RangeError("Diagnostic consist does not fit");
    if(track.lane!==undefined){t.loop=track.lane;t.previousLane=track.lane;t.mode="loop";}else{t.mode="yard";t.section=edge;}
    renderVehicles();ui();
  },
  step(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0 || seconds > 120) throw new RangeError("Diagnostic step: 0…120 seconds");
    for (let remaining = seconds; remaining > 1e-9; remaining -= 1/60) {
      const dt = Math.min(1/60, remaining);
      trains.forEach((t) => advance(t, dt));
      updateTrainStatus(dt);
    }
    renderVehicles();
    trainDeck?.update();
    nextSwitchHUD?.refresh(true);
  },
  snapshot() {
  const hull = (group) => {
    group.updateWorldMatrix(true, true);
    const inverse = group.matrixWorld.clone().invert(), out = [];
    group.traverse((o) => {
      if (!o.isMesh) return;
      let a = o;
      while (a && a !== group) {
        if (!a.visible) return;
        a = a.parent;
      }
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const b = o.geometry.boundingBox, m = inverse.clone().multiply(o.matrixWorld);
      for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) {
        const p = new THREE.Vector3(x, y, z).applyMatrix4(m);
        out.push({ x: p.x, y: p.y + group.position.y, z: p.z });
      }
    });
    return out;
  };
  const assistance = getSwitchAssistance();
  const next = assistance.preview.next;
  return { consoles: {visible:trainDeck?.visibleIds, recent:trainDeck?.recentIds, active:selected}, nextSwitch: { site:next?.site.id ?? null, controls:next?.site.controls ?? [], name:next?.site.name ?? null, distance:next?.distance ?? null, outgoing:next?.outgoing ?? null, destination:next?.destination ?? null, stop:assistance.preview.stop, uncertain:assistance.preview.uncertain, safety:assistance.safety, highlighted:false, minimized:nextSwitchHUD?.panel.classList.contains("is-minimized") }, quality: { mode: quality.mode, profile: quality.profile }, camera: { preset: nav.preset, position: camera.position.toArray(), target: controls.target.toArray() }, render: { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, ...renderer.info.memory }, stock: trains.map((t) => ({ id: t.id, name:t.name, speed:t.speed, velocity:t.velocity, dir:t.dir, lights:t.lights, modelKey:t.modelKey, hull: hull(t.group), cars: t.carObjs.map(hull), layout: layoutFor(t), vehicles: vehiclePositions(t).map((p) => ({ x:p.x, z:p.z, rendered:{x:p.vehicle.position.x,z:p.vehicle.position.z}, edge:p.edge, s:p.s, couplers:p.vehicle.userData.couplers, dimensions:p.vehicle.userData.assetDimensions ?? null })) })), detached: detached.map((d) => ({...d.point})), scenery: { tunnel:false, trees:scenic.trees, buildings:scenic.buildings }, pendingStops: scenic.zones.pendingStops.map((p) => p.edge) };
} };
