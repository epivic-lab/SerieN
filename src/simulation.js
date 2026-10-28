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
  reconcile(tail, front, choose) {
    const lo=this.position-tail, hi=this.position+front;
    while(this.segments.length>1 && this.segments[0].end<lo-1e-6)this.segments.shift();
    while(this.segments.length>1 && this.segments.at(-1).start>hi+1e-6)this.segments.pop();
    return this.ensure(lo,choose) && this.ensure(hi,choose);
  }
  move(delta, tail, choose, front = 0) {
    const target = this.position + delta;
    if (!this.ensure(target + front, choose) || !this.ensure(target - tail, choose)) return false;
    this.position = target;
    this.travel += Math.abs(delta);
    while (this.segments.length > 2 && this.segments[1].end < this.position - tail - 500) this.segments.shift();
    while (this.segments.length > 2 && this.segments.at(-2).start > this.position + 500) this.segments.pop();
    return true;
  }
}
function routing(network,state) {
  return (current,choices) => {
    const incoming=network.edges[current];
    if(!incoming)return null;
    if(incoming.switchId && Boolean(state(incoming.switchId))!==incoming.requiredState)return null;
    const valid=choices.filter((p)=>{
      const edge=network.edges[p.edge];
      if(edge.unit && edge.unit===incoming.unit)return false;
      return !edge.switchId || Boolean(state(edge.switchId))===edge.requiredState;
    });
    // Never create crossing junctions or B-A-C reversals inside a turnout.
    return valid.length===1?valid[0]:null;
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
