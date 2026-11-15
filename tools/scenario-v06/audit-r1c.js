// Read-only reproducible evidence. Run from the repository root after build.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {build} from 'esbuild';
import {createNetwork} from '../../src/network.js';
import {createRailwaySession,replaceRailwaySession} from './railway-session.js';
import {sha256,datasetSha256} from './validate-r1a.js';

const baseline='b8f4f3cb98a3c5f49aa8713a96d2c10b445fb67b';
const result=await build({entryPoints:['app.js'],bundle:true,minify:true,format:'esm',
  outfile:'dist/game.js',write:false,metafile:true});
const bundle=result.outputFiles[0].contents;
assert.deepEqual(Buffer.from(bundle),readFileSync('dist/game.js'));
assert.equal(sha256(bundle),'9eaa6b7273bc8597040a24febae71334c0f08cefd4f384151ff458f4543e2a66');
const prohibitedInputs=Object.keys(result.metafile.inputs).filter(p=>/datasets\/v06|scenario-v06/.test(p));
assert.deepEqual(prohibitedInputs,[]);
const serialized=JSON.stringify(createNetwork());
assert.equal(sha256(serialized),'ec5c0309f3b7aee5e8af9a996b0bd3b5b3bd03d31ee732cc75286bc2b0904413');
assert.equal(sha256(readFileSync('src/datasets/v06-r1a.json')),datasetSha256);
const files=['app.js',...readdirSync('src',{recursive:true}).filter(p=>p.endsWith('.js')).map(p=>'src/'+p)];
const directCanonicalImports=files.flatMap(file=>readFileSync(file,'utf8').split('\n').flatMap((line,i)=>
  /import .*canonical-layout\.json/.test(line)?[{file,line:i+1,source:line}]:[]));
assert.deepEqual(directCanonicalImports.map(r=>r.file).sort(),[
  'src/landscape.js','src/network.js','src/scenic-plan.js','src/turnout-registry.js','src/zone-layout.js']);
const legacyReferences=files.flatMap(file=>readFileSync(file,'utf8').split('\n').flatMap((line,i)=>
  /TURNOUT_IDS|isTurnoutId|T47|runaround|mainLoops|previousLane|controlOrder/.test(line)?[{file,line:i+1,source:line.trim()}]:[]));
const profiles=['legacy','v06'].map(profile=>{
  const s=createRailwaySession({profile});
  const snapshot={identity:s.identity,admission:s.admission,readiness:s.readiness(),ids:s.registry.ids,spawnPlan:s.spawnPlan};
  if(profile==='legacy')assert.equal(JSON.stringify(s.network),serialized);
  s.dispose();return snapshot;
});
const a=createRailwaySession({profile:'legacy'}),b=replaceRailwaySession(a,{profile:'v06'}),c=replaceRailwaySession(b,{profile:'legacy'});
assert.equal(a.disposed,true);assert.equal(b.disposed,true);
assert.notEqual(a.network,c.network);assert.equal(JSON.stringify(c.network),serialized);c.dispose();
console.log(JSON.stringify({status:'PASS_R1C_STATIC_LAB_ONLY',baseline,node:process.version,
  bundle:{bytes:bundle.length,sha256:sha256(bundle),inputs:Object.keys(result.metafile.inputs).length,prohibitedInputs},
  legacyNetwork:{bytes:Buffer.byteLength(serialized),sha256:sha256(serialized)},
  profiles,directCanonicalImports,legacyReferences,
  lifecycle:'legacy -> v06 -> new legacy; disposed resources; no motion executed',
  runtimeAdmission:false,browserV06:'NOT_EXECUTED',dynamicV06:'NOT_AUTHORIZED'},null,2));
