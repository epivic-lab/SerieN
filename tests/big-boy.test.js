import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {buildBigBoy} from '../src/big-boy.js';
import {Journey} from '../src/simulation.js';
import {vehiclePose,layoutFor} from '../src/railway-state.js';
import {vehiclesConflict} from '../src/railway-conflicts.js';
import {createFleetCommands} from '../src/fleet-commands.js';
async function source(){
 const bytes=readFileSync(new URL('../assets/rolling-stock/big-boy/model.glb',import.meta.url)),n=bytes.readUInt32LE(12),doc=JSON.parse(bytes.toString('utf8',20,20+n));
 // Geometry acceptance independent of browser image decoding; triangles unchanged.
 delete doc.images;delete doc.textures;delete doc.materials;
 for(const m of doc.meshes)for(const p of m.primitives)delete p.material;
 const j=Buffer.from(JSON.stringify(doc)),padding=(4-j.length%4)%4,json=Buffer.concat([j,Buffer.alloc(padding,32)]),bin=bytes.subarray(20+n),out=Buffer.alloc(20+json.length+bin.length);
 out.write('glTF');out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);out.writeUInt32LE(json.length,12);out.write('JSON',16);json.copy(out,20);bin.copy(out,20+json.length);
 return (await new GLTFLoader().parseAsync(out.buffer.slice(out.byteOffset,out.byteOffset+out.length),'')).scene;
}
const original=await source();
const journey=()=>new Journey({edges:{line:{id:'line',length:1000,points:[{x:-500,z:0},{x:500,z:0}],distance:[0,1000]}}},'line',500);
test('actual Big Boy has 19 animated axles, closes linkage and releases instance geometry',()=>{
 const group=buildBigBoy(original,5),j=journey(),train={group,carObjs:[]};
 assert.equal(layoutFor(train).tail+group.userData.couplers.front.x,260);assert.equal(group.stockRig.wheels.length,19);
 group.br01Pose(0,j,500,j.locate());const before=JSON.stringify(group.bigBoyState.gear);
 group.br01Pose(12,j,500,j.locate());assert.notEqual(JSON.stringify(group.bigBoyState.gear),before);
 for(const m of Object.values(group.bigBoyState.gear))assert.ok(m.residual<1e-8);
 assert.ok(group.bigBoyState.drawbarMargin>0);
 let disposed=0;group.traverse(o=>o.geometry?.addEventListener('dispose',()=>disposed++));group.userData.disposeRollingStock();assert.ok(disposed>19);
 const count=disposed;group.userData.disposeRollingStock();assert.equal(disposed,count);
});
test('articulated envelope participates in conflicts at the tender and locomotive',()=>{
 const group=buildBigBoy(original,1),j=journey(),p={...vehiclePose(j,500,group),vehicle:group};assert.ok(p.envelope.length>=28);
 const wagon={userData:{stock:{width:20},couplers:{front:{x:10},back:{x:-10}}}};
 for(const x of [-100,100])assert.equal(vehiclesConflict(p,{x,z:0,angle:0,edge:'other',s:0,vehicle:wagon}),true);
 assert.equal(vehiclesConflict(p,{x:0,z:100,angle:0,edge:'other',s:0,vehicle:wagon}),false);group.userData.disposeRollingStock();
});
test('fixed tender cannot be detached and external coupling does not mutate fleet',()=>{
 const group=buildBigBoy(original,1),train={id:1,group,carObjs:[],cars:0,speed:0,velocity:0,journey:journey()},detached=[];
 const commands=createFleetCommands({trains:[train],detached,route:()=>null});
 assert.equal(commands.uncouple(1).changed,false);assert.equal(commands.couple(1).changed,false);
 assert.equal(train.carObjs.length,0);assert.equal(detached.length,0);group.userData.disposeRollingStock();
});
test('articulated envelope contains rendered mesh vertices on R249 both ways',()=>{
 const group=buildBigBoy(original,1);
 const hull=points=>{const p=points.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]),cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);const half=a=>{const h=[];for(const q of a){while(h.length>1&&cross(h.at(-2),h.at(-1),q)<=0)h.pop();h.push(q);}return h;};return [...half(p).slice(0,-1),...half(p.reverse()).slice(0,-1)];};
 for(const sign of [-1,1]){
  const points=Array.from({length:401},(_,i)=>{const s=(i-200)*2;return {x:249*Math.sin(s/249),z:sign*249*(1-Math.cos(s/249))};}),distance=[0];
  for(let i=1;i<points.length;i++)distance.push(distance.at(-1)+Math.hypot(points[i].x-points[i-1].x,points[i].z-points[i-1].z));
  const j=new Journey({edges:{arc:{id:'arc',length:distance.at(-1),points,distance}}},'arc',distance[200]);
  const pose=vehiclePose(j,j.position,group),polygon=hull(pose.envelope);group.position.set(pose.x,0,pose.z);group.rotation.y=pose.angle;
  for(const odometer of [0,8.6,17.2,25.8]){
   group.br01Pose(odometer,j,j.position,pose);group.updateMatrixWorld(true);
   const v=new THREE.Vector3(),m=new THREE.Matrix4();
   group.traverse(o=>{if(!o.isMesh)return;const indices=new Set(o.geometry.index.array);for(let instance=0;instance<(o.isInstancedMesh?o.count:1);instance++){
    if(o.isInstancedMesh){o.getMatrixAt(instance,m);m.premultiply(o.matrixWorld);}else m.copy(o.matrixWorld);
    for(const index of indices){v.fromBufferAttribute(o.geometry.attributes.position,index).applyMatrix4(m);for(let k=0;k<polygon.length;k++){const a=polygon[k],b=polygon[(k+1)%polygon.length];assert.ok((b[0]-a[0])*(v.z-a[1])-(b[1]-a[1])*(v.x-a[0])>=-1e-4,'rendered part outside protection envelope');}}
   }});
  }
 }
 group.userData.disposeRollingStock();
});
test('real Big Boy envelope stops a head-on train before penetration',async()=>{
 const {createNetwork}=await import('../src/network.js'),{routing}=await import('../src/simulation.js'),{stepRailway}=await import('../src/railway-step.js'),{vehiclePositions}=await import('../src/railway-state.js'),{envelopeGap}=await import('../src/railway-conflicts.js');
 const n=createNetwork(),route=routing(n,()=>false),group=buildBigBoy(original,0);
 const a={id:0,name:'Big Boy',group,carObjs:[],cars:0,journey:new Journey(n,'T47',150),velocity:0,speed:40,dir:1,odometer:0};
 const b={id:1,name:'Other',group:{userData:{stock:{width:20},couplers:{front:{x:34},back:{x:-34}}}},carObjs:[],cars:0,journey:new Journey(n,'T46',110),velocity:0,speed:40,dir:-1,odometer:0};
 for(const t of [a,b])assert.ok(t.journey.reconcile(layoutFor(t).tail,t.group.userData.couplers.front.x,route));
 const gap=()=>envelopeGap(vehiclePositions(a)[0],vehiclePositions(b)[0]);assert.ok(gap()>0);
 let stopped=false;
 for(let i=0;i<480;i++){stepRailway({trains:[a,b],detached:[],route},1/60);assert.ok(gap()>=-1e-6,'head-on penetration');if(a.speed===0&&b.speed===0){stopped=true;break;}}
 assert.ok(stopped,'both trains stop');group.userData.disposeRollingStock();
});
