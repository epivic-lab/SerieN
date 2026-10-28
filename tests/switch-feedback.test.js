import test from 'node:test';import assert from 'node:assert/strict';
import {createSwitchFeedback} from '../src/switch-feedback.js';
const normal={},diverging={},highlight={};
test('only the hovered indicator flashes orange; actual switch positions never change',()=>{
  const switches=Array.from({length:8},(_,i)=>({id:'S'+i,on:i%2===0,bulb:{material:null}}));let now=1000;
  const before=switches.map(s=>s.on),feedback=createSwitchFeedback(switches,{normal,diverging,highlight},()=>now);
  feedback.hover('S3');assert.equal(switches[3].bulb.material,highlight);
  assert.equal(switches.filter(s=>s.bulb.material===highlight).length,1);
  now+=400;feedback.update();assert.equal(switches[3].bulb.material,normal);
  now+=350;feedback.update();assert.equal(switches[3].bulb.material,highlight);
  assert.deepEqual(switches.map(s=>s.on),before);
  feedback.hover('S2');assert.equal(switches[3].bulb.material,normal);assert.equal(switches[2].bulb.material,highlight);
  feedback.hover(null);assert.equal(switches[2].bulb.material,diverging);assert.equal(feedback.active,null);
});
test('leaving a control restores its current state, including a state changed while hovering',()=>{
  const sw={id:'A',on:false,bulb:{}};const feedback=createSwitchFeedback([sw],{normal,diverging,highlight},()=>10);
  feedback.hover('A');sw.on=true;feedback.dispose();assert.equal(sw.bulb.material,diverging);
  assert.throws(()=>feedback.hover('unknown'),/Unknown switch/);
});
