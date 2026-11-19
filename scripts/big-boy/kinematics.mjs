// Layout millimetres. All measurements are pose-local and odometer-independent.
export function shift(pose, along, lateral = 0) {
  return {
    x: pose.x + pose.cos * along - pose.sin * lateral,
    z: pose.z + pose.sin * along + pose.cos * lateral,
  };
}

export const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

// The guide translates across its parent. The truck rotates about the moving
// guide pin. Track projection at both wheelsets supplies the two residuals.
export function guideTruck(track, station, parent, pivot, axleStations, limits, basePose) {
  const guideX = -parent.sin;
  const guideZ = parent.cos;
  let travel = 0;
  const parentYaw = Math.atan2(parent.sin, parent.cos);
  const angle = Math.atan2(basePose.sin, basePose.cos);
  let swing = Math.atan2(Math.sin(angle - parentYaw), Math.cos(angle - parentYaw));
  const evaluate = (slide, yaw) => {
    const pose = {
      x: basePose.x + slide * guideX,
      z: basePose.z + slide * guideZ,
      cos: Math.cos(parentYaw + yaw), sin: Math.sin(parentYaw + yaw),
    };
    const offsets = axleStations.map(s => track.offset(shift(pose, s - pivot), station + s));
    return {pose, offsets, error: offsets[0] ** 2 + offsets[1] ** 2};
  };
  swing = clamp(swing, -limits.swingRad, limits.swingRad);
  let fit = evaluate(travel, swing);
  const step = .0001;
  for (let attempt = 0; attempt < 12 && fit.error > 1e-10; attempt++) {
    const lateral = evaluate(travel + step, swing).offsets;
    const rotated = evaluate(travel, swing + step).offsets;
    const [r, t] = fit.offsets;
    const a = (lateral[0] - r) / step, b = (rotated[0] - r) / step;
    const c = (lateral[1] - t) / step, d = (rotated[1] - t) / step;
    const det = a * d - b * c;
    if (Math.abs(det) < 1e-7) break;
    const moves = [
      [(b * t - d * r) / det, (c * r - a * t) / det],
      [-(a * r + c * t) / (a * a + c * c || 1), 0],
      [0, -(b * r + d * t) / (b * b + d * d || 1)],
    ];
    let best = fit;
    let nextTravel = travel, nextSwing = swing;
    for (const [slide, yaw] of moves) for (const fraction of [1, .5, .25]) {
      const x = clamp(travel + fraction * slide, -limits.travelMm, limits.travelMm);
      const angle = clamp(swing + fraction * yaw, -limits.swingRad, limits.swingRad);
      const result = evaluate(x, angle);
      if (result.error < best.error) {
        best = result;
        nextTravel = x;
        nextSwing = angle;
      }
    }
    if (best === fit) break;
    fit = best;
    travel = nextTravel;
    swing = nextSwing;
  }
  return {...fit.pose, guideTravelMm: travel, guideSwingRad: swing};
}

// Test the wheelsets with the stated lateral play. Each displacement occurs
// along its actual axle, and mesh projection uses the same displacement.
export function axlePlay(track, station, pose, along, limit) {
  const offset = lateral => track.offset(shift(pose, along, lateral), station);
  let slide = 0;
  let error = offset(0);
  for (let attempt = 0; limit > 0 && attempt < 4 && Math.abs(error) > 1e-5; attempt++) {
    const derivative = (offset(slide + .001) - error) / .001;
    if (Math.abs(derivative) < .1) break;
    const next = clamp(slide - error / derivative, -limit, limit);
    const residual = offset(next);
    if (Math.abs(residual) >= Math.abs(error)) break;
    [slide, error] = [next, residual];
  }
  return {slide, error};
}

export function drawbarPose(enginePin, tenderPin, dimensions) {
  const dx = tenderPin.x - enginePin.x, dz = tenderPin.z - enginePin.z;
  const span = Math.hypot(dx, dz);
  const {sleeveMm, tongueMm, minEngagementMm, maxEngagementMm, pinClearanceMm} = dimensions;
  const overlap = sleeveMm + tongueMm - span;
  return {
    enginePin, tenderPin, span, overlap,
    yaw: Math.atan2(dz, dx),
    margin: Math.min(overlap - minEngagementMm, maxEngagementMm - overlap,
      span - sleeveMm - pinClearanceMm, span - tongueMm - pinClearanceMm),
  };
}
