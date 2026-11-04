import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {createNetwork,loopPosition} from '../src/network.js';
import {Journey,routing,FixedClock} from '../src/simulation.js';
import {stepRailway} from '../src/railway-step.js';
import {stepRailway as beforeGuard} from './fixtures/railway-step-5c.js';
import {vehiclePositions} from '../src/railway-state.js';
import {vehiclesConflict} from '../src/railway-conflicts.js';
import {assessRailwayGuard,guardDecision} from '../src/railway-guard.js';
import {layoutFor,deriveSwitchAssistance} from '../src/railway-state.js';
import {createSwitchTopology} from '../src/next-switch.js';
import {createTurnoutCommands} from '../src/turnout-commands.js';
import {createFleetCommands} from '../src/fleet-commands.js';
const n=createNetwork(),rows=[];
const body=(extent=1)=>({userData:{stock:{length:extent*2,width:1},couplers:{front:{x:extent},back:{x:-extent}}}});
const make=(edge,s,dir=1,extent=1)=>({id:0,group:body(extent),carObjs:[],cars:0,journey:new Journey(n,edge,s),speed:20,velocity:30*dir,dir,odometer:0});
const simple={false:{A:['B','AB'],B:['A','AB'],C:null},true:{A:['C','AC'],B:null,C:['A','AC']}};
const cross={false:{UL:['UR','upper'],UR:['UL','upper'],LL:['LR','lower'],LR:['LL','lower']},true:{UL:['LR','down'],LR:['UL','down'],LL:['UR','up'],UR:['LL','up']}};
function approach(c,on,port,gap=7,extent=1){
 const incoming=n.nodes[c.ports[port]].find(p=>!c.internal.includes(p.edge)),edge=n.edges[incoming.edge],expected=(c.kind==='cross'?cross:simple)[on][port];
 const states=new Map([[c.id,on]]);if(edge.switchId)states.set(edge.switchId,edge.requiredState);
 let outlet;
 if(expected){outlet=n.nodes[c.ports[expected[0]]].find(p=>!c.internal.includes(p.edge));const out=n.edges[outlet.edge];if(out.switchId)states.set(out.switchId,out.requiredState);}
 const route=routing(n,id=>states.has(id)?states.get(id):false),direction=incoming.end?1:-1;
 const t=make(edge.id,incoming.end?edge.length-extent-gap:extent+gap,direction,extent);
 const boundary=direction>0?edge.length-extent:extent;
 return {t,route,states,expected,outlet,incoming,boundary,context:{trains:[t],detached:[],route}};
}
function tick(f,label,record=false){
 const t=f.t,before=t.journey.position,velocity=t.velocity;
 const result=stepRailway(f.context,1/60)[0];
 assert.ok(Math.abs(t.guard.delta-(t.journey.position-before))<1e-9);assert.equal(t.guard.velocity,t.velocity);
 if(record)rows.push({scenario:label,train:t.id,velocityBefore:velocity,command:t.requestedSpeed,dir:t.dir,before:{edge:f.incoming?.edge,coordinate:before},after:{...t.journey.locate(),coordinate:t.journey.position},distanceRemaining:t.guard.distance,risk:t.guard.risk,reason:t.guard.reason,state:t.guard.state,delta:t.journey.position-before,moved:result.moved});
 return result;
}
for(const c of n.controllers)test(`S5 ${c.id}: every port/state and both Journey axes respect actual routing`,()=>{
 for(const on of [false,true])for(const port of Object.keys(c.ports))for(const flipped of [false,true]){
  const f=approach(c,on,port),{t}=f;
  if(flipped){const length=n.edges[f.incoming.edge].length;t.journey.segments[0].sign=-1;t.journey.position=length-t.journey.position;t.dir*=-1;t.velocity*=-1;f.boundary=length-f.boundary;}
  if(!f.expected){
   for(let i=0;i<90;i++){tick(f,`${c.id}/${on}/${port}/${flipped}`,i===0||i===89);assert.ok((t.journey.position-f.boundary)*t.dir<=1e-7,'prohibited port crossed');}
   assert.equal(t.velocity,0);assert.equal(t.guard.risk,'UNSAFE');assert.equal(t.guard.state,'GUARDED_STOP');
  }else{
   let crossed=false;
   for(let i=0;i<1000;i++){
    tick(f,'legal',false);assert.equal(t.guard.state,'SAFE',`${c.id}/${on}/${port}: ${t.guard.reason}`);
    if(t.journey.locate().edge===f.outlet.edge){crossed=true;break;}
   }
   assert.ok(crossed,'did not traverse selected physical route');assert.equal(t.speed,20);
  }
 }
});
test('S5 high speed, tiny residual gap: bumper never crosses the first forbidden port, even with cached history',()=>{
 const c=n.controllers.find(c=>c.id==='Y-4');
 for(const cached of [false,true])for(const velocity of [0,.1,30,150,1e8,NaN,Infinity]){
  const f=approach(c,true,'B',.01),{t}=f;
  if(cached){f.states.set(c.id,false);assert.ok(t.journey.ensure(t.journey.position+t.dir*20,f.route));f.states.set(c.id,true);}
  t.velocity=velocity*t.dir;t.speed=100;
  const history=JSON.stringify(t.journey.segments);
  tick(f,'high-speed-cache-'+cached+'-'+velocity,true);
  assert.ok((t.journey.position-f.boundary)*t.dir<=1e-7);assert.equal(t.velocity,0);assert.equal(t.speed,0);assert.equal(JSON.stringify(t.journey.segments),history);
 }
});
test('S5 cached unused route is revalidated and refreshed after a legal state change; no invented central WX junction',()=>{
 const c=n.controllers.find(c=>c.id==='WX-A'),f=approach(c,false,'UL',7);assert.ok(f.t.journey.ensure(f.t.journey.position+400,f.route));f.states.set('WX-A',true);
 let entered=false;
 for(let i=0;i<100;i++){tick(f,'cache-refresh',i===0);if(f.t.journey.locate().edge==='WX-A:down'){entered=true;break;}}
 assert.ok(entered);assert.equal(f.t.guard.state,'SAFE');assert.ok(!f.t.journey.segments.some(s=>s.id==='WX-A:upper'));
});
test('S5 UNKNOWN fails closed for raw unknown states, ambiguous/missing routes and malformed reservations',()=>{
 for(const reason of ['unknown-control','ambiguous','no-route','invalid-reservation']){
  const f=approach(n.controllers.find(c=>c.id==='Y-4'),false,'B',.01);
  if(reason==='unknown-control')f.states.set('Y-4',undefined);
  if(reason==='ambiguous'||reason==='no-route'){const route=()=>null;route.reason=()=>reason;f.route=f.context.route=route;}
  if(reason==='invalid-reservation')f.context.reservations=[{edge:'missing',min:0,max:1,trainId:3}];
  tick(f,reason,true);assert.equal(f.t.guard.state,'GUARDED_STOP');assert.equal(f.t.guard.risk,reason==='no-route'?'UNSAFE':'UNKNOWN');assert.equal(f.t.velocity,0);
 }
 for(const edge of ['__proto__','constructor','toString',null,NaN,{},undefined]){
  const f=approach(n.controllers.find(c=>c.id==='Y-4'),false,'B',.01);
  f.context.reservations=[{edge,min:0,max:1,trainId:3}];tick(f,'noncanonical-reservation',true);
  assert.equal(f.t.guard.risk,'UNKNOWN');assert.equal(f.t.velocity,0);
 }
});
test('S5 foreign reservations stop before their interval, own reservations admit transit, release requires explicit rearm',()=>{
 const t=make('T47',180,1,10),route=routing(n,()=>false),context={trains:[t],detached:[],route,reservations:[{edge:'T47',min:215,max:230,trainId:2}]},f={t,context};
 t.velocity=100;t.speed=100;
 for(let i=0;i<100;i++){tick(f,'foreign-reservation',i===0||i===99);assert.ok(t.journey.position+10<215);}
 assert.equal(t.guard.state,'GUARDED_STOP');assert.equal(t.guard.reason,'reserved');assert.equal(t.velocity,0);assert.equal(t.speed,0);assert.equal(t.requestedSpeed,100);
 context.reservations=[];tick(f,'reservation-cleared',true);assert.equal(t.guard.state,'SAFE');assert.equal(t.speed,0);assert.equal(t.velocity,0);
 const commands=createFleetCommands(context);commands.setSpeed(0,20);context.reservations=[{edge:'T47',min:215,max:230,trainId:0}];for(let i=0;i<30;i++)tick(f,'own-reservation');assert.equal(t.guard.state,'SAFE');assert.ok(t.velocity>0);
});
test('S5 recovery: aligned turnout and reverse away clear guard, manual stop and STOP ALL never auto-restart',()=>{
 for(const resolution of ['align','reverse']){
  const f=approach(n.controllers.find(c=>c.id==='Y-4'),true,'B',.01);f.t.velocity=150*f.t.dir;f.t.speed=100;tick(f,'before-'+resolution,true);assert.equal(f.t.guard.state,'GUARDED_STOP');
  const commands=createFleetCommands(f.context);
  if(resolution==='align')f.states.set('Y-4',false);else commands.reverse(0);
  tick(f,'cleared-'+resolution,true);assert.equal(f.t.guard.state,'SAFE');assert.equal(f.t.velocity,0);
  commands.setSpeed(0,20);tick(f,'rearmed-'+resolution,true);assert.ok(Math.abs(f.t.velocity)>0);
  commands.stop(0);f.states.set('Y-4',false);for(let i=0;i<20;i++)tick(f,'manual-stop');assert.equal(f.t.velocity,0);assert.equal(f.t.requestedSpeed,0);
  commands.setSpeed(0,100);f.states.set('Y-4',true);tick(f,'stop-all-guard');commands.stopAll();f.states.set('Y-4',false);for(let i=0;i<20;i++)tick(f,'STOP-ALL');assert.equal(f.t.velocity,0);assert.equal(f.t.speed,0);assert.equal(f.t.requestedSpeed,0);
 }
});
test('S5 large dt, background resume and frame rates cannot bypass admission; invalid dt rejected atomically',()=>{
 const outcomes=[];
 for(const frames of [Array(20).fill(.2),Array(12).fill(60),Array(240).fill(1/60),Array(480).fill(1/120),Array(80).fill(.05)]){
  const f=approach(n.controllers.find(c=>c.id==='Y-4'),true,'B',4),clock=new FixedClock();f.t.velocity=150*f.t.dir;f.t.speed=100;
  for(const elapsed of frames)clock.update(elapsed,dt=>{tick(f,'resume',false);assert.ok((f.t.journey.position-f.boundary)*f.t.dir<=1e-7);});
  assert.equal(f.t.velocity,0);outcomes.push(f.t.journey.position);
 }
 assert.ok(outcomes.every(v=>Math.abs(v-outcomes[0])<1e-8));
 const f=approach(n.controllers[0],false,'A'),before=JSON.stringify(f.t);
 for(const dt of [0,-1,NaN,Infinity,.2,60])assert.throws(()=>stepRailway(f.context,dt),RangeError);
 assert.equal(JSON.stringify(f.t),before);
});
test('S5 terminal braking covers short and long consists in both directions; reversal leaves the buffer',()=>{
 for(const e of Object.values(n.edges).filter(e=>e.terminal))for(const reverse of [false,true]){
  const end=n.nodes[e.to].length===1?1:0;
  // Use a single long body to isolate front/rear extents on a short terminal.
  const t=make(e.id,end?e.length-32:32,end?1:-1,25),route=routing(n,id=>n.edges[e.id].switchId===id),f={t,context:{trains:[t],detached:[],route}};
  if(reverse){t.journey.segments[0].sign=-1;t.journey.position=e.length-t.journey.position;t.dir*=-1;t.velocity*=-1;}
  for(let i=0;i<120;i++)tick(f,'terminal-'+e.id+'-'+reverse,i===0||i===119);
  const at=t.journey.locate().s;assert.ok(end?at+25<e.length:at-25>0);assert.equal(t.velocity,0);assert.equal(t.guard.reason,'terminal');
  const p=t.journey.position;createFleetCommands(f.context).reverse(0);createFleetCommands(f.context).setSpeed(0,20);for(let i=0;i<10;i++)tick(f,'leave-buffer');assert.ok((t.journey.position-p)*t.dir>0);
 }
});
test('S5 predictive margin uses graph distance, not geometric proximity; full legal loops keep exact motion',()=>{
 const trains=[0,1,2].map(id=>{const p=loopPosition(n,id,.2),t=make(p.edge,p.s,id===1?-1:1,10);t.id=id;t.speed=70;t.velocity=105*t.dir;return t;});
 const context={trains,detached:[],route:routing(n,()=>false)};
 for(let i=0;i<2400;i++){stepRailway(context,1/60);for(const t of trains)assert.equal(t.guard.state,'SAFE');}
 assert.ok(trains.every(t=>t.speed===70&&t.journey.travel>4000));
});
after(()=>{if(process.env.S5_EVIDENCE)writeFileSync(process.env.S5_EVIDENCE,JSON.stringify({note:'Observations; suite outcome is in the test runner log.',scenarios:rows},null,2)+'\n');});

