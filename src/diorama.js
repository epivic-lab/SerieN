import { railwayWorks } from "./railway-works.js";
import { bridgeAt } from "./structure-layout.js";
import * as THREE from "three";
import { seeded, clearance, forestSites } from "./landscape.js";
import {surfaceMaps} from "./graphic-foundations.js";
function canvasTexture(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function roofTexture() {
  return canvasTexture(512, 256, (ctx, w, h) => {
    ctx.fillStyle = "#b19e91";
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) for (let x = -16; x < w; x += 16) {
      const sx = x + y / 16 % 2 * 8;
      const g = ctx.createLinearGradient(sx, y, sx + 16, y + 16);
      g.addColorStop(0, "#bcb5a7");
      g.addColorStop(0.5, "#e5d4b6");
      g.addColorStop(1, "#746b60");
      ctx.fillStyle = g;
      ctx.fillRect(sx, y, 15, 15);
      ctx.strokeStyle = "#645949";
      ctx.strokeRect(sx, y, 16, 16);
    }
  });
}
function wallTexture() {
  const rnd = seeded(42);
  return canvasTexture(512, 256, (ctx, w, h) => {
    ctx.fillStyle = "#d5cfc0";
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) for (let x = -28; x < w; x += 36) {
      const c = 175 + Math.floor(rnd() * 55);
      ctx.fillStyle = `rgb(${c + 10},${c},${c - 14})`;
      ctx.fillRect(x + y / 16 % 2 * 18 + 1, y + 1, 34, 14);
    }
  });
}
function grainTexture() {
  const rnd = seeded(8);
  return canvasTexture(1024, 128, (ctx, w, h) => {
    ctx.fillStyle = "#55351f";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 850; i++) {
      const y = rnd() * h;
      ctx.strokeStyle = `rgba(${rnd() > 0.5 ? "196,138,78" : "20,12,8"},${0.08 + rnd() * 0.25})`;
      ctx.lineWidth = 0.3 + rnd();
      ctx.beginPath();
      for (let x = 0; x <= w; x += 8) {
        const yy = y + Math.sin(x * 9e-3 + i) * 1.7 + Math.sin(x * 0.04 + i) * 0.3;
        if (x === 0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
  });
}
function foliageTexture(pine = false) {
  const rnd = seeded(pine ? 7 : 19);
  return canvasTexture(256, 256, (ctx) => {
    if (pine) {
      for (let y = 5; y < 240; y += 3) {
        const half = y / 240 * 105;
        for (let j = 0; j < 12; j++) {
          const x = 128 + (rnd() - 0.5) * half * 2;
          ctx.strokeStyle = `rgba(${90 + rnd() * 60},${115 + rnd() * 75},${65 + rnd() * 45},.95)`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(128, y - 10);
          ctx.lineTo(x, y + 5 + rnd() * 12);
          ctx.stroke();
        }
      }
    } else for (let i = 0; i < 2600; i++) {
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()), lobe = 1 + 0.12 * Math.sin(a * 7);
      const x = 128 + Math.cos(a) * r * 110 * lobe, y = 128 + Math.sin(a) * r * 100 * lobe;
      const light = 195 + Math.floor(rnd() * 60) - y / 256 * 12;
      ctx.fillStyle = `rgb(${light + 15},${light + 8},${light - 8})`;
      ctx.beginPath();
      ctx.ellipse(x, y, 1.5 + rnd() * 4, 1 + rnd() * 3, rnd() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}
function instance(geometry, material, items, scene) {
  const mesh = new THREE.InstancedMesh(geometry, material, items.length), d = new THREE.Object3D();
  items.forEach((p, i) => {
    d.position.set(p.x, p.y, p.z);
    d.rotation.set(p.rx || 0, p.ry || 0, p.rz || 0);
    d.scale.set(p.sx || 1, p.sy || 1, p.sz || 1);
    d.updateMatrix();
    mesh.setMatrixAt(i, d.matrix);
    if (p.color) mesh.setColorAt(i, new THREE.Color(p.color));
  });
  mesh.castShadow = mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}
function diorama(scene, renderer, network, wood, { foundation, reserved = () => false } = {}) {
  const buildings = scene.children.filter((o) => o.userData.building).map((o) => ({ x: o.position.x, z: o.position.z, ...o.userData.building }));
  const mask = clearance(network, buildings), rnd = seeded(814);
  const works = railwayWorks(scene, network, mask, foundation);
  mask.reserved = (x, z) => reserved(x, z) || works.reserved(x, z);
  wood.map = grainTexture();
  wood.color.set("#d4b08a");
  wood.map.wrapS = wood.map.wrapT = THREE.RepeatWrapping;
  wood.map.repeat.set(2, 1);
  wood.roughness = 0.65;
  wood.needsUpdate = true;
  const geo = new THREE.PlaneGeometry(1496, 696, 112, 52);
  geo.rotateX(-Math.PI / 2);
  const positions = geo.attributes.position, colors = [];
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i) + 750, z = positions.getZ(i) + 350, h = mask.height(x, z);
    positions.setY(i, h);
    const patch=.28+.17*Math.sin(x*.012+Math.sin(z*.014))*Math.cos(z*.019);
    const c = new THREE.Color('#727e54').lerp(new THREE.Color('#a08c66'),patch).multiplyScalar(1+Math.min(h,30)*.002);
    colors.push(c.r, c.g, c.b);
  }
  const ix = geo.index.array, kept = [];
  for (let i = 0; i < ix.length; i += 3) {
    const x = (positions.getX(ix[i]) + positions.getX(ix[i + 1]) + positions.getX(ix[i + 2])) / 3 + 750, z = (positions.getZ(ix[i]) + positions.getZ(ix[i + 1]) + positions.getZ(ix[i + 2])) / 3 + 350;
    if (!bridgeAt(x, z)) kept.push(ix[i], ix[i + 1], ix[i + 2]);
  }
  geo.setIndex(kept);
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const detail=surfaceMaps('terrain');
  for(const map of Object.values(detail)){map.repeat.set(1496/128,696/128);map.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());}
  const terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1,map:detail.albedo,bumpMap:detail.detail,roughnessMap:detail.detail,bumpScale:.16 }));
  terrain.name='Terrain · continuous relief and multiscale surface';
  terrain.position.set(750, 0, 350);
  terrain.receiveShadow = true;
  scene.add(terrain);
  const trees = forestSites(mask), trunks = [], branches = [], crowns = [], pines = [], pineVolume = [];
  for (const t of trees) {
    trunks.push({ color: t.species === "birch" ? "#c4c6b8" : "#64513d", x: t.x, y: t.y + t.h * 0.3, z: t.z, sx: t.h * 0.023, sy: t.h * 0.6, sz: t.h * 0.023 });
    if (t.pine) {
      for (let j = 0; j < 3; j++) pines.push({ x: t.x, y: t.y + t.h * 0.55, z: t.z, sx: t.h * 0.65, sy: t.h, sz: 1, ry: j * Math.PI / 3, color: "#58724b" });
      for(let j=0;j<4;j++) pineVolume.push({x:t.x,y:t.y+t.h*(.36+j*.15),z:t.z,
        sx:t.h*(.29-j*.052),sy:t.h*.38,sz:t.h*(.29-j*.052),ry:t.rotation+j*.7,
        color:new THREE.Color(j%2?'#4b6042':'#586e49')});
    } else {
      const palette = ["#d98a24", "#e5ab38", "#b95424", "#af9946", "#cc7332", "#dfb64c"];
      const color = new THREE.Color(t.species==='birch'?'#c5b754':palette[Math.floor(t.hue * palette.length)]);
      for (let j = 0; j < 5; j++) {
        const a = j * 2.4, r = t.h * 0.16 * (j ? 1 : 0), cx = t.x + Math.cos(a) * r, cz = t.z + Math.sin(a) * r, cy = t.y + t.h * (0.62 + j % 3 * 0.09);
        branches.push({ x: (t.x + cx) / 2, y: t.y + t.h * 0.46, z: (t.z + cz) / 2, sx: 0.6, sy: t.h * 0.28, sz: 0.6, rz: Math.cos(a) * 0.55, rx: Math.sin(a) * 0.55 });
        for (let k = 0; k < 3; k++) crowns.push({ x: cx, y: cy, z: cz, sx: t.h * 0.65, sy: t.h * 0.62, sz: 1, ry: k * Math.PI / 3 + j, color });
      }
    }
  }
  branches.forEach((b) => b.color = "#64513d");
  const bark = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 1 });
  instance(new THREE.CylinderGeometry(0.65, 1, 1, 6), bark, [...trunks, ...branches], scene);
  const windTime = { value: 0 };
  const foliage = new THREE.MeshStandardMaterial({ map: foliageTexture(), alphaTest: 0.48, side: THREE.DoubleSide, roughness: 1 });
  foliage.onBeforeCompile = (shader) => {
    shader.uniforms.windTime = windTime;
    shader.vertexShader = "uniform float windTime;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\ntransformed.x+=sin(windTime*1.2+instanceMatrix[3].x*.035)*.018*position.y;");
  };
  const leaves = instance(new THREE.PlaneGeometry(1, 1), foliage, crowns, scene);
  leaves.userData.foliage = true;
  const evergreen = instance(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ map: foliageTexture(true), alphaTest: 0.48, side: THREE.DoubleSide, roughness: 1 }), pines, scene);
  evergreen.userData.foliage = true;
  const conifers=instance(new THREE.ConeGeometry(1,1,9),new THREE.MeshStandardMaterial({roughness:1}),pineVolume,scene);
  conifers.name='Layered conifers';conifers.userData.foliage=true;
  const volume = [];
  for (const t of trees.filter((t2) => !t2.pine)) {
    const col = new THREE.Color(["#c88f39", "#b16a39", "#b8a15a", "#bf772e"][Math.floor(t.hue * 4)]);
    for (let j = 0; j < 7; j++) {
      const a = j * 2.399 + t.rotation, r = t.h * 0.14 * (j ? 1 : 0);
      const narrow=t.species==='birch'?.83:1;
      volume.push({ x: t.x + Math.cos(a) * r, y: t.y + t.h * (0.64 + j % 3 * 0.075), z: t.z + Math.sin(a) * r, sx: t.h * (0.12 + j % 3 * 0.02)*narrow, sy: t.h * (t.species==='birch'?.17:.13+j%2*.02), sz: t.h * .13*narrow, rx: 0.2 * Math.sin(a), ry: a, rz: 0.2 * Math.cos(a), color: col.clone().multiplyScalar(.88+j%3*.08) });
    }
  }
  // Uneven lobes break the smooth ellipsoid silhouette without adding draw calls.
  const crownGeometry=new THREE.IcosahedronGeometry(1,2), crownVertices=crownGeometry.attributes.position;
  for(let i=0;i<crownVertices.count;i++) {
    const x=crownVertices.getX(i),y=crownVertices.getY(i),z=crownVertices.getZ(i);
    const r=1+.07*Math.sin(x*19+y*11)*Math.cos(z*17-x*7);
    crownVertices.setXYZ(i,x*r,y*r,z*r);
  }
  crownGeometry.computeVertexNormals();
  const canopy = instance(crownGeometry, new THREE.MeshStandardMaterial({ roughness: 0.96 }), volume, scene);
  canopy.userData.foliage = true;
  let profile = "high";
  const shrubs = [], grass = [], litter = [];
  for (let i = 0; i < 5e3; i++) {
    const x = 12 + rnd() * 1476, z = 12 + rnd() * 676, d = mask.track(x, z);
    if (mask.reserved(x, z) || d < 17 || mask.building(x, z, 5) || mask.road(x, z)) continue;
    const y = mask.height(x, z);
    const woodland=trees.some(t=>Math.hypot(t.x-x,t.z-z)<t.radius+12);
    if (i < 900 && d > 29 && woodland && !mask.building(x,z,10)) shrubs.push({ x, y: y + 2 + rnd() * 2, z, sx: 3 + rnd() * 6, sy: 2 + rnd() * 3, sz: 3 + rnd() * 5, color: new THREE.Color().setHSL(0.12 + rnd() * 0.13, 0.35, 0.25 + rnd() * 0.1).convertSRGBToLinear() });
    grass.push({ x, y: y + 1.8, z, sx: 1 + rnd() * 2, sy: 2 + rnd() * 3, sz: 1, ry: rnd() * Math.PI, color: new THREE.Color().setHSL(0.13 + rnd() * 0.09, 0.32, 0.3 + rnd() * 0.15).convertSRGBToLinear() });
    if (woodland && rnd() > 0.2) litter.push({ x, y: y + 0.12, z, sx: 0.7 + rnd() * 1.5, sy: 0.4 + rnd(), sz: 1, rx: -Math.PI / 2, rz: rnd() * 6, color: new THREE.Color().setHSL(0.06 + rnd() * 0.08, 0.58, 0.34 + rnd() * 0.12).convertSRGBToLinear() });
  }
  const shrubsMesh = instance(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ roughness: 1 }), shrubs, scene);
  shrubsMesh.castShadow = false;
  const grassGeo = new THREE.BufferGeometry();
  grassGeo.setAttribute("position", new THREE.Float32BufferAttribute([-0.5, 0, 0, 0, 1, 0, 0.5, 0, 0], 3));
  grassGeo.computeVertexNormals();
  const blades = instance(grassGeo, new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 1 }), grass, scene);
  blades.castShadow = false;
  const fallen = instance(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 1 }), litter, scene);
  fallen.castShadow = false;
  const rocks = [];
  for (let i = 0; i < 180; i++) {
    const x = 140 + rnd() * 1210, z = 335 + rnd() * 130;
    if (mask.reserved(x, z) || mask.track(x, z) < 40 || mask.building(x, z, 20) || mask.road(x, z)) continue;
    const y = mask.height(x, z);
    if (y < 5) continue;
    rocks.push({ x, y: y - 2, z, sx: 5 + rnd() * 11, sy: 3 + rnd() * 7, sz: 4 + rnd() * 9, ry: rnd() * 6, color: new THREE.Color().setHSL(0.1, 0.10, 0.35 + rnd() * 0.12,THREE.SRGBColorSpace) });
  }
  instance(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 1 }), rocks, scene);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14e3, 14e3), new THREE.MeshStandardMaterial({ color: "#c0b6a1", roughness: 0.96 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(750, -32, 350);
  floor.receiveShadow = true;
  scene.add(floor);
  const shadow = canvasTexture(256, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 5, w / 2, h / 2, w / 2);
    g.addColorStop(0, "rgba(24,17,11,.55)");
    g.addColorStop(0.65, "rgba(24,17,11,.22)");
    g.addColorStop(1, "rgba(24,17,11,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(1900, 1020), new THREE.MeshBasicMaterial({ map: shadow, transparent: true, depthWrite: false }));
  contact.rotation.x = -Math.PI / 2;
  contact.position.set(750, -31.7, 350);
  scene.add(contact);
  const fence = [];
  for (let x = 180; x < 1180; x += 16) if (mask.track(x, 575) > 20 && !mask.building(x, 575, 4)) {
    fence.push({ x, y: 5, z: 575, sx: 1, sy: 9, sz: 1 });
    if (x < 1164) for (const y of [3, 7]) fence.push({ x: x + 8, y, z: 575, sx: 16, sy: 0.8, sz: 0.7 });
  }
  instance(new THREE.BoxGeometry(1, 1, 1), wood, fence, scene);
  return {
    trees: trees.length,
    foliage: leaves,
    evergreen,
    grass: blades,
    litter: fallen,
    canopy,
    cameraHeight: works.cameraHeight,
    buildings,
    works,
    setQuality(value) {
      profile = value;
    },
    update(dt, camera) {
      const detailed = profile !== "low" && (!camera || camera.zoom > 0.75);
      canopy.visible = detailed;
      conifers.visible=detailed;evergreen.visible=!detailed;
      leaves.visible = true;
      windTime.value += dt;
    }
  };
}
export {
  diorama,
  grainTexture,
  roofTexture,
  wallTexture
};
