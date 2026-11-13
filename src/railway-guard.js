import {createSwitchTopology, traceJourney} from './next-switch.js';
import {layoutFor} from './railway-state.js';

// Existing engine units: layout mm, seconds. This is a numerical guard, not
// scale-model braking physics. Never change these independently of integration.
export const MOTION = Object.freeze({speedScale:1.5, acceleration:45, braking:100, maxSpeed:100, epsilon:1e-6});
const topologies = new WeakMap();
function topology(network) {
  if (!topologies.has(network)) {
    const data=createSwitchTopology(network,network.controllers);
    // Reuse the existing approach operation envelope, so a normal guarded stop
    // leaves the points clear for correction without weakening occupancy locks.
    data.approachMargin=Math.max(0,...data.sites.flatMap(s=>s.protectedRanges.filter(r=>!s.internal.includes(r.edge)).map(r=>r.max-r.min)));
    topologies.set(network,data);
  }
  return topologies.get(network);
}

/** Read-only route admission, measured from the leading COUPLER along Journey.
 * The actual router revalidates every joint, including cached history. Existing
 * operation locks prevent throwing points; they are NOT transit prohibitions.
 * Reservations, if supplied, are canonical edge intervals with an owner trainId;
 * no reservation registry or second router is created here.
 */
export function assessRailwayGuard(train, journey, route, dt, reservations=[]) {
  if(!Number.isFinite(dt)||dt<=0||dt>1/60+1e-9)throw new RangeError("Invalid guard step");
  const {epsilon,braking,speedScale,maxSpeed}=MOTION;
  const request=train.speed,velocity=train.velocity;
  const unknown=reason=>({risk:'UNKNOWN',reason,distance:0,boundary:null,direction:train.dir,lookahead:0,stoppingDistance:0});
  if (![request,velocity,train.dir].every(Number.isFinite) || request<0 || request>maxSpeed || Math.abs(velocity)>maxSpeed*speedScale+epsilon || ![-1,1].includes(train.dir)) return unknown('invalid-motion');
  const direction=velocity===0?train.dir:Math.sign(velocity),layout=layoutFor(train);
  const offset=direction>0?0:layout.offsets.at(-1);
  const last=[train.group,...train.carObjs].at(-1);
  const extent=direction>0?(train.group.userData.couplers?.front?.x??48):Math.max(layout.tail-offset,-(last.userData.couplers?.back?.x??-38));
  if (![extent,layout.tail].every(v=>Number.isFinite(v)&&v>=0))return unknown('invalid-extent');
  const stoppingDistance=velocity*velocity/(2*braking);
  // One full current tick, including semi-implicit acceleration, covers the
  // reaction/integration interval; retain the
  // observed horizon while guarded at rest, until route clears or direction flips.
  const lookahead=Math.max(stoppingDistance+Math.abs(velocity)*dt+MOTION.acceleration*dt*dt+epsilon,
    train.guard?.state==='GUARDED_STOP'&&train.guard.direction===direction?train.guard.lookahead:0);
  const sites=topology(journey.network);
  const preview=traceJourney(journey.network,sites,journey,direction,offset,route,extent+lookahead+sites.approachMargin,false);
  let result={leadingExtent:extent,risk:'SAFE',reason:'available',distance:Infinity,boundary:null,direction,lookahead,stoppingDistance};
  const inset=(site,range)=>{
    if(!site||!range||site.internal.includes(range.edge))return 0;
    const protectedRange=site.protectedRanges.find(r=>r.edge===range.edge);
    return protectedRange?Math.abs(range.to-(range.to>=range.from?protectedRange.min:protectedRange.max)):0;
  };
  const prohibit=(distance,risk,reason,boundary,protectionInset=0)=>{
    distance=Math.max(0,distance-extent-protectionInset-2*epsilon);
    if(distance<=lookahead&&(distance<result.distance||distance===result.distance&&risk==='UNKNOWN'))result={...result,risk,reason,distance,boundary,protectionInset};
  };
  if (!['limit','cycle'].includes(preview.stop)) prohibit(preview.distance,
    ['misaligned','no-route','terminal'].includes(preview.stop)?'UNSAFE':'UNKNOWN',preview.stop,preview.ranges.at(-1)??null,
    // A shared boundary can be internal to one unit and external to another.
    // Stop outside the largest existing operation envelope of all encounters.
    Math.max(0,...preview.encounters.filter(e=>Math.abs(e.distance-preview.distance)<epsilon)
      .map(e=>inset(e.site,preview.ranges.at(-1)))));
  // Router continues to own boolean route selection; a missing control state
  // must never be silently admitted as the router's legacy false fallback.
  if (route.controlState) {
    for(const encounter of preview.encounters){
      const members=sites.byNode.get(encounter.node)??[encounter.site];
      const incoming=preview.ranges.find(r=>r.edge===encounter.incoming&&Math.abs(r.distance+Math.abs(r.to-r.from)-encounter.distance)<epsilon);
      for(const site of members)if(site.controls.some(id=>typeof route.controlState(id)!=='boolean'))
        prohibit(encounter.distance,'UNKNOWN','unknown-control',encounter.node,inset(site,incoming));
    }
    for(const range of preview.ranges){const edge=journey.network.edges[range.edge];
      if(edge.switchId&&typeof route.controlState(edge.switchId)!=='boolean')prohibit(range.distance,'UNKNOWN','unknown-control',range.edge);
    }
  }
  if(!Array.isArray(reservations))return unknown('invalid-reservation');
  for(const reserved of reservations) {
    const edge=typeof reserved?.edge==='string'&&Object.hasOwn(journey.network.edges,reserved.edge)?journey.network.edges[reserved.edge]:null;
    if(!edge||!Number.isFinite(reserved.min)||!Number.isFinite(reserved.max)||reserved.min<0||reserved.max<reserved.min||reserved.max>edge.length||!Number.isInteger(reserved.trainId)||reserved.trainId<0)return unknown('invalid-reservation');
    if(reserved.trainId===train.id)continue;
    for(const range of preview.ranges) {
      if(range.edge!==reserved.edge)continue;
      const lo=Math.max(Math.min(range.from,range.to),reserved.min),hi=Math.min(Math.max(range.from,range.to),reserved.max);
      if(lo<=hi)prohibit(range.distance+Math.abs((range.to>=range.from?lo:hi)-range.from),'UNSAFE','reserved',reserved.edge);
    }
  }
  return result;
}

export function guardDecision(assessment, delta, velocity, dt) {
  if(assessment.risk==='SAFE')return {...assessment,state:'SAFE',delta,velocity,intervened:false};
  // Semi-implicit braking cannot travel farther than continuous v²/(2a).
  // Clamp remains authoritative even when braking distance is already exhausted.
  if(!assessment.distance)return {...assessment,state:'GUARDED_STOP',delta:0,velocity:0,intervened:true};
  const braking=Math.max(0,Math.abs(velocity)-MOTION.braking*dt)*Math.sign(velocity);
  const bounded=Math.min(Math.abs(braking*dt),assessment.distance);
  return {...assessment,state:'GUARDED_STOP',delta:Math.sign(delta)*bounded,
    velocity:bounded<Math.abs(braking*dt)||!bounded?0:braking,intervened:true};
}