test('S5 reproduces and prevents the stale-history crossing admitted by the old engine',()=>{
 const c=n.controllers.find(c=>c.id==='Y-4'),f=approach(c,true,'B',.01);f.states.set('Y-4',false);
 assert.ok(f.t.journey.ensure(f.t.journey.position+f.t.dir*20,f.route));f.states.set('Y-4',true);f.t.velocity=150*f.t.dir;f.t.speed=100;
 const old={...f.t,journey:Object.assign(Object.create(Journey.prototype),f.t.journey,{segments:f.t.journey.segments.map(s=>({...s}))})};
 beforeGuard({...f.context,trains:[old]},1/60);
 assert.ok((old.journey.position-f.boundary)*old.dir>0,'baseline must actually cross the forbidden boundary');
 tick(f,'stale-history-fixed',true);assert.ok((f.t.journey.position-f.boundary)*f.t.dir<0);assert.equal(f.t.guard.reason,'misaligned');
 rows.push({scenario:'stale-history-before-fix',train:old.id,after:old.journey.locate(),coordinate:old.journey.position,forbiddenBoundary:f.boundary,illegalBeyondMm:(old.journey.position-f.boundary)*old.dir});
});
test('S5 occupation conflicts retain authoritative 5C rollback, including conflict introduced during approach',()=>{
 const a=make('T47',200,1,34),b=make('T46',110,-1,34);a.id=0;b.id=1;a.speed=b.speed=100;a.velocity=100;b.velocity=-100;
 const context={trains:[a,b],detached:[],route:routing(n,()=>false)};let blocked=false;
 for(let i=0;i<400;i++){
  const results=stepRailway(context,1/60);
  for(const p of vehiclePositions(a))for(const q of vehiclePositions(b))assert.equal(vehiclesConflict(p,q),false);
  if(results.some(r=>r.kind==='train')){blocked=true;for(const r of results)rows.push({scenario:'occupation',train:r.train.id,after:r.train.journey.locate(),velocity:r.train.velocity,risk:r.guard.risk,state:r.guard.state,reason:r.guard.reason,moved:r.moved});break;}
 }
 assert.ok(blocked);assert.ok([a,b].every(t=>t.speed===0&&t.velocity===0));
 const t=make('T47',180,1,10),f={t,context:{trains:[t],detached:[],route:routing(n,()=>false)}};
 tick(f,'before-new-conflict',true);assert.equal(t.guard.state,'SAFE');
 f.context.reservations=[{edge:'T47',min:t.journey.position+10.01,max:t.journey.position+15,trainId:2}];
 tick(f,'new-conflict',true);assert.equal(t.guard.reason,'reserved');assert.ok(t.journey.position+10<f.context.reservations[0].min);
});

