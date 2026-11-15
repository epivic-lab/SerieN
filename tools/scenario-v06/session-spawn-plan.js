// Static Node laboratory planning only. These windows are NOT stopping anchors,
// useful siding capacities, or certified physical fouling limits.
import {consistLayout} from '../../src/consist.js';

export function labVehicles(dimensions) {
  if (!Array.isArray(dimensions) || !dimensions.length) throw new TypeError('Unknown consist dimensions');
  return dimensions.map(d => {
    if (!d || !['length','width','front','rear'].every(k => Number.isFinite(d[k]) && d[k] > 0) ||
        d.front + d.rear < d.length) throw new TypeError('Unknown or inconsistent vehicle envelope');
    return {userData:{stock:{length:d.length,width:d.width},
      couplers:{front:{x:d.front},back:{x:-d.rear}}}};
  });
}

export function createLabSpawnPlan(network, topology, identity) {
  const protectedRanges = topology.sites.flatMap(s => s.protectedRanges);
  const loops = network.mainLoops.map(loop => {
    const candidates = loop.segments.flatMap(part => {
      const e = network.edges[part.id];
      if (e.switchId || e.hiddenIntervalsMm?.length) return [];
      let windows = [{min:0,max:e.length}];
      for (const r of protectedRanges.filter(r => r.edge === e.id)) windows = windows.flatMap(w =>
        r.max < w.min || r.min > w.max ? [w] :
          [{min:w.min,max:Math.min(w.max,r.min)}, {min:Math.max(w.min,r.max),max:w.max}].filter(w => w.max > w.min));
      return windows.filter(w => w.max > w.min).map(w => ({edge:e.id,sign:part.sign,window:w}));
    }).sort((a,b) => (b.window.max-b.window.min)-(a.window.max-a.window.min) || a.edge.localeCompare(b.edge));
    const candidate = candidates[0];
    return {id:['C','B','A'][loop.lane],lane:loop.lane,length:loop.length,
      candidate:candidate ? {...candidate,s:(candidate.window.min+candidate.window.max)/2} : null,
      stopAnchor:null,usefulCapacityMm:null,foulingCertified:false,runtimeAdmission:false};
  });
  return {sessionId:identity.sessionId,networkVersion:identity.networkVersion,scope:'NODE_STATIC_LAB_ONLY',loops,
    unavailable:['N07','N16','scalo','fourth-train','triangle'],runtimeAdmission:false};
}

export function checkLabSpawn(plan, {target,vehicles,scope} = {}) {
  const refuse = reason => ({ok:false,reason,runtimeAdmission:false});
  if (scope !== 'laboratory') return refuse('operational-spawn-not-authorized');
  const loop = plan.loops.find(l => l.id === target);
  if (!loop?.candidate) return refuse('missing-approved-anchor-capacity-fouling');
  let groups;
  try { groups = labVehicles(vehicles); } catch { return refuse('unknown-consist-envelope'); }
  const {tail} = consistLayout(groups.map(g => g.userData)),front=groups[0].userData.couplers.front.x;
  const {s,sign,window} = loop.candidate;
  const min=s-(sign>0?tail:front),max=s+(sign>0?front:tail);
  // Strict separation from the existing engine protection envelope. Do not
  // extrapolate/wrap a long composition over a joint to manufacture capacity.
  if (!(min > window.min && max < window.max)) return refuse('consist-outside-lab-window');
  return {ok:true,reason:'static-lab-fit-only',runtimeAdmission:false,sessionId:plan.sessionId,
    networkVersion:plan.networkVersion,target,...loop.candidate,extent:{min,max,front,tail}};
}
