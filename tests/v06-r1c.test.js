import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {setTimeout as wait} from 'node:timers/promises';
import {createRailwaySession,replaceRailwaySession} from '../tools/scenario-v06/railway-session.js';
import {createNetwork} from '../src/network.js';
import {Journey,routing} from '../src/simulation.js';
import {createTurnoutRegistry} from '../src/turnout-registry.js';
import {createTurnoutModel} from '../src/turnout-routes.js';
import {createTurnoutCommands} from '../src/turnout-commands.js';
import {createSwitchTopology,traceJourney} from '../src/next-switch.js';
import {assessRailwayGuard,guardDecision} from '../src/railway-guard.js';
import {datasetSha256,sha256} from '../tools/scenario-v06/validate-r1a.js';

const bytes=readFileSync(new URL('../src/datasets/v06-r1a.json',import.meta.url));
const dimensions=[{length:40,width:16,front:22,rear:22}];
const states=(s,on=false)=>Object.fromEntries(s.registry.ids.map(id=>[id,on]));
const configured=profile=>{const s=createRailwaySession({profile});s.configureLabStates(states(s));return s;};
const fixture=(s,id=0,edge=s.spawnPlan.loops[0].candidate.edge)=>s.createLabTrainFixture({id,edge,s:s.network.edges[edge].length/2,vehicles:dimensions});
const snapshot=s=>JSON.stringify({specs:s.switchSpecs,trains:s.trains.map(t=>({position:t.journey.position,segments:t.journey.segments,travel:t.journey.travel}))});

test('R1C explicit selection, invalid artifact and mixed inputs never silently fall back',()=>{
  for(const profile of [undefined,null,'V06','default','__proto__'])assert.throws(()=>createRailwaySession({profile}),/Explicit/);
  assert.throws(()=>createRailwaySession({profile:'legacy',v06Bytes:bytes}),/Mixed/);
  for(const artifact of [Buffer.from('{}'),Buffer.concat([bytes,Buffer.from('\n')])])
    assert.throws(()=>createRailwaySession({profile:'v06',v06Bytes:artifact}),/checksum/);
  for(const mutate of [d=>{d.version=2;},d=>{d.schema='other';},d=>{d.controllers[0].initialState=false;},d=>{d.edges[0].points[0].x++;}]){
    const data=JSON.parse(bytes);mutate(data);
    assert.throws(()=>createRailwaySession({profile:'v06',v06Bytes:Buffer.from(JSON.stringify(data))}),/checksum/);
  }
});

