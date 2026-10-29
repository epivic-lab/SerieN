import {consistLayout} from './consist.js';
import {traceJourney,occupiedRanges,siteSafety} from './next-switch.js';

/** @param {import('./railway-types.js').Train} train
 * @param {import('./railway-types.js').Vehicle[]} extra
 * @returns {import('./railway-types.js').ConsistLayout} */
export function layoutFor(train, extra = []) {
  return consistLayout([train.group, ...train.carObjs, ...extra].map(o => o.userData));
}

/** Positions retain actual vehicle/train identity; no Journey state is changed.
 * @param {import('./railway-types.js').Train} train */
export function vehiclePositions(train) {
  const vehicles = [train.group, ...train.carObjs];
  return layoutFor(train).offsets.map((offset, i) => ({
    train, vehicle: vehicles[i], ...train.journey.locate(train.journey.position - offset)
  }));
}

/** Fresh read-only view, deliberately uncached (invalidations belong to 5D).
 * @param {import('./railway-types.js').AssistanceContext} context
 * @returns {import('./railway-types.js').RailwaySnapshot} */
export function collectRailwayState({network,switchTopology,trains,detached,route}) {
  const occupied = [], moving = [];
  for (const train of trains) {
    const vehicles = [train.group, ...train.carObjs], layout = layoutFor(train);
    const direction = Math.abs(train.velocity) > .1 ? Math.sign(train.velocity) : train.dir;
    const index = direction < 0 ? vehicles.length - 1 : 0;
    const leading = vehicles[index].userData.couplers;
    const preview = traceJourney(network,switchTopology,train.journey,direction,layout.offsets[index],route);
    moving.push({preview,velocity:train.velocity,leadingExtent:direction < 0 ? -(leading?.back?.x ?? -48) : leading?.front?.x ?? 48});
    vehicles.forEach((o,i)=>occupied.push(...occupiedRanges(network,train.journey,layout.offsets[i],o.userData.couplers)));
  }
  // Known defect R02: v0.12 clips detached occupation to the centre segment.
  // Kept visible and unchanged during extraction; correction is scoped to 5C.
  for (const detachedVehicle of detached) {
    const edge = network.edges[detachedVehicle.point.edge];
    if (!edge) continue;
    const c=detachedVehicle.group.userData.couplers,extent=Math.max(c?.front?.x ?? 48,-(c?.back?.x ?? -48));
    occupied.push({edge:edge.id,min:Math.max(0,detachedVehicle.point.s-extent),max:Math.min(edge.length,detachedVehicle.point.s+extent)});
  }
  return {occupied,moving};
}

/** No DOM, rendering or command callbacks. Shares control references, as before.
 * @param {import('./railway-types.js').AssistanceContext} context */
export function deriveSwitchAssistance(context) {
  const {network,switchTopology,trains,selected,switchSpecs}=context;
  const {occupied,moving}=collectRailwayState(context),safetyByControl=new Map();
  for (const site of switchTopology.sites) {
    const safety=siteSafety(site,occupied,moving);
    for (const id of site.controls)safetyByControl.set(id,safety);
  }
  const preview=moving[selected].preview,train=trains[selected];
  return {preview,safety:preview.next?safetyByControl.get(preview.next.site.controls[0]):null,
    safetyByControl,trainName:train.name,controls:switchSpecs,
    inverting:Math.abs(train.velocity)>.1&&Math.sign(train.velocity)!==train.dir};
}
