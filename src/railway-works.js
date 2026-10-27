import * as THREE from "three";
import { TUNNEL, BRIDGE, tunnelPath, tunnelAt, bridgeAt, valleyHeight } from "./structure-layout.js";
function railwayWorks(scene, network, mask, foundation) {
  const root = new THREE.Group();
  root.name = "Opere ferroviarie scenografiche";
  scene.add(root);
  const stone = new THREE.MeshStandardMaterial({ color: "#9d9685", roughness: 0.97 }), dark = new THREE.MeshStandardMaterial({ color: "#424339", roughness: 1, side: THREE.DoubleSide }), rock = new THREE.MeshStandardMaterial({ color: "#777965", roughness: 1 }), iron = new THREE.MeshStandardMaterial({ color: "#535e55", metalness: 0.65, roughness: 0.65 });
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#9d9789";
    ctx.fillRect(0, 0, 256, 256);
    for (let row = 0; row < 16; row++) for (let col = -1; col < 9; col++) {
      const v = 135 + (row * 17 + col * 31 + 100) % 55;
      ctx.fillStyle = `rgb(${v + 10},${v + 5},${v - 5})`;
      ctx.fillRect(col * 32 + row % 2 * 16 + 1, row * 16 + 1, 30, 14);
    }
    const masonry = new THREE.CanvasTexture(canvas);
    masonry.colorSpace = THREE.SRGBColorSpace;
    masonry.wrapS = masonry.wrapT = THREE.RepeatWrapping;
    masonry.repeat.set(0.025, 0.025);
    stone.map = masonry;
    stone.bumpMap = masonry.clone();
    stone.bumpMap.colorSpace = THREE.NoColorSpace;
    stone.bumpScale = 0.4;
  }
  const mesh = (geo, mat) => {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = m.receiveShadow = true;
    root.add(m);
    return m;
  };
  const box = (w, h, d, mat, x, y, z) => {
    const m = mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    return m;
  };
  const paths = [tunnelPath(network, 0), tunnelPath(network, 1)];
  function sweep(path, radius, mat) {
    const verts2 = [], indices2 = [];
    const profile = [[-radius, 0], [-radius, 48]];
    for (let j = 1; j <= 24; j++) {
      const a = Math.PI - j * Math.PI / 24;
      profile.push([radius * Math.cos(a), 48 + radius * Math.sin(a)]);
    }
    profile.push([radius, 0]);
    for (let i = 0; i < path.length; i++) {
      const p = path[i], a = path[Math.max(0, i - 1)], b = path[Math.min(path.length - 1, i + 1)], len = Math.hypot(b.x - a.x, b.z - a.z), nx = -(b.z - a.z) / len, nz = (b.x - a.x) / len;
      for (const [u, y] of profile) verts2.push(p.x + nx * u, y, p.z + nz * u);
      if (i) for (let j = 1; j < profile.length; j++) {
        const k = i * profile.length + j;
        indices2.push(k - profile.length - 1, k - profile.length, k, k - profile.length - 1, k, k - 1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(verts2, 3));
    g.setIndex(indices2);
    g.computeVertexNormals();
    return mesh(g, mat);
  }
  for (const path of paths) {
    sweep(path, 14, dark);
    sweep(path, 16, rock);
    for (const end of [0, path.length - 1]) {
      const p = path[end], q = path[end === 0 ? 1 : end - 1], dx = p.x - q.x, dz = p.z - q.z, len = Math.hypot(dx, dz), nx = -dz / len, nz = dx / len;
      for (let row = 0; row < 10; row++) for (const side of [-1, 1]) {
        const m = box(2, 4.6, 5, stone, p.x + nx * side * 15, row * 4.8 + 2.4, p.z + nz * side * 15);
        m.rotation.y = -Math.atan2(nz, nx);
      }
      for (let j = 0; j < 19; j++) {
        const a = (j + 0.5) * Math.PI / 19, u = Math.cos(a) * 15, y = 48 + Math.sin(a) * 15;
        const m = box(2.5, 2, 5, stone, p.x + nx * u, y, p.z + nz * u);
        m.rotation.order = "YXZ";
        m.rotation.y = -Math.atan2(nz, nx);
        m.rotation.z = a - Math.PI / 2;
      }
    }
  }
  for (const angle of [TUNNEL.start, TUNNEL.end]) {
    const facade = new THREE.Shape();
    facade.moveTo(-32.5, -2);
    facade.lineTo(32.5, -2);
    facade.lineTo(32.5, 72);
    facade.lineTo(-32.5, 72);
    facade.closePath();
    for (const offset of [-16.5, 16.5]) {
      const hole = new THREE.Path();
      hole.moveTo(offset - 14, -1);
      hole.lineTo(offset - 14, 48);
      for (let j = 1; j <= 32; j++) {
        const a = Math.PI - j * Math.PI / 32;
        hole.lineTo(offset + 14 * Math.cos(a), 48 + 14 * Math.sin(a));
      }
      hole.lineTo(offset + 14, -1);
      hole.closePath();
      facade.holes.push(hole);
    }
    const geo = new THREE.ExtrudeGeometry(facade, { depth: 3, bevelEnabled: false, curveSegments: 32 });
    if (angle === TUNNEL.end) geo.translate(0, 0, -3);
    const face = mesh(geo, stone);
    face.position.set(1122 + 265.5 * Math.sin(angle), 0, 350 - 265.5 * Math.cos(angle));
    face.rotation.y = Math.PI / 2 - angle;
  }
  const verts = [], indices = [];
  for (let i = 0; i <= 40; i++) {
    const a = TUNNEL.start + (TUNNEL.end - TUNNEL.start) * i / 40;
    for (const r of [233, 249, 265.5, 282, 298]) {
      const y = 72 + 9 * Math.sin(Math.PI * i / 40) + 3 * Math.sin((r - 233) / 65 * Math.PI);
      verts.push(1122 + r * Math.sin(a), y, 350 - r * Math.cos(a));
    }
    if (i) for (let j = 1; j < 5; j++) {
      const k = i * 5 + j;
      indices.push(k - 6, k - 5, k, k - 6, k, k - 1);
    }
  }
  const roofGeo = new THREE.BufferGeometry();
  roofGeo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  roofGeo.setIndex(indices);
  roofGeo.computeVertexNormals();
  mesh(roofGeo, new THREE.MeshStandardMaterial({ color: "#737c4e", roughness: 1, side: THREE.DoubleSide }));
  for (const r of [233, 298]) {
    const v = [], ix = [];
    for (let i = 0; i <= 40; i++) {
      const a = TUNNEL.start + (TUNNEL.end - TUNNEL.start) * i / 40, x = 1122 + r * Math.sin(a), z = 350 - r * Math.cos(a), top = 72 + 9 * Math.sin(Math.PI * i / 40);
      v.push(x, 0.35, z, x, top, z);
      if (i) {
        const k = i * 2;
        ix.push(k - 2, k - 1, k, k - 1, k + 1, k);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
    g.setIndex(ix);
    g.computeVertexNormals();
    mesh(g, new THREE.MeshStandardMaterial({ color: "#87816c", roughness: 1, side: THREE.DoubleSide }));
  }
  foundation.visible = false;
  const fm = foundation.material;
  for (const [x0, x1, z0, z1] of [[0, 397, 0, 700], [435, 1500, 0, 700], [397, 435, 0, 54], [397, 435, 82, 700]]) box(x1 - x0, 18, z1 - z0, fm, (x0 + x1) / 2, -12, (z0 + z1) / 2);
  const bedGeo = new THREE.PlaneGeometry(38, 28, 16, 12);
  bedGeo.rotateX(-Math.PI / 2);
  for (let i = 0; i < bedGeo.attributes.position.count; i++) {
    const a = bedGeo.attributes.position, x = a.getX(i) + 416, z = a.getZ(i) + 68;
    a.setY(i, valleyHeight(x, z));
  }
  bedGeo.computeVertexNormals();
  const bed = mesh(bedGeo, new THREE.MeshStandardMaterial({ color: "#8c846c", roughness: 1 }));
  bed.position.set(416, 0, 68);
  box(44, 1.5, 24, iron, 416, 0.15, 68);
  for (const side of [-1, 1]) {
    box(44, 2, 1.3, iron, 416, -1, 68 + side * 10);
    box(4, 12, 26, stone, 416 + side * 22, -8, 68);
    for (let x = 396; x <= 436; x += 8) box(0.6, 5, 0.6, iron, x, 3, 68 + side * 12);
    box(44, 0.6, 0.6, iron, 416, 5.5, 68 + side * 12);
  }
  return { root, paths, bridge: BRIDGE, terrainHeight(x, z) {
    return bridgeAt(x, z) ? valleyHeight(x, z) : mask.height(x, z);
  }, cameraHeight(x, z) {
    return tunnelAt(x, z) ? 84 : bridgeAt(x, z) ? 0.35 : mask.height(x, z);
  }, reserved(x, z) {
    return tunnelAt(x, z) || bridgeAt(x, z);
  } };
}
export {
  railwayWorks
};
