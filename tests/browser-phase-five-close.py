"""5C acceptance matrix against the production engine, controls and renderer.
Outputs in the caller's cwd; requires the built site at SERIEN_URL (8000).
"""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('docs/phase-5c-close');out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':650,'height':760});errors=[];failed=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('requestfailed',lambda r:failed.append(r.url))
 page.goto(os.environ.get('SERIEN_URL','http://127.0.0.1:8000/')+'?diagnostics=1',wait_until='domcontentloaded',timeout=120000)
 page.wait_for_function('window.__serienDiagnostics!==undefined',timeout=120000)
 page.evaluate("document.getElementById('pause').click();document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'));window.confirm=()=>true")
 page.wait_for_function("[...document.querySelectorAll('.locomotiveThumbnail')].every(i=>i.complete&&i.naturalWidth===320)",timeout=90000)
 page.evaluate('''async()=>{
 const api=__serienDiagnostics,$=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)],check=(ok,msg)=>{if(!ok)throw Error(msg)};
 const snap=()=>api.snapshot(),select=id=>$('[data-train="'+id+'"]').click(),speed=(id,value)=>{select(id);$('#speed').value=value;$('#speed').dispatchEvent(new Event('input'));};
 const command=(id,name)=>{select(id);$('#'+name).click();};
 const reset=()=>{$('#reset').click();$('#pause').click();api.step(0);};
 const bare=id=>{select(id);for(let i=0;i<5;i++)$('#uncouple').click();};
 // This independent straight-track metric uses actual coupler endpoints, not
 // the production conflict predicate or its stop decision.
 const straightGap=(a,b)=>Math.min(...a.vehicles.flatMap(p=>b.vehicles.map(q=>{
  const left=p.x<q.x?p:q,right=p.x<q.x?q:p;
  return right.x-left.x-(left.couplers?.front?.x??38)+(right.couplers?.back?.x??-38);
 })));
 const sync=()=>{const s=snap();for(const card of all('.trainConsole')){
  const t=s.stock[+card.dataset.consoleTrain],marker=card.querySelector('.trainMapMarker'),v=t.vehicles[0];
  check(Math.abs(+marker.getAttribute('cx')-v.x)<1e-8&&Math.abs(+marker.getAttribute('cy')-v.z)<1e-8,'SVG/engine sync');
  check(+card.querySelector('input').value===t.speed,'console speed sync');
 }for(const t of s.stock)for(const v of t.vehicles)check(Math.hypot(v.x-v.rendered.x,v.z-v.rendered.z)<1e-8,'mesh/engine sync');
 check($('.nextSwitchTrain').textContent===s.stock[s.consoles.active].name,'actual HUD train identity');
 if(s.nextSwitch.site){
  check($('.nextSwitchName').textContent===s.nextSwitch.name,'actual HUD switch name');
  const label=$('.nextSwitchDistance').textContent.match(/^([0-9.]+) (mm|m)/);check(label,'actual HUD distance label');
  const mm=+label[1]*(label[2]==='m'?1000:1);check(Math.abs(mm-s.nextSwitch.distance)<(label[2]==='m'?5.00001:.50001),'actual HUD graph distance');
  if(s.nextSwitch.destination)check($('.nextSwitchDestination').textContent.includes(s.nextSwitch.destination),'actual HUD outgoing destination');
 }
 if(s.nextSwitch.safety?.blocked)check($('.nextSwitchWarning').textContent.includes(s.nextSwitch.safety.message),'actual HUD safety warning');
 };
 window.__closeHelpers={api,$,all,check,snap,select,speed,command,reset,bare,straightGap,sync};
 }''')
 # Separate evaluate calls allow evidence to be saved even if a later case fails.
 def exercise(name, script):
  result=page.evaluate('''()=>{const {api,$,all,check,snap,select,speed,command,reset,bare,straightGap,sync}=__closeHelpers;'''+script+'}')
  (out/(name+'.json')).write_text(json.dumps(result,indent=2)+'\n');print(name+': PASS',flush=True);return result
 results={}
 results['frontals']=exercise('frontals','''
 reset();bare(0);bare(2);api.placeTrain(0,'T47',200,1);api.placeTrain(2,'T46',110,-1);
 const identities=api.railwayState().identities;speed(0,100);speed(2,100);let min=Infinity,last,steps=0;
 for(;steps<240;steps++){api.step(1/60);const s=snap();last=straightGap(s.stock[0],s.stock[2]);min=Math.min(min,last);check(last>=-1e-7,'front-on envelope overlap '+last);sync();if(s.stock[0].speed===0&&s.stock[2].speed===0)break;}
 check(steps<240,'both front-on trains must stop');check(JSON.stringify(identities)===JSON.stringify(api.railwayState().identities),'front-on identities');
 return {minimumGapMm:min,stoppedGapMm:last,steps:steps+1,velocities:[snap().stock[0].velocity,snap().stock[2].velocity],sync:true};
 ''')
 results['long']=exercise('long-consists','''
 const cases=[];for(const following of [false,true]){
 reset();api.setSwitches(['Y-4']);api.placeTrain(0,'T47',220,1);api.placeTrain(2,'T46',220,following?1:-1);
 const before=api.railwayState().identities;check(straightGap(snap().stock[0],snap().stock[2])>0,'long fixture initially separate');
 speed(0,100);speed(2,following?20:100);let min=Infinity,stopped=false;
 for(let i=0;i<600;i++){api.step(1/60);const s=snap(),gap=straightGap(s.stock[0],s.stock[2]);min=Math.min(min,gap);check(gap>=-1e-7,'long consist overlap '+gap);if(s.stock[0].speed===0&&s.stock[2].speed===0){stopped=true;break;}}
 check(stopped,'long front/following stop');sync();check(JSON.stringify(before)===JSON.stringify(api.railwayState().identities),'long identities preserved');cases.push({following,minimumGapMm:min,cars:snap().stock.map(t=>t.cars.length)});
 }return cases;
 ''')
 results['switch']=exercise('detached-switch','''
 reset();api.setSwitches(['Y-4']);const offset=snap().stock[1].layout.offsets.at(-1);api.placeTrain(1,'T47',offset+5,1);
 const before=api.railwayState().identities.trains[1];command(1,'uncouple');const detachedId=api.railwayState().identities.detached[0];check(detachedId===before.at(-1),'same coach detached');
 api.placeTrain(1,'T0',150,1);api.step(0);const state=api.railwayState(),button=$('[data-switch="7"]');
 check(state.occupied.some(r=>r.edge==='TO4:AC'),'coach spans turnout joint');check(button.disabled,'detached coach locks actual UI switch');button.click();check(snap().switchIndicators.states.find(s=>s.id==='Y-4').on,'unsafe switch command rejected');
 api.placeTrain(1,'T47',offset+5,1);command(1,'couple');check(JSON.stringify(before)===JSON.stringify(api.railwayState().identities.trains[1]),'coach identity and order restored');
 api.placeTrain(1,'T0',150,1);api.step(0);check(!button.disabled,'switch unlocks after coach removal');
 return {detachedBodySpansJoint:true,actualCommandBlocked:true,unlocksAfterRemoval:true,identityAndOrder:true};
 ''')
 results['insertion']=exercise('occupied-insertion','''
 reset();api.setSwitches(['Y-4']);const offset=snap().stock[1].layout.offsets.at(-1);api.placeTrain(1,'T47',offset-5,1);command(1,'uncouple');api.placeTrain(1,'T0',150,1);api.step(0);
 check(snap().detached[0].edge==='TO4:AC','insertion coach centre on adjacent edge');const before=api.railwayState().identities;
 check(api.addTrain()===null,'body across joint must prevent overlapping insertion');check(snap().stock.length===3,'rejected insertion creates no train');check(JSON.stringify(before)===JSON.stringify(api.railwayState().identities),'rejected insertion preserves all groups');
 return {adjacentEdgeCentre:true,insertionRejected:true,noLostOrCreatedVehicles:true};
 ''')
 results['approach']=exercise('switch-approach','''
 reset();bare(2);api.setSwitches(['Y-4']);api.placeTrain(2,'T47',140,-1);select(2);api.step(0);const button=$('[data-switch="7"]');check(!button.disabled,'clear switch initially unlocked');
 speed(2,100);api.step(1.3);const state=snap();check(button.disabled&&button.title.includes('approaching'),'moving approach guard');const previous=state.switchIndicators.states.find(s=>s.id==='Y-4').on;button.click();check(snap().switchIndicators.states.find(s=>s.id==='Y-4').on===previous,'approach toggle rejected');
 check(state.nextSwitch.site==='Y-4'&&state.nextSwitch.distance<140&&state.nextSwitch.safety.kind==='approaching','HUD uses actual approach');sync();
 return {blocked:true,hud:state.nextSwitch,velocity:state.stock[2].velocity,sync:true};
 ''')
 results['curve']=exercise('curve-coupling','''
 const cases=[];for(const edge of ['T0','T12','T16']){
 reset();api.placeTrain(0,edge,120,1);const before=api.railwayState().identities,initial=snap().stock[0].layout;command(0,'uncouple');
 check(api.railwayState().identities.detached[0]===before.trains[0].at(-1),'curve detach identity');
 speed(0,35);api.step(2);command(0,'stop');command(0,'reverse');speed(0,35);
 for(let i=0;i<240;i++){api.step(1/60);if(snap().stock[0].speed===0)break;}
 command(0,'stop');command(0,'couple');check(snap().detached.length===0,'curve recoupling '+edge);check(JSON.stringify(before)===JSON.stringify(api.railwayState().identities),'all vehicle identity/order conservation '+edge);check(JSON.stringify(initial)===JSON.stringify(snap().stock[0].layout),'curve layout restored');sync();cases.push({edge,allIdentitiesRestored:true,layout:true,sync:true});
 }return cases;
 ''')
 results['frames']=exercise('frame-rates','''
 const sequences=[Array(240).fill(1/20),Array(720).fill(1/60),Array(1440).fill(1/120),Array.from({length:120},()=>[1/120,1/40,1/15]).flat()];const outcomes=[];
 for(const frames of sequences){
 reset();bare(0);bare(2);api.placeTrain(0,'T47',200,1);api.placeTrain(2,'T46',110,-1);command(1,'reverse');[0,1,2].forEach(id=>speed(id,id===1?30:100));api.frames(frames);sync();const s=snap();
 outcomes.push({stock:s.stock.map(t=>({speed:t.speed,velocity:t.velocity,dir:t.dir,journey:t.journey,odometer:t.odometer,layout:t.layout,vehicles:t.vehicles})),occupied:api.railwayState().occupied,hud:s.nextSwitch,cards:all('.trainConsole').map(e=>e.innerText),consoles:s.consoles});
 }
 for(const s of outcomes.slice(1))check(JSON.stringify(s)===JSON.stringify(outcomes[0]),'complete engine/UI frame-rate mismatch');
 return {rates:[20,60,120,'irregular'],seconds:12,identicalEngineOccupancyHudAndCards:true,final:outcomes[0]};
 ''')
 results['mixed']=exercise('mixed-loops','''
 reset();command(1,'reverse');[0,1,2].forEach(id=>speed(id,[45,55,65][id]));api.step(90);const state=snap();state.stock.forEach((t,id)=>{check(t.journey.travel>3500,'complete mixed-direction lap '+id);check(Math.sign(t.velocity)===(id===1?-1:1),'simultaneous mixed direction '+id);});sync();return {travelMm:state.stock.map(t=>t.journey.travel),velocities:state.stock.map(t=>t.velocity),sync:true};
 ''')
 # Confirm that a model change cannot bypass movement protection by growing
 # already-separated compact locomotives into overlapping native envelopes.
 page.evaluate("__closeHelpers.reset();__closeHelpers.bare(0);__closeHelpers.bare(2);document.getElementById('rollingModels').value='kenney';document.getElementById('rollingModels').dispatchEvent(new Event('change'))")
 page.wait_for_function('__serienDiagnostics.snapshot().stock.every(t=>t.vehicles.every(v=>v.dimensions))',timeout=90000)
 assert page.locator('#rollingModels').input_value()=='kenney','Unchanged dropped coupler contacts must not block compact mode'
 results['model']=exercise('model-clearance','''
 api.placeTrain(0,'T47',200,1);api.placeTrain(2,'T46',12,-1);api.step(0);const before=snap(),identities=api.railwayState().identities;check(straightGap(before.stock[0],before.stock[2])>0,'compact models initially separate');
 $('#rollingModels').value='native';$('#rollingModels').dispatchEvent(new Event('change'));const after=snap();check($('#rollingModels').value==='kenney','expansion into another train must be rejected');
 check(JSON.stringify(before.stock.map(t=>t.journey))===JSON.stringify(after.stock.map(t=>t.journey)),'model refusal restores all histories');check(JSON.stringify(identities)===JSON.stringify(api.railwayState().identities),'model refusal preserves groups');check(straightGap(after.stock[0],after.stock[2])>0,'rollback remains separate');sync();
 return {rejected:true,priorJourneysAndIdentities:true,minimumGapMm:straightGap(after.stock[0],after.stock[2])};
 ''')
 page.evaluate('__closeHelpers.reset()')
 page.wait_for_function('__serienDiagnostics.snapshot().stock.every(t=>t.vehicles.every(v=>v.dimensions))',timeout=90000)
 results['history']=exercise('detached-history','''
 api.setSwitches(['Y-4']);const offset=snap().stock[1].layout.offsets.at(-1);api.placeTrain(1,'T47',offset+5,1);speed(1,35);api.step(2);command(1,'stop');command(1,'uncouple');api.placeTrain(1,'T0',150,1);api.step(0);
 const button=$('[data-switch="7"]');check(!button.disabled,'compact coach clear of turnout');button.click();check(!snap().switchIndicators.states.find(s=>s.id==='Y-4').on,'legal switch change');
 const before=api.railwayState(),journeys=snap().stock.map(t=>t.journey);check(!before.occupied.some(r=>r.edge==='TO4:AC'),'compact body not on turnout');
 $('#rollingModels').value='native';$('#rollingModels').dispatchEvent(new Event('change'));
 check($('#rollingModels').value==='kenney','stale detached branch cannot be occupied by growing stock');check(JSON.stringify(journeys)===JSON.stringify(snap().stock.map(t=>t.journey)),'history refusal is atomic');
 check(!api.railwayState().occupied.some(r=>r.edge==='TO4:AC'),'no invented occupation on old branch');check(JSON.stringify(before.identities)===JSON.stringify(api.railwayState().identities),'history refusal preserves groups');sync();
 return {rejected:true,legalSwitchChange:true,noInventedOccupation:true,identitiesAndJourneysPreserved:true};
 ''')
 assert not errors,errors
 assert not failed,failed
 result={'result':'PASS','cases':list(results),'errors':errors,'failedRequests':failed,'renderer':'Chromium/SwiftShader; simulated railway envelopes only'}
 (out/'acceptance.json').write_text(json.dumps(result,indent=2)+'\n');b.close();print('5C acceptance matrix PASS',flush=True)
