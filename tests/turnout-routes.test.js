import test from 'node:test';
import assert from 'node:assert/strict';
import {createNetwork} from '../src/network.js';
import {Journey,routing} from '../src/simulation.js';
import {createSwitchTopology,traceJourney} from '../src/next-switch.js';
import {createTurnoutModel,TURNOUT_IDS} from '../src/turnout-routes.js';

const n=createNetwork(),model=createTurnoutModel(n),topology=createSwitchTopology(n,n.controllers);
// Independent physical port oracle, not derived from requiredState or routing.
const single={false:{A:['B','AB'],B:['A','AB'],C:null},true:{A:['C','AC'],B:null,C:['A','AC']}};
const cross={false:{UL:['UR','upper'],UR:['UL','upper'],LL:['LR','lower'],LR:['LL','lower']},
  true:{UL:['LR','down'],LR:['UL','down'],LL:['UR','up'],UR:['LL','up']}};

for (const control of n.controllers) test(`${control.id}: both states, every entrance, exact canonical path and reverse Journey`,()=>{
  for (const on of [false,true]) {
    const idle=model.read(control.id,on);
    assert.equal(idle.unknown,false);
    assert.equal(idle.position,on?'diverging':'straight');
    assert.equal(idle.activePaths.length,control.kind==='cross'?2:1);
    assert.deepEqual(idle.activePaths.map(p=>p.edge),control.kind==='cross'
      ? (on?['down','up']:['upper','lower']).map(p=>`${control.id}:${p}`)
      : [`${control.sourceId}:${on?'AC':'AB'}`]);
    for (const [port,node] of Object.entries(control.ports)) {
      const expected=(control.kind==='single'?single:cross)[on][port];
      const view=model.read(control.id,on,{incomingPort:port}),a=view.approach;
      assert.equal(a.status,expected?'ROUTABLE':'BLOCKED');
      assert.equal(view.unknown,false); // known inactive branch is not UNKNOWN
      assert.equal(view.hazardStatus,'UNKNOWN'); // no implied safety clearance
      if (!expected) continue;
      assert.equal(a.outgoingPort,expected[0]);
      assert.equal(a.edge,`${control.kind==='cross'?control.id:control.sourceId}:${expected[1]}`);
      const edge=n.edges[a.edge];
      assert.equal(a.from,a.sign>0?0:edge.length);
      assert.equal(a.to,a.sign>0?edge.length:0);
      assert.deepEqual(a.points,a.sign>0?edge.points:[...edge.points].reverse());
      assert.deepEqual(a.points[0],n.metadata.nodes[node] && {x:n.metadata.nodes[node].x,z:n.metadata.nodes[node].z});
      const reverse=model.read(control.id,on,{incomingPort:expected[0]}).approach;
      assert.equal(reverse.outgoingPort,port);assert.equal(reverse.sign,-a.sign);
      assert.deepEqual(reverse.points,[...a.points].reverse());
      // Use every actual neighbouring external edge, including touching TOs.
      for (const incoming of n.nodes[node].filter(p=>!control.internal.includes(p.edge))) {
        const states=new Map([[control.id,on]]),outside=n.edges[incoming.edge];
        if (outside.switchId) states.set(outside.switchId,outside.requiredState);
        const exitNode=control.ports[expected[0]];
        const outlet=n.nodes[exitNode].find(p=>!control.internal.includes(p.edge));
        const exitEdge=n.edges[outlet.edge];
        if (exitEdge.switchId) states.set(exitEdge.switchId,exitEdge.requiredState);
        const route=routing(n,id=>states.get(id)??false);
        const j=new Journey(n,outside.id,incoming.end?outside.length-1:1),start=j.locate(),dir=incoming.end?1:-1;
        const preview=traceJourney(n,topology,j,dir,0,route);
        assert.equal(preview.encounters.find(e=>e.site.id===control.id).outgoing.edge,a.edge);
        assert.equal(model.read(control.id,on,{incomingEdge:outside.id,incomingEnd:incoming.end,choose:route}).approach.edge,a.edge);
        assert.ok(j.move(dir*(edge.length+2),0,route));
        assert.equal(j.locate().edge,outlet.edge);
        assert.ok(j.move(-dir*(edge.length+2),0,route));
        assert.equal(j.locate().edge,start.edge);assert.ok(Math.abs(j.locate().s-start.s)<1e-7);
      }
    }
  }
});

