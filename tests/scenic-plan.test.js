import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createNetwork, validateNetwork } from "../src/network.js";
import { createScenicPlan, insidePolygon, footprintTrackDistance } from "../src/scenic-plan.js";
import { clearance } from "../src/landscape.js";
const n=createNetwork(),plan=createScenicPlan(n);
test("phase 0 protects the exact railway and simulation baseline",()=>{
  const lock=JSON.parse(readFileSync(new URL("../docs/phase-0/network-lock.json",import.meta.url)));
  const sha=(b)=>createHash("sha256").update(b).digest("hex");
  assert.equal(sha(readFileSync(new URL("../src/network.js",import.meta.url))),lock.networkSource);
  assert.equal(sha(readFileSync(new URL("../src/simulation.js",import.meta.url))),lock.simulationSource);
  assert.equal(sha(JSON.stringify(n)),lock.graph);
  assert.deepEqual(validateNetwork(n),{edges:lock.edges,deadEnds:4});
});
test("five stable zones inventory the current scene and explicitly exclude tunnels",()=>{
  assert.deepEqual(plan.zones.map((z)=>z.id),["Z1","Z2","Z3","Z4","Z5"]);
  assert.equal(plan.tunnel,false);
  assert.equal(new Set(plan.catalog.map((o)=>o.id)).size,plan.catalog.length);
  assert.match(plan.catalog.find((o)=>o.id==="Z4.01").status,/excluded/);
  assert.deepEqual(plan.buildings.find((b)=>b.id==="farmhouse"),{id:"farmhouse",kind:"building",x:1020,z:430,w:76,d:46,h:34});
  assert.equal(insidePolygon(100,100,[[0,0],[200,0],[200,200],[0,200]]),true);
  assert.equal(insidePolygon(300,100,[[0,0],[200,0],[200,200],[0,200]]),false);
});
test("candidate prop centres respect tracks, buildings, switch landmarks and existing trees",()=>{
  const mask=clearance(n,plan.buildings);
  assert.ok(plan.freeCells.length>50);
  for(const p of plan.freeCells) {
    assert.ok(mask.track(p.x,p.z)>=24);
    assert.equal(mask.building(p.x,p.z,10),false);
    assert.equal(mask.road(p.x,p.z),false);
    assert.ok(plan.switches.every((s)=>Math.hypot(p.x-s.x,p.z-s.z)>=45));
    assert.ok(plan.trees.every((t)=>Math.hypot(p.x-t.x,p.z-t.z)>=t.h*.4+5));
  }
  assert.deepEqual(createScenicPlan(n),plan);
});
test("the audit reports existing conflicts, including a segment crossing a footprint",()=>{
  const network={edges:{line:{points:[{x:0,z:0},{x:100,z:0}]}}};
  assert.equal(footprintTrackDistance({x:50,z:0,w:20,d:10},network),0);
  assert.equal(footprintTrackDistance({x:50,z:20,w:20,d:10},network),15);
  assert.equal(footprintTrackDistance({x:120,z:0,w:10,d:10},network),15);
  assert.ok(plan.existingConflicts.some((b)=>b.id==="factory-west" && b.minTrackDistance===0));
});
