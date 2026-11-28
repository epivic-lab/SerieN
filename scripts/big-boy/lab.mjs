import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createScenarioProfile} from '../../src/scenario-profile.js';
import {MotionLab} from './motion.mjs';
import {createValveGear} from './valve-gear-view.mjs';
const base=new URL('../../',location.href),path='docs/_active/rolling-stock/evidence/L02-D/prototype/';
const json=async p=>{const r=await fetch(new URL(p,base));if(!r.ok)throw new Error('Missing lab input');return r.json();};
const [rig,rods,dataset,drawgear,mechanism]=await Promise.all([json(path+'rig.json'),json('docs/_active/rolling-stock/evidence/L02-F/quartering-rig.json'),json('assets/scenario-v06/dataset.json'),json('docs/_active/rolling-stock/evidence/L02-E/drawgear.json'),json('docs/_active/rolling-stock/evidence/L02-F/mechanism-rig.json')]);
const raw=await fetch(new URL(path+'prototype.glb',base)).then(r=>{if(!r.ok)throw new Error('Missing GLB');return r.arrayBuffer();});
const sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',raw)),b=>b.toString(16).padStart(2,'0')).join('');
if(sha!==rods.sourceSha256)throw new Error('Rod extraction/source mismatch');
const gltf=await new GLTFLoader().parseAsync(raw,'');
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));document.body.append(renderer.domElement);
renderer.setSize(innerWidth,Math.max(300,innerHeight-145));renderer.setClearColor(0x18202a);
const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight(0xeaf3ff,0x685c48,3));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(100,300,100);scene.add(light);
const camera=new THREE.PerspectiveCamera(38,innerWidth/Math.max(300,innerHeight-145),.1,5000);
const controls=new OrbitControls(camera,renderer.domElement);const model=new THREE.Group();model.rotation.y=-Math.PI/2;scene.add(model);
const frames={},axles={};
for(const name of Object.keys(rig.frames))frames[name]=gltf.scene.getObjectByName(name);
for(const name of Object.keys(rig.axles))axles[name]=gltf.scene.getObjectByName(name);
// Detach rigid frames but retain their axle children. Pose solver gives world hinges.
for(const frame of Object.values(frames))model.add(frame);
// L02-F: positive-side wheels have a fixed quarter-turn on the common axle.
// Splitting by index conserves every source triangle, including the central shaft.
function ownMeshes(root){return root.isMesh?[root]:root.children.filter(o=>o.isMesh&&!Object.values(axles).includes(o));}
function indexedCopy(mesh,indices){const g=mesh.geometry.clone();g.setIndex(indices);return g;}
function partFrom(mesh,root,indices){
 const part=new THREE.Mesh(indexedCopy(mesh,indices),mesh.material);
 if(mesh!==root){part.position.copy(mesh.position);part.quaternion.copy(mesh.quaternion);part.scale.copy(mesh.scale);}
 root.add(part);return part;
}
for(const [name,spec] of Object.entries(rods.wheels)){
 const root=axles[name],own=ownMeshes(root);
 if(own.length!==spec.primitives.length)throw new Error('Wheel primitive mapping mismatch');
 for(const item of spec.primitives){
  const mesh=own[item.primitive],source=Array.from(mesh.geometry.index.array),positive=new Set(item.positiveTriangles),keep=[],moving=[];
  if(source.length!==item.indexCount)throw new Error('Wheel source indices changed');
  for(let t=0;t<source.length/3;t++)(positive.has(t)?moving:keep).push(...source.slice(t*3,t*3+3));
  if(!moving.length)continue;
  const part=partFrom(mesh,root,moving);part.name=name+'_positive_wheel';part.rotation.x+=rods.positiveSidePhaseRad;
  const original=mesh.geometry;mesh.geometry=indexedCopy(mesh,keep);original.dispose();
 }
}
for(const [name,spec] of Object.entries(mechanism.frames)){
 const own=ownMeshes(frames[name]);
 for(const item of spec.primitives){
  const mesh=own[item.primitive],source=Array.from(mesh.geometry.index.array),removed=new Set(item.removedTriangles),keep=[];
  if(source.length!==item.indexCount)throw new Error('Mechanism source indices changed');
  if(item.lateralReliefVertices.length){const previousGeometry=mesh.geometry;mesh.geometry=previousGeometry.clone();previousGeometry.dispose();const pos=mesh.geometry.attributes.position;for(const i of item.lateralReliefVertices)pos.setX(i,pos.getX(i)*item.lateralReliefFactor);pos.needsUpdate=true;mesh.geometry.computeVertexNormals();}
  for(let t=0;t<source.length/3;t++)if(!removed.has(t))keep.push(...source.slice(t*3,t*3+3));
  if(removed.size){const old=mesh.geometry;mesh.geometry=indexedCopy(mesh,keep);old.dispose();}
 }
}
const gear=createValveGear(rig,rods);scene.add(gear.group);
const material=new THREE.MeshStandardMaterial({color:0x818890,metalness:.65,roughness:.4});
const drawParts=[];
function meshFrom(data){const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));geometry.setIndex(data.indices);geometry.computeVertexNormals();return new THREE.Mesh(geometry,material);}
for(const key of ['engine','tender']) {
 const group=new THREE.Group();scene.add(group);drawParts.push({key,group});
 const mount=meshFrom(drawgear[key+'Mount']);mount.position.y=rig.drawbarPinsMm.height;group.add(mount);
 const member=meshFrom(drawgear[key]);member.position.y=rig.drawbarPinsMm.height;group.add(member);group.userData.member=member;
}