for(const profile of ['legacy','v06']){
  test(`R1C ${profile}: coherent identity, factory, immutable topology and exact controllers`,()=>{
    const s=createRailwaySession({profile}),other=createRailwaySession({profile});
    assert.notEqual(s.identity.sessionId,other.identity.sessionId);
    assert.equal(s.identity.networkVersion,other.identity.networkVersion);
    assert.equal(s.registry.ownsNetwork(s.network),true);assert.equal(s.registry.ownsNetwork(other.network),false);
    assert.equal(s.admission.edges,profile==='legacy'?75:79);assert.equal(s.admission.deadEnds,profile==='legacy'?4:3);
    assert.equal(Object.keys(s.network.nodes).length,profile==='legacy'?70:74);
    assert.equal(s.registry.ids.length,profile==='legacy'?8:7);
    assert.deepEqual(s.registry.ids,s.network.controllers.map(c=>c.id));
    assert.equal(s.identity.datasetSha256,profile==='v06'?datasetSha256:sha256(readFileSync('src/canonical-layout.json')));
    assert.notEqual(s.network.metadata,other.network.metadata);assert.notEqual(s.network.controllers,other.network.controllers);
    assert.notEqual(s.network.edges[s.registry.controllers[0].internal[0]].points,other.network.edges[other.registry.controllers[0].internal[0]].points);
    assert.throws(()=>{s.network.controllers[0].ports.A='foreign';},TypeError);
    assert.throws(()=>{s.network.edges[s.registry.controllers[0].internal[0]].points[0].x++;},TypeError);
    assert.throws(()=>{s.switchSpecs[0].on=true;},TypeError);
    assert.equal(s.switchTopology.byControl.set,undefined);
    for(const c of s.registry.controllers){
      const site=s.switchTopology.byControl.get(c.id);assert.deepEqual(site.internal,c.internal);
      for(const edge of c.internal)assert.ok(site.protectedRanges.some(r=>r.edge===edge&&r.min===0&&r.max===s.network.edges[edge].length));
      assert.throws(()=>site.protectedRanges.pop(),TypeError);
    }
    s.dispose();other.dispose();
  });

  test(`R1C ${profile}: configuration is complete, strict boolean and atomic; no runtime admission`,()=>{
    const s=createRailwaySession({profile}),before=snapshot(s);
    for(const bad of [null,{},Object.assign(states(s),{extra:false}),Object.fromEntries(Object.entries(states(s)).slice(1))]){
      assert.throws(()=>s.configureLabStates(bad));assert.equal(snapshot(s),before);
    }
    for(const value of [null,undefined,NaN,0,1,'false',{}]){
      const bad=states(s);bad[s.registry.ids[0]]=value;
      assert.throws(()=>s.configureLabStates(bad),/boolean/);assert.equal(snapshot(s),before);
    }
    s.configureLabStates(states(s));assert.equal(s.readiness().labReady,true);
    assert.equal(s.readiness().runtimeAdmission,false);
    fixture(s);assert.throws(()=>s.configureLabStates(states(s,true)),/empty/);s.dispose();
  });

  test(`R1C ${profile}: scoped router and preview match existing algorithms for known states`,()=>{
    const s=configured(profile),raw=routing(s.network,id=>s.switchSpecs.find(c=>c.id===id)?.on);
    let checked=0;
    for(const e of Object.values(s.network.edges))for(const node of [e.from,e.to]){
      const choices=s.network.nodes[node].filter(p=>p.edge!==e.id);
      assert.deepEqual(s.route(e.id,choices),raw(e.id,choices));assert.equal(s.route.reason(e.id,choices),raw.reason(e.id,choices));checked++;
    }
    assert.equal(checked,profile==='v06'?158:150);
    const t=fixture(s),before=snapshot(s);
    const expected=traceJourney(s.network,createSwitchTopology(s.network,s.switchSpecs),t.journey,1,0,raw,600);
    assert.deepEqual(s.preview(t),expected);assert.equal(snapshot(s),before);s.dispose();
  });

  test(`R1C ${profile}: protected command re-reads occupancy and reservations across surfaces`,()=>{
    const s=configured(profile),c=s.registry.get('WX-A'),before=snapshot(s);
    assert.equal(s.getSafety(c.id).kind,'unlocked');
    assert.equal(s.requestToggle(c.id,'panel').changed,true);
    assert.notEqual(snapshot(s),before);
    const t=fixture(s,0,c.internal[0]),occupied=snapshot(s);
    for(const origin of ['device','panel'])assert.equal(s.requestToggle(c.id,origin).reason,'occupied');
    assert.equal(snapshot(s),occupied);
    const other=s.registry.get('WX-B'),r=s.reserve(t,{edge:other.internal[0],min:0,max:10});
    assert.equal(s.requestToggle(other.id,'device').reason,'occupied');
    assert.equal(s.releaseReservation(r),true);assert.equal(s.requestToggle(other.id,'panel').changed,true);s.dispose();
  });

  test(`R1C ${profile}: parked vehicle occupancy locks the complete WX and is destroyed at reset`,()=>{
    const s=configured(profile),c=s.registry.get('WX-A'),t=fixture(s,0,c.internal[2]);
    s.parkLabFixture(t);assert.equal(s.trains.length,0);assert.equal(s.detached.length,1);
    assert.equal(s.getSafety(c.id).kind,'occupied');assert.equal(s.requestToggle(c.id,'device').changed,false);
    assert.ok(s.occupancy().occupied.some(r=>r.edge===c.internal[2]));
    const next=replaceRailwaySession(s,{profile});assert.equal(next.detached.length,0);assert.equal(next.occupancy().occupied.length,0);next.dispose();
  });

  test(`R1C ${profile}: guard delegates to existing braking and never moves Journey`,()=>{
    const s=configured(profile),t=fixture(s),before=snapshot(s);
    assert.deepEqual(s.assessGuard(t),assessRailwayGuard(t,t.journey,s.route,1/60));
    assert.equal(snapshot(s),before);
    for(const risk of ['UNKNOWN','UNSAFE']){
      const d=guardDecision({risk,distance:0},1,100,1/60);assert.equal(d.delta,0);assert.equal(d.velocity,0);
    }
    s.dispose();
  });

  test(`R1C ${profile}: each loop has a measurable static candidate, geometry and full consist fit`,()=>{
    const s=configured(profile);
    assert.deepEqual(s.spawnPlan.loops.map(l=>l.id),['C','B','A']);
    for(const loop of s.spawnPlan.loops){
      const c=loop.candidate,e=s.network.edges[c.edge];
      assert.ok(s.network.mainLoops[loop.lane].segments.some(p=>p.id===c.edge&&p.sign===c.sign));
      assert.equal(e.switchId,undefined);assert.ok(!e.hiddenIntervalsMm?.length);
      assert.equal(loop.stopAnchor,null);assert.equal(loop.usefulCapacityMm,null);assert.equal(loop.foulingCertified,false);
      const result=s.spawnLabFixture({id:loop.lane,target:loop.id,scope:'laboratory',vehicles:dimensions});
      assert.equal(result.ok,true);assert.equal(result.runtimeAdmission,false);
      assert.equal(result.train.journey.network,s.network);assert.equal(result.train.journey.locate().edge,c.edge);
      assert.ok(Math.abs(result.train.journey.locate().s-c.s)<1e-7);
      assert.equal(result.train.journey.segments[0].sign,c.sign);assert.equal(result.train.journey.travel,0);
      assert.ok(result.extent.min>c.window.min&&result.extent.max<c.window.max);
    }
    assert.equal(s.trains.length,3);s.dispose();
  });

  test(`R1C ${profile}: missing dimensions, long consists, unspecified and operational spawns fail closed`,()=>{
    const s=configured(profile),before=snapshot(s);
    for(const target of ['N07','N16','scalo','fourth-train','triangle','T47','unknown'])
      assert.equal(s.checkSpawn({target,vehicles:dimensions,scope:'laboratory'}).reason,'missing-approved-anchor-capacity-fouling');
    for(const scope of [undefined,'operational','game'])assert.equal(s.checkSpawn({target:'A',vehicles:dimensions,scope}).ok,false);
    for(const vehicles of [undefined,[],[{}],[{length:40,width:NaN,front:22,rear:22}],
      [{length:40,width:20,front:5,rear:5}]])assert.equal(s.checkSpawn({target:'A',scope:'laboratory',vehicles}).reason,'unknown-consist-envelope');
    const long=Array.from({length:6},()=>({length:165,width:18,front:84,rear:84}));
    assert.equal(s.checkSpawn({target:'A',scope:'laboratory',vehicles:long}).reason,'consist-outside-lab-window');
    assert.equal(snapshot(s),before);s.dispose();
  });

  test(`R1C ${profile}: repeated spawn and reserved candidate are refused without mutating fleet`,()=>{
    const s=configured(profile),request={id:0,target:'A',vehicles:dimensions,scope:'laboratory'};
    const {train}=s.spawnLabFixture(request),before=snapshot(s);
    assert.equal(s.spawnLabFixture({...request,id:1}).reason,'occupied-or-reserved');assert.equal(snapshot(s),before);
    const c=s.spawnPlan.loops[1].candidate,r=s.reserve(train,{edge:c.edge,min:c.s-25,max:c.s+25});
    assert.equal(s.checkSpawn({...request,target:'B'}).reason,'occupied-or-reserved');s.releaseReservation(r);s.dispose();
  });

  test(`R1C ${profile}: controller model caches, callback and diagnostic data have session ownership`,()=>{
    const a=configured(profile),b=configured(profile),view=a.readTurnout('WX-A');
    assert.equal(a.readTurnout('WX-A').activePaths,view.activePaths);
    assert.notEqual(b.readTurnout('WX-A').activePaths,view.activePaths);
    let calls=0;const off=a.on('switch-changed',()=>calls++),data={nested:{count:1}};
    a.cache.set('preview',data);data.nested.count=99;assert.equal(a.cache.get('preview').nested.count,1);
    assert.equal(b.cache.get('preview'),undefined);b.requestToggle('WX-A','panel');assert.equal(calls,0);
    a.requestToggle('WX-A','device');assert.equal(calls,1);assert.equal(a.cache.size,0);
    off();a.requestToggle('WX-A','panel');assert.equal(calls,1);a.dispose();b.dispose();
  });
}

