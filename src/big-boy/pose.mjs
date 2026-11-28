import {guideTruck,shift} from './kinematics.mjs';
export function createPoseSolver({frames,axles,kinematics}) {
const pivot=name=>frames[name].pivotMm[0];
function heading(x, z, origin) {
  const length = Math.hypot(x, z);
  if (length < 1e-9) throw new Error('Degenerate articulated pose');
  return {...origin, cos: x / length, sin: z / length};
}

function chord(track, s, rear, front, originStation) {
  const a = track.locate(s + rear);
  const b = track.locate(s + front);
  const chordPose = heading(b.x - a.x, b.z - a.z, {x: (a.x + b.x) / 2, z: (a.z + b.z) / 2});
  return {...chordPose, ...shift(chordPose, originStation - (rear + front) / 2)};
}

const frameAxles = name => frames[name].axleNodes.map(axle => axles[axle].sMm);
const rearAxles = frameAxles('engine_rear');
const tenderRear = pivot('tender_rear_bogie');
const tenderFront = pivot('tender_front_bogie');
const setback = kinematics?.tenderSetbackMm ?? 0;
const frameSetback = name => name.startsWith('tender_') ? setback : 0;

function poses(track, s) {
  const posesByName = {
    engine_rear: chord(track, s, rearAxles[0], rearAxles.at(-1), pivot('engine_rear')),
    tender_body: chord(track, s - setback, tenderRear, tenderFront, pivot('tender_body')),
  };
  for (const name of ['engine_front', 'trailing_truck', 'leading_truck', 'tender_rear_bogie', 'tender_front_bogie']) {
    const parent = frames[name].parent;
    const origin = shift(posesByName[parent], pivot(name) - pivot(parent));
    let x = 0;
    let z = 0;
    // Constrained least squares: rotate around the physical hinge and fit the
    // fixed axle stations to the route. No translation is allowed at the hinge.
    for (const axleStation of frameAxles(name)) {
      const target = track.locate(s + axleStation - frameSetback(name));
      const weight = axleStation - pivot(name);
      x += weight * (target.x - origin.x);
      z += weight * (target.z - origin.z);
    }
    const pose = heading(x, z, origin);
    const guide = name === 'leading_truck' ? kinematics?.leadingGuide :
      name === 'trailing_truck' ? kinematics?.trailingGuide : null;
    posesByName[name] = guide ? guideTruck(
      track, s, posesByName[parent], pivot(name), frameAxles(name), guide, pose,
    ) : pose;
  }
  return posesByName;
}

return poses;
}
const projectionWindowMm = 24;

export function routePolyline(journey) {
  const segments = journey.segments.flatMap(({id, sign, start}) => {
    const edge = journey.network.edges[id];
    return edge.points.slice(1).map((end, i) => {
      const startPoint = edge.points[i];
      const dx = end.x - startPoint.x;
      const dz = end.z - startPoint.z;
      return {
        minS: start + (sign > 0 ? edge.distance[i] : edge.length - edge.distance[i + 1]),
        maxS: start + (sign > 0 ? edge.distance[i + 1] : edge.length - edge.distance[i]),
        sign, x: startPoint.x, z: startPoint.z, dx, dz, length2: dx * dx + dz * dz,
      };
    });
  });
  return {
    locate: s => journey.locate(s),
    offset(p, s) {
      let minDistance2 = Infinity;
      let side = 1;
      for (const {minS, maxS, x, z, dx, dz, length2, sign} of segments) {
        if (!length2 || minS > s + projectionWindowMm || maxS < s - projectionWindowMm) continue;
        const px = p.x - x;
        const pz = p.z - z;
        const t = Math.max(0, Math.min(1, (px * dx + pz * dz) / length2));
        const distance2 = (px - dx * t) ** 2 + (pz - dz * t) ** 2;
        if (distance2 < minDistance2) {
          minDistance2 = distance2;
          side = (dx * pz - dz * px) * sign < 0 ? -1 : 1;
        }
      }
      if (!Number.isFinite(minDistance2)) throw new Error('No local route projection');
      return side * Math.sqrt(minDistance2);
    },
  };
}
