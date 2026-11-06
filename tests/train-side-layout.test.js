import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import manifest from '../assets/rolling-stock-sides/manifest.json' with {type:'json'};
import {compositionSideLayout} from '../src/train-side-layout.js';
import {consistLayout} from '../src/consist.js';

function vehicle(key,id=key){const asset=manifest[key],imported=key.startsWith('kenney-'),kind=key.slice(key.indexOf('-')+1);return {uuid:id,userData:{couplers:structuredClone(asset.couplers),...(imported?{assetDimensions:{type:kind}}:kind==='diesel'?{}:{stock:{kind}})},rotation:{y:.5}};}
function train(keys){return {id:3,name:'Side test',modelKey:keys[0].split('-')[1],dir:1,group:vehicle(keys[0]),carObjs:keys.slice(1).map((k,i)=>vehicle(k,k+i))};}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
test('side images share a physical scale and preserve original asymmetrical origins',()=>{
  assert.equal(Object.keys(manifest).length,14);
  for(const [key,asset] of Object.entries(manifest)){
    near(asset.width/(asset.bounds.maxX-asset.bounds.minX),8);
    near(asset.height/(asset.bounds.maxY-asset.bounds.minY),8);
    const png=readFileSync(new URL('../assets/rolling-stock-sides/'+key+'.png',import.meta.url));
    assert.equal(png.readUInt32BE(16),asset.width);assert.equal(png.readUInt32BE(20),asset.height);
    assert.equal(png[25],6,'RGBA PNG with transparency');
  }
  assert.notEqual(manifest['native-steam'].bounds.minX,-manifest['native-steam'].bounds.maxX);
});
test('native, imported and mixed compositions meet at real couplers with common image scaling',()=>{
  for(const keys of [
    ['native-steam','native-closed','native-open','native-tank'],
    ['native-diesel','native-flat','native-coach'],
    ['kenney-steam','kenney-box','kenney-lumber','kenney-tank'],
    ['native-shunter','kenney-box','native-coach','kenney-tank']
  ]){
    const t=train(keys),before=structuredClone(t),side=compositionSideLayout(t,manifest);
    const actual=consistLayout([t.group,...t.carObjs].map(g=>g.userData));
    assert.deepEqual(side.vehicles.map(v=>v.offset),actual.offsets);
    near(side.length,actual.tail+t.group.userData.couplers.front.x);
    near(side.vehicles[0].frontAnchor,0);near(side.vehicles.at(-1).rearAnchor,side.length);
    for(let i=1;i<side.vehicles.length;i++)near(side.vehicles[i-1].rearAnchor,side.vehicles[i].frontAnchor);
    for(const v of side.vehicles){near(v.width/v.asset.width,1/8);near(v.height/v.asset.height,1/8);near(v.x+v.asset.bounds.maxX,v.origin);near(v.y+v.asset.bounds.maxY,side.vehicles[0].y+side.vehicles[0].asset.bounds.maxY);}
    assert.deepEqual(t,before,'projection cannot mutate the simulator');
  }
});
test('travel reversal and world yaw never reorder or flip the straightened side view',()=>{
  const t=train(['native-steam','native-closed','native-open','native-tank']),before=compositionSideLayout(t,manifest);
  t.dir=-1;for(const g of [t.group,...t.carObjs])g.rotation.y+=Math.PI;
  assert.deepEqual(compositionSideLayout(t,manifest),before);
  assert.ok(before.vehicles.every(v=>v.orientation==='model-forward'));
});
test('detach, recouple and long consists derive fresh positions from the same identities',()=>{
  const t=train(['native-steam',...Array(20).fill('native-coach')]),full=compositionSideLayout(t,manifest),last=t.carObjs.pop();
  const shorter=compositionSideLayout(t,manifest);assert.equal(shorter.vehicles.length,20);assert.ok(shorter.length<full.length);
  t.carObjs.push(last);assert.deepEqual(compositionSideLayout(t,manifest),full);
  assert.ok(full.viewBox[0]<=0&&full.viewBox[0]+full.viewBox[2]>=full.length);
});
test('unavailable side assets stay explicit without guessing a different model or orientation',()=>{
  const t=train(['native-shunter','native-flat']);delete t.carObjs[0].userData.stock;
  const side=compositionSideLayout(t,manifest);
  assert.equal(side.vehicles[1].asset,undefined);assert.equal(side.vehicles[1].x,null);
  assert.equal(side.vehicles[1].id,t.carObjs[0].uuid);
});
