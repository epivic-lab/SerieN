import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createTurnoutFocus,createPointerIntent,mountTurnoutInteraction} from '../src/turnout-interaction.js';
import {TURNOUT_IDS} from '../src/turnout-routes.js';
const event=(overrides={})=>({pointerId:1,clientX:10,clientY:20,pointerType:'mouse',button:0,buttons:1,isPrimary:true,...overrides});
test('all eight identities synchronize with deterministic focus/hover priority and never own route state',()=>{
  const changes=[],focus=createTurnoutFocus((id,source)=>changes.push({id,source}));
  for(const id of TURNOUT_IDS){focus.set('device',id);assert.equal(focus.active,id);focus.clear();}
  focus.set('device','WX-A');focus.set('panel','Y-2');assert.equal(focus.active,'Y-2');
  focus.set('keyboard','WX-B');assert.equal(focus.active,'WX-B');focus.set('keyboard',null);assert.equal(focus.active,'Y-2');
  focus.set('panel',null);assert.equal(focus.active,'WX-A');
  for(const id of [NaN,Infinity,0,{},'constructor','WX-C'])assert.equal(focus.set('device',id),false);
  assert.equal(focus.set('__proto__','WX-A'),false);assert.equal(focus.active,'WX-A');focus.clear();assert.equal(focus.active,null);
  assert.ok(changes.length>0);
});
test('mouse, pen and touch intentional single taps are accepted; a release without press is inert',()=>{
  for(const pointerType of ['mouse','pen','touch']){
    const p=createPointerIntent();assert.equal(p.up(event({pointerType})),false);
    p.down(event({pointerType}));p.move(event({pointerType,clientX:12}));assert.equal(p.up(event({pointerType,clientX:12})),true);
    assert.equal(p.up(event({pointerType})),false);
  }
});
test('out-and-back drag, swipe, multitouch, cancellation, blur and nonfinite/unmatched inputs cannot actuate',()=>{
  for(const pointerType of ['mouse','touch']){
    const p=createPointerIntent();p.down(event({pointerType}));p.move(event({pointerType,clientX:40}));p.move(event({pointerType}));assert.equal(p.up(event({pointerType})),false);
    p.down(event({pointerType}));p.down(event({pointerType,pointerId:2,isPrimary:false}));assert.equal(p.up(event({pointerType,pointerId:2})),false);assert.equal(p.up(event({pointerType})),false);
    p.down(event({pointerType}));p.cancel(1);assert.equal(p.up(event({pointerType})),false);
    p.down(event({pointerType}));p.clear();assert.equal(p.up(event({pointerType})),false);
    p.down(event({pointerType}));assert.equal(p.up(event({pointerType,pointerId:2})),false);p.cancel(1);
  }
  for(const patch of [{button:2},{isPrimary:false},{clientX:NaN},{clientY:Infinity},{pointerId:NaN},{pointerType:'unknown'}]){
    const p=createPointerIntent();p.down(event(patch));assert.equal(p.up(event()),false);
  }
  const p=createPointerIntent();p.down(event());p.move(event({buttons:0}));assert.equal(p.up(event()),false);
});
test('one hundred mount/dispose cycles leave no listener, RAF, cursor, identity or event-response residue',()=>{
  class Target extends EventTarget {
    constructor(){super();this.entries=[];this.style={cursor:'crosshair'};this.dataset={};this.classList={toggle(){}};}
    addEventListener(type,fn,options){super.addEventListener(type,fn,options);this.entries.push({type,fn,options});}
    removeEventListener(type,fn,options){super.removeEventListener(type,fn,options);this.entries=this.entries.filter(e=>e.type!==type||e.fn!==fn);}
  }
  const doc=new Target(),canvas=new Target(),controls=new Target(),cells=TURNOUT_IDS.map(()=>new Target()),frames=new Map();let serial=0;
  const win=new Target();win.requestAnimationFrame=fn=>{frames.set(++serial,fn);return serial;};win.cancelAnimationFrame=id=>frames.delete(id);
  canvas.ownerDocument=doc;doc.defaultView=win;doc.hidden=false;let requests=0;
  const picker={root:new THREE.Group(),pick:()=>{throw Error('must not raycast disposed interaction');}};
  for(let i=0;i<100;i++){
    const mounted=mountTurnoutInteraction({canvas,controls,camera:new THREE.PerspectiveCamera(),scene:new THREE.Scene(),picker,
      panel:{querySelectorAll:()=>cells},controlIds:TURNOUT_IDS,requestToggle:()=>requests++,selectTrain:()=>requests++});
    const move=new Event('pointermove');Object.assign(move,event());canvas.dispatchEvent(move);assert.equal(frames.size,1);
    mounted.dispose();mounted.dispose();assert.equal(frames.size,0);assert.equal(mounted.active,null);assert.equal(canvas.style.cursor,'crosshair');
    for(const target of [doc,win,canvas,controls,...cells])assert.equal(target.entries.length,0);
    canvas.dispatchEvent(move);
  }
  assert.equal(requests,0);
});

