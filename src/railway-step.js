import {assessRailwayGuard, guardDecision, MOTION} from './railway-guard.js';
import {layoutFor, vehiclePositions} from './railway-state.js';
import {envelopeGap, prepareSweptEnvelope, preparedSweepsConflict, vehiclesConflict} from './railway-conflicts.js';

function copyJourney(journey) {
  return Object.assign(Object.create(Object.getPrototypeOf(journey)), journey, {
    segments: journey.segments.map(segment => ({...segment}))
  });
}

/** A synchronous fleet transaction, with no DOM, mission or rendering effects.
 * Candidates share immutable network/vehicle references, never mutable history.
 * @param {{trains:import('./railway-types.js').Train[],
 * detached:import('./railway-types.js').DetachedVehicle[],route:Function}} context
 * @param {number} dt Positive elapsed time, at most one 1/60 s railway step.
 * @returns {Array<{train:import('./railway-types.js').Train,moved:boolean,kind:string|null,notify:boolean}>}
 */
export function stepRailway({trains, detached, route, reservations=[]}, dt) {
  if (!Number.isFinite(dt) || dt <= 0 || dt > 1 / 60 + 1e-9) throw new RangeError('Invalid railway step');
  const parkedSweeps=new Map();
  const proposals = trains.map(train => {
    const desired = train.dir * train.speed * MOTION.speedScale;
    const acceleration = Math.abs(desired) < Math.abs(train.velocity) ? MOTION.braking : MOTION.acceleration;
    let velocity = train.velocity + Math.max(-acceleration * dt, Math.min(acceleration * dt, desired - train.velocity));
    const journey = copyJourney(train.journey);
    const guardVelocity=velocity*train.velocity<0?velocity:train.velocity;
    const observed={...train,velocity:guardVelocity};
    let assessment=assessRailwayGuard(observed,journey,route,dt,reservations);
    if(assessment.reason==='history-conflict'){
      journey.reconcile(layoutFor(train).tail,train.group.userData.couplers?.front?.x??48,route);
      assessment=assessRailwayGuard(observed,journey,route,dt,reservations);
    }
    const requestedDelta=Math.abs(velocity)<1e-3?0:velocity*dt;
    const decision=guardDecision(assessment,requestedDelta,guardVelocity,dt);
    // A clear path keeps the exact 5C integration; only a guarded proposal brakes.
    let delta=decision.intervened?decision.delta:Math.abs(velocity)<1e-3?0:velocity*dt;
    if(decision.intervened)velocity=decision.velocity;
    const before = vehiclePositions(train);
    const fits = !delta || journey.move(delta, layoutFor(train).tail, route, train.group.userData.couplers?.front?.x ?? 48);
    const proposal = {train, journey, velocity, delta: fits ? delta : 0, before, guard:decision, requestedDelta,
      kind: fits ? null : journey.lastBlock?.reason === 'terminal' ? 'terminal' : 'route'};
    proposal.after = fits ? vehiclePositions({...train, journey}) : before;
    proposal.middle = fits && delta ? layoutFor(train).offsets.map((offset, i) => ({
      ...before[i], ...journey.locate(journey.position - delta / 2 - offset)
    })) : before;
    return proposal;
  });
  const stop = (proposal, kind) => {
    if (proposal.kind) return false;
    proposal.collisionProbeDelta=proposal.delta;
    proposal.kind = kind;
    proposal.after = proposal.middle = proposal.before;
    proposal.delta = 0;
    proposal.swept = null;
    return true;
  };
  const sweep = (proposal, i) => {
    proposal.swept??=[];
    return proposal.swept[i]??=prepareSweptEnvelope([proposal.before[i],proposal.middle[i],proposal.after[i]]);
  };
  const conflicts=(p,q)=>p.before.some((u,i)=>q.before.some((v,k)=>
    vehiclesConflict(p.after[i],q.after[k])||preparedSweepsConflict(sweep(p,i),sweep(q,k))));
  const parkedConflict=(p,d)=>p.before.some((before,i)=>{
    const parked={...d.point,vehicle:d.group},after=p.after[i];
    // Preserve 5C departure from touching couplers, never deeper entry.
    const receding=Math.hypot(after.x-parked.x,after.z-parked.z)>Math.hypot(before.x-parked.x,before.z-parked.z)+1e-8;
    if(vehiclesConflict(before,parked)&&receding&&envelopeGap(after,parked)>=envelopeGap(before,parked)-1e-8)return false;
    return vehiclesConflict(after,parked)||preparedSweepsConflict(sweep(p,i),parkedSweeps.get(d)??(parkedSweeps.set(d,prepareSweptEnvelope([parked])),parkedSweeps.get(d)));
  });
  // Recheck after rejecting a candidate: a following train must also see the
  // stopped position, not the rejected future position of the train ahead.
  let changed;
  do {
    changed = false;
    const rejected = new Map();
    for (let a = 0; a < proposals.length; a++) for (let b = a + 1; b < proposals.length; b++) {
      const p = proposals[a], q = proposals[b];
      if (!p.delta && !q.delta && !p.train.speed && !q.train.speed) continue;
      if (conflicts(p,q)) {
        rejected.set(p, 'train');
        rejected.set(q, 'train');
      }
    }
    for (const p of proposals) {
      if (p.kind || !p.delta) continue;
      if (detached.some(d=>parkedConflict(p,d))) rejected.set(p, 'wagon');
    }
    for (const [proposal, kind] of rejected) changed = stop(proposal, kind) || changed;
  } while (changed);

  let retainedProbes;
  const retainedProbe=q=>{
    const delta=q.collisionProbeDelta||q.train.guard?.probeDelta;
    if(q.delta||q.velocity&&!q.kind||q.guard.state!=='SAFE'||!q.train.requestedSpeed||!delta||Math.sign(delta)!==q.train.dir)return q;
    retainedProbes??=new Map();if(retainedProbes.has(q))return retainedProbes.get(q);
    const journey=copyJourney(q.journey);
    const result=journey.move(delta,layoutFor(q.train).tail,route,q.train.group.userData.couplers?.front?.x??48)?{
      before:q.before,after:vehiclePositions({...q.train,journey}),middle:layoutFor(q.train).offsets.map((offset,i)=>({...q.before[i],...journey.locate(journey.position-delta/2-offset)}))}:q;
    retainedProbes.set(q,result);return result;
  };
  // Keep a known occupation hazard while stopped. Recheck the last rejected
  // displacement against current bodies with the EXACT same 5C predicates.
  // This probe is read-only and never enters the fleet proposals: it cannot
  // reserve space, move a train or stop a compatible departing train.
  for(const p of proposals){
    const previous=p.train.guard;
    if(!p.collisionProbeDelta&&!previous?.probeDelta)continue;
    p.probeDelta=p.collisionProbeDelta||previous?.probeDelta;
    p.probeKind=['train','wagon'].includes(p.kind)?p.kind:previous?.probeKind;
    if(p.delta||Math.sign(p.probeDelta)!==p.train.dir){p.probeDelta=p.probeKind=undefined;continue;}
    if(p.kind||p.velocity||p.guard.state!=='SAFE'||!p.probeDelta)continue;
    const journey=copyJourney(p.journey);
    if(!journey.move(p.probeDelta,layoutFor(p.train).tail,route,p.train.group.userData.couplers?.front?.x??48)){
      p.guard={...p.guard,risk:'UNKNOWN',state:'GUARDED_STOP',reason:journey.lastBlock?.reason??'undetermined',distance:0,intervened:true};continue;
    }
    const probe={before:p.before,after:vehiclePositions({...p.train,journey}),
      middle:layoutFor(p.train).offsets.map((offset,i)=>({...p.before[i],...journey.locate(journey.position-p.probeDelta/2-offset)}))};
    if(proposals.some(q=>q!==p&&conflicts(probe,retainedProbe(q))))p.kind='train';
    else if(detached.some(d=>parkedConflict(probe,d)))p.kind='wagon';
    else p.probeDelta=p.probeKind=undefined;
  }

  return proposals.map(p => {
    const train = p.train, wasMoving = Boolean(train.speed || train.velocity);
    train.requestedSpeed ??= train.speed;
    if(train.speed)train.requestedSpeed=train.speed;
    const refusal=p.kind==='route'?p.journey.lastBlock?.reason:p.kind;
    const observation={...p.guard,requestedSpeed:train.requestedSpeed,requestedDelta:p.requestedDelta,
      delta:p.kind?0:p.delta,velocity:p.kind?0:p.velocity,probeDelta:p.probeDelta,probeKind:p.probeKind};
    train.guard=Object.freeze(p.kind?{...observation,state:'GUARDED_STOP',risk:['terminal','misaligned','no-route','train','wagon'].includes(refusal)?'UNSAFE':'UNKNOWN',reason:refusal??'undetermined',distance:0,intervened:true}:observation);
    if (p.kind) {
      train.speed = train.velocity = 0;
      // Route refusal keeps its diagnostic reason, without extending history.
      if (p.kind === 'terminal' || p.kind === 'route') train.journey.lastBlock = p.journey.lastBlock;
    } else {
      train.velocity = p.velocity;
      if(p.guard.intervened){if(!p.velocity)train.speed=0;train.journey.lastBlock={reason:p.guard.reason,boundary:p.guard.boundary};}
      if (p.delta) {
        train.journey.position = p.journey.position;
        train.journey.travel = p.journey.travel;
        train.journey.segments.splice(0, train.journey.segments.length, ...p.journey.segments);
        train.odometer += p.delta;
      }
    }
    return {train, moved: Boolean(p.delta), kind: p.kind??(p.guard.intervened?(p.guard.reason==='terminal'?'terminal':'route'):null), guard:train.guard, notify: Boolean(wasMoving&&(p.kind||p.guard.intervened&&!p.velocity))};
  });
}
