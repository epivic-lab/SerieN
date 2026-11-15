import {mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runIndependent,runFollowing,runFrontal,runWX,runReservations,runLiveRecheck,runMisaligned,runUnknownPair} from './two-train-validation.js';
export function scenarioMatrix(){const rows=[];for(const [a,b] of [['A','B'],['A','C'],['B','C']])for(const da of [1,-1])for(const db of [1,-1])rows.push([`S1-${a}${da}-${b}${db}`,()=>runIndependent(a,b,da,db)]);
 for(const [a,b] of [['A','B'],['A','C'],['B','C']])rows.push([`S1-${a}-${b}-cars`,()=>runIndependent(a,b,1,-1,true)]);
 for(const direction of [1,-1])for(const cars of [false,true])for(const mode of ['brake','STOP','stationary'])rows.push([`S2-${direction}-${cars}-${mode}`,()=>runFollowing({direction,cars,stationary:mode==='stationary',stopMode:mode})]);
 rows.push(['S3-frontal',()=>runFrontal()],['S3-diverging',()=>runFrontal(-1)]);
 for(const unit of ['WX-A','WX-B'])for(const state of [false,true])for(const signs of [[1,1],[-1,-1],[1,-1],[-1,1]])rows.push([`S4-${unit}-${state}-${signs.join('_')}`,()=>runWX(unit,state,signs)]);
 for(const unit of ['WX-A','WX-B'])rows.push([`S4-${unit}-X-cars`,()=>runWX(unit,true,[-1,-1],true)]);
 rows.push(['S4-adjacent-F1',runMisaligned],['S5-UNKNOWN-core',runUnknownPair]);for(const d of [1,-1])rows.push([`S5-reserved-${d}`,()=>runReservations(d)]);
 for(const swapped of [false,true])for(const immediate of [false,true])rows.push([`S5-fresh-${swapped}-${immediate}`,()=>runLiveRecheck(swapped,immediate)]);return rows;}
export function runMatrix(out){mkdirSync(out,{recursive:true});const summary=[];for(const [id,run] of scenarioMatrix()){try{const result=run(),bytes=JSON.stringify(result,null,2)+'\n';writeFileSync(resolve(out,id+'.json'),bytes);const {samples,initial,final,finalAfterSTOP,events,crossings,firstStops,approaches,commandLocks,...metrics}=result;summary.push({id,...metrics,finalTravelMm:final.trains.map(t=>t.travel),sha256:createHash('sha256').update(bytes).digest('hex')});console.log(`${id}: PASS (${result.ticks} ticks)`);}catch(e){writeFileSync(resolve(out,'FAILURE.json'),JSON.stringify({id,message:e.message,stack:e.stack,repro:e.repro??null},null,2)+'\n');throw e;}}
 const result={status:'PASS_NUMERICAL_MATRIX',scenarios:summary.length,ticks:summary.reduce((n,s)=>n+s.ticks,0),matrix:summary,runtimeAdmission:false};writeFileSync(resolve(out,'summary.json'),JSON.stringify(result,null,2)+'\n');return result;}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))runMatrix(resolve(process.argv[2]??'../work/r2b1/run'));
