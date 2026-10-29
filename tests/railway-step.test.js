import test from 'node:test';
import assert from 'node:assert/strict';
import {createNetwork,loopPosition} from '../src/network.js';
import {Journey,routing,FixedClock} from '../src/simulation.js';
import {stepRailway} from '../src/railway-step.js';
import {vehiclePositions,layoutFor,deriveSwitchAssistance} from '../src/railway-state.js';
import {envelopeGap,sweptVehiclesConflict,vehiclesConflict} from '../src/railway-conflicts.js';
import {createFleetCommands} from '../src/fleet-commands.js';
import {createSwitchTopology,traceJourney,occupiedRanges} from '../src/next-switch.js';
const n=createNetwork(),route=routing(n,()=>false),topology=createSwitchTopology(n,n.controllers);
const vehicle=(front=32.65,rear=32.65)=>({userData:{stock:{length:front+rear,width:19.4},couplers:{front:{x:front+1.6},back:{x:-rear-1.6}}}});
function train(id,edge,s,dir=1,cars=0){
 const t={id,name:'fixture '+id,group:vehicle(),carObjs:Array.from({length:cars},()=>vehicle(30,30)),cars,journey:new Journey(n,edge,s),velocity:0,speed:0,dir,odometer:0};
 assert.ok(t.journey.ensure(t.journey.position-layoutFor(t).tail,route));return t;
}
const minGap=(a,b)=>Math.min(...vehiclePositions(a).flatMap(p=>vehiclePositions(b).map(q=>envelopeGap(p,q))));
function run(context,count=240){let stopped=false,min=Infinity;for(let i=0;i<count;i++){
 stepRailway(context,1/60);for(let a=0;a<context.trains.length;a++)for(let b=a+1;b<context.trains.length;b++){
 const gap=minGap(context.trains[a],context.trains[b]);min=Math.min(min,gap);assert.ok(gap>=-1e-7,`overlap ${gap} at ${i}`);
 }
 stopped ||= context.trains.every(t=>t.velocity===0&&t.speed===0);
 }return {stopped,min};}

