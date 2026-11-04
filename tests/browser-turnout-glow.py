"""S3 real input identity, reduced motion, depth occlusion and GPU lifecycle.
Uses a temporary S3 profiling bundle; no diagnostic hooks are installed in dist.
"""
import os,json,base64
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('S3_OUTPUT','turnout-s3-browser'));out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':960,'height':820});errors=[];failed=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);page.on('requestfailed',lambda r:failed.append(r.url))
 page.add_init_script('''window.__motionListeners={add:0,remove:0};for(const method of ['addEventListener','removeEventListener']){const original=MediaQueryList.prototype[method];MediaQueryList.prototype[method]=function(type,...args){if(type==='change'&&this.media.includes('prefers-reduced-motion'))__motionListeners[method==='addEventListener'?'add':'remove']++;return original.call(this,type,...args);};}''')
 page.route('**/dist/game.js*',lambda r:r.fulfill(path=os.environ['S3_BUNDLE'],content_type='application/javascript'))
 page.goto(os.environ.get('SERIEN_URL','http://127.0.0.1:8003/')+'?diagnostics=1',wait_until='domcontentloaded',timeout=120000);page.wait_for_function('__s3',timeout=180000)
 page.evaluate('''()=>{const p=__serienProfile,g=__s3.glow,api=__serienDiagnostics,T=__s3.THREE,$=id=>document.getElementById(id);p.stop();$('pause').click();$('quality').value='low';$('quality').dispatchEvent(new Event('change'));
 window.__setup=()=>{api.setSwitches([]);['T12','T0','T16'].forEach((edge,id)=>api.placeTrain(id,edge,150));api.step(0);__s3.interaction.clear();g.update(performance.now()+200);};
 window.__state=()=>{const s=api.snapshot();return {controls:s.switchIndicators.states.map(c=>[c.id,c.on]),stock:s.stock.map(t=>({journey:t.journey,speed:t.speed,velocity:t.velocity,dir:t.dir,odometer:t.odometer}))};};
 window.__settle=()=>{g.update(performance.now()+250);p.effects.render(false);p.renderer.getContext().finish();return g.snapshot;};
 window.__aim=id=>{const c=p.network.controllers.find(c=>c.id===id),e=p.network.edges[c.internal[0]],a=e.points[0],b=e.points.at(-1),x=(a.x+b.x)/2,z=(a.z+b.z)/2;p.controls.enableDamping=false;p.controls.target.set(x,6.08,z);p.camera.position.set(x+100,306.08,z+150);p.camera.zoom=1;p.camera.updateProjectionMatrix();p.controls.update();p.camera.updateMatrixWorld();const v=new T.Vector3(x,6.08,z).project(p.camera),r=p.renderer.domElement.getBoundingClientRect();return {x:r.left+(v.x+1)/2*r.width,y:r.top+(1-v.y)/2*r.height};};
 __setup();}''')
 ids=page.evaluate('__serienDiagnostics.indicatorState().states.map(c=>c.id)');cases=[]
 for variant in ['A','B']:
  page.evaluate('v=>__s3.glow.setVariant(v)',variant)
  for index,id in enumerate(ids):
   page.evaluate('__setup()');before=page.evaluate('__state()');page.locator(f'[data-switch-hover="{index}"]').hover();snap=page.evaluate('__settle()')
   assert snap['active']==id and snap['visibleDevices']==[id] and snap['gain']>0,(variant,id,snap)
   point=page.evaluate('__aim',id);page.mouse.move(point['x'],point['y']);page.wait_for_function('id=>__serienDiagnostics.turnoutGlowState().active===id',arg=id,timeout=30000)
   snap=page.evaluate('__settle()');assert snap['visibleDevices']==[id];assert page.evaluate('__state()')==before
   assert page.locator(f'[data-switch-hover="{index}"]').evaluate('e=>e.classList.contains("is-identified")')
   cases.append([variant,id]);print('hover',variant,id,'PASS',flush=True)
 # All eight are keyboard-identifiable, without route mutations.
 keyboard=[]
 for index,id in enumerate(ids):
  before=page.evaluate('__state()');page.keyboard.press('Tab');page.locator(f'[data-switch="{index}"]').focus();assert page.evaluate('__serienDiagnostics.turnoutGlowState().active')==id;assert page.evaluate('__state()')==before;keyboard.append(id)
 # The real media preference reaches the shader, not merely a test parameter.
 page.emulate_media(reduced_motion='reduce');page.wait_for_function('__serienDiagnostics.turnoutGlowState().reducedMotion')
 frames=[]
 for delta in [300,1000]:
  value=page.evaluate('''delta=>{__s3.glow.update(performance.now()+delta);__serienProfile.effects.render(false);__serienProfile.renderer.getContext().finish();return {gain:__s3.glow.snapshot.gain,png:__serienProfile.renderer.domElement.toDataURL()};}''',delta);frames.append(value)
 assert frames[0]==frames[1],'Reduced motion must render exactly the same settled image'
 page.emulate_media(reduced_motion='no-preference');page.wait_for_function('!__serienDiagnostics.turnoutGlowState().reducedMotion')
 # Protected switch still identifies. Native disabled button cannot bypass the dispatcher.
 page.evaluate('''()=>{__setup();document.querySelector('[data-train="0"]').click();for(let i=0;i<5;i++)document.getElementById('uncouple').click();__serienDiagnostics.placeTrain(0,'TO4:AB',100);}''')
 assert page.locator('[data-switch="7"]').is_disabled();before=page.evaluate('__state()');page.locator('[data-switch-hover="7"]').hover();snap=page.evaluate('__settle()');assert snap['active']=='Y-4' and snap['visible']
 rejected=page.evaluate("['panel','device'].map(origin=>__serienDiagnostics.requestToggle('Y-4',origin))");assert all(not r['changed'] and r['reason']=='occupied' for r in rejected);assert page.evaluate('__state()')==before
 # Touch tap keeps S2's single guarded change and adds only a brief identity.
 cdp=page.context.new_cdp_session(page);cdp.send('Emulation.setTouchEmulationEnabled',{'enabled':True,'maxTouchPoints':5});page.evaluate('__setup()');point=page.evaluate("__aim('WX-A')")
 t={'id':10,'x':point['x'],'y':point['y']};cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[t]});cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
 touch=page.evaluate('({glow:__serienDiagnostics.turnoutGlowState(),state:__state()})');assert touch['glow']['active']=='WX-A';assert dict(touch['state']['controls'])['WX-A'] is True
 page.wait_for_function('__serienDiagnostics.turnoutGlowState().active===null',timeout=10000)
 page.evaluate('__setup()');point=page.evaluate("__aim('WX-B')");before=page.evaluate('__state()');t={'id':11,'x':point['x'],'y':point['y']}
 cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[t]});cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{**t,'x':t['x']+45}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[t]});cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});assert page.evaluate('__state()')==before
 cdp.send('Emulation.setTouchEmulationEnabled',{'enabled':False})
 # Opaque depth must win even when the glow is explicitly active behind it.
 occlusion=page.evaluate('''()=>{__setup();__aim('Y-IN');const p=__serienProfile,T=__s3.THREE,g=__s3.glow,c=p.network.controllers.find(c=>c.id==='Y-IN');const box=new T.Mesh(new T.BoxGeometry(500,50,500),new T.MeshBasicMaterial({color:'#655b4c'}));box.position.set(c.x,35,c.z);p.scene.add(box);
 const render=()=>{p.effects.render(false);p.renderer.getContext().finish();return p.renderer.domElement.toDataURL();};g.identify(null,0);g.update(200);const off=render();g.identify('Y-IN',0);g.update(700);const on=render();box.removeFromParent();box.geometry.dispose();box.material.dispose();return off===on;}''');assert occlusion,'Glow visible through solid scenery'
 # Compile both styles in High/day and High/night, using the existing renderer.
 for variant in ['A','B']:
  for day in [48,95]:page.evaluate('''({variant,day})=>{const $=id=>document.getElementById(id);$('quality').value='high';$('quality').dispatchEvent(new Event('change'));$('day').value=day;$('day').dispatchEvent(new Event('input'));__serienProfile.renderFixed();__s3.glow.setVariant(variant);__s3.glow.identify('WX-B',0);__s3.glow.update(700);__serienProfile.effects.render(false);}''',dict(variant=variant,day=day))
 # Warm all devices once; repeated style/identity cycles reuse GPU resources.
 resources=page.evaluate('''()=>{const p=__serienProfile,g=__s3.glow,ids=__serienDiagnostics.indicatorState().states.map(c=>c.id);document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'));p.renderFixed();
 const warm=()=>{for(const id of ids){g.identify(null,0);g.update(200);g.identify(id,0);g.update(700);p.effects.render(false);}p.renderer.getContext().finish();};warm();const before={...p.renderer.info.memory,programs:p.renderer.info.programs.length};
 for(let i=0;i<3;i++){g.setVariant(i%2?'A':'B');warm();}const after={...p.renderer.info.memory,programs:p.renderer.info.programs.length};let geometryDisposals=0,materialDisposals=0;g.root.children.forEach(m=>m.geometry.addEventListener('dispose',()=>geometryDisposals++));g.root.children[0].material.addEventListener('dispose',()=>materialDisposals++);
 g.dispose();g.dispose();p.effects.render(false);p.renderer.getContext().finish();return {before,after,disposed:{...p.renderer.info.memory,programs:p.renderer.info.programs.length},geometryDisposals,materialDisposals,removed:g.root.parent===null};}''')
 assert resources['before']==resources['after'],resources
 assert resources['geometryDisposals']==8 and resources['materialDisposals']==1 and resources['removed']
 assert resources['disposed']['geometries']==resources['after']['geometries']-8,resources
 listenerBefore=page.evaluate('__motionListeners');assert listenerBefore['add']==1 and listenerBefore['remove']==0
 page.evaluate("window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:false}))")
 listenerAfter=page.evaluate('__motionListeners');assert listenerAfter=={'add':1,'remove':1}
 result={'result':'PASS','hoverPairs':cases,'keyboard':keyboard,'reducedMotionExact':True,'protectedGlowAndRejection':True,'touchTapIdentifiesAndTogglesOnce':True,'touchSwipeDoesNotToggle':True,'opaqueDepthOcclusionExact':occlusion,'highDayNightBothStyles':True,'resources':resources,'mediaListeners':listenerAfter,'errors':errors,'failedRequests':failed,'physicalGPUAndTouch':'NOT VERIFIED; Chromium/SwiftShader and CDP emulation'}
 assert not errors and not failed,result
 (out/'glow-browser.json').write_text(json.dumps(result,indent=2)+'\n');print('S3 glow browser PASS',flush=True);b.close()
