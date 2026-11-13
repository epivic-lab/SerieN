import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
import {createNetwork} from '../../src/network.js';
import {createRailwaySession} from './railway-session.js';
import {validateArtifact,sha256,datasetSha256} from './validate-r1a.js';

const result=await build({entryPoints:['app.js'],bundle:true,minify:true,format:'esm',
  outfile:'dist/game.js',write:false,metafile:true});
const bytes=result.outputFiles[0].contents;
assert.deepEqual(Buffer.from(bytes),readFileSync('dist/game.js'));
assert.equal(sha256(bytes),'9eaa6b7273bc8597040a24febae71334c0f08cefd4f384151ff458f4543e2a66');
const inputs=Object.keys(result.metafile.inputs),forbidden=inputs.filter(p=>/datasets\/v06|scenario-v06/.test(p));
assert.deepEqual(forbidden,[]);
const artifact=readFileSync('src/datasets/v06-r1a.json'),admission=validateArtifact(artifact);
assert.equal(sha256(artifact),datasetSha256);
const legacy=JSON.stringify(createNetwork());
assert.equal(sha256(legacy),'ec5c0309f3b7aee5e8af9a996b0bd3b5b3bd03d31ee732cc75286bc2b0904413');
for(const profile of ['legacy','v06','legacy']){
  const s=createRailwaySession({profile});assert.equal(s.readiness().runtimeAdmission,false);s.dispose();
}
assert.equal(JSON.stringify(createNetwork()),legacy);
console.log(JSON.stringify({status:'PASS_SCOPE_DATASET_BUNDLE',baseline:'b49320c6be4d9f149bb2c5473858c616925a5f6c',
  node:process.version,bundle:{bytes:bytes.length,sha256:sha256(bytes),inputs:inputs.length,forbidden},
  dataset:{sha256:sha256(artifact),admission:admission.status,edges:79,nodes:74,
    physical_profile_certified:false,runtime_circulation_verified:false},
  legacyNetwork:{bytes:Buffer.byteLength(legacy),sha256:sha256(legacy)},runtimeAdmission:false,
  inputPaths:inputs},null,2));
