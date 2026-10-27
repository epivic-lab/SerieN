import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
const dark = new THREE.MeshStandardMaterial({ color: "#303638", metalness: 0.4, roughness: 0.6 });
const metal = new THREE.MeshStandardMaterial({ color: "#8e938b", metalness: 0.7, roughness: 0.4 });
const glass = new THREE.MeshStandardMaterial({ color: "#25434e", metalness: 0.5, roughness: 0.22 });
const red = new THREE.MeshStandardMaterial({ color: "#8d3326", metalness: 0.25, roughness: 0.6 });
const cream = new THREE.MeshStandardMaterial({ color: "#d2c8a9", roughness: 0.85 });
function detailBatch(group, items) {
  const mats = /* @__PURE__ */ new Map();
  for (const [geo, material, pos, rot] of items) {
    const matrix = new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot || [0, 0, 0])), new THREE.Vector3(1, 1, 1));
    geo.applyMatrix4(matrix);
    if (!mats.has(material)) mats.set(material, []);
    mats.get(material).push(geo);
  }
  for (const [mat, geos] of mats) {
    const merged = mergeGeometries(geos, false), mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    geos.forEach((g) => g.dispose());
  }
}
function locomotiveDetails(group, id) {
  const items = [], length = id === 0 ? 64 : id === 1 ? 61 : 47;
  const box = (w, h, d, m, x, y, z) => items.push([new THREE.BoxGeometry(w, h, d), m, [x, y, z]]);
  const rod = (r, h, m, x, y, z, rotation = [0, 0, Math.PI / 2]) => items.push([new THREE.CylinderGeometry(r, r, h, 10), m, [x, y, z], rotation]);
  for (const side of [-1, 1]) {
    for (const x of [-length / 2, length / 2]) {
      rod(1.4, 5, metal, x + Math.sign(x) * 3, 10, side * 5);
      rod(2.4, 1, dark, x + Math.sign(x) * 5, 10, side * 5);
      box(8, 0.6, 3, dark, x - Math.sign(x) * 4, 9, side * 9);
    }
    if (id === 0) {
      rod(0.5, 48, metal, 0, 24, side * 7.8);
      rod(0.55, 41, red, 0, 9, side * 8.6);
      box(10, 9, 0.4, glass, -24, 26, side * 7.5);
      for (const x of [-14, -3, 8, 19]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 4.8, 1.3, 20), red);
        wheel.position.set(x, 8, side * 6);
        wheel.rotation.x = Math.PI / 2;
        wheel.userData.wheel = true;
        group.add(wheel);
      }
    } else {
      for (const x of [-length * 0.35, length * 0.35]) {
        box(7, 6, 0.5, glass, x, 29, side * 7.9);
        box(7, 0.6, 1, cream, x, 25.5, side * 8);
      }
      for (let x = -length * 0.23; x < length * 0.25; x += 2.2) box(0.65, 7, 0.45, dark, x, 23, side * 7.8);
      rod(0.45, length - 8, metal, 0, 15, side * 9);
      for (const x of [-length * 0.32, length * 0.32]) for (let y = 6; y < 16; y += 3) box(5, 0.7, 2, metal, x, y, side * 9);
    }
  }
  if (id === 0) {
    for (let x = -10; x < 29; x += 9) rod(8.2, 0.65, metal, x, 20, 0);
    rod(1.4, 40, dark, 1, 19, -8);
  } else for (let x = -14; x <= 14; x += 7) {
    box(5, 0.7, 10, dark, x, 37, 0);
    for (let z = -4; z <= 4; z += 2) box(4, 0.5, 0.4, metal, x, 37.5, z);
  }
  detailBatch(group, items);
}
function wagonDetails(group) {
  const items = [];
  for (const side of [-1, 1]) {
    for (let x = -20; x <= 20; x += 8) items.push([new THREE.BoxGeometry(0.7, 10, 0.5), dark, [x, 14, side * 6.4]]);
    for (const x of [-24, 24]) items.push([new THREE.BoxGeometry(3, 2, 3), metal, [x, 7, side * 4.5]]);
  }
  for (const x of [-29, 29]) items.push([new THREE.BoxGeometry(7, 1, 2), dark, [x, 6, 0]]);
  detailBatch(group, items);
}
function steam(scene) {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d"), g = ctx.createRadialGradient(32, 32, 1, 32, 32, 30);
  g.addColorStop(0, "rgba(232,226,207,.5)");
  g.addColorStop(0.4, "rgba(210,205,191,.3)");
  g.addColorStop(1, "rgba(220,216,205,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0.65 });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = "attribute float particleFade;varying float vFade;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvFade=particleFade;");
    shader.fragmentShader = "varying float vFade;\n" + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace("#include <alphamap_fragment>", "#include <alphamap_fragment>\ndiffuseColor.a*=vFade;");
  };
  const geometry = new THREE.PlaneGeometry(1, 1), fades = new THREE.InstancedBufferAttribute(new Float32Array(36), 1);
  geometry.setAttribute("particleFade", fades);
  const mesh = new THREE.InstancedMesh(geometry, material, 36);
  mesh.frustumCulled = false;
  mesh.userData.dynamic = true;
  scene.add(mesh);
  const particles = Array.from({ length: 36 }, () => ({ age: 10, p: new THREE.Vector3() })), dummy = new THREE.Object3D(), source = new THREE.Vector3();
  let timer = 0, index = 0;
  return { update(dt, loco, camera, running, lightweight) {
    timer += dt;
    if (running && timer > 0.12) {
      timer = 0;
      const p = particles[index++ % particles.length];
      loco.updateWorldMatrix(true, false);
      p.p.copy(source.set(27, 38, 0).applyMatrix4(loco.matrixWorld));
      p.age = 0;
    }
    particles.forEach((p, i) => {
      p.age += dt;
      const alive = p.age < 3.5 && (!lightweight || i % 3 === 0);
      if (alive) {
        p.p.y += dt * 19;
        p.p.x += dt * 6;
        dummy.position.copy(p.p);
        dummy.quaternion.copy(camera.quaternion);
        dummy.scale.setScalar(3 + p.age * 8);
        fades.setX(i, (1 - p.age / 3.5) * 0.65);
      } else {
        dummy.scale.setScalar(0);
        fades.setX(i, 0);
      }
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    fades.needsUpdate = true;
  } };
}
export {
  locomotiveDetails,
  steam,
  wagonDetails
};
