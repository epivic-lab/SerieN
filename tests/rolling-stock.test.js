import test from 'node:test';import assert from 'node:assert/strict';
import {buildStock,animateStock,STOCK} from '../src/rolling-stock.js';
import {createNetwork,loopPosition} from '../src/network.js';
import {Journey,routing} from '../src/simulation.js';import{consistLayout,couplingMatch}from '../src/consist.js';
import{Box3,Vector3}from 'three';
test('stock catalog creates finite original geometry and full coupling envelopes without fixed pitch',()=>{
 for(const kind of Object.keys(STOCK)){
  const g=buildStock(kind),b=new Box3().setFromObject(g),c=g.userData.couplers;
  assert.ok(b.min.x>=c.back.x-.01,kind);assert.ok(b.max.x<=c.front.x+.01,kind);
  assert.ok(b.min.y>=2.44,kind);assert.ok(b.getSize(new Vector3()).x>50);
  assert.doesNotThrow(()=>g.clone(true));
  const l=consistLayout([g.userData,g.userData]);assert.equal(l.offsets[1],c.front.x-c.back.x);
  assert.equal(l.tail,l.offsets[1]-c.back.x);
 }
});
test('wheel phases and rods follow signed travelled distance, freeze when stopped, and reverse exactly',()=>{
 const n=createNetwork(),p=loopPosition(n,0,.25),j=new Journey(n,p.edge,p.s),route=routing(n,()=>false);j.ensure(j.position-200,route);
 for(const kind of ['steam','shunter']){
  const g=buildStock(kind);animateStock(g,j,j.position,0);const initial=g.stockRig.rods.map(r=>r.node.position.toArray());
  animateStock(g,j,j.position,10);g.stockRig.wheels.forEach(w=>assert.ok(Math.abs(w.node.rotation.z+10/w.radius)<1e-9));
  assert.notDeepEqual(g.stockRig.rods.map(r=>r.node.position.toArray()),initial);
  animateStock(g,j,j.position,0);assert.deepEqual(g.stockRig.rods.map(r=>r.node.position.toArray()),initial);
 }
});
test('coach bogies pivot along actual R249 track chords without changing canonical coordinates',()=>{
 const n=createNetwork(),saved=JSON.stringify(n),p={edge:'T16',s:100},j=new Journey(n,p.edge,p.s),route=routing(n,()=>false);
 j.ensure(j.position-200,route);j.ensure(j.position+120,route);
 const g=buildStock('coach');animateStock(g,j,j.position,50);
 assert.ok(g.stockRig.bogies.some(b=>Math.abs(b.node.rotation.y)>.01));
 for(const b of g.stockRig.bogies)assert.ok(Number.isFinite(b.node.rotation.y));
 assert.equal(JSON.stringify(n),saved);
});

test('coupling rejects distant, parallel-track and opposite-facing vehicles',()=>{
 const p={x:100,z:50,angle:.4};assert.ok(couplingMatch(p,{...p,x:102}));
 assert.ok(!couplingMatch(p,{...p,x:140}));assert.ok(!couplingMatch(p,{...p,z:83}));
 assert.ok(!couplingMatch(p,{...p,angle:p.angle+Math.PI}));
});

test('all native adjacent body envelopes have a separating axis on the tight R249 curve',()=>{
 const kinds=Object.keys(STOCK);
 const envelope=(s,at)=>{const t=at/249,u=[-Math.sin(t),Math.cos(t)],v=[Math.cos(t),Math.sin(t)],shift=(s.front??s.length/2)-s.length/2;return {c:[249*Math.cos(t)+u[0]*shift,249*Math.sin(t)+u[1]*shift],u,v,l:s.length/2,w:Math.max(s.width,20)/2};};
 for(const a of kinds)for(const b of kinds){
  const first=buildStock(a),second=buildStock(b),spacing=consistLayout([first.userData,second.userData]).offsets[1],p=envelope(STOCK[a],0),q=envelope(STOCK[b],-spacing);
  const dot=(a,b)=>a[0]*b[0]+a[1]*b[1];
  const separated=[p.u,p.v,q.u,q.v].some(axis=>Math.abs(dot([q.c[0]-p.c[0],q.c[1]-p.c[1]],axis))>p.l*Math.abs(dot(p.u,axis))+p.w*Math.abs(dot(p.v,axis))+q.l*Math.abs(dot(q.u,axis))+q.w*Math.abs(dot(q.v,axis)));
  assert.ok(separated,`${a}/${b}`);
 }
});
