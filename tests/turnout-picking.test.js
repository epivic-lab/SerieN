import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createNetwork,sample} from '../src/network.js';
import {createTurnoutModel} from '../src/turnout-routes.js';
import {createTurnoutPicking} from '../src/turnout-picking.js';

const n=createNetwork(),model=createTurnoutModel(n);
const ray=p=>new THREE.Raycaster(new THREE.Vector3(p.x,300,p.z),new THREE.Vector3(0,-1,0));
for(const control of n.controllers)test(`${control.id}: conformal hit geometry covers every real branch, independently of selected state`,()=>{
  const before=JSON.stringify(n),picker=createTurnoutPicking(model),scene=new THREE.Scene();
  assert.equal(picker.root.parent,null);assert.equal(picker.root.visible,false);assert.equal(picker.root.children.length,8);
  for(const id of control.internal)for(const fraction of [.1,.35,.65,.9]){
    const p=sample(n.edges[id],n.edges[id].length*fraction);
    assert.equal(picker.pick(ray(p),scene)?.id,control.id,`${id}/${fraction}`);
  }
  assert.equal(JSON.stringify(n),before);picker.dispose();
});
test('adjacent-device overlap resolves deterministically regardless of mesh order; plain track is not a turnout',()=>{
  const picker=createTurnoutPicking(model),scene=new THREE.Scene();
  for(const node of ['TO0:A','TO0:C']){
    const point=n.metadata.nodes[node],first=picker.pick(ray(point),scene);
    assert.ok(first?.kind==='turnout');
    for(let i=0;i<5;i++){
      const reversed=ray(point),original=reversed.intersectObjects.bind(reversed);
      reversed.intersectObjects=(objects,recursive,target)=>original([...objects].reverse(),recursive,target);
      assert.equal(picker.pick(reversed,scene)?.id,first.id);
    }
  }
  for(const id of ['T0','T12','T16'])assert.equal(picker.pick(ray(sample(n.edges[id],n.edges[id].length*.5)),scene),null);
  picker.dispose();
});
test('visible scenery and cars occlude the device, locomotives retain selection, invisible helpers do not occlude',()=>{
  const picker=createTurnoutPicking(model),scene=new THREE.Scene(),point=sample(n.edges['TO1:AB'],80);
  const parent=new THREE.Group(),blocker=new THREE.Mesh(new THREE.BoxGeometry(20,20,20),new THREE.MeshBasicMaterial());
  blocker.position.set(point.x,30,point.z);parent.add(blocker);scene.add(parent);
  assert.equal(picker.pick(ray(point),scene),null);
  parent.userData.trainId=0;assert.equal(picker.pick(ray(point),scene)?.kind,'train');
  delete parent.userData.trainId;
  parent.visible=false;assert.equal(picker.pick(ray(point),scene)?.id,'Y-R1');parent.visible=true;
  parent.userData.pickThrough=true;assert.equal(picker.pick(ray(point),scene)?.id,'Y-R1');delete parent.userData.pickThrough;
  blocker.material.visible=false;assert.equal(picker.pick(ray(point),scene)?.id,'Y-R1');blocker.material.visible=true;
  blocker.material.transparent=true;blocker.material.opacity=0;assert.equal(picker.pick(ray(point),scene)?.id,'Y-R1');
  blocker.geometry.dispose();blocker.material.dispose();picker.dispose();
});
test('picking disposal releases exactly eight geometries and one shared material once, and makes queries inert',()=>{
  const picker=createTurnoutPicking(model);let geometries=0,materials=0;
  picker.root.children.forEach(m=>m.geometry.addEventListener('dispose',()=>geometries++));
  picker.root.children[0].material.addEventListener('dispose',()=>materials++);
  picker.dispose();picker.dispose();assert.equal(geometries,8);assert.equal(materials,1);assert.equal(picker.root.children.length,0);
  assert.equal(picker.pick(ray(n.controllers[0]),new THREE.Scene()),null);
});