test('a released pending capture cannot click; only confirmed captures can actuate, and capture loss aborts them',()=>{
  const canvas=new EventTarget(),doc=new EventTarget(),controls=new EventTarget();let count=0;
  Object.assign(canvas,{ownerDocument:doc,style:{cursor:''},dataset:{},setPointerCapture(){},hasPointerCapture(){return false;},
    getBoundingClientRect:()=>({left:0,top:0,right:100,bottom:100,width:100,height:100})});
  Object.assign(doc,{defaultView:Object.assign(new EventTarget(),{requestAnimationFrame:()=>1,cancelAnimationFrame(){}}),hidden:false,elementFromPoint:()=>canvas});
  const mounted=mountTurnoutInteraction({canvas,doc,controls,camera:new THREE.PerspectiveCamera(),scene:new THREE.Scene(),
    picker:{root:new THREE.Group(),pick:()=>({kind:'turnout',id:'WX-A'})},panel:{querySelectorAll:()=>[]},controlIds:[],
    requestToggle:()=>count++,selectTrain:()=>{throw Error('not a locomotive');}});
  const send=type=>{const e=new Event(type);Object.assign(e,event());canvas.dispatchEvent(e);};
  send('pointerdown');send('pointerup');assert.equal(count,0);
  send('pointerdown');send('gotpointercapture');send('pointerup');assert.equal(count,1);
  send('pointerdown');send('gotpointercapture');send('lostpointercapture');send('pointerup');assert.equal(count,1);
  mounted.dispose();
});

test('optional brief touch identity expires and its timer is cancelled on teardown; invalid duration adds no listeners',()=>{
  const canvas=new EventTarget(),doc=new EventTarget(),controls=new EventTarget(),timers=new Map();let serial=0,requests=0;
  const win=Object.assign(new EventTarget(),{requestAnimationFrame:()=>1,cancelAnimationFrame(){},
    setTimeout:fn=>{timers.set(++serial,fn);return serial;},clearTimeout:id=>timers.delete(id)});
  Object.assign(doc,{defaultView:win,hidden:false,elementFromPoint:()=>canvas});
  Object.assign(canvas,{ownerDocument:doc,style:{cursor:''},dataset:{},setPointerCapture(){},hasPointerCapture(){return false;},
    getBoundingClientRect:()=>({left:0,top:0,right:100,bottom:100,width:100,height:100})});
  const config={canvas,controls,camera:new THREE.PerspectiveCamera(),scene:new THREE.Scene(),
    picker:{root:new THREE.Group(),pick:()=>({kind:'turnout',id:'WX-A'})},panel:{querySelectorAll:()=>[]},controlIds:[],
    requestToggle:()=>requests++,selectTrain(){},touchIdentifyMs:1100};
  for(const n of [NaN,Infinity,-1,6000,'1100'])assert.throws(()=>mountTurnoutInteraction({...config,touchIdentifyMs:n}),RangeError);
  const mounted=mountTurnoutInteraction(config);
  const send=type=>{const e=new Event(type);Object.assign(e,event({pointerType:'touch'}));canvas.dispatchEvent(e);};
  send('pointerdown');send('gotpointercapture');send('pointerup');assert.equal(mounted.active,'WX-A');assert.equal(requests,1);assert.equal(timers.size,1);
  for(const [id,fn] of timers){timers.delete(id);fn();}assert.equal(mounted.active,null);
  send('pointerdown');send('gotpointercapture');send('pointerup');mounted.dispose();assert.equal(timers.size,0);assert.equal(mounted.active,null);
});
