import {animateAuxiliaryWheels} from './src/rolling-stock-animation.js';
import {stepRailway} from './src/railway-step.js';
import {vehiclesConflict,envelopeGap} from './src/railway-conflicts.js';
import {createFleetCommands} from './src/fleet-commands.js';
import {layoutFor,vehiclePositions,deriveSwitchAssistance,collectRailwayState} from './src/railway-state.js';
import {buildStock,animateStock} from './src/rolling-stock.js';
import {createRailMaterial,fitSunShadow} from "./src/graphic-foundations.js";
import {createTurnoutPicking} from "./src/turnout-picking.js";
import {createTurnoutGlow,GLOW_CONFIG} from "./src/turnout-glow.js";
import {mountTurnoutInteraction} from "./src/turnout-interaction.js";
import {createTurnoutModel} from "./src/turnout-routes.js";
import {createTurnoutCommands} from "./src/turnout-commands.js";
import { mountTrainDeck } from "./src/train-deck.js";
import { captureLocomotiveThumbnail } from "./src/locomotive-thumbnails.js";
import { createSwitchTopology, traceJourney } from "./src/next-switch.js";
import { mountNextSwitchHUD, createRouteHighlight, previewPoints } from "./src/next-switch-view.js";
import { LEGACY_BUILDINGS } from "./src/scenic-plan.js";
import { mountViewControls } from "./src/view-controls.js";
import { couplingDistance } from "./src/consist.js";
import { railGeometry } from "./src/rail-profile.js";
import { navigation, CAMERA_PRESETS } from "./src/navigation.js";
import { QualityController } from "./src/quality.js";
import { attachTrainAsset, importedTrains, releaseTrainAsset, disposeTrainAssets } from "./src/train-assets.js";
import { locomotiveDetails, steam } from "./src/rolling-stock-art.js";
import { presentation } from "./src/presentation.js";
import { enrich } from "./src/scenery.js";
import { createNetwork, validateNetwork, loopPosition } from "./src/network.js";
import { Journey, routing, FixedClock } from "./src/simulation.js";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
const $ = (id) => document.getElementById(id);
const host = $("view3d");
let nextSwitchHUD = null, trainDeck = null;
let highlightUntil=0,highlightUpdated=0;
importedTrains($("rollingModels").value === "kenney");
const scene = new THREE.Scene();
scene.background = new THREE.Color("#9fbcc5");
scene.fog = new THREE.Fog("#b8c3af", 1900, 3700);
const camera = new THREE.PerspectiveCamera(35, 1, 1, 6500);
camera.position.fromArray(CAMERA_PRESETS.overview.position);
camera.lookAt(new THREE.Vector3(...CAMERA_PRESETS.overview.target));
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
controls.target.fromArray(CAMERA_PRESETS.overview.target);
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
const runningRailSteel=createRailMaterial();
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
const PI = Math.PI, lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => Math.min(b, Math.max(a, v));
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
fitSunShadow(sun);
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
const routeHighlight=createRouteHighlight(scene);
const network = createNetwork();
validateNetwork(network);
const toPath = (p) => ({ ...p, points: p.points.map((v) => new THREE.Vector3(v.x, 3.5, v.z)) });
const railPaths = Object.fromEntries(Object.entries(network.edges).map(([id, p]) => [id, toPath(p)]));
const loops = network.mainLoops;
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
    const mesh = new THREE.Mesh(railGeometry(path, signed), runningRailSteel);
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
const controlOrder=["WX-A","WX-B","Y-IN","Y-2","Y-3","Y-R1","Y-R2","Y-4"];
const switchSpecs=controlOrder.map((id)=>({...network.controllers.find((c)=>c.id===id),on:false}));
const turnoutModel=createTurnoutModel(network);
const switchTopology = createSwitchTopology(network, switchSpecs);
// Compatibility snapshot for existing railway diagnostics; no indicator meshes.
function switchIndicatorState(){return {active:turnoutInteraction.active,source:turnoutInteraction.source,markers:0,
  states:switchSpecs.map(s=>({id:s.id,on:s.on,position:[s.x,6.08,s.z]}))};}
