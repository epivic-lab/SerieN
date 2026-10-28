import canonical from "./canonical-layout.json" with { type: "json" };
function measured(points, meta = {}) {
  const distance = [0];
  for (let i = 1; i < points.length; i++) distance.push(distance[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z));
  return { points, distance, length: distance.at(-1), ...meta };
}
function sample(path, s) {
  s = Math.max(0, Math.min(path.length, s));
  let lo = 0, hi = path.distance.length - 1;
  while (hi - lo > 1) {
    const m = lo + hi >> 1;
    if (path.distance[m] < s) lo = m;
    else hi = m;
  }
  const a = path.points[lo], b = path.points[hi], q = (s - path.distance[lo]) / (path.distance[hi] - path.distance[lo] || 1);
  return { x: a.x + (b.x - a.x) * q, z: a.z + (b.z - a.z) * q };
}
function line(a, b, n = 1) {
  return Array.from({ length: n + 1 }, (_, i) => ({ x: a[0] + (b[0] - a[0]) * i / n, z: a[1] + (b[1] - a[1]) * i / n }));
}
function bezier(a, b, c, d, n = 80) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n, u = 1 - t;
    return { x: u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0], z: u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1] };
  });
}
function createNetwork() {
  const edges = {}, nodes = {};
  for (const source of canonical.edges) {
    const edge = measured(source.points.map((p) => ({...p})), {...source});
    edges[edge.id] = edge;
    (nodes[edge.from] ??= []).push({edge:edge.id,end:0});
    (nodes[edge.to] ??= []).push({edge:edge.id,end:1});
  }
  const network = {edges,nodes,canonical:true,metadata:canonical,controllers:canonical.controllers};
  network.mainLoops = [0,1,2].map((lane) => {
    const members = Object.values(edges).filter((e) => e.lane === lane && !e.requiredState);
    if (!members.length) throw Error("Missing mainline "+lane);
    const first = members[0], route = [], visited = new Set();
    let edge=first,end=0;
    for (let i=0;i<200;i++) {
      const key=edge.id+":"+end;
      if (visited.has(key)) {
        if (key !== first.id+":0") throw Error("Mainline does not close "+lane);
        return {lane,segments:route,length:route.reduce((sum,p)=>sum+edges[p.id].length,0)};
      }
      visited.add(key);route.push({id:edge.id,sign:end===0?1:-1});
      const node=end===0?edge.to:edge.from;
      const next=nodes[node].filter((p)=>p.edge!==edge.id && members.includes(edges[p.edge]));
      if(next.length!==1)throw Error("Ambiguous/open mainline "+lane+" at "+node);
      edge=edges[next[0].edge];end=next[0].end;
    }
    throw Error("Mainline iteration limit");
  });
  return network;
}
function loopPosition(network,lane,fraction) {
  const loop=network.mainLoops[lane];
  let distance=((fraction%1)+1)%1*loop.length;
  for(const part of loop.segments) {
    const edge=network.edges[part.id];
    if(distance<=edge.length)return {edge:edge.id,s:part.sign>0?distance:edge.length-distance,sign:part.sign};
    distance-=edge.length;
  }
  throw Error("Invalid loop distance");
}
function validateNetwork(network) {
  for (const p of Object.values(network.edges)) {
    if (!(p.length > 0) || p.points.some((v) => !Number.isFinite(v.x + v.z))) throw Error("Invalid edge " + p.id);
    for(const [node,point] of [[p.from,p.points[0]],[p.to,p.points.at(-1)]]) {
      const expected=network.metadata.nodes[node];
      if(Math.hypot(point.x-expected.x,point.z-expected.z)>1e-7)throw Error("Disconnected geometry "+p.id);
    }
  }
  return {edges:Object.keys(network.edges).length,deadEnds:Object.values(network.nodes).filter((v)=>v.length===1).length};
}
export {bezier,createNetwork,line,measured,sample,loopPosition,validateNetwork};
