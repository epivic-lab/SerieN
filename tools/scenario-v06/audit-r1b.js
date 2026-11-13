// Read-only evidence collection: pinned data, instance registries and app bundle.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {createNetwork,validateNetwork} from '../../src/network.js';
import {createTurnoutRegistry} from '../../src/turnout-registry.js';
import {validateArtifact} from './validate-r1a.js';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const bytes=readFileSync('src/datasets/v06-r1a.json');
const admission=validateArtifact(bytes),dataset=JSON.parse(bytes);
const legacy=createNetwork(),v06=createNetwork(dataset);
const serialized=Buffer.from(JSON.stringify(legacy));
assert.equal(sha(serialized),'ec5c0309f3b7aee5e8af9a996b0bd3b5b3bd03d31ee732cc75286bc2b0904413');
const result=await build({entryPoints:['app.js'],bundle:true,minify:true,format:'esm',
  outfile:'dist/game.js',write:false,metafile:true});
const bundle=result.outputFiles[0].contents;
assert.deepEqual(Buffer.from(bundle),readFileSync('dist/game.js'));
const v06Inputs=Object.keys(result.metafile.inputs).filter(p=>/datasets\/v06|scenario-v06/.test(p));
assert.deepEqual(v06Inputs,[]);
const sourceHashes=Object.fromEntries(['src/turnout-registry.js','src/turnout-routes.js',
  'src/turnout-commands.js','tests/v06-r1b.test.js'].map(path=>[path,sha(readFileSync(path))]));
console.log(JSON.stringify({status:'PASS',baseline:'6a976749d5630c0abf858e64795210183a947f5e',
  node:process.version,sourceHashes,dataset:{sha256:sha(bytes),admission:admission.status,
    physical_profile_certified:dataset.physical_profile_certified,runtime_circulation_verified:dataset.runtime_circulation_verified},
  legacyNetwork:{bytes:serialized.length,sha256:sha(serialized),identicalToR1A:true},
  bundle:{bytes:bundle.length,sha256:sha(bundle),inputs:Object.keys(result.metafile.inputs).length,v06Inputs},
  profiles:[legacy,v06].map(network=>{const registry=createTurnoutRegistry(network);return {
    profileId:registry.profileId,network:validateNetwork(network),ids:registry.ids,controllers:registry.controllers};})},null,2));
