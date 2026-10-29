import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {animateAuxiliaryWheels} from '../src/rolling-stock-animation.js';
// Frozen 5C auxiliary animation, before hierarchy binding reuse.
function reference(root,distance){root.traverse(o=>{if(o.userData.wheel)o.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1),-distance/4.2).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI/2));if(o.userData.importedWheel)o.rotation.x=-distance/o.userData.wheelRadius;});}
const wheel=(imported=false)=>{const o=new THREE.Object3D();o.userData=imported?{importedWheel:true,wheelRadius:3.7}:{wheel:true};return o;};
test('bound auxiliary wheels match 5C signed rotations through loading, release and same-size child replacement',()=>{
 const a=new THREE.Group();a.add(wheel(),wheel());
 for(const stage of ['native','load','replace','release']){
  if(stage==='load'){const imported=new THREE.Group();imported.add(wheel(true));a.add(imported);}
  if(stage==='replace'){a.remove(a.children.at(-1));const imported=new THREE.Group();imported.add(wheel(true),wheel(true));a.add(imported);}
  if(stage==='release')a.remove(a.children.at(-1));
  const b=a.clone(true);
  for(const distance of [0,1,-1,100,5678,-8910]){
   animateAuxiliaryWheels(a,distance);reference(b,distance);
   const read=root=>{const out=[];root.traverse(o=>out.push({q:o.quaternion.toArray().map(v=>v===0?0:v),r:o.rotation.toArray().map(v=>v===0?0:v)}));return out;};
   assert.deepEqual(read(a),read(b),stage+' '+distance);
  }
 }
});
