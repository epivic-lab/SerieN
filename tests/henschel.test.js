import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildHenschel,HENSCHEL} from '../src/henschel.js';

test('Henschel model normalizes a source to N scale and preserves traction metadata',()=>{
  const original=new THREE.Group();
  original.add(new THREE.Mesh(new THREE.BoxGeometry(981.2376709,428.8959045,324.31073),new THREE.MeshStandardMaterial()));
  const model=buildHenschel(original,7);
  const dimensions=new THREE.Box3().setFromObject(model.children[0]).getSize(new THREE.Vector3());
  assert.ok(Math.abs(dimensions.x-HENSCHEL.length)<.001);
  assert.ok(Math.abs(dimensions.y-HENSCHEL.height)<.001);
  assert.ok(Math.abs(dimensions.z-HENSCHEL.width)<.001);
  assert.equal(model.userData.stock.kind,'henschel-dhg-500-c');
  assert.equal(model.userData.trainId,7);
  assert.equal(model.userData.couplers.front.x,31.9375);
  assert.equal(model.userData.couplers.back.x,-31.9375);
  assert.equal(typeof model.br01Pose,'function');
  assert.equal(model.userData.beam.visible,false);
  assert.equal(model.userData.dynamic,true);
});
test('Henschel refuses empty and invalid sources',()=>{
  assert.throws(()=>buildHenschel(null,0),TypeError);
  assert.throws(()=>buildHenschel(new THREE.Group(),0),RangeError);
});
