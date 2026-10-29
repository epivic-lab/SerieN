import {layoutFor, vehiclePositions} from './railway-state.js';
import {envelopeGap, sweptVehiclesConflict, vehiclesConflict} from './railway-conflicts.js';

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
export function stepRailway({trains, detached, route}, dt) {
  if (!Number.isFinite(dt) || dt <= 0 || dt > 1 / 60 + 1e-9) throw new RangeError('Invalid railway step');
  const proposals = trains.map(train => {
    const desired = train.dir * train.speed * 1.5;
    const acceleration = Math.abs(desired) < Math.abs(train.velocity) ? 100 : 45;
    const velocity = train.velocity + Math.max(-acceleration * dt, Math.min(acceleration * dt, desired - train.velocity));
    const journey = copyJourney(train.journey), delta = Math.abs(velocity) < 1e-3 ? 0 : velocity * dt;
    const before = vehiclePositions(train);
    const fits = !delta || journey.move(delta, layoutFor(train).tail, route, train.group.userData.couplers?.front?.x ?? 48);
    const proposal = {train, journey, velocity, delta: fits ? delta : 0, before, kind: fits ? null : journey.lastBlock?.reason === 'terminal' ? 'terminal' : 'route'};
    proposal.after = fits ? vehiclePositions({...train, journey}) : before;
    proposal.middle = fits && delta ? layoutFor(train).offsets.map((offset, i) => ({
      ...before[i], ...journey.locate(journey.position - delta / 2 - offset)
    })) : before;
    return proposal;
  });
  const stop = (proposal, kind) => {
    if (proposal.kind) return false;
    proposal.kind = kind;
    proposal.after = proposal.middle = proposal.before;
    proposal.delta = 0;
    return true;
  };
  const sweeps = (proposal, i) => [proposal.before[i], proposal.middle[i], proposal.after[i]];
  // Recheck after rejecting a candidate: a following train must also see the
  // stopped position, not the rejected future position of the train ahead.
  let changed;
  do {
    changed = false;
    const rejected = new Map();
    for (let a = 0; a < proposals.length; a++) for (let b = a + 1; b < proposals.length; b++) {
      const p = proposals[a], q = proposals[b];
      if (!p.delta && !q.delta && !p.train.speed && !q.train.speed) continue;
      if (p.before.some((u, i) => q.before.some((v, k) =>
        vehiclesConflict(p.after[i], q.after[k]) || sweptVehiclesConflict(sweeps(p, i), sweeps(q, k))))) {
        rejected.set(p, 'train');
        rejected.set(q, 'train');
      }
    }
    for (const p of proposals) {
      if (p.kind || !p.delta) continue;
      if (detached.some(d => p.before.some((before, i) => {
        const parked = {...d.point, vehicle: d.group}, after = p.after[i];
        // Uncoupling leaves touching couplers (and tangent envelopes may
        // overlap slightly in a curve). Permit departure, never deeper entry.
        const receding = Math.hypot(after.x - parked.x, after.z - parked.z) > Math.hypot(before.x - parked.x, before.z - parked.z) + 1e-8;
        if (vehiclesConflict(before, parked) && receding && envelopeGap(after, parked) >= envelopeGap(before, parked) - 1e-8) return false;
        return vehiclesConflict(after, parked) || sweptVehiclesConflict(sweeps(p, i), [parked]);
      }))) rejected.set(p, 'wagon');
    }
    for (const [proposal, kind] of rejected) changed = stop(proposal, kind) || changed;
  } while (changed);

  return proposals.map(p => {
    const train = p.train, wasMoving = Boolean(train.speed || train.velocity);
    if (p.kind) {
      train.speed = train.velocity = 0;
      // Route refusal keeps its diagnostic reason, without extending history.
      if (p.kind === 'terminal' || p.kind === 'route') train.journey.lastBlock = p.journey.lastBlock;
    } else {
      train.velocity = p.velocity;
      if (p.delta) {
        train.journey.position = p.journey.position;
        train.journey.travel = p.journey.travel;
        train.journey.segments.splice(0, train.journey.segments.length, ...p.journey.segments);
        train.odometer += p.delta;
      }
    }
    return {train, moved: Boolean(p.delta), kind: p.kind, notify: Boolean(p.kind && wasMoving)};
  });
}
