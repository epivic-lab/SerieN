import {sample} from './network.js';
import {layoutFor} from './railway-state.js';
/** Observation only. Unknown poses stay unknown; no route decisions here. */
export function guardedStopView(train){
 const g=train.guard;
 if(g?.state!=='GUARDED_STOP'||!['UNSAFE','UNKNOWN'].includes(g.risk)||!g.intervened||!(train.requestedSpeed>0||Math.abs(train.velocity)>.001))return null;
 const n=train.journey.network;let edge,s,sign;
 if(g.boundary&&typeof g.boundary==='object'&&typeof g.boundary.edge==='string'&&Object.hasOwn(n.edges,g.boundary.edge)&&Number.isFinite(g.boundary.from)&&Number.isFinite(g.boundary.to)){
  edge=n.edges[g.boundary.edge];sign=g.boundary.to>=g.boundary.from?1:-1;s=g.boundary.to-sign*(g.protectionInset??0);
 }else if(typeof g.boundary==='string'&&Object.hasOwn(n.metadata.nodes,g.boundary)){
  const node=g.boundary,segment=train.journey.segments.findLast(v=>{const e=n.edges[v.id];return e.from===node||e.to===node;});
  if(segment){edge=n.edges[segment.id];s=edge.from===node?0:edge.length;sign=edge.from===node?-1:1;}
 }else if(['train','wagon'].includes(g.reason)){
  const layout=layoutFor(train),at=train.journey.position-(g.direction<0?layout.offsets.at(-1):0)+g.direction*(g.leadingExtent??0);
  const seg=train.journey.segments.find(v=>at>=v.start&&at<=v.end);
  if(seg){edge=n.edges[seg.id];s=seg.sign>0?at-seg.start:edge.length-(at-seg.start);sign=seg.sign*g.direction;}
 }
 let pose=null;
 if(edge&&Number.isFinite(s)&&s>=0&&s<=edge.length){const p=sample(edge,s),a=sample(edge,s-.1),b=sample(edge,s+.1),length=Math.hypot(b.x-a.x,b.z-a.z);if(length)pose={...p,tx:(b.x-a.x)/length*sign,tz:(b.z-a.z)/length*sign,edge:edge.id,s};}
 return {id:train.id,name:train.name,risk:g.risk,reason:g.reason,braking:Math.abs(train.velocity)>.001,pose};
}
export function stopProgress(from,to,elapsed,reduced=false){if(reduced)return to;const t=Math.max(0,Math.min(1,elapsed/(to?400:300))),ease=t*t*(3-2*t);return from+(to-from)*ease+(to&&t<1?.08*Math.sin(Math.PI*t)*t**6:0);}
