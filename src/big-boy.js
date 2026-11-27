import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import rig from './big-boy/rig.json' with {type:'json'};
import rods from './big-boy/quartering.json' with {type:'json'};
import mechanism from './big-boy/mechanism.json' with {type:'json'};
import drawgear from './big-boy/drawgear.json' with {type:'json'};
import {createValveGear} from './big-boy/valve-gear-view.mjs';
import {createPoseSolver,routePolyline} from './big-boy/pose.mjs';
import {axlePlay,drawbarPose,shift} from './big-boy/kinematics.mjs';
export const BIG_BOY=Object.freeze({modelKey:'big-boy',front:128,tail:132,length:260,width:26});
let promise;
export function loadBigBoy(){
 return promise??=new GLTFLoader().loadAsync('./assets/rolling-stock/big-boy/model.glb').then(g=>g.scene).catch(e=>{promise=null;throw e;});
}
export function buildBigBoy(source,id){
 if(!source?.isObject3D)throw new TypeError('Invalid Big Boy source');
 const root=new THREE.Group(),world=new THREE.Group(),model=new THREE.Group();
 root.add(world);world.add(model);model.rotation.y=-Math.PI/2;
 const gltf={scene:source.clone(true)};
 // Own geometry per instance; source materials/textures remain immutable and shared.
 gltf.scene.traverse(o=>{if(o.isMesh){o.geometry=o.geometry.clone();o.castShadow=o.receiveShadow=true;}});
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
const gear=createValveGear(rig,rods);world.add(gear.group);
const material=new THREE.MeshStandardMaterial({color:0x818890,metalness:.65,roughness:.4});
const drawParts=[];
function meshFrom(data){const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));geometry.setIndex(data.indices);geometry.computeVertexNormals();return new THREE.Mesh(geometry,material);}
for(const key of ['engine','tender']) {
 const group=new THREE.Group();world.add(group);drawParts.push({key,group});
 const mount=meshFrom(drawgear[key+'Mount']);mount.position.y=rig.drawbarPinsMm.height;group.add(mount);
 const member=meshFrom(drawgear[key]);member.position.y=rig.drawbarPinsMm.height;group.add(member);group.userData.member=member;
}


 const solve=createPoseSolver(rig);
 function snapshot(journey,station,odometer){
  const track=routePolyline(journey),frames=solve(track,station),slides={};
  for(const [name,a] of Object.entries(rig.axles))slides[name]=axlePlay(track,station+a.sMm-(a.parent.startsWith('tender_')?rig.kinematics.tenderSetbackMm:0),frames[a.parent],a.sMm-rig.frames[a.parent].pivotMm[0],rig.kinematics.axlePlayMm[a.parent]??0).slide;
  const pin=(key,name)=>shift(frames[name],rig.drawbarPinsMm[key]-rig.frames[name].pivotMm[0]);
  return {frames,slides,odometer,drawbar:drawbarPose(pin('engine','engine_rear'),pin('tender','tender_body'),rig.kinematics.drawbar)};
 }
 root.userData={dynamic:true,trainId:id,stock:{id:'big-boy',kind:'big-boy',name:'Union Pacific Big Boy + tender',length:260,width:26,height:34},couplers:{front:{x:128,y:8,z:0},back:{x:-132,y:8,z:0}},fixedComposition:true};
 const headMaterial=new THREE.MeshStandardMaterial({color:0xffefbd,emissive:0xffd080,emissiveIntensity:0});
 const lamp=new THREE.Mesh(new THREE.CircleGeometry(.7,16),headMaterial);lamp.rotation.y=Math.PI;lamp.position.set(0,20,-(115-rig.frames.engine_front.pivotMm[0]));frames.engine_front.add(lamp);
 const beam=new THREE.SpotLight(0xffe7b7,1.6,240,.4,.55);beam.position.copy(lamp.position);beam.target.position.copy(lamp.position).add(new THREE.Vector3(0,-4,-120));beam.visible=false;frames.engine_front.add(beam,beam.target);
 root.userData.headMaterial=headMaterial;root.userData.beam=beam;
 // Conservative per-frame bounds from referenced candidate vertices, including wheels.
 const bounds={};
 for(const [name,frame] of Object.entries(frames)){
  frame.updateMatrixWorld(true);const inv=frame.matrixWorld.clone().invert(),box=new THREE.Box3();
  frame.traverse(o=>{if(!o.isMesh)return;const m=inv.clone().multiply(o.matrixWorld),p=o.geometry.attributes.position;
   for(const i of new Set(o.geometry.index.array))box.expandByPoint(new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(m));});
  const spec=rig.frames[name];bounds[name]={lo:spec.pivotMm[0]-box.max.z-1,hi:spec.pivotMm[0]-box.min.z+1,width:Math.max(Math.abs(box.min.x),Math.abs(box.max.x),name.startsWith('engine_')?11.5:0)+2.5};
 }
 root.railwayEnvelope=(journey,station)=>{
  const poses=solve(routePolyline(journey),station),points=[];
  for(const [name,b] of Object.entries(bounds))for(const s of [b.lo,b.hi])for(const lateral of [-b.width,b.width]){const p=shift(poses[name],s-rig.frames[name].pivotMm[0],lateral);points.push([p.x,p.z]);}
  return points;
 };
 root.br01Pose=(odometer,journey,station,pose)=>{
  if(!Number.isFinite(odometer))throw new RangeError('Invalid Big Boy odometer');
  const state=snapshot(journey,station,odometer);
  world.rotation.y=-pose.angle;world.position.set(-pose.x,0,-pose.z).applyAxisAngle(new THREE.Vector3(0,1,0),-pose.angle);
  for(const [name,frame] of Object.entries(rig.frames)){const p=state.frames[name],o=frames[name];o.position.set(p.z,frame.pivotMm[1],-p.x);o.rotation.set(0,-Math.atan2(p.sin,p.cos),0);}
  for(const [name,a] of Object.entries(rig.axles)){axles[name].rotation.x=odometer/a.heightMm;axles[name].position.x=state.slides[name];}
  gear.update(state);
  for(const {key,group} of drawParts){const pin=state.drawbar[key+'Pin'],body=state.frames[key==='engine'?'engine_rear':'tender_body'];group.position.set(pin.x,0,pin.z);group.rotation.y=-Math.atan2(body.sin,body.cos);group.userData.member.rotation.y=-state.drawbar.yaw+(key==='tender'?Math.PI:0)-group.rotation.y;}
  root.bigBoyState={hingeDegrees:Math.abs(Math.atan2(state.frames.engine_front.sin,state.frames.engine_front.cos)-Math.atan2(state.frames.engine_rear.sin,state.frames.engine_rear.cos))*180/Math.PI,drawbarMargin:state.drawbar.margin,gear:gear.diagnostics().mechanisms};
 };
 root.stockRig={body:root,wheels:Object.entries(axles).map(([name,node])=>({node,radius:rig.axles[name].heightMm,axis:'x'})),bogies:[],rods:[],pistons:[]};
 root.userData.disposeRollingStock=()=>{if(root.userData.disposed)return;root.userData.disposed=true;const geometries=new Set();root.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.geometry)geometries.add(o.geometry);});geometries.forEach(g=>g.dispose());material.dispose();headMaterial.dispose();beam.dispose();gear.group.children[0].material.dispose();};
 return root;
}
