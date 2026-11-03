import test from 'node:test';import assert from 'node:assert/strict';
import {sweptVehiclesConflict}from'../src/railway-conflicts.js';import{stepRailway}from'../src/railway-step.js';
import{sweptVehiclesConflict as referenceSweep}from'./fixtures/conflicts-5c.js';import{stepRailway as referenceStep}from'./fixtures/railway-step-5c.js';
import{createNetwork,loopPosition}from'../src/network.js';import{Journey,routing}from'../src/simulation.js';import{layoutFor}from'../src/railway-state.js';
let seed=481;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const vehicle=(length=65,width=20)=>({userData:{stock:{length,width},couplers:{front:{x:length/2+1.6},back:{x:-length/2-1.6}}}});
test('prepared broad phase agrees with the frozen 5C SAT for rotations, corners, contact, crossing and separated envelopes',()=>{
 for(let i=0;i<1600;i++){
  const p={x:rand()*200,z:rand()*200,angle:rand()*Math.PI*2,vehicle:vehicle(5+rand()*165,1+rand()*22)},q={x:p.x+(rand()-.5)*250,z:p.z+(rand()-.5)*250,angle:rand()*Math.PI*2,vehicle:vehicle(5+rand()*165,1+rand()*22)};
  const move=p=>[p,{...p,x:p.x+(rand()-.5)*8,z:p.z+(rand()-.5)*8,angle:p.angle+(rand()-.5)*.2},{...p,x:p.x+(rand()-.5)*8,z:p.z+(rand()-.5)*8,angle:p.angle+(rand()-.5)*.2}];
  const a=move(p),b=move(q);assert.equal(sweptVehiclesConflict(a,b),referenceSweep(a,b),'case '+i);
 }
 for(const angle of [0,Math.PI/4,Math.PI/2])for(const offset of [-1e-8,0,1e-8,.0001]){
  const p={x:0,z:0,angle,vehicle:vehicle(65)},q={...p,x:68.2*Math.cos(angle)+offset,z:-68.2*Math.sin(angle),vehicle:vehicle(65)};
  assert.equal(sweptVehiclesConflict([p],[q]),referenceSweep([p],[q]));
 }
});
test('prepared per-step geometry preserves 5C fleet trajectories, atomic rollback and commands',()=>{
 const network=createNetwork(),route=routing(network,()=>false);
 function fixture(scenario){return Array.from({length:4},(_,id)=>{
  const p=loopPosition(network,[2,1,0,2][id],[.22,.65,.45,.72][id]),j=new Journey(network,p.edge,p.s);
  if(p.sign<0){j.segments[0].sign=-1;j.position=network.edges[p.edge].length-p.s;}
  const t={id,group:vehicle(),carObjs:Array.from({length:scenario===7?5:scenario%4},()=>vehicle()),journey:j,speed:id%2?35:65,velocity:0,dir:id%2?-1:1,odometer:0};j.ensure(j.position-layoutFor(t).tail,route);return t;
 });}
 const read=trains=>trains.map(t=>({position:t.journey.position,travel:t.journey.travel,segments:t.journey.segments,velocity:t.velocity,speed:t.speed,odometer:t.odometer,lastBlock:t.journey.lastBlock}));
 for(let scenario=0;scenario<8;scenario++){
  const a=fixture(scenario),b=fixture(scenario);
  if(scenario>=4&&scenario<=6)for(const trains of [a,b]){
   for(const [id,edge,s,dir,speed] of [[0,'T47',200,scenario===6?-1:1,100],[3,'T46',110,scenario===4?-1:1,scenario===4?100:15]]){
    Object.assign(trains[id],{journey:new Journey(network,edge,s),carObjs:[],dir,speed});
   }
  }
  const detached=scenario===6?[{point:new Journey(network,'T47',100).locate(),group:vehicle()}]:[];
  for(let i=0;i<(scenario>=4?200:80);i++){
   stepRailway({trains:a,detached,route},1/60);referenceStep({trains:b,detached,route},1/60);assert.deepEqual(read(a),read(b));
  }
 }
});

test('broad bounds retain the 5C corner contact within its SAT tolerance',()=>{
 const angle=Math.PI/4,v=vehicle(6.8,10),a=[{x:0,z:0,angle,vehicle:v}],b=[{...a[0],x:10*Math.sqrt(2)+1.2e-8}];
 assert.equal(referenceSweep(a,b),true);assert.equal(sweptVehiclesConflict(a,b),true);
});
