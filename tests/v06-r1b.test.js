import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createNetwork,loopPosition} from '../src/network.js';
import {routing,Journey} from '../src/simulation.js';
import {createTurnoutRegistry,isTurnoutId,TURNOUT_IDS} from '../src/turnout-registry.js';
import {createTurnoutModel} from '../src/turnout-routes.js';
import {createTurnoutCommands} from '../src/turnout-commands.js';
import {createSwitchTopology} from '../src/next-switch.js';
import {deriveSwitchAssistance,layoutFor} from '../src/railway-state.js';
import {validateArtifact,oracle} from '../tools/scenario-v06/validate-r1a.js';

const bytes=readFileSync('src/datasets/v06-r1a.json');
validateArtifact(bytes); // Independent pinned admission precedes registry construction.
const dataset=JSON.parse(bytes), unlocked={blocked:false,kind:'unlocked'};
const profiles=[['legacy',undefined,['Y-IN','Y-R1','Y-R2','Y-3','Y-4','Y-2','WX-A','WX-B']],
  ['V06-R1A',dataset,['V06-C07','V06-C12','V06-C13','V06-N07','V06-N14','WX-A','WX-B']]];
const vehicle=()=>({userData:{stock:{length:65,width:20},couplers:{front:{x:34.1},back:{x:-34.1}}}});
function fixture(data) {
  const network=createNetwork(data),registry=createTurnoutRegistry(network),switchSpecs=registry.createSpecs();
  switchSpecs.forEach(c=>{c.on=false;}); // Lab-only known state; V06 initialState stays null in data/API.
  const route=routing(network,id=>switchSpecs.find(c=>c.id===id)?.on);
  const train=(edge,s)=>({id:0,name:'lab train',group:vehicle(),carObjs:[],cars:0,journey:new Journey(network,edge,s),
    dir:1,velocity:0,speed:0,odometer:0});
  const trains=[0,1,2].map((lane,i)=>{const p=loopPosition(network,lane,.5);return {...train(p.edge,p.s),id:i};});
  return {network,registry,switchSpecs,route,trains,train,detached:[],selected:0,
    switchTopology:createSwitchTopology(network,switchSpecs)};
}
const snapshot=c=>JSON.stringify({specs:c.switchSpecs,trains:c.trains.map(t=>({position:t.journey.position,
  segments:t.journey.segments,speed:t.speed,velocity:t.velocity,dir:t.dir,odometer:t.odometer}))});
const commands=c=>createTurnoutCommands({...c,getSafety:id=>deriveSwitchAssistance({...c,tracePoints:false}).safetyByControl.get(id)});