test('R1C V06 starts with seven UNKNOWN states: no route, throw, spawn or safe guard',()=>{
  const s=createRailwaySession({profile:'v06'}),before=snapshot(s);
  assert.equal(s.registry.ids.length,7);assert.ok(s.switchSpecs.every(s=>s.on===null));
  for(const c of s.registry.controllers){
    assert.equal(s.readTurnout(c.id).routeStatus,'UNKNOWN');assert.equal(s.getSafety(c.id).blocked,true);
    for(const origin of ['panel','device'])assert.equal(s.requestToggle(c.id,origin).changed,false);
    for(const node of Object.values(c.ports))for(const p of s.network.nodes[node]){
      const choices=s.network.nodes[node].filter(q=>p.edge!==q.edge);
      assert.equal(s.route(p.edge,choices),null);assert.equal(s.route.reason(p.edge,choices),'unknown-control');
    }
  }
  assert.equal(snapshot(s),before);assert.equal(s.checkSpawn({target:'A',scope:'laboratory',vehicles:dimensions}).ok,false);
  const t=fixture(s);assert.deepEqual(s.assessGuard(t),{risk:'UNKNOWN',reason:'unknown-control',distance:0});s.dispose();
});

test('R1C shared WX names never permit registry, specs, Journey or reservation cross-instance reuse',()=>{
  const a=configured('legacy'),b=configured('v06'),c=configured('v06'),ta=fixture(a),tb=fixture(b),tc=fixture(c);
  for(const [one,other,foreign] of [[a,b,tb],[b,a,ta],[b,c,tc]]){
    assert.throws(()=>createTurnoutModel(one.network,other.registry),/selected network/);
    assert.throws(()=>one.preview(foreign),/Foreign/);assert.throws(()=>one.assessGuard(foreign),/Foreign/);
    assert.throws(()=>one.reserve(foreign,{edge:one.registry.get('WX-A').internal[0],min:0,max:1}),/Foreign/);
    const mixed=createTurnoutCommands({registry:one.registry,switchSpecs:one.switchSpecs,trains:[foreign],route:one.route,getSafety:()=>({blocked:false,kind:'unlocked'})});
    assert.equal(mixed.requestToggle('WX-A','panel').reason,'invalid-profile');
  }
  for(const s of [a,b,c])s.dispose();
});

