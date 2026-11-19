// Offline articulation and swept-outline probe. Uses the live route graph,
// without adding a locomotive type or modifying any production railway state.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createScenarioProfile } from '../../src/scenario-profile.js';
import { Journey, routing } from '../../src/simulation.js';
import { axlePlay, drawbarPose, guideTruck, shift } from './kinematics.mjs';
import { railHeads, wheelContact } from './wheel-contact.mjs';

const [directory, reportPath] = process.argv.slice(2);
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const {frames, axles, drawbarPinsMm, trianglesByNode, kinematics} = read(resolve(directory, 'rig.json'));
const wheelPath = resolve(directory, 'wheel-profile.json');
const wheelProfiles = existsSync(wheelPath) ? read(wheelPath) : null;
const binary = readFileSync(resolve(directory, 'prototype.glb'));
const modelSha256 = createHash('sha256').update(binary).digest('hex');
if (wheelProfiles && wheelProfiles.modelSha256 !== modelSha256) {
  throw new Error('Wheel profiles were not measured from this GLB');
}
const jsonBytes = binary.readUInt32LE(12);
const gltf = JSON.parse(binary.subarray(20, 20 + jsonBytes));
const binOffset = 28 + jsonBytes;
const nodes = new Map(gltf.nodes.map((node, index) => [node.name, {...node, index}]));
const names = Object.keys(frames);
const pivot = name => frames[name].pivotMm[0];

function positions(accessorIndex) {
  const accessor = gltf.accessors[accessorIndex];
  const view = gltf.bufferViews[accessor.bufferView];
  if (accessor.type !== 'VEC3' || accessor.componentType !== 5126 || accessor.sparse) {
    throw new Error('Expected dense float positions');
  }
  const offset = binOffset + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const stride = view.byteStride ?? 12;
  return Array.from({length: accessor.count}, (_, index) => {
    const start = offset + index * stride;
    return [-binary.readFloatLE(start + 8), binary.readFloatLE(start), binary.readFloatLE(start + 4)];
  });
}

function hull(points) {
  const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const edge = ordered => {
    const result = [];
    for (const point of ordered) {
      while (result.length > 1 && cross(result.at(-2), result.at(-1), point) <= 0) result.pop();
      result.push(point);
    }
    return result.slice(0, -1);
  };
  points.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return edge(points).concat(edge(points.reverse()));
}

const outlines = {};
const axleOutlines = {};
const sizes = {minS: Infinity, maxS: -Infinity, minY: Infinity, maxY: -Infinity, halfWidth: 0};
let triangles = 0;
let primitives = 0;
for (const [name, frame] of Object.entries(frames)) {
  const footprint = [];
  for (const part of [name, ...frame.axleNodes]) {
    const node = nodes.get(part);
    const parent = axles[part]?.parent ?? frames[part]?.parent;
    const base = parent ? frames[parent].pivotMm : [0, 0];
    const absolute = axles[part] ? [axles[part].sMm, axles[part].heightMm] : frames[part].pivotMm;
    const [x = 0, y = 0, z = 0] = node.translation ?? [];
    if (Math.max(Math.abs(x), Math.abs(y + base[1] - absolute[1]), Math.abs(-z + base[0] - absolute[0])) > .0001 ||
        (parent && !nodes.get(parent).children.includes(node.index)) || node.matrix || node.rotation || node.scale) {
      throw new Error(`Model/rig transform mismatch at ${part}`);
    }
    const partFootprint = [];
    let count = 0;
    for (const primitive of gltf.meshes[node.mesh].primitives) {
      primitives++;
      count += gltf.accessors[primitive.indices].count / 3;
      for (const [s, cross, height] of positions(primitive.attributes.POSITION)) {
        const absS = s + absolute[0];
        sizes.minS = Math.min(sizes.minS, absS);
        sizes.maxS = Math.max(sizes.maxS, absS);
        sizes.minY = Math.min(sizes.minY, height + absolute[1]);
        sizes.maxY = Math.max(sizes.maxY, height + absolute[1]);
        sizes.halfWidth = Math.max(sizes.halfWidth, Math.abs(cross));
        partFootprint.push([absS - pivot(name), cross]);
      }
    }
    if (count !== trianglesByNode[part].optimized) throw new Error(`Triangle count mismatch at ${part}`);
    if (kinematics && axles[part]) axleOutlines[part] = hull(partFootprint);
    else footprint.push(...partFootprint);
    triangles += count;
  }
  outlines[name] = hull(footprint);
}
if (nodes.size !== names.length + Object.keys(axles).length + 1 ||
    gltf.animations?.length || gltf.images.some(image => image.uri)) {
  throw new Error('Unexpected geometry, animation, or external resource');
}

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

