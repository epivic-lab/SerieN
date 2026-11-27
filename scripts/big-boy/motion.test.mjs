import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createScenarioProfile} from '../../src/scenario-profile.js';
import {MotionLab,couplingOffset} from './motion.mjs';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url)));
const rig=read('../../docs/_active/rolling-stock/evidence/L02-D/prototype/rig.json');
const dataset=read('../../assets/scenario-v06/dataset.json');
for(const id of ['legacy','v06'])test(`${id}: signed motion, stop, reversal, route coverage and rejected commands`,()=>{
 const profile=createScenarioProfile(id,dataset),lab=new MotionLab(profile,rig,profile.network.mainLoops[0].segments[0].id);
 const initial=lab.snapshot();
 for(const speed of [NaN,Infinity,81,'20'])assert.throws(()=>lab.command(speed));
 for(const dt of [NaN,-1,.3])assert.throws(()=>lab.step(dt));
 lab.command(30);
 for(let i=0;i<600;i++){
  assert.equal(lab.step(1/60),true);const s=lab.snapshot();
  assert.ok(s.drawbar.margin>0);assert.equal(Object.keys(s.slides).length,19);
  assert.ok(Math.abs(s.occupation.reduce((n,e)=>n+e.hi-e.lo,0)-260)<1e-6);
  for(const p of Object.values(s.frames))assert.ok([p.x,p.z,p.cos,p.sin].every(Number.isFinite));
 }
 lab.command(0);const stopped=lab.snapshot();for(let i=0;i<30;i++)lab.step(1/60);assert.deepEqual(lab.snapshot(),stopped);
 lab.command(-30);for(let i=0;i<600;i++)assert.equal(lab.step(1/60),true);
 assert.ok(Math.abs(lab.snapshot().station-initial.station)<1e-8);assert.equal(lab.odometer,0);
 // A real terminal rejects motion of the full footprint before committing position or odometer.
 lab.choose=()=>null;lab.command(80);let rejected=false;
 for(let i=0;i<10000;i++){const before=lab.snapshot();if(!lab.step(.1)){assert.equal(lab.odometer,before.odometer);assert.equal(lab.journey.position,before.station);assert.equal(lab.speed,0);rejected=true;break;}}
 assert.equal(rejected,true);
});
test('coupling rods follow a full crank circle, reverse exactly and reject non-finite values',()=>{
 const u=1.9,h=1.78,r=Math.hypot(u,h);
 for(let i=0;i<=360;i++){const d=couplingOffset(i*Math.PI/180,u,h);assert.ok(Math.abs(Math.hypot(u+d.along,h+d.height)-r)<1e-12);}
 assert.deepEqual(couplingOffset(0,u,h),{along:0,height:0});assert.throws(()=>couplingOffset(NaN,u,h));
});
