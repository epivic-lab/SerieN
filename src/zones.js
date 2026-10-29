import * as THREE from "three";
import { buildZoneLayout, FARM, GOODS_OFFICE } from "./zone-layout.js";
import { HARDSTANDING } from "./landscape.js";
const materials = /* @__PURE__ */ new Map();
function mat(color, roughness = 0.86, metalness = 0) {
  const k = [color, roughness, metalness].join("/");
  if (!materials.has(k)) materials.set(k, new THREE.MeshStandardMaterial({ color, roughness, metalness }));
  return materials.get(k);
}
function mesh(g, m, parent, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(g, m);
  o.position.set(x, y, z);
  o.castShadow = o.receiveShadow = true;
  parent.add(o);
  return o;
}
function box(w, h, d, m, p, x = 0, y = 0, z = 0) {
  return mesh(new THREE.BoxGeometry(w, h, d), m, p, x, y, z);
}
function cylinder(r, h, m, p, x = 0, y = 0, z = 0, n = 10) {
  return mesh(new THREE.CylinderGeometry(r, r, h, n), m, p, x, y, z);
}
function rod(a, b, r, m, p) {
  const v = new THREE.Vector3(...b).sub(new THREE.Vector3(...a)), o = cylinder(r, v.length(), m, p);
  o.position.copy(new THREE.Vector3(...a).addScaledVector(v, 0.5));
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize());
  return o;
}
function canvasMap(w, h, paint) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  paint(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function sign(text, p, x, y, z, width = 24, height = 5) {
  const map = canvasMap(256, 64, (ctx, w, h) => {
    ctx.fillStyle = "#153f47";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#d5d0b9";
    ctx.lineWidth = 3;
    ctx.strokeRect(3, 3, w - 6, h - 6);
    ctx.fillStyle = "#fff3d6";
    ctx.font = "bold 28px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(text, w / 2, 42);
  });
  return mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshStandardMaterial({ map, roughness: 0.9, side: THREE.DoubleSide }), p, x, y, z);
}
function smallBuilding(scene, definition, windowMaterial, wood, rural = false) {
  const { x, z, w, d, h } = definition, g = new THREE.Group();
  g.name = definition.id;
  g.position.set(x, 0.35, z);
  g.userData.building = { w, d, h, id: definition.id };
  scene.add(g);
  const plaster = mat(rural ? "#d2c1a0" : "#a7997a"), stone = mat("#817c69"), tile = mat("#8e5540"), trim = mat("#534a39");
  box(w, 2.5, d, stone, g, 0, 1.25, 0);
  box(w, h - 2.5, d, plaster, g, 0, h / 2 + 1.25, 0);
  const pitch = rural ? 0.42 : 0.31, rise = w * 0.5 * pitch, slope = Math.atan(pitch), panel = Math.hypot(w / 2, rise) + 5;
  for (const side of [-1, 1]) {
    const roof = box(panel, 1.8, d + 7, tile, g, side * w / 4, h + rise / 2, 0);
    roof.rotation.z = -side * slope;
    box(1.3, h, 1.6, trim, g, side * (w / 2 - 2), h / 2, d / 2 + 1);
  }
  const gable = new THREE.BufferGeometry();
  gable.setAttribute("position", new THREE.Float32BufferAttribute([-w / 2, h, d / 2, w / 2, h, d / 2, 0, h + rise, d / 2, w / 2, h, -d / 2, -w / 2, h, -d / 2, 0, h + rise, -d / 2], 3));
  gable.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 0.5, 1, 0, 0, 0, 0.5, 0.5], 2));
  gable.computeVertexNormals();
  mesh(gable, plaster, g);
  for (const side of [-1, 1]) for (const px of [-w * 0.28, w * 0.25]) {
    box(9, 11, 1, trim, g, px, h * 0.58, side * (d / 2 + 0.55));
    box(7, 9, 1, windowMaterial, g, px, h * 0.58, side * (d / 2 + 1));
    box(0.7, 9, 1.2, mat("#c3b291"), g, px, h * 0.58, side * (d / 2 + 1.5));
    box(9, 1, 2, stone, g, px, h * 0.58 - 5.8, side * (d / 2 + 1.2));
    for (const dx of [-6, 6]) box(2.5, 11, 1, mat(rural ? "#59694c" : "#5a5e53"), g, px + dx, h * 0.58, side * (d / 2 + 1));
  }
  box(9, 17, 1.2, wood, g, -3, 8.5, d / 2 + 1);
  box(11, 1.2, 6, stone, g, -3, 0.6, d / 2 + 3);
  box(2, 0.5, 1.6, mat("#bcb392", 0.4, 0.5), g, 0, 8, d / 2 + 2);
  if (rural) {
    box(5, 14, 5, mat("#775140"), g, w * 0.2, h + 8, -d * 0.2);
    box(7, 2, 7, stone, g, w * 0.2, h + 16, -d * 0.2);
    for (let k = 0; k < 4; k++) {
      const timber = cylinder(1.1, 14, wood, g, w / 2 + 4, 1.5 + k * 0.8, -8 + k * 3);
      timber.rotation.x = Math.PI / 2;
    }
  } else sign("G\xDCTER", g, 0, h - 4, d / 2 + 1.8, 22, 4.8);
  return g;
}
function person(parent, { x, y, z, h, color }) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  const coat = mat(color), skin = mat("#bc9677"), dark = mat("#343a39");
  box(2.4, h * 0.36, 1.45, coat, g, 0, h * 0.56, 0);
  mesh(new THREE.SphereGeometry(h * 0.105, 9, 6), skin, g, 0, h * 0.88, 0);
  for (const side of [-1, 1]) {
    box(0.62, h * 0.38, 0.75, dark, g, side * 0.55, h * 0.2, 0);
    const arm = box(0.55, h * 0.32, 0.55, coat, g, side * 1.52, h * 0.53, 0);
    arm.rotation.z = side * 0.1;
    box(0.85, 0.5, 1.5, dark, g, side * 0.55, 0.25, 0.35);
  }
  return g;
}
function bufferStop(parent, stop) {
  const g = new THREE.Group();
  g.position.set(stop.x, 0, stop.z);
  g.rotation.y = stop.angle;
  g.name = `buffer-${stop.edge}`;
  parent.add(g);
  const frame = mat("#45423b", 0.8, 0.3), red = mat("#a04332"), beam = mat("#4b3a2a");
  for (const side of [-1, 1]) {
    rod([stop.beamOffset, 9, side * 6], [stop.beamOffset + 9, 1, side * 6], 1, frame, g);
    box(12, 1.8, 3, frame, g, stop.beamOffset + 6, 1, side * 6);
  }
  box(3, 3.5, 18, beam, g, stop.beamOffset, 9, 0);
  box(3.3, 2, 6, red, g, stop.beamOffset - 0.1, 9, 0);
  const light = cylinder(1.5, 1, mat("#d2c7ad"), g, stop.beamOffset, 12, 0);
  light.rotation.z = Math.PI / 2;
  return g;
}
function cargo(parent, p, wood) {
  const g = new THREE.Group();
  g.position.set(p.x, p.y, p.z);
  g.rotation.y = p.rotation;
  parent.add(g);
  const dark = mat("#5c5141"), metal = mat("#7b6550", 0.65, 0.25);
  if (p.type === "barrels") {
    for (const dx of [-2.3, 2.3]) for (const dz of [-2, 2]) {
      cylinder(1.65, 4.5, metal, g, dx, 2.25, dz);
      for (const y of [1, 3.5]) {
        const band = new THREE.Mesh(new THREE.TorusGeometry(1.67, 0.18, 4, 12), dark);
        band.rotation.x = Math.PI / 2;
        band.position.set(dx, y, dz);
        g.add(band);
      }
    }
  } else if (p.type === "rails") {
    for (let k = 0; k < 4; k++) {
      box(11, 0.6, 0.7, metal, g, 0, 0.8 + k * 0.7, k % 2 * 2 - 1);
      box(3, 0.6, 8, wood, g, k % 2 === 0 ? -3 : 3, 0.3 + k * 0.7, 0);
    }
  } else {
    for (let level = 0; level < (p.type === "crates" ? 2 : 3); level++) {
      const y = level * (p.type === "crates" ? 3.8 : 1.2);
      for (let j = -2; j <= 2; j++) box(10, 0.7, 1.2, wood, g, 0, y + 0.6, j * 1.6);
      for (const x of [-3, 3]) box(1.3, 1, 8, dark, g, x, y + 0.2, 0);
      if (p.type === "crates") {
        box(9, 3.2, 7, wood, g, 0, y + 2.1, 0);
        for (const x of [-3.6, 3.6]) box(0.6, 3.7, 7.3, dark, g, x, y + 2.1, 0);
      }
    }
  }
}
function buildZones(scene, network, { mask, wood }) {
  const layout = buildZoneLayout(network, mask), groups = new THREE.Group();
  groups.name = "station-and-yard-details";
  scene.add(groups);
  const warmWindows = new THREE.MeshStandardMaterial({ color: "#43524f", emissive: "#ffd491", emissiveIntensity: 0.02, roughness: 0.75 });
  const farm = smallBuilding(scene, FARM, warmWindows, wood, true), office = smallBuilding(scene, GOODS_OFFICE, warmWindows, wood);
  const iron = mat("#37443f", 0.75, 0.35), stone = mat("#a79d86"), roof = mat("#656454", 0.8, 0.2), pots = mat("#955b41");
  const lights = [];
  for (const p of layout.cargo) cargo(groups, p, wood);
  for (const p of layout.stops) bufferStop(groups, p);
  for(const p of HARDSTANDING) {
    const apron = new THREE.Mesh(new THREE.PlaneGeometry(p.w,p.d),mat(p.id==='farm-lane'?'#a2926c':'#90866d'));
    apron.name=p.id;apron.rotation.x=-Math.PI/2;apron.position.set(p.x,.46,p.z);
    apron.receiveShadow=true;groups.add(apron);
  }
  // Covered goods platform and ramp beside the office; the loading aisle stays open.
  box(30,3,28,stone,groups,565,1.85,355);
  for(const x of [552,578])for(const z of [343,367])box(.9,22,.9,iron,groups,x,14.3,z);
  const shelter=box(34,1.2,32,roof,groups,565,26,355);shelter.rotation.z=-.055;
  for(let x=550;x<=580;x+=5)box(.18,.35,32,iron,groups,x,26.7,355);
  for(const z of [344,366])rod([552,18,z],[559,25,z],.25,iron,groups);
  const ramp=box(12,1,12,stone,groups,585,1.9,355);ramp.rotation.z=-.22;
  sign('GOODS',groups,565,21,371.1,18,4);
  const lampGlow=new THREE.MeshStandardMaterial({color:'#e0d3ad',emissive:'#ffce87',emissiveIntensity:.05,roughness:.5});
  for(const [x,z] of [[590,333],[721,377],[448,322]]) {
    cylinder(.55,29,iron,groups,x,14.85,z);
    rod([x,29,z],[x+5,29,z],.3,iron,groups);
    box(4.5,1.1,2.8,roof,groups,x+5,29,z);
    box(3.8,.3,2.2,lampGlow,groups,x+5,28.3,z);
    box(2,1.3,2,stone,groups,x,1,z);
  }
  for(const p of [{x:608,z:355,color:'#53665d'},{x:700,z:355,color:'#9a7347'}])
    person(groups,{...p,y:.5,h:10.5});
  // Passenger information sits outside the station footprint and the running gauge.
  for(const x of [657,843]) {
    for(const dx of [-3,3])box(.45,13,.45,iron,groups,x+dx,11,541);
    box(8,8,.7,iron,groups,x,15,541);
    sign('DEPARTURES',groups,x,17,541.4,7,1.6);
    for(let row=0;row<4;row++)box(5.8,.22,.08,stone,groups,x,15.2-row,541.4);
  }
  // Cycle stand on the forecourt: paired rims, frame and saddle, all N scale.
  for(let i=0;i<3;i++) {
    const x=701+i*8,z=489;
    for(const dx of [-3,3]) {
      const rim=mesh(new THREE.TorusGeometry(2.4,.16,5,14),iron,groups,x+dx,2.95,z);
      rod([x+dx,2.95,z],[x,5,z],.13,iron,groups);
    }
    rod([x-3,2.95,z],[x+1,3,z],.13,iron,groups);
    rod([x,5,z],[x+1,3,z],.13,iron,groups);
    box(2,.5,1,wood,groups,x-.6,5.4,z);
    rod([x+3,2.95,z],[x+2,6,z],.12,iron,groups);
    rod([x+2,6,z-1],[x+2,6,z+1],.12,iron,groups);
  }
  const leaf = mat("#9b873f"), vine = mat("#695639"), fruit = mat("#655450");
  const soil=mat('#79634b'),straw=mat('#b8a06b');
  // Cultivated soil follows the same height field as the vines at every vertex.
  for(let row=0;row<10;row++) {
    const posts=layout.vineyard.filter(p=>p.row===row).sort((a,b)=>a.z-b.z);
    for(let i=1;i<posts.length;i++) {
      const a=posts[i-1],b=posts[i];if(b.z-a.z>11)continue;
      const geo=new THREE.PlaneGeometry(8,b.z-a.z,2,4);geo.rotateX(-Math.PI/2);
      const pos=geo.attributes.position;
      for(let j=0;j<pos.count;j++)pos.setY(j,mask.height(a.x+pos.getX(j),(a.z+b.z)/2+pos.getZ(j))+.08);
      geo.computeVertexNormals();const strip=mesh(geo,soil,groups,a.x,0,(a.z+b.z)/2);strip.castShadow=false;
    }
  }
  for (const p of layout.vineyard) {
    cylinder(0.22, 6.5, vine, groups, p.x, p.y + 3.25, p.z, 5);
    for (const side of [-1, 1]) {
      rod([p.x, p.y + 4, p.z], [p.x + side * 3, p.y + 5, p.z], 0.1, iron, groups);
      for (let k = 0; k < 3; k++) mesh(new THREE.IcosahedronGeometry(0.95, 0), leaf, groups, p.x + side * (1 + k * 0.65), p.y + 4.5 + k % 2 * 0.6, p.z + 0.8);
      if (p.post) mesh(new THREE.IcosahedronGeometry(0.45, 0), fruit, groups, p.x + side * 1.8, p.y + 3.6, p.z + 0.5);
    }
    if (p.post) box(0.6, 8, 0.6, wood, groups, p.x, p.y + 4, p.z);
  }
  for (let row = 0; row < 10; row++) {
    const posts = layout.vineyard.filter((p) => p.row === row).sort((a, b) => a.z - b.z);
    for (let i = 1; i < posts.length; i++) {
      const a = posts[i - 1], b = posts[i];
      if (b.z - a.z > 11) continue;
      rod([a.x, a.y + 5.8, a.z], [b.x, b.y + 5.8, b.z], 0.08, iron, groups);
    }
  }
  const cart = new THREE.Group();
  cart.position.set(FARM.x+48, 0.35, FARM.z+31);
  groups.add(cart);
  box(10, 1, 7, wood, cart, 0, 3.5, 0);
  for (const side of [-1, 1]) {
    const wheel = cylinder(2, 0.8, iron, cart, 0, 2, side * 4, 12);
    wheel.rotation.x = Math.PI / 2;
    box(10, 3, 0.7, wood, cart, 0, 5, side * 3.5);
  }
  rod([-4, 3, 0], [-10, 2, 0], 0.4, wood, cart);
  for(let i=0;i<3;i++) {
    const bale=cylinder(3,6,straw,groups,FARM.x+47+i*7,3.5,FARM.z+13,12);
    bale.rotation.z=Math.PI/2;
    for(const dx of [-2,2]) {
      const band=mesh(new THREE.TorusGeometry(3.05,.12,4,14),vine,groups,FARM.x+47+i*7+dx,3.5,FARM.z+13);
      band.rotation.y=Math.PI/2;
    }
  }
  // Short farm fence ends before the access lane; it never extends across rails.
  for(let x=1134;x<=1209;x+=15) {
    if(mask.track(x,211)<24)continue;
    if(Math.abs(x-FARM.x)<9)continue;
    box(.8,7,.8,wood,groups,x,3.85,211);
    if(x<1209&&Math.abs(x+7.5-FARM.x)>13)for(const y of [3,6])box(15,.65,.65,wood,groups,x+7.5,y,211);
  }
  return { lights, pendingStops: layout.pendingStops, footprints: layout.footprints, scenicBuildings: [FARM, GOODS_OFFICE].map((b) => ({ ...b })), update(night, dt) {
    warmWindows.emissiveIntensity = 0.02 + night * 1.7;
    lampGlow.emissiveIntensity=.05+night*2.8;
    for (const l of lights) l.intensity = night * 0.8;
  }, groups, farm, office, layout };
}
export {
  buildZones
};
