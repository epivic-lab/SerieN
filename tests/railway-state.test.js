import test from 'node:test';
import assert from 'node:assert/strict';
import {createNetwork,loopPosition} from '../src/network.js';
import {Journey,routing} from '../src/simulation.js';
import {createSwitchTopology} from '../src/next-switch.js';
import {layoutFor,vehiclePositions,collectRailwayState,deriveSwitchAssistance} from '../src/railway-state.js';
import {baselineViews} from './fixtures/railway-views-v012.js';
const network=createNetwork(),switchTopology=createSwitchTopology(network,network.controllers);
function vehicle(mode){
  if(mode===0)return {userData:{}};
  const length=mode===1?80:30;
  return {userData:{couplers:{front:{x:length/2+1,y:7,z:0},back:{x:-length/2-1,y:7,z:0}},[mode===1?'stock':'assetDimensions']:{length}}};
}
function scenario(on=[],velocity=0,dir=1){
 const route=routing(network,id=>on.includes(id));
 const trains=[0,1,2].map(id=>{
  const p=loopPosition(network,id,.22+id*.1),journey=new Journey(network,p.edge,p.s);
  if(p.sign<0){journey.segments[0].sign=-1;journey.position=network.edges[p.edge].length-p.s;}
  journey.ensure(journey.position-240,route);
  return {id,name:`Train ${id}`,group:vehicle(id),carObjs:[vehicle((id+1)%3),vehicle((id+2)%3)],cars:2,journey,velocity,dir,speed:30,lights:false};
 });
 return {network,switchTopology,trains,route,selected:0,switchSpecs:network.controllers.map(c=>({...c,on:on.includes(c.id)})),detached:[{point:{edge:'T47',s:5},group:vehicle(1)},{point:{edge:'missing',s:5},group:vehicle(0)}]};
}
const stateOf=c=>JSON.stringify(c.trains.map(t=>({position:t.journey.position,travel:t.journey.travel,segments:t.journey.segments,vehicles:[t.group,...t.carObjs]})));
test('derived layouts, positions, switch routes and safety match v0.12 across 180 fleet states',()=>{
 let count=0;
 for(const on of [[],...network.controllers.map(c=>[c.id]),network.controllers.map(c=>c.id)])
 for(const velocity of [-35,0,35])for(const dir of [-1,1]){
  const c=scenario(on,velocity,dir),oracle=baselineViews(c),before=stateOf(c);
  for(const t of c.trains){
   assert.deepEqual(layoutFor(t),oracle.layoutFor(t));
   assert.deepEqual(layoutFor(t,[vehicle(2)]),oracle.layoutFor(t,[vehicle(2)]));
   const positions=vehiclePositions(t);assert.deepEqual(positions,oracle.vehiclePositions(t));
   positions.forEach((p,i)=>{assert.equal(p.train,t);assert.equal(p.vehicle,[t.group,...t.carObjs][i]);});
  }
  for(const selected of [0,1,2]){c.selected=selected;assert.deepEqual(deriveSwitchAssistance(c),baselineViews(c).getSwitchAssistance());count++;}
  assert.equal(stateOf(c),before);
 }
 assert.equal(count,180);
});
test('read-only assistance can inspect frozen Journey ribbons and keeps actual velocity direction when braking',()=>{
 const c=scenario([],35,-1);
 for(const t of c.trains){t.journey.segments.forEach(Object.freeze);Object.freeze(t.journey.segments);Object.freeze(t.journey);}
 const result=deriveSwitchAssistance(c);
 assert.equal(result.inverting,true);assert.equal(result.controls,c.switchSpecs);
 assert.deepEqual(result,baselineViews(c).getSwitchAssistance());
});
