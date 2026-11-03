import { sample } from "./network.js";

const EPS = 1e-6;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

function pathSection(edge, from, to) {
  const lo = Math.min(from, to), hi = Math.max(from, to);
  const points = [sample(edge, lo)];
  edge.points.forEach((p, i) => { if (edge.distance[i] > lo + EPS && edge.distance[i] < hi - EPS) points.push({ ...p }); });
  points.push(sample(edge, hi));
  return from <= to ? points : points.reverse();
}

function createSwitchTopology(network, specs) {
  const sites = [], byNode = new Map(), byControl = new Map();
  if (network.canonical) {
    for (const unit of network.controllers) {
      const site={id:unit.id,name:unit.name,controls:[unit.id],nodes:[...new Set(Object.values(unit.ports))],internal:unit.internal,paths:[],protectedRanges:[]};
      for(const id of unit.internal) {
        const edge=network.edges[id];
        site.paths.push({edge:id,from:0,to:edge.length,points:edge.points});
        site.protectedRanges.push({edge:id,min:0,max:edge.length});
      }
      sites.push(site);byControl.set(unit.id,site);
      // At directly touching switches a node belongs to both units. Resolve
      // the encounter using the actual outgoing/internal route below.
      for(const node of site.nodes) {
        const members=byNode.get(node)??[];members.push(site);byNode.set(node,members);
        for(const port of network.nodes[node]) {
          const edge=network.edges[port.edge];
          if(unit.internal.includes(edge.id))continue;
          const length=Math.min(30,edge.length);
          site.protectedRanges.push({edge:edge.id,min:port.end?edge.length-length:0,max:port.end?edge.length:length});
        }
      }
    }
    return {sites,byNode,byControl};
  }
  throw new Error("Switch topology requires the canonical railway model");
}

function destinationFor(network, port) {
  if (!port) return null;
  const edge = network.edges[port.edge];
  if (!edge) return null;
  if (network.canonical) {
    if(edge.lane!==undefined)return ["Inner loop","Middle loop","Outer loop"][edge.lane];
    if(edge.role==="crossover")return ["Inner loop","Middle loop","Outer loop"][port.end?edge.fromLane:edge.toLane];
    return edge.destination??null;
  }
  return null;
}

// Read-only traversal of the actual Journey ribbon. At its ends consult exactly
// the same router as the simulation; never append to or trim Journey.segments.
function traceJourney(network, topology, journey, direction, offset, choose, maxDistance = 12000, includePoints = true) {
  const result = { next: null, encounters: [], ranges: [], points: [], distance: 0, stop: "invalid", uncertain: false };
  if (!journey || ![1, -1].includes(direction) || !Number.isFinite(offset)) return result;
  const at = journey.position - offset;
  let historyIndex = journey.segments.findIndex((seg) => at >= seg.start - EPS && at <= seg.end + EPS);
  if (historyIndex < 0) return result;
  const initial = journey.segments[historyIndex];
  let edge = network.edges[initial.id];
  if (!edge) return result;
  let sign = initial.sign * direction;
  let s = initial.sign > 0 ? at - initial.start : edge.length - (at - initial.start);
  s = clamp(s, 0, edge.length);
  const visited = new Set([`${edge.id}:${sign}`]), seenSites = new Set();
  for (let step = 0; step < 256; step++) {
    const remaining = sign > 0 ? edge.length - s : s;
    const length = Math.min(remaining, maxDistance - result.distance), end = s + sign * length;
    result.ranges.push({ edge: edge.id, from: s, to: end, distance: result.distance });
    if(includePoints) {
      const points = pathSection(edge, s, end);
      if (result.points.length) points.shift();
      result.points.push(...points);
    }
    result.distance += length;
    if (result.distance >= maxDistance - EPS) { result.stop = "limit"; return result; }
    const node = sign > 0 ? edge.to : edge.from, ports = network.nodes[node];
    if (!ports) { result.stop = "missing-node"; result.uncertain = true; return result; }
    const choices = ports.filter((p) => p.edge !== edge.id);
    const members = topology.byNode.get(node);
    let site = Array.isArray(members) ? (members.find((s)=>!s.internal.includes(edge.id))??members[0]) : members;
    if (!choices.length) { result.stop = "terminal"; return result; }
    if (choices.length > 1 && !site) { result.stop = "unmapped-junction"; result.uncertain = true; return result; }
    const wanted = choose(edge.id, choices, direction > 0);
    if(Array.isArray(members))site=members.find((s)=>wanted&&s.internal.includes(wanted.edge))??members.find((s)=>s.internal.includes(edge.id))??site;
    const valid = wanted && choices.some((p) => p.edge === wanted.edge && p.end === wanted.end);
    if (site && !seenSites.has(site.id)) {
      const encounter = { site, node, distance: result.distance, incoming: edge.id, outgoing: valid ? wanted : null, destination: valid ? destinationFor(network, wanted) : null };
      seenSites.add(site.id);
      result.encounters.push(encounter);
      result.next ??= encounter;
    }
    if (!valid) { result.stop = choose.reason?.(edge.id,choices)??"undetermined"; result.uncertain = !["misaligned","no-route"].includes(result.stop); return result; }
    const historyNext = historyIndex === null ? null : journey.segments[historyIndex + direction];
    if (historyNext) {
      const entry = direction > 0 ? historyNext.sign > 0 ? 0 : 1 : historyNext.sign > 0 ? 1 : 0;
      if (wanted.edge !== historyNext.id || wanted.end !== entry) {
        result.stop = "history-conflict";
        result.uncertain = true;
        if (result.next?.node === node) { result.next.destination = null; result.next.conflict = true; }
        return result;
      }
      historyIndex += direction;
    } else historyIndex = null;
    edge = network.edges[wanted.edge];
    sign = wanted.end === 0 ? 1 : -1;
    s = wanted.end ? edge.length : 0;
    const key = `${edge.id}:${sign}`;
    if (visited.has(key)) { result.stop = "cycle"; return result; }
    visited.add(key);
  }
  result.stop = "limit";
  return result;
}

