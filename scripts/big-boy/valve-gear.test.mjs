import test from 'node:test';
import assert from 'node:assert/strict';
import {solveValveGear,VALVE_GEAR} from './valve-gear.mjs';
const dist=(a,b)=>Math.hypot(a.s-b.s,a.h-b.h);
test('all fixed lengths close through 1440 phases and both directions independently',()=>{
 let last=null,max=0;
 for(let i=0;i<=1440;i++){
  const phase=i*Math.PI/720,p=solveValveGear(phase,2.5167,5.48);
  for(const [a,b,length] of [['C','Q',21.35],['E','P',12.1],['F','P',2.8],['D','U',14.5],['K','B',4.3],['B','U',5.45]])assert.ok(Math.abs(dist(p[a],p[b])-length)<1e-8);
  assert.equal(p.Q.h,5.2);assert.equal(p.V.h,8.8);assert.equal(p.K.s,p.Q.s);
  assert.ok(p.P.h<p.F.h);assert.ok(p.B.s>p.K.s);
  if(last)for(const k of ['Q','P','B','U','V'])assert.ok(dist(p[k],last[k])<.05,'continuous '+k);
  const reverse=solveValveGear(phase-2*Math.PI,2.5167,5.48);for(const k of ['C','Q','P','B','U','V'])assert.ok(dist(p[k],reverse[k])<1e-8);
  max=Math.max(max,p.residual);last=p;
 }
 assert.ok(max<1e-8);
});
test('invalid or unreachable geometry fails instead of emitting a broken pose',()=>{
 for(const angle of [NaN,Infinity])assert.throws(()=>solveValveGear(angle,2.5,5.48));
 assert.throws(()=>solveValveGear(0,-1,5.48));
 assert.throws(()=>solveValveGear(Math.PI/2,2.5,5.48,{...VALVE_GEAR,mainRod:.1}));
 assert.throws(()=>solveValveGear(0,2.5,5.48,{...VALVE_GEAR,eccentricRod:.1}));
});
