import test from 'node:test';
import assert from 'node:assert/strict';
import {createNetwork,loopPosition} from '../src/network.js';
import {Journey,routing} from '../src/simulation.js';
import {buildStock} from '../src/rolling-stock.js';
import {createIdentities} from '../src/persistence/identity.js';
import {captureState} from '../src/persistence/capture.js';
import {validateDocument,validateStaging} from '../src/persistence/validate.js';
import {stageState} from '../src/persistence/hydrate.js';
import {validateSchema,plainCopy} from '../src/persistence/schema.js';
import {createCloudAdapter} from '../src/persistence/cloud-adapter.js';
import {createFleetCommands} from '../src/fleet-commands.js';
const network=createNetwork(),route=routing(network,()=>false),ids=createIdentities();
const context={workspaceId:crypto.randomUUID(),layoutId:crypto.randomUUID()};
function fixture(count=3){
  const stock=kind=>{const g=buildStock(kind);g.userData.persistenceKind=kind;return g;};
  const trains=Array.from({length:count},(_,i)=>{
    const p=i===3?{edge:'T47',s:80,sign:1}:loopPosition(network,i,.5);
    const journey=new Journey(network,p.edge,p.s);if(p.sign<0){journey.segments[0].sign=-1;journey.position=network.edges[p.edge].length-p.s;}
    journey.ensure(journey.position-300,route);journey.ensure(journey.position+50,route);
    return {id:i,name:'Steam',desc:'Study',nativeName:'Steam',nativeDescription:'Study',modelKey:'steam',group:stock('steam'),carObjs:i===3?[]:[stock('closed'),stock('flat')],cars:i===3?0:2,journey,speed:i===1?0:20,requestedSpeed:37,velocity:i===1?0:12,dir:i%2?-1:1,odometer:-123,lights:i===1,loop:i%3,previousLane:i%3,mode:'loop',laps:0,initial:{loop:i%3,cars:2,fraction:.5}};
  });
  return {trains,detached:[],pending:0,describe:g=>({couplers:g.userData.couplers,nativeCouplers:g.userData.couplers}),switches:Object.fromEntries(['WX-A','WX-B','Y-IN','Y-2','Y-3','Y-R1','Y-R2','Y-4'].map((k,i)=>[k,Boolean(i%2)])),time:{tickCount:123,stepSeconds:1/60,accumulatorSeconds:.003,wasPaused:false},missions:{selected:3,changes:8,transferred:true,visitedRunaround:true,didDetach:true,didAttach:false},ui:{selectedTrainId:1,consoleSlots:count===4?[3,1,2]:[0,1,2],recentTrainIds:count===4?[1,3,2,0]:[1,2,0],day:82,rollingModelMode:'native',qualityMode:'auto',camera:{preset:'manual',position:[600,800,1300],target:[750,0,350],zoom:1.2,fov:35},hudMinimized:true,bellMuted:true}};
}
test('R0 actual Journey/stock roundtrip: 3 and 4 consists, detached IDs and no mutation',async()=>{
  for(const n of [3,4]){
    const r=fixture(n);const t=r.trains[0];t.speed=t.velocity=0;createFleetCommands({...r,route}).uncouple(0);
    const s=captureState(r,ids,context);validateDocument(s,context,network);validateStaging(r.trains,r.detached);
    const staged=await stageState(s,context,network,{build:async i=>{const g=buildStock(i.nativeKind);g.userData.persistenceKind=i.nativeKind;return g;},describe:r.describe,dispose:()=>{}},ids);
    const t2=captureState({...r,...staged,ui:r.ui},ids,context);delete s.stateId;delete t2.stateId;assert.deepEqual(t2,s);
    assert.equal(staged.detached[0].animationDistanceMm,-123);assert.equal(staged.trains[1].requestedSpeed,37);
  }
});
test('reject corruption, cross assignments, incompatible topology, history and unknown fields',()=>{
  const original=captureState(fixture(),ids,context),keep=structuredClone(original);
  const edits=[s=>s.topologyHash='0'.repeat(64),s=>s.schemaVersion=2,s=>s.workspaceId=crypto.randomUUID(),s=>s.items[0].orientation=-1,s=>s.items[1].id=s.items[0].id,s=>s.consists[1].members[1].itemId=s.consists[0].members[1].itemId,s=>s.trains[0].journey.segments[0].id='BAD',s=>s.trains[0].journey.segments[0].end+=10,s=>s.trains[0].location.s+=1,s=>s.ui.consoleSlots.reverse().push(s.ui.consoleSlots[0]),s=>s.time.tickCount=NaN,s=>s.trains[0].journey.segments[0].extra=1,s=>s.models[0].revision='bad'];
  for(const edit of edits){const s=structuredClone(original);edit(s);assert.throws(()=>validateDocument(s,context,network));assert.deepEqual(original,keep);}
  assert.throws(()=>plainCopy({x:Infinity}));assert.throws(()=>plainCopy(new Journey(network,'T47',50)));assert.throws(()=>validateSchema({...original,extra:1}));
});
test('staging failures clean up every constructed group and preserve live data',async()=>{
  const r=fixture(),s=captureState(r,ids,context),before=structuredClone(s);
  for(let failAt=0;failAt<s.items.length;failAt++){
    let built=0,disposed=0;
    await assert.rejects(stageState(s,context,network,{build:async i=>{if(built++===failAt)throw Error('injected');const g=buildStock(i.nativeKind);g.userData.persistenceKind=i.nativeKind;return g;},describe:r.describe,dispose:()=>disposed++},ids));
    assert.equal(disposed,failAt);assert.deepEqual(s,before);
  }
});
test('R1 collision predicate refuses a restored overlap',()=>{
  const r=fixture();r.trains[1].journey=r.trains[0].journey;assert.throws(()=>validateStaging(r.trains,r.detached),/collision/);
});
test('cloud transport stays disabled; verified ID comes from getUser and allowlist',async()=>{
  const calls=[];const client={auth:{getUser:async()=>{calls.push('user');return {data:{user:{id:'verified'}}};}},rpc:async name=>{calls.push(name);return {data:true};}};
  const adapter=createCloudAdapter(client);assert.equal(adapter.enabled,false);await assert.rejects(adapter.save({owner_id:'forged'}),/disabled/);await assert.rejects(adapter.load(),/disabled/);assert.deepEqual(calls,[]);
  assert.deepEqual(await adapter.verifiedUser(),{id:'verified'});assert.deepEqual(calls,['user','serien_access_allowed']);client.rpc=async()=>({data:false});await assert.rejects(adapter.verifiedUser(),/denied/);
});
