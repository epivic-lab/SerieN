// Verification only. Original E1 fixture and all R1 sources stay unchanged.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {createNetwork} from '../src/network.js';
import {routing} from '../src/simulation.js';
import {captureJourney} from '../src/persistence/capture.js';
import {hydrateJourney,validateDocument} from '../src/persistence/validate.js';
import {stageState} from '../src/persistence/hydrate.js';
import {createIdentities} from '../src/persistence/identity.js';
import {buildStock} from '../src/rolling-stock.js';

const base=JSON.parse(execFileSync(process.execPath,
 [new URL('./gen-6b2c-fixture.mjs',import.meta.url).pathname,'--with-loose'],{encoding:'utf8'}));
const network=createNetwork(),context={workspaceId:base.workspaceId,layoutId:base.layoutId};
const builders={
 build:async item=>{const g=buildStock(item.nativeKind);g.userData.persistenceKind=item.nativeKind;return g;},
 describe:g=>({couplers:g.userData.couplers,nativeCouplers:g.userData.couplers}),
 dispose:g=>g.traverse(o=>{o.geometry?.dispose();for(const m of [o.material].flat().filter(Boolean))m.dispose();})
};
async function r1Document(doc){
 validateDocument(doc,context,network);
 const staged=await stageState(doc,context,network,builders,createIdentities());
 for(const g of staged.groups.values())builders.dispose(g);
}
assert(base.trains.length>=1&&base.looseStock.length===1);
await r1Document(base); // Includes actual trusted builders and validateStaging.
const cases=[];
function add(id,doc,expected,scope,extra={}){
 cases.push({id,requestId:crypto.randomUUID(),expected,scope,document:doc,...extra});
}
add('original-with-loose',structuredClone(base),'ACCEPT','R1_FULL_DOCUMENT');

// Legitimate repeated edges / negative starts: extend actual R1 history only.
// The pose is unchanged. Fail loudly if the router cannot construct this case.
const extended=structuredClone(base),j=hydrateJourney(extended.trains[0].journey,network);
const route=routing(network,()=>false);
for(let n=0;j.segments[0].start>=0&&n<200;n++)assert(j.extend(false,route),'negative history extension blocked');
for(let n=0;new Set(j.segments.map(s=>s.id)).size===j.segments.length&&n<200;n++)
 assert(j.extend(true,route),'repeated-edge history extension blocked');
assert(j.segments[0].start<0,'negative start not exercised');
assert(new Set(j.segments.map(s=>s.id)).size<j.segments.length,'repeated edge not exercised');
extended.trains[0].journey=captureJourney(j);
await r1Document(extended);
add('negative-start-and-repeated-edge',extended,'ACCEPT','R1_FULL_DOCUMENT');

for(const collection of ['trains','looseStock']){
 const original=base[collection][0].journey;
 assert(original.segments.length>=2);
 function suffix(delta){
  const doc=structuredClone(base);
  for(const seg of doc[collection][0].journey.segments.slice(1)){seg.start+=delta;seg.end+=delta;}
  return doc;
 }
 // Original eight negatives, each independently cloned from the same base.
 for(const delta of [1,-1])
  add(`${collection}-original-continuity-${delta}`,suffix(delta),'INVALID_JOURNEY_CONTINUITY','SQL_PREDICATE');
 for(const end of ['start','end']){
  const doc=structuredClone(base);
  doc[collection][0].journey.position=end==='start'?original.segments[0].start-1e-7:original.segments.at(-1).end+1e-7;
  add(`${collection}-original-position-${end}`,doc,'INVALID_JOURNEY_POSITION','SQL_PREDICATE');
 }
 for(const delta of [5e-7,-5e-7,2e-6,-2e-6]){
  const doc=suffix(delta),accept=Math.abs(delta)<=1e-6;
  let r1JourneyAccepted=true;
  try{hydrateJourney(doc[collection][0].journey,network);}catch{r1JourneyAccepted=false;}
  assert.equal(r1JourneyAccepted,accept,'R1 scalar history oracle disagrees');
  add(`${collection}-tolerance-${delta}`,doc,accept?'ACCEPT':'INVALID_JOURNEY_CONTINUITY',
   'SQL_PREDICATE',{r1JourneyAccepted});
 }
 // Exact decimal threshold is a SQL-only assertion: do not claim IEEE-754
 // hydrateJourney equivalence at a subtraction rounded across the boundary.
 for(const delta of ['0.000001','-0.000001'])
  add(`${collection}-exact-threshold-${delta}`,structuredClone(base),'ACCEPT',
   'SQL_PREDICATE',{sqlExactSuffixDelta:delta,collection});
 for(const end of ['start','end']){
  const doc=structuredClone(base);
  doc[collection][0].journey.position=end==='start'?original.segments[0].start:original.segments.at(-1).end;
  // Only hydrateJourney is the oracle here: body coverage/location may fail.
  hydrateJourney(doc[collection][0].journey,network);
  add(`${collection}-inclusive-${end}`,doc,'ACCEPT','SQL_PREDICATE',{r1JourneyAccepted:true});
 }
}
assert.equal(cases.length,26);
assert.equal(new Set(cases.map(c=>c.requestId)).size,cases.length);
const output={base,cases,notes:{
 fullDocumentOracle:'validateDocument + stageState (including validateStaging)',
 predicateOracle:'hydrateJourney only; SQL_PREDICATE is NOT a full R1-valid DTO',
 tolerance:'within +/-0.5e-6, outside +/-2e-6; serialized IEEE-754 values tested as emitted'
}};
writeFileSync(process.argv[2]??'/tmp/serien-e1v/cases-v2.json',JSON.stringify(output));
console.log('Prepared 26 cases; original and extended DTOs passed full R1 staging.');
