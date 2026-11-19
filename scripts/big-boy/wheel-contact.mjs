import { shift } from './kinematics.mjs';

// The two rendering profiles have the same nominal scale and different rail
// heads. Legacy rail-profile.js uses 4.5 ± .5; V06 uses 4.725 ± .225.
export const railHeads = Object.freeze({legacy: [4, 5], v06: [4.5, 4.95]});

export function wheelContact(track, station, axlePose, profile, head) {
  const extent = ([a, b]) => {
    const start = track.offset(shift(axlePose, 0, a), station);
    const end = track.offset(shift(axlePose, 0, b), station);
    return start < end ? [start, end] : [end, start];
  };
  let treadOverlap = Infinity;
  let flangeOverlap = 0;
  for (const sign of [-1, 1]) {
    const rail = sign > 0 ? head : [-head[1], -head[0]];
    const intersection = band => {
      const [start, end] = extent(band);
      return Math.min(rail[1], end) - Math.max(rail[0], start);
    };
    const wheel = profile[sign];
    const sideTread = Math.max(-Infinity, ...wheel.tread.map(intersection));
    if (!Number.isFinite(sideTread)) throw new Error('Missing common tread across sampled wheel phases');
    treadOverlap = Math.min(treadOverlap, sideTread);
    flangeOverlap = Math.max(flangeOverlap, ...wheel.belowHead.map(intersection));
  }
  return {treadOverlap, flangeOverlap};
}
