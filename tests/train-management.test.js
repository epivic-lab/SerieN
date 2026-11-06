import test from 'node:test';
import assert from 'node:assert/strict';
import {compositionView,detachedView} from '../src/train-management-state.js';
import {consistLayout} from '../src/consist.js';
const vehicle=(id,stock,length=62.5)=>({uuid:id,userData:{stock:{kind:stock,length,width:18},couplers:{front:{x:length/2+1.6},back:{x:-length/2-1.6}}}});
test('management projects identities and railway length without mutating or reordering a reversed consist',()=>{
  const group=vehicle('loco','steam',114.3),carObjs=[vehicle('first','closed'),vehicle('last','tank')];
  const train={id:8,name:'Test',desc:'Study',dir:-1,group,carObjs};
  const before=structuredClone(train),view=compositionView(train);
  assert.deepEqual(view.vehicles.map(v=>v.id),['loco','first','last']);
  assert.equal(view.reverse,true);
  assert.equal(view.length,consistLayout([group,...carObjs].map(g=>g.userData)).tail+group.userData.couplers.front.x);
  view.vehicles[0].name='Changed view';assert.deepEqual(train,before);
});
test('management follows actual imported dimensions and detached identity',()=>{
  const group=vehicle('parked','tank');group.userData.assetDimensions={length:49,width:13};
  const parked={group,point:{edge:'T47',x:42,z:5}};
  const view=detachedView(parked);
  assert.equal(view.id,'parked');assert.equal(view.edge,'T47');assert.equal(view.length,49);assert.equal(view.imported,true);
  delete group.userData.assetDimensions;assert.equal(detachedView(parked).length,62.5);
});