for(const [profile,data,ids] of profiles) {
  test(`R1B ${profile}: registry identity, source order, ports, boolean states and immutable unit paths`,()=>{
    const network=createNetwork(data),registry=createTurnoutRegistry(network);
    assert.equal(registry.profileId,profile);assert.deepEqual(registry.ids,ids);
    assert.equal(registry.controllers.filter(c=>c.kind==='cross').length,2);
    assert.equal(registry.controllers.filter(c=>c.kind==='single').length,ids.length-2);
    registry.controllers.forEach((c,i)=>{
      const original=network.controllers[i];
      assert.equal(c.order,i);assert.equal(c.profileId,profile);assert.deepEqual(c.ports,original.ports);
      assert.deepEqual(c.internal,original.internal);assert.deepEqual(c.allowedStates,[false,true]);
      assert.equal(registry.get(c.id),c);assert.equal(isTurnoutId(c.id,registry),true);
      c.paths.forEach(p=>{assert.equal(network.edges[p.edge].requiredState,p.requiredState);
        assert.equal(network.edges[p.edge].from,c.ports[p.fromPort]);assert.equal(network.edges[p.edge].to,c.ports[p.toPort]);});
      assert.throws(()=>{c.ports.A='invented';},TypeError);
      assert.throws(()=>c.internal.push('invented'),TypeError);
    });
    const specs=registry.createSpecs();assert.ok(registry.matchesSpecs(specs));
    assert.ok(specs.every(c=>c.on===(profile==='legacy'?false:null)));
    assert.throws(()=>registry.ids.push('invented'),TypeError);
    for(const id of [null,NaN,0,{},'__proto__','constructor','WX-C',profile==='legacy'?'V06-C12':'Y-IN']){
      assert.equal(registry.has(id),false);assert.equal(isTurnoutId(id,registry),false);assert.equal(registry.get(id),null);
    }
  });

  test(`R1B ${profile}: real network entrances for every global configuration and both directions`,()=>{
    const c=fixture(data),model=createTurnoutModel(c.network,c.registry);let count=0,blocks=0;
    for(let mask=0;mask<2**ids.length;mask++){
      c.switchSpecs.forEach((s,i)=>{s.on=Boolean(mask&(1<<i));});
      for(const unit of c.registry.controllers)for(const [port,node] of Object.entries(unit.ports)){
        for(const incoming of c.network.nodes[node].filter(p=>!unit.internal.includes(p.edge))){
          const choices=c.network.nodes[node].filter(p=>p.edge!==incoming.edge),next=c.route(incoming.edge,choices);
          const v=model.read(unit.id,c.switchSpecs[unit.order].on,{incomingPort:port,incomingEdge:incoming.edge,incomingEnd:incoming.end,choose:c.route});
          assert.equal(v.unknown,false,`${mask}/${unit.id}/${port}`);assert.equal(v.approachScope,'NETWORK');
          assert.equal(v.hazardStatus,'UNKNOWN');assert.equal(v.operationLock,'UNKNOWN');
          if(next){assert.equal(v.approach.status,'ROUTABLE');assert.equal(v.approach.edge,next.edge);
            assert.equal(v.approach.sign,next.end?-1:1);}
          else {assert.equal(v.approach.status,'BLOCKED');blocks++;}count++;
        }
      }
    }
    assert.equal(count,profile==='legacy'?7168:3200);assert.ok(blocks>0);
  });

  for(const id of ids)test(`R1B ${profile}/${id}: command parity, both states and surfaces, reconciliation after permission only`,()=>{
    for(const origin of ['panel','device'])for(const on of [false,true]){
      const current=fixture(data),expected=fixture(data);
      for(const c of [current,expected])c.switchSpecs.find(s=>s.id===id).on=on;
      let calls=0;const identities=current.trains.map(t=>[t,t.journey]);
      for(const t of current.trains){const reconcile=t.journey.reconcile.bind(t.journey);t.journey.reconcile=(...args)=>{
        assert.equal(current.switchSpecs.find(s=>s.id===id).on,!on);assert.equal(calls,1);return reconcile(...args);};}
      const cmd=createTurnoutCommands({...current,getSafety:key=>{calls++;assert.equal(key,id);
        assert.equal(current.switchSpecs.find(s=>s.id===id).on,on);return unlocked;}});
      assert.deepEqual(cmd.requestToggle(id,origin),{changed:true,controlId:id,origin,on:!on});
      expected.switchSpecs.find(s=>s.id===id).on=!on;
      for(const t of expected.trains)t.journey.reconcile(layoutFor(t).tail,t.group.userData.couplers.front.x,expected.route);
      assert.equal(snapshot(current),snapshot(expected));
      current.trains.forEach((t,i)=>{assert.equal(t,identities[i][0]);assert.equal(t.journey,identities[i][1]);});
    }
  });

  test(`R1B ${profile}: invalid IDs/origins, nonboolean state and malformed safety fail closed without reconciliation`,()=>{
    const c=fixture(data);let reads=0,reconciles=0;
    c.trains.forEach(t=>{t.journey.reconcile=()=>reconciles++;});
    const cmd=createTurnoutCommands({...c,getSafety:()=>{reads++;return unlocked;}}),before=snapshot(c);
    for(const id of [NaN,Infinity,0,null,undefined,{},'__proto__','WX-C',profile==='legacy'?'V06-C07':'Y-4'])
      assert.equal(cmd.requestToggle(id,'panel').reason,'invalid-control');
    for(const id of ids)for(const origin of [undefined,null,NaN,'keyboard',{},'diagnostics'])
      assert.equal(cmd.requestToggle(id,origin).reason,'invalid-origin');
    assert.equal(snapshot(c),before);assert.equal(reads,0);
    for(const id of ids)for(const state of [null,undefined,NaN,Infinity,0,1,'false',{}]){
      c.switchSpecs.find(s=>s.id===id).on=state;const before=snapshot(c);
      assert.equal(cmd.requestToggle(id,'device').reason,'unknown-state');assert.equal(snapshot(c),before);
    }
    assert.equal(reads,0);c.switchSpecs.forEach(s=>{s.on=false;});
    for(const safety of [undefined,null,{}, {blocked:true,kind:'occupied'},{blocked:true,kind:'approaching'},
      {blocked:true,kind:'unknown'},{blocked:0,kind:'unlocked'},{blocked:NaN,kind:'unlocked'},{blocked:false,kind:'unknown'}]){
      const blocked=createTurnoutCommands({...c,getSafety:()=>safety}),before=snapshot(c);
      for(const id of ids)for(const origin of ['panel','device'])assert.equal(blocked.requestToggle(id,origin).changed,false);
      assert.equal(snapshot(c),before);
    }
    assert.equal(reconciles,0);
  });

  test(`R1B ${profile}: every internal arc, including inactive WX diagonals, locks the entire unit`,()=>{
    for(const id of ids)for(const on of [false,true]){
      const c=fixture(data),unit=c.registry.get(id),site=c.switchTopology.byControl.get(id);
      assert.equal(site.internal.length,unit.internal.length);
      for(const arc of unit.internal)for(const detached of [false,true]){
        c.switchSpecs.find(s=>s.id===id).on=on;
        const edge=c.network.edges[arc],t=c.train(arc,edge.length/2);
        if(detached){const p=loopPosition(c.network,0,.5);c.trains=[c.train(p.edge,p.s)];c.detached=[{journey:t.journey,group:t.group}];}
        else {c.trains=[t];c.detached=[];}
        const before=snapshot(c),cmd=commands(c);
        assert.equal(deriveSwitchAssistance(c).safetyByControl.get(id).kind,'occupied');
        for(const origin of ['panel','device'])assert.equal(cmd.requestToggle(id,origin).reason,'occupied');
        assert.equal(snapshot(c),before);
        assert.ok(site.protectedRanges.some(r=>r.edge===arc&&r.min===0&&r.max===edge.length));
      }
    }
  });

  test(`R1B ${profile}: every port and actual neighbour blocks approach on both surfaces using the existing guard`,()=>{
    for(const id of ids){
      const c=fixture(data),unit=c.registry.get(id);
      for(const on of [false,true])for(const [port,node] of Object.entries(unit.ports))for(const incoming of c.network.nodes[node].filter(p=>!unit.internal.includes(p.edge))){
        if(unit.kind==='single'&&(port==='B'&&on||port==='C'&&!on))continue;
        c.switchSpecs.forEach(s=>{s.on=false;});
        c.switchSpecs.find(s=>s.id===id).on=on; // align the target entrance, including adjacent units
        const edge=c.network.edges[incoming.edge];if(edge.switchId)c.switchSpecs.find(s=>s.id===edge.switchId).on=edge.requiredState;
        // Remain outside the 30 mm protected lead plus vehicle extent; within
        // the existing speed-dependent approach margin. No safety constants changed.
        if(edge.length<70){
          const away=c.network.nodes[incoming.end?edge.from:edge.to].filter(p=>p.edge!==edge.id);
          if(!c.route(edge.id,away))for(const p of away){
            const next=c.network.edges[p.edge];
            if(next.switchId&&next.switchId!==id&&next.switchId!==edge.switchId)
              c.switchSpecs.find(s=>s.id===next.switchId).on=next.requiredState;
            if(c.route(edge.id,away))break;
          }
        }
        const distance=70, t=c.train(edge.id,incoming.end?edge.length:0);
        t.dir=incoming.end?1:-1;
        assert.equal(t.journey.move(-t.dir*distance,0,c.route),true,`${id}/${incoming.edge}: outward fixture`);
        t.velocity=t.dir*150;t.speed=100;c.trains=[t];
        const before=snapshot(c),cmd=commands(c);
        assert.equal(deriveSwitchAssistance(c).safetyByControl.get(id).kind,'approaching',`${id}/${incoming.edge}`);
        for(const origin of ['panel','device'])assert.equal(cmd.requestToggle(id,origin).reason,'approaching');
        assert.equal(snapshot(c),before);
      }
    }
  });

  test(`R1B ${profile}: consecutive cross-surface commands read fresh engine occupancy and approach`,()=>{
    for(const order of [['panel','device'],['device','panel']])for(const kind of ['occupied','approaching','unknown']){
      const c=fixture(data),unit=c.registry.get('WX-A');c.trains=[];
      let reads=0,safety=unlocked;
      const cmd=createTurnoutCommands({...c,getSafety:id=>{reads++;return safety;}});
      assert.equal(cmd.requestToggle(unit.id,order[0]).changed,true);
      if(kind==='occupied'){
        const edge=c.network.edges[unit.internal[0]];c.trains.push(c.train(edge.id,edge.length/2));
        safety=deriveSwitchAssistance(c).safetyByControl.get(unit.id);
      }else if(kind==='approaching'){
        const incoming=c.network.nodes[unit.ports.UL].find(p=>!unit.internal.includes(p.edge)),edge=c.network.edges[incoming.edge];
        const t=c.train(edge.id,incoming.end?edge.length:0);t.dir=incoming.end?1:-1;
        assert.equal(t.journey.move(-t.dir*70,0,c.route),true);t.velocity=150*t.dir;c.trains.push(t);
        safety=deriveSwitchAssistance(c).safetyByControl.get(unit.id);
      }else safety={blocked:true,kind:'unknown'};
      assert.equal(safety.kind,kind);const before=snapshot(c);
      assert.equal(cmd.requestToggle(unit.id,order[1]).changed,false);assert.equal(snapshot(c),before);assert.equal(reads,2);
    }
  });

  test(`R1B ${profile}: UNKNOWN raw incoming/target states, ambiguous results and invalid entry contracts stay UNKNOWN`,()=>{
    const c=fixture(data),model=createTurnoutModel(c.network,c.registry);
    for(const unit of c.registry.controllers){
      for(const state of [null,undefined,NaN,Infinity,0,1,'false',{}]){
        const v=model.read(unit.id,state,{incomingPort:Object.keys(unit.ports)[0]});
        assert.equal(v.routeStatus,'UNKNOWN');assert.deepEqual(v.activePaths,[]);assert.equal(v.approach.status,'UNKNOWN');
      }
      for(const port of ['__proto__','constructor','',NaN,0])assert.equal(model.read(unit.id,false,{incomingPort:port}).unknown,true);
      for(const node of Object.values(unit.ports))for(const incoming of c.network.nodes[node].filter(p=>!unit.internal.includes(p.edge))){
        const raw=c.network.edges[incoming.edge],unknownIds=[unit.id,...raw.switchId?[raw.switchId]:[]];
        for(const id of unknownIds)for(const state of [null,undefined,NaN,0,'false']){
          const s=c.switchSpecs.find(s=>s.id===id);s.on=state;
          const v=model.read(unit.id,false,{incomingEdge:raw.id,incomingEnd:incoming.end,choose:c.route});
          assert.equal(v.unknown,true);assert.deepEqual(v.activePaths,[]);assert.equal(v.approach.status,'UNKNOWN');s.on=false;
        }
        for(const choose of [undefined,Object.assign(()=>null,{reason:()=> 'ambiguous'}),()=>({edge:'invented',end:0})]){
          assert.equal(model.read(unit.id,false,{incomingEdge:raw.id,incomingEnd:incoming.end,choose}).unknown,true);
        }
      }
    }
  });

  test(`R1B ${profile}: actual uncertain approach snapshot and safety callback failure never authorize a command`,()=>{
    const c=fixture(data),unit=c.registry.get('WX-A'),incoming=c.network.nodes[unit.ports.UL].find(p=>!unit.internal.includes(p.edge)),edge=c.network.edges[incoming.edge];
    const t=c.train(edge.id,incoming.end?edge.length-10:10);t.dir=incoming.end?1:-1;t.velocity=t.dir*150;
    // A very short lab body isolates uncertainty from the 30 mm lead occupancy.
    t.group.userData.couplers={front:{x:1},back:{x:-1}};
    t.journey=new Journey(c.network,edge.id,incoming.end?Math.max(1,edge.length-40):40);
    c.trains=[t];c.route=Object.assign(()=>null,{reason:()=> 'ambiguous'});
    assert.equal(deriveSwitchAssistance(c).safetyByControl.get(unit.id).kind,'unknown');
    const before=snapshot(c),cmd=commands(c);
    for(const origin of ['panel','device'])assert.equal(cmd.requestToggle(unit.id,origin).reason,'unknown');
    assert.equal(snapshot(c),before);
    const throwing=createTurnoutCommands({...c,getSafety:()=>{throw Error('unavailable safety');}});
    assert.throws(()=>throwing.requestToggle(unit.id,'device'),/unavailable safety/);assert.equal(snapshot(c),before);
  });
}

