import test from 'node:test';
import assert from 'node:assert/strict';
import {createNetwork} from '../src/network.js';
import {clearance,forestSites,HARDSTANDING} from '../src/landscape.js';
import {createScenicPlan,footprintTrackDistance} from '../src/scenic-plan.js';
import {buildZoneLayout,FARM,VINEYARD} from '../src/zone-layout.js';
const network=createNetwork(),plan=createScenicPlan(network),mask=clearance(network,plan.buildings);
mask.reserved=(x,z)=>[...HARDSTANDING,VINEYARD].some(p=>Math.abs(x-p.x)<=p.w/2&&Math.abs(z-p.z)<=p.d/2);

test('forest crown envelopes clear railway, landmarks, buildings and working surfaces',()=>{
  const trees=forestSites(mask);assert.ok(trees.length>80);
  for(const t of trees){
    assert.ok(mask.track(t.x,t.z)>=18+t.radius);
    assert.ok(plan.switches.every(c=>Math.hypot(t.x-c.x,t.z-c.z)>=40+t.radius));
    for(let i=0;i<32;i++){
      const x=t.x+Math.cos(i*Math.PI/16)*t.radius,z=t.z+Math.sin(i*Math.PI/16)*t.radius;
      assert.ok(x>=0&&x<=1500&&z>=0&&z<=700);
      assert.ok(mask.track(x,z)>=18);
      assert.ok(!mask.building(x,z));
    }
  }
});
test('hard surfaces are level across their footprint and stay outside the railway envelope',()=>{
  for(const p of HARDSTANDING){
    assert.ok(footprintTrackDistance(p,network)>=18,p.id);
    for(let x=p.x-p.w/2;x<=p.x+p.w/2;x+=4)for(let z=p.z-p.d/2;z<=p.z+p.d/2;z+=4)
      assert.equal(mask.height(x,z),.35,p.id);
  }
});
test('rear countryside and loading aisle integrate without moving railway or station',()=>{
  const before=JSON.stringify(network),layout=buildZoneLayout(network,mask);
  assert.ok(FARM.z+FARM.d/2<230&&VINEYARD.z+VINEYARD.d/2<230);
  assert.ok(footprintTrackDistance(FARM,network)>=18);
  assert.ok(layout.vineyard.length>=40);
  assert.ok(layout.cargo.length>=18);
  assert.ok(layout.cargo.every(p=>p.x<585||Math.abs(p.z-355)-p.radius>=8));
  assert.ok(!plan.existingConflicts.some(b=>b.id==='factory-north'));
  assert.equal(plan.tunnel,false);
  assert.equal(JSON.stringify(network),before);
});
