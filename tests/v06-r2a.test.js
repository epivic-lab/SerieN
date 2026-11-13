import test from 'node:test';
import assert from 'node:assert/strict';
import {Journey,FixedClock} from '../src/simulation.js';
import {guardDecision} from '../src/railway-guard.js';
import {createRailwaySession,replaceRailwaySession} from '../tools/scenario-v06/railway-session.js';
import {createDynamicLab,SHORT_LOCO,SHORT_CAR} from '../tools/scenario-v06/dynamic-lab.js';
import {circuitWitness} from '../tools/scenario-v06/dynamic-oracle.js';
import {NORMAL_STATES,monitor,runLoopScenario,runDynamics,runProtectedStop,runProtection} from '../tools/scenario-v06/dynamic-validation.js';

for(const name of ['A','B','C'])for(const direction of [1,-1])test(`R2A ${name} direction ${direction}: full dynamic lap and controlled stop`,()=>{
  const r=runLoopScenario(name,direction);assert.ok(r.maxPositionError<1e-7);
});
for(const direction of [1,-1])test(`R2A short locomotive + two cars direction ${direction}: complete C lap, joints, couplers, envelope`,()=>{
  const r=runLoopScenario('C',direction,[SHORT_LOCO,SHORT_CAR,SHORT_CAR]);
  assert.ok(r.maxHistory>2);assert.equal(r.trajectory[0].layout.tail,90);assert.equal(r.spawn.extent.max-r.spawn.extent.min,112);
});
test('R2A acceleration, cruise, deceleration, immediate STOP, reverse and restart with a short car',()=>runDynamics());
for(const direction of [1,-1])test(`R2A protected misalignment braking direction ${direction}, no boundary crossing, protected correction`,()=>runProtectedStop(direction));
test('R2A fresh operation safety rejects panel/device during actual approach and occupation on all five loop devices',()=>runProtection());

