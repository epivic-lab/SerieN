import { sample } from "./network.js";
class Journey {
  constructor(network, edge, s) {
    this.network = network;
    this.segments = [{ id: edge, sign: 1, start: 0, end: network.edges[edge].length }];
    this.position = s;
    this.travel = 0;
  }
  locate(at = this.position) {
    let seg = this.segments.find((v) => at >= v.start - 1e-6 && at <= v.end + 1e-6);
    if (!seg) seg = at < this.segments[0].start ? this.segments[0] : this.segments.at(-1);
    const p = this.network.edges[seg.id];
    const d = Math.max(0, Math.min(p.length, at - seg.start));
    const s = seg.sign > 0 ? d : p.length - d;
    const point = sample(p, s), a = sample(p, s - 0.5), b = sample(p, s + 0.5);
    return { ...point, angle: -Math.atan2((b.z - a.z) * seg.sign, (b.x - a.x) * seg.sign), edge: seg.id, s };
  }
  extend(forward, choose) {
    const seg = forward ? this.segments.at(-1) : this.segments[0], p = this.network.edges[seg.id];
    const end = forward ? seg.sign > 0 ? 1 : 0 : seg.sign > 0 ? 0 : 1;
    const node = end ? p.to : p.from;
    const choices = this.network.nodes[node].filter((c) => c.edge !== seg.id);
    const next = choose(seg.id, choices, forward);
    if (!next) return false;
    const q = this.network.edges[next.edge], sign = forward ? next.end === 0 ? 1 : -1 : next.end === 0 ? -1 : 1;
    this.segments[forward ? "push" : "unshift"]({ id: next.edge, sign, start: forward ? seg.end : seg.start - q.length, end: forward ? seg.end + q.length : seg.start });
    return true;
  }
  ensure(at, choose) {
    for (let n = 0; n < 100; n++) {
      if (at < this.segments[0].start) {
        if (!this.extend(false, choose)) return false;
      } else if (at > this.segments.at(-1).end) {
        if (!this.extend(true, choose)) return false;
      } else return true;
    }
    return false;
  }
  move(delta, tail, choose) {
    const target = this.position + delta;
    if (!this.ensure(target, choose) || !this.ensure(target - tail, choose)) return false;
    this.position = target;
    this.travel += Math.abs(delta);
    while (this.segments.length > 2 && this.segments[1].end < this.position - tail - 500) this.segments.shift();
    while (this.segments.length > 2 && this.segments.at(-2).start > this.position + 500) this.segments.pop();
    return true;
  }
}
function routing(network, state) {
  return (current, choices) => {
    if (!choices.length) return null;
    const incoming = network.edges[current];
    const endpoint = network.edges[choices[0].edge].points[choices[0].end ? network.edges[choices[0].edge].points.length - 1 : 0];
    const atEnd = Math.hypot(endpoint.x - incoming.points.at(-1).x, endpoint.z - incoming.points.at(-1).z) < 0.01;
    const p = atEnd ? incoming.points.at(-1) : incoming.points[0], q = atEnd ? incoming.points.at(-2) : incoming.points[1];
    const aligned = (c) => {
      const e = network.edges[c.edge], a = c.end ? e.points.at(-1) : e.points[0], b = c.end ? e.points.at(-2) : e.points[1];
      return (p.x - q.x) * (b.x - a.x) + (p.z - q.z) * (b.z - a.z) > 0;
    };
    if ((current === "runMain" || current === "runAround") && choices.some((c) => c.edge === "right")) return choices.find((c) => c.edge === (state("Y-4") ? "right" : current === "runMain" ? "runAround" : "runMain"));
    const junctions = [
      { common: "lead", main: "approach", branch: "upper", sw: "Y-2" },
      { common: "approach", main: "runMain", branch: state("Y-3") ? "middle" : state("Y-R1") ? "lower" : "runAround", sw: "Y-R1" },
      { common: "right", main: "runMain", branch: "runAround", sw: "Y-R2" }
    ];
    for (const j of junctions) {
      const names = new Set(choices.map((c) => c.edge));
      if (current === j.common && names.has(j.main) && names.has(j.branch)) {
        const target = state(j.sw) || j.common === "approach" && state("Y-3") ? j.branch : j.main;
        return choices.find((c) => c.edge === target);
      }
      if ((current === j.main || current === j.branch) && names.has(j.common)) return choices.find((c) => c.edge === j.common);
    }
    if (incoming.lane !== void 0) {
      const branch = choices.find((c) => network.edges[c.edge].switchId && state(network.edges[c.edge].switchId) && aligned(c));
      if (branch) return branch;
      return choices.find((c) => network.edges[c.edge].lane === incoming.lane) || null;
    }
    if (incoming.switchId?.startsWith("WX")) return choices.find((c) => network.edges[c.edge].lane !== void 0 && aligned(c)) || choices[0];
    if (current === "lead") return choices.find((c) => network.edges[c.edge].lane === 0 && c.end === 1) || choices[0];
    return choices.find((c) => !network.edges[c.edge].switchId || state(network.edges[c.edge].switchId)) || choices[0];
  };
}
class FixedClock {
  constructor(step = 1 / 60) {
    this.step = step;
    this.accumulator = 0;
  }
  update(elapsed, fn) {
    this.accumulator += Math.min(0.2, elapsed);
    while (this.accumulator >= this.step) {
      fn(this.step);
      this.accumulator -= this.step;
    }
  }
}
export {
  FixedClock,
  Journey,
  routing
};
