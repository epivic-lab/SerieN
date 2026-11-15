// Read-only witness: frozen R0 route order + R02 polylines. No core, network,
// Journey, routing, builder, loopPosition or dataset-derived lengths imported.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=path=>readFileSync(new URL('../../'+path,import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex');
const routeBytes=read('docs/_active/scenario-v06/evidence/R1A/oracle.json');
const pointBytes=read('docs/_active/scenario-v06/candidate/R02/track.json');
assert.equal(hash(routeBytes),'56199a3f625fbce25b6e69fcde2357841bc17ccc3c5bfa1f658c7e196132591a');
assert.equal(hash(pointBytes),'99a5019f6ea4b8a99d18dcf6aff4a9b841ea2c49c5bb4eff9edd36825eead460');
const routes=JSON.parse(routeBytes).routes,source=JSON.parse(pointBytes);
const pieces=new Map(source.pieces.map(p=>{
  const distances=[0];
  for(let i=1;i<p.points.length;i++)distances.push(distances.at(-1)+Math.hypot(
    p.points[i][0]-p.points[i-1][0],p.points[i][1]-p.points[i-1][1]));
  return [p.piece,{...p,distances,length:distances.at(-1)}];
}));
const id=p=>`V06-P${String(p).padStart(3,'0')}`;
const modulo=(x,n)=>(x%n+n)%n;
export function circuitWitness(name) {
  assert.ok(['A','B','C'].includes(name));
  let start=0;
  const segments=routes[name].piece_walk.map(([piece,sign])=>{
    const p=pieces.get(piece),row={piece,id:id(piece),sign,start,end:start+p.length,length:p.length,
      hidden:p.hidden_intervals_mm,unit:p.unit,from:sign>0?p.from_node:p.to_node,to:sign>0?p.to_node:p.from_node};
    start=row.end;return row;
  });
  segments.forEach((s,i)=>assert.equal(s.to,segments[(i+1)%segments.length].from,'independent closed graph witness'));
  function coordinate(edge,s) {
    const part=segments.find(v=>v.id===edge);assert.ok(part,'edge belongs to circuit');
    return part.start+(part.sign>0?s:part.length-s);
  }
  function point(at) {
    const distance=modulo(at,start),part=segments.find(s=>distance<s.end)??segments[0];
    const s=part.sign>0?distance-part.start:part.end-distance,p=pieces.get(part.piece);
    let i=1;while(i<p.distances.length-1&&p.distances[i]<s)i++;
    const f=(s-p.distances[i-1])/(p.distances[i]-p.distances[i-1]);
    const [a,b]=[p.points[i-1],p.points[i]];
    return {edge:part.id,s,x:a[0]+(b[0]-a[0])*f,z:a[1]+(b[1]-a[1])*f,
      tangent:Math.atan2((b[1]-a[1])*part.sign,(b[0]-a[0])*part.sign)};
  }
  function crossings(from,to) {
    const rows=[];
    for(let lap=Math.floor(Math.min(from,to)/start)-1;lap<=Math.ceil(Math.max(from,to)/start)+1;lap++)
      for(let i=0;i<segments.length;i++){
        const boundary=lap*start+segments[i].end;
        if(to>from?boundary>from+1e-7&&boundary<=to+1e-7:boundary<from-1e-7&&boundary>=to-1e-7){
          const next=segments[(i+1)%segments.length];
          rows.push({at:boundary,from:to>from?segments[i].id:next.id,to:to>from?next.id:segments[i].id,
            node:segments[i].to});
        }
      }
    return rows.sort((a,b)=>to>from?a.at-b.at:b.at-a.at);
  }
  function nextDevice(at,direction) {
    const candidates=crossings(at,at+direction*start);
    const first=candidates.find(c=>segments.find(s=>s.id===c.to)?.unit);
    assert.ok(first);return {id:segments.find(s=>s.id===first.to).unit,distance:Math.abs(first.at-at)};
  }
  return {name,length:start,segments,coordinate,point,crossings,nextDevice};
}
