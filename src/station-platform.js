import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
const STATION_PLATFORM = Object.freeze({ xMin: 615, xMax: 885, zMin: 541, zMax: 559, top: 4.5 });
function stationPlatformLayout() {
  const paving = [];
  for (let row = 0; row < 3; row++) for (let column = 0; column < 45; column++) paving.push({ x: 618 + column * 6, z: 544 + row * 6, w: 5.85, d: 5.85, y: 4.3 });
  return {
    paving,
    columns: [628, 658, 842, 872].map((x) => ({ x, z: 551.5, r: 0.38, base: 4.5, top: 28.4 })),
    benches: [639, 673, 827, 861].map((x) => ({ x, z: 549.5, w: 13, d: 3.8 })),
    lamps: [620, 880].map((x) => ({ x, z: 553.1, h: 25.5 })),
    passengers: [{ x: 650, z: 553.5, h: 10.6, rotation: 0.2, coat: "#605b48", pose: "waiting" }, { x: 833, z: 553.3, h: 10.9, rotation: -0.3, coat: "#5a6370", pose: "waiting" }, { x: 667, z: 549.4, h: 7.5, rotation: 0, coat: "#71533f", pose: "seated" }],
    planters: [619.8, 694, 806, 880.2].map((x) => ({ x, z: 548.9, w: 5.6, d: 3.7 })),
    lights: [{ x: 647, y: 25.6, z: 551.5 }, { x: 853, y: 25.6, z: 551.5 }]
  };
}
function texture(width, height, paint) {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext("2d"), width, height);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}
function labelTexture(text) {
  return texture(512, 96, (ctx, w, h) => {
    ctx.fillStyle = "#18352f";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#d2c8ad";
    ctx.lineWidth = 4;
    ctx.strokeRect(5, 5, w - 10, h - 10);
    ctx.fillStyle = "#f0e8d5";
    ctx.font = "500 43px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText(text, w / 2, 62);
  });
}
function clockTexture() {
  return texture(256, 256, (ctx) => {
    ctx.fillStyle = "#f0e8d6";
    ctx.beginPath();
    ctx.arc(128, 128, 123, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#283330";
    for (let i = 0; i < 60; i++) {
      const a = i * Math.PI / 30, r = i % 5 === 0 ? 96 : 106;
      ctx.lineWidth = i % 5 === 0 ? 5 : 2;
      ctx.beginPath();
      ctx.moveTo(128 + Math.sin(a) * r, 128 - Math.cos(a) * r);
      ctx.lineTo(128 + Math.sin(a) * 115, 128 - Math.cos(a) * 115);
      ctx.stroke();
    }
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(128, 128);
    ctx.lineTo(128 + Math.sin(0.35) * 68, 128 - Math.cos(0.35) * 68);
    ctx.moveTo(128, 128);
    ctx.lineTo(128 + Math.sin(2.25) * 91, 128 - Math.cos(2.25) * 91);
    ctx.stroke();
    ctx.fillStyle = "#39413c";
    ctx.beginPath();
    ctx.arc(128, 128, 7, 0, Math.PI * 2);
    ctx.fill();
  });
}
function instances(root, geometry, material, records) {
  const mesh = new THREE.InstancedMesh(geometry, material, records.length), dummy = new THREE.Object3D();
  records.forEach((r, i) => {
    dummy.position.set(r.x, r.y, r.z);
    dummy.rotation.set(r.rx || 0, r.ry || 0, r.rz || 0);
    dummy.scale.set(r.sx || 1, r.sy || 1, r.sz || 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    if (r.color) mesh.setColorAt(i, new THREE.Color(r.color));
  });
  mesh.castShadow = mesh.receiveShadow = true;
  root.add(mesh);
  return mesh;
}
function buildStationPlatform(scene, { materials = {} } = {}) {
  const root = new THREE.Group();
  root.name = "station-platform-crafted";
  scene.add(root);
  const material = (name, color, roughness = 0.85, metalness = 0) => materials[name] || new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const stone = material("platformStone", "#b5ab96"), curb = material("platformCurb", "#bfb6a2"), mortar = material("platformMortar", "#625f55"), iron = material("stationIron", "#33453e", 0.68, 0.42), wood = material("stationWood", "#705337"), roof = material("canopyZinc", "#7c8176", 0.72, 0.35), warmMetal = material("stationBrass", "#96866a", 0.5, 0.5), ivory = material("stationIvory", "#e0d8c4"), soil = material("stationSoil", "#3e3d29"), pots = material("stationPots", "#9b634a"), leaf = material("stationPlant", "#526141");
  const layout = stationPlatformLayout();
  function mesh(geometry, mat, x = 0, y = 0, z = 0, parent = root) {
    const object = new THREE.Mesh(geometry, mat);
    object.position.set(x, y, z);
    object.castShadow = object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  const box = (w, h, d, mat, x, y, z, parent = root) => mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z, parent);
  const rounded = (w, h, d, mat, x, y, z, r = 0.08, parent = root) => mesh(new RoundedBoxGeometry(w, h, d, 1, r), mat, x, y, z, parent);
  const cylinder = (radius, height, mat, x, y, z, parent = root, n = 12) => mesh(new THREE.CylinderGeometry(radius, radius, height, n), mat, x, y, z, parent);
  function rod(a, b, r, mat, parent = root) {
    const av = new THREE.Vector3(...a), delta = new THREE.Vector3(...b).sub(av), o = cylinder(r, delta.length(), mat, 0, 0, 0, parent, 8);
    o.position.copy(av.addScaledVector(delta, 0.5));
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    return o;
  }
  rounded(270, 4, 18, mortar, 750, 2, 550, 0.18);
  const tiles = layout.paving.map((p, i) => ({ ...p, color: new THREE.Color(stone.color).multiplyScalar(0.91 + i * 37 % 19 / 100) }));
  instances(root, new RoundedBoxGeometry(5.85, 0.4, 5.85, 1, 0.07), stone, tiles);
  const coping = [];
  for (let i = 0; i < 30; i++) coping.push({ x: 619.5 + i * 9, y: 4.18, z: 558.35, color: new THREE.Color(curb.color).multiplyScalar(0.96 + i % 5 * 0.015) });
  instances(root, new RoundedBoxGeometry(8.86, 0.85, 1.25, 1, 0.08), curb, coping);
  const edge = [];
  for (let i = 0; i < 90; i++) if (i % 23 !== 7) edge.push({ x: 616.5 + i * 3, y: 4.57, z: 557.46 });
  const painted = instances(root, new THREE.BoxGeometry(2.94, 0.035, 0.48), ivory, edge);
  painted.castShadow = false;
  const joints = [];
  for (let i = 0; i < 30; i++) joints.push({ x: 619.5 + i * 9, y: 2.2, z: 558.997 });
  instances(root, new THREE.BoxGeometry(0.12, 3.2, 0.018), mortar, joints).castShadow = false;
  for (const p of layout.columns) {
    cylinder(0.65, 0.35, iron, p.x, 4.7, p.z);
    cylinder(0.48, 2.5, iron, p.x, 6, p.z);
    cylinder(p.r, 20.2, iron, p.x, 17.3, p.z);
    cylinder(0.62, 0.4, iron, p.x, 26.9, p.z);
    box(2.3, 0.45, 2.3, iron, p.x, 27.8, p.z);
    rod([p.x, 27.8, 547], [p.x, 27.8, 556.4], 0.28, iron);
    for (const side of [-1, 1]) {
      rod([p.x, 23.5, p.z], [p.x + side * 4.3, 27.8, p.z], 0.22, iron);
      rod([p.x, 24.8, p.z], [p.x, 27.8, p.z + side * 3.6], 0.2, iron);
    }
  }
  const roofSlope = Math.atan2(0.9, 4.9), roofWidth = Math.hypot(4.9, 0.9);
  for (const side of [-1, 1]) {
    const panel = box(254, 0.3, roofWidth, roof, 750, 28.93, 551.9 + side * 2.45);
    panel.rotation.x = side * roofSlope;
    box(254, 0.65, 0.35, wood, 750, 28.3, 551.9 + side * 4.9);
    const gutter = cylinder(0.22, 254, iron, 750, 28, 551.9 + side * 5.12);
    gutter.rotation.z = Math.PI / 2;
    for (let x = 623; x <= 877; x += 12.7) rod([x, 28.57, 551.9 + side * 4.9], [x, 29.47, 551.9], 0.045, warmMetal);
  }
  for (let x = 625; x < 878; x += 21) box(0.2, 0.6, 9.65, wood, x, 27.9, 551.9);
  const ridge = cylinder(0.16, 254, roof, 750, 29.5, 551.9);
  ridge.rotation.z = Math.PI / 2;
  for (const x of [628, 872]) {
    rod([x, 28, 557], [x, 5.2, 557], 0.18, iron);
    rod([x, 5.2, 557], [x, 4.85, 557.65], 0.18, iron);
  }
  for (const p of layout.benches) {
    for (let j = 0; j < 5; j++) rounded(13, 0.42, 0.53, wood, p.x, 7.6, p.z - 1.18 + j * 0.6, 0.055);
    for (let j = 0; j < 4; j++) rounded(13, 0.55, 0.45, wood, p.x, 8.65 + j * 0.72, p.z - 1.6, 0.055);
    for (const side of [-1, 1]) {
      const x = p.x + side * 4.7;
      rod([x, 4.55, p.z - 0.9], [x, 7.5, p.z - 0.9], 0.19, iron);
      rod([x, 4.55, p.z + 1], [x, 7.5, p.z + 1], 0.19, iron);
      rod([x, 7.35, p.z - 1.7], [x, 11.5, p.z - 1.7], 0.16, iron);
      rod([x, 9.4, p.z - 1.6], [x, 9.4, p.z + 1.35], 0.17, iron);
      rod([x, 7.4, p.z + 1.3], [x, 9.4, p.z + 1.3], 0.16, iron);
    }
  }
  rod([646, 27.7, 551.9], [646, 24.1, 551.9], 0.19, iron);
  const clockCase = cylinder(2.95, 1.1, iron, 646, 22, 551.9, root, 32);
  clockCase.rotation.x = Math.PI / 2;
  const clockFace = new THREE.MeshStandardMaterial({ map: clockTexture(), color: "#f1e8d2", roughness: 0.65 });
  for (const side of [-1, 1]) {
    const face = mesh(new THREE.CircleGeometry(2.72, 40), clockFace, 646, 22, 551.9 + side * 0.57);
    if (side < 0) face.rotation.y = Math.PI;
    const ring = mesh(new THREE.TorusGeometry(2.82, 0.1, 5, 40), warmMetal, 646, 22, 551.9 + side * 0.6);
  }
  const signMat = new THREE.MeshStandardMaterial({ map: labelTexture("AUTUMN VALLEY"), color: "#d8dccf", roughness: 0.65, side: THREE.DoubleSide });
  rounded(30, 5.4, 0.55, iron, 849, 23, 552.3, 0.12);
  mesh(new THREE.PlaneGeometry(29.5, 5), signMat, 849, 23, 552.61);
  for (const x of [837, 861]) rod([x, 27.7, 551.9], [x, 25.7, 552.3], 0.11, iron);
  const flowerColors = ["#b97b51", "#b55b58", "#d2ad62"];
  const flowerMaterials = flowerColors.map((c, i) => material("stationFlower" + i, c));
  for (const p of layout.planters) {
    rounded(p.w, 2.6, p.d, pots, p.x, 5.8, p.z, 0.16);
    rounded(p.w + 0.25, 0.45, p.d + 0.25, pots, p.x, 7.1, p.z, 0.1);
    box(p.w - 0.5, 0.12, p.d - 0.5, soil, p.x, 7.35, p.z);
    for (let k = 0; k < 9; k++) {
      const x = p.x - 2.05 + k % 3 * 2, z = p.z - 1.1 + Math.floor(k / 3) * 1.1, h = 1.15 + k % 4 * 0.22;
      cylinder(0.08, h, leaf, x, 7.4 + h / 2, z);
      mesh(new THREE.SphereGeometry(0.46, 7, 5), flowerMaterials[k % 3], x, 7.4 + h, z);
    }
  }
  for (const [x, z, size] of [[654, 551.8, 1], [838, 550.2, 0.8]]) {
    rounded(3.4 * size, 2.6 * size, 1.7 * size, wood, x, 4.7 + 1.3 * size, z, 0.15);
    for (const side of [-1, 1]) box(0.17, 2.5 * size, 1.72 * size, warmMetal, x + side * 0.92 * size, 4.7 + 1.3 * size, z);
    const handle = mesh(new THREE.TorusGeometry(0.55 * size, 0.09, 5, 12, Math.PI), iron, x, 4.7 + 2.65 * size, z);
    handle.rotation.z = 0;
  }
  for (const x of [624, 876]) {
    cylinder(1.05, 3, iron, x, 6.05, 551.2);
    cylinder(1.25, 0.25, iron, x, 7.62, 551.2);
    for (let j = 0; j < 10; j++) {
      const a = j * Math.PI / 5;
      rod([x + Math.cos(a), 4.8, 551.2 + Math.sin(a)], [x + Math.cos(a), 7.4, 551.2 + Math.sin(a)], 0.05, warmMetal);
    }
  }
  const coats = [material("stationCoatA", "#605b48"), material("stationCoatB", "#5a6370"), material("stationCoatC", "#71533f")], skin = material("stationSkin", "#bd9e7f"), shoes = material("stationShoes", "#343932");
  layout.passengers.forEach((p, i) => {
    const g = new THREE.Group();
    g.position.set(p.x, 4.6, p.z);
    g.rotation.y = p.rotation;
    g.scale.setScalar(p.h / (p.pose === "seated" ? 7.5 : 10.6));
    root.add(g);
    const seated = p.pose === "seated", headY = seated ? 6.4 : 9.55;
    const torso = mesh(new THREE.CapsuleGeometry(0.9, seated ? 2.25 : 2.65, 4, 8), coats[i], 0, seated ? 3.95 : 6.2, 0, g);
    torso.scale.z = 0.65;
    mesh(new THREE.SphereGeometry(0.79, 10, 7), skin, 0, headY, 0, g);
    if (i !== 1) {
      const brim = cylinder(0.91, 0.18, coats[i], 0, headY + 0.58, 0, g);
      cylinder(0.67, 0.42, coats[i], 0, headY + 0.78, 0, g);
    }
    for (const side of [-1, 1]) {
      if (seated) {
        rod([side * 0.47, 3.05, 0], [side * 0.47, 3, 1.6], 0.33, shoes, g);
        rod([side * 0.47, 3, 1.6], [side * 0.47, 0.35, 1.6], 0.3, shoes, g);
        rounded(0.7, 0.45, 1.2, shoes, side * 0.47, 0.22, 1.9, 0.1, g);
      } else {
        rod([side * 0.43, 4.6, 0], [side * 0.55, 0.5, 0], 0.33, shoes, g);
        rounded(0.78, 0.48, 1.35, shoes, side * 0.55, 0.25, 0.26, 0.12, g);
      }
      rod([side * 0.84, seated ? 4.7 : 7.2, 0], [side * 1.27, seated ? 3.1 : 4.4, 0.1], 0.26, coats[i], g);
      mesh(new THREE.SphereGeometry(0.29, 6, 5), skin, side * 1.27, seated ? 3 : 4.2, 0.1, g);
    }
  });
  const lampGlass = material("stationLampGlass", "#eee0bf", 0.28), emission = new THREE.MeshStandardMaterial({ color: "#e9e0c6", emissive: "#ffdba5", emissiveIntensity: 0.05, roughness: 0.4 });
  for (const p of layout.lamps) {
    cylinder(0.65, 0.3, iron, p.x, 4.75, p.z);
    cylinder(0.43, 3, iron, p.x, 6.1, p.z);
    cylinder(0.28, 20.8, iron, p.x, 17.1, p.z);
    rod([p.x, 27.2, p.z], [p.x + 2, 27.2, p.z], 0.19, iron);
    cylinder(1.25, 0.5, iron, p.x + 2, 26.8, p.z);
    cylinder(0.7, 1.25, lampGlass, p.x + 2, 25.95, p.z);
    mesh(new THREE.SphereGeometry(0.48, 10, 8), emission, p.x + 2, 25.9, p.z);
    cylinder(0.95, 0.25, iron, p.x + 2, 25.1, p.z);
  }
  const lights = [];
  for (const p of layout.lights) {
    box(5.5, 0.6, 1.4, iron, p.x, p.y + 0.4, p.z);
    rounded(4.8, 0.35, 1.1, emission, p.x, p.y, p.z, 0.08);
    const light = new THREE.PointLight("#ffdfaf", 0, 95, 0);
    light.position.set(p.x, p.y - 1, p.z);
    root.add(light);
    lights.push(light);
  }
  const bounds = { ...STATION_PLATFORM, canopy: { xMin: 623, xMax: 877, zMin: 546.56, zMax: 557.83, yMax: 29.66 } };
  root.userData.stationPlatform = { bounds, pavingCount: tiles.length };
  return { root, lights, bounds, layout, update(night) {
    const n = Math.max(0, Math.min(1, night));
    emission.emissiveIntensity = 0.035 + n * 2.1;
    for (const l of lights) {
      l.intensity = n * 0.65;
      l.visible = n > 0.02;
    }
  } };
}
export {
  STATION_PLATFORM,
  buildStationPlatform,
  stationPlatformLayout
};
