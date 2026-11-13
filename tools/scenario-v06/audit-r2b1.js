import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
import {createNetwork} from '../../src/network.js';
import {createRailwaySession} from './railway-session.js';
import {validateArtifact,sha256} from './validate-r1a.js';
const BASE='9aa9656b1f40dec15215d4df366aae2e2e540904';
const original=file=>execFileSync('git',['show',`${BASE}:${file}`]);
const fixedModules=['src/next-switch.js','src/railway-guard.js'];for(const path of fixedModules)assert.deepEqual(readFileSync(path),original(path),'F1 module preserved');
const result=await build({entryPoints:['app.js'],bundle:true,minify:true,format:'esm',outfile:'dist/game.js',write:false,metafile:true});const bytes=result.outputFiles[0].contents;assert.deepEqual(Buffer.from(bytes),readFileSync('dist/game.js'));assert.equal(sha256(bytes),'89d732feafef5914078d5ef83885e5b9b68ff3abe967e8c4863a08e20a3063c7');const inputs=Object.keys(result.metafile.inputs),forbidden=inputs.filter(p=>/datasets\/v06|scenario-v06/.test(p));assert.equal(inputs.length,85);assert.deepEqual(forbidden,[]);
const artifact=readFileSync('src/datasets/v06-r1a.json'),admission=validateArtifact(artifact);assert.deepEqual(artifact,original('src/datasets/v06-r1a.json'));const legacy=JSON.stringify(createNetwork());assert.equal(sha256(legacy),'ec5c0309f3b7aee5e8af9a996b0bd3b5b3bd03d31ee732cc75286bc2b0904413');
const oracle=JSON.parse(readFileSync('docs/_active/scenario-v06/evidence/R1A/oracle.json')),topology=[];
// Compare every directed WX pair to physical port incidence and the existing
// router. This is an audit, never a movement router or a topology repair.
for(const unit of ['WX-A','WX-B'])for(const state of [false,true]){const s=createRailwaySession({profile:'v06'}),states=Object.fromEntries(s.registry.ids.map(id=>[id,id===unit?state:false]));s.configureLabStates(states);const c=s.network.controllers.find(c=>c.id===unit);
 for(const entry of Object.keys(c.ports)){const node=c.ports[entry],incoming=s.network.nodes[node].find(p=>s.network.edges[p.edge].unit!==unit);assert.ok(incoming);const chosen=s.route(incoming.edge,s.network.nodes[node].filter(p=>p.edge!==incoming.edge));assert.ok(chosen);const edge=s.network.edges[chosen.edge],exitNode=edge.from===node?edge.to:edge.from,actualExit=Object.keys(c.ports).find(port=>c.ports[port]===exitNode);
  for(const exit of Object.keys(c.ports)){const expected=oracle.wx.find(p=>p.unit===unit&&p.state===(state?'X':'N')&&p.entry===entry&&p.exit===exit);assert.ok(expected);assert.equal(actualExit===exit,expected.allowed);topology.push({...expected,actualExit,chosenEdge:chosen.edge,proof:{entryNode:node,exitNode,fromEdge:incoming.edge,originalRouterSelected:true}});}
 }assert.equal(s.readiness().runtimeAdmission,false);s.dispose();}
const baselineNames=new Set(execFileSync('git',['ls-tree','-r','--name-only','-z',BASE]).toString().split('\0'));
const newFiles=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z']).toString().split('\0').filter(p=>p&&!baselineNames.has(p));
// Report candidate locations only, never matching credential values.
const patterns=[/AKIA[0-9A-Z]{16}/g,/gh[pousr]_[A-Za-z0-9]{30,}/g,/github_pat_[A-Za-z0-9_]{40,}/g,/sb_secret_[A-Za-z0-9_-]{16,}/g,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,/["']service_role["']\s*:\s*["'][A-Za-z0-9_.-]{30,}/g];const candidates=[];for(const p of newFiles){const data=readFileSync(p);const content=(p.endsWith('.gz')?gunzipSync(data):data).toString('utf8');for(const re of patterns){re.lastIndex=0;for(const m of content.matchAll(re))candidates.push({path:p,line:content.slice(0,m.index).split('\n').length});}}assert.deepEqual(candidates,[],'new-file secret scan');
assert.equal(JSON.stringify(createNetwork()),legacy);
const audit={status:'PASS',baseline:BASE,node:process.version,bundle:{bytes:bytes.length,sha256:sha256(bytes),inputs:inputs.length,forbidden,inputPaths:inputs},fixedModules:fixedModules.map(path=>({path,sha256:sha256(readFileSync(path)),byteIdentical:true})),legacy:{bytes:Buffer.byteLength(legacy),sha256:sha256(legacy)},dataset:{sha256:sha256(artifact),admission:admission.status,runtimeAdmission:false,physical_profile_certified:false,runtime_circulation_verified:false},topology:{cases:topology.length,allowed:topology.filter(p=>p.allowed).length,forbidden:topology.filter(p=>!p.allowed).length,rows:topology},secretScan:{files:newFiles.length,candidates},runtimeAdmission:false};const output=JSON.stringify(audit,null,2)+'\n';if(process.argv[2])writeFileSync(process.argv[2],output);else console.log(output);
