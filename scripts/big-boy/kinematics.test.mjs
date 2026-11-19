import assert from 'node:assert/strict';
import { test } from 'node:test';
import { axlePlay, drawbarPose, guideTruck, shift } from './kinematics.mjs';

const straight = {offset: point => point.z};
const heading = {cos: 1, sin: 0};
const approx = (actual, expected, tolerance = 1e-5) => assert.ok(
  Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`,
);

test('the leading truck independently fits its two axles around a translating pin', () => {
  for (const sign of [1, -1]) {
    const initial = {x: 10, z: sign * 3, cos: Math.cos(.1), sin: sign * Math.sin(.1)};
    const fit = guideTruck(straight, 0, heading, 10, [4, 16], {travelMm: 4.5, swingRad: .35}, initial);
    approx(fit.guideTravelMm, -sign * 3);
    approx(fit.x, initial.x);
    for (const offset of [-6, 6]) approx(straight.offset(shift(fit, offset)), 0);
  }
});

test('guide and axle reach remain bounded when track demands more travel', () => {
  const initial = {x: 10, z: 6, ...heading};
  const fit = guideTruck(straight, 0, heading, 10, [4, 16], {travelMm: 4.5, swingRad: .35}, initial);
  approx(fit.guideTravelMm, -4.5);
  approx(fit.z, 1.5);
  const axle = axlePlay(straight, 0, fit, 0, .45);
  approx(axle.slide, -.45);
  approx(axle.error, 1.05);
});

test('telescoping members retain length and distinguish compression and extension stops', () => {
  const dimensions = {sleeveMm: 7.75, tongueMm: 7.75, minEngagementMm: .95,
    maxEngagementMm: 6, pinClearanceMm: .65};
  const pin = {x: 0, z: 0};
  for (const [span, margin] of [[8.5, -1], [10.2, .7], [13.5, 1.05], [14.7, -.15]]) {
    const pose = drawbarPose(pin, {x: .6 * span, z: .8 * span}, dimensions);
    approx(pose.span, span);
    approx(pose.margin, margin);
    approx(pose.overlap + pose.span, dimensions.sleeveMm + dimensions.tongueMm);
  }
});
