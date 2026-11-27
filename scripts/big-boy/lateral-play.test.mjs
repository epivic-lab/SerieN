import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createValveGear} from './valve-gear-view.mjs';
const read=p=>JSON.parse(readFileSync(p,'utf8')),base='docs/_active/rolling-stock/evidence/';
test('rendered coupling eyes retain axial engagement at both lateral travel limits',()=>{
 const rig=read(base+'L02-D/prototype/rig.json'),gear=createValveGear(rig,read(base+'L02-F/quartering-rig.json'));
 const pose=read(base+'L02-D/sweep.json').straight;
 for(const slide of [-.45,0,.45])for(let phase=0;phase<360;phase+=15){
  gear.update({frames:pose.framePoses,slides:Object.fromEntries(Object.keys(rig.axles).map(n=>[n,slide])),odometer:phase*Math.PI/180*rig.axles.engine_rear_axle_01.heightMm});
  const meshes=gear.exportMeshes(),records=gear.diagnostics().primitives;
  for(let i=0;i<meshes.eye.labels.length;i++){
   const label=meshes.eye.labels[i];if(!label.id.includes('/coupling'))continue;
   const m=meshes.eye.matrices.slice(i*16,i*16+16),center=[m[12],m[13],m[14]],axis=[m[8],m[9],m[10]],len=Math.hypot(...axis),unit=axis.map(x=>x/len);
   const pins=records.filter(r=>r.id.includes('/crankpin')&&r.jointIds.some(j=>label.joints.includes(j)));
   const pin=pins.reduce((a,b)=>Math.hypot(...a.a.map((x,k)=>x-center[k]))<Math.hypot(...b.a.map((x,k)=>x-center[k]))?a:b);
   const bounds=[pin.a,pin.b].map(p=>p.reduce((s,x,k)=>s+(x-center[k])*unit[k],0)).sort((a,b)=>a-b);
   const half=.25*len;
   assert.ok(Math.min(half,bounds[1])-Math.max(-half,bounds[0])>.08,'positive axial overlap');
  }
 }
});
