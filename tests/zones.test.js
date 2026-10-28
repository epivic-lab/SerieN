import test from "node:test";
import assert from "node:assert/strict";
import { createNetwork } from "../src/network.js";
import { clearance } from "../src/landscape.js";
import { buildZoneLayout, safeScenicPosition, FARM, GOODS_OFFICE, VINEYARD } from "../src/zone-layout.js";
const network = createNetwork();
const buildings = [{ x: 280, z: 455, w: 75, d: 54 }, { x: 583, z: 449, w: 80, d: 57 }, { x: 750, z: 525, w: 135, d: 40 }, { x: 1033, z: 333, w: 125, d: 80 }, { x: 1165, z: 338, w: 77, d: 58 }, { x: 250, z: 195, w: 120, d: 68 }, { x: 430, z: 168, w: 80, d: 55 }];
const mask = clearance(network, buildings), layout = buildZoneLayout(network, mask);
test("zone planning is deterministic and does not modify track geometry", () => {
  const before = JSON.stringify(network);
  assert.deepEqual(buildZoneLayout(network, mask), layout);
  assert.equal(JSON.stringify(network), before);
  assert.equal(layout.buildings.length, 2);
});
test("farmhouse and goods office footprints have full railway clearance", () => {
  for (const b of [FARM, GOODS_OFFICE]) for (let x = b.x - b.w / 2; x <= b.x + b.w / 2; x += 2) for (let z = b.z - b.d / 2; z <= b.z + b.d / 2; z += 2) {
    assert.ok(mask.track(x, z) >= 18, b.id);
    assert.ok(!mask.building(x, z, 2), b.id);
  }
});
test("yard props respect running tracks, moving switches and building footprints", () => {
  assert.ok(layout.cargo.length >= 25);
  for (const p of layout.cargo) {
    assert.ok(safeScenicPosition(mask, p.x, p.z, p.radius, layout.buildings));
    assert.equal(p.y, mask.height(p.x, p.z));
  }
});
test("vineyard follows existing hills without invading railway or roads", () => {
  assert.ok(layout.vineyard.length >= 30);
  for (const p of layout.vineyard) {
    assert.ok(safeScenicPosition(mask, p.x, p.z, 2, layout.buildings));
    assert.equal(p.y, mask.height(p.x, p.z));
    assert.ok(Math.abs(p.x - VINEYARD.x) <= VINEYARD.w / 2);
    assert.ok(Math.abs(p.z - VINEYARD.z) <= VINEYARD.d / 2);
  }
});
test("all four buffers coincide with real canonical terminals without invented extensions",()=>{
  assert.equal(layout.pendingStops.length,0);assert.equal(layout.stops.length,4);
  assert.deepEqual(layout.stops.map(s=>s.node).sort(),["A67","EB39","EB49","EB52"]);
  for(const stop of layout.stops){const node=network.metadata.nodes[stop.node];assert.equal(stop.x,node.x);assert.equal(stop.z,node.z);assert.equal(stop.beamOffset,0);}
});
test("passengers remain N-scale and on the reserved passenger platform", () => {
  for (const p of layout.people) {
    assert.ok(p.h >= 9 && p.h <= 11);
    assert.ok(p.x >= 615 && p.x <= 885);
    assert.ok(p.z >= 541 && p.z <= 559);
    assert.ok(mask.track(p.x, p.z) > 12);
  }
});
