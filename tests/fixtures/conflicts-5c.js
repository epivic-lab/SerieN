// Frozen 303525c oracle, test-only.
import {couplingDistance} from '../../src/consist.js';
// Ground-plane envelopes: +X forward, yaw follows the canonical Journey.
export function vehiclesConflict(a,b) {
 const data=p=>p.vehicle.userData;
 const x=data(a),y=data(b);
 if(a.edge===b.edge&&Math.abs(a.s-b.s)<(x.assetDimensions||x.stock||y.assetDimensions||y.stock?Math.max(couplingDistance(x,y),couplingDistance(y,x)):58))return true;
 const envelope=p=>{
  const d=data(p),front=d.couplers?.front?.x??38,rear=-(d.couplers?.back?.x??-38);
  const u=[Math.cos(p.angle),-Math.sin(p.angle)],v=[-u[1],u[0]],shift=(front-rear)/2;
  return {c:[p.x+u[0]*shift,p.z+u[1]*shift],u,v,l:(front+rear)/2,w:(d.assetDimensions?.width??d.stock?.width??21)/2};
 };
 const p=envelope(a),q=envelope(b),dot=(a,b)=>a[0]*b[0]+a[1]*b[1];
 return ![p.u,p.v,q.u,q.v].some(axis=>Math.abs(dot([q.c[0]-p.c[0],q.c[1]-p.c[1]],axis))>p.l*Math.abs(dot(p.u,axis))+p.w*Math.abs(dot(p.v,axis))+q.l*Math.abs(dot(q.u,axis))+q.w*Math.abs(dot(q.v,axis)));
}

function corners(p) {
 const d=p.vehicle.userData,front=d.couplers?.front?.x??38,rear=-(d.couplers?.back?.x??-38);
 const width=(d.assetDimensions?.width??d.stock?.width??21)/2,c=Math.cos(p.angle),s=-Math.sin(p.angle);
 return [[-rear,-width],[front,-width],[front,width],[-rear,width]].map(([x,z])=>[p.x+x*c-z*s,p.z+x*s+z*c]);
}
function hull(points) {
 const sorted=points.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const half=values=>{const out=[];for(const p of values){while(out.length>1&&cross(out.at(-2),out.at(-1),p)<=0)out.pop();out.push(p);}return out;};
 return [...half(sorted).slice(0,-1),...half(sorted.reverse()).slice(0,-1)];
}
function polygonGap(p,q) {
 let gap=-Infinity;
 for(const poly of [p,q])for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
  if(!length)continue;
  const axis=[-(b[1]-a[1])/length,(b[0]-a[0])/length],project=points=>points.map(v=>v[0]*axis[0]+v[1]*axis[1]);
  const u=project(p),v=project(q);
  gap=Math.max(gap,Math.min(...u)-Math.max(...v),Math.min(...v)-Math.max(...u));
 }
 return gap;
}
export function envelopeGap(a,b) {return polygonGap(corners(a),corners(b));}

// Convex swept envelopes cover intermediate translation as well as endpoints.
// Midpoint samples and a rotational/centre-arc allowance avoid treating a yaw
// change as a straight chord. Used only over the bounded 1/60 s railway step.
export function sweptVehiclesConflict(a,b) {
 const sweep=poses=>{
  let padding=0;
  for(let i=1;i<poses.length;i++){
   const p=poses[i-1],q=poses[i],angle=Math.abs(Math.atan2(Math.sin(q.angle-p.angle),Math.cos(q.angle-p.angle)));
   const radius=Math.max(...corners(p).map(v=>Math.hypot(v[0]-p.x,v[1]-p.z)));
   padding=Math.max(padding,radius*(1-Math.cos(angle/2))+Math.hypot(q.x-p.x,q.z-p.z)*Math.sin(angle/2)/4);
  }
  return {polygon:hull(poses.flatMap(corners)),padding};
 };
 const p=sweep(a),q=sweep(b);
 return polygonGap(p.polygon,q.polygon)<=p.padding+q.padding+1e-8;
}
