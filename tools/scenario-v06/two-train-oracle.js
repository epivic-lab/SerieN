// R2B1 read-only witness. No imports from src/, routing or Journey.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>readFileSync(new URL('../../'+p,import.meta.url));
const pinned=(p,h)=>{const b=read(p);assert.equal(createHash('sha256').update(b).digest('hex'),h);return JSON.parse(b);};
const source=pinned('docs/_active/scenario-v06/candidate/R02/track.json','99a5019f6ea4b8a99d18dcf6aff4a9b841ea2c49c5bb4eff9edd36825eead460');
const witness=pinned('docs/_active/scenario-v06/evidence/R1A/oracle.json','56199a3f625fbce25b6e69fcde2357841bc17ccc3c5bfa1f658c7e196132591a');
export const near=(a,b,why='numeric identity',e=1e-7)=>assert.ok(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=e,`${why}: ${a} != ${b}`);
const num=id=>Number(id.slice(-3)),endpoint=(h,forward)=>`${num(h.id)}.${(h.sign>0)===forward?'E':'S'}`;
export const pieces=new Map(source.pieces.map(p=>{let ds=[0];for(let i=1;i<p.points.length;i++)ds.push(ds.at(-1)+Math.hypot(p.points[i][0]-p.points[i-1][0],p.points[i][1]-p.points[i-1][1]));return [`V06-P${String(p.piece).padStart(3,'0')}`,{...p,ds,length:ds.at(-1)}];}));
export function point(edge,s){const p=pieces.get(edge);assert.ok(p,'known R02 edge');assert.ok(s>=-1e-7&&s<=p.length+1e-7);s=Math.max(0,Math.min(p.length,s));let lo=1,hi=p.ds.length-1;while(lo<hi){const m=(lo+hi)>>1;if(p.ds[m]<s)lo=m+1;else hi=m;}const i=lo,f=(s-p.ds[i-1])/(p.ds[i]-p.ds[i-1]);return {edge,s,x:p.points[i-1][0]+f*(p.points[i][0]-p.points[i-1][0]),z:p.points[i-1][1]+f*(p.points[i][1]-p.points[i-1][1])};}
export function locate(history,at){const h=history.find(h=>at>=h.start-1e-6&&at<=h.end+1e-6);assert.ok(h,'whole body within actual history');const p=pieces.get(h.id),d=Math.max(0,Math.min(p.length,at-h.start)),s=h.sign>0?d:p.length-d;
 const q=point(h.id,s),a=point(h.id,Math.max(0,s-.5)),b=point(h.id,Math.min(p.length,s+.5));return {...q,angle:-Math.atan2((b.z-a.z)*h.sign,(b.x-a.x)*h.sign)};}
