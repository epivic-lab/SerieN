import assert from 'node:assert/strict';
import { test } from 'node:test';
import { axlePlay, drawbarPose, guideTruck, shift } from './kinematics.mjs';
import { railHeads, wheelContact } from './wheel-contact.mjs';

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

test('wheel profile distinguishes dual tread support from projection of a flange into a rail head', () => {
  const wheel = {
    '-1': {tread: [[-5.4, -3.65]], belowHead: [[-3.45, -3.32]]},
    '1': {tread: [[3.65, 5.4]], belowHead: [[3.32, 3.45]]},
  };
  const centered = {x: 0, z: 0, ...heading};
  assert.deepEqual(wheelContact(straight, 0, centered, wheel, railHeads.legacy),
    {treadOverlap: 1, flangeOverlap: 0});
  const smallShift = wheelContact(straight, 0, {...centered, z: .65}, wheel, railHeads.legacy);
  assert.ok(smallShift.treadOverlap > 0);
  approx(smallShift.flangeOverlap, .10);
  const largeShift = wheelContact(straight, 0, {...centered, z: 1.25}, wheel, railHeads.v06);
  assert.ok(largeShift.treadOverlap < 0);
});

test('the contact audit reads the same head intervals as both rendered sections', async () => {
  const { railGeometry } = await import('../../src/rail-profile.js');
  const { v06RailGeometry } = await import('../../src/scenario-v06-scene.js');
  const edge = {length: 20, distance: [0, 20], points: [{x: 0, z: 0}, {x: 20, z: 0}]};
  for (const [scenario, build] of [['legacy', railGeometry], ['v06', v06RailGeometry]]) {
    const g = build(edge, 1);
    const positions = g.getAttribute('position');
    let head = -Infinity;
    for (let i = 0; i < positions.count; i++) head = Math.max(head, positions.getY(i));
    const lateral = [];
    for (let i = 0; i < positions.count; i++) if (positions.getY(i) === head) lateral.push(positions.getZ(i));
    approx(Math.min(...lateral), railHeads[scenario][0]);
    approx(Math.max(...lateral), railHeads[scenario][1]);
    g.dispose();
  }
});