test('S5 predictive stop preserves existing operation locks and leaves a blocked switch correctable through the real dispatcher',()=>{
 const f=approach(n.controllers.find(c=>c.id==='Y-4'),true,'B',80);f.t.velocity=150;f.t.speed=100;
 for(let i=0;i<300;i++)tick(f,'predictive-protected-stop',i===0||i===299);
 assert.equal(f.t.velocity,0);assert.equal(f.t.guard.state,'GUARDED_STOP');assert.equal(f.t.guard.protectionInset,30);
 const remaining=n.edges[f.incoming.edge].length-f.t.journey.position-1;assert.ok(remaining>30+1e-6);
 const specs=n.controllers.map(c=>({...c,on:f.states.get(c.id)??false})),route=routing(n,id=>specs.find(c=>c.id===id).on),context={...f.context,route,network:n,switchTopology:createSwitchTopology(n,specs),switchSpecs:specs,selected:0};
 const commands=createTurnoutCommands({...context,getSafety:id=>deriveSwitchAssistance(context).safetyByControl.get(id)});
 assert.equal(commands.requestToggle('Y-4','panel').changed,true);
 stepRailway(context,1/60);assert.equal(f.t.guard.state,'SAFE');assert.equal(f.t.velocity,0);assert.equal(f.t.speed,0);
});

