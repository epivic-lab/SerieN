// Offline reproduction of the B ribbon poses, with the same BR 01 mesh and
// articulation code used by the browser. No texture or GPU is needed here.
import fs from 'node:fs';
import * as T from 'three';
import {createScenarioProfile} from '../src/scenario-profile.js';
import {Journey,routing} from '../src/simulation.js';
import {BR01_GEAR,poseDrawbar} from '../src/br01-drawbar.js';
import {drawbarMeasure} from './br01-drawbar-probe.js';
import {buildBR01} from '../src/br01.js';
import {bodyContact,meshDistance} from './br01-intersection.js';
const read=p=>JSON.parse(fs.readFileSync(p));
const folder='docs/_active/br01/evidence/';
const raw=fs.readFileSync('assets/br01/locomotive.glb'),n=raw.readUInt32LE(12),gltf=JSON.parse(raw.subarray(20,20+n));
function array(i){
  const a=gltf.accessors[i],v=gltf.bufferViews[a.bufferView];
  const C={5123:Uint16Array,5125:Uint32Array,5126:Float32Array}[a.componentType];
  return new C(raw.buffer,raw.byteOffset+28+n+v.byteOffset+(a.byteOffset||0),a.count*(a.type==='VEC3'?3:1));
}
const source=new T.Group();
for(const node of gltf.nodes){
 const p=gltf.meshes[node.mesh].primitives[0],g=new T.BufferGeometry();
 g.setAttribute('position',new T.BufferAttribute(array(p.attributes.POSITION),3));g.setIndex(new T.BufferAttribute(array(p.indices),1));
 const m=new T.Mesh(g);m.name=node.name;m.userData=node.extras;source.add(m);
}
const groups=['engine','tender'].map(kind=>buildBR01(source,kind,0));
const legacy=process.argv.includes('--legacy');
const profile=legacy?createScenarioProfile('legacy'):createScenarioProfile('v06',read('assets/scenario-v06/dataset.json'));
const {network}=profile,ids=profile.registry.ids;
const b=read(folder+'BR01-B/samples.json').samples;
const configs=routingMask=>routing(network,id=>Boolean(routingMask&(1<<ids.indexOf(id))));
const cases=[];
for(const edge of Object.values(network.edges)){
 const parent=b.find(x=>x.edge===edge.id);
 const steps=Math.ceil(edge.length/2),coarse=Math.ceil(edge.length/4);
 for(const f of new Set([...Array.from({length:9},(_,i)=>i/8),...Array.from({length:coarse+1},(_,i)=>i/coarse),...Array.from({length:steps+1},(_,i)=>i/steps)])){
  for(const heading of [1,-1]){
  const s=(heading===1?f:1-f)*edge.length;
  const histories=new Set();
  for(let mask=0;mask<(1<<ids.length);mask++){
    const j=new Journey(network,edge.id,f*edge.length),route=configs(mask);j.segments[0].sign=heading;j.position=s;
    if(edge.switchId&&route.controlState(edge.switchId)!==edge.requiredState)continue;
    if(!j.ensure(s-105,route)||!j.ensure(s+49,route))continue;
    const key=j.segments.map(p=>p.id+'/'+p.sign).join(',');
    if(histories.has(key))continue;histories.add(key);
    cases.push({edge:edge.id,f,j,s,heading,mask,type:parent?.type||edge.role});
    if(j.segments.length===1)break;
  }
 }
 }
}
function pose(c,extra){
 groups.forEach((g,i)=>{
  const at=c.s-i*(149.625/2+extra),p=c.j.locate(at);
  g.position.set(p.x,8.4,p.z);g.rotation.y=p.angle;g.br01Pose(c.s,c.j,at,p);
 });
}
function contact(c,extra){pose(c,extra);return bodyContact(groups);}
let lower=0,upper=0,witness=null;
for(const c of cases){
 if(!contact(c,upper))continue;
 let lo=upper,hi=lo+1;
 while(contact(c,hi)){lo=hi;hi++;}
 while(hi-lo>.005){const mid=(hi+lo)/2;if(contact(c,mid))lo=mid;else hi=mid;}
 lower=lo;upper=hi;witness={edge:c.edge,fraction:c.f,heading:c.heading,mask:c.mask,hit:contact(c,lo)};
}
// Solve the least pitch admitting a telescopic male and female member.
// At full compression both must clear the opposite pin or the rear stop
// by 0.05 mm. At extension the captive shoe must clear the keeper by 0.05.
function pinRange(extra){
 let min=Infinity,max=-Infinity;
 for(const c of cases){
   const e=c.j.locate(c.s),t=c.j.locate(c.s-149.625/2-extra);
   const x=e.x+Math.cos(e.angle)*BR01_GEAR.enginePin-t.x-Math.cos(t.angle)*BR01_GEAR.tenderPin;
   const z=e.z-Math.sin(e.angle)*BR01_GEAR.enginePin-t.z+Math.sin(t.angle)*BR01_GEAR.tenderPin;
   const d=Math.hypot(x,z);min=Math.min(min,d);max=Math.max(max,d);
 }
 return {min,max,capacity:2*min-.55-.54-max-.40};
}
let gapLow=upper,gapHigh=4;
for(let i=0;i<14;i++){const mid=(gapLow+gapHigh)/2;if(pinRange(mid).capacity<0)gapLow=mid;else gapHigh=mid;}
const extra=BR01_GEAR.extra,pins=pinRange(extra),hits={},maxZ=[0,0];
let weakest=null,maxSlide=-Infinity,minOverlap=Infinity,maxOverlap=0,maxEyeError=0,maxAxisError=0;
const tmp=new T.Vector3(),inv=new T.Matrix4(),mat=new T.Matrix4();
function lateral(g,i){
 g.updateMatrixWorld(true);inv.copy(g.matrixWorld).invert();
 g.traverse(m=>{
   if(!m.isMesh||!m.visible)return;
   if(!m.geometry.boundingBox)m.geometry.computeBoundingBox();
   mat.multiplyMatrices(inv,m.matrixWorld);const bb=m.geometry.boundingBox.clone().applyMatrix4(mat);
   if(Math.max(bb.max.z,-bb.min.z)<maxZ[i])return;
   const pos=m.geometry.attributes.position;
   for(let n=0;n<pos.count;n++){tmp.fromBufferAttribute(pos,n).applyMatrix4(mat);maxZ[i]=Math.max(maxZ[i],Math.abs(tmp.z));}
 });
}
for(const c of cases){
 pose(c,extra);poseDrawbar(...groups);
 const q=drawbarMeasure(groups);groups.forEach(lateral);
 for(const k of ['bodyHit','plateHit','carriageHit','runningGearHit','oppositeMountHit'])if(q[k])hits[k]??={edge:c.edge,f:c.f,hit:q[k]};
 if(!q.insideStops)hits.stop??={edge:c.edge,f:c.f,overlap:q.overlap};
 if(q.slide>maxSlide){weakest={edge:c.edge,f:c.f,heading:c.heading,mask:c.mask};maxSlide=q.slide;}
 minOverlap=Math.min(minOverlap,q.overlap);maxOverlap=Math.max(maxOverlap,q.overlap);
 maxEyeError=Math.max(maxEyeError,...q.eyeErrors);maxAxisError=Math.max(maxAxisError,q.axisError);
}
const result={distinctPathPoses:cases.length,triangleContactAtMm:lower,firstClearMm:upper,witness,
 minimumGearExtraMm:[gapLow,gapHigh],extra,pins,minOverlap,maxOverlap,maxEyeError,maxAxisError,maxZ,weakest,hits};
const cab=groups[0].getObjectByName('engine_haus'),tank=groups[1].getObjectByName('tender_kohletender');
function straight(clearance){
 const ribbon={locate:x=>({x,z:0,angle:0})};
 pose({s:0,j:ribbon},clearance);return meshDistance(cab,tank);
}
result.straightCabTenderMm={before:straight(0),after:straight(extra)};
console.log(JSON.stringify(result));fs.writeFileSync(folder+(legacy?'BR01-C/sizing-legacy.json':'BR01-C/sizing.json'),JSON.stringify(result,null,2)+'\n');
if(Object.keys(hits).length)process.exitCode=1;
