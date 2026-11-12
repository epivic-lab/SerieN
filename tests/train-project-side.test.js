import test from 'node:test';
import assert from 'node:assert/strict';
import manifest from '../assets/rolling-stock-sides/manifest.json' with {type:'json'};
import {compositionSideLayout,projectSideLayout} from '../src/train-side-layout.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
const planned=(keys,flips=[])=>({id:'design',name:'Side project',vehicles:keys.map((modelId,i)=>({id:`planned-${i}`,modelId,orientation:flips.includes(i)?-1:1}))});
test('project preview matches M1.1 real geometry for the same models without touching source data',()=>{
  for(const keys of [['native-steam','native-tank','native-coach'],['kenney-diesel','kenney-lumber','kenney-box']]){
    const p=planned(keys),before=structuredClone(p),g=p.vehicles.map(v=>({uuid:v.id,userData:{couplers:structuredClone(manifest[v.modelId].couplers),stock:{kind:v.modelId.split('-')[1]},...(v.modelId.startsWith('kenney-')?{assetDimensions:{type:v.modelId.split('-')[1]}}:{})}}));
    const t={id:p.id,name:p.name,modelKey:keys[0].split('-')[1],group:g[0],carObjs:g.slice(1)};
    const a=projectSideLayout(p,manifest),b=compositionSideLayout(t,manifest);assert.deepEqual(a.vehicles,b.vehicles);near(a.length,b.length);assert.deepEqual(p,before);
  }
});
test('all model orientations preserve coupler continuity, scale, total length and asymmetric locomotive origin',()=>{
  const keys=['native-steam','native-coach','kenney-box','kenney-lumber','native-flat','native-tank'];
  for(let mask=0;mask<64;mask++){
    const p=planned(keys,keys.map((_,i)=>i).filter(i=>mask&(1<<i))),v=projectSideLayout(p,manifest),last=v.vehicles.at(-1);
    near(v.vehicles[0].frontAnchor,0);near(last.rearAnchor,v.length);
    for(let i=1;i<v.vehicles.length;i++)near(v.vehicles[i-1].rearAnchor,v.vehicles[i].frontAnchor);
    for(const item of v.vehicles){near(item.width/item.asset.width,1/8);near(item.x,item.origin+(item.orientation==='model-reversed'?item.asset.bounds.minX:-item.asset.bounds.maxX));}
    near(v.length,projectSideLayout(planned(keys),manifest).length);
  }
  const normal=projectSideLayout(planned(['native-steam']),manifest),reverse=projectSideLayout(planned(['native-steam'],[0]),manifest);assert.notEqual(normal.vehicles[0].origin,reverse.vehicles[0].origin);
});
test('empty project preview stays finite and invalid catalog or orientation fails explicitly',()=>{
  const empty=projectSideLayout(planned([]),manifest);assert.equal(empty.length,0);assert.ok(empty.viewBox.every(Number.isFinite));
  assert.throws(()=>projectSideLayout(planned(['unknown']),manifest));const bad=planned(['native-diesel']);bad.vehicles[0].orientation=0;assert.throws(()=>projectSideLayout(bad,manifest));
});
