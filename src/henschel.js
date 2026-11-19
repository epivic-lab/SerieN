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
const faceRange=(start,end)=>Array.from({length:end-start+1},(_,i)=>start+i);
// Face groups verified against the original 272,032-byte Sketchfab GLB.
// Each group is one wheel with independent geometry, despite the source containing one baked mesh.
export const HENSCHEL_WHEEL_FACES=Object.freeze(Array.from({length:6},(_,i)=>{
  const low=884+14*i,high=2782+30*i;
  return Object.freeze([...faceRange(low,low+9),...faceRange(low+11,low+12),
    ...faceRange(high,high+9),...faceRange(high+19,high+20)]);
}));
function segmentWheelGeometry(model,radius){
  let original=null;
  model.traverse(node=>{
    if(node.isMesh&&node.geometry.index?.count===11130&&node.geometry.attributes.position?.count===5152)original=node;
  });
  if(!original)return [];
  const geometry=original.geometry,index=geometry.index,positions=geometry.attributes.position;
  const wheels=[],faceSet=new Set(HENSCHEL_WHEEL_FACES.flat());
  const makeGeometry=(faces)=>{
    const result=new THREE.BufferGeometry();
    result.userData.henschelOwned=true;
    for(const [name,attribute] of Object.entries(geometry.attributes))result.setAttribute(name,attribute);
    const indices=[];
    for(const face of faces)for(let i=0;i<3;i++)indices.push(index.getX(face*3+i));
    result.setIndex(indices);
    return result;
  };
  const wheelParts=HENSCHEL_WHEEL_FACES.map(faces=>{
    const bounds=new THREE.Box3(),point=new THREE.Vector3();
    for(const face of faces)for(let i=0;i<3;i++){
      const vertex=index.getX(face*3+i);
      bounds.expandByPoint(point.fromBufferAttribute(positions,vertex));
    }
    return {faces,bounds};
  });
  // Fail safe if the original GLB is ever replaced with a different topology.
  if(wheelParts.some(part=>{
    const d=part.bounds.getSize(new THREE.Vector3());
    return Math.abs(d.y-100)>.5||Math.abs(d.z-100)>.5||d.x<12||d.x>20;
  }))return [];
  const bodyFaces=[];
  for(let face=0;face<index.count/3;face++)if(!faceSet.has(face))bodyFaces.push(face);
  original.geometry=makeGeometry(bodyFaces);
  for(const {faces,bounds} of wheelParts){
    const pivot=bounds.getCenter(new THREE.Vector3());
    const wheelGeometry=makeGeometry(faces);
    // Position attributes are shared; wheel-specific bounds avoid oversized culling and hulls.
    wheelGeometry.boundingBox=bounds.clone();
    wheelGeometry.boundingSphere=bounds.getBoundingSphere(new THREE.Sphere());
    const node=new THREE.Group(),wheel=new THREE.Mesh(wheelGeometry,original.material);
    wheel.position.copy(pivot).multiplyScalar(-1);
    wheel.castShadow=wheel.receiveShadow=true;
    node.position.copy(pivot);
    node.add(wheel);
    original.parent.add(node);
    wheels.push({node,radius,axis:'x'});
  }
  return wheels;
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
  const wheels=segmentWheelGeometry(model,50*HENSCHEL.height/size.y);
  model.traverse(object=>{if(object.isMesh){object.castShadow=true;object.receiveShadow=true;}});
  root.add(normalization);
  root.userData.dynamic=true;
  root.userData.trainId=id;
  root.userData.stock={id:HENSCHEL.modelKey,kind:HENSCHEL.modelKey,name:'Henschel DHG 500 C',length:HENSCHEL.length,width:HENSCHEL.width,height:HENSCHEL.height};
  // Couplers extend 1 mm beyond the buffers; the body is centred at X=0.
  root.userData.couplers={front:{x:HENSCHEL.length/2+1,y:8,z:0},back:{x:-HENSCHEL.length/2-1,y:8,z:0}};
  const headMaterial=new THREE.MeshStandardMaterial({color:0xfff6dc,emissive:0xffd48b,emissiveIntensity:0});
  const lamp=new THREE.Mesh(new THREE.CircleGeometry(.65,16),headMaterial);
  // Locate the real hood surface, not the over-buffer envelope. A lamp placed
  // at length/2 floats beyond the body because the buffers define that extent.
  root.updateMatrixWorld(true);
  const hit=new THREE.Raycaster(new THREE.Vector3(HENSCHEL.length,17,0),new THREE.Vector3(-1,0,0))
    .intersectObject(normalization,true)[0];
  lamp.rotation.y=Math.PI/2;
  lamp.position.set((hit?.point.x??HENSCHEL.length/2-7)+.03,17,0);
  lamp.userData.imported=false;
  lamp.geometry.userData.henschelOwned=true;
  root.add(lamp);
  const beam=new THREE.SpotLight(0xffe7b7,1.6,240,.4,.55);
  beam.position.copy(lamp.position).add(new THREE.Vector3(.1,0,0));
  beam.target.position.copy(lamp.position).add(new THREE.Vector3(120,-4,0));
  beam.visible=false;
  root.add(beam,beam.target);
  root.userData.headMaterial=headMaterial;
  root.userData.beam=beam;
  root.userData.disposeRollingStock=()=>{
    if(root.userData.disposed)return;
    root.userData.disposed=true;
    root.traverse(node=>{
      if(node.isMesh&&node.geometry?.userData?.henschelOwned)node.geometry.dispose();
    });
    headMaterial.dispose();beam.dispose();
  };
  // This Sketchfab source has a single baked mesh; it has no independent wheel nodes.
  // Position and orientation are animated by the existing Journey renderer.
  root.stockRig={body:root,wheels,bogies:[],rods:[],pistons:[]};
  // Source local +X maps to locomotive +Z: forward travel needs negative spin.
  root.br01Pose=(distance)=>{for(const {node,radius} of wheels)node.rotation.x=-distance/radius;};
  return root;
}