test('R1C identity violation fails safety, command, guard and reset closed without reconciliation',()=>{
  const a=configured('v06'),b=configured('v06'),ta=fixture(a),tb=fixture(b),original=ta.journey;
  ta.journey=tb.journey;
  assert.equal(a.readiness().labReady,false);assert.equal(a.getSafety('WX-A').blocked,true);
  assert.equal(a.requestToggle('WX-A','panel').reason,'invalid-profile');
  assert.throws(()=>a.assessGuard(tb),/Foreign/);assert.throws(()=>a.assessGuard(ta),/Foreign/);
  assert.throws(()=>a.occupancy(),/Foreign/);assert.throws(()=>replaceRailwaySession(a,{profile:'legacy'}),/foreign fleet/);
  ta.journey=original;a.dispose();b.dispose();
});

test('R1C Legacy → V06 → Legacy rebuilds everything and revokes stale entry points',async()=>{
  const a=configured('legacy'),ta=fixture(a),first=snapshot(a),oldRoute=a.route;
  a.requestToggle('WX-A','panel');a.reserve(ta,{edge:a.registry.get('WX-A').internal[0],min:0,max:1});
  a.cache.set('id',{wx:'WX-A'});let fired=0,disposed=0;
  a.on('switch-changed',()=>fired++);a.schedule(()=>fired++,10);a.trackCleanup(()=>disposed++);
  const b=replaceRailwaySession(a,{profile:'v06'});
  assert.equal(a.disposed,true);assert.equal(disposed,1);assert.ok(b.switchSpecs.every(s=>s.on===null));
  assert.deepEqual(a.resources(),{trains:0,detached:0,reservations:0,cache:0,listeners:0,timers:0,cleanups:0});
  assert.equal(a.requestToggle('WX-A','device').reason,'session-disposed');assert.equal(oldRoute('anything',[]),null);
  for(const call of [()=>a.preview(ta),()=>a.readTurnout('WX-A'),()=>a.cache.get('id'),()=>a.configureLabStates(states(a)),()=>a.schedule(()=>{},1)])assert.throws(call,/disposed/);
  b.configureLabStates(states(b));const tb=fixture(b);b.requestToggle('WX-A','device');b.cache.set('id',{wx:'WX-A'});
  const c=replaceRailwaySession(b,{profile:'legacy'}),tc=fixture(c);
  assert.equal(snapshot(c),first);assert.notEqual(c.identity.sessionId,a.identity.sessionId);
  assert.notEqual(c.network,a.network);assert.notEqual(c.registry,a.registry);assert.notEqual(tc.journey,ta.journey);
  assert.notEqual(tc.journey,tb.journey);assert.notEqual(c.route,oldRoute);assert.equal(c.cache.size,0);
  assert.equal(c.occupancy().reservations.length,0);assert.equal(c.readiness().runtimeAdmission,false);
  await wait(25);assert.equal(fired,0);a.dispose();b.dispose();assert.equal(disposed,1);c.dispose();
});

