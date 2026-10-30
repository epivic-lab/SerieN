import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createNetwork,sample} from '../src/network.js';
import {Journey,routing} from '../src/simulation.js';
import {layoutFor} from '../src/railway-state.js';
import {createSwitchTopology} from '../src/next-switch.js';
import {createTurnoutModel,TURNOUT_IDS} from '../src/turnout-routes.js';
import {turnoutArrowView} from '../src/turnout-arrow-view.js';
import {turnoutArrowApproaches} from '../src/turnout-arrow-approaches.js';
import {createTurnoutArrows,arrowGeometry,ARROW_CONFIG} from '../src/turnout-arrows.js';
const n=createNetwork(),model=createTurnoutModel(n),topology=createSwitchTopology(n,n.controllers);
const single={false:{A:'AB',B:'AB',C:null},true:{A:'AC',B:null,C:'AC'}};
const cross={false:{UL:'upper',UR:'upper',LL:'lower',LR:'lower'},true:{UL:'down',LR:'down',LL:'up',UR:'up'}};
for(const control of n.controllers)for(const on of [false,true])test(`${control.id}/${on}: arrows match physical port oracle and both travel directions`,()=>{
 const before=JSON.stringify(n),expected=control.kind==='cross'?(on?['down','up']:['upper','lower']).map(p=>`${control.id}:${p}`):[`${control.sourceId}:${on?'AC':'AB'}`];
 const idle=turnoutArrowView(model,control.id,on);assert.deepEqual(idle.paths.map(p=>p.path.edge),expected);assert.ok(idle.paths.every(p=>p.sign===0));
 for(const [port,node] of Object.entries(control.ports))for(const incoming of n.nodes[node].filter(p=>!control.internal.includes(p.edge))){
  const edge=n.edges[incoming.edge],choose=routing(n,id=>id===control.id?on:id===edge.switchId?edge.requiredState:false),a={controlId:control.id,incomingEdge:edge.id,incomingEnd:incoming.end,distance:10};
  const view=turnoutArrowView(model,control.id,on,[a],choose),suffix=(control.kind==='cross'?cross:single)[on][port];
  assert.equal(view.unknown,false);assert.deepEqual(view.paths.map(p=>p.path.edge),expected);
  if(suffix){const item=view.paths.find(p=>p.path.edge===`${control.kind==='cross'?control.id:control.sourceId}:${suffix}`);assert.ok(item);assert.equal(item.sign,n.edges[item.path.edge].from===node?1:-1);}
  else assert.ok(view.paths.every(p=>p.sign===0));
 }
 for(const item of idle.paths){const geometry=arrowGeometry(item.path),position=geometry.attributes.position.array,uv=geometry.attributes.uv.array,role=geometry.attributes.role.array;
  assert.ok([...position,...uv,...role].every(Number.isFinite));
  for(let i=0;i<role.length;i+=6)if(role[i]===0){const centre={x:(position[i*3]+position[(i+1)*3])/2,z:(position[i*3+2]+position[(i+1)*3+2])/2},point=sample(n.edges[item.path.edge],uv[i*2+1]*n.edges[item.path.edge].length);assert.ok(Math.hypot(centre.x-point.x,centre.z-point.z)<.001,'shaft follows exact canonical polyline');}
  assert.deepEqual(new Set(role),new Set([0,1,2]));geometry.dispose();
 }
 assert.equal(JSON.stringify(n),before);
});
test('unknown selection/network entry suppresses routes; blocked branch retains only actual selected paths; conflicting arrivals use bidirectional heads',()=>{
 assert.equal(turnoutArrowView(model,'WX-A',null).paths.length,0);
 const a={controlId:'WX-A',incomingEdge:'missing',incomingEnd:0,distance:1};assert.equal(turnoutArrowView(model,'WX-A',false,[a],()=>null).paths.length,0);
 const c=n.controllers.find(c=>c.id==='WX-A'),entries=['UL','UR'].map(port=>{const p=n.nodes[c.ports[port]].find(p=>!c.internal.includes(p.edge));return {controlId:c.id,incomingEdge:p.edge,incomingEnd:p.end,distance:10};});
 const view=turnoutArrowView(model,'WX-A',false,entries,routing(n,()=>false));assert.equal(view.paths.find(p=>p.path.edge==='WX-A:upper').sign,0);
 for(const id of ['x',NaN,{}])assert.throws(()=>turnoutArrowView(model,id,false),RangeError);
 assert.throws(()=>turnoutArrowView(model,'WX-A',false,[{...a,distance:NaN}]),RangeError);
});
test('read-only approach observes actual velocity and last wagon for reverse, independent of commanded direction',()=>{
 const control=n.controllers.find(c=>c.id==='WX-B');
 for(const port of ['UL','UR','LL','LR']){const p=n.nodes[control.ports[port]].find(p=>!control.internal.includes(p.edge)),edge=n.edges[p.edge],direction=p.end?1:-1;
  const group={userData:{couplers:{front:{x:10},back:{x:-10}},stock:{length:18}}},j=new Journey(n,edge.id,p.end?edge.length-50:50),train={group,carObjs:[{userData:structuredClone(group.userData)}],journey:j,velocity:direction*30,dir:-direction};
  const before=JSON.stringify(j),choose=routing(n,()=>false),a=turnoutArrowApproaches({network:n,topology,trains:[train],choose});assert.ok(a.some(e=>e.controlId==='WX-B'&&e.incomingEdge===edge.id&&e.incomingEnd===p.end));assert.equal(JSON.stringify(j),before);const actual=a.find(e=>e.controlId==='WX-B');assert.ok(Math.abs(actual.distance-(50-(direction<0?layoutFor(train).offsets[1]:0)-10))<1e-7);
  train.velocity=0;assert.deepEqual(turnoutArrowApproaches({network:n,topology,trains:[train],choose}),[]);
 }
 assert.throws(()=>turnoutArrowApproaches({network:n,topology,trains:[],choose:()=>null,maxDistance:NaN}),RangeError);
});
test('cached renderer animates state change, keeps refused/no-change idle, reduced motion settles, and releases every resource once',()=>{
 const scene=new THREE.Scene(),states=new Map(TURNOUT_IDS.map(id=>[id,false]));let scans=0;
 const arrows=createTurnoutArrows(scene,model,{getState:id=>states.get(id),getApproaches:()=>{scans++;return [];},now:()=>0});
 arrows.update(0);assert.equal(arrows.snapshot.units.reduce((s,u)=>s+u.paths.length,0),10);assert.ok(arrows.snapshot.units.every(u=>u.progress===1));
 const geometries=arrows.root.children.map(m=>m.geometry);arrows.update(10);assert.equal(scans,1);
 states.set('WX-A',true);arrows.update(20);let wx=arrows.snapshot.units.find(u=>u.id==='WX-A');assert.equal(wx.progress,0);assert.deepEqual(wx.paths.map(p=>p.edge),['WX-A:down','WX-A:up']);
 arrows.update(190);wx=arrows.snapshot.units.find(u=>u.id==='WX-A');assert.ok(Math.abs(wx.progress-.5)<1e-8);
 arrows.update(360);assert.equal(arrows.snapshot.units.find(u=>u.id==='WX-A').opacity,ARROW_CONFIG.idleOpacity);
 states.set('Y-IN',true);arrows.setReducedMotion(true);arrows.update(400);assert.ok(arrows.snapshot.units.every(u=>u.progress===1));
 assert.deepEqual(arrows.root.children.map(m=>m.geometry),geometries);assert.ok(arrows.root.children.every(m=>m.material.depthTest&&!m.material.depthWrite));
 let g=0,m=0;for(const mesh of arrows.root.children)mesh.geometry.addEventListener('dispose',()=>g++);for(const material of new Set(arrows.root.children.map(m=>m.material)))material.addEventListener('dispose',()=>m++);
 assert.deepEqual(new THREE.Raycaster().intersectObject(arrows.root,true),[]);
 for(const t of [NaN,-1,Infinity])assert.throws(()=>arrows.update(t),RangeError);assert.throws(()=>arrows.setReducedMotion(1),TypeError);assert.throws(()=>arrows.update(500,1),TypeError);
 arrows.dispose();arrows.dispose();arrows.update(500);assert.equal(g,20);assert.equal(m,8);assert.equal(scene.children.length,0);
});