function measure(track, s, head = railHeads.v06) {
  const framePoses = poses(track, s);
  let halfEnvelope = 0;
  let axleOffset = 0;
  let hingeResidual = 0;
  let extremePart = null;
  let extremeAxle = null;
  const byFrame = {};
  const axleSlides = {};
  const frameOffsets = {};
  let worstTread = null;
  let worstFlange = null;
  for (const [name, frame] of Object.entries(frames)) {
    const pose = framePoses[name];
    const routePivot = s + pivot(name) - frameSetback(name);
    const distance = (along, across) => Math.abs(track.offset(shift(pose, along, across), routePivot + along));
    let reach = 0;
    for (const [along, across] of outlines[name]) reach = Math.max(reach, distance(along, across));
    for (const axle of frame.axleNodes) {
      const station = axles[axle].sMm;
      const along = station - pivot(name);
      const {slide, error} = kinematics
        ? axlePlay(track, routePivot + along, pose, along, kinematics.axlePlayMm[name] ?? 0)
        : {slide: 0, error: distance(along, 0)};
      axleSlides[axle] = slide;
      if (wheelProfiles) {
        const contact = wheelContact(track, routePivot + along, {...pose, ...shift(pose, along, slide)},
          wheelProfiles.axles[axle], head);
        if (!worstTread || contact.treadOverlap < worstTread.treadOverlap) worstTread = {axle, ...contact};
        if (!worstFlange || contact.flangeOverlap > worstFlange.flangeOverlap) worstFlange = {axle, ...contact};
      }
      frameOffsets[name] = Math.max(frameOffsets[name] ?? 0, Math.abs(error));
      if (axleOutlines[axle]) {
        for (const [u, v] of axleOutlines[axle]) reach = Math.max(reach, distance(u, v + slide));
      }
      const deviation = Math.abs(error);
      if (deviation > axleOffset) {
        axleOffset = deviation;
        extremeAxle = axle;
      }
    }
    byFrame[name] = reach;
    if (reach > halfEnvelope) {
      halfEnvelope = reach;
      extremePart = name;
    }
    if (frame.parent) {
      const predicted = shift(framePoses[frame.parent], pivot(name) - pivot(frame.parent), pose.guideTravelMm ?? 0);
      hingeResidual = Math.max(hingeResidual, Math.hypot(pose.x - predicted.x, pose.z - predicted.z));
    }
  }
  const rear = framePoses.engine_rear;
  const front = framePoses.engine_front;
  const enginePin = shift(rear, drawbarPinsMm.engine - pivot('engine_rear'));
  const tenderPin = shift(framePoses.tender_body, drawbarPinsMm.tender - pivot('tender_body'));
  const drawbar = kinematics?.drawbar ? drawbarPose(enginePin, tenderPin, kinematics.drawbar) : null;
  return {
    halfEnvelope, extremePart, axleOffset, extremeAxle, hingeResidual, byFrame,
    ...(wheelProfiles ? {worstTread, worstFlange} : {}),
    ...(kinematics?.trailingGuide ? {trailingOffset: frameOffsets.trailing_truck,
      trailingTravel: Math.abs(framePoses.trailing_truck.guideTravelMm)} : {}),
    ...(kinematics ? {axleSlides, frameOffsets, drawbar, leadingOffset: frameOffsets.leading_truck,
      guideTravel: Math.abs(framePoses.leading_truck.guideTravelMm)} : {}),
    hingeDegrees: Math.abs(Math.atan2(rear.cos * front.sin - rear.sin * front.cos,
      rear.cos * front.cos + rear.sin * front.sin) * 180 / Math.PI),
    drawbarSpan: Math.hypot(enginePin.x - tenderPin.x, enginePin.z - tenderPin.z),
    framePoses,
  };
}

function line() {
  return {locate: s => ({x: s, z: 0}), offset: p => p.z};
}

function circle(radius, direction) {
  return {
    locate: s => ({x: radius * Math.sin(s / radius), z: direction * radius * (1 - Math.cos(s / radius))}),
    offset: p => direction * (radius - Math.hypot(p.x, p.z - direction * radius)),
  };
}

const straight = measure(line(), 0);
if (straight.axleOffset > .00001 || straight.hingeDegrees > .00001 ||
    Math.abs(straight.halfEnvelope - sizes.halfWidth) > .00001 ||
    Math.abs(straight.drawbarSpan - (drawbarPinsMm.engine - drawbarPinsMm.tender + setback)) > .00001) {
  throw new Error('Straight reference pose does not reconstruct the source');
}
const arcs = [315, 282, 249, 216, 150].map(radius => ({
  radius, left: measure(circle(radius, 1), 0), right: measure(circle(radius, -1), 0),
}));

const projectionWindowMm = 24;

