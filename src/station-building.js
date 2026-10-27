import * as THREE from "three";
const STATION_SPEC = Object.freeze({ x: 750, z: 525, w: 140, d: 48, h: 61, floor: 4.5, eaves: 42 });
const STATION_OPENINGS = Object.freeze([{ x: -21, y: 9, w: 8, h: 11 }, { x: 0, y: 4.5, w: 9, h: 18 }, { x: 21, y: 9, w: 8, h: 11 }, { x: -21, y: 28, w: 8, h: 10.5 }, { x: 0, y: 28, w: 8, h: 10.5 }, { x: 21, y: 28, w: 8, h: 10.5 }]);
function uvMillimetres(geometry, material) {
  const tile = material.userData?.tileMm;
  if (!tile) return geometry;
  const a = geometry.attributes.position, n = geometry.attributes.normal, uv = geometry.attributes.uv;
  for (let i = 0; i < a.count; i++) {
    const axis = Math.abs(n.getY(i)) > 0.7 ? "y" : Math.abs(n.getX(i)) > 0.7 ? "x" : "z";
    uv.setXY(i, (axis === "x" ? a.getZ(i) : a.getX(i)) / tile[0], (axis === "y" ? a.getZ(i) : a.getY(i)) / tile[1]);
  }
  return geometry;
}
function buildStationBuilding(scene, { materials: m }) {
  const root = new THREE.Group();
  root.name = "Autumn Valley \xB7 Empfangsgeb\xE4ude";
  root.position.set(STATION_SPEC.x, 0.35, STATION_SPEC.z);
  root.userData.building = { ...STATION_SPEC, id: "station" };
  scene.add(root);
  const add = (g, mat, parent = root, x = 0, y = 0, z = 0) => {
    uvMillimetres(g, mat);
    const mesh = new THREE.Mesh(g, mat);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  const box = (w, h, d, mat, x, y, z, parent = root, bevel = false) => {
    let geo;
    if (bevel && w > 0.3 && h > 0.3 && d > 0.3) {
      const shape = new THREE.Shape();
      shape.moveTo(-w / 2, -h / 2);
      shape.lineTo(w / 2, -h / 2);
      shape.lineTo(w / 2, h / 2);
      shape.lineTo(-w / 2, h / 2);
      shape.closePath();
      const b = Math.min(0.12, d / 5);
      geo = new THREE.ExtrudeGeometry(shape, { depth: d - 2 * b, bevelEnabled: true, bevelSize: b, bevelThickness: b, bevelSegments: 2, steps: 1 });
      geo.translate(0, 0, -d / 2 + b);
    } else geo = new THREE.BoxGeometry(w, h, d);
    return add(geo, mat, parent, x, y, z);
  };
  const rod = (a, b, r, mat, parent = root) => {
    const delta = new THREE.Vector3(...b).sub(new THREE.Vector3(...a)), mesh = add(new THREE.CylinderGeometry(r, r, delta.length(), 12), mat, parent);
    mesh.position.copy(new THREE.Vector3(...a).addScaledVector(delta, 0.5));
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    return mesh;
  };
  function wall(width, height, holes, z, parent) {
    const xs = [-width / 2, width / 2, ...holes.flatMap((h) => [h.x - h.w / 2, h.x + h.w / 2])].sort((a, b) => a - b), ys = [4.5, height, ...holes.flatMap((h) => [h.y, h.y + h.h])].sort((a, b) => a - b);
    for (let i = 1; i < xs.length; i++) for (let j = 1; j < ys.length; j++) {
      const x = (xs[i] + xs[i - 1]) / 2, y = (ys[j] + ys[j - 1]) / 2;
      if (xs[i] - xs[i - 1] < 0.01 || ys[j] - ys[j - 1] < 0.01 || holes.some((h) => x > h.x - h.w / 2 && x < h.x + h.w / 2 && y > h.y && y < h.y + h.h)) continue;
      box(xs[i] - xs[i - 1], ys[j] - ys[j - 1], 1.15, m.plaster, x, y, z, parent);
    }
  }
  function windowOpening(h, z, side, parent, door = false) {
    const depth = side * 1.2, paint = door ? m.wood : m.paint;
    for (const sign of [-1, 1]) {
      box(0.8, h.h + 0.6, 1.8, m.stone, h.x + sign * (h.w / 2 + 0.4), h.y + h.h / 2, z + side * 0.2, parent, true);
      box(0.45, h.h - 0.25, 0.65, paint, h.x + sign * (h.w / 2 - 0.3), h.y + h.h / 2, z + depth, parent, true);
    }
    box(h.w + 2, 1.1, 2.4, m.stone, h.x, h.y + h.h + 0.6, z + side * 0.3, parent, true);
    box(h.w + 2, 0.8, 3, m.stone, h.x, h.y - 0.4, z + side * 0.7, parent, true);
    box(h.w - 0.8, 0.45, 0.7, paint, h.x, h.y + h.h - 0.3, z + depth, parent, true);
    if (door) {
      box(h.w - 0.8, 7, 0.75, m.wood, h.x, h.y + 3.5, z + side * 0.8, parent, true);
      for (const s of [-1, 1]) box((h.w - 2) / 2, 4.8, 0.15, m.paint, h.x + s * h.w * 0.22, h.y + 3.5, z + side * 1.25, parent, true);
    }
    const glassHeight = door ? h.h - 8 : h.h - 1;
    const gy = door ? h.y + 8 + glassHeight / 2 : h.y + h.h / 2;
    box(h.w - 0.9, glassHeight, 0.12, m.glass, h.x, gy, z + side * 0.45, parent);
    box(h.w - 0.7, glassHeight + 0.3, 0.08, m.interior, h.x, gy, z - side * 3.8, parent);
    box(0.35, h.h - 0.7, 0.8, paint, h.x, h.y + h.h / 2, z + side * 1.35, parent, true);
    box(h.w - 0.8, 0.32, 0.85, paint, h.x, door ? h.y + 8 : h.y + h.h * 0.64, z + side * 1.35, parent, true);
    if (!door) for (const s of [-1, 1]) {
      const shutter = box(2.4, h.h, 0.55, m.paint, h.x + s * (h.w / 2 + 2.2), h.y + h.h / 2, z + side * 0.95, parent, true);
      for (let k = 0; k < 7; k++) box(2.1, 0.22, 0.18, m.wood, h.x + s * (h.w / 2 + 2.2), h.y + 1 + k * (h.h - 2) / 7, z + side * 1.3, parent);
    }
    if (door) {
      rod([h.x + 1.4, h.y + 7.6, z + side * 1.8], [h.x + 2.6, h.y + 7.6, z + side * 1.8], 0.18, m.brass, parent);
    }
  }
  function tiledRoof(w, d, eaves, rise, parent) {
    const shape = new THREE.Shape();
    shape.moveTo(-0.95, 0);
    shape.quadraticCurveTo(0, 0.55, 0.95, 0);
    shape.lineTo(0.95, -0.1);
    shape.quadraticCurveTo(0, 0.42, -0.95, -0.1);
    shape.closePath();
    const tileGeo = new THREE.ExtrudeGeometry(shape, { depth: 2.9, bevelEnabled: false, curveSegments: 5 });
    tileGeo.translate(0, 0, -1.45);
    uvMillimetres(tileGeo, m.roof);
    for (const side of [-1, 1]) {
      const slope = Math.atan2(rise, d / 2), len = Math.hypot(d / 2, rise) + 2.5, g = new THREE.Group();
      g.position.set(0, eaves + rise / 2, side * d / 4);
      g.rotation.x = side * slope;
      parent.add(g);
      box(w + 4, 0.5, len, m.roofDark, 0, 0, 0, g);
      const cols = Math.floor((w + 3) / 1.9), rows = Math.ceil(len / 2.6), mesh = new THREE.InstancedMesh(tileGeo, m.roof, cols * rows), dummy = new THREE.Object3D();
      let index = 0;
      for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
        dummy.position.set(-(cols - 1) * 0.95 + col * 1.9 + row % 2 * 0.25, 0.32, -len / 2 + 1.3 + row * 2.6);
        dummy.rotation.set(0, 0, Math.sin(index * 31.7) * 0.012);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
        mesh.setColorAt(index++, new THREE.Color().setScalar(0.87 + (col * 17 + row * 11) % 15 * 0.012));
      }
      mesh.castShadow = mesh.receiveShadow = true;
      g.add(mesh);
      rod([-w / 2 - 2, -0.4, side * len / 2], [w / 2 + 2, -0.4, side * len / 2], 0.45, m.metal, g);
    }
    rod([-w / 2 - 2, eaves + rise + 0.3, 0], [w / 2 + 2, eaves + rise + 0.3, 0], 0.75, m.roof, parent);
    for (const sx of [-1, 1]) {
      const x = sx * w / 2, geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute([x, eaves, -d / 2, x, eaves, d / 2, x, eaves + rise, 0], 3));
      geo.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2));
      geo.computeVertexNormals();
      const material = m.plaster.clone();
      material.side = THREE.DoubleSide;
      add(geo, material, parent);
      for (const sz of [-1, 1]) rod([x, eaves + rise + 0.2, 0], [x, eaves + 0.2, sz * (d / 2 + 1)], 0.45, m.wood, parent);
    }
  }
  function block(x, w, d, h, holes) {
    const parent = new THREE.Group();
    parent.position.x = x;
    root.add(parent);
    box(w, 4.5, d, m.stone, 0, 2.25, 0, parent);
    wall(w, h, holes, d / 2, parent);
    wall(w, h, holes, -d / 2, parent);
    for (const side of [-1, 1]) {
      box(1.15, h - 4.5, d, m.plaster, side * w / 2, (h + 4.5) / 2, 0, parent);
      for (let k = 0; k < Math.floor((h - 4.5) / 3); k++) {
        box(2.2, 2.75, 1.4, m.stone, side * (w / 2 - 0.6), 5.9 + k * 3, d / 2 + 0.3, parent, true);
        box(1.4, 2.75, 2.2, m.stone, side * (w / 2 + 0.2), 5.9 + k * 3, d / 2 - 1, parent, true);
      }
    }
    box(w + 2, 0.85, d + 2, m.stone, 0, h - 0.1, 0, parent, true);
    box(w + 1.2, 0.5, d + 1.2, m.stone, 0, 24.1, 0, parent);
    box(w - 2, 0.6, d - 2, m.wood, 0, 4.8, 0, parent);
    if (h > 35) box(w - 2, 0.5, d - 2, m.wood, 0, 24.3, 0, parent);
    for (const side of [-1, 1]) for (const hole of holes) windowOpening(hole, side * d / 2, side, parent, hole.y === 4.5);
    tiledRoof(w, d, h, h > 35 ? 12 : 8, parent);
    for (const side of [-1, 1]) rod([side * (w / 2 + 1), 1, d / 2 + 0.5], [side * (w / 2 + 1), h, d / 2 + 0.5], 0.32, m.metal, parent);
    return parent;
  }
  const centre = block(0, 66, 38, 42, STATION_OPENINGS);
  block(-50, 34, 34, 27, [{ x: -7, y: 9, w: 7, h: 11 }, { x: 7, y: 4.5, w: 8, h: 17 }]);
  block(50, 34, 34, 27, [{ x: -7, y: 4.5, w: 8, h: 17 }, { x: 7, y: 9, w: 7, h: 11 }]);
  for (const x of [-23, 22]) {
    box(5.5, 13, 5.5, m.brick, x, 52, -4, root, true);
    box(6.8, 0.9, 6.8, m.stone, x, 58.7, -4, root, true);
    box(4.8, 0.5, 4.8, m.metal, x, 59.4, -4);
  }
  for (let i = 0; i < 3; i++) box(16 + i * 3, 1.4, 2, m.stone, 0, 0.7 + i * 1.4, -20 - i * 1.6, root, true);
  function plaque(text, x, y, z, w = 31) {
    const material = m.paint.clone();
    if (typeof document !== "undefined") {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 96;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#294741";
      ctx.fillRect(0, 0, 512, 96);
      ctx.strokeStyle = "#c8c3a9";
      ctx.lineWidth = 5;
      ctx.strokeRect(5, 5, 502, 86);
      ctx.fillStyle = "#efe5c8";
      ctx.textAlign = "center";
      ctx.font = "600 44px sans-serif";
      ctx.fillText(text, 256, 65);
      material.map = new THREE.CanvasTexture(canvas);
      material.map.colorSpace = THREE.SRGBColorSpace;
    }
    box(w + 0.8, 4, 0.8, m.stone, x, y, z, root, true);
    add(new THREE.PlaneGeometry(w, 3.6), material, root, x, y, z + 0.5);
  }
  plaque("AUTUMN VALLEY", 0, 25.9, 20.4, 39);
  plaque("FAHRKARTEN", -50, 24, 18, 23);
  return { root, bounds: STATION_SPEC, update(night) {
    m.update?.(night);
  } };
}
export {
  STATION_OPENINGS,
  STATION_SPEC,
  buildStationBuilding
};
