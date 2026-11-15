import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import canonical from '../src/canonical-layout.json' with {type:'json'};
import dataset from '../src/datasets/v06-r1a.json' with {type:'json'};
import {createNetwork,validateNetwork,loopPosition} from '../src/network.js';
import {routing,Journey} from '../src/simulation.js';
import {assessRailwayGuard,guardDecision} from '../src/railway-guard.js';
import {createSwitchTopology} from '../src/next-switch.js';
import {validateDataset,validateArtifact,oracle,edgeId} from '../tools/scenario-v06/validate-r1a.js';

const n=createNetwork(dataset);
const choices=(edge,end)=>n.nodes[end?n.edges[edge].to:n.edges[edge].from].filter(p=>p.edge!==edge);
const truth = new Map([
  [35,['V06-C07',false]],[34,['V06-C07',true]], [68,['V06-C12',false]],[30,['V06-C12',true]],
  [69,['V06-C13',false]],[33,['V06-C13',true]], [31,['V06-N07',false]],[32,['V06-N07',true]],
  [41,['V06-N14',false]],[42,['V06-N14',true]], [59,['WX-A',false]],[60,['WX-A',false]],
  [12,['WX-A',true]],[13,['WX-A',true]], [61,['WX-B',false]],[62,['WX-B',false]],
  [16,['WX-B',true]],[17,['WX-B',true]]
]);
const active=(edge,states)=>!truth.has(n.edges[edge].sourcePiece)||states.get(truth.get(n.edges[edge].sourcePiece)[0])===truth.get(n.edges[edge].sourcePiece)[1];
const clone=()=>structuredClone(dataset);

test('R1A independent admission, exact geometry, provenance, nodes and 154 truth rows',()=>{
  assert.equal(validateDataset(dataset).status,'PASS_DATASET_ONLY');
  assert.deepEqual(validateNetwork(n),{edges:79,deadEnds:3});
  assert.equal(n.edges[edgeId(28)].hiddenIntervalsMm[0][1],n.edges[edgeId(28)].length);
  assert.equal(n.edges[edgeId(28)].sourceHiddenIntervalsMm[0][1],169.7);
});

test('R1A artifact checksum is enforced separately from semantic validation',()=>{
  const bytes=readFileSync('src/datasets/v06-r1a.json');
  assert.equal(validateArtifact(bytes).status,'PASS_DATASET_ONLY');
  assert.throws(()=>validateArtifact(Buffer.concat([bytes,Buffer.from('\n')])),/checksum/);
});

test('R1A builder reproduces bytes in a separate output and cannot overwrite legacy by default',()=>{
  const dir=mkdtempSync(join(tmpdir(),'r1a-'));
  try {
    const output=join(dir,'v06.json');
    execFileSync('python3',['tools/scenario-v06/build-r1a.py','--output',output]);
    assert.deepEqual(readFileSync(output),readFileSync('src/datasets/v06-r1a.json'));
  } finally { rmSync(dir,{recursive:true,force:true}); }
});

test('R1A factory: explicit legacy fallback, default legacy, independent graph instances and no mixed IDs',()=>{
  const before=JSON.stringify(canonical), legacy=createNetwork(), explicit=createNetwork(canonical);
  assert.deepEqual(explicit,legacy); assert.equal(Object.keys(legacy.edges).length,75);
  assert.equal(legacy.controllers.length,8);assert.equal(n.controllers.length,7);
  assert.ok(Object.keys(n.edges).every(id=>id.startsWith('V06-P')));
  assert.ok(Object.keys(n.nodes).every(id=>id.startsWith('V06-R01J')));
  assert.deepEqual(n.controllers.map(c=>c.id).sort(),['V06-C07','V06-C12','V06-C13','V06-N07','V06-N14','WX-A','WX-B']);
  const isolated=createNetwork(dataset);isolated.edges[edgeId(0)].points[0].x++;
  assert.notEqual(isolated.edges[edgeId(0)].points[0].x,n.edges[edgeId(0)].points[0].x);
  assert.equal(JSON.stringify(canonical),before);assert.deepEqual(createNetwork(),legacy);
  for(const invalid of [null,'v06',{}, {edges:[],controllers:[],nodes:{}}])assert.throws(()=>createNetwork(invalid));
});

