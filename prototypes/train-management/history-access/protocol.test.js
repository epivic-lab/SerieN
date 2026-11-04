import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifySnapshot,stateDigest,LocalBudget,retryDelay,guardedRequest,requestWithRetry} from './protocol.js';
const state=JSON.parse(readFileSync(new URL('../../../docs/_active/train-management/evidence/6A1/schema-fixture.json',import.meta.url)));
const ctx={workspaceId:state.workspaceId,layoutId:state.layoutId,deviceId:state.stateId,engineRevision:state.engineRevision,topologyHash:state.topologyHash};
const packet=()=>({state:structuredClone(state),stateDigest:stateDigest(state),envelopeDigest:'a'.repeat(64),canonicalVersion:'jcs-profile-v1',schemaVersion:1,engineRevision:state.engineRevision,topologyHash:state.topologyHash,snapshotId:state.stateId,revision:'1',assetRefs:state.models.map(m=>({modelId:m.id,revision:m.revision,asset:m.asset}))});
test('snapshot content verified independently from envelope receipt',()=>assert.deepEqual(verifySnapshot(JSON.stringify(packet()),ctx),packet()));
for(const [label,mutate,error] of [
 ['corrupt payload',p=>p.state.ui.day=1,'INTEGRITY_ERROR'],
 ['state hash differs',p=>p.stateDigest='f'.repeat(64),'INTEGRITY_ERROR'],
 ['wrong serialization version',p=>p.canonicalVersion='jsonb-text','INCOMPATIBLE_SNAPSHOT'],
 ['schema version',p=>p.schemaVersion=2,'INCOMPATIBLE_SNAPSHOT'],
 ['state schema version',p=>p.state.schemaVersion=2,'INCOMPATIBLE_SNAPSHOT'],
 ['engine revision',p=>p.engineRevision='other','INCOMPATIBLE_SNAPSHOT'],
 ['state engine revision',p=>p.state.engineRevision='other','INCOMPATIBLE_SNAPSHOT'],
 ['topology hash',p=>p.topologyHash='f'.repeat(64),'INCOMPATIBLE_SNAPSHOT'],
 ['state topology',p=>p.state.topologyHash='f'.repeat(64),'INCOMPATIBLE_SNAPSHOT'],
 ['workspace binding',p=>p.state.workspaceId=state.layoutId,'FORBIDDEN'],
 ['layout binding',p=>p.state.layoutId=state.workspaceId,'FORBIDDEN'],
 ['manifest reference',p=>p.assetRefs=[],'INTEGRITY_ERROR'],
 ['revision zero',p=>p.revision='0','INTEGRITY_ERROR'],
])test(label,()=>{const p=packet();mutate(p);assert.throws(()=>verifySnapshot(JSON.stringify(p),ctx),new RegExp(error));});
test('response bytes bounded before parse',()=>assert.throws(()=>verifySnapshot('x'.repeat(262145),ctx),/RESPONSE_TOO_LARGE/));
test('device and aggregate workspace limits count denied attempts',()=>{
 let now=0;const b=new LocalBudget({device:2,workspace:3,windowMs:1000,now:()=>now});
 b.take(ctx);b.take(ctx);assert.throws(()=>b.take(ctx),/RATE_LIMITED/);
 assert.throws(()=>b.take({...ctx,deviceId:state.layoutId}),/RATE_LIMITED/);
 now=1000;b.take(ctx);assert.equal(b.windows.size,2);
});
test('bounded limiter memory',()=>{const b=new LocalBudget({maxSubjects:2});b.take(ctx);assert.throws(()=>b.take({...ctx,workspaceId:state.layoutId}),/RATE_LIMITED/);});
test('backoff preserves rate retry-after and grows to bounded ceiling',()=>{
 assert.equal(retryDelay(Object.assign(Error('RATE_LIMITED'),{retryAfterMs:60000}),0),60000);
 assert.equal(retryDelay(Error('RETRYABLE_UNAVAILABLE'),0),250);
 assert.equal(retryDelay(Error('RETRYABLE_UNAVAILABLE'),20),10000);
 for(const code of ['FORBIDDEN','QUOTA_EXCEEDED','INTEGRITY_ERROR','INCOMPATIBLE_SNAPSHOT'])assert.equal(retryDelay(Error(code),2),null);
});
test('malformed request attempts count and audit omits payload/secrets',async()=>{
 const b=new LocalBudget({device:2}),audit=[];let calls=0;
 const transport=async()=>{calls++;return {ok:true};};
 await assert.rejects(guardedRequest('{',ctx,transport,b,e=>audit.push(e)),/INVALID_REQUEST/);
 await assert.rejects(guardedRequest('{"token":"synthetic-not-a-secret","token":2}',ctx,transport,b,e=>audit.push(e)),/INVALID_REQUEST/);
 await assert.rejects(guardedRequest('{}',ctx,transport,b,e=>audit.push(e)),/RATE_LIMITED/);
 assert.equal(calls,0);assert.equal(audit.length,3);
 assert(audit.every(e=>Object.keys(e).sort().join(',')==='deviceId,outcome,workspaceId'));
});
test('request bytes rejected before transport',async()=>{let called=false;await assert.rejects(guardedRequest('x'.repeat(2097153),ctx,async()=>{called=true;},new LocalBudget()),/PAYLOAD_TOO_LARGE/);assert.equal(called,false);});
test('response bytes rejected without truncation',async()=>{await assert.rejects(guardedRequest('{}',ctx,async()=>({data:'a'.repeat(100)}),new LocalBudget(),()=>{},20),/RESPONSE_TOO_LARGE/);});
test('unexpected transport error text redacted',async()=>{await assert.rejects(guardedRequest('{}',ctx,async()=>{throw Error('sensitive-transport-detail');},new LocalBudget()),/^Error: DENIED$/);});
test('successful bounded request',async()=>assert.deepEqual(await guardedRequest('{}',ctx,async()=>({ok:true}),new LocalBudget()),{ok:true}));

test('transient retry uses the exact same request id and measured backoff',async()=>{
 const raw=JSON.stringify({request_id:state.stateId});const received=[],waits=[];
 const result=await requestWithRetry(raw,ctx,async value=>{received.push(JSON.stringify(value));if(received.length<3)throw Error('RETRYABLE_UNAVAILABLE');return {ok:true};},{wait:async ms=>waits.push(ms)});
 assert.deepEqual(result,{ok:true});assert.deepEqual(waits,[250,500]);assert(received.every(s=>s===raw));
});
test('permanent conflict and quota do not auto-retry',async()=>{
 for(const code of ['QUOTA_EXCEEDED','REVISION_CONFLICT','FORBIDDEN']){let calls=0;await assert.rejects(requestWithRetry('{}',ctx,async()=>{calls++;throw Error(code);},{wait:async()=>assert.fail('unexpected retry')}),new RegExp(code));assert.equal(calls,1);}
});