for(const [name,rows] of [['WX 64',oracle.wx],['simple 90',oracle.simple]])test(`R1B V06 model versus independent frozen ${name} truth table`,()=>{
  const c=fixture(dataset),model=createTurnoutModel(c.network,c.registry);let allowed=0;
  for(const row of rows){
    const on=['X','S1'].includes(row.state),unit=c.registry.get(row.unit),local=model.read(row.unit,on,{incomingPort:row.entry});
    assert.equal(local.unknown,false);assert.equal(local.approach.status==='ROUTABLE'&&local.approach.outgoingPort===row.exit,row.allowed);
    if(row.allowed){allowed++;const reverse=model.read(row.unit,on,{incomingPort:row.exit}).approach;
      assert.equal(reverse.outgoingPort,row.entry);assert.equal(reverse.sign,-local.approach.sign);
      assert.deepEqual(reverse.points,[...local.approach.points].reverse());}
    for(const incoming of c.network.nodes[unit.ports[row.entry]].filter(p=>!unit.internal.includes(p.edge))){
      c.switchSpecs.forEach(s=>{s.on=s.id===row.unit?on:false;});const edge=c.network.edges[incoming.edge];
      if(edge.switchId)c.switchSpecs.find(s=>s.id===edge.switchId).on=edge.requiredState;
      const v=model.read(row.unit,on,{incomingEdge:edge.id,incomingEnd:incoming.end,choose:c.route});
      assert.equal(v.unknown,false);assert.equal(v.approach.status==='ROUTABLE'&&v.approach.outgoingPort===row.exit,row.allowed);
    }
  }
  assert.equal(allowed,name.startsWith('WX')?16:20);
});