test('R1C invalid replacement artifact retains the complete old session',()=>{
  const a=configured('legacy'),t=fixture(a),before=snapshot(a);let cleaned=0;a.trackCleanup(()=>cleaned++);
  assert.throws(()=>replaceRailwaySession(a,{profile:'v06',v06Bytes:Buffer.from('{}')}),/checksum/);
  assert.equal(a.disposed,false);assert.equal(cleaned,0);assert.equal(snapshot(a),before);assert.equal(a.trains[0],t);a.dispose();
});

test('R1C movement, throttle, pending speed and UNKNOWN motion forbid swap/disposal',()=>{
  const s=configured('v06'),t=fixture(s),before=snapshot(s);
  for(const key of ['speed','velocity','requestedSpeed'])for(const value of [1,-1,NaN,Infinity,undefined]){
    t[key]=value;
    assert.throws(()=>replaceRailwaySession(s,{profile:'legacy'}),/Moving, unknown/);
    assert.throws(()=>s.dispose(),/Moving, unknown/);assert.equal(s.disposed,false);t[key]=0;
  }
  assert.equal(snapshot(s),before);s.dispose();
});

test('R1C cleanup failure cannot retain timers, callbacks, cache, reservations or ownership',async()=>{
  const s=configured('legacy');let fired=0,cleaned=0;s.schedule(()=>fired++,10);
  s.trackCleanup(()=>{throw Error('synthetic cleanup error');});s.trackCleanup(()=>cleaned++);
  const next=replaceRailwaySession(s,{profile:'v06'});
  assert.deepEqual(s.cleanupErrors,['synthetic cleanup error']);assert.equal(cleaned,1);
  assert.equal(s.resources().timers,0);assert.equal(next.resources().cleanups,0);
  await wait(25);assert.equal(fired,0);next.dispose();
});