test('R2A UNKNOWN forbids any movement tick, clock accumulation and spawn',()=>{
  const lab=createDynamicLab({profile:'v06'});
  assert.equal(lab.session.readiness().statesKnown,false);
  assert.throws(()=>lab.tick(),/unknown-control/);assert.equal(lab.ticks,0);
  assert.throws(()=>lab.spawn({target:'C'}),/unknown-control/);assert.equal(lab.session.trains.length,0);
  for(const id of lab.session.registry.ids)assert.equal(lab.toggle(id).changed,false);
  lab.session.configureLabStates(NORMAL_STATES);lab.spawn({target:'C'});lab.tick();assert.equal(lab.ticks,1);lab.dispose();
});
test('R2A incomplete/nonboolean configuration is rejected atomically before ticks',()=>{
  const lab=createDynamicLab({profile:'v06'});
  for(const states of [{}, {...NORMAL_STATES,'WX-A':null},{...NORMAL_STATES,extra:false},
    Object.fromEntries(Object.entries(NORMAL_STATES).slice(1))]){
    assert.throws(()=>lab.session.configureLabStates(states),/Complete known/);assert.throws(()=>lab.tick(),/unknown-control/);
    assert.ok(lab.session.switchSpecs.every(s=>s.on===null));assert.equal(lab.ticks,0);
  }lab.dispose();
});
test('R2A explicit profile, foreign IDs and foreign Journey fail without movement',()=>{
  assert.throws(()=>createDynamicLab(),/Explicit/);
  const lab=createDynamicLab({profile:'v06',states:NORMAL_STATES});lab.spawn({target:'C'});
  const other=createRailwaySession({profile:'v06'}),legacy=createRailwaySession({profile:'legacy'});
  for(const s of [other,legacy]){
    const edge=Object.keys(s.network.edges)[0],original=lab.train.journey;
    lab.train.journey=new Journey(s.network,edge,1);
    assert.throws(()=>lab.tick(),/foreign-fleet/);assert.equal(lab.ticks,0);
    assert.equal(lab.toggle('WX-A').changed,false);lab.train.journey=original;
  }
  for(const id of [1,-1,'0',other.identity.sessionId])assert.throws(()=>lab.setSpeed(id,50),/Foreign train/);
  assert.throws(()=>new Journey(lab.session.network,'T47',0),/Invalid initial/);
  assert.equal(lab.toggle('Y-IN').changed,false);other.dispose();legacy.dispose();lab.dispose();
});
test('R2A speed limits use real clamping; invalid motion never enters stepRailway',()=>{
  const lab=createDynamicLab({profile:'v06',states:NORMAL_STATES});lab.spawn({target:'B'});
  lab.setSpeed(0,101);assert.equal(lab.train.speed,100);lab.setSpeed(0,-1);assert.equal(lab.train.speed,0);
  for(const value of [NaN,Infinity,undefined])assert.throws(()=>lab.setSpeed(0,value),/finite/);
  for(const [key,value] of [['speed',101],['requestedSpeed',-1],['velocity',151],['dir',0]]){
    const original=lab.train[key];lab.train[key]=value;assert.throws(()=>lab.tick(),/invalid-motion/);
    assert.equal(lab.ticks,0);assert.equal(lab.toggle('WX-A').changed,false);lab.train[key]=original;
  }
  for(const dt of [0,-1,NaN])assert.throws(()=>new FixedClock(dt),/Invalid clock/);
  lab.stop(0);lab.dispose();
});
test('R2A unavailable endpoint/triangle/yard and overlong consists cannot acquire a movement tick',()=>{
  const lab=createDynamicLab({profile:'v06',states:NORMAL_STATES});
  for(const target of ['N16','N07','scalo','triangle','fourth-train','T47'])
    assert.throws(()=>lab.spawn({target}),/missing-approved/);
  assert.throws(()=>lab.spawn({target:'C',vehicles:[{length:300,width:16,front:152,rear:152}]}),/outside-lab-window/);
  assert.throws(()=>lab.tick(),/single owned/);assert.equal(lab.ticks,0);lab.dispose();
});
test('R2A reset and reverse refuse movement or pending throttle; full stop permits a fresh legacy session',()=>{
  const lab=createDynamicLab({profile:'v06',states:NORMAL_STATES});lab.spawn({target:'A'});
  lab.setSpeed(0,60);assert.throws(()=>replaceRailwaySession(lab.session,{profile:'legacy'}),/Moving/);
  lab.tick();assert.throws(()=>lab.reverse(0),/Moving/);assert.throws(()=>lab.dispose(),/Moving/);
  assert.throws(()=>replaceRailwaySession(lab.session,{profile:'legacy'}),/Moving/);
  lab.setSpeed(0,0);assert.throws(()=>replaceRailwaySession(lab.session,{profile:'legacy'}),/Moving/);
  while(lab.train.velocity)lab.tick();
  const old=lab.train.journey,legacy=replaceRailwaySession(lab.session,{profile:'legacy'});
  assert.equal(legacy.registry.ids.length,8);assert.equal(legacy.trains.length,0);assert.equal(legacy.resources().timers,0);
  assert.equal(old.network,lab.session.network);assert.notEqual(legacy.network,old.network);
  assert.throws(()=>lab.tick(),/session-disposed/);assert.equal(lab.toggle('WX-A').changed,false);legacy.dispose();
});
test('R2A cached future history is reconciled by protected command, observations remain read-only',()=>{
  const lab=createDynamicLab({profile:'v06',states:NORMAL_STATES});lab.spawn({target:'C'});
  const j=lab.train.journey,position=j.position;
  assert.equal(j.ensure(position+1600,lab.session.route),true);assert.ok(j.segments.length>5);
  const before=JSON.stringify(j);lab.observe();assert.equal(JSON.stringify(j),before);
  assert.equal(lab.toggle('V06-C13').changed,true);assert.equal(j.segments.length,1);
  assert.equal(lab.toggle('V06-C13','device').changed,true);assert.equal(j.position,position);assert.equal(j.travel,0);
  lab.setSpeed(0,60);for(let i=0;i<1200;i++)lab.tick();assert.equal(lab.train.guard.state,'SAFE');
  assert.ok(j.segments.length>2);lab.stop(0);lab.dispose();
});
test('R2A frozen witnesses are sensitive to wrong direction, distance and loop identity',()=>{
  const w=circuitWitness('C'),a=w.point(500),wrong=w.point(501);assert.ok(Math.hypot(a.x-wrong.x,a.z-wrong.z)>.99);
  assert.notEqual(w.point(-500).edge,a.edge);assert.throws(()=>w.coordinate('V06-P056',0));
  assert.throws(()=>circuitWitness('N16'));
});
test('R2A independent monitor detects injected coordinate drift and foreign history',()=>{
  const lab=createDynamicLab({profile:'v06',states:NORMAL_STATES});lab.spawn({target:'C'});
  const m=monitor(lab,'C'),j=lab.train.journey;
  j.position+=.1;assert.throws(()=>m.verify(lab.snapshot()),/REPRO/);j.position-=.1;
  j.segments[0].sign=1;assert.throws(()=>m.verify(lab.snapshot()),/REPRO/);j.segments[0].sign=-1;
  lab.dispose();
});
test('R2A unreachable N16 in the static ring asset is observed as a cycle, never an invented route',()=>{
  const lab=createDynamicLab({profile:'v06',states:NORMAL_STATES});lab.spawn({target:'C'});
  assert.equal(lab.toggle('V06-N14').changed,true);
  const p=lab.observe().preview;assert.equal(p.stop,'cycle');assert.ok(p.ranges.every(r=>r.edge!=='V06-P051'));
  assert.equal(lab.session.checkSpawn({id:0,target:'N16',scope:'laboratory',vehicles:[SHORT_LOCO]}).ok,false);
  assert.equal(lab.ticks,0);lab.dispose();
});
test('R2A legacy movement and Legacy → V06 → Legacy lifecycle preserve defaults and revoke callbacks',async()=>{
  const legacy=createDynamicLab({profile:'legacy'});legacy.spawn({target:'C'});legacy.setSpeed(0,20);
  for(let i=0;i<90;i++)legacy.tick();assert.equal(legacy.train.velocity,30);legacy.stop(0);
  let fired=0;legacy.session.schedule(()=>fired++,10);legacy.session.cache.set('diagnostic',{old:true});
  const v=replaceRailwaySession(legacy.session,{profile:'v06'});
  assert.ok(v.switchSpecs.every(s=>s.on===null));assert.equal(v.trains.length,0);
  const back=replaceRailwaySession(v,{profile:'legacy'});
  assert.equal(back.trains.length,0);assert.equal(back.registry.ids.length,8);
  assert.ok(back.switchSpecs.every(s=>s.on===false));assert.equal(back.cache.size,0);
  assert.deepEqual(legacy.session.resources(),{trains:0,detached:0,reservations:0,cache:0,listeners:0,timers:0,cleanups:0});
  await new Promise(resolve=>setTimeout(resolve,25));assert.equal(fired,0);back.dispose();
});
test('R2A UNKNOWN guard decision itself remains zero-displacement fail-closed',()=>{
  const r=guardDecision({risk:'UNKNOWN',reason:'unknown-control',distance:0},1.5,90,1/60);
  assert.equal(r.delta,0);assert.equal(r.velocity,0);assert.equal(r.state,'GUARDED_STOP');
});
