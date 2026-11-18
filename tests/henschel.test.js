import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {buildHenschel,HENSCHEL,HENSCHEL_WHEEL_FACES} from '../src/henschel.js';

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

test('actual GLB geometry separates six physical wheels and animates their rotation',()=>{
  const bytes=readFileSync(new URL('../assets/rolling-stock/henschel-dhg-500-c/model.glb',import.meta.url));
  assert.equal(bytes.toString('ascii',0,4),'glTF');
  const jsonLength=bytes.readUInt32LE(12);
  const gltf=JSON.parse(bytes.toString('utf8',20,20+jsonLength));
  assert.equal(gltf.asset.extras.license.startsWith('CC-BY-NC-SA-4.0'),true);
  assert.equal(gltf.meshes.length,1);
  assert.equal(gltf.accessors[0].count,5152);
  assert.equal(gltf.accessors[3].count,11130);
  assert.equal(HENSCHEL_WHEEL_FACES.length,6);
  assert.equal(new Set(HENSCHEL_WHEEL_FACES.flat()).size,144);
  const binary=20+jsonLength+8;
  function values(id,ctor){
    const a=gltf.accessors[id],v=gltf.bufferViews[a.bufferView];
    const channels=a.type==='SCALAR'?1:a.type==='VEC3'?3:2;
    const start=binary+(v.byteOffset??0)+(a.byteOffset??0),size=a.count*channels*ctor.BYTES_PER_ELEMENT;
    const copy=bytes.subarray(start,start+size);
    return new ctor(copy.buffer.slice(copy.byteOffset,copy.byteOffset+copy.length));
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(values(0,Float32Array),3));
  g.setIndex(new THREE.Uint32BufferAttribute(values(3,Uint32Array),1));
  const root=new THREE.Group(),a=new THREE.Group(),b=new THREE.Group();
  a.matrix.fromArray(gltf.nodes[0].matrix);a.matrixAutoUpdate=false;
  b.matrix.fromArray(gltf.nodes[1].matrix);b.matrixAutoUpdate=false;
  root.add(a);a.add(b);b.add(new THREE.Mesh(g,new THREE.MeshStandardMaterial()));
  const loco=buildHenschel(root,5);
  assert.equal(loco.stockRig.wheels.length,6);
  const before=loco.stockRig.wheels[0].node.rotation.x;
  loco.br01Pose(15);
  assert.ok(loco.stockRig.wheels.every(w=>Number.isFinite(w.node.rotation.x)));
  assert.notEqual(loco.stockRig.wheels[0].node.rotation.x,before);
  assert.equal(loco.stockRig.wheels[0].radius>3,true);
});