test('R1B C12/C13 adjacent ports: both incoming alternatives, closed neighbour and unknown neighbour remain distinct',()=>{
  const c=fixture(dataset),model=createTurnoutModel(c.network,c.registry),c12=c.registry.get('V06-C12'),c13=c.registry.get('V06-C13');
  assert.equal(c12.ports.B,c13.ports.A);
  const incoming=c.network.nodes[c12.ports.B].filter(p=>!c12.internal.includes(p.edge));assert.equal(incoming.length,2);
  for(const p of incoming){const edge=c.network.edges[p.edge],s=c.switchSpecs.find(s=>s.id===c13.id);
    s.on=edge.requiredState;assert.equal(model.read(c12.id,false,{incomingEdge:p.edge,incomingEnd:p.end,choose:c.route}).approach.status,'ROUTABLE');
    s.on=!edge.requiredState;assert.equal(model.read(c12.id,false,{incomingEdge:p.edge,incomingEnd:p.end,choose:c.route}).approach.status,'BLOCKED');
    s.on=null;const v=model.read(c12.id,false,{incomingEdge:p.edge,incomingEnd:p.end,choose:c.route});
    assert.equal(v.approach.status,'UNKNOWN');assert.deepEqual(v.activePaths,[]);
    assert.equal(model.read(c12.id,false,{incomingPort:'B'}).approach.status,'ROUTABLE'); // local only, never clearance
  }
});