test('A1: native front-on reproduction stops before any adjacent-edge envelope overlap, preserving rejected history and identity',()=>{
 const a=train(0,'T47',200),b=train(1,'T46',110,-1);a.group=vehicle(48,66.3);a.speed=b.speed=100;
 const context={trains:[a,b],detached:[],route};const journey=a.journey,segments=journey.segments,groups=[a.group,b.group];
 assert.ok(minGap(a,b)>0);const result=run(context);assert.ok(result.stopped);assert.ok(result.min>=0);
 const history=t=>({position:t.journey.position,travel:t.journey.travel,segments:t.journey.segments});
 const before=structuredClone(context.trains.map(history));a.speed=b.speed=100;a.velocity=100;b.velocity=-100;stepRailway(context,1/60);
 assert.deepEqual(context.trains.map(history),before);assert.equal(a.journey,journey);assert.equal(a.journey.segments,segments);assert.deepEqual([a.group,b.group],groups);
});
test('frontals and following conflicts include short/long consists, stationary trains and both approach directions',()=>{
 for(const cars of [0,3])for(const direction of [-1,1])for(const following of [false,true]){
  // Two trains on the long yard straight; place the leading locomotive beyond
  // the trailing consist, retaining the same route through the next joint.
  const a=train(0,direction===1?'T47':'T46',direction===1?230:245,direction,cars),b=train(1,direction===1?'T46':'T47',direction===1?245:230,following?direction:-direction,cars);
  a.speed=100;b.speed=following?15:100;
  assert.ok(minGap(a,b)>0,JSON.stringify({cars,direction,following,gap:minGap(a,b),a:vehiclePositions(a).map(p=>[p.edge,p.s]),b:vehiclePositions(b).map(p=>[p.edge,p.s])}));
  const result=run({trains:[a,b],detached:[],route},600);assert.ok(result.stopped||a.speed===0||b.speed===0);
 }
 const a=train(0,'T47',200),b=train(1,'T46',110);a.speed=100;
 assert.ok(run({trains:[a,b],detached:[],route}).stopped);
});
test('candidate rollback cascades to followers and is independent of fleet iteration order',()=>{
 const outcomes=[];
 for(const reverse of [false,true]){
  const trains=[train(0,'T47',150),train(1,'T46',20),train(2,'T46',130)];trains[0].speed=trains[1].speed=100;
  if(reverse)trains.reverse();run({trains,detached:[],route},600);
  outcomes.push(trains.sort((a,b)=>a.id-b.id).map(t=>({position:t.journey.position,travel:t.journey.travel,speed:t.speed,velocity:t.velocity})));
 }assert.deepEqual(...outcomes);
});
test('swept envelopes detect a crossing between separated endpoints; parallel movement stays clear',()=>{
 const p={x:-20,z:0,angle:0,edge:'a',s:0,vehicle:vehicle(1,1)},q={x:0,z:-20,angle:Math.PI/2,edge:'b',s:0,vehicle:vehicle(1,1)};
 const afterP={...p,x:20},afterQ={...q,z:20};
 assert.equal(vehiclesConflict(p,q),false);assert.equal(vehiclesConflict(afterP,afterQ),false);
 assert.equal(sweptVehiclesConflict([p,afterP],[q,afterQ]),true);
 assert.equal(sweptVehiclesConflict([p,afterP],[{...p,z:33},{...afterP,z:33}]),false);
});
test('three canonical loops allow simultaneous mixed directions and complete laps with no false parallel stop',()=>{
 const trains=[0,1,2].map((id)=>{const p=loopPosition(n,id,.17);const t=train(id,p.edge,p.s,id===1?-1:1,2);t.speed=70;return t;});
 run({trains,detached:[],route},2400);
 for(const t of trains){assert.equal(t.speed,70);assert.ok(t.journey.travel>3500);}
});
test('detached wagons stop approach without penetration, permit departure and recouple without lost identities in curves',()=>{
 for(const edge of ['T0','T12','T16']){
  const t=train(0,edge,120,1,2),detached=[],context={trains:[t],detached,route},commands=createFleetCommands(context),last=t.carObjs.at(-1);
  assert.equal(commands.uncouple(0).changed,true);const point={...detached[0].point};
  t.speed=35;for(let i=0;i<120;i++)stepRailway(context,1/60);assert.ok(t.journey.travel>50,'departure possible');commands.stop(0);commands.reverse(0);t.speed=35;
  for(let i=0;i<240;i++){stepRailway(context,1/60);for(const p of vehiclePositions(t))assert.ok(envelopeGap(p,{...point,vehicle:last})>=-1e-6,'parked body penetrated');if(!t.speed)break;}
  commands.stop(0);assert.equal(commands.couple(0).changed,true,edge+' curve recouples');assert.equal(t.carObjs.at(-1),last);assert.equal(detached.length,0);assert.equal(new Set([t.group,...t.carObjs]).size,3);
 }
});
test('full fleet, occupation, direction and HUD routes agree at 20/60/120 Hz and irregular frames',()=>{
 const frames=[Array(240).fill(1/20),Array(720).fill(1/60),Array(1440).fill(1/120),Array.from({length:120},()=>[1/120,1/40,1/15]).flat()];
 const results=frames.map(intervals=>{
  const trains=[train(0,'T47',200),train(1,'T46',110,-1),train(2,'T0',200,-1,2)];trains.forEach(t=>t.speed=70);
  const context={trains,detached:[],route},clock=new FixedClock();for(const dt of intervals)clock.update(dt,step=>stepRailway(context,step));
  const assistance=deriveSwitchAssistance({...context,network:n,switchTopology:topology,selected:2,switchSpecs:n.controllers});
  return {trains:trains.map(t=>({position:t.journey.position,travel:t.journey.travel,velocity:t.velocity,speed:t.speed,odometer:t.odometer,vehicles:vehiclePositions(t).map(({x,z,edge,s})=>({x,z,edge,s}))})),hud:{next:assistance.preview.next?.site.id,distance:assistance.preview.next?.distance,safety:assistance.safety}};
 });for(const r of results.slice(1))assert.deepEqual(r,results[0]);
});

test('all four terminal envelopes stop and reverse short and five-wagon consists with legal route history',()=>{
 const terminalEdges=Object.values(n.edges).filter(e=>e.terminal);assert.equal(terminalEdges.length,4);
 for(const edge of terminalEdges)for(const cars of [0,5]){
  const direction=n.metadata.nodes[edge.to].terminal?1:-1;let context;
  for(let mask=0;mask<256&&!context;mask++){
   const candidateRoute=routing(n,id=>Boolean(mask&(1<<n.controllers.findIndex(c=>c.id===id))));
   const t=train(0,edge.id,direction===1?Math.max(1,edge.length-45):45,direction,0);
   t.carObjs=Array.from({length:cars},()=>vehicle(30,30));t.cars=cars;
   if(direction===-1)t.journey.position=layoutFor(t).tail+45;
   if(t.journey.ensure(t.journey.position-layoutFor(t).tail,candidateRoute)&&t.journey.ensure(t.journey.position+34.25,candidateRoute))context={trains:[t],detached:[],route:candidateRoute};
  }
  assert.ok(context,edge.id+' full consist fits a real route');const t=context.trains[0];t.speed=50;
  for(let i=0;i<600&&t.speed;i++)stepRailway(context,1/60);
  assert.equal(t.velocity,0);assert.equal(t.speed,0);assert.equal(t.journey.lastBlock.reason,'terminal');
  const layout=layoutFor(t),leading=t.journey.locate(t.journey.position-(direction<0?layout.offsets.at(-1):0));
  assert.equal(leading.edge,edge.id);assert.ok(direction>0?edge.length-leading.s>=34.25-1e-6:leading.s>=31.6-1e-6);
  const stopped=t.journey.position,travel=t.journey.travel;t.dir=-direction;t.speed=40;
  for(let i=0;i<120;i++)stepRailway(context,1/60);
  assert.ok((t.journey.position-stopped)*direction<0,'reverse leaves buffer');assert.ok(t.journey.travel>travel+20);
 }
});

