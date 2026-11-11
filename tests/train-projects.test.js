import test from 'node:test';
import assert from 'node:assert/strict';
import {PROJECT_CATALOG,createTrainProjects,validateProject,realComposition,compareProject,railwayProjectCapabilities} from '../src/train-projects.js';
const store=()=>{let id=0;return createTrainProjects({newId:()=>`project-id-${++id}`});};
const real=()=>({id:0,name:'BR 055',modelKey:'steam',group:{uuid:'loco',userData:{}},carObjs:[{uuid:'wagon-1',userData:{stock:{kind:'tank'}}},{uuid:'wagon-2',userData:{stock:{kind:'tank'}}}],speed:0,velocity:0});
test('normalized catalog has the fourteen existing M1 identities, six locomotives and eight trailers',()=>{
  assert.equal(PROJECT_CATALOG.length,14);assert.equal(new Set(PROJECT_CATALOG.map(m=>m.id)).size,14);
  assert.equal(PROJECT_CATALOG.filter(m=>m.role==='locomotive').length,6);
  for(const m of PROJECT_CATALOG){assert.ok(m.length>0);assert.ok(m.asset.couplers.front.x>0);assert.ok(m.asset.couplers.back.x<0);}
});
test('project lifecycle is isolated, confirmation has no railway effect and cancellation restores saved version',()=>{
  const s=store();s.begin();assert.equal(s.dirty,true);assert.throws(()=>s.confirm());assert.throws(()=>s.add('native-tank'));
  s.add('native-steam');s.add('native-tank');const saved=s.confirm();assert.equal(s.draft,null);
  s.open(saved.id);assert.equal(s.dirty,false);s.rename('Changed');s.flip(saved.vehicles[0].id);s.cancel();
  assert.deepEqual(s.projects,[saved]);s.open(saved.id);s.rename('Edited');s.confirm();assert.equal(s.projects[0].name,'Edited');
  const exposed=s.projects;exposed[0].vehicles.length=0;assert.equal(s.projects[0].vehicles.length,2);
});
test('same-model instances retain separate identities through reorder, orientation and removal',()=>{
  const s=store();s.begin();s.add('native-shunter');s.add('kenney-box');s.add('kenney-box');const before=s.draft;
  assert.notEqual(before.vehicles[1].id,before.vehicles[2].id);s.move(before.vehicles[2].id,-1);s.flip(before.vehicles[1].id);
  assert.equal(s.draft.vehicles[1].id,before.vehicles[2].id);assert.equal(s.draft.vehicles[2].orientation,-1);s.remove(before.vehicles[2].id);assert.equal(s.draft.vehicles.length,2);
});
test('sixth trailer, second locomotive, invalid model, malformed orientation and invalid moves fail atomically',()=>{
  const s=store();s.begin();s.add('native-diesel');for(let i=0;i<5;i++)s.add('native-coach');const full=s.draft;
  for(const action of [()=>s.add('native-flat'),()=>s.add('native-steam'),()=>s.add('__proto__'),()=>s.move(full.vehicles[0].id,1),()=>s.move(full.vehicles[1].id,-1),()=>s.move('missing',1),()=>s.remove(full.vehicles[0].id),()=>s.flip('missing')]){assert.throws(action);assert.deepEqual(s.draft,full);}
  const bad=structuredClone(full);bad.vehicles[1].id=bad.vehicles[2].id;bad.vehicles[0].orientation=NaN;assert.ok(validateProject(bad).length>=2);
  s.rename('');assert.throws(()=>s.confirm());
});
test('copy preserves physical references as value snapshots and catches external changes and reset even with same locomotive',()=>{
  const s=store(),t=real(),before=structuredClone(t);s.copy(t,3);let p=s.draft;assert.deepEqual(t,before);
  assert.equal(compareProject(p,realComposition(t,3),3).status,'matching');s.move(p.vehicles[2].id,-1);p=s.draft;
  assert.equal(compareProject(p,realComposition(t,3),3).status,'different');assert.ok(compareProject(p,realComposition(t,3),3).differences.some(d=>d.includes('identity')));
  const old=p.source.vehicles.length;t.carObjs.pop();assert.equal(p.source.vehicles.length,old);assert.equal(compareProject(p,realComposition(t,3),3).status,'changed');
  assert.equal(compareProject(p,realComposition(t,4),4).status,'stale');assert.equal(compareProject(p,null,3).status,'stale');assert.deepEqual(t.group,before.group);
});
test('conservative capabilities never grant a whole-project or spatial coupling permission',()=>{
  const t=real();assert.match(railwayProjectCapabilities(t).uncouple,/supported/);assert.match(railwayProjectCapabilities(t).couple,/must verify/);
  t.velocity=1;assert.match(railwayProjectCapabilities(t).uncouple,/Stop/);t.velocity=0;t.speed=1;assert.match(railwayProjectCapabilities(t).couple,/Stop/);
  t.speed=0;t.carObjs=Array(5).fill(t.group);assert.match(railwayProjectCapabilities(t).couple,/Maximum/);assert.match(railwayProjectCapabilities(t).apply,/unsupported/);
});
test('draft lifecycle rejects implicit replacement and copy rejects unknown physical models without partial draft',()=>{
  const s=store();s.begin();assert.throws(()=>s.begin());assert.throws(()=>s.copy(real()));s.cancel();const t=real();delete t.carObjs[0].userData.stock;assert.throws(()=>s.copy(t));assert.equal(s.draft,null);
});
