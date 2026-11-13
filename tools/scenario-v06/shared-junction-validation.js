import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRailwaySession} from './railway-session.js';
import {SHORT_LOCO,SHORT_CAR,DT} from './dynamic-lab.js';
import {stepRailway} from '../../src/railway-step.js';
import {createFleetCommands} from '../../src/fleet-commands.js';
import {layoutFor,collectRailwayState} from '../../src/railway-state.js';
import {routing} from '../../src/simulation.js';
import {runLoopScenario,runDynamics,runProtectedStop,runProtection} from './dynamic-validation.js';

// Every shared node, every incident physical edge, both Journey orientations,
// and both neighbour states. No C13-specific exception in the expected locks.
export function sharedCases(profile) {
  const s=createRailwaySession({profile});
  try {
    return [...s.switchTopology.byNode].filter(([,members])=>members.length>1)
      .flatMap(([node,members])=>s.network.nodes[node].flatMap(port=>
        [1,-1].flatMap(direction=>[1,2].flatMap(count=>[false,true].map(neighbourState=>
          ({profile,node,port,controls:members.map(m=>m.id),direction,count,neighbourState}))))));
  } finally {s.dispose();}
}

export function sharedFixture(c) {
  const session=createRailwaySession({profile:c.profile}),edge=session.network.edges[c.port.edge];
  const current=edge.switchId,neighbour=c.controls.find(id=>id!==current);
  const states=Object.fromEntries(session.registry.ids.map(id=>[id,false]));
  states[current]=edge.requiredState;states[neighbour]=c.neighbourState;
  session.configureLabStates(states);
  const vehicles=[SHORT_LOCO,...Array(c.count-1).fill(SHORT_CAR)];
  const tail=c.count===1?22:39+(c.count-2)*34+17;
  // Independent coupler layout: loco/car pitch 39, then car/car pitch 34.
  assert.equal(tail,c.count===1?22:c.count===2?56:90);
  const gap=45,extent=c.direction>0?22:tail;
  const train=session.createLabTrainFixture({id:0,edge:edge.id,
    s:c.port.end?edge.length-gap-extent:gap+extent,
    sign:(c.port.end?1:-1)*c.direction,vehicles});
  train.dir=c.direction;train.speed=train.requestedSpeed=60;train.velocity=90*c.direction;
  const context={network:session.network,switchTopology:session.switchTopology,
    trains:session.trains,detached:session.detached,route:session.route,tracePoints:false};
  const commands=createFleetCommands(context);
  const leading=()=>train.journey.locate(train.journey.position+(c.direction>0?22:-layoutFor(train).tail));
  const clearance=()=>{
    const p=leading(),range=session.switchTopology.byControl.get(neighbour).protectedRanges.find(r=>r.edge===p.edge);
    return p.edge!==edge.id?null:c.port.end?range.min-p.s:p.s-range.max;
  };
  const boundary=train.journey.position+c.direction*(gap+extent);
  return {session,train,context,commands,states,current,neighbour,leading,clearance,boundary,
    dispose(){commands.stop(0);session.dispose();}};
}

export function validateSharedCase(c) {
  const f=sharedFixture(c),{session,train,context,neighbour}=f;
  try {
    const before=JSON.stringify(train.journey),preview=session.preview(train,c.direction,1000);
    assert.equal(JSON.stringify(train.journey),before,'preview is read-only');
    const shared=preview.encounters.filter(e=>e.node===c.node);
    assert.deepEqual(new Set(shared.map(e=>e.site.id)),new Set(c.controls),'both units must be protected');
    assert.ok(f.clearance()>0,'leading coupler outside neighbouring protection');
    const occupied=collectRailwayState(context).occupied;
    const site=session.switchTopology.byControl.get(neighbour);
    assert.ok(!site.protectedRanges.some(a=>occupied.some(b=>a.edge===b.edge&&a.min<=b.max&&b.min<=a.max)));
    assert.equal(session.getSafety(neighbour).kind,'approaching');
    const statesBefore=session.switchSpecs;
    const requests=['panel','device'].map(origin=>session.requestToggle(neighbour,origin));
    for(const result of requests){assert.equal(result.changed,false);assert.equal(result.reason,'approaching');}
    assert.deepEqual(session.switchSpecs,statesBefore);
    assert.equal(session.getSafety(f.current).kind,'occupied','current unit stays occupied');
    for(const origin of ['panel','device'])assert.equal(session.requestToggle(f.current,origin).reason,'occupied');
    const blocked=!shared[0].outgoing;
    let tick=0,minClearance=f.clearance(),crossed=false;
    for(;tick<600;tick++) {
      stepRailway(context,DT);
      const p=f.leading(),clearance=f.clearance();
      if(clearance!==null)minClearance=Math.min(minClearance,clearance);
      if(blocked) {
        assert.ok(clearance>0,'guard never enters neighbour operation envelope');
        assert.ok((train.journey.position-f.boundary)*c.direction<0,'forbidden joint never crossed');
        if(!train.velocity)break;
      } else if(p.edge!==c.port.edge){crossed=true;break;}
    }
    assert.ok(tick<600,'bounded stop or crossing');
    let correction=null;
    if(blocked) {
      assert.equal(train.guard.reason,'misaligned');assert.equal(train.guard.protectionInset,30);
      assert.equal(train.velocity,0);assert.equal(session.getSafety(neighbour).kind,'unlocked');
      correction=session.requestToggle(neighbour,'device');assert.equal(correction.changed,true);
      const position=train.journey.position;
      for(let i=0;i<10;i++)stepRailway(context,DT);
      assert.equal(train.journey.position,position,'no automatic restart');
      f.commands.setSpeed(0,20);
      for(let i=0;i<600&&f.leading().edge===c.port.edge;i++)stepRailway(context,DT);
      assert.notEqual(f.leading().edge,c.port.edge,'explicit rearm crosses corrected boundary');
    } else assert.ok(crossed,'aligned route remains traversable');
    assert.equal(session.getSafety(neighbour).kind,'occupied','entry retains full occupation lock');
    for(const origin of ['panel','device'])assert.equal(session.requestToggle(neighbour,origin).reason,'occupied');
    return {...c,current:f.current,neighbour,blocked,ticks:tick+1,minClearance,
      requests,correction,status:'PASS'};
  } finally {f.dispose();}
}

