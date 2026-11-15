import assert from 'node:assert/strict';
import test from 'node:test';
import {Group,Vector3} from 'three';
import {buildBR01} from '../src/br01.js';
import {BR01_GEAR,poseDrawbar} from '../src/br01-drawbar.js';
import {Journey,routing} from '../src/simulation.js';
import {createNetwork} from '../src/network.js';
import {layoutFor,vehiclePositions} from '../src/railway-state.js';
import {occupiedRanges} from '../src/next-switch.js';
import {stepRailway} from '../src/railway-step.js';
import {envelopeGap} from '../src/railway-conflicts.js';
import {projectSideLayout} from '../src/train-side-layout.js';
import manifest from '../assets/rolling-stock-sides/manifest.json' with {type:'json'};

const network=createNetwork(),route=routing(network,()=>false);
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function train(id,edge,s,dir){
 const group=buildBR01(new Group(),'engine',id),tender=buildBR01(new Group(),'tender',id);
 const t={id,group,carObjs:[tender],cars:1,dir,velocity:0,speed:100,requestedSpeed:100,odometer:0,journey:new Journey(network,edge,s)};
 assert.ok(t.journey.ensure(s-layoutFor(t).tail,route));return t;
}
test('BR 01 uses the mounted pitch while both protected rectangles cover the gap',()=>{
 const t=train(0,'T47',180,1),vehicles=[t.group,...t.carObjs],layout=layoutFor(t);
 near(layout.offsets[1],BR01_GEAR.pitch);
 const ends=vehicles.map((g,i)=>{
   const d=g.userData,offset=layout.offsets[i],ranges=occupiedRanges(network,t.journey,offset,d.couplers);
   const a=t.journey.position-offset+d.couplers.back.x,b=t.journey.position-offset+d.couplers.front.x;
   assert.equal(ranges.length,1);near(ranges[0].min,a);near(ranges[0].max,b);return [a,b];
 });
 assert.ok(ends[0][0]<ends[1][1]);assert.ok(Math.abs(ends[0][1]-ends[1][0]-(149.625+BR01_GEAR.extra))<.00001);
 const project={vehicles:['engine','tender'].map(kind=>({id:kind,modelId:'native-br01-'+kind,orientation:1}))};
 near(projectSideLayout(project,manifest).length,ends[0][1]-ends[1][0]);
 for(const [i,kind] of ['engine','tender'].entries())assert.deepEqual(manifest['native-br01-'+kind].couplers,vehicles[i].userData.couplers);
 t.group.userData.stock.tenderPitch=NaN;assert.throws(()=>layoutFor(t),/Invalid drawbar pitch/);
});
test('fixed members stay on their respective pins and stow on release',()=>{
 const t=train(0,'T47',200,1),engine=t.group,tender=t.carObjs[0];tender.position.x=-BR01_GEAR.pitch;
 poseDrawbar(engine,tender);
 for(const g of [engine,tender]){
   const eye=g.getObjectByName('drawgear eye'),pin=g.getObjectByName('drawgear pivot');
   near(eye.getWorldPosition(new Vector3()).distanceTo(pin.getWorldPosition(new Vector3())),0);
   assert.deepEqual(g.br01Gear.member.scale.toArray(),[1,1,1]);
 }
 poseDrawbar(engine,null);assert.equal(engine.br01Gear.member.visible,true);near(engine.br01Gear.member.rotation.y,Math.PI);
});
test('BR 01 opposing trains stop before physical envelopes touch and rejected steps retain distance',()=>{
 const a=train(0,'T47',230,1),b=train(1,'T46',245,-1),context={trains:[a,b],detached:[],route};
 let stopped=false,minimum=Infinity;
 for(let i=0;i<600;i++){
   stepRailway(context,1/60);
   for(const p of vehiclePositions(a))for(const q of vehiclePositions(b))minimum=Math.min(minimum,envelopeGap(p,q));
   if(!a.velocity&&!b.velocity&&a.guard?.reason==='train'){stopped=true;break;}
 }
 assert.ok(minimum>=0,`Penetration ${minimum}`);assert.ok(a.odometer>0&&b.odometer<0);
 assert.ok(stopped,JSON.stringify([a.guard,b.guard]));
 const before=[a.odometer,b.odometer];stepRailway(context,1/60);assert.deepEqual([a.odometer,b.odometer],before);
});
