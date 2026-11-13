// Audit both revisions without modifying the checkout or any branch.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import {resolve,relative} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {createRailwaySession} from './railway-session.js';
import {validateArtifact,sha256,datasetSha256} from './validate-r1a.js';
import {Journey,routing} from '../../src/simulation.js';
import {createSwitchTopology,traceJourney} from '../../src/next-switch.js';

const BASE='7bf4f1e04aef3ad0bc64ed8fb8fd82e3cbc43003';
const output=resolve(process.argv[2]??'work/r2a-f1');mkdirSync(output,{recursive:true});
const changed=['src/next-switch.js','src/railway-guard.js'];
const save=(name,value)=>writeFileSync(resolve(output,name),JSON.stringify(value,null,2)+'\n');
function baselinePlugin(preserveUrls=false) {
  return {name:'approved-r2a-sources',setup(builder){
    builder.onLoad({filter:preserveUrls?/\.js$/:/\/src\/(next-switch|railway-guard)\.js$/},args=>{
      const name=relative(process.cwd(),args.path).replaceAll('\\','/');
      let contents=changed.includes(name)?execFileSync('git',['show',`${BASE}:${name}`],{encoding:'utf8'}):readFileSync(args.path,'utf8');
      if(preserveUrls)contents=contents.replaceAll('import.meta.url',JSON.stringify(pathToFileURL(args.path).href));
      return {contents,loader:'js'};
    });
  }};
}

const options={entryPoints:['app.js'],bundle:true,minify:true,format:'esm',
  outfile:'dist/game.js',write:false,metafile:true};
const baseline=await build({...options,plugins:[baselinePlugin()]}),current=await build(options);
const bytes=r=>r.outputFiles[0].contents;
assert.equal(sha256(bytes(baseline)),'9eaa6b7273bc8597040a24febae71334c0f08cefd4f384151ff458f4543e2a66');
assert.deepEqual(Buffer.from(bytes(current)),readFileSync('dist/game.js'));
const inputs=Object.keys(current.metafile.inputs).sort();
assert.deepEqual(inputs,Object.keys(baseline.metafile.inputs).sort());
const forbidden=inputs.filter(p=>/datasets\/v06|scenario-v06/.test(p));assert.deepEqual(forbidden,[]);
const changedInputs=inputs.filter(p=>JSON.stringify(current.metafile.inputs[p])!==JSON.stringify(baseline.metafile.inputs[p]));
assert.deepEqual(changedInputs.sort(),changed.sort());
const artifact=readFileSync('src/datasets/v06-r1a.json');assert.equal(sha256(artifact),datasetSha256);
assert.equal(validateArtifact(artifact).status,'PASS_DATASET_ONLY');

const baselinePreviewPath=resolve(output,'baseline-next-switch.mjs');
await build({entryPoints:['src/next-switch.js'],bundle:true,platform:'node',format:'esm',
  outfile:baselinePreviewPath,plugins:[baselinePlugin()]});
const old=await import(pathToFileURL(baselinePreviewPath).href);
const previewAudit=[];
const primary=p=>{const {encounters,...rest}=p;return {...rest,next:p.next?{...p.next,site:p.next.site.id}:null};};
for(const profile of ['legacy','v06']) {
  const s=createRailwaySession({profile}),n=s.network;
  try {
    assert.equal(s.readiness().runtimeAdmission,false);
    const topology=createSwitchTopology(n),oldTopology=old.createSwitchTopology(n);
    assert.deepEqual(topology.sites,oldTopology.sites,'operation ranges are unchanged');
    if(profile==='legacy')assert.equal(sha256(JSON.stringify(n)),'ec5c0309f3b7aee5e8af9a996b0bd3b5b3bd03d31ee732cc75286bc2b0904413');
    let comparisons=0,additionalEncounters=0;
    for(let mask=0;mask<2**s.registry.ids.length;mask++) {
      const states=new Map(s.registry.ids.map((id,i)=>[id,Boolean(mask&(1<<i))]));
      const route=routing(n,id=>states.get(id));
      for(const edge of Object.values(n.edges))for(const direction of [1,-1]) {
        const journey=new Journey(n,edge.id,edge.length/2);
        journey.segments.forEach(Object.freeze);Object.freeze(journey.segments);Object.freeze(journey);
        const a=old.traceJourney(n,oldTopology,journey,direction,0,route,12000,false);
        const b=traceJourney(n,topology,journey,direction,0,route,12000,false);
        assert.deepEqual(primary(b),primary(a),'primary Next Switch, route and stop must remain identical');
        additionalEncounters+=b.encounters.length-a.encounters.length;comparisons++;
      }
    }
    previewAudit.push({profile,configurations:2**s.registry.ids.length,comparisons,additionalEncounters,
      topologySha256:sha256(JSON.stringify(topology.sites)),primaryRouteIdentical:true});
  } finally {s.dispose();}
}
save('audit.json',{status:'PASS',baseline:BASE,node:process.version,runtimeAdmission:false,
  bundle:{baseline:{bytes:bytes(baseline).length,sha256:sha256(bytes(baseline))},
    current:{bytes:bytes(current).length,sha256:sha256(bytes(current))},
    inputs:inputs.length,changedInputs,forbidden,inputPaths:inputs},
  datasetSha256:sha256(artifact),legacyNetworkSha256:'ec5c0309f3b7aee5e8af9a996b0bd3b5b3bd03d31ee732cc75286bc2b0904413',previewAudit});

if(process.argv.includes('--reproduce-baseline')) {
  const diagnosticPath=resolve(output,'baseline-diagnostic.mjs'),testPath=resolve(output,'baseline-tests.mjs');
  for(const [entry,outfile] of [['tools/scenario-v06/shared-junction-lab.js',diagnosticPath],['tests/v06-r2a-f1.test.js',testPath]])
    await build({entryPoints:[entry],bundle:true,platform:'node',format:'esm',outfile,plugins:[baselinePlugin(true)]});
  const {diagnoseSharedJunction}=await import(pathToFileURL(diagnosticPath).href);
  const result=diagnoseSharedJunction();
  save('baseline-reproduced.json',result);
  assert.equal(JSON.stringify(result,null,2)+'\n',readFileSync('docs/_active/scenario-v06/evidence/R2A-F1/before/adjacent-diagnostic.json','utf8'));
  const red=spawnSync(process.execPath,['--test','--test-name-pattern','negative:',testPath],{encoding:'utf8'});
  writeFileSync(resolve(output,'red-reproduced.txt'),red.stdout+red.stderr);
  assert.equal(red.status,1);assert.match(red.stdout,/fail 3/);
  save('baseline-reproduction.json',{status:'PASS',sourceRevision:BASE,diagnosticIdentical:true,
    diagnosticSha256:sha256(JSON.stringify(result,null,2)+'\n'),redExit:red.status,redFailures:3});
}
console.log('PASS: bundle, dataset, Legacy, all primary previews and optional baseline reproduction.');