const railWheel = mat("#292c2a", 0.8), chassisRed = mat("#9a3a30");
const locoBlack = mat("#323736", 0.62, 0.16), locoCrimson = mat("#b94334"), locoCream = mat("#d8c49a");
function wheelSet(group, len) {
  for (let a of [-len * 0.31, len * 0.31]) for (let side of [-6, 6]) {
    const o = cylinder(4.2, 4.2, 2, railWheel, group, a, 3.7, side, 12);
    o.rotation.x = PI / 2;
    o.userData.wheel = true;
  }
}
function freightWagon(i) {
  const kind=['closed','open','tank','flat','coach'][i%5];
  const g=buildStock(kind);
  attachTrainAsset(g, ['box','lumber','tank','lumber','box'][i%5]);
  return g;
}
function locoModel(id,trainId=id) {
  const g = id===0||id===2 ? buildStock(id===0?'steam':'shunter') : new THREE.Group();
  g.userData.trainId = trainId;
  if(id===1) {
    const long = 61;
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
    const lampX=id===0?43:id===1?31:28,lampY=id===0?18:id===1?24:17;
    if(id!==1){
      const housing=cylinder(1.5,1.5,1.4,locoBlack,g,lampX-.8,lampY,side*4,12);housing.rotation.z=PI/2;
      if(id===0)cylinder(.6,.6,8,locoBlack,g,lampX-1,14,side*4,8);
    }
    const p = sphere(id===1?2:1.2, headMaterial, g, lampX, lampY, side * 4);
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
  if(id===1)locomotiveDetails(g, id);
  scene.add(g);
  return g;
}
const trains = [
  { id: 0, name: "BR 055", desc: "DB era III · dimensional study", loop: 2, speed: 0, dir: 1, cars: 3, lights: true, laps: 0, mode: "loop", group: locoModel(0), carObjs: [] },
  { id: 1, name: "BR 216", desc: "Diesel DB \xB7 Era IV", loop: 1, speed: 0, dir: 1, cars: 2, lights: false, laps: 0, mode: "loop", group: locoModel(1), carObjs: [] },
  { id: 2, name: "BR 260", desc: "DB era IV · V60 dimensional study", loop: 0, speed: 0, dir: 1, cars: 2, lights: false, laps: 0, mode: "loop", group: locoModel(2), carObjs: [] }
];
for (let t of trains) {
  for (let i = 0; i < t.cars; i++) {
    let g = freightWagon(t.id===1?i+3:i+t.id);
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
const kenneyNames = ["Steam K1", "Diesel K2", "Shunter K3"];
let rollingModelMode = $("rollingModels").value;
const startupTrains = [...trains];
const assetReady = Promise.all(startupTrains.map((t) => attachTrainAsset(t.group, t.modelKey, true)));
assetReady.then((loaded) => {
  startupTrains.forEach((t, i) => t.assetLoaded = loaded[i]);
  updateModels();
});
function updateModels() {
  const active = $("rollingModels").value === "kenney";
  const histories=trains.filter(t=>t.journey).map(t=>({journey:t.journey,segments:[...t.journey.segments],lastBlock:t.journey.lastBlock}));
  const clearances=()=>{
    const bodies=[...trains.filter(t=>t.journey).map(vehiclePositions),...detached.map(d=>[{...d.point,vehicle:d.group}])],pairs=new Map();
    bodies.forEach((a,i)=>bodies.slice(i+1).forEach(b=>a.forEach(p=>b.forEach(q=>pairs.set(p.vehicle.uuid+'/'+q.vehicle.uuid,{conflict:vehiclesConflict(p,q),gap:envelopeGap(p,q)})))));
    return pairs;
  };
  const previousClearances=clearances();
  importedTrains(active);
  const noRoom=trains.some((t) => t.journey && (!t.journey.ensure(t.journey.position - layoutFor(t).tail, route) || !t.journey.ensure(t.journey.position+(t.group.userData.couplers?.front?.x??48),route))) || detached.some(d=>{
    // A stationary vehicle may grow only inside its known route history;
    // never invent the missing branch of a frozen detached Journey.
    const j=d.journey,c=d.group.userData.couplers;
    return j&&(j.position+(c?.back?.x??-48)<j.segments[0].start||j.position+(c?.front?.x??48)>j.segments.at(-1).end||[[-1,-(c?.back?.x??-48)],[1,c?.front?.x??48]].some(([direction,extent])=>{
      // Cached unoccupied history may predate a legal switch change. New
      // body occupation must still agree with today's actual selected route.
      const preview=traceJourney(network,switchTopology,j,direction,0,route,extent);
      return preview.uncertain||preview.stop!=="limit";
    }));
  });
  // Existing coupler contact between dropped wagons may stay unchanged or
  // improve. Reject every new conflict, and every worsening existing one.
  const conflict=[...clearances()].some(([key,next])=>{
    const previous=previousClearances.get(key);
    return next.conflict&&(!previous?.conflict||next.gap<previous.gap-1e-7);
  });
  if (noRoom || conflict) {
    for(const h of histories){h.journey.segments.splice(0,h.journey.segments.length,...h.segments);if(h.lastBlock===undefined)delete h.journey.lastBlock;else h.journey.lastBlock=h.lastBlock;}
    importedTrains(rollingModelMode === "kenney");
    $("rollingModels").value = rollingModelMode;
    log(conflict?"Rolling stock change blocked: another vehicle occupies the required clearance.":"Not enough room for longer rolling stock. Move the train first.");
    return;
  }
  rollingModelMode = $("rollingModels").value;
  for (const t of trains) {
    t.name = active && t.assetLoaded ? kenneyNames[["steam","diesel","shunter"].indexOf(t.modelKey)]+(t.id>=3?` · ${t.id+1}`:"") : t.nativeName;
    t.desc = active && t.assetLoaded ? "Kenney Train Kit \xB7 stylized model" : t.nativeDescription;
  }
  renderVehicles();ui();
}
$("rollingModels").onchange = updateModels;
const detached = [];
const selectRing = new THREE.Mesh(new THREE.TorusGeometry(25, 1.5, 5, 34), new THREE.MeshBasicMaterial({ color: "#efdc9d" }));
selectRing.rotation.x = PI / 2;
scene.add(selectRing);
let selected = 0, paused = false, day = 48, changes = 0, transferred = false, visitedRunaround = false, didDetach = false, didAttach = false, mission = 0;
const statuses = [
  { title: "First lap", body: "Complete one lap of the steam locomotive’s loop.", done: () => trains[0].laps >= 1, detail: () => "Completed laps: " + trains[0].laps + " / 1" },
  { title: "Change tracks", body: "Set WX-A or WX-B and drive a locomotive from one loop to another.", done: () => transferred, detail: () => transferred ? "Transfer completed" : "No transfer yet" },
  { title: "The long runaround", body: "Set the yard switches and drive the shunter along either runaround route.", done: () => visitedRunaround, detail: () => visitedRunaround ? "Runaround completed" : "Waiting for the shunter" },
  { title: "Build a freight train", body: "Uncouple a wagon while stopped, then couple it again on the same track.", done: () => didDetach && didAttach, detail: () => "Uncouple " + (didDetach ? "\u2713" : "\u25CB") + " \xB7 Couple " + (didAttach ? "\u2713" : "\u25CB") }
];
function log(s) {
  $("log").textContent = s;
}
function ui() {
  trainDeck?.sync();
  $("switchCount").textContent = switchSpecs.filter((s) => s.on).length + " / " + switchSpecs.length;
  if(!$("switchList").children.length){
    $("switchList").innerHTML=switchSpecs.map((s,i)=>`<div class="switchCell" data-switch-hover="${i}"><button class="sw" data-switch="${i}"><b>${s.id}</b><small>${s.name}</small></button></div>`).join("");
    $("switchList").querySelectorAll(".switchCell").forEach((cell,i)=>{
      cell.querySelector("button").onclick=()=>requestToggle(switchSpecs[i].id,"panel");
    });
  }
  $("switchList").querySelectorAll("button").forEach((b,i)=>b.classList.toggle("active",switchSpecs[i].on));
  $("missionIndex").textContent = mission + 1 + " / 4";
  $("missionName").textContent = statuses[mission].title;
  $("missionText").textContent = statuses[mission].body;
  missionUI();
  nextSwitchHUD?.refresh(true);
}
function missionUI() {
  $("missionStatus").textContent = statuses[mission].done() ? "\u2713 Mission completed" : statuses[mission].detail();
}
function select(id) {
  if(!trains[id])return;
  selected = id;
  trainDeck?.select(id);
  ui();
}
function requestToggle(controlId,origin) {
  const result = turnoutCommands.requestToggle(controlId,origin);
  if (!result.changed) {
    log(result.message);
    nextSwitchHUD?.refresh(true);
    return result;
  }
  const s = switchSpecs.find(s => s.id === controlId);
  changes++;
  log(s.name + ": " + (s.on ? "diverging" : "straight"));
  ui();
  return result;
}
const route = routing(network, (id) => switchSpecs.find((s) => s.id === id)?.on || false);
const turnoutCommands=createTurnoutCommands({switchSpecs,trains,route,
  getSafety:id=>getSwitchAssistance().safetyByControl.get(id)});
const fleetCommands=createFleetCommands({trains,detached,route});
function getSwitchAssistance() {
  return deriveSwitchAssistance({network,switchTopology,trains,detached,selected,switchSpecs,route,tracePoints:false});
}
function switchHUDState() {
  const state = getSwitchAssistance();
  document.querySelectorAll("[data-switch]").forEach((b)=>{
    const sw=switchSpecs[Number(b.dataset.switch)], safety=state.safetyByControl.get(sw.id);
    b.disabled=!safety || safety.blocked;
    b.parentElement.tabIndex=b.disabled?0:-1;
    b.parentElement.classList.toggle("is-disabled",b.disabled);
    b.title=!safety?"Insufficient safety data":safety.blocked?safety.message:"Change switch position";
    b.parentElement.title=b.title;
  });
  return state;
}
function initializeJourney(t) {
  const start=t.initial?.edge?{edge:t.initial.edge,s:t.initial.s,sign:1}:loopPosition(network,t.loop,t.initial?.fraction??.45);
  if(t.initial?.edge){t.mode="yard";t.section=t.initial.edge;}
  t.journey = new Journey(network,start.edge,start.s);
  // Journey coordinates increase in the chosen circuit direction, regardless
  // of the source segment's endpoint order.
  if(start.sign<0){t.journey.segments[0].sign=-1;t.journey.position=network.edges[start.edge].length-start.s;}
  t.velocity = 0;
  t.odometer = 0;
  t.previousLane = t.loop;
  t.journey.ensure(t.journey.position - layoutFor(t).tail, route);
}
trains.forEach(initializeJourney);
function vehicleLocation(t, behind = 0) {
  return t.journey.locate(t.journey.position - behind);
}
function renderVehicles() {
  for (const t of trains) {
    const layout = layoutFor(t);
    t.journey.ensure(t.journey.position - layout.tail, route);
    const vehicles=[t.group,...t.carObjs];
    for(let i=0;i<vehicles.length;i++) {
      const group=vehicles[i],coordinate=t.journey.position-layout.offsets[i],pose=vehicleLocation(t,layout.offsets[i]);
      if(i)group.visible=true;
      group.position.set(pose.x,3.5+(i?0:group.stockRig&&!group.userData.assetDimensions?0:3.6),pose.z);
      group.rotation.y=pose.angle;
      animateStock(group,t.journey,coordinate,t.odometer,pose);
      animateAuxiliaryWheels(group,t.odometer);
    }
  }
  const selectedPoint=vehicleLocation(trains[selected]);
  selectRing.position.set(selectedPoint.x,5.2,selectedPoint.z);
  for (const d of detached) {
    d.group.visible = true;
    d.group.position.set(d.point.x, 3.5, d.point.z);
    d.group.rotation.y = d.point.angle;
  }
}
function advanceFleet(dt) {
  for (const result of stepRailway({trains,detached,route},dt)) {
    const t=result.train;
    if(result.notify){
      log(result.kind==='train'?"Protection: trains too close. Automatic stop.":result.kind==='wagon'?"Stationary wagon ahead. Stopped for coupling.":t.name+(result.kind==='terminal'?": end of track. Reverse direction.":": route blocked. Check switch alignment."));
      ui();
    }
    if(!result.moved)continue;
    const previousRoute = t.mode + "/" + t.loop + "/" + t.section;
    const location2 = t.journey.locate(), edge = network.edges[location2.edge];
    if (edge.lane !== void 0) {
      if (edge.lane !== t.previousLane) {
        transferred = true;
        t.previousLane = edge.lane;
      }
      t.loop = edge.lane;
      t.mode = "loop";
    } else if(edge.role==="crossover") {
      t.mode="loop";
    } else {
      t.mode = "yard";
      t.section = edge.id;
      if (edge.role?.startsWith("runaround")) visitedRunaround = true;
    }
    t.laps = Math.floor(t.journey.travel / loops[t.loop].length);
    if (previousRoute !== t.mode + "/" + t.loop + "/" + t.section) ui();
  }
}
function applyConsistCommand(result) {
  if (!result.changed) {if(result.message)log(result.message);return;}
  if(result.kind==='uncoupled')didDetach=true;
  if(result.kind==='coupled')didAttach=true;
  renderVehicles();ui();log(result.message);
}
function uncouple() {applyConsistCommand(fleetCommands.uncouple(selected));}
function couple() {applyConsistCommand(fleetCommands.couple(selected));}
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
  if (!confirm("Reset locomotives, switches and missions?")) return;
  for (const d of detached) removeWagon(d.group);
  detached.length = 0;
  switchSpecs.forEach((s) => {
    s.on = false;
  });
  trains.forEach((t, i) => {
    t.carObjs.forEach(removeWagon);
    t.carObjs = [];
    Object.assign(t, { loop: t.initial.loop, speed: 0, dir: 1, cars: t.initial.cars, laps: 0, mode: "loop" });
    for (let j = 0; j < t.cars; j++) {
      const o = freightWagon(i===1?j+3:j+i);
      scene.add(o);
      t.carObjs.push(o);
    }
    initializeJourney(t);
  });
  paused = false;
  mission = 0;
  transferred = visitedRunaround = didDetach = didAttach = false;
  $("pause").textContent = "\u2161 Pause";
  ui();
  log("Reset completed.");
}
function setTrainSpeed(id,value) {
  if(fleetCommands.setSpeed(id,value))trainDeck?.sync();
}
function reverseTrain(id) {
  const train=fleetCommands.reverse(id);if(!train)return;
  log(train.name+" reversed direction");trainDeck?.sync();nextSwitchHUD?.refresh(true);
}
function stopTrain(id) {
  const train=fleetCommands.stop(id);if(!train)return;
  ui();log(train.name+" stopped");
}
function stopAllTrains() {
  fleetCommands.stopAll();ui();log("STOP ALL · every train stopped");
}
function addTrain() {
  if(trains.length>=4){log("A session supports up to four trains.");return null;}
  const insertion={...new Journey(network,'T47',80).locate(),vehicle:{userData:{}}};
  if(trains.some(t=>vehiclePositions(t).some(p=>(p.edge==="T47"&&Math.abs(p.s-80)<120)||vehiclesConflict(insertion,p)))||detached.some(d=>(d.point.edge==="T47"&&Math.abs(d.point.s-80)<120)||vehiclesConflict(insertion,{...d.point,vehicle:d.group}))){
    log("Clear the insertion point in the east siding first.");return null;
  }
  const id=trains.length;
  const t={id,name:`BR 216 · ${id+1}`,nativeName:`BR 216 · ${id+1}`,desc:"Diesel DB · additional locomotive",nativeDescription:"Diesel DB · additional locomotive",modelKey:"diesel",initial:{loop:2,cars:0,edge:"T47",s:80},loop:2,speed:0,dir:1,cars:0,lights:false,laps:0,mode:"loop",group:locoModel(1,id),carObjs:[]};
  trains.push(t);initializeJourney(t);
  $("addTrain").disabled=trains.length>=4;
  attachTrainAsset(t.group,"diesel",true).then((loaded)=>{t.assetLoaded=loaded;updateModels();});
  renderVehicles();ui();return id;
}
$("stopAll").onclick=stopAllTrains;
$("addTrain").onclick=()=>{const id=addTrain();if(id!==null)select(id);};
$("routePreview").onclick=()=>{
  highlightUntil=performance.now()<highlightUntil?0:performance.now()+15000;
  highlightUpdated=0;updateRouteHighlight(true);
};
function updateRouteHighlight(force=false) {
  const now=performance.now(),active=now<highlightUntil;
  $("routePreview").setAttribute("aria-pressed",String(active));
  if(!active){routeHighlight.root.visible=false;return;}
  if(!force && now-highlightUpdated<200)return;
  highlightUpdated=now;
  routeHighlight.update(previewPoints(network,getSwitchAssistance().preview,1800),true);
}
function toggleTrainLights(id) {
  if(fleetCommands.toggleLights(id))ui();
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
  $("pause").textContent = paused ? "\u25B6 Resume" : "\u2161 Pause";
  log(paused ? "Simulation paused." : "Simulation resumed.");
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
trains.forEach((t) => {
  t.group.userData.dynamic = true;
  t.carObjs.forEach((o) => o.userData.dynamic = true);
});
selectRing.userData.dynamic = true;
selectRing.userData.pickThrough = true;
routeHighlight.root.userData.pickThrough = true;
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
  $("quality").querySelector("[value=auto]").textContent = "Auto \xB7 " + (profile === "low" ? "Low" : "High");
  renderer.setPixelRatio(profile === "low" ? 1 : Math.min(devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = profile !== "low";
  scenic.setQuality(profile);
  resize();
}
$("quality").onchange = (e) => applyQuality(quality.setMode(e.target.value));
quality.setMode("auto");
applyQuality(quality.profile);
document.addEventListener("visibilitychange", () => {
  if (document.hidden){quality.update(0, false);turnoutInteraction.clear(); }
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
  routeHighlight.dispose();
  turnoutInteraction.dispose();
  motionPreference.removeEventListener('change',onMotionPreference);
  turnoutGlow.dispose();
  turnoutPicking.dispose();
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
      advanceFleet(step);
    });
  }
  frame++;
  renderVehicles();
  trainDeck?.update();
  const night = clamp((day - 35) / 65, 0, 1);
  sun.intensity = lerp(2.65, 0.16, night);
  sun.color.copy(new THREE.Color(day>40?"#f4cd9d":"#fff0d5").lerp(new THREE.Color("#a9bee4"),night));
  renderer.toneMappingExposure = lerp(1.08, 0.89, night);
  skyLight.intensity = lerp(1.0, 0.22, night);
  fill.intensity = lerp(0.35, 0.07, night);
  scene.environmentIntensity = lerp(0.38, 0.07, night);
  trains.forEach((t) => {
    t.group.userData.headMaterial.emissiveIntensity = t.lights ? lerp(0.5, 3, night) : 0;
    t.group.userData.beam.visible = t.lights && night > 0.3;
  });
  scene.background.copy(new THREE.Color("#d0c3ac").lerp(new THREE.Color("#192737"), night));
  scene.fog.color.copy(scene.background);
  windowNight.emissiveIntensity = lerp(0.02, 2.4, night);
  windowNight.color.setRGB(lerp(0.15, 0.8, night), lerp(0.22, 0.56, night), lerp(0.24, 0.23, night));
  glow.emissiveIntensity = lerp(0.4, 2.8, night);
  controls.update();
  nav.update(realDt, trains[selected].journey.locate());
  views.update();
  nextSwitchHUD?.refresh();
  updateRouteHighlight();
  if ($("cameraView").value !== nav.preset && nav.preset === "manual") $("cameraView").value = "manual";
  const nextQuality = quality.update(realDt, !document.hidden);
  if (nextQuality) applyQuality(nextQuality);
  scenic.zones.update(night, dt);
  scenic.station.update(night, dt);
  scenic.update(paused ? 0 : dt, camera);
  smoke.update(paused ? 0 : dt, trains[0].group, camera, Math.abs(trains[0].velocity) > 2, quality.profile === "low");
  turnoutGlow.update(now);
  effects.render(quality.profile === "cinema");
  if (frame % 35 === 0) {
    missionUI();
  }
  animationHandle = requestAnimationFrame(tick);
}
resize();
ui();
const turnoutPicking=createTurnoutPicking(turnoutModel);
const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
const requestedGlow=new URLSearchParams(location.search).get('turnoutGlow');
const turnoutGlow=createTurnoutGlow(scene,turnoutModel,{variant:requestedGlow==='B'?'B':'A',reducedMotion:motionPreference.matches});
const onMotionPreference=()=>turnoutGlow.setReducedMotion(motionPreference.matches);
motionPreference.addEventListener('change',onMotionPreference);
const turnoutInteraction=mountTurnoutInteraction({canvas:renderer.domElement,camera,scene,controls,
  picker:turnoutPicking,panel:$("switchList"),controlIds:controlOrder,requestToggle,selectTrain:select,
  onIdentify:id=>turnoutGlow.identify(id),touchIdentifyMs:GLOW_CONFIG.touchHoldMs});
$("loadMsg").hidden = true;
animationHandle = requestAnimationFrame(tick);
if (new URLSearchParams(location.search).has("diagnostics")) window.__serienDiagnostics = {
  indicatorState:switchIndicatorState,
  turnoutGlowState:()=>turnoutGlow.snapshot,
  setGlowVariant:variant=>turnoutGlow.setVariant(variant),
  turnoutInteractionState:()=>({active:turnoutInteraction.active,source:turnoutInteraction.source,regions:turnoutPicking.root.children.length,rendered:turnoutPicking.root.parent!==null}),
  requestToggle,
  turnoutView(controlId,options={}) {
    const on=switchSpecs.find(s=>s.id===controlId)?.on;
    return turnoutModel.read(controlId,on,{...options,choose:route,
      operationLock:getSwitchAssistance().safetyByControl.get(controlId)});
  },
  captureThumbnail(id) {
    const t=trains[id];if(!t)throw new RangeError("Unknown locomotive");
    return captureLocomotiveThumbnail(renderer,t.group,scene.environment);
  },
  addTrain,
  placeTrain(id, edge, s, direction=1) {
    const t=trains[id], track=network.edges[edge];
    if(!t || !track || !Number.isFinite(s) || s<0 || s>track.length || ![1,-1].includes(direction)) throw new RangeError("Invalid diagnostic train placement");
    const candidate=new Journey(network,edge,s);
    if(!candidate.ensure(candidate.position-layoutFor(t).tail,route)||!candidate.ensure(candidate.position+(t.group.userData.couplers?.front?.x??48),route)) throw new RangeError("Diagnostic consist does not fit");
    t.journey=candidate;t.dir=direction;t.speed=t.velocity=0;
    if(track.lane!==undefined){t.loop=track.lane;t.previousLane=track.lane;t.mode="loop";}else{t.mode="yard";t.section=edge;}
    renderVehicles();ui();
  },
  step(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0 || seconds > 120) throw new RangeError("Diagnostic step: 0…120 seconds");
    for (let remaining = seconds; remaining > 1e-9; remaining -= 1/60) {
      const dt = Math.min(1/60, remaining);
      advanceFleet(dt);
    }
    renderVehicles();
    trainDeck?.update();
    nextSwitchHUD?.refresh(true);
    updateRouteHighlight(true);
  },
  frames(intervals) {
    if(!Array.isArray(intervals)||intervals.length>10000||intervals.some(dt=>!Number.isFinite(dt)||dt<0))throw new RangeError("Invalid diagnostic frames");
    const frameClock=new FixedClock();
    for(const elapsed of intervals)frameClock.update(elapsed,advanceFleet);
    renderVehicles();trainDeck?.update();nextSwitchHUD?.refresh(true);updateRouteHighlight(true);
  },
  setSwitches(on) {
    if(!Array.isArray(on)||on.some((id)=>!switchSpecs.some((s)=>s.id===id)))throw new RangeError("Unknown diagnostic control");
    switchSpecs.forEach((s)=>{s.on=on.includes(s.id);});
    trains.forEach((t)=>t.journey.reconcile(layoutFor(t).tail,t.group.userData.couplers?.front?.x??48,route));ui();
  },
  railwayState() {
    return {occupied:collectRailwayState({network,switchTopology,trains,detached,route}).occupied,
      identities:{trains:trains.map(t=>[t.group,...t.carObjs].map(v=>v.uuid)),detached:detached.map(d=>d.group.uuid)}};
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
  return { consoles: {visible:trainDeck?.visibleIds, recent:trainDeck?.recentIds, active:selected}, nextSwitch: { site:next?.site.id ?? null, controls:next?.site.controls ?? [], name:next?.site.name ?? null, distance:next?.distance ?? null, outgoing:next?.outgoing ?? null, destination:next?.destination ?? null, stop:assistance.preview.stop, uncertain:assistance.preview.uncertain, safety:assistance.safety, highlighted:routeHighlight.root.visible, minimized:nextSwitchHUD?.panel.classList.contains("is-minimized") }, quality: { mode: quality.mode, profile: quality.profile }, camera: { preset: nav.preset, position: camera.position.toArray(), target: controls.target.toArray(),fov:camera.fov,aspect:camera.aspect,projectedBase:[-10,1510].flatMap(x=>[-34,0].flatMap(y=>[-10,710].map(z=>new THREE.Vector3(x,y,z).project(camera).toArray()))) },switchIndicators:switchIndicatorState(), render: { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, ...renderer.info.memory }, stock: trains.map((t) => ({ id: t.id, name:t.name, speed:t.speed, velocity:t.velocity, dir:t.dir, lights:t.lights, modelKey:t.modelKey, journey:{position:t.journey.position,travel:t.journey.travel,segments:t.journey.segments.map(p=>({...p}))}, odometer:t.odometer,animation:t.group.stockRig?{wheels:t.group.stockRig.wheels.map(w=>({angle:w.node.rotation.z,radius:w.radius})),rods:t.group.stockRig.rods.map(r=>r.node.position.toArray()),bogies:t.group.stockRig.bogies.map(b=>b.node.rotation.y)}:null,hull: hull(t.group), cars: t.carObjs.map(hull), layout: layoutFor(t), vehicles: vehiclePositions(t).map((p) => ({ x:p.x, z:p.z, rendered:{x:p.vehicle.position.x,z:p.vehicle.position.z}, edge:p.edge, s:p.s, couplers:p.vehicle.userData.couplers, stock:p.vehicle.userData.stock??null, dimensions:p.vehicle.userData.assetDimensions ?? null })) })), detached: detached.map((d) => ({...d.point})), scenery: { tunnel:false, trees:scenic.trees, buildings:scenic.buildings }, pendingStops: scenic.zones.pendingStops.map((p) => p.edge) };
} };