export function checkHistory(history){for(let i=0;i<history.length;i++){const h=history[i];assert.ok([-1,1].includes(h.sign));near(h.end-h.start,pieces.get(h.id).length,'R02 history length');if(i){const a=history[i-1];near(a.end,h.start,'continuous history');const from=endpoint(a,true),to=endpoint(h,false);assert.ok(witness.junctions.some(j=>j.direct_transit&&((j.a===from&&j.b===to)||(j.b===from&&j.a===to))),`forbidden joint ${from} -> ${to}`);}}}
const active=(p,states)=>!p.unit||states[p.unit]===(p.required_state==='X'||p.required_state==='S1');
export function checkPose(p,history,at,states){const q=locate(history,at);assert.equal(p.edge,q.edge);for(const k of ['s','x','z'])near(p[k],q[k],`R02 ${k}`);if(p.angle!==undefined)near(Math.cos(p.angle-q.angle),1,'orientation');assert.ok(active(pieces.get(p.edge),states),'body only on aligned path');return Math.hypot(p.x-q.x,p.z-q.z);}
export function rectangle(p,d){const c=Math.cos(p.angle),s=-Math.sin(p.angle);return [[-d.rear,-d.width/2],[d.front,-d.width/2],[d.front,d.width/2],[-d.rear,d.width/2]].map(([x,z])=>[p.x+x*c-z*s,p.z+x*s+z*c]);}
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function hull(points){const sorted=points.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const half=rows=>{const out=[];for(const p of rows){while(out.length>1&&cross(out.at(-2),out.at(-1),p)<=0)out.pop();out.push(p);}return out;};return [...half(sorted).slice(0,-1),...half(sorted.slice().reverse()).slice(0,-1)];}
const inside=(p,poly)=>poly.every((a,i)=>cross(a,poly[(i+1)%poly.length],p)>=-1e-10);
function pointSegment(p,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz||1)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dz);}
// Segment intersections and point containment, independent of the core SAT flags.
export function polygonDistance(a,b){if(inside(a[0],b)||inside(b[0],a))return 0;let distance=Infinity;for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++){const p=a[i],q=a[(i+1)%a.length],r=b[j],s=b[(j+1)%b.length];if(cross(p,q,r)*cross(p,q,s)<0&&cross(r,s,p)*cross(r,s,q)<0)return 0;distance=Math.min(distance,pointSegment(p,r,s),pointSegment(q,r,s),pointSegment(r,p,q),pointSegment(s,p,q));}return distance;}
// The centre is affine between R02 vertices. Within each interval cut at
// s(vertex) and s(vertex) +/- .5, the core's symmetric tangent is an affine
// vector, so its angle is monotone. For radius R and total angle theta, every
// corner differs from the chord of its endpoint corners by at most R*theta.
// The convex hull + this disk therefore encloses the CONTINUOUS movement,
// including translation and rotation. No SAT/sweep predicate is imported.
export function vehicleSweep(previous,current,i){
 const now=current.vehicles[i],from=previous.position-now.offset,to=current.position-now.offset,delta=to-from;
 if(!delta){const polygon=rectangle(locate(current.history,to),now.dimensions);polygon.padding=0;return polygon;}
 const times=new Set(Array.from({length:17},(_,k)=>k/16)),lo=Math.min(from,to),hi=Math.max(from,to);
 const add=at=>{const t=(at-from)/delta;if(t>0&&t<1)times.add(t);};
 for(const h of current.history){if(h.end<lo-1e-5||h.start>hi+1e-5)continue;
  const p=pieces.get(h.id),at=s=>h.sign>0?h.start+s:h.start+p.length-s;
  // Include both sides of Journey's 1e-6 boundary selection tolerance.
  for(const boundary of [h.start,h.end])for(const shift of [-2e-6,-1e-6,0,1e-6,2e-6])add(boundary+shift);
  const s0=h.sign>0?lo-h.start:p.length-(hi-h.start),s1=h.sign>0?hi-h.start:p.length-(lo-h.start);
  let left=0,right=p.ds.length;while(left<right){const m=(left+right)>>1;if(p.ds[m]<s0-.50001)left=m+1;else right=m;}
  for(let j=left;j<p.ds.length&&p.ds[j]<=s1+.50001;j++)for(const shift of [-.5,0,.5])add(at(p.ds[j]+shift));
 }
 const poses=[...times].sort((a,b)=>a-b).map(t=>locate(current.history,from+delta*t));
 const radius=Math.hypot(Math.max(now.dimensions.front,now.dimensions.rear),now.dimensions.width/2);
 let padding=2e-6; // Includes locate's boundary clamp tolerance, in mm.
 for(let k=1;k<poses.length;k++){const angle=Math.abs(Math.atan2(Math.sin(poses[k].angle-poses[k-1].angle),Math.cos(poses[k].angle-poses[k-1].angle)));padding=Math.max(padding,radius*angle+2e-6);}
 const polygon=hull(poses.flatMap(p=>rectangle(p,now.dimensions)));polygon.padding=padding;return polygon;
}
export const sweepClearance=(a,b)=>polygonDistance(a,b)-(a.padding??0)-(b.padding??0);
export function bodyIntervals(train){return train.vehicles.flatMap(v=>{const lo=train.position-v.offset-v.dimensions.rear,hi=train.position-v.offset+v.dimensions.front;return train.history.flatMap(h=>{const a=Math.max(lo,h.start),b=Math.min(hi,h.end);if(b<a)return [];const p=pieces.get(h.id),s=x=>h.sign>0?x-h.start:p.length-(x-h.start);return [{edge:h.id,min:Math.min(s(a),s(b)),max:Math.max(s(a),s(b))}];});});}
export function compareOccupancy(trains,occupied){const expected=trains.flatMap(bodyIntervals),sort=a=>a.slice().sort((a,b)=>a.edge.localeCompare(b.edge)||a.min-b.min||a.max-b.max);const a=sort(expected),b=sort(occupied);assert.equal(a.length,b.length,'fresh occupation range count');for(let i=0;i<a.length;i++){assert.equal(a[i].edge,b[i].edge);near(a[i].min,b[i].min,'occupied min');near(a[i].max,b[i].max,'occupied max');}}
