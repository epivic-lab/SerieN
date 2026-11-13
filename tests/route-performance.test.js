import test from 'node:test';import assert from 'node:assert/strict';
import {createNetwork,loopPosition}from'../src/network.js';import{Journey,routing}from'../src/simulation.js';
import{createSwitchTopology,traceJourney}from'../src/next-switch.js';import{traceJourney as reference}from'./fixtures/next-switch-5c.js';import{previewPoints}from'../src/next-switch-view.js';
const n=createNetwork(),topology=createSwitchTopology(n,n.controllers);
test('lean route projections preserve 5C routing, distance and highlight; shared units receive complete encounters',()=>{
 let count=0;
 for(const on of [[],...n.controllers.map(c=>[c.id]),n.controllers.map(c=>c.id)])for(let lane=0;lane<3;lane++)for(const direction of [-1,1]){
  const p=loopPosition(n,lane,.22),j=new Journey(n,p.edge,p.s),route=routing(n,id=>on.includes(id));
  for(const horizon of [200,12000]){
   const expected=reference(n,topology,j,direction,0,route,horizon),full=traceJourney(n,topology,j,direction,0,route,horizon),lean=traceJourney(n,topology,j,direction,0,route,horizon,false);
   // F1 deliberately completes encounters at shared nodes. Keep the frozen
   // 5C oracle unchanged and require exact equality for every other field.
   const {encounters:oldEncounters,...oldRoute}=expected,{encounters,...actualRoute}=full;
   assert.deepEqual(actualRoute,oldRoute);
   for(const old of oldEncounters){
    const current=encounters.find(e=>e.site.id===old.site.id);assert.ok(current);
    assert.ok(current.distance<=old.distance,'an existing lock may only be detected earlier');
    if(current.distance===old.distance)assert.deepEqual(current,old);
    else assert.ok(topology.byNode.get(current.node).length>1,'earlier encounter must belong to a shared node');
   }
   for(const encounter of encounters){
    const members=topology.byNode.get(encounter.node);assert.ok(members.includes(encounter.site));
    assert.ok(full.ranges.some(r=>r.edge===encounter.incoming&&Math.abs(r.distance+Math.abs(r.to-r.from)-encounter.distance)<1e-7));
    for(const member of members)assert.ok(encounters.some(e=>e.site.id===member.id&&e.distance<=encounter.distance),'every shared unit must be protected');
   }
   assert.deepEqual({...lean,points:full.points},full);assert.deepEqual(previewPoints(n,lean,500),previewPoints(n,expected,500));count++;
  }
 }assert.equal(count,120);
});
