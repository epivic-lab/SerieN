import test from 'node:test';import assert from 'node:assert/strict';
import {createNetwork} from '../src/network.js';import {Journey,routing} from '../src/simulation.js';
const n=createNetwork();
// Logical port truth table, independent of routing(), requiredState and its
// eligibility filter. Null is mandatory only for the inactive trailing branch.
const single={false:{A:['B','AB'],B:['A','AB'],C:null},true:{A:['C','AC'],B:null,C:['A','AC']}};
const cross={false:{UL:['UR','upper'],UR:['UL','upper'],LL:['LR','lower'],LR:['LL','lower']},true:{UL:['LR','down'],LR:['UL','down'],LL:['UR','up'],UR:['LL','up']}};
test('explicit expected port table requires every legal entrance of all eight switches in both states and traverses it bidirectionally',()=>{
 let legal=0,blocked=0;
 for(const control of n.controllers)for(const state of [false,true])for(const [port,node] of Object.entries(control.ports)){
  const expected=(control.kind==='single'?single:cross)[state][port];
  const external=n.nodes[node].filter(p=>!control.internal.includes(p.edge));
  const incoming=external.find(p=>!n.edges[p.edge].requiredState)??external[0];
  assert.ok(incoming,'external entrance '+control.id+' '+port);
  const edge=n.edges[incoming.edge],states=new Map([[control.id,state]]);
  if(edge.switchId)states.set(edge.switchId,edge.requiredState);
  const route=routing(n,id=>states.get(id)??false);
  const out=route(edge.id,n.nodes[node].filter(p=>p.edge!==edge.id));
  if(expected===null){assert.equal(out,null,`${control.id} ${state} ${port}`);blocked++;continue;}
  const internal=control.kind==='single'?`${control.sourceId}:${expected[1]}`:`${control.id}:${expected[1]}`;
  assert.equal(out?.edge,internal,`${control.id} ${state} ${port} must reach ${expected[0]}`);
  const target=n.edges[internal],exit=out.end?target.from:target.to;
  assert.equal(exit,control.ports[expected[0]],'exact expected exit port, no diamond connection');
  const outlets=n.nodes[exit].filter(p=>!control.internal.includes(p.edge)),outlet=outlets.find(p=>!n.edges[p.edge].requiredState)??outlets[0];
  assert.ok(outlet);const outside=n.edges[outlet.edge];if(outside.switchId)states.set(outside.switchId,outside.requiredState);
  const j=new Journey(n,edge.id,incoming.end?edge.length-1:1),start=j.locate(),direction=incoming.end?1:-1;
  assert.ok(j.move(direction*(target.length+2),0,route));assert.equal(j.locate().edge,outlet.edge);assert.ok(j.segments.some(s=>s.id===internal));
  assert.ok(j.move(-direction*(target.length+2),0,route));const back=j.locate();assert.equal(back.edge,start.edge);assert.ok(Math.abs(back.s-start.s)<1e-8);assert.ok(Math.hypot(back.x-start.x,back.z-start.z)<1e-8);
  legal++;
 }
 assert.equal(legal,40);assert.equal(blocked,12);
});