for(const [name,rows] of [['WX 64',oracle.wx],['simple 90',oracle.simple]])test(`R1A actual router against frozen ${name} ordered cases`,()=>{
  let allowed=0;
  for(const row of rows) {
    const c=n.controllers.find(c=>c.id===row.unit), on=['X','S1'].includes(row.state);
    const port=c.ports[row.entry], external=n.nodes[port].filter(p=>!c.internal.includes(p.edge));
    // Adjacent C12/C13 share a port with two alternative incoming paths.
    assert.ok(external.length>=1,'external approach exists');
    if(row.allowed)allowed++;
    for(const incoming of external) {
    const states=new Map(n.controllers.map(c=>[c.id,false]));
    states.set(c.id,on);
    const edge=n.edges[incoming.edge];if(edge.switchId)states.set(edge.switchId,edge.requiredState);
    const route=routing(n,id=>states.get(id)), next=route(incoming.edge,choices(incoming.edge,incoming.end));
    const selected=next?n.edges[next.edge]:null;
    const outgoing=selected?(next.end===0?selected.to:selected.from):null;
    assert.equal(Boolean(selected && c.internal.includes(selected.id) && outgoing===c.ports[row.exit]),row.allowed,JSON.stringify(row));
    if(row.allowed) {
      assert.ok(c.internal.includes(next.edge));
      const exit=next.end?0:1;
      const outlet=n.nodes[outgoing].find(p=>!c.internal.includes(p.edge));
      assert.ok(outlet,'physical exit');
      const outletEdge=n.edges[outlet.edge];
      if(outletEdge.switchId)states.set(outletEdge.switchId,outletEdge.requiredState);
      // Same-unit alternatives may never be the continuation after an internal path.
      const after=route(next.edge,choices(next.edge,exit));
      assert.deepEqual(after,outlet,'complete port-to-port path reaches aligned external lead');
      assert.notEqual(n.edges[after.edge].unit,c.id);
    }
    }
  }
  assert.equal(allowed,name.startsWith('WX')?16:20);
});

test('R1A all 128 configurations: 20224 arrivals, 17920 active, actual router agrees with external topology oracle',()=>{
  let arrivals=0,activeArrivals=0;
  for(let mask=0;mask<128;mask++) {
    const states=new Map(n.controllers.map((c,i)=>[c.id,Boolean(mask&(1<<i))]));
    const route=routing(n,id=>states.get(id));
    for(const e of Object.values(n.edges))for(const end of [0,1]) {
      const exits=choices(e.id,end), current=truth.get(e.sourcePiece);
      const expected=!active(e.id,states)?[]:exits.filter(p=>{
        const other=truth.get(n.edges[p.edge].sourcePiece);
        return (!current||!other||current[0]!==other[0])&&active(p.edge,states);
      });
      assert.ok(expected.length<=1,'ambiguous oracle');
      assert.deepEqual(route(e.id,exits),expected[0]??null,`${mask}/${e.id}/${end}`);
      arrivals++;if(active(e.id,states))activeArrivals++;
    }
  }
  assert.equal(arrivals,20224);assert.equal(activeArrivals,17920);
});

function checkWalk(raw,closed=false) {
  const states=new Map(n.controllers.map(c=>[c.id,false]));
  for(const [i] of raw)if(truth.has(i)) {
    const [unit,state]=truth.get(i);
    const other=raw.filter(([j])=>truth.has(j)&&truth.get(j)[0]===unit);
    assert.ok(other.every(([j])=>truth.get(j)[1]===state),'inconsistent route state');states.set(unit,state);
  }
  const route=routing(n,id=>states.get(id)), pairs=raw.slice(1).map((r,i)=>[raw[i],r]);
  if(closed)pairs.push([raw.at(-1),raw[0]]);
  for(const [[i,s],[j,t]] of pairs)assert.deepEqual(route(edgeId(i),choices(edgeId(i),s===1?1:0)),{edge:edgeId(j),end:t===1?0:1},`route ${i} -> ${j}`);
}
const reverse=walk=>walk.toReversed().map(([i,s])=>[i,-s]);
test('R1A rings A/B/C, terminal branches and triangle legs in both directions; forbidden direct N07 remains blocked',()=>{
  for(const [name,row] of Object.entries(oracle.routes)) {
    if(name==='TRIANGLE_GEOMETRIC_CYCLE')continue;
    for(const walk of [row.piece_walk,reverse(row.piece_walk)])checkWalk(walk,['A','B','C'].includes(name));
  }
  for(const walk of [oracle.walks.TRIANGLE_MANOEUVRE.approach,oracle.walks.TRIANGLE_MANOEUVRE.departure,
    oracle.terminalWitnesses['51.S'].departure_via_N07_B_N14_C,
    oracle.terminalWitnesses['20.S'],oracle.terminalWitnesses['43.S']]) {
    checkWalk(walk);checkWalk(reverse(walk));
  }
  for(const on of [false,true]) {
    const route=routing(n,id=>id==='V06-N07'?on:false);
    assert.notEqual(route(edgeId(32),choices(edgeId(32),0))?.edge,edgeId(31));
    assert.notEqual(route(edgeId(31),choices(edgeId(31),1))?.edge,edgeId(32));
  }
  for(const loop of n.mainLoops) {
    const expected=dataset.mainLoops[loop.lane].segments;
    assert.deepEqual(new Set(loop.segments.map(s=>s.id)),new Set(expected.map(s=>s.id)));
    for(const fraction of [-1,0,.25,.999,1,2.25])assert.ok(n.edges[loopPosition(n,loop.lane,fraction).edge]);
  }
});

