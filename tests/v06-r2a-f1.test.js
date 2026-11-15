import test from 'node:test';
import assert from 'node:assert/strict';
import {adjacentLab,approachSample} from '../tools/scenario-v06/shared-junction-lab.js';
import {sharedCases,validateSharedCase,validateUnknownCase} from '../tools/scenario-v06/shared-junction-validation.js';
import {createRailwaySession} from '../tools/scenario-v06/railway-session.js';
import {createDynamicLab,SHORT_LOCO,SHORT_CAR} from '../tools/scenario-v06/dynamic-lab.js';
import {NORMAL_STATES} from '../tools/scenario-v06/dynamic-validation.js';

for(const origin of ['panel','device'])test(`R2A-F1 negative: ${origin} cannot throw C13 on actual tick 836 before occupation`,()=>{
  const lab=adjacentLab();
  try {
    while(lab.ticks<836)lab.tick();
    const before=approachSample(lab);
    assert.ok(before.velocity>0);assert.ok(before.clearance>0,'body is still outside C13');
    const result=lab.toggle('V06-C13',origin);
    assert.equal(result.changed,false,'moving approach must reject a real protected request');
    assert.equal(result.reason,'approaching');
    assert.equal(lab.snapshot().switches['V06-C13'],true);
  } finally {lab.stop(0);lab.dispose();}
});

test('R2A-F1 negative: guarded stop leaves the full C13 operational margin clear for protected correction',()=>{
  const lab=adjacentLab();
  try {
    let intervened=false;
    for(let i=0;i<1000;i++){
      lab.tick();intervened ||= lab.train.guard.intervened;
      if(intervened&&!lab.train.velocity)break;
    }
    const end=approachSample(lab);
    assert.ok(intervened);assert.equal(end.velocity,0);
    assert.equal(end.guard.protectionInset,30);
    assert.ok(end.clearance>0,'whole coupler envelope outside existing [0,30] protection');
    assert.equal(end.safety.kind,'unlocked');
    assert.equal(lab.toggle('V06-C13','device').changed,true);
    const position=lab.snapshot().position;
    for(let i=0;i<10;i++)lab.tick();
    assert.equal(lab.snapshot().position,position,'alignment never automatically restarts');
    lab.setSpeed(0,20);for(let i=0;i<200;i++)lab.tick();
    assert.ok(lab.train.velocity>0);assert.equal(lab.train.guard.state,'SAFE');
  } finally {lab.stop(0);lab.dispose();}
});

for(const profile of ['v06','legacy'])for(const direction of [1,-1]) {
  test(`R2A-F1 ${profile} ${direction}: all shared ports, both neighbour states, loco/car, approach/occupied/release/rearm`,()=>{
    const cases=sharedCases(profile).filter(c=>c.direction===direction);
    assert.ok(cases.length>0);
    const rows=cases.map(validateSharedCase);
    assert.ok(rows.some(r=>r.blocked));assert.ok(rows.some(r=>!r.blocked));
  });
  test(`R2A-F1 ${profile} ${direction}: UNKNOWN neighbour at every shared port fails closed in the real step`,()=>{
    for(const c of sharedCases(profile).filter(c=>c.direction===direction&&!c.neighbourState))validateUnknownCase(c);
  });
}

for(const count of [1,3])test(`R2A-F1 actual accelerated approach with ${count} short vehicles stops clear and corrects from either surface`,()=>{
  for(const origin of ['panel','device']) {
    const lab=adjacentLab([SHORT_LOCO,...Array(count-1).fill(SHORT_CAR)]);
    try {
      let first=false;
      for(let tick=0;tick<1200;tick++) {
        lab.tick();first ||= lab.train.guard.intervened;
        if(first&&!lab.train.velocity)break;
      }
      const end=approachSample(lab);
      assert.ok(first);assert.equal(end.velocity,0);assert.ok(end.clearance>0);
      assert.equal(end.guard.protectionInset,30);assert.equal(end.safety.kind,'unlocked');
      assert.equal(lab.toggle('V06-C13',origin).changed,true);
    } finally {lab.stop(0);lab.dispose();}
  }
});

for(const profile of ['legacy','v06'])test(`R2A-F1 ${profile}: empty railway admits panel/device requests on all units`,()=>{
  const s=createRailwaySession({profile});
  try {
    s.configureLabStates(Object.fromEntries(s.registry.ids.map(id=>[id,false])));
    for(const id of s.registry.ids)for(const origin of ['panel','device']) {
      assert.equal(s.getSafety(id).kind,'unlocked');
      assert.equal(s.requestToggle(id,origin).changed,true);
    }
    assert.ok(s.switchSpecs.every(s=>s.on===false));assert.equal(s.readiness().runtimeAdmission,false);
  } finally {s.dispose();}
});

test('R2A-F1 distant moving train does not cause a phantom C13 approach lock',()=>{
  const lab=createDynamicLab({profile:'v06',states:NORMAL_STATES});
  lab.spawn({target:'C',vehicles:[SHORT_LOCO,SHORT_CAR]});lab.setSpeed(0,60);
  try {
    for(let i=0;i<10;i++)lab.tick();
    const before=lab.snapshot(),p=lab.observe().preview;
    const encounter=p.encounters.find(e=>e.site.id==='V06-C13');assert.ok(encounter.distance>1000);
    for(const origin of ['panel','device']) {
      assert.equal(lab.session.getSafety('V06-C13').kind,'unlocked');
      assert.equal(lab.toggle('V06-C13',origin).changed,true);
    }
    assert.equal(lab.snapshot().position,before.position);assert.equal(lab.snapshot().velocity,before.velocity);
  } finally {lab.stop(0);lab.dispose();}
});

test('R2A-F1 UNKNOWN session keeps both surfaces and motion closed until a complete known initialization',()=>{
  const lab=createDynamicLab({profile:'v06'});
  try {
    for(const id of lab.session.registry.ids)for(const origin of ['panel','device']) {
      assert.equal(lab.session.getSafety(id).kind,'unknown');assert.equal(lab.toggle(id,origin).changed,false);
    }
    assert.throws(()=>lab.tick(),/unknown-control/);assert.equal(lab.ticks,0);
    lab.session.configureLabStates(NORMAL_STATES);lab.spawn({target:'C'});
    lab.tick();assert.equal(lab.ticks,1);assert.equal(lab.session.readiness().runtimeAdmission,false);
  } finally {if(lab.train)lab.stop(0);lab.dispose();}
});
