import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

// Prototype: 9,900 × 3,040 × 4,270 mm. SerieN coordinates use millimetres at 1:160.
export const HENSCHEL = Object.freeze({
  modelKey:'henschel-dhg-500-c',
  length:61.875,
  width:19,
  height:26.6875,
  source:'accessviolation · CC BY-NC-SA 4.0'
});
let sourcePromise=null;
export function loadHenschel(){
  sourcePromise ??= new GLTFLoader().loadAsync('./assets/rolling-stock/henschel-dhg-500-c/model.glb')
    .then(gltf=>gltf.scene).catch(error=>{sourcePromise=null;throw error;});
  return sourcePromise;
}
export function buildHenschel(source,id){
  if(!source?.isObject3D)throw new TypeError('Henschel source is not a Three.js model');
  const root=new THREE.Group(),model=source.clone(true),bounds=new THREE.Box3().setFromObject(model);
  if(bounds.isEmpty())throw new RangeError('Henschel model is empty');
  const size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
  if(Math.min(size.x,size.y,size.z)<=0)throw new RangeError('Henschel model bounds are invalid');
  const normalization=new THREE.Group();
  model.position.sub(center);
  model.position.y+=size.y/2;
  normalization.scale.set(HENSCHEL.length/size.x,HENSCHEL.height/size.y,HENSCHEL.width/size.z);
  normalization.add(model);
  model.traverse(object=>{if(object.isMesh){object.castShadow=true;object.receiveShadow=true;}});
  root.add(normalization);
  root.userData.dynamic=true;
  root.userData.trainId=id;
  root.userData.stock={id:HENSCHEL.modelKey,kind:HENSCHEL.modelKey,name:'Henschel DHG 500 C',length:HENSCHEL.length,width:HENSCHEL.width,height:HENSCHEL.height};
  // Couplers extend 1 mm beyond the buffers; the body is centred at X=0.
  root.userData.couplers={front:{x:HENSCHEL.length/2+1,y:8,z:0},back:{x:-HENSCHEL.length/2-1,y:8,z:0}};
  const headMaterial=new THREE.MeshStandardMaterial({color:0xfff6dc,emissive:0xffd48b,emissiveIntensity:0});
  const lamp=new THREE.Mesh(new THREE.SphereGeometry(.9,10,8),headMaterial);
  lamp.position.set(HENSCHEL.length/2-.55,17,0);
  lamp.userData.imported=false;
  root.add(lamp);
  const beam=new THREE.SpotLight(0xffe7b7,1.6,240,.4,.55);
  beam.position.set(HENSCHEL.length/2,18,0);
  beam.target.position.set(HENSCHEL.length/2+120,13,0);
  beam.visible=false;
  root.add(beam,beam.target);
  root.userData.headMaterial=headMaterial;
  root.userData.beam=beam;
  // This Sketchfab source has a single baked mesh; it has no independent wheel nodes.
  // Position and orientation are animated by the existing Journey renderer.
  root.br01Pose=()=>{};
  return root;
}