test('S5 UNKNOWN takes precedence at the same boundary, including inactive ports and directly touching turnouts',()=>{
 for(const c of n.controllers)for(const port of Object.keys(c.ports))for(const state of [undefined,null,'false']){
  const f=approach(c,true,port,.01);f.states.set(c.id,state);tick(f,'unknown-'+c.id+'-'+port,true);
  assert.equal(f.t.guard.risk,'UNKNOWN',c.id+'/'+port);assert.equal(f.t.guard.state,'GUARDED_STOP');assert.equal(f.t.velocity,0);
 }
});

test('S5 assessment and admission are deterministic read-only core APIs, independent of graphics',()=>{
 const f=approach(n.controllers.find(c=>c.id==='Y-4'),true,'B',80);f.t.speed=100;f.t.velocity=150;
 f.t.journey.segments.forEach(Object.freeze);Object.freeze(f.t.journey.segments);Object.freeze(f.t.journey);Object.freeze(f.t);
 const before=JSON.stringify(f.t),a=assessRailwayGuard(f.t,f.t.journey,f.route,1/60),b=assessRailwayGuard(f.t,f.t.journey,f.route,1/60);
 assert.deepEqual(a,b);assert.equal(a.risk,'UNSAFE');assert.ok(a.distance<=50&&a.distance>49);
 const decision=guardDecision(a,2.5,150,1/60);assert.ok(decision.delta<=a.distance&&decision.velocity<150);assert.equal(decision.state,'GUARDED_STOP');
 assert.equal(JSON.stringify(f.t),before);
});

test('S5 occupation warning persists at rest and releases on departure without a phantom reservation',()=>{
 const a=make('T47',200,1,34),b=make('T46',110,-1,34);b.id=1;a.speed=b.speed=100;a.velocity=100;b.velocity=-100;
 const context={trains:[a,b],detached:[],route:routing(n,()=>false)};
 for(let i=0;i<400&&a.speed;i++)stepRailway(context,1/60);
 assert.equal(a.speed,0);const at=a.journey.position;
 for(let i=0;i<10;i++){stepRailway(context,1/60);assert.equal(a.guard.state,'GUARDED_STOP');assert.equal(a.guard.reason,'train');assert.equal(a.journey.position,at);}
 // A retained warning must NOT reserve the hypothetical swept envelope.
 const commands=createFleetCommands(context);commands.reverse(1);commands.setSpeed(1,35);
 for(let i=0;i<120;i++){stepRailway(context,1/60);assert.equal(b.speed,35);}
 assert.equal(a.guard.state,'SAFE');assert.equal(a.journey.position,at);assert.equal(a.speed,0);
});
