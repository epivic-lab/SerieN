// Exact mesh-pair narrow phase in the first mesh's local frame. A cached
// hierarchy changes neither the triangles nor their ownership.
import {Box3, Matrix4, Vector3} from 'three';
const cache=new WeakMap();
const vec=()=>new Vector3();
function geometryData(g){
  if(cache.has(g))return cache.get(g);
  const pos=g.attributes.position,index=g.index;
  const faces=[];
  for(let i=0;i<(index?.count??pos.count);i+=3){
    const v=[0,1,2].map(k=>vec().fromBufferAttribute(pos,index?index.getX(i+k):i+k));
    faces.push({v,box:new Box3().setFromPoints(v),i:i/3});
  }
  function build(items){
    const box=new Box3();for(const f of items)box.union(f.box);
    if(items.length<=10)return {box,items};
    const s=box.getSize(vec()),axis=s.x>s.y&&s.x>s.z?'x':s.y>s.z?'y':'z';
    items.sort((a,b)=>a.box.min[axis]+a.box.max[axis]-b.box.min[axis]-b.box.max[axis]);
    const m=items.length>>1;return {box,l:build(items.slice(0,m)),r:build(items.slice(m))};
  }
  const root=build(faces);cache.set(g,root);return root;
}
const axis=vec(),na=vec(),nb=vec(),ae=[vec(),vec(),vec()],be=[vec(),vec(),vec()];
function overlap(a,b){
  for(let i=0;i<3;i++){ae[i].subVectors(a[(i+1)%3],a[i]);be[i].subVectors(b[(i+1)%3],b[i]);}
  na.crossVectors(ae[0],ae[1]);nb.crossVectors(be[0],be[1]);
  if(na.lengthSq()<1e-20||nb.lengthSq()<1e-20)return false;
  function separates(n){
    const p=a[0].dot(n),q=a[1].dot(n),r=a[2].dot(n),u=b[0].dot(n),v=b[1].dot(n),w=b[2].dot(n);
    return Math.max(p,q,r)<Math.min(u,v,w)-1e-10||Math.max(u,v,w)<Math.min(p,q,r)-1e-10;
  }
  if(separates(na)||separates(nb))return false;
  for(const e of ae){
    if(separates(axis.crossVectors(e,na)))return false;
    for(const f of be)if(separates(axis.crossVectors(e,f)))return false;
  }
  for(const f of be)if(separates(axis.crossVectors(f,nb)))return false;
  return true;
}
export function bodyContact(groups){
  return meshContact(...groups.map(g=>meshSet(g,m=>!m.userData.drawgear)));
}

export function meshSet(group,include){
  group.updateMatrixWorld(true);const list=[];
  group.traverse(m=>{if(m.isMesh && m.visible && include(m)){
    if(!m.geometry.boundingBox)m.geometry.computeBoundingBox();
    list.push({m,box:m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld)});
  }});
  return list;
}

export function meshContact(first,second){
  for(const a of first)for(const b of second){
    if(!a.box.intersectsBox(b.box))continue;
    const transform=new Matrix4().copy(a.m.matrixWorld).invert().multiply(b.m.matrixWorld);
    const transformed=new Map();
    function visit(x,y){
      let bound=transformed.get(y);
      if(!bound){bound=y.box.clone().applyMatrix4(transform);transformed.set(y,bound);}
      if(!x.box.intersectsBox(bound))return null;
      if(!y.items)return visit(x,y.l)||visit(x,y.r);
      if(!x.items)return visit(x.l,y)||visit(x.r,y);
      for(const f of y.items){
        const v=f.v.map(p=>p.clone().applyMatrix4(transform));
        const box=new Box3().setFromPoints(v);
        for(const h of x.items)if(box.intersectsBox(h.box)&&overlap(h.v,v))return [h.i,f.i];
      }
      return null;
    }
    const faces=visit(geometryData(a.m.geometry),geometryData(b.m.geometry));
    if(faces)return {a:a.m.name,b:b.m.name,faces};
  }
  return null;
}

// Minimum surface distance for two disjoint meshes. Triangle distance is
// attained at a vertex/face or edge/edge pair (including parallel faces).
export function meshDistance(a,b){
 a.updateWorldMatrix(true,false);b.updateWorldMatrix(true,false);
 const m=new Matrix4().copy(a.matrixWorld).invert().multiply(b.matrixWorld);
 let best=Infinity;
 const boxes=new Map(),p=vec(),q=vec(),u=vec(),v=vec(),w=vec(),n=vec(),e=vec();
 function boxGap(x,y){
  return Math.hypot(...['x','y','z'].map(k=>Math.max(0,x.min[k]-y.max[k],y.min[k]-x.max[k])));
 }
 function edgeDistance(a0,a1,b0,b1){
  u.subVectors(a1,a0);v.subVectors(b1,b0);w.subVectors(a0,b0);
  const uu=u.dot(u),uv=u.dot(v),vv=v.dot(v),uw=u.dot(w),vw=v.dot(w),det=uu*vv-uv*uv;
  const clamp=t=>Math.min(1,Math.max(0,t));
  let s=det>1e-12?clamp((uv*vw-vv*uw)/det):0;
  const t=vv?clamp((uv*s+vw)/vv):0;
  s=uu?clamp((uv*t-uw)/uu):0;
  return w.addScaledVector(u,s).addScaledVector(v,-t).length();
 }
 function pointFace(x,t){
  n.crossVectors(u.subVectors(t[1],t[0]),v.subVectors(t[2],t[0]));
  const len=n.length();if(!len)return Infinity;
  n.divideScalar(len);const h=n.dot(w.subVectors(x,t[0]));p.copy(x).addScaledVector(n,-h);
  for(let i=0;i<3;i++)if(q.crossVectors(e.subVectors(t[(i+1)%3],t[i]),w.subVectors(p,t[i])).dot(n)<-1e-9)return Infinity;
  return Math.abs(h);
 }
 function visit(x,y){
  let bound=boxes.get(y);if(!bound){bound=y.box.clone().applyMatrix4(m);boxes.set(y,bound);}
  if(boxGap(x.box,bound)>=best)return;
  if(y.l){visit(x,y.l);visit(x,y.r);return;}
  if(x.l){visit(x.l,y);visit(x.r,y);return;}
  for(const g of y.items){
   const t=g.v.map(v=>v.clone().applyMatrix4(m)),bb=new Box3().setFromPoints(t);
   for(const f of x.items){
    if(boxGap(f.box,bb)>=best)continue;
    if(overlap(f.v,t)){best=0;return;}
    for(let i=0;i<3;i++){
     best=Math.min(best,pointFace(f.v[i],t),pointFace(t[i],f.v));
     for(let j=0;j<3;j++)best=Math.min(best,edgeDistance(f.v[i],f.v[(i+1)%3],t[j],t[(j+1)%3]));
    }
   }
  }
 }
 visit(geometryData(a.geometry),geometryData(b.geometry));
 // The relative computation is in a's local coordinates. Both rigid body
 // meshes share the original uniform scale.
 return best*a.getWorldScale(vec()).x;
}
