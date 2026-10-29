import {couplingDistance} from './consist.js';
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
