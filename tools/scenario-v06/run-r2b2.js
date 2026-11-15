import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {threeScenarioMatrix,failureContext} from './three-train-validation.js';
export function runMatrix(out,filter=''){mkdirSync(out,{recursive:true});const rows=[];for(const [id,run] of threeScenarioMatrix().filter(([id])=>id.includes(filter))){try{const r=run(),bytes=JSON.stringify(r,null,2)+'\n';writeFileSync(resolve(out,id+'.json'),bytes);const {samples,initial,final,events,crossings,firstStops,approaches,locks,...metrics}=r;rows.push({id,...metrics,finalTravelMm:final.trains.map(t=>t.travel),sha256:createHash('sha256').update(bytes).digest('hex')});console.log(`${id}: PASS ${r.progress} (${r.ticks} ticks)`);}catch(e){writeFileSync(resolve(out,'FAILURE.json'),JSON.stringify({id,message:e.message,stack:e.stack,repro:e.repro??failureContext()},null,2)+'\n');throw e;}}
 const result={status:'PASS_NUMERICAL_MATRIX',scenarios:rows.length,ticks:rows.reduce((n,r)=>n+r.ticks,0),matrix:rows,runtimeAdmission:false};writeFileSync(resolve(out,'summary.json'),JSON.stringify(result,null,2)+'\n');return result;}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))runMatrix(resolve(process.argv[2]??'/workspace/work/r2b2/run'),process.argv[3]??'');
