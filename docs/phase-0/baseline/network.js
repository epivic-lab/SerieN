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
  function edge(id, points, meta = {}) {
    const p = measured(points, { id, ...meta });
    edges[id] = p;
    for (const [end, pt] of [[0, points[0]], [1, points.at(-1)]]) {
      const key = pt.x.toFixed(3) + "," + pt.z.toFixed(3);
      p[end ? "to" : "from"] = key;
      (nodes[key] ??= []).push({ edge: id, end });
    }
    return p;
  }
  const cuts = [378, 440, 750, 800, 812, 1110, 1122];
  for (let lane = 0; lane < 3; lane++) {
    const r = [249, 282, 315][lane], z = 350 - r;
    for (let i = 0; i < cuts.length - 1; i++) edge(`L${lane}-${i}`, line([cuts[i], z], [cuts[i + 1], z]), { lane });
    const points = [];
    for (let i = 0; i <= 100; i++) {
      const a = -Math.PI / 2 + Math.PI * i / 100;
      points.push({ x: 1122 + r * Math.cos(a), z: 350 + r * Math.sin(a) });
    }
    if (lane === 0) {
      points.push(...bezier([1122, 599], [1e3, 599], [980, 566], [812, 566]), ...line([812, 566], [688, 566]), ...bezier([688, 566], [520, 566], [500, 599], [378, 599]));
    } else points.push({ x: 378, z: 350 + r });
    for (let i = 1; i <= 100; i++) {
      const a = Math.PI / 2 + Math.PI * i / 100;
      points.push({ x: 378 + r * Math.cos(a), z: 350 + r * Math.sin(a) });
    }
    points.push({ x: 378, z });
    edge(`L${lane}-return`, points, { lane });
  }
  for (const [id, a, b, x, sw] of [["XA", 0, 1, 440, "WX-A"], ["XB", 1, 2, 800, "WX-B"]]) {
    for (const [j, k] of [[a, b], [b, a]]) edge(`${id}${j}`, bezier([x, 350 - [249, 282, 315][j]], [x + 115, 350 - [249, 282, 315][j]], [x + 195, 350 - [249, 282, 315][k]], [x + 310, 350 - [249, 282, 315][k]]), { switchId: sw });
  }
  const access = measured(bezier([812, 101], [730, 101], [565, 245], [410, 284]));
  const mid = sample(access, access.length * 0.42);
  edge("lead", bezier([812, 101], [740, 101], [mid.x + 50, mid.z - 30], [mid.x, mid.z]), { switchId: "Y-IN" });
  edge("approach", bezier([mid.x, mid.z], [mid.x - 60, mid.z + 36], [485, 267], [410, 284]));
  edge("upper", bezier([mid.x, mid.z], [mid.x - 100, mid.z + 18], [365, 235], [243, 231]), { switchId: "Y-2" });
  edge("middle", bezier([410, 284], [330, 266], [250, 276], [177, 292]), { switchId: "Y-3" });
  edge("lower", bezier([410, 284], [325, 305], [220, 335], [122, 362]), { switchId: "Y-R1" });
  edge("runMain", bezier([410, 284], [550, 250], [685, 247], [825, 247]));
  edge("runAround", bezier([410, 284], [550, 330], [700, 275], [825, 247]), { switchId: "Y-R2" });
  edge("right", line([825, 247], [1250, 247]), { switchId: "Y-4" });
  return { edges, nodes };
}
function validateNetwork(network) {
  for (const p of Object.values(network.edges)) if (!(p.length > 0) || p.points.some((v) => !Number.isFinite(v.x + v.z))) throw Error("Invalid edge " + p.id);
  return { edges: Object.keys(network.edges).length, deadEnds: Object.values(network.nodes).filter((v) => v.length === 1).length };
}
export {
  bezier,
  createNetwork,
  line,
  measured,
  sample,
  validateNetwork
};
