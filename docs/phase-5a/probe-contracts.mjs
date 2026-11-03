// Audit only: execute from repository root; deliberately reproduce invalid-input
// and cross-segment geometry cases without changing any application module.
import {createNetwork,sample} from '../../src/network.js';
import {Journey,routing,FixedClock} from '../../src/simulation.js';
import {buildStock} from '../../src/rolling-stock.js';
import {occupiedRanges} from '../../src/next-switch.js';
import {writeFileSync} from 'node:fs';
const network=createNetwork(),route=routing(network,id=>id==='Y-4');
const j=new Journey(network,'T47',100);const accepted=j.move(NaN,10,route,10);
const clock=new FixedClock();clock.update(NaN,()=>{});let calls=0;clock.update(1/60,()=>calls++);
const coach=buildStock('coach'),ribbon=new Journey(network,'T47',5);ribbon.ensure(ribbon.position-84.1,route);
const expected=occupiedRanges(network,ribbon,0,coach.userData.couplers);
const clipped=[{edge:'T47',min:0,max:89.1}];
const a=sample(network.edges.T47,238),b=sample(network.edges.T46,10),distance=Math.hypot(a.x-b.x,a.z-b.z);
const report={invalidJourney:{moveNaNAccepted:accepted,positionFinite:Number.isFinite(j.position)},invalidClock:{accumulatorFinite:Number.isFinite(clock.accumulator),callbacksAfterValidElapsed:calls},detachedOccupation:{scope:'Comparison with app.js getSwitchAssistance single-edge formula; not an end-to-end switch exploit',expectedRanges:expected,currentFormula:clipped,missingAdjacentEdge:expected.some(r=>r.edge!=='T47')},crossEdgeCollision:{scope:'Current app.js different-edge centre threshold; confirmed with browser separately',edges:['T47','T46'],centreDistanceMm:distance,currentThresholdMm:17,currentPredicate:distance<17,closedWagonCombinedHalfBodyLengthMm:62.5,straightBodyOverlapMm:62.5-distance}};
writeFileSync(new URL('./contract-probes.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
