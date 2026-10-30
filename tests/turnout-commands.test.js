import test from 'node:test';
import assert from 'node:assert/strict';
import {createNetwork,loopPosition} from '../src/network.js';
import {Journey,routing} from '../src/simulation.js';
import {createSwitchTopology} from '../src/next-switch.js';
import {deriveSwitchAssistance,layoutFor} from '../src/railway-state.js';
import {createTurnoutCommands} from '../src/turnout-commands.js';
import {TURNOUT_IDS} from '../src/turnout-routes.js';

const unlocked={blocked:false,kind:'unlocked'};
function fixture() {
  const network=createNetwork(),switchSpecs=network.controllers.map(c=>({...c,on:false}));
  const route=routing(network,id=>switchSpecs.find(c=>c.id===id)?.on??false);
  const vehicle=()=>({userData:{stock:{length:65,width:20},couplers:{front:{x:34.1},back:{x:-34.1}}}});
  const trains=[0,1,2].map(id=>{
    const p=loopPosition(network,id,.5),journey=new Journey(network,p.edge,p.s);
    return {id,name:'train '+id,group:vehicle(),carObjs:[],cars:0,journey,dir:1,velocity:0,speed:0,odometer:0};
  });
  return {network,switchSpecs,trains,route,detached:[],selected:0,switchTopology:createSwitchTopology(network,switchSpecs)};
}
const state=c=>JSON.stringify({controls:c.switchSpecs.map(s=>[s.id,s.on]),
  trains:c.trains.map(t=>({position:t.journey.position,segments:t.journey.segments,speed:t.speed,velocity:t.velocity,dir:t.dir,odometer:t.odometer}))});

test('panel and device apply the historical state/reconciliation transition for all eight controls and both positions',()=>{
  for(const origin of ['panel','device'])for(const id of TURNOUT_IDS)for(const on of [false,true]) {
    const current=fixture(),legacy=fixture();
    for(const c of [current,legacy])c.switchSpecs.find(s=>s.id===id).on=on;
    const identities=current.trains.map(t=>({train:t,journey:t.journey,group:t.group}));
    let reads=0;
    const commands=createTurnoutCommands({...current,getSafety:controlId=>{assert.equal(controlId,id);reads++;return unlocked;}});
    const result=commands.requestToggle(id,origin);
    legacy.switchSpecs.find(s=>s.id===id).on=!on;
    for(const t of legacy.trains)t.journey.reconcile(layoutFor(t).tail,t.group.userData.couplers.front.x,legacy.route);
    assert.deepEqual(result,{changed:true,controlId:id,origin,on:!on});
    assert.equal(state(current),state(legacy));assert.equal(reads,1);
    identities.forEach((v,i)=>{assert.equal(current.trains[i],v.train);assert.equal(current.trains[i].journey,v.journey);assert.equal(current.trains[i].group,v.group);});
  }
});

test('every safety rejection is identical on both surfaces and leaves state and Journey intact',()=>{
  const guards=[undefined,null,{blocked:true,kind:'occupied',message:'occupied'},
    {blocked:true,kind:'approaching',message:'approaching'},{blocked:true,kind:'unknown'},
    {},{blocked:NaN,kind:'unlocked'},{blocked:false,kind:'unknown'},{blocked:0,kind:'unlocked'}];
  for(const safety of guards)for(const id of TURNOUT_IDS) {
    const c=fixture(),before=state(c),commands=createTurnoutCommands({...c,getSafety:()=>safety});
    const panel=commands.requestToggle(id,'panel'),device=commands.requestToggle(id,'device');
    assert.equal(panel.changed,false);assert.equal(device.changed,false);
    assert.deepEqual({...panel,origin:null},{...device,origin:null});assert.equal(state(c),before);
  }
});

test('invalid IDs, origins and non-boolean state are rejected before asking safety or reconciling',()=>{
  const c=fixture(),commands=createTurnoutCommands({...c,getSafety:()=>{throw Error('must not consult safety');}}),before=state(c);
  for(const id of [NaN,Infinity,0,-1,null,undefined,{},'__proto__','WX-C'])assert.equal(commands.requestToggle(id,'panel').reason,'invalid-control');
  for(const origin of [undefined,null,NaN,'keyboard','diagnostics',{}])assert.equal(commands.requestToggle('WX-A',origin).reason,'invalid-origin');
  assert.equal(state(c),before);
  for(const on of [NaN,Infinity,null,undefined,0,1,'false']){
    c.switchSpecs.find(s=>s.id==='WX-A').on=on;
    assert.equal(commands.requestToggle('WX-A','device').reason,'unknown-state');
  }
});

test('fresh engine guards block occupied, detached and approaching vehicles on either command surface',()=>{
  for(const origin of ['panel','device'])for(const kind of ['occupied','detached','approaching']){
    const c=fixture(),t=c.trains[0];
    if(kind==='detached')c.detached.push({point:{edge:'TO4:AC',s:100},group:{userData:{}}});
    else {t.journey=new Journey(c.network,kind==='occupied'?'TO4:AB':'T47',100);t.velocity=kind==='approaching'?-100:0;t.dir=-1;}
    const commands=createTurnoutCommands({...c,getSafety:id=>deriveSwitchAssistance({...c,tracePoints:false}).safetyByControl.get(id)});
    const before=state(c),result=commands.requestToggle('Y-4',origin);
    assert.equal(result.changed,false);assert.equal(result.reason,kind==='approaching'?'approaching':'occupied');assert.equal(state(c),before);
  }
});

test('successive requests recheck the guard rather than reusing an unlocked snapshot',()=>{
  const c=fixture();let safety=unlocked,reads=0;
  const commands=createTurnoutCommands({...c,getSafety:()=>{reads++;return safety;}});
  assert.equal(commands.requestToggle('WX-A','panel').changed,true);
  const before=state(c);safety={blocked:true,kind:'approaching'};
  assert.equal(commands.requestToggle('WX-A','device').changed,false);
  assert.equal(state(c),before);assert.equal(reads,2);
});
