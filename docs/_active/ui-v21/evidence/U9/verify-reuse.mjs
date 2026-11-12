// Prove the post-header evidence bundle differs only by the final two semantic DOM changes.
import {build} from 'esbuild';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const expected='a14d1667d6e26b90c4a03711b8795f06efce914ee8261f093d9780bc2e40b523';
const sha=b=>createHash('sha256').update(b).digest('hex');
const result=await build({entryPoints:['app.js'],bundle:true,minify:true,format:'esm',outfile:'dist/game.js',write:false,plugins:[{name:'reconstruct-presemantic-header-evidence',setup(b){b.onLoad({filter:/[/\\]src[/\\]train-deck\.js$/},async({path})=>{
 let s=readFileSync(path,'utf8');assert(s.includes("  tabs.setAttribute('role','group');\n"));
 s=s.replace("  tabs.setAttribute('role','group');\n",'');
 const at='      setText(card.length,`${length.toFixed(0)} mm`);';assert(s.includes(at));s=s.replace(at,"      card.cars.setAttribute('aria-label',card.cars.title);\n"+at);
 return {contents:s,loader:'js'};
});}}]});
const actual=sha(result.outputFiles[0].contents);assert.equal(actual,expected);
const root=new URL('.',import.meta.url);
writeFileSync(new URL('header-evidence-reuse.json',root),JSON.stringify({status:'PASS',reconstructedPreSemanticBundle:actual,expectedPreSemanticBundle:expected,finalBundle:sha(readFileSync('dist/game.js')),method:'Reconstructed a14d… byte-for-byte from all final production sources, reversing only role=group addition and removal of generic span aria-label in train-deck. No production files written.',reusedEvidence:['header-engraved-plaque/delivery/results.json','U2-header-final/result.json','native-header-final/results.json'],limits:'These executions retain their actual bundle hash. Final native/visual gates validate final bundle separately.'},null,2)+'\n');
console.log('PASS exact pre-semantic bundle reconstruction; all other production sources including shell identical');
