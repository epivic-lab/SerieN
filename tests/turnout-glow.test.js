import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createNetwork,sample} from '../src/network.js';
import {createTurnoutModel,TURNOUT_IDS} from '../src/turnout-routes.js';
import {createTurnoutGlow,turnoutGlowGeometry,GLOW_CONFIG,GLOW_STYLES} from '../src/turnout-glow.js';

const network=createNetwork(),model=createTurnoutModel(network);
for(const id of TURNOUT_IDS)test(`${id}: overlay references every canonical device path without mutating graph or materials`,()=>{
  const before=JSON.stringify(network),paths=model.read(id,false).paths,g=turnoutGlowGeometry(paths);
  assert.ok(g.attributes.position.count>0);assert.equal(g.attributes.role.count,g.attributes.position.count);
  assert.ok([...g.attributes.position.array,...g.attributes.uv.array,...g.attributes.endFade.array].every(Number.isFinite));
  assert.ok([...g.attributes.role.array].includes(0));assert.ok([...g.attributes.role.array].includes(1));
  assert.ok([...g.attributes.endFade.array].every(n=>n>=0&&n<=1));
  const ys=[...g.attributes.position.array].filter((_,i)=>i%3===1);
  assert.ok(ys.every(y=>Math.abs(y-GLOW_CONFIG.bedHeight)<1e-5||Math.abs(y-GLOW_CONFIG.railHeight)<1e-5));
  const centres=[],positions=g.attributes.position.array;
  for(let i=0;i<g.attributes.role.count;i+=6)if(g.attributes.role.array[i]===1)centres.push({x:(positions[i*3]+positions[(i+1)*3])/2,z:(positions[i*3+2]+positions[(i+1)*3+2])/2});
  for(const p of paths){
    const edge=network.edges[p.edge];assert.deepEqual(p.points,edge.points);
    // Rail accents must exist along each real path, in both lateral offsets.
    for(const point of [p.points[0],p.points.at(-1)])assert.ok([...g.attributes.position.array].some((v,i,a)=>i%3===0&&Math.hypot(v-point.x,a[i+2]-point.z)<12));
    for(const fraction of [.25,.75])for(const side of [-1,1]){
      const s=edge.length*fraction,a=sample(edge,s-.3),b=sample(edge,s+.3),point=sample(edge,s),length=Math.hypot(b.x-a.x,b.z-a.z);
      const expected={x:point.x-(b.z-a.z)/length*side*4.95,z:point.z+(b.x-a.x)/length*side*4.95};
      assert.ok(centres.some(c=>Math.hypot(c.x-expected.x,c.z-expected.z)<1.7),`${p.edge}: actual rail shoulder missing`);
    }
  }
  assert.equal(JSON.stringify(network),before);g.dispose();
});
test('smooth 160 ms entry/exit and 1400 ms periodic pulse stay bounded; a different device never cross-fades',()=>{
  const scene=new THREE.Scene(),g=createTurnoutGlow(scene,model,{now:()=>0});
  g.identify('Y-IN',0);g.update(0);assert.equal(g.snapshot.opacity,0);
  g.update(80);assert.equal(g.snapshot.opacity,.5);g.update(160);assert.equal(g.snapshot.opacity,1);
  g.update(700);assert.ok(Math.abs(g.snapshot.gain-1)<1e-8);g.update(1400);assert.ok(Math.abs(g.snapshot.gain-GLOW_STYLES.A.pulseMin)<1e-8);
  g.identify('WX-B',1400);g.update(1480);assert.deepEqual(g.snapshot.visibleDevices,['WX-B']);
  g.identify(null,1480);g.update(1560);assert.equal(g.snapshot.opacity,.25);g.update(1640);assert.equal(g.snapshot.visible,false);
  g.dispose();
});
test('re-entry into the same fading device preserves opacity; reduced-motion stays static after fade',()=>{
  const g=createTurnoutGlow(new THREE.Scene(),model,{now:()=>0});g.identify('WX-A',0);g.update(200);
  g.identify(null,200);g.update(280);const before=g.snapshot.opacity;
  g.identify('WX-A',280);g.update(280);assert.equal(g.snapshot.opacity,before);
  g.setReducedMotion(true);g.update(440);const stable=g.snapshot.gain;
  for(const t of [600,1000,2000,10000]){g.update(t);assert.equal(g.snapshot.gain,stable);}
  assert.equal(stable,.82);g.dispose();
});
test('A/B share all geometry and one material; no lights, shadows, depth bypass, or picking interception',()=>{
  const scene=new THREE.Scene(),g=createTurnoutGlow(scene,model),meshes=[...g.root.children],geometries=meshes.map(m=>m.geometry),mat=meshes[0].material;
  assert.equal(g.root.userData.pickThrough,true);assert.equal(g.root.userData.dynamic,true);
  assert.equal(new Set(meshes.map(m=>m.material)).size,1);assert.equal(mat.depthTest,true);assert.equal(mat.depthWrite,false);
  assert.ok(meshes.every(m=>!m.castShadow&&!m.isLight));
  for(let i=0;i<100;i++){
    g.setVariant(i%2?'A':'B');g.identify(TURNOUT_IDS[i%8],i*200);g.update(i*200+160);
    assert.equal(g.snapshot.visibleDevices.length,1);assert.deepEqual(meshes.map(m=>m.geometry),geometries);assert.equal(meshes[0].material,mat);
  }
  const ray=new THREE.Raycaster(new THREE.Vector3(900,400,101),new THREE.Vector3(0,-1,0));
  assert.deepEqual(ray.intersectObject(g.root,true),[]);g.dispose();
});
test('numeric inputs, IDs, variant and preferences reject invalid values; invalid construction leaves the scene untouched',()=>{
  const scene=new THREE.Scene();
  for(const variant of ['C','__proto__',NaN,{},null])assert.throws(()=>createTurnoutGlow(scene,model,{variant}),RangeError);
  assert.equal(scene.children.length,0);
  assert.throws(()=>createTurnoutGlow(scene,model,{reducedMotion:1}),TypeError);
  const g=createTurnoutGlow(scene,model,{now:()=>0});
  for(const t of [NaN,Infinity,-1,'700']){assert.throws(()=>g.update(t),RangeError);assert.throws(()=>g.identify('WX-A',t),RangeError);}
  for(const id of [NaN,0,'UNKNOWN','__proto__',{}])assert.throws(()=>g.identify(id,0),RangeError);
  for(const variant of ['C',NaN,{}])assert.throws(()=>g.setVariant(variant),RangeError);
  assert.throws(()=>g.setReducedMotion('false'),TypeError);
  assert.throws(()=>turnoutGlowGeometry([{points:[{x:NaN,z:0},{x:1,z:1}]}]),RangeError);
  assert.throws(()=>turnoutGlowGeometry([{points:[{x:0,z:0},{x:0,z:0}]}]),RangeError);
  assert.equal(g.snapshot.active,null);g.dispose();
});
test('every CPU geometry and the single GPU material are disposed exactly once; update after disposal is inert',()=>{
  const scene=new THREE.Scene(),g=createTurnoutGlow(scene,model,{now:()=>0});let geos=0,mats=0;
  g.root.children.forEach(m=>m.geometry.addEventListener('dispose',()=>geos++));
  g.root.children[0].material.addEventListener('dispose',()=>mats++);
  g.identify('Y-4',0);g.update(300);g.dispose();g.dispose();g.update(400);g.identify('Y-2',500);
  assert.equal(geos,8);assert.equal(mats,1);assert.equal(scene.children.length,0);assert.equal(g.snapshot.visible,false);assert.deepEqual(g.snapshot.visibleDevices,[]);
});
