import * as THREE from 'three';
import {TURNOUT_IDS} from './turnout-routes.js';

const HALF_WIDTH=12.3, HEIGHT=6.08, EPS=1e-4;

function ribbon(paths) {
  const vertices=[];
  for(const path of paths)for(let i=1;i<path.points.length;i++) {
    const a=path.points[i-1],b=path.points[i],length=Math.hypot(b.x-a.x,b.z-a.z);
    if(length<1e-8)continue;
    const nx=-(b.z-a.z)/length*HALF_WIDTH,nz=(b.x-a.x)/length*HALF_WIDTH;
    vertices.push(a.x+nx,HEIGHT,a.z+nz,a.x-nx,HEIGHT,a.z-nz,b.x+nx,HEIGHT,b.z+nz,
      a.x-nx,HEIGHT,a.z-nz,b.x-nx,HEIGHT,b.z-nz,b.x+nx,HEIGHT,b.z+nz);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
  return geometry;
}
function centreDistance(paths,point) {
  let best=Infinity;
  for(const path of paths)for(let i=1;i<path.points.length;i++) {
    const a=path.points[i-1],b=path.points[i],dx=b.x-a.x,dz=b.z-a.z;
    const t=Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.z-a.z)*dz)/(dx*dx+dz*dz||1)));
    best=Math.min(best,(point.x-a.x-t*dx)**2+(point.z-a.z-t*dz)**2);
  }
  return best;
}
function visibleSurface(hit) {
  if(!hit.object.isMesh)return false;
  for(let o=hit.object;o;o=o.parent)if(!o.visible||o.userData.pickThrough)return false;
  const material=Array.isArray(hit.object.material)?hit.object.material[hit.face?.materialIndex??0]:hit.object.material;
  return material?.visible!==false && !(material?.transparent && material.opacity<=0);
}
function trainId(object) {
  for(let o=object;o;o=o.parent)if(Number.isInteger(o.userData.trainId))return o.userData.trainId;
  return null;
}

/** Independent CPU-only hit geometry. The root is deliberately never added to
 * the rendered scene; no rail/material mutation and no GPU upload/draw calls. */
export function createTurnoutPicking(model) {
  const root=new THREE.Group(),material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
  const pathsById=new Map(),meshes=[],deviceHits=[],sceneHits=[];
  let disposed=false;
  root.name='Turnout picking only';root.visible=false;
  for(const id of TURNOUT_IDS) {
    const paths=model.read(id,false).paths;
    if(!paths.length)throw new Error('Missing canonical turnout paths: '+id);
    pathsById.set(id,paths);
    const mesh=new THREE.Mesh(ribbon(paths),material);mesh.userData.controlId=id;
    root.add(mesh);meshes.push(mesh);
  }
  root.updateMatrixWorld(true);
  return {
    root,
    pick(raycaster,scene) {
      if(disposed)return null;
      deviceHits.length=sceneHits.length=0;
      raycaster.intersectObjects(meshes,false,deviceHits);
      let device=null,best=Infinity,rank=Infinity;
      const first=deviceHits[0]?.distance??Infinity;
      for(const hit of deviceHits) {
        if(hit.distance>first+EPS)break;
        const id=hit.object.userData.controlId,d=centreDistance(pathsById.get(id),hit.point),r=TURNOUT_IDS.indexOf(id);
        if(d<best-EPS||Math.abs(d-best)<=EPS&&r<rank){device={kind:'turnout',id,distance:hit.distance};best=d;rank=r;}
      }
      scene.updateMatrixWorld(true);
      raycaster.intersectObject(scene,true,sceneHits);
      const surface=sceneHits.find(visibleSurface);
      if(surface && (!device || surface.distance<device.distance-EPS)) {
        const id=trainId(surface.object);
        return id===null?null:{kind:'train',id,distance:surface.distance};
      }
      return device;
    },
    dispose() {
      if(disposed)return;disposed=true;
      meshes.forEach(m=>m.geometry.dispose());material.dispose();root.clear();
      meshes.length=deviceHits.length=sceneHits.length=0;pathsById.clear();
    }
  };
}