test('actual-network approaches match router over all 256 eight-controller configurations, including closed neighbours',()=>{
  let cases=0,neighbourBlocks=0;
  for (let mask=0;mask<256;mask++) {
    const state=id=>Boolean(mask & (1<<TURNOUT_IDS.indexOf(id))),route=routing(n,state);
    for (const c of n.controllers) for (const node of Object.values(c.ports)) {
      for (const incoming of n.nodes[node].filter(p=>!c.internal.includes(p.edge))) {
        const out=route(incoming.edge,n.nodes[node].filter(p=>p.edge!==incoming.edge));
        const v=model.read(c.id,state(c.id),{incomingEdge:incoming.edge,incomingEnd:incoming.end,choose:route});
        assert.equal(v.approachScope,'NETWORK');assert.equal(v.unknown,false);
        if (out) {assert.equal(v.approach.status,'ROUTABLE');assert.equal(v.approach.edge,out.edge);}
        else {assert.equal(v.approach.status,'BLOCKED');if(n.edges[incoming.edge].switchId)neighbourBlocks++;}
        cases++;
      }
    }
  }
  assert.equal(cases,7168);assert.ok(neighbourBlocks>0);
});

test('unknown/nonfinite IDs, state, ports and unresolved network entries never invent an active path',()=>{
  for (const id of [null,undefined,NaN,0,{},'__proto__','WX-C']) assert.equal(model.read(id,false).routeStatus,'UNKNOWN');
  for (const c of n.controllers) {
    for (const state of [undefined,null,NaN,Infinity,-1,0,1,'false',{}]) {
      const v=model.read(c.id,state,{incomingPort:Object.keys(c.ports)[0]});
      assert.equal(v.unknown,true);assert.deepEqual(v.activePaths,[]);assert.equal(v.approach.status,'UNKNOWN');
    }
    for (const port of [NaN,Infinity,0,'','__proto__','constructor','X']) {
      const v=model.read(c.id,false,{incomingPort:port});assert.equal(v.unknown,true);assert.deepEqual(v.activePaths,[]);
    }
  }
  for (const context of [
    {incomingEdge:'T5',incomingEnd:1}, // no authoritative router
    {incomingEdge:'missing',incomingEnd:1,choose:routing(n,()=>false)},
    {incomingEdge:'T5',incomingEnd:NaN,choose:routing(n,()=>false)},
    {incomingEdge:'T5',incomingEnd:2,choose:routing(n,()=>false)},
    {incomingEdge:'T5',incomingEnd:0,choose:routing(n,()=>false)}, // wrong end
    {incomingEdge:'T5',incomingEnd:1,incomingPort:'LL',choose:routing(n,()=>false)},
    {incomingEdge:'WX-A:upper',incomingEnd:0,choose:routing(n,()=>false)}, // not external
    {incomingEdge:'T5',incomingEnd:1,choose:()=>({edge:'invented',end:0})},
    {incomingEdge:'T5',incomingEnd:1,choose:()=>null},
    {incomingEdge:'T5',incomingEnd:1,choose:routing(n,()=>true)} // stale local false snapshot
  ]) {
    const v=model.read('WX-A',false,context);assert.equal(v.unknown,true);assert.deepEqual(v.activePaths,[]);assert.equal(v.approach.status,'UNKNOWN');
  }
});

test('immutable views cannot mutate canonical paths, state, Journey or subsequent reads; static paths are reused',()=>{
  const network=createNetwork(),j=new Journey(network,'T5',100),before=JSON.stringify(network),ribbon=JSON.stringify(j);
  const freeze=o=>{if(o&&typeof o==='object'&&!Object.isFrozen(o)){Object.values(o).forEach(freeze);Object.freeze(o);}};
  freeze(network);freeze(j);
  const m=createTurnoutModel(network),first=m.read('WX-A',false),point=first.activePaths[0].points[0];
  assert.throws(()=>{point.x+=100;},TypeError);
  assert.throws(()=>first.activePaths.push({}),TypeError);
  assert.throws(()=>{first.ports.UL='new-node';},TypeError);
  assert.equal(m.read('WX-A',false).activePaths,first.activePaths);
  assert.equal(m.read('WX-A',true).activePaths.length,2);
  assert.equal(JSON.stringify(network),before);assert.equal(JSON.stringify(j),ribbon);
});

test('route selection, operation lock and engine hazard observations have independent semantics',()=>{
  for (const blocked of [false,true]) for(const hazardStatus of ['SAFE','UNSAFE','UNKNOWN']) {
    const operationLock={blocked,kind:blocked?'occupied':'unlocked'};
    const v=model.read('WX-B',true,{operationLock,hazardStatus});
    assert.equal(v.activePaths.length,2);assert.equal(v.hazardStatus,hazardStatus);
    assert.equal(v.operationLock,blocked?'LOCKED':'UNLOCKED');
    assert.deepEqual(operationLock,{blocked,kind:blocked?'occupied':'unlocked'});
  }
  assert.equal(model.read('WX-B',false,{operationLock:{blocked:false,kind:'unknown'},hazardStatus:'green'}).operationLock,'UNKNOWN');
  assert.equal(model.read('WX-B',false,{hazardStatus:'green'}).hazardStatus,'UNKNOWN');
});
