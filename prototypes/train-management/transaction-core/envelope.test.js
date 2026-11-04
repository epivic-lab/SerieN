import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepare } from './envelope.js';
const context={workspaceId:'10000000-0000-4000-8000-000000000001',layoutId:'10000000-0000-4000-8000-000000000003'};
const envelope={...context,operation:'SaveCheckpoint',expectedRevision:'0',recoverySourceRevision:null,state:{}};
test('canonical envelope independent of insertion order, with JCS number handling',()=>{
 const a={...envelope,state:{z:-0,a:1e-7,b:0.000001}};
 const b=Object.fromEntries(Object.entries(a).reverse());
 assert.deepEqual(prepare(JSON.stringify(a),context),prepare(JSON.stringify(b),context));
 assert.match(prepare(JSON.stringify(a),context).wire,/"state":\{"a":1e-7,"b":0.000001,"z":0\}/);
});
for (const [name,raw] of [
 ['duplicate decoded keys',JSON.stringify(envelope).replace('"state":{}','"state":{"x":1,"\\u0078":2}')],
 ['nonfinite',JSON.stringify(envelope).replace('"state":{}','"state":{"x":1e999}')],
 ['unexpected envelope property',JSON.stringify({...envelope,actor:'forged'})],
 ['unsafe revision overflow',JSON.stringify({...envelope,expectedRevision:'9223372036854775807'})],
 ['numeric revision',JSON.stringify({...envelope,expectedRevision:0})],
 ['leading zero revision',JSON.stringify({...envelope,expectedRevision:'01'})],
 ['unknown operation',JSON.stringify({...envelope,operation:'SQL'})],
 ['unexpected recovery source',JSON.stringify({...envelope,recoverySourceRevision:'1'})],
 ['invalid Unicode',JSON.stringify({...envelope,state:{name:'\ud800'}})],
 ['oversize',JSON.stringify({...envelope,state:{x:'a'.repeat(2*1024*1024)}})],
]) test(name,()=>assert.throws(()=>prepare(raw,context)));
test('verified context cannot come from body',()=>assert.throws(()=>prepare(JSON.stringify(envelope),{...context,workspaceId:context.layoutId})));