function routePolyline(journey) {
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

const stepMm = 12;
const byScenario = {};
for (const id of ['legacy', 'v06']) {
  const {network, registry} = createScenarioProfile(id, read('assets/scenario-v06/dataset.json'));
  const configs = Array.from({length: 2 ** registry.ids.length}, (_, mask) =>
    routing(network, control => Boolean(mask & (1 << registry.ids.indexOf(control)))));
  const seenPoses = new Set();
  const sampledEdges = new Set();
  const sampledSwitchEdges = new Set();
  const extraMetrics = kinematics ? ['leadingOffset', 'guideTravel'] : [];
  if (kinematics?.trailingGuide) extraMetrics.push('trailingOffset', 'trailingTravel');
  let unsupportedPoses = 0;
  let flangeFlagPoses = 0;
  const worst = {halfEnvelope: null, axleOffset: null, hingeDegrees: null, drawbarMin: null, drawbarMax: null};
  const loopCases = network.mainLoops.map(({lane, segments}) => ({
    lane, edges: new Set(segments.map(({id}) => id)), poses: 0, halfEnvelope: 0, axleOffset: 0,
  }));
  const byHeading = {'1': 0, '-1': 0};
  let hingeResidual = 0;

  for (const edge of Object.values(network.edges)) {
    const steps = Math.ceil(edge.length / stepMm);
    const samples = Array.from({length: steps + 1}, (_, i) => edge.length * i / steps);
    for (const sign of [1, -1]) {
      const histories = new Set();
      for (const [mask, choose] of configs.entries()) {
        if (edge.switchId && choose.controlState(edge.switchId) !== edge.requiredState) continue;
        const journey = new Journey(network, edge.id, 0);
        journey.segments[0].sign = sign;
        journey.ensure(sizes.minS - setback - projectionWindowMm, choose);
        journey.ensure(edge.length + sizes.maxS + projectionWindowMm, choose);
        const key = journey.segments.map(({id, sign}) => [id, sign].join('/')).join(',');
        if (histories.has(key)) continue;
        histories.add(key);
        const track = routePolyline(journey);
        const min = journey.segments[0].start;
        const max = journey.segments.at(-1).end;
        for (const [index, s] of samples.entries()) {
          if (s + sizes.minS - setback < min || s + sizes.maxS > max) continue;
          const occupied = journey.segments.filter(seg => seg.start < s + sizes.maxS + projectionWindowMm &&
            seg.end > s + sizes.minS - setback - projectionWindowMm).map(({id, sign}) => `${id}/${sign}`);
          const poseKey = `${edge.id}:${sign}:${index}:${occupied.join(',')}`;
          if (seenPoses.has(poseKey)) continue;
          seenPoses.add(poseKey);
          sampledEdges.add(edge.id);
          if (edge.switchId) sampledSwitchEdges.add(edge.id);
          byHeading[sign]++;
          const result = measure(track, s, railHeads[id]);
          const witness = {edge: edge.id, edgeRole: edge.role, s, sign, mask, route: occupied, ...result};
          hingeResidual = Math.max(hingeResidual, result.hingeResidual);
          for (const metric of ['halfEnvelope', 'axleOffset', 'hingeDegrees', ...extraMetrics]) {
            if (!worst[metric] || result[metric] > worst[metric][metric]) worst[metric] = witness;
          }
          if (wheelProfiles) {
            if (result.worstTread.treadOverlap <= 0) unsupportedPoses++;
            if (result.worstFlange.flangeOverlap > 0) flangeFlagPoses++;
            if (!worst.worstTread || result.worstTread.treadOverlap < worst.worstTread.worstTread.treadOverlap) worst.worstTread = witness;
            if (!worst.worstFlange || result.worstFlange.flangeOverlap > worst.worstFlange.worstFlange.flangeOverlap) worst.worstFlange = witness;
          }
          if (result.drawbar && (!worst.drawbarMargin || result.drawbar.margin < worst.drawbarMargin.drawbar.margin)) worst.drawbarMargin = witness;
          if (!worst.drawbarMin || result.drawbarSpan < worst.drawbarMin.drawbarSpan) worst.drawbarMin = witness;
          if (!worst.drawbarMax || result.drawbarSpan > worst.drawbarMax.drawbarSpan) worst.drawbarMax = witness;
          for (const loop of loopCases) {
            if (!occupied.every(entry => loop.edges.has(entry.slice(0, entry.lastIndexOf('/'))))) continue;
            loop.poses++;
            loop.halfEnvelope = Math.max(loop.halfEnvelope, result.halfEnvelope);
            loop.axleOffset = Math.max(loop.axleOffset, result.axleOffset);
          }
        }
      }
    }
  }
  byScenario[id] = {
    poses: seenPoses.size, ...(wheelProfiles ? {unsupportedPoses, flangeFlagPoses} : {}), byHeading, controlIds: registry.ids, totalEdges: Object.keys(network.edges).length,
    sampledEdges: sampledEdges.size, sampledSwitchEdges: [...sampledSwitchEdges].sort(),
    unsampledEdges: Object.keys(network.edges).filter(edge => !sampledEdges.has(edge)),
    loopCases: loopCases.map(({edges, ...loop}) => loop), hingeResidual, worst,
  };
}

const report = {
  model: {bytes: binary.length, sha256: modelSha256, triangles,
    primitives, textureImages: gltf.images.length, frames: names.length, axles: Object.keys(axles).length,
    boundsMm: sizes},
  method: 'Vertex projection hulls of each rigid group at zero wheel phase. Approximate sampled outline, not a swept mesh or a route clearance certification.',
  ...(wheelProfiles ? {railHeads} : {}), stepMm, projectionWindowMm, ...(kinematics ? {kinematics} : {}), straight, arcs, byScenario,
};
writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