test('R1B V06 actual Journey traverses every permitted unit path and reverse, including both adjacent incoming alternatives',()=>{
  const c=fixture(dataset),model=createTurnoutModel(c.network,c.registry);let traversals=0;
  for(const row of [...oracle.wx,...oracle.simple].filter(r=>r.allowed)){
    const on=['X','S1'].includes(row.state),unit=c.registry.get(row.unit),local=model.read(unit.id,on,{incomingPort:row.entry}).approach;
    for(const incoming of c.network.nodes[unit.ports[row.entry]].filter(p=>!unit.internal.includes(p.edge))){
      c.switchSpecs.forEach(s=>{s.on=false;});c.switchSpecs.find(s=>s.id===unit.id).on=on;
      const outside=c.network.edges[incoming.edge];if(outside.switchId)c.switchSpecs.find(s=>s.id===outside.switchId).on=outside.requiredState;
      const outlet=c.network.nodes[unit.ports[row.exit]].find(p=>!unit.internal.includes(p.edge)),exit=c.network.edges[outlet.edge];
      if(exit.switchId)c.switchSpecs.find(s=>s.id===exit.switchId).on=exit.requiredState;
      const j=new Journey(c.network,outside.id,incoming.end?outside.length-1:1),start=j.locate(),direction=incoming.end?1:-1;
      const distance=c.network.edges[local.edge].length+2;
      assert.equal(j.move(direction*distance,0,c.route),true);assert.equal(j.locate().edge,outlet.edge);
      assert.equal(j.move(-direction*distance,0,c.route),true);assert.equal(j.locate().edge,start.edge);
      assert.ok(Math.abs(j.locate().s-start.s)<1e-7);traversals++;
    }
  }
  assert.equal(traversals,38);
});

