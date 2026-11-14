import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {selectScenario,createScenarioProfile,verifiedBytes,findScenarioSpawn,V06_DATASET_SHA256} from '../src/scenario-profile.js';
import {createSwitchTopology} from '../src/next-switch.js';
import {routing,Journey} from '../src/simulation.js';
import {buildStock} from '../src/rolling-stock.js';
import {createTurnoutModel} from '../src/turnout-routes.js';
import {createTurnoutPicking} from '../src/turnout-picking.js';
import {createTurnoutGlow} from '../src/turnout-glow.js';
import {createTurnoutArrows} from '../src/turnout-arrows.js';
import {createTurnoutFocus} from '../src/turnout-interaction.js';
import {vehiclePositions} from '../src/railway-state.js';
import {vehiclesConflict} from '../src/railway-conflicts.js';
import {v06RailGeometry,createV06Railway} from '../src/scenario-v06-scene.js';
const bytes=readFileSync('src/datasets/v06-r1a.json');
const data=JSON.parse(bytes);
const fresh=()=>createScenarioProfile('v06',data);

test('browser selection defaults to Legacy; unknown profiles fail closed; new sessions never share networks',()=>{
  assert.equal(selectScenario(''),'legacy');assert.equal(selectScenario('?scenario=v06'),'v06');
  for(const value of ['?scenario=bogus','?scenario=__proto__','?scenario='])assert.throws(()=>selectScenario(value));
  const a=fresh(),b=fresh(),legacy=createScenarioProfile('legacy');
  assert.equal(a.registry.ids.length,7);assert.equal(legacy.registry.ids.length,8);assert.notEqual(a.network,b.network);assert.notEqual(a.sessionId,b.sessionId);
  assert.equal(a.network.metadata.runtime_circulation_verified,false);assert.equal(a.network.metadata.physical_profile_certified,false);
  assert.throws(()=>createScenarioProfile('v06'));assert.throws(()=>createScenarioProfile('bogus'));
});
test('pinned browser admission rejects HTTP failure, truncated bytes and a tampered R1A artifact',async()=>{
  const array=buffer=>buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength);
  const fetcher=async()=>({ok:true,arrayBuffer:async()=>array(bytes)});
  assert.equal((await verifiedBytes('local',{sha256:V06_DATASET_SHA256},{fetcher})).byteLength,bytes.length);
  await assert.rejects(verifiedBytes('local',{sha256:V06_DATASET_SHA256},{fetcher:async()=>({ok:false})}),/unavailable/);
  await assert.rejects(verifiedBytes('local',{sha256:V06_DATASET_SHA256,bytes:1},{fetcher}),/size/);
  const wrong=Buffer.from(bytes);wrong[100]^=1;
  await assert.rejects(verifiedBytes('local',{sha256:V06_DATASET_SHA256},{fetcher:async()=>({ok:true,arrayBuffer:async()=>array(wrong)})}),/integrity/);
});
test('all seven V06 devices own picking, focus, glow and selected route arrows; Legacy-only IDs are rejected',()=>{
  const p=fresh(),model=createTurnoutModel(p.network,p.registry),scene=new THREE.Scene();
  const picking=createTurnoutPicking(model,{heightOffset:2.45}),glow=createTurnoutGlow(scene,model,{heightOffset:2.45}),arrows=createTurnoutArrows(scene,model,{heightOffset:2.45,getState:()=>false});
  const focus=createTurnoutFocus(()=>{},p.registry);
  assert.equal(picking.root.children.length,7);assert.equal(glow.root.children.length,7);assert.equal(picking.root.position.y,2.45);
  for(const id of p.registry.ids){assert.equal(focus.set('panel',id),true);assert.equal(focus.active,id);glow.identify(id,100);glow.update(300);assert.deepEqual(glow.snapshot.visibleDevices,[id]);}
  assert.equal(focus.set('panel','Y-IN'),false);assert.throws(()=>glow.identify('Y-IN',400));
  arrows.update(400,true);assert.equal(arrows.snapshot.units.length,7);
  picking.dispose();glow.dispose();arrows.dispose();assert.equal(scene.children.length,0);
});
test('full native initial fleet and fourth locomotive admit only complete visible nonoverlapping consists; failure preserves Journey',()=>{
  const p=fresh(),specs=p.registry.createSpecs();specs.forEach(s=>s.on=false);
  const switchTopology=createSwitchTopology(p.network,specs),route=routing(p.network,id=>specs.find(s=>s.id===id)?.on),trains=[];
  for(const [id,kind,count,lane] of [[0,'steam',['closed','open','tank'],2],[1,'shunter',['flat','coach'],1],[2,'shunter',['tank','flat'],0],[3,'shunter',[],null]]){
    const train={id,group:buildStock(kind),carObjs:count.map(kind=>buildStock(kind))};
    const spawn=findScenarioSpawn({network:p.network,switchTopology,trains,detached:[],route,train,lane});assert.ok(spawn);
    train.journey=new Journey(p.network,spawn.edge,spawn.s);
    if(spawn.sign<0){train.journey.segments[0].sign=-1;train.journey.position=p.network.edges[spawn.edge].length-spawn.s;}
    train.journey.ensure(train.journey.position-1000,route);trains.push(train);
  }
  const poses=trains.map(vehiclePositions);for(let i=0;i<poses.length;i++)for(let j=i+1;j<poses.length;j++)assert.ok(!poses[i].some(a=>poses[j].some(b=>vehiclesConflict(a,b))));
  const train={id:4,group:buildStock('shunter'),carObjs:[],journey:trains[0].journey};
  train.group.userData.stock={length:5000,width:5000};train.group.userData.couplers={front:{x:5000},back:{x:-5000}};
  const original=train.journey;assert.equal(findScenarioSpawn({network:p.network,switchTopology,trains,detached:[],route,train}),null);assert.equal(train.journey,original);
});
test('V06 running surfaces have 9mm inner gauge and 8.4mm rail top; source axes stay immutable; N16 has no invented buffer',()=>{
  const p=fresh(),before=JSON.stringify(p.network),edge=Object.values(p.network.edges).find(e=>e.points.every(v=>Math.abs(v.z-e.points[0].z)<1e-7));
  assert.ok(edge);const rails=[-1,1].map(s=>v06RailGeometry(edge,s));
  for(const g of rails){assert.ok([...g.attributes.position.array].every(Number.isFinite));g.computeBoundingBox();assert.ok(Math.abs(g.boundingBox.max.y-8.4)<1e-5);}
  const one=rails[0].attributes.position.array,two=rails[1].attributes.position.array;
  const inner=positions=>[...positions].filter((_,i)=>i%3===2&&Math.abs(positions[i-1]-8.4)<1e-5);
  const a=inner(one),b=inner(two);assert.ok(Math.abs(Math.min(...a.flatMap(x=>b.map(y=>Math.abs(x-y))))-9)<1e-4);
  rails.forEach(g=>g.dispose());const railway=createV06Railway(p.network);
  assert.equal(railway.root.children.filter(o=>o.name.startsWith('buffer-')).length,2);assert.equal(railway.stats.originalRailwayAttached,false);assert.equal(JSON.stringify(p.network),before);
});
