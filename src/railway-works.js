import * as THREE from "three";
import { BRIDGE, bridgeAt, valleyHeight } from "./structure-layout.js";
function railwayWorks(scene, network, mask, foundation) {
  const root = new THREE.Group();
  root.name = "Opere ferroviarie scenografiche";
  scene.add(root);
  const stone = new THREE.MeshStandardMaterial({ color: "#9d9685", roughness: 0.97 }), iron = new THREE.MeshStandardMaterial({ color: "#535e55", metalness: 0.65, roughness: 0.65 });
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
  return { root, bridge: BRIDGE, terrainHeight(x, z) {
    return bridgeAt(x, z) ? valleyHeight(x, z) : mask.height(x, z);
  }, cameraHeight(x, z) {
    return bridgeAt(x, z) ? 0.35 : mask.height(x, z);
  }, reserved(x, z) {
    return bridgeAt(x, z);
  } };
}
export {
  railwayWorks
};
