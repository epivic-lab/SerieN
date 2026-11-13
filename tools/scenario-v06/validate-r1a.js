// Independent Node-only admission checker. No builder import and no legacy data.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const base = 'docs/_active/scenario-v06/';
export const datasetPath = 'src/datasets/v06-r1a.json';
export const datasetSha256 = '4fd022e1173ef5517a7c826f4163dd10ab1ff776e1ecfaf144f53d40473ccef7';
export const sha256 = data => createHash('sha256').update(data).digest('hex');
const read = path => readFileSync(resolve(root, path));
const oracleBytes = read(base + 'evidence/R1A/oracle.json');
assert.equal(sha256(oracleBytes), '56199a3f625fbce25b6e69fcde2357841bc17ccc3c5bfa1f658c7e196132591a', 'oracle lock');
export const oracle = JSON.parse(oracleBytes);
const candidateBytes = read(base + 'candidate/R02/track.json');
assert.equal(sha256(candidateBytes), oracle.candidateSha256, 'R02 input lock');
const source = JSON.parse(candidateBytes);
export const edgeId = i => `V06-P${String(i).padStart(3, '0')}`;
const nodeId = id => 'V06-' + id;
const norm = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
const approx = (a,b,label) => assert.ok(Number.isFinite(a) && Math.abs(a-b)<1e-8,label);
const sorted = values => [...values].sort();
function exactKeys(value, keys, label) { assert.deepEqual(sorted(Object.keys(value)), sorted(keys), label); }
export function validateDataset(data) {
  assert.ok(data && typeof data === 'object', 'dataset object');
  exactKeys(data, ['schema','layoutId','version','units','railTopMm','physical_profile_certified',
    'runtime_circulation_verified','activation','provenance','nodes','edges','controllers',
    'terminals','mainLoops','itineraries','manoeuvres','gaps','statistics','limitations'], 'schema keys');
  assert.equal(data.schema,'serien-v06-operational-1');
  assert.equal(data.layoutId,'V06-R1A'); assert.equal(data.version,1);
  assert.equal(data.units,'mm'); assert.equal(data.railTopMm,8.4);
  assert.equal(data.activation,'ISOLATED_OPT_IN_ONLY');
  assert.equal(data.physical_profile_certified,false); assert.equal(data.runtime_circulation_verified,false);
  assert.deepEqual(data.provenance, {
    baselineCommit: oracle.baseline, candidate: base+'candidate/R02/track.json',
    candidateSha256: oracle.candidateSha256, sourceAxesSha256: source.source_axes_sha256,
    alignmentSha256: source.source_sha256,
    qualityGate:'https://github.com/epivic-lab/SerieN/pull/13#issuecomment-6851925629'
  }, 'lineage');
  assert.equal(data.edges.length,79); assert.equal(data.controllers.length,7);
  assert.equal(Object.keys(data.nodes).length,74);
  assert.equal(new Set(data.edges.map(e=>e.id)).size,79,'duplicate edge');
  assert.equal(new Set(data.controllers.map(c=>c.id)).size,7,'duplicate controller');
  const edges = Object.fromEntries(data.edges.map(e=>[e.id,e]));
  const controllers = Object.fromEntries(data.controllers.map(c=>[c.id,c]));
  const incidence = Object.fromEntries(Object.keys(data.nodes).map(id=>[id,[]]));
  const lanePieces = {};
  for (const [lane,name] of ['C','B','A'].entries()) for (const [i] of oracle.routes[name].piece_walk) lanePieces[i]=lane;
  for (const original of source.pieces) {
    const i=original.piece, e=edges[edgeId(i)]; assert.ok(e,'missing piece '+i);
    const controlled = Boolean(original.unit), crossover = original.required_state==='X';
    exactKeys(e, ['id','to','points','length','sourcePiece','geometryRef','hiddenIntervalsMm','sourceHiddenIntervalsMm','direction','role','from',
      ...(i in lanePieces?['lane','circuit']:[]), ...(controlled?['unit','switchId','requiredState','fromPort','toPort']:[]),
      ...(crossover?['fromLane','toLane']:[])], 'edge schema '+i);
    assert.equal(e.sourcePiece,i);
    assert.equal(e.geometryRef,base+`candidate/R02/track.json#/pieces/${i}`);
    assert.equal(e.direction,'from-to; reverse traversal allowed');
    assert.equal(e.role,crossover?'crossover':i in lanePieces?'mainline':'branch');
    assert.deepEqual(e.points,original.points.map(([x,z])=>({x,z})),'all original vertices '+i);
    assert.deepEqual(e.sourceHiddenIntervalsMm,original.hidden_intervals_mm,'hidden source '+i);
    assert.deepEqual(e.hiddenIntervalsMm,original.hidden_intervals_mm.map(([a,b])=>[a,Math.min(b,e.length)]),'bounded hidden '+i);
    assert.equal(e.from,nodeId(original.from_node)); assert.equal(e.to,nodeId(original.to_node));
    assert.notEqual(e.from,e.to,'self loop');
    let length=0;
    for(let j=1;j<e.points.length;j++) { const step=norm(e.points[j-1],e.points[j]); assert.ok(step>0 && Number.isFinite(step),'degenerate'); length+=step; }
    approx(e.length,length,'measured length '+i); approx(e.length,original.length_mm,'source length '+i);
    for (const [end,node,p] of [[0,e.from,e.points[0]],[1,e.to,e.points.at(-1)]]) {
      assert.ok(Object.hasOwn(data.nodes,node),'missing node');
      approx(norm(p,data.nodes[node]),0,'endpoint'); incidence[node].push({edge:e.id,end});
    }
    for (const [a,b] of e.hiddenIntervalsMm) assert.ok(a>=0 && b>a && b<=e.length,'hidden range');
    if(i in lanePieces) { assert.equal(e.lane,lanePieces[i]); assert.equal(e.circuit,['C','B','A'][e.lane]); }
    if(controlled) {
      assert.equal(e.unit,original.unit); assert.equal(e.switchId,e.unit);
      assert.equal(e.requiredState,['X','S1'].includes(original.required_state));
      const c=controllers[e.unit]; assert.ok(c,'missing control');
      assert.equal(c.ports[e.fromPort],e.from); assert.equal(c.ports[e.toPort],e.to);
      if(crossover) {
        const upper=e.unit==='WX-A'?1:2, lower=upper-1;
        assert.equal(e.fromLane,e.fromPort==='UR'?upper:lower);
        assert.equal(e.toLane,e.toPort==='UL'?upper:lower);
      }
    }
  }
  const terminalEndpoints = new Set(['20.S','43.S','51.S']);
  for(const j of source.junctions) {
    const id=nodeId(j.id), n=data.nodes[id]; assert.ok(n,'junction');
    assert.deepEqual(n,{id,x:j.point_mm[0],z:j.point_mm[1],terminal:j.endpoints.some(e=>terminalEndpoints.has(e)),sourceJunction:j.id,endpoints:j.endpoints},'node registry');
    assert.deepEqual(sorted(incidence[id].map(p=>`${edges[p.edge].sourcePiece}.${p.end?'E':'S'}`)), sorted(j.endpoints),'incidence');
  }
  for(const frozen of source.controllers) {
    const c=controllers[frozen.id]; assert.ok(c,'controller inventory');
    exactKeys(c,['id','sourceId','code','name','kind','ports','internal','x','z','states','initialState','physicalCommandPolarity'],'controller schema');
    assert.equal(c.sourceId,frozen.manual_component); assert.equal(c.code,frozen.kato_code); assert.equal(c.name,c.id);
    assert.equal(c.kind,frozen.type==='WX310'?'cross':'single');
    assert.equal(c.x,frozen.reference_point_plan_mm[0]); assert.equal(c.z,frozen.reference_point_plan_mm[1]);
    assert.equal(c.initialState,null,'no invented initial state');
    assert.equal(c.physicalCommandPolarity,'NOT_CERTIFIED');
    assert.deepEqual(c.states,c.kind==='single'?{false:'S0',true:'S1'}:{false:'N',true:'X'});
    exactKeys(c.ports,Object.keys(frozen.ports_plan_mm),'ports');
    for(const [port,[x,z]] of Object.entries(frozen.ports_plan_mm)) assert.deepEqual([data.nodes[c.ports[port]].x,data.nodes[c.ports[port]].z],[x,z]);
    assert.deepEqual(sorted(c.internal),sorted(data.edges.filter(e=>e.unit===c.id).map(e=>e.id)),'unit coverage');
  }
  // Truth tables predate the builder: all ordered pairs, including all forbidden pairs.
  for(const row of [...oracle.wx,...oracle.simple]) {
    const c=controllers[row.unit], state=['X','S1'].includes(row.state);
    const found=c.internal.map(id=>edges[id]).filter(e=>e.requiredState===state && row.entry!==row.exit &&
      ((e.from===c.ports[row.entry] && e.to===c.ports[row.exit]) || (e.to===c.ports[row.entry] && e.from===c.ports[row.exit])));
    assert.equal(found.length,Number(row.allowed),'truth table '+JSON.stringify(row));
    if(row.allowed && row.piece!==undefined) assert.equal(found[0].sourcePiece,row.piece);
  }
  const seen=new Set(), todo=[Object.keys(incidence)[0]];
  while(todo.length) { const id=todo.pop(); if(seen.has(id))continue;seen.add(id);for(const p of incidence[id]) { const e=edges[p.edge];todo.push(e.from===id?e.to:e.from); } }
  assert.equal(seen.size,74,'connected graph');
  assert.deepEqual(data.statistics,{nodes:74,edges:79,components:1,cycleRank:6,terminals:3});
  const singles=Object.entries(incidence).filter(([,ps])=>ps.length===1).map(([id])=>id);
  assert.deepEqual(sorted(singles),sorted(data.terminals.map(t=>t.id)),'only declared terminals');
  assert.equal(data.terminals.length,3);
  for(const [index,endpoint] of ['20.S','43.S','51.S'].entries()) {
    const e=edges[edgeId(Number(endpoint.split('.')[0]))];
    assert.deepEqual(data.terminals[index],{id:e.from,edge:e.id,end:0,type:['buffer-N20','buffer-N10','open-N16'][index],sourceEndpoint:endpoint,physicalUsefulLengthCertified:false,stopAnchor:null});
  }
  assert.deepEqual(data.gaps,source.gaps,'G1/G2/G3 lineage');
  let maxTangentDegrees=0;
  for(const joint of oracle.junctions) {
    if(!joint.direct_transit)continue;
    const vector = endpoint => {
      const [i,end]=endpoint.split('.'), ps=edges[edgeId(+i)].points;
      const a=end==='S'?ps[0]:ps.at(-1), b=end==='S'?ps[1]:ps.at(-2);
      return [b.x-a.x,b.z-a.z];
    };
    const a=vector(joint.a), b=vector(joint.b);
    const degrees=Math.atan2(Math.abs(a[0]*b[1]-a[1]*b[0]),-(a[0]*b[0]+a[1]*b[1]))*180/Math.PI;
    approx(degrees,joint.sampled_tangent_mismatch_deg,'independent tangent');
    maxTangentDegrees=Math.max(maxTangentDegrees,degrees);
  }
  approx(maxTangentDegrees,oracle.maxTangentDegrees,'maximum inherited tangent');
  const walk=(segments,closed=false,permitSameUnit=false)=>{
    const pairs=segments.slice(1).map((s,i)=>[segments[i],s]);if(closed)pairs.push([segments.at(-1),segments[0]]);
    for(const [a,b] of pairs) { const e=edges[a.id],f=edges[b.id]; assert.ok(e&&f); assert.equal(a.sign===1?e.to:e.from,b.sign===1?f.from:f.to,'route continuity'); if(!permitSameUnit)assert.ok(!e.unit||e.unit!==f.unit,'forbidden same-unit transit'); }
  };
  assert.equal(data.mainLoops.length,3);
  for(const [lane,name] of ['C','B','A'].entries()) {
    const expected=oracle.routes[name].piece_walk.map(([i,sign])=>({id:edgeId(i),sign}));
    assert.deepEqual(data.mainLoops[lane],{lane,circuit:name,segments:expected});walk(expected,true);
  }
  exactKeys(data.itineraries,Object.keys(oracle.routes),'itineraries');
  const requiredStates=raw=>{
    const states={};
    for(const [i] of raw) { const e=edges[edgeId(i)];if(!e.unit)continue;
      if(Object.hasOwn(states,e.unit)&&states[e.unit]!==e.requiredState)return null;
      states[e.unit]=e.requiredState;
    }
    return states;
  };
  for(const [name,r] of Object.entries(oracle.routes)) {
    const segments=r.piece_walk.map(([i,sign])=>({id:edgeId(i),sign}));
    const closed=['A','B','C','TRIANGLE_GEOMETRIC_CYCLE'].includes(name);
    assert.deepEqual(data.itineraries[name],{segments,requiredStates:requiredStates(r.piece_walk),closed,directTransitAllowed:name!=='TRIANGLE_GEOMETRIC_CYCLE'});
    walk(segments,closed,name==='TRIANGLE_GEOMETRIC_CYCLE');
    if(name==='TRIANGLE_GEOMETRIC_CYCLE')assert.throws(()=>walk(segments,true),/forbidden same-unit/);
  }
  const directed=raw=>raw.map(([i,sign])=>({id:edgeId(i),sign}));
  const manoeuvre=oracle.walks.TRIANGLE_MANOEUVRE;
  assert.deepEqual(data.manoeuvres,{triangle:{
    approach:{segments:directed(manoeuvre.approach),requiredStates:requiredStates(manoeuvre.approach)},
    departure:{segments:directed(manoeuvre.departure),requiredStates:requiredStates(manoeuvre.departure)},
    requiredEvent:manoeuvre.required_event,stopAnchor:null,runtimeAdmission:false
  }},'triangle requires distinct legs and an explicit non-runtime event');
  const witnesses=[oracle.walks.TRIANGLE_MANOEUVRE.approach,oracle.walks.TRIANGLE_MANOEUVRE.departure,
    oracle.terminalWitnesses['51.S'].departure_via_N07_B_N14_C,oracle.terminalWitnesses['20.S'],oracle.terminalWitnesses['43.S']];
  for(const raw of witnesses) { walk(directed(raw));walk(directed(raw.toReversed().map(([i,s])=>[i,-s]))); }
  let activeArrivals=0, allArrivals=0;
  for(let mask=0;mask<128;mask++) {
    const state=Object.fromEntries(data.controllers.map((c,i)=>[c.id,Boolean(mask&(1<<i))]));
    const active=e=>!e.unit||state[e.unit]===e.requiredState;
    for(const e of data.edges)for(const node of [e.from,e.to]) {
      allArrivals++;
      if(!active(e))continue;
      activeArrivals++;
      const exits=incidence[node].filter(p=>p.edge!==e.id).map(p=>edges[p.edge]).filter(other=>(!e.unit||other.unit!==e.unit)&&active(other));
      assert.ok(exits.length<=1,'ambiguous state continuation');
    }
  }
  assert.equal(activeArrivals,17920);assert.equal(allArrivals,20224);
  assert.deepEqual(data.limitations,[
    'No spawn, certified stopping anchor, useful capacity or physical command polarity.',
    'Triangle geometric cycle is not a direct runtime itinerary: N07 requires stop/clear/throw/reverse.',
    'Unknown state must remain guarded by the existing engine; routing alone is not clearance.'
  ]);
  return {status:'PASS_DATASET_ONLY',edges:79,nodes:74,controllers:7,terminals:3,wxCases:64,simpleCases:90,
    stateConfigurations:128,activeArrivals,allArrivals,maxTangentDegrees};
}

export function validateArtifact(bytes) {
  assert.equal(sha256(bytes),datasetSha256,'versioned V06 artifact checksum');
  return validateDataset(JSON.parse(bytes));
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const bytes=read(process.argv[2]??datasetPath);
  const result=validateArtifact(bytes);
  console.log(JSON.stringify({...result,sha256:sha256(bytes)},null,2));
}
