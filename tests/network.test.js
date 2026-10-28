import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createNetwork,validateNetwork,sample,loopPosition} from '../src/network.js';
import {Journey,routing,FixedClock} from '../src/simulation.js';
const n=createNetwork(),normal=routing(n,()=>false);
const router=on=>routing(n,id=>on.includes(id));
const choices=(e,end)=>n.nodes[end?e.to:e.from].filter(p=>p.edge!==e.id);

test('canonical source preserves all XML identifiers, contracts only two zero connectors and documents small joins',()=>{
  assert.deepEqual(validateNetwork(n),{edges:75,deadEnds:4});
  const m=n.metadata;assert.deepEqual(m.statistics,{nodes:70,edges:75,components:1,cycleRank:6,terminals:4});
  for(let i=0;i<51;i++)assert.ok(n.edges['T'+i],`source T${i}`);
  assert.deepEqual(m.reconciliation.zeroLengthAliases.map(s=>s.id),['T51','T52']);
  assert.equal(m.aliases['TO3:B'],m.aliases['TO0:A']);assert.equal(m.aliases['TO5:A'],m.aliases['TO0:C']);
  assert.deepEqual(m.reconciliation.joins.map(p=>[p.a,p.b]),[['A55','TO0:B'],['A60','TO4:B']]);
  assert.equal(m.sourceSha256,createHash('sha256').update(readFileSync(new URL('../docs/jmri-layout/source.xml',import.meta.url))).digest('hex'));
  assert.ok(m.reconciliation.nominalRadiusFits.every(f=>f.distanceMm<1.1));
});
test('all three nominal Kato loops close in both senses for three complete laps without jumps',()=>{
  for(let lane=0;lane<3;lane++){
    const loop=n.mainLoops[lane],start=loopPosition(n,lane,.17);
    assert.ok(loop.length>3000&&loop.length<3500);
    for(const p of loop.segments){const edge=n.edges[p.id];if(edge.shape.angle===45)assert.ok(Math.abs(edge.shape.radius-[249,282,315][lane])<1e-8);}
    for(const direction of [-1,1]){
      const j=new Journey(n,start.edge,start.s);j.ensure(j.position-230,normal);
      let previous=j.locate();
      for(let distance=0;distance<loop.length*3;distance+=2){assert.ok(j.move(direction*2,230,normal,40),`lane${lane} dir${direction}`);const p=j.locate();assert.ok(Math.hypot(p.x-previous.x,p.z-previous.z)<=2.000001,'no geometric jump');assert.equal(n.edges[p.edge].lane,lane);previous=p;}
    }
  }
});
test('all eight switches route every entrance in both states; single turnout B-C traversal is impossible',()=>{
  assert.equal(n.controllers.length,8);
  for(const control of n.controllers)for(const state of [false,true]){
    const choose=router(state?[control.id]:[]);
    for(const node of Object.values(control.ports))for(const p of n.nodes[node]){
      const edge=n.edges[p.edge],out=choose(edge.id,choices(edge,p.end));
      if(out){const target=n.edges[out.edge];assert.ok(!(edge.unit&&edge.unit===target.unit));if(target.switchId)assert.equal(target.requiredState,target.switchId===control.id?state:false);}
    }
    for(const id of control.internal){const edge=n.edges[id];for(const end of [0,1]){
      const out=choose(id,choices(edge,end));
      if(edge.requiredState!==state)assert.equal(out,null,'misaligned internal route blocked');
      else if(out)assert.notEqual(n.edges[out.edge].unit,edge.unit);
    }}
  }
});
test('both crossover diagonals are traversable in either sense and do not join at the diamond',()=>{
  for(const sw of ['WX-A','WX-B'])for(const branch of ['down','up'])for(const direction of [-1,1]){
    const id=sw+':'+branch,e=n.edges[id],j=new Journey(n,id,e.length/2),r=router([sw]);let entered=false;
    for(let d=0;d<600;d++){assert.ok(j.move(direction,0,r));entered||=j.locate().edge===id;}
    assert.ok(entered);assert.notEqual(n.edges[j.locate().edge].role,'crossover');
  }
  for(const id of ['WX-A','WX-B']){const c=n.controllers.find(c=>c.id===id);assert.equal(new Set(Object.values(c.ports)).size,4);assert.ok(c.internal.every(e=>n.edges[e].points.length>1));}
});
test('every terminal is accessible from the inner mainline with a documented static switch setting and can reverse',()=>{
  const cases=[['A67',['Y-IN','Y-2']],['EB39',['Y-IN']],['EB49',['Y-3']]];
  for(const [terminal,on] of cases){
    const r=router(on);let found=false;
    for(const start of ['T6','T27'])for(const direction of [-1,1]){
      let j=new Journey(n,start,n.edges[start].length/2),seen=new Set();
      for(let step=0;step<9000;step++){
        const p=j.locate();if(n.edges[p.edge].terminal===terminal){found=true;const before=j.locate();assert.ok(j.move(direction*5,0,r));assert.ok(j.move(-direction*5,0,r));assert.deepEqual(j.locate(),before);break;}
        if(!j.move(direction*2,0,r))break;
        const k=p.edge+':'+Math.floor(p.s);if(seen.has(k))break;seen.add(k);
      }
    }
    assert.ok(found,terminal+' accessible from mainline');
  }
  let j=new Journey(n,'T27',50),r=router(['Y-3']);
  for(let i=0;i<3000 && !(j.locate().edge==='T37'&&j.locate().s>20);i++)assert.ok(j.move(-1,10,r,10));
  assert.equal(j.locate().edge,'T37');
  r=router(['Y-3','Y-R1','Y-4']);j.reconcile(10,10,r);
  for(let i=0;i<3000 && j.locate().edge!=='T39';i++)assert.ok(j.move(1,10,r,10));
  assert.equal(j.locate().edge,'T39','EB52 reached after a real reversal clear of TO1');
});
test('runaround main and alternate paths connect the same two toe leads with legal reversing maneuvers',()=>{
  for(const alternate of [false,true])for(const direction of [-1,1]){
    const r=router(alternate?['Y-R1','Y-R2']:[]),edge=direction>0?'T38':'T45';
    const j=new Journey(n,edge,n.edges[edge].length/2),seen=new Set();
    // T38 source order points towards TO1, T45 source order points towards TO3.
    const delta=1;
    for(let d=0;d<1000;d++){seen.add(j.locate().edge);if(!j.move(delta,0,r))break;if(seen.has('T38')&&seen.has('T45'))break;}
    if(direction<0){ // Traverse the opposite direction using the actual reverse ribbon.
      const reverse=new Journey(n,'T45',n.edges.T45.length/2);
      for(let d=0;d<1000;d++){seen.add(reverse.locate().edge);if(!reverse.move(-1,0,r))break;if(seen.has('T38')&&seen.has('T45'))break;}
    }
    assert.ok(seen.has('T38')&&seen.has('T45'));
    assert.ok(seen.has(alternate?'T43':'T40'));assert.ok(seen.has(alternate?'T44':'T42'));
  }
});
test('no parallel-track proximity or drawn crossing creates a graph junction',()=>{
  const m=n.metadata;
  for(const ids of [['A7','A25'],['A40','A42'],['A44','A46']]){assert.notEqual(m.aliases[ids[0]],m.aliases[ids[1]]);assert.ok(Math.abs(m.nodes[ids[0]].z-m.nodes[ids[1]].z)>=33-1e-8);}
  for(const e of Object.values(n.edges))for(const end of [0,1])for(let mask=0;mask<256;mask++){
    const r=routing(n,id=>Boolean(mask&(1<<n.controllers.findIndex(c=>c.id===id)))),next=r(e.id,choices(e,end));
    if(!next)continue;const q=n.edges[next.edge],a=e.points[end?e.points.length-1:0],b=q.points[next.end?q.points.length-1:0];assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<1e-8);
    const aa=e.points[end?e.points.length-2:1],bb=q.points[next.end?q.points.length-2:1];
    const h1=Math.atan2(a.z-aa.z,a.x-aa.x),h2=Math.atan2(bb.z-b.z,bb.x-b.x),difference=Math.abs(Math.atan2(Math.sin(h1-h2),Math.cos(h1-h2)));
    assert.ok(difference<Math.PI/180,`${e.id} -> ${q.id}: tangent discontinuity`);
  }
});
test('buffer stopping protects the complete consist and safe switch change trims only unoccupied cached ribbon',()=>{
  const e=n.edges.T50,j=new Journey(n,'T50',80);assert.ok(j.move(-20,30,normal,30));assert.equal(j.move(-31,30,normal,30),false);assert.equal(j.position,60);
  const r=router([]),q=new Journey(n,'T33',50);q.ensure(500,r);const before=q.locate();q.reconcile(20,10,router(['WX-B']));assert.deepEqual(q.locate(),before);assert.ok(q.segments.length<5);
});
test('fixed-step simulation gives the same distance at different rendering rates',()=>{
  const distances=[];for(const fps of [20,60,120]){const c=new FixedClock();let d=0;for(let i=0;i<fps*10;i++)c.update(1/fps,dt=>d+=dt*100);distances.push(d);}assert.ok(Math.max(...distances)-Math.min(...distances)<2);
});
