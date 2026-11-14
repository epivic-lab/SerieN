import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createStaticRaycast} from '../src/static-raycast.js';

function fixture() {
  const scene=new THREE.Scene(),root=new THREE.Group();root.position.set(4,2,-3);root.rotation.y=.2;root.scale.setScalar(2);scene.add(root);
  const geometry=new THREE.BoxGeometry(1,2,1),material=new THREE.MeshBasicMaterial();
  const instances=new THREE.InstancedMesh(geometry,material,120),dummy=new THREE.Object3D();
  for(let i=0;i<120;i++){dummy.position.set(i%12*3,0,Math.floor(i/12)*3);dummy.updateMatrix();instances.setMatrixAt(i,dummy.matrix);}
  root.add(instances);scene.updateMatrixWorld(true);return {scene,root,instances};
}
const signature=hits=>hits.map(h=>[h.object.uuid,h.instanceId??null,Math.round(h.distance*1e6)]).sort();
test('static instance BVH returns exactly the normal triangle intersections under transformed roots',()=>{
  const {scene,root,instances}=fixture(),index=createStaticRaycast([root]);
  for(let i=0;i<120;i+=7){const point=new THREE.Vector3(i%12*3,0,Math.floor(i/12)*3).applyMatrix4(root.matrixWorld),ray=new THREE.Raycaster(point.clone().add(new THREE.Vector3(0,100,0)),new THREE.Vector3(0,-1,0)),actual=[];
    index.cast(ray,scene,Infinity,actual);assert.deepEqual(signature(actual),signature(ray.intersectObject(scene,true)));}
  assert.equal(index.objectCount,1);index.dispose();
});
test('density prefixes, hidden parent and pick-through retain normal visibility semantics',()=>{
  const {scene,root,instances}=fixture(),index=createStaticRaycast([root]);instances.count=1;
  const point=new THREE.Vector3(3,0,0).applyMatrix4(root.matrixWorld),ray=new THREE.Raycaster(point.clone().add(new THREE.Vector3(0,100,0)),new THREE.Vector3(0,-1,0)),hits=[];
  index.cast(ray,scene,Infinity,hits);assert.equal(hits.length,0);
  instances.count=120;root.visible=false;index.cast(ray,scene,Infinity,hits);assert.equal(hits.length,0);
  root.visible=true;root.userData.pickThrough=true;index.cast(ray,scene,Infinity,hits);assert.equal(hits.length,0);index.dispose();
});
test('moving trains use current transforms; device distance bounds occlusion; raycaster far is restored',()=>{
  const {scene,root}=fixture(),index=createStaticRaycast([root]);
  const train=new THREE.Mesh(new THREE.BoxGeometry(2,2,2),new THREE.MeshBasicMaterial());train.position.set(4,10,-3);scene.add(train);scene.updateMatrixWorld(true);
  const ray=new THREE.Raycaster(new THREE.Vector3(4,20,-3),new THREE.Vector3(0,-1,0),0,100),hits=[];
  index.cast(ray,scene,8,hits);assert.equal(hits.length,0);assert.equal(ray.far,100);
  index.cast(ray,scene,12,hits);assert.ok(hits.some(h=>h.object===train));
  train.position.x=300;scene.updateMatrixWorld(true);hits.length=0;index.cast(ray,scene,12,hits);assert.equal(hits.length,0);
  index.dispose();index.cast(ray,scene,100,hits);assert.equal(hits.length,0);
});
