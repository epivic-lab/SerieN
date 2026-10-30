import test from 'node:test';import assert from 'node:assert/strict';
import {createNetwork} from '../src/network.js';import{Journey,routing,FixedClock}from '../src/simulation.js';
import{vehiclesConflict}from '../src/railway-conflicts.js';import{createFleetCommands}from '../src/fleet-commands.js';import{collectRailwayState}from '../src/railway-state.js';
const network=createNetwork(),route=routing(network,id=>id==='Y-4');
const vehicle=()=>({userData:{stock:{length:165,width:20},couplers:{front:{x:84.1},back:{x:-84.1}}}});
test('R01: adjacent-segment overlapping bodies conflict; parallel tracks remain independent',()=>{
 const v=vehicle(),a={...new Journey(network,'T47',238).locate(),vehicle:v},b={...new Journey(network,'T46',10).locate(),vehicle:vehicle()};
 assert.ok(vehiclesConflict(a,b));assert.ok(vehiclesConflict(b,a));
 assert.equal(vehiclesConflict(a,{...a,z:a.z+33,edge:'parallel'}),false);
 assert.ok(vehiclesConflict(a,{...a,edge:'crossing',angle:a.angle+Math.PI/2}));
});
test('R02: detached coach keeps independent route history and occupation across turnout joint',()=>{
 const journey=new Journey(network,'T47',110);journey.ensure(journey.position-250,route);
 const train={id:0,group:vehicle(),carObjs:[vehicle()],cars:1,journey,speed:0,velocity:0};
 // Place the trailing coach centre 5mm from the TO4 joint.
 train.group.userData.couplers.back.x=-20.9;
 const detached=[],commands=createFleetCommands({trains:[train],detached,route});commands.uncouple(0);
 assert.equal(detached[0].journey.position,5);
 const frozen=JSON.stringify(detached[0].journey.segments);journey.segments[0].start-=1;
 assert.equal(JSON.stringify(detached[0].journey.segments),frozen);
 const ranges=collectRailwayState({network,trains:[],detached,route}).occupied;
 assert.ok(ranges.some(r=>r.edge==='T47'));assert.ok(ranges.some(r=>r.edge==='TO4:AC'));
});
test('R03: invalid inputs reject before mutation and valid clock updates still work',()=>{
 const j=new Journey(network,'T47',100),before=JSON.stringify(j),clock=new FixedClock();
 for(const x of [NaN,Infinity,-Infinity]){assert.throws(()=>j.move(x,10,route));assert.throws(()=>j.ensure(x,route));assert.throws(()=>clock.update(x,()=>{}));}
 assert.equal(JSON.stringify(j),before);assert.throws(()=>new FixedClock(0));assert.throws(()=>clock.update(-1,()=>{}));
 let calls=0;clock.update(1/60,()=>calls++);assert.equal(calls,1);
 const train={speed:0};const commands=createFleetCommands({trains:[train],detached:[],route});assert.throws(()=>commands.setSpeed(0,NaN));assert.equal(train.speed,0);
});
