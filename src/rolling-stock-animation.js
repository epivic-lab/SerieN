import {Vector3,Quaternion} from 'three';

const spinAxis=new Vector3(0,0,1),axleAlignment=new Quaternion().setFromAxisAngle(new Vector3(1,0,0),Math.PI/2);
const bindings=new WeakMap();

// Asset loading/release changes children at the vehicle root. Keep only weak
// ownership and rebuild when a child is inserted, removed or replaced.
export function animateAuxiliaryWheels(root,distance) {
  let record=bindings.get(root);
  if(!record||record.children.length!==root.children.length||record.children.some((child,i)=>child!==root.children[i])) {
    record={children:[...root.children],native:[],imported:[]};
    root.traverse(node=>{if(node.userData.wheel)record.native.push(node);if(node.userData.importedWheel)record.imported.push(node);});
    bindings.set(root,record);
  }
  for(const wheel of record.native)wheel.quaternion.setFromAxisAngle(spinAxis,-distance/4.2).multiply(axleAlignment);
  for(const wheel of record.imported)wheel.rotation.x=-distance/wheel.userData.wheelRadius;
}
