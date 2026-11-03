import test from 'node:test';import assert from 'node:assert/strict';
import {createNetwork,loopPosition}from'../src/network.js';import{Journey,routing}from'../src/simulation.js';
import{createSwitchTopology,traceJourney}from'../src/next-switch.js';import{traceJourney as reference}from'./fixtures/next-switch-5c.js';import{previewPoints}from'../src/next-switch-view.js';
const n=createNetwork(),topology=createSwitchTopology(n,n.controllers);
test('lean route projections preserve every 5C range, encounter, graph distance and highlight; full API remains identical',()=>{
 let count=0;
 for(const on of [[],...n.controllers.map(c=>[c.id]),n.controllers.map(c=>c.id)])for(let lane=0;lane<3;lane++)for(const direction of [-1,1]){
  const p=loopPosition(n,lane,.22),j=new Journey(n,p.edge,p.s),route=routing(n,id=>on.includes(id));
  for(const horizon of [200,12000]){
   const expected=reference(n,topology,j,direction,0,route,horizon),full=traceJourney(n,topology,j,direction,0,route,horizon),lean=traceJourney(n,topology,j,direction,0,route,horizon,false);
   assert.deepEqual(full,expected);assert.deepEqual({...lean,points:full.points},full);assert.deepEqual(previewPoints(n,lean,500),previewPoints(n,expected,500));count++;
  }
 }assert.equal(count,120);
});