test('R1B registries reject incomplete, duplicate, mixed, nonboolean and broken-unit configuration',()=>{
  const mutations=[
    n=>n.controllers.pop(),n=>n.controllers.push(n.controllers[0]),n=>{n.controllers[0]={...n.controllers[0],id:'Y-IN'};},
    n=>{n.controllers[0]={...n.controllers[0],kind:'invented'};},n=>{n.controllers[0]=structuredClone(n.controllers[0]);n.controllers[0].ports.A='invented';},
    n=>{n.controllers[0]=structuredClone(n.controllers[0]);n.controllers[0].internal.pop();},
    n=>{n.edges['V06-P012'].requiredState=null;},n=>{n.edges['V06-P012'].unit='WX-B';},
    n=>{n.edges['V06-P012'].fromPort='LL';},n=>{n.controllers[0]=structuredClone(n.controllers[0]);n.controllers[0].states.false='X';},
    n=>{n.metadata={...n.metadata,schema:'invented'};}
  ];
  for(const mutate of mutations){const n=createNetwork(structuredClone(dataset));n.controllers=[...n.controllers];mutate(n);assert.throws(()=>createTurnoutRegistry(n));}
  const legacy=createNetwork();legacy.controllers=[...legacy.controllers].reverse();assert.throws(()=>createTurnoutRegistry(legacy));
  assert.throws(()=>createTurnoutModel(createNetwork(dataset),createTurnoutRegistry(createNetwork(dataset))),/selected network/);
  assert.throws(()=>createTurnoutCommands({registry:{}}),/selected network/);
  assert.throws(()=>createTurnoutCommands({registry:null}),/selected network/);
  assert.deepEqual(TURNOUT_IDS,profiles[0][2]);assert.equal(isTurnoutId('V06-C12'),false);
});

