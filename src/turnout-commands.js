import {isTurnoutId} from './turnout-routes.js';
import {layoutFor} from './railway-state.js';

/** One synchronous command boundary for panel and device. Rendering is owned
 * by the caller; occupancy/approach decisions still belong to the engine.
 * Reconciliation order and semantics are those of the pre-S1 toggle command. */
export function createTurnoutCommands({switchSpecs,trains,route,getSafety}) {
  return Object.freeze({requestToggle(controlId,origin) {
    const reject = (reason,message) => ({changed:false,controlId,origin,reason,message});
    if (!isTurnoutId(controlId)) return reject('invalid-control','Unknown switch control.');
    if (origin !== 'panel' && origin !== 'device') return reject('invalid-origin','Unknown switch request origin.');
    const control = switchSpecs.find(s => s.id === controlId);
    if (!control || typeof control.on !== 'boolean') return reject('unknown-state','Insufficient switch state: operation blocked.');
    // Read on every request, including consecutive requests from different
    // surfaces. Never accept a caller-provided or previously cached lock.
    const safety = getSafety(controlId);
    if (!safety || safety.blocked !== false || safety.kind !== 'unlocked') {
      return reject(safety?.blocked === true ? safety.kind ?? 'unknown' : 'unknown',
        safety?.message ?? 'Insufficient safety data: switch operation blocked.');
    }
    control.on = !control.on;
    for (const train of trains) train.journey.reconcile(layoutFor(train).tail,train.group.userData.couplers?.front?.x ?? 48,route);
    return {changed:true,controlId,origin,on:control.on};
  }});
}
