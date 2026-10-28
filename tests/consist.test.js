import test from "node:test";
import assert from "node:assert/strict";
import { couplingDistance, consistLayout } from "../src/consist.js";
import { trainCouplers } from "../src/asset-placement.js";
import { createNetwork } from "../src/network.js";
import { Journey, routing } from "../src/simulation.js";
const stock=(length)=>({assetDimensions:{length},couplers:trainCouplers({length,height:20,bottom:1.5})});
test("native pitch stays unchanged; imported pairs compact to their individual couplers",()=>{
  assert.deepEqual(consistLayout([{}, {}, {}]),{offsets:[0,64,128],tail:166});
  const vehicles=[stock(40),stock(27),stock(32),stock(25)], layout=consistLayout(vehicles);
  assert.deepEqual(layout.offsets,[0,35,66,96]);
  assert.equal(layout.tail,109.25);
  for(let i=1;i<vehicles.length;i++) {
    const a=vehicles[i-1],b=vehicles[i];
    assert.equal(-layout.offsets[i-1]+a.couplers.back.x, -layout.offsets[i]+b.couplers.front.x);
  }
});
test("partial loading and switching back use active metadata without a fixed imported pitch",()=>{
  const native={couplers:{front:{x:34},back:{x:-48}}};
  const imported=stock(28);
  assert.equal(couplingDistance(native,imported),62.75);
  assert.equal(couplingDistance(imported,native),48.75);
  assert.deepEqual(consistLayout([native,{},{}]).offsets,[0,64,128]);
  assert.ok(consistLayout([stock(40),imported,{}]).tail<166);
  assert.throws(()=>couplingDistance({assetDimensions:{},couplers:{back:{x:NaN}}},imported),/Invalid/);
});
test("compact consists stay on the route across crossovers and reverse to the same positions",()=>{
  const n=createNetwork(),route=routing(n,(id)=>id==="WX-A"),j=new Journey(n,"T18",100);
  const {offsets,tail}=consistLayout([stock(40),stock(27),stock(32),stock(25)]);
  assert.ok(j.ensure(j.position-tail,route));
  const initial=offsets.map((d)=>j.locate(j.position-d));
  let crossed=false;
  for(let step=0;step<800;step++) {
    assert.ok(j.move(1,tail,route));
    for(const d of offsets) {
      const p=j.locate(j.position-d);
      crossed ||= p.edge.startsWith("WX-A:");
      assert.ok(Number.isFinite(p.x+p.z));
    }
  }
  assert.ok(crossed);
  for(let step=0;step<800;step++)assert.ok(j.move(-1,tail,route));
  offsets.forEach((d,i)=>assert.deepEqual(j.locate(j.position-d),initial[i]));
});
test("detach and immediate recouple preserve the compact wagon position",()=>{
  const n=createNetwork(),j=new Journey(n,"T0",100),route=routing(n,()=>false);
  const vehicles=[stock(40),stock(27),stock(32)],before=consistLayout(vehicles);
  assert.ok(j.ensure(j.position-before.tail,route));
  const detached=j.locate(j.position-before.offsets.at(-1)),last=vehicles.pop();
  const shorter=consistLayout(vehicles);assert.ok(shorter.tail<before.tail);
  const recoupled=consistLayout([...vehicles,last]);
  assert.deepEqual(j.locate(j.position-recoupled.offsets.at(-1)),detached);
});
test("compact maximum-sized Kenney bodies remain separate on the R249 curve",()=>{
  const radius=249,a=stock(58),b=stock(50),spacing=couplingDistance(a,b);
  const angle=spacing/radius, half=angle/2;
  // Separating axis along the chord between centres, with tangent-aligned
  // rectangular loading envelopes (15mm locomotive / 13mm wagon).
  const separation=2*radius*Math.sin(half);
  const projectedBodies=(58/2+50/2)*Math.cos(half)+(15/2+13/2)*Math.sin(half);
  assert.ok(separation>projectedBodies, {separation,projectedBodies});
});