test('only the detached coach body across a joint protects TO4 after the locomotive clears',()=>{
 const localRoute=routing(n,id=>id==='Y-4');
 const t=train(0,'T47',110);t.group=vehicle(19.3,19.3);t.carObjs=[vehicle(82.5,82.5)];t.cars=1;
 assert.ok(t.journey.ensure(-150,localRoute));
 const detached=[],commands=createFleetCommands({trains:[t],detached,route:localRoute});commands.uncouple(0);
 assert.ok(Math.abs(detached[0].point.s-5)<1e-8);
 t.journey=new Journey(n,'T47',200);
 const assistance=deriveSwitchAssistance({network:n,switchTopology:topology,trains:[t],detached,route:localRoute,selected:0,switchSpecs:n.controllers});
 assert.equal(assistance.safetyByControl.get('Y-4').kind,'occupied');
 const clear=deriveSwitchAssistance({network:n,switchTopology:topology,trains:[t],detached:[],route:localRoute,selected:0,switchSpecs:n.controllers});
 assert.equal(clear.safetyByControl.get('Y-4').blocked,false);
});

test('two trains requesting each WX diamond are stopped before overlap, while its straight parallel routes remain independent',()=>{
 for(const id of ['WX-A','WX-B'])for(const crossing of [false,true]){
  const localRoute=routing(n,control=>control===id&&crossing);
  const trains=(crossing?['down','up']:['upper','lower']).map((branch,i)=>{
   const t=train(i,'T0',100);t.journey=new Journey(n,id+':'+branch,20);assert.ok(t.journey.ensure(20-layoutFor(t).tail,localRoute));t.speed=50;return t;
  });
  assert.ok(minGap(...trains)>0,JSON.stringify({id,crossing,gap:minGap(...trains),points:trains.map(t=>t.journey.locate())}));const r=run({trains,detached:[],route:localRoute},180);
  if(crossing){assert.ok(r.stopped);assert.ok(trains.every(t=>t.journey.travel<100));}
  else assert.ok(trains.every(t=>t.journey.travel>150&&t.speed===50));
 }
});

test('adjacent-edge parked coach can overlap the insertion point despite passing the historical centre-only guard',()=>{
 const localRoute=routing(n,id=>id==='Y-4'),coach=vehicle(82.5,82.5),j=new Journey(n,'T47',100);assert.ok(j.ensure(-100,localRoute));
 const point=j.locate(-5),insertion={...new Journey(n,'T47',80).locate(),vehicle:{userData:{}}};
 assert.equal(point.edge,'TO4:AC');assert.equal(point.edge==='T47'&&Math.abs(point.s-80)<120,false);
 assert.equal(vehiclesConflict(insertion,{...point,vehicle:coach}),true);
});
test('elapsed-time cap and invalid step inputs have explicit, atomic semantics',()=>{
 const simulate=elapsed=>{const t=train(0,'T0',100),clock=new FixedClock();t.speed=50;clock.update(elapsed,dt=>stepRailway({trains:[t],detached:[],route},dt));return {position:t.journey.position,travel:t.journey.travel,velocity:t.velocity};};
 assert.deepEqual(simulate(.5),simulate(.2));
 const t=train(0,'T0',100),before={position:t.journey.position,travel:t.journey.travel,velocity:t.velocity};
 for(const dt of [NaN,Infinity,-1,0,.2])assert.throws(()=>stepRailway({trains:[t],detached:[],route},dt),RangeError);
 assert.deepEqual({position:t.journey.position,travel:t.journey.travel,velocity:t.velocity},before);
});


test('growth of a frozen detached body cannot claim an old branch after a legal turnout change',()=>{
 const aligned=routing(n,id=>id==='Y-4'),j=new Journey(n,'T47',5);assert.ok(j.ensure(-9,aligned));assert.ok(j.move(75,14,aligned,14));
 const compact={front:{x:14},back:{x:-14}},native={front:{x:84.1},back:{x:-84.1}};
 assert.ok(occupiedRanges(n,j,0,compact).every(r=>r.edge==='T47'));
 assert.ok(occupiedRanges(n,j,0,native).some(r=>r.edge==='TO4:AC'));
 const before=JSON.stringify(j.segments),preview=traceJourney(n,topology,j,-1,0,route,84.1);
 assert.equal(preview.stop,'misaligned');assert.equal(preview.distance,80);assert.equal(JSON.stringify(j.segments),before);
 assert.equal(traceJourney(n,topology,j,-1,0,aligned,84.1).stop,'limit');
});