let lab,tracks=new THREE.Group();scene.add(tracks);let previous=null,disposed=false;
function setup(id){
 if(!['legacy','v06'].includes(id))throw new RangeError('Unknown scenario');
 tracks.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});tracks.clear();
 const profile=createScenarioProfile(id,dataset);const loop=profile.network.mainLoops[0];
 lab=new MotionLab(profile,rig,loop.segments[0].id);
 for(const edge of Object.values(profile.network.edges)){
  const pts=edge.points.map(p=>new THREE.Vector3(p.x,-.2,p.z));const geom=new THREE.BufferGeometry().setFromPoints(pts);tracks.add(new THREE.Line(geom,new THREE.LineBasicMaterial({color:0x526d7d})));
 }
 const p=lab.snapshot().frames.engine_rear;controls.target.set(p.x-20,10,p.z);camera.position.set(p.x+170,125,p.z+205);controls.update();viewScale=1;resize();previous=null;paint();
}
function paint(){
 const state=lab.snapshot();
 for(const [name,frame] of Object.entries(rig.frames)){
  const p=state.frames[name],o=frames[name];o.position.set(p.z,frame.pivotMm[1],-p.x);o.rotation.set(0,-Math.atan2(p.sin,p.cos),0);
 }
 for(const [name,a] of Object.entries(rig.axles)){
  const o=axles[name];o.rotation.x=state.odometer/a.heightMm;o.position.x=state.slides[name];
 }
 gear.update(state);
 for(const {key,group} of drawParts){
  const pin=state.drawbar[key+'Pin'];group.position.set(pin.x,0,pin.z);const body=state.frames[key==='engine'?'engine_rear':'tender_body'];group.rotation.y=-Math.atan2(body.sin,body.cos);group.userData.member.rotation.y=-state.drawbar.yaw+(key==='tender'?Math.PI:0)-group.rotation.y;
 }
 document.getElementById('status').textContent=`${state.speed} mm/s · ${state.odometer.toFixed(1)} mm · ${state.occupation.length} tratte`;
 scene.updateMatrixWorld(true);renderer.render(scene,camera);return state;
}
const select=document.getElementById('scenario');select.onchange=()=>setup(select.value);
for(const [id,speed] of [['forward',35],['stop',0],['reverse',-35]])document.getElementById(id).onclick=()=>lab.command(speed);
let auto=true;
function animate(time){if(disposed)return;if(auto&&previous!==null)lab.step(Math.min(.05,(time-previous)/1000));previous=time;controls.update();paint();requestAnimationFrame(animate);}
let viewScale=1;
function resize(){const h=Math.max(300,innerHeight-document.querySelector('header').offsetHeight);renderer.setSize(innerWidth,h);camera.aspect=innerWidth/h;camera.updateProjectionMatrix();const factor=Math.max(1,1.3/camera.aspect);camera.position.sub(controls.target).multiplyScalar(factor/viewScale).add(controls.target);viewScale=factor;controls.update();}
addEventListener('resize',resize);resize();
function dispose(){disposed=true;removeEventListener('resize',resize);controls.dispose();const geometries=new Set(),materials=new Set(),textures=new Set();scene.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.geometry)geometries.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());renderer.dispose();}
addEventListener('pagehide',dispose,{once:true});
// Inspect the vertices actually referenced by the rendered mesh indices, after
// the side transform. Unused BufferGeometry vertices must never affect the gate.
function measuredWheelCaps(){
 scene.updateMatrixWorld(true);const result={};
 for(const name of Object.keys(rods.wheels)){
  const root=axles[name],caps={'-1':[],'1':[]};
  root.traverse(o=>{if(!o.isMesh)return;const position=o.geometry.attributes.position;
   for(const i of new Set(o.geometry.index.array)){
    const v=new THREE.Vector3().fromBufferAttribute(position,i);
    root.worldToLocal(o.localToWorld(v));if(Math.abs(v.x)>6)caps[String(Math.sign(v.x))].push(v);
   }
  });
  result[name]=Object.fromEntries(Object.entries(caps).map(([side,points])=>{
   if(points.length<12)throw new Error('Missing rendered crankpin cap');
   return [side,{alongMm:-(Math.min(...points.map(p=>p.z))+Math.max(...points.map(p=>p.z)))/2,
    heightMm:(Math.min(...points.map(p=>p.y))+Math.max(...points.map(p=>p.y)))/2}];
  }));
 }
 return result;
}
setup('v06');
window.bigBoyLab={setup,measuredWheelCaps,gear:()=>gear.diagnostics(),gearMeshes:()=>gear.exportMeshes(),command:v=>lab.command(v),step:dt=>{lab.step(dt);return paint();},pause:()=>{auto=false;},snapshot:()=>lab.snapshot(),visual:()=>({axles:Object.fromEntries(Object.entries(axles).map(([n,o])=>[n,{angle:o.rotation.x,slide:o.position.x}])),rods:Object.values(gear.diagnostics().mechanisms).map(m=>m.points.Q.s)}),render:paint,info:()=>({calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,axles:Object.keys(axles).length,rodParts:4,gearInstances:gear.diagnostics().instances,removedSourceTriangles:mechanism.removedTriangles,sha}),dispose};
requestAnimationFrame(animate);
