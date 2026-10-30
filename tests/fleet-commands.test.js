import test from 'node:test';import assert from 'node:assert/strict';
import {createFleetCommands} from '../src/fleet-commands.js';
import {baselineCommands} from './fixtures/fleet-commands-v012.js';
import {createNetwork} from '../src/network.js';import{Journey,routing}from '../src/simulation.js';
const network=createNetwork(),route=routing(network,()=>false);
function scenario(mode=0){
 const vehicle=(id)=>({id,userData:mode?{stock:{length:60},couplers:{front:{x:31},back:{x:-31}}}:{}});
 const trains=[0,1].map(id=>{const journey=new Journey(network,'T0',150);journey.ensure(journey.position-240,route);return {id,name:`Train ${id}`,group:vehicle(id+'-loco'),carObjs:[vehicle(id+'-a'),vehicle(id+'-b')],cars:2,journey,speed:0,velocity:0,dir:1,lights:false};});
 return {trains,detached:[],route};
}
const snapshot=c=>({trains:c.trains.map(t=>({id:t.id,cars:t.cars,ids:t.carObjs.map(v=>v.id),speed:t.speed,velocity:t.velocity,dir:t.dir,lights:t.lights,position:t.journey.position,segments:t.journey.segments})),detached:c.detached.map(d=>({id:d.group.id,point:d.point}))});
test('fleet commands match historical state transitions/messages for legacy and catalogued consists',()=>{
 for(const mode of [0,1]){
  const before=scenario(mode),after=scenario(mode),old=baselineCommands(before),current=createFleetCommands(after);
  const ops=[['setTrainSpeed','setSpeed',0,150],['reverseTrain','reverse',0],['uncouple','uncouple',0],['couple','couple',0],['stopTrain','stop',0],['toggleTrainLights','toggleLights',0],['uncouple','uncouple',0],['couple','couple',0],['uncouple','uncouple',0],['uncouple','uncouple',0],['uncouple','uncouple',0],['couple','couple',0],['setTrainSpeed','setSpeed',1,35],['stopAllTrains','stopAll']];
  for(const [previous,next,id,value]of ops){
   old.select(id??0);const length=old.messages.length;old[previous](id,value);const result=current[next](id,value);
   assert.deepEqual(snapshot(after),snapshot(before),previous);
   if(['uncouple','couple'].includes(next))assert.deepEqual(result.message?[result.message]:[],old.messages.slice(length));
  }
 }
});
test('detach/recouple transfers exactly the same physical group at the same route position',()=>{
 const c=scenario(1),commands=createFleetCommands(c),t=c.trains[0],last=t.carObjs.at(-1),journey=t.journey;
 const detached=commands.uncouple(0);assert.equal(detached.group,last);assert.equal(c.detached[0].group,last);
 const point={...c.detached[0].point};assert.equal(commands.couple(0).group,last);
 assert.equal(t.carObjs.at(-1),last);assert.equal(c.detached.length,0);assert.equal(t.journey,journey);
 commands.uncouple(0);assert.deepEqual(c.detached[0].point,point);
});
test('blocked coupling preserves identities and counts when distant, reversed, full or without room',()=>{
 const c=scenario(1),commands=createFleetCommands(c),t=c.trains[0];commands.uncouple(0);
 const parked=c.detached[0],saved={...parked.point};
 for(const patch of [{x:saved.x+100},{angle:saved.angle+Math.PI}]){
  parked.point={...saved,...patch};assert.equal(commands.couple(0).changed,false);assert.equal(c.detached[0],parked);assert.equal(t.carObjs.length,1);
 }
 parked.point=saved;t.cars=5;assert.match(commands.couple(0).message,/Maximum/);t.cars=t.carObjs.length;
 const original=t.journey.ensure;t.journey.ensure=()=>false;assert.equal(commands.couple(0).message,'Not enough room.');t.journey.ensure=original;
 assert.equal(c.detached[0],parked);assert.equal(commands.couple(0).changed,true);
});
test('simple commands preserve missing-ID behavior and stop every fleet member',()=>{
 const c=scenario(),commands=createFleetCommands(c);
 for(const method of ['setSpeed','reverse','stop','toggleLights'])assert.equal(commands[method](42,20),undefined);
 commands.setSpeed(0,-3);assert.equal(c.trains[0].speed,0);
 for(const t of c.trains){t.speed=50;t.velocity=-20;}commands.stopAll();
 assert.ok(c.trains.every(t=>t.speed===0&&t.velocity===0));
});
