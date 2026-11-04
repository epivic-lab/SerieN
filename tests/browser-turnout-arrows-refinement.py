"""Conservative S4 review: rapid guarded commands, GPU reuse, idle pixels,
canonical device views at opposite/low angles, zoom and actual window resize.
Requires the existing temporary S4 profile, no production hooks or image edits.
"""
import base64,json,os
from pathlib import Path
from PIL import Image,ImageChops
from io import BytesIO
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('S4_REVIEW_OUTPUT','turnout-s4-review'));out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader']);page=b.new_page(viewport={'width':960,'height':820},device_scale_factor=1);errors=[];failed=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);page.on('requestfailed',lambda r:failed.append(r.url))
 page.add_init_script('let seed=516;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);')
 page.route('**/dist/game.js*',lambda r:r.fulfill(path=os.environ['S4_BUNDLE'],content_type='application/javascript'))
 page.goto(os.environ.get('SERIEN_URL','http://127.0.0.1:8003/')+'?diagnostics=1',wait_until='domcontentloaded',timeout=120000);page.wait_for_function('__s4',timeout=180000)
 page.evaluate('''()=>{const p=__serienProfile,api=__serienDiagnostics,a=__s4.arrows,$=id=>document.getElementById(id);p.stop();$('pause').click();$('quality').value='low';$('quality').dispatchEvent(new Event('change'));$('day').value=48;$('day').dispatchEvent(new Event('input'));api.setSwitches([]);['T12','T0','T16'].forEach((e,i)=>api.placeTrain(i,e,150));p.renderFixed();__s3.interaction.clear();__s3.glow.identify(null,0);__s3.glow.update(200);
 window.__reviewState=()=>a.snapshot.units.map(u=>({id:u.id,state:u.state,unknown:u.unknown,paths:u.paths}));
 window.__draw=()=>{p.effects.render(false);p.renderer.getContext().finish();return p.renderer.domElement.toDataURL().split(',')[1];};
 }''')
 assert page.evaluate('__s3.glow.snapshot.variant')=='B'
 stress=page.evaluate('''()=>{const p=__serienProfile,a=__s4.arrows,s=__s4,api=__serienDiagnostics,ids=s.switchSpecs.map(c=>c.id),original=a.root.children.map(m=>[m.geometry,m.material]);let time=performance.now(),accepted=0;
 const check=()=>{const expected=ids.flatMap(id=>s.model.read(id,s.switchSpecs.find(c=>c.id===id).on).activePaths.map(p=>p.edge)).sort(),actual=a.root.children.filter(m=>m.visible).map(m=>m.name).sort();if(JSON.stringify(expected)!==JSON.stringify(actual))throw Error('Ghost/stale route');if(a.root.children.some((m,i)=>m.geometry!==original[i][0]||m.material!==original[i][1]))throw Error('Unexpected allocation');};
 const toggle=(id,origin)=>{const result=api.requestToggle(id,origin);if(!result.changed)throw Error('Unexpected rejected fixture');a.update(time,true);const unit=a.snapshot.units.find(u=>u.id===id);if(unit.progress!==0)throw Error('Reveal did not restart');check();time+=5;accepted++;};
 for(const id of ids)toggle(id,'panel');a.update(time+500);__draw();for(const id of ids)toggle(id,'device');a.update(time+500);__draw();const before={...p.renderer.info.memory,programs:p.renderer.info.programs.length},samples=[];
 for(let cycle=0;cycle<200;cycle++){for(const id of ids)toggle(id,cycle%2?'device':'panel');if(cycle%20===19){a.update(time+500);__draw();const memory={...p.renderer.info.memory,programs:p.renderer.info.programs.length};if(JSON.stringify(memory)!==JSON.stringify(before))throw Error('GPU memory growth');samples.push(memory);time+=600;}}
 a.update(time+500);check();const settled=a.snapshot.units.every(u=>u.progress===1&&Math.abs(u.opacity-.58)<1e-8);if(!settled)throw Error('Residual animation');return {accepted,cycles:200,before,after:{...p.renderer.info.memory,programs:p.renderer.info.programs.length},samples,settled,geometryAndMaterialIdentityStable:true,actualVisiblePathsCheckedAfterEveryCommand:true};}''')
 (out/'review-progress.json').write_text(json.dumps({'stress':stress},indent=2)+'\n')
 print('rapid commands/GPU reuse PASS',stress['accepted'],flush=True)
 views=[]
 for id in ['Y-IN','WX-A','WX-B']:
  for on in [False,True]:
   for angle in ['opposite','low']:
    for zoom in [.8,1.4]:
     value=page.evaluate('''({id,on,angle,zoom})=>{const p=__serienProfile,a=__s4.arrows,c=p.network.controllers.find(c=>c.id===id);__serienDiagnostics.setSwitches(on?[id]:[]);a.update(performance.now(),true);a.update(performance.now()+500);p.controls.enableDamping=false;p.controls.target.set(c.x,2,c.z+15);p.camera.position.set(c.x+(angle==='opposite'?-80:80),angle==='opposite'?500:200,c.z+(angle==='opposite'?-520:600));p.camera.zoom=zoom;p.camera.updateProjectionMatrix();p.controls.update();
      const saved=a.root.children.map(m=>m.visible);a.root.children.forEach(m=>{if(c.internal.includes(m.name))m.visible=false;});const off=__draw();a.root.children.forEach((m,i)=>m.visible=saved[i]);const imageOn=__draw();a.update(performance.now()+1500);const later=__draw();return {off,on:imageOn,later,camera:p.camera.position.toArray(),target:p.controls.target.toArray(),zoom,units:a.snapshot.units};}''',dict(id=id,on=on,angle=angle,zoom=zoom))
     image=lambda key:Image.open(BytesIO(base64.b64decode(value[key]))).convert('RGB')
     delta=ImageChops.difference(image('off'),image('on')).getbbox();assert delta,(id,on,angle,zoom,'device not visible')
     assert value['on']==value['later'],(id,on,angle,zoom,'idle flicker')
     name=f'{id}-{int(on)}-{angle}-{zoom}.png';(out/name).write_bytes(base64.b64decode(value.pop('on')));value.pop('off');value.pop('later');views.append(dict(id=id,on=on,angle=angle,file=name,changedBounds=delta,idlePixelExact=True,**value));(out/'review-progress.json').write_text(json.dumps({'stress':stress,'views':views},indent=2)+'\n');print('view',name,'PASS',flush=True)
 # Use the actual Orbit toolbar and browser pointer/wheel events.
 before=page.evaluate('__reviewState()');cameraBefore=page.evaluate('__serienProfile.camera.position.toArray()');page.locator('#viewOrbit').click();box=page.locator('#view3d canvas').bounding_box();x=box['x']+box['width']*.65;y=box['y']+box['height']*.6
 page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+40,y-20,steps=8);page.mouse.up();page.mouse.wheel(0,80);page.wait_for_timeout(100)
 gesture=page.evaluate("()=>({camera:__serienProfile.camera.position.toArray(),state:__reviewState(),png:__draw()})");assert gesture['state']==before and gesture['camera']!=cameraBefore
 (out/'manual-orbit-zoom.png').write_bytes(base64.b64decode(gesture.pop('png')));gesture['beforeCamera']=cameraBefore;gesture['file']='manual-orbit-zoom.png';print('actual orbit/wheel PASS',flush=True)
 # Reproduce real resize events while preserving routes and inspect WX coexistence.
 resizes=[]
 for width,height in [(1280,900),(390,844),(960,820)]:
  before=page.evaluate('__reviewState()');page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(300)
  value=page.evaluate('''()=>{const p=__serienProfile,a=__s4.arrows,g=__s3.glow,c=p.network.controllers.find(c=>c.id==='WX-B');p.controls.target.set(c.x,2,c.z);p.camera.position.set(c.x+60,450,c.z+500);p.camera.zoom=.8;p.camera.updateProjectionMatrix();p.controls.update();a.update(performance.now()+1500,true);g.identify('WX-B',0);g.update(700);return {png:__draw(),state:__reviewState(),glow:g.snapshot,canvas:[p.renderer.domElement.width,p.renderer.domElement.height]};}''')
  assert value['state']==before and value['glow']['variant']=='B' and value['glow']['active']=='WX-B'
  name=f'B-red-{width}x{height}.png';(out/name).write_bytes(base64.b64decode(value.pop('png')));resizes.append(dict(viewport=[width,height],file=name,**value));print('resize',width,height,'PASS',flush=True)
 assert not errors and not failed,(errors,failed)
 result={'result':'PASS','runtimeStyleChanged':False,'stress':stress,'views':views,'resizes':resizes,'actualOrbitAndWheel':gesture,'errors':errors,'failedRequests':failed,'limits':'Chromium/SwiftShader, DPR1; physical GPU/touch not verified; pixel stability is tested for static sampled camera poses, not every possible camera/device.'}
 (out/'review.json').write_text(json.dumps(result,indent=2)+'\n');print('S4 refinement browser PASS',flush=True);b.close()