test('R1B commands reject profile/instance mixing even for shared WX IDs, and revalidate mutable specs on each request',()=>{
  const legacy=fixture(),v06=fixture(dataset);
  for(const [active,other] of [[legacy,v06],[v06,legacy]]){
    const cmd=createTurnoutCommands({...active,switchSpecs:other.switchSpecs,getSafety:()=>{throw Error('profile must fail first');}});
    const before=snapshot(other);assert.equal(cmd.requestToggle('WX-A','panel').reason,'invalid-profile');assert.equal(snapshot(other),before);
    const mixedJourney=createTurnoutCommands({...active,trains:other.trains,getSafety:()=>{throw Error('Journey must fail first');}});
    assert.equal(mixedJourney.requestToggle('WX-A','device').reason,'invalid-profile');
    const second=fixture(active===legacy?undefined:dataset);
    assert.equal(createTurnoutCommands({...active,trains:second.trains,getSafety:()=>unlocked}).requestToggle('WX-A','panel').reason,'invalid-profile');
    const c=fixture(active===legacy?undefined:dataset),cmd2=createTurnoutCommands({...c,getSafety:()=>unlocked});
    assert.equal(cmd2.requestToggle('WX-A','panel').changed,true);
    c.switchSpecs[0]={...c.switchSpecs[0],profileId:other.registry.profileId};
    const before2=snapshot(c);assert.equal(cmd2.requestToggle('WX-A','device').reason,'invalid-profile');assert.equal(snapshot(c),before2);
    c.switchSpecs[0]=c.registry.createSpecs()[0];c.switchSpecs.push({...c.switchSpecs[0]});
    assert.equal(cmd2.requestToggle('WX-A','panel').reason,'invalid-profile');
  }
  const noRegistry=createTurnoutCommands({...v06,registry:undefined,getSafety:()=>unlocked});
  assert.equal(noRegistry.requestToggle('V06-C12','panel').reason,'invalid-control');
  assert.equal(noRegistry.requestToggle('WX-A','panel').reason,'invalid-profile');
});

test('R1B reset/profile isolation: independent caches, callbacks, state and geometry across alternating new instances',()=>{
  const first=fixture(),second=fixture(dataset),third=fixture();
  const models=[first,second,third].map(c=>createTurnoutModel(c.network,c.registry)),reads=[0,0,0];
  const contexts=[first,second,third],cmds=contexts.map((c,i)=>createTurnoutCommands({...c,getSafety:()=>{reads[i]++;return unlocked;}}));
  const before=contexts.map(snapshot),views=models.map(m=>m.read('WX-A',false));
  views.forEach((v,i)=>{assert.equal(models[i].read('WX-A',false).activePaths,v.activePaths);
    assert.throws(()=>{v.paths[0].points[0].x++;},TypeError);});
  assert.notEqual(views[0].activePaths,views[1].activePaths);assert.notEqual(views[0].activePaths,views[2].activePaths);
  assert.notDeepEqual(views[0].paths.map(p=>p.edge),views[1].paths.map(p=>p.edge));
  assert.equal(cmds[1].requestToggle('WX-A','device').changed,true);assert.deepEqual(reads,[0,1,0]);
  assert.equal(snapshot(first),before[0]);assert.equal(snapshot(third),before[2]);
  assert.equal(cmds[0].requestToggle('WX-A','panel').changed,true);assert.deepEqual(reads,[1,1,0]);
  assert.equal(snapshot(third),before[2]);assert.equal(models[2].read('V06-C12',false).unknown,true);
  assert.equal(fixture(dataset).registry.createSpecs().every(s=>s.on===null),true);
});
