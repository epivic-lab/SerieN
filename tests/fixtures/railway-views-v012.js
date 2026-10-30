// Frozen characterization oracle from 618f538:app.js (Fase 5B).
// Historical behavior only; known R02 clipping remains a defect for 5C.
// Never import this fixture from production code.
import {consistLayout} from '../../src/consist.js';
import {traceJourney,occupiedRanges,siteSafety} from '../../src/next-switch.js';
export function baselineViews({network,switchTopology,trains,detached,selected,switchSpecs,route}) {
function layoutFor(t, extra = []) {
  return consistLayout([t.group, ...t.carObjs, ...extra].map((o) => o.userData));
}
function vehiclePositions(t) {
  return layoutFor(t).offsets.map((offset, i) => ({
    train: t, vehicle: [t.group, ...t.carObjs][i], ...t.journey.locate(t.journey.position - offset)
  }));
}
function getSwitchAssistance() {
  const occupied = [], moving = [];
  for (const t of trains) {
    const vehicles = [t.group, ...t.carObjs], layout = layoutFor(t);
    const direction = Math.abs(t.velocity) > .1 ? Math.sign(t.velocity) : t.dir;
    const index = direction < 0 ? vehicles.length - 1 : 0;
    const leading = vehicles[index].userData.couplers;
    const preview = traceJourney(network, switchTopology, t.journey, direction, layout.offsets[index], route);
    moving.push({ preview, velocity:t.velocity, leadingExtent: direction < 0 ? -(leading?.back?.x ?? -48) : leading?.front?.x ?? 48 });
    vehicles.forEach((o,i)=>occupied.push(...occupiedRanges(network,t.journey,layout.offsets[i],o.userData.couplers)));
  }
  for (const d of detached) {
    const edge = network.edges[d.point.edge];
    if (!edge) continue;
    const c = d.group.userData.couplers, extent = Math.max(c?.front?.x ?? 48,-(c?.back?.x ?? -48));
    occupied.push({edge:edge.id,min:Math.max(0,d.point.s-extent),max:Math.min(edge.length,d.point.s+extent)});
  }
  const safetyByControl = new Map();
  for (const site of switchTopology.sites) {
    const safety = siteSafety(site, occupied, moving);
    for (const id of site.controls) safetyByControl.set(id,safety);
  }
  const preview = moving[selected].preview;
  return { preview, safety:preview.next?safetyByControl.get(preview.next.site.controls[0]):null,
    safetyByControl, trainName:trains[selected].name, controls:switchSpecs,
    inverting:Math.abs(trains[selected].velocity)>.1 && Math.sign(trains[selected].velocity)!==trains[selected].dir };
}
return {layoutFor,vehiclePositions,getSwitchAssistance};
}