test('R1C triangle preserves two legs, stop/clear/throw/reverse and refuses branch-to-branch transit',()=>{
  const s=configured('v06'),m=s.network.metadata.manoeuvres.triangle;
  assert.equal(m.runtimeAdmission,false);assert.equal(m.stopAnchor,null);assert.ok(m.requiredEvent);
  const c=s.registry.get('V06-N07'),b=s.network.edges[c.paths.find(p=>[p.fromPort,p.toPort].includes('B')).edge],d=s.network.edges[c.paths.find(p=>[p.fromPort,p.toPort].includes('C')).edge];
  for(const on of [false,true]){
    s.configureLabStates({...states(s),'V06-N07':on});
    for(const [incoming,outgoing] of [[b,d],[d,b]])assert.equal(s.route(incoming.id,[{edge:outgoing.id,end:0}]),null);
  }
  assert.equal(s.checkSpawn({target:'triangle',scope:'laboratory',vehicles:dimensions}).ok,false);s.dispose();
});

test('R1C default legacy factory and its data remain byte-equivalent after lab sessions',()=>{
  const before=JSON.stringify(createNetwork()),hash=sha256(before);
  assert.equal(hash,'ec5c0309f3b7aee5e8af9a996b0bd3b5b3bd03d31ee732cc75286bc2b0904413');
  for(const profile of ['legacy','v06','legacy']){
    const s=configured(profile);fixture(s);s.requestToggle('WX-A','device');s.dispose();
  }
  assert.equal(JSON.stringify(createNetwork()),before);
  assert.equal(createTurnoutRegistry(createNetwork()).ids.length,8);
});

test('R1C unknown/invalid motion refuses safety and commands without changing state',()=>{
  const s=configured('v06'),t=fixture(s),before=snapshot(s);
  for(const [key,values] of [['speed',[-1,101,NaN]],['requestedSpeed',[-1,101,undefined]],['velocity',[151,Infinity]],['dir',[0,null]]]){
    const initial=t[key];
    for(const value of values){t[key]=value;
      assert.equal(s.getSafety('WX-A').kind,'unknown');assert.equal(s.requestToggle('WX-A','panel').changed,false);
      assert.equal(s.assessGuard(t).risk,'UNKNOWN');assert.equal(s.readiness().labReady,false);
    }
    t[key]=initial;
  }
  assert.equal(snapshot(s),before);s.dispose();
});

test('R1C geometric envelopes refuse a wide vehicle across distinct loop edge IDs',()=>{
  const s=configured('v06');s.spawnLabFixture({id:0,target:'C',scope:'laboratory',vehicles:dimensions});
  const wide=[{length:40,width:120,front:22,rear:22}],before=snapshot(s);
  assert.equal(s.checkSpawn({id:1,target:'B',scope:'laboratory',vehicles:wide}).reason,'vehicle-envelope-conflict');
  assert.equal(snapshot(s),before);s.dispose();
});

test('R1C fourth train cannot gain an invented slot by requesting a configured loop',()=>{
  const s=configured('v06');
  for(const id of [3,4,-1,NaN,1.5])assert.equal(s.spawnLabFixture({id,target:'A',scope:'laboratory',vehicles:dimensions}).reason,'unconfigured-train-slot');
  assert.equal(s.trains.length,0);s.dispose();
});

test('R1C live session timers, cancellation and listeners remain isolated',async()=>{
  const a=configured('legacy'),b=configured('v06');let ac=0,bc=0;
  a.on('switch-changed',()=>ac++);b.on('switch-changed',()=>bc++);
  const cancel=a.schedule(()=>ac+=100,5);cancel();b.schedule(()=>bc+=10,5);
  b.requestToggle('WX-A','panel');await wait(20);
  assert.equal(ac,0);assert.equal(bc,11);assert.equal(a.resources().timers,0);assert.equal(b.resources().timers,0);
  a.dispose();b.dispose();
});

test('R1C reservation bounds and owner identity are checked before guard or spawn',()=>{
  const s=configured('v06'),t=fixture(s),e=s.network.edges[s.spawnPlan.loops[1].candidate.edge];
  for(const record of [{edge:e.id,min:-1,max:1},{edge:e.id,min:0,max:Infinity},{edge:e.id,min:2,max:1},
    {edge:e.id,min:0,max:e.length+1},{edge:'T47',min:0,max:1},{edge:'__proto__',min:0,max:1}])assert.throws(()=>s.reserve(t,record),/Invalid reservation/);
  assert.equal(s.resources().reservations,0);s.dispose();
});