function occupiedRanges(network, journey, offset, couplers = null) {
  const front = couplers?.front?.x ?? 48, rear = -(couplers?.back?.x ?? -48);
  const lo = journey.position - offset - rear, hi = journey.position - offset + front;
  const ranges = [];
  for (const seg of journey.segments) {
    const a = Math.max(lo, seg.start), b = Math.min(hi, seg.end);
    if (a > b) continue;
    const edge = network.edges[seg.id];
    ranges.push({ edge: seg.id, min: seg.sign > 0 ? a - seg.start : edge.length - (b - seg.start), max: seg.sign > 0 ? b - seg.start : edge.length - (a - seg.start) });
  }
  return ranges;
}

function siteSafety(site, occupied, moving) {
  if (!site) return { blocked: true, kind: "unknown", message: "Insufficient safety data" };
  if (site.protectedRanges.some((a) => occupied.some((b) => a.edge === b.edge && a.min <= b.max + EPS && b.min <= a.max + EPS))) {
    return { blocked: true, kind: "occupied", message: "Switch area occupied · operation blocked" };
  }
  for (const train of moving) {
    if (Math.abs(train.velocity) <= 0.1) continue;
    const encounter = train.preview.encounters.find((e) => e.site.id === site.id);
    const speed = Math.abs(train.velocity);
    const margin = (train.leadingExtent ?? 48) + 20 + speed * 0.6 + speed * speed / 200;
    if (train.preview.uncertain && train.preview.distance <= margin) return { blocked:true, kind:"unknown", message:"Approach route unknown · operation blocked" };
    if (encounter && encounter.distance <= margin) return { blocked: true, kind: "approaching", message: "Train approaching · operation blocked" };
  }
  return { blocked: false, kind: "unlocked", message: "No switch operation lock detected" };
}

function schematicPaths(network, preview) {
  if (!preview.next) return { base: [], selected: [], bounds: null };
  const base = preview.next.site.paths;
  const selected = [];
  const reach = preview.next.site.internal.length ? Math.max(...preview.next.site.internal.map((id) => network.edges[id].length)) + 1 : 90;
  for (const path of base) for (const range of preview.ranges) {
    if (path.edge !== range.edge) continue;
    if (range.distance > preview.next.distance + reach || range.distance + Math.abs(range.to-range.from) < preview.next.distance - 90) continue;
    const lo = Math.max(Math.min(path.from, path.to), Math.min(range.from, range.to));
    const hi = Math.min(Math.max(path.from, path.to), Math.max(range.from, range.to));
    if (hi > lo + EPS) selected.push({ edge: path.edge, points: pathSection(network.edges[path.edge], range.from > range.to ? hi : lo, range.from > range.to ? lo : hi) });
  }
  // With a conflicting cached route only show the current switch selection in
  // the schematic. The 3D prediction itself already stops at the conflict.
  if (preview.next.conflict && preview.next.outgoing) {
    for (const p of base) if (p.edge === preview.next.outgoing.edge) selected.push(p);
  }
  const points = base.flatMap((p) => p.points);
  return { base, selected, bounds: { xmin: Math.min(...points.map((p) => p.x)), xmax: Math.max(...points.map((p) => p.x)), zmin: Math.min(...points.map((p) => p.z)), zmax: Math.max(...points.map((p) => p.z)) } };
}

export { createSwitchTopology, destinationFor, pathSection, traceJourney, occupiedRanges, siteSafety, schematicPaths };
