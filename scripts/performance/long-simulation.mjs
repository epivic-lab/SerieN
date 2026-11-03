// Logical endurance complements real-time browser F. No rendering/DOM/clock override.
// One process per revision; generic 65 mm stock, 3 separate canonical loops.
import {createNetwork,loopPosition} from '../../src/network.js';
import {Journey,routing} from '../../src/simulation.js';
import {layoutFor} from '../../src/railway-state.js';
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const reference=process.argv.includes('--reference');
const output=process.argv[process.argv.indexOf('--output')+1];
if(!process.argv.includes('--output')||!global.gc)throw Error('Usage: node --expose-gc long-simulation.mjs [--reference] --output file.json');
const {stepRailway}=await import(reference?'../../tests/fixtures/railway-step-5c.js':'../../src/railway-step.js');
const network=createNetwork(),route=routing(network,()=>false);
const vehicle=()=>({userData:{stock:{length:65,width:20},couplers:{front:{x:34.1},back:{x:-34.1}}}});
const trains=Array.from({length:3},(_,id)=>{
 const p=loopPosition(network,[2,1,0][id],[.22,.65,.45][id]),journey=new Journey(network,p.edge,p.s);
 if(p.sign<0){journey.segments[0].sign=-1;journey.position=network.edges[p.edge].length-p.s;}
 const t={id,group:vehicle(),carObjs:[vehicle(),vehicle()],cars:2,journey,speed:35+id*10,velocity:0,dir:id===1?-1:1,odometer:0};
 if(!journey.ensure(journey.position-layoutFor(t).tail,route))throw Error('Fixture tail');return t;
});
const read=()=>trains.map(t=>({position:t.journey.position,travel:t.journey.travel,segments:t.journey.segments,velocity:t.velocity,speed:t.speed,odometer:t.odometer,dir:t.dir}));
const samples=[],steps=108000,windowSteps=10800;
for(let offset=0;offset<steps;offset+=windowSteps){
 const start=performance.now();
 for(let i=0;i<windowSteps;i++)stepRailway({trains,detached:[],route},1/60);
 const wallMs=performance.now()-start;global.gc();
 samples.push({logicalSeconds:(offset+windowSteps)/60,wallMs,msPerStep:wallMs/windowSteps,memory:process.memoryUsage(),segments:trains.map(t=>t.journey.segments.length),travelMm:trains.map(t=>t.journey.travel),stateSha256:createHash('sha256').update(JSON.stringify(read())).digest('hex')});
 if(trains.some(t=>!t.speed||!Number.isFinite(t.odometer)))throw Error('Unexpected stop or invalid state');
}
const state=read(),json=JSON.stringify(state);
writeFileSync(output,JSON.stringify({scope:'Node logical endurance, no renderer or UI; not a 30-minute wall-clock browser session',reference,node:process.version,steps,logicalSeconds:steps/60,samples,finalState:state,finalStateSha256:createHash('sha256').update(json).digest('hex')},null,2)+'\n');
console.log(reference?'5C':'5D',steps,'steps',samples.at(-1).segments,createHash('sha256').update(json).digest('hex'));