test('R1A diamonds have no node and all seven units retain complete protected internal paths',()=>{
  const topology=createSwitchTopology(n,n.controllers);assert.equal(topology.sites.length,7);
  for(const [id,x,z] of [['WX-A',564.722,84.525],['WX-B',936.873,51.5115]]) {
    assert.ok(Object.values(dataset.nodes).every(p=>Math.hypot(p.x-x,p.z-z)>1));
    const unit=topology.byControl.get(id);assert.equal(unit.internal.length,4);assert.equal(unit.nodes.length,4);
    for(const edge of unit.internal)assert.ok(unit.protectedRanges.some(r=>r.edge===edge&&r.min===0&&r.max===n.edges[edge].length));
  }
});

test('R1A existing guard rejects unknown controller state on every unit without changing routing or guard',()=>{
  for(const c of n.controllers)for(const value of [undefined,null,NaN,'false',0,1]) {
    const edge=n.edges[c.internal[0]], journey=new Journey(n,edge.id,edge.length/2);
    const train={id:0,group:{userData:{stock:{length:2,width:1},couplers:{front:{x:1},back:{x:-1}}}},carObjs:[],cars:0,speed:20,velocity:30,dir:1};
    const route=routing(n,id=>id===c.id?value:false);
    const result=assessRailwayGuard(train,journey,route,1/60);
    assert.equal(result.risk,'UNKNOWN');assert.equal(result.reason,'unknown-control');assert.equal(result.distance,0);
    assert.equal(guardDecision(result,.5,30,1/60).delta,0);
  }
});

const mutations={
  'missing hidden piece':d=>d.edges.splice(28,1),
  'duplicate edge':d=>d.edges[1].id=d.edges[0].id,
  'unknown legacy edge':d=>d.edges[0].id='T0',
  'mixed legacy node':d=>d.edges[0].from='A0',
  'fake diamond':d=>d.nodes.diamond={id:'diamond',x:564.722,z:84.525},
  'broken G1':d=>d.edges[27].points.at(-1).x+=.01,
  'broken G2':d=>d.edges[38].points[0].x+=.01,
  'broken G3':d=>d.edges[70].points[0].z+=.01,
  'interior vertex moved':d=>d.edges[12].points[4].z+=.1,
  'nonfinite coordinate':d=>d.edges[0].points[0].x=NaN,
  'zero length segment':d=>d.edges[0].points[1]=d.edges[0].points[0],
  'length corruption':d=>d.edges[0].length++,
  'hidden out of range':d=>d.edges[28].hiddenIntervalsMm[0][1]++,
  'source hidden lost':d=>d.edges[28].sourceHiddenIntervalsMm=[],
  'wrong WX state':d=>d.edges[12].requiredState=false,
  'nonboolean state':d=>d.edges[12].requiredState='X',
  'wrong simple state':d=>d.edges[34].requiredState=false,
  'split unit identity':d=>d.edges[12].unit='WX-A-2',
  'missing control path':d=>d.controllers[0].internal.pop(),
  'wrong port':d=>d.controllers[0].ports.A=d.controllers[0].ports.B,
  'invented default':d=>d.controllers[0].initialState=false,
  'wrong terminal':d=>d.terminals[2].type='buffer-N16',
  'invented stopping anchor':d=>d.terminals[0].stopAnchor=0,
  'open ring':d=>d.mainLoops[0].segments.pop(),
  'wrong ring direction':d=>d.mainLoops[0].segments[0].sign*=-1,
  'triangle direct admission':d=>d.itineraries.TRIANGLE_GEOMETRIC_CYCLE.directTransitAllowed=true,
  'triangle maneuver enabled':d=>d.manoeuvres.triangle.runtimeAdmission=true,
  'wrong itinerary state':d=>d.itineraries.C.requiredStates['V06-C07']=true,
  'wrong source hash':d=>d.provenance.candidateSha256='0'.repeat(64),
  'wrong baseline':d=>d.provenance.baselineCommit='main',
  'false certification':d=>d.physical_profile_certified=true,
  'false circulation claim':d=>d.runtime_circulation_verified=true,
  'unknown schema':d=>d.schema='serien-v06-operational-2',
  'implicit legacy reference':d=>d.legacyFallback='T47'
};
for(const [name,mutate] of Object.entries(mutations))test(`R1A negative: ${name}`,()=>{
  const bad=clone();mutate(bad);assert.throws(()=>validateDataset(bad));
});
