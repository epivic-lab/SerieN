import * as THREE from 'three';

function entry(ray,b,limit) {
  let near=0,far=limit;
  for(let i=0;i<3;i++) {
    const axis=['x','y','z'][i],d=ray.direction[axis],o=ray.origin[axis];
    if(Math.abs(d)<1e-12){if(o<b[i]||o>b[i+3])return Infinity;continue;}
    let a=(b[i]-o)/d,c=(b[i+3]-o)/d;if(a>c)[a,c]=[c,a];near=Math.max(near,a);far=Math.min(far,c);if(near>far)return Infinity;
  }
  return near;
}
function visible(object) {
  for(let o=object;o;o=o.parent)if(!o.visible||o.userData.pickThrough)return false;
  return true;
}

/** Immutable scenery transforms only. Index bounds, not a substitute for
 * actual triangle intersections. Dynamic trains retain their normal raycast.
 * Density changes keep the original instance order and only change count. */
export function createStaticRaycast(roots) {
  const objects=new Map(),box=new THREE.Box3(),matrix=new THREE.Matrix4(),instance=new THREE.Matrix4();
  for(const root of roots) {
    root.updateWorldMatrix(true,true);
    root.traverse(object=>{
      if(!object.isMesh||objects.has(object))return;
      if(!object.geometry.boundingBox)object.geometry.computeBoundingBox();
      const count=object.isInstancedMesh?object.count:1,bounds=new Float64Array(count*6),order=Uint32Array.from({length:count},(_,i)=>i);
      for(let i=0;i<count;i++) {
        matrix.copy(object.matrixWorld);if(object.isInstancedMesh){object.getMatrixAt(i,instance);matrix.multiply(instance);}
        box.copy(object.geometry.boundingBox).applyMatrix4(matrix);bounds.set([...box.min.toArray(),...box.max.toArray()],i*6);
      }
      function build(start,end) {
        const b=[Infinity,Infinity,Infinity,-Infinity,-Infinity,-Infinity];
        for(let i=start;i<end;i++)for(let a=0;a<3;a++){b[a]=Math.min(b[a],bounds[order[i]*6+a]);b[a+3]=Math.max(b[a+3],bounds[order[i]*6+a+3]);}
        if(end-start<=12)return {b,start,end};
        const axis=[0,1,2].sort((a,c)=>(b[c+3]-b[c])-(b[a+3]-b[a]))[0];
        order.subarray(start,end).sort((a,c)=>(bounds[a*6+axis]+bounds[a*6+axis+3])-(bounds[c*6+axis]+bounds[c*6+axis+3]));
        const mid=(start+end)>>1;return {b,left:build(start,mid),right:build(mid,end)};
      }
      if(count)objects.set(object,{bounds,order,tree:build(0,count)});
    });
  }
  const proxy=new THREE.Mesh();proxy.geometry.dispose();let disposed=false;
  return {
    cast(raycaster,scene,limit,hits) {
      if(disposed)return;
      const oldFar=raycaster.far;raycaster.far=Math.min(oldFar,limit+1e-4);
      try {
        const candidates=[...objects].filter(([o])=>visible(o)).map(([o,index])=>({o,index,at:entry(raycaster.ray,index.tree.b,raycaster.far)})).filter(c=>Number.isFinite(c.at)).sort((a,b)=>a.at-b.at);
        for(const {o,index} of candidates) {
          const visit=node=>{
            if(entry(raycaster.ray,node.b,raycaster.far)===Infinity)return;
            if(node.left){visit(node.left);visit(node.right);return;}
            for(let i=node.start;i<node.end;i++) {
              const id=index.order[i];if(o.isInstancedMesh&&id>=o.count)continue;
              if(entry(raycaster.ray,index.bounds.subarray(id*6,id*6+6),raycaster.far)===Infinity)continue;
              if(!o.isInstancedMesh){o.raycast(raycaster,hits);continue;}
              o.getMatrixAt(id,instance);proxy.geometry=o.geometry;proxy.material=o.material;proxy.matrixWorld.multiplyMatrices(o.matrixWorld,instance);
              const start=hits.length;proxy.raycast(raycaster,hits);
              for(let k=start;k<hits.length;k++){hits[k].object=o;hits[k].instanceId=id;}
            }
          };
          visit(index.tree);
        }
        scene.traverse(o=>{if(o.isMesh&&!objects.has(o)&&visible(o))o.raycast(raycaster,hits);});
        hits.sort((a,b)=>a.distance-b.distance);
      } finally {raycaster.far=oldFar;}
    },
    get objectCount(){return objects.size;},
    dispose(){disposed=true;objects.clear();proxy.geometry=null;proxy.material=null;}
  };
}