export function validateUnknownCase(c) {
  const f=sharedFixture(c);
  try {
    // Test the original core even without the session's stricter readiness gate.
    // UNKNOWN is supplied to the real router, never coerced to false by a test.
    const route=routing(f.session.network,id=>id===f.neighbour?null:f.states[id]);
    const context={...f.context,route};let minClearance=f.clearance();
    for(let tick=0;tick<100;tick++) {
      stepRailway(context,DT);
      assert.equal(f.train.guard.risk,'UNKNOWN');
      assert.ok(f.clearance()>0);minClearance=Math.min(minClearance,f.clearance());
    }
    assert.equal(f.train.velocity,0);assert.equal(f.train.guard.protectionInset,30);
    return {...c,unknown:f.neighbour,minClearance,status:'PASS_UNKNOWN_CORE'};
  } finally {f.dispose();}
}

export function runSharedMatrix() {
  const cases=['v06','legacy'].flatMap(sharedCases);
  const known=cases.map(validateSharedCase);
  const unknown=cases.filter(c=>!c.neighbourState).map(validateUnknownCase);
  return {runtimeAdmission:false,known,unknown,
    summary:{known:known.length,unknown:unknown.length,
      blocked:known.filter(c=>c.blocked).length,aligned:known.filter(c=>!c.blocked).length,
      minStoppedClearance:Math.min(...known.filter(c=>c.blocked).map(c=>c.minClearance))}};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const output=resolve(process.argv[2]??'work/r2a-f1');mkdirSync(output,{recursive:true});
  const result=runSharedMatrix();
  writeFileSync(resolve(output,'shared-matrix.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result.summary,null,2));
  if(process.argv.includes('--r2a-regression')) {
    const original=JSON.parse(readFileSync('docs/_active/scenario-v06/evidence/R2A/summary.json'));
    const project=(r,expected)=>Object.fromEntries(Object.keys(expected).map(k=>[k,k==='crossings'?r.crossings.length:r[k]]));
    const loops=original.loops.map(expected=>project(runLoopScenario(expected.name,expected.direction),expected));
    const consists=original.consists.map(expected=>project(runLoopScenario('C',expected.direction,[SHORT_LOCO,SHORT_CAR,SHORT_CAR]),expected));
    assert.deepEqual(loops,original.loops);assert.deepEqual(consists,original.consists);
    const dynamics=runDynamics().phases.map(p=>({phase:p.name,tick:p.tick,velocity:p.velocity,travel:p.travel,point:p.point}));
    assert.deepEqual(dynamics,original.dynamics);
    const protectedStops=[1,-1].map(direction=>{
      const r=runProtectedStop(direction);
      assert.equal(r.stopSafety.kind,'unlocked');assert.ok(r.clearance>30);
      return {direction,firstTick:r.firstIntervention.tick,stopTick:r.end.tick,
        inset:r.end.guard.protectionInset,jointClearance:r.clearance,
        stopSafety:r.stopSafety,retreatSamples:r.retreat.length,correction:r.correction};
    });
    const protection=runProtection();
    writeFileSync(resolve(output,'r2a-regression.json'),JSON.stringify({status:'PASS',loops,consists,
      dynamics,protectedStops,protection,lapsAndDynamicsIdentical:true},null,2)+'\n');
  }
}
