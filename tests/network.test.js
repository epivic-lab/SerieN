import test from "node:test";
import assert from "node:assert/strict";
import { createNetwork, validateNetwork } from "../src/network.js";
import { Journey, routing, FixedClock } from "../src/simulation.js";
const n = createNetwork(), route = routing(n, () => false);
test("finite connected geometry and exactly four buffer stops", () => {
  assert.equal(validateNetwork(n).deadEnds, 4);
});
test("forward and reverse preserve the positions of the entire consist", () => {
  const j = new Journey(n, "L0-return", 1e3);
  const initial = [0, 64, 128, 192].map((d) => j.locate(j.position - d));
  assert.ok(j.move(400, 230, route));
  assert.ok(j.move(-400, 230, route));
  [0, 64, 128, 192].forEach((d, i) => {
    const p = j.locate(j.position - d);
    assert.ok(Math.hypot(p.x - initial[i].x, p.z - initial[i].z) < 1e-6);
  });
});
test("crossovers are traversed continuously, not teleported", () => {
  const r = routing(n, (id) => id === "WX-A"), j = new Journey(n, "L0-0", 50);
  let previous = j.locate(), crossed = false;
  for (let i = 0; i < 600; i++) {
    assert.ok(j.move(1, 0, r));
    const p = j.locate();
    assert.ok(Math.hypot(p.x - previous.x, p.z - previous.z) < 1.001);
    if (p.edge.startsWith("XA")) crossed = true;
    previous = p;
  }
  assert.ok(crossed);
  assert.equal(n.edges[j.locate().edge].lane, 1);
});
test("all main loops remain traversable for multiple laps", () => {
  for (let lane = 0; lane < 3; lane++) {
    const j = new Journey(n, `L${lane}-return`, 600);
    for (let i = 0; i < 2e3; i++) assert.ok(j.move(5, 230, route));
    assert.equal(n.edges[j.locate().edge].lane, lane);
    assert.ok(j.segments.length < 20);
  }
});
test("fixed simulation step gives same elapsed simulation at 30 and 60 fps", () => {
  function run(fps) {
    const c = new FixedClock();
    let s = 0;
    for (let i = 0; i < fps * 10; i++) c.update(1 / fps, (dt) => s += dt);
    return s;
  }
  assert.ok(Math.abs(run(30) - run(60)) < 1e-8);
});
test("active crossover never turns a running locomotive backwards", () => {
  const r = routing(n, (id) => id === "WX-A");
  for (const start of ["L0-0", "L1-0"]) for (const sign of [-1, 1]) {
    const j = new Journey(n, start, n.edges[start].length / 2);
    let prev = j.locate(), last = null;
    for (let i = 0; i < 2e3; i++) {
      assert.ok(j.move(sign, 0, r));
      const p = j.locate(), v = { x: p.x - prev.x, z: p.z - prev.z };
      assert.ok(Math.hypot(v.x, v.z) < 1.001);
      if (last) assert.ok(v.x * last.x + v.z * last.z > -0.01);
      last = v;
      prev = p;
    }
  }
});
test("geometry has four distinct reachable sidings", () => {
  for (const id of ["upper", "middle", "lower", "right"]) {
    const edge = n.edges[id];
    assert.equal(n.nodes[edge.to].length, 1);
    assert.ok(n.nodes[edge.from].length > 1);
  }
});
