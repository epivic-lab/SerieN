import os,json,base64,time,wave,struct,math,io
from PIL import Image,ImageChops
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('S6_OUTPUT','/workspace/work/s6'));out.mkdir(parents=True,exist_ok=True);results={}
def clean(v):
 if isinstance(v,float) and not math.isfinite(v):return None
 if isinstance(v,dict):return {k:clean(x) for k,x in v.items()}
 if isinstance(v,list):return [clean(x) for x in v]
 return v
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader']);p=b.new_page(viewport={'width':1100,'height':860});errors=[];p.on('pageerror',lambda e:errors.append(str(e)));p.route('**/dist/game.js*',lambda r:r.fulfill(path=os.environ.get('S6_BUNDLE',str(out/'profile.js')),content_type='application/javascript'))
 p.goto('http://127.0.0.1:8003/?diagnostics=1',wait_until='domcontentloaded',timeout=120000);p.wait_for_function('window.__s6',timeout=180000)
 results['initial']=p.evaluate('''()=>{const p=__serienProfile,a=__serienDiagnostics,$=id=>document.getElementById(id);p.stop();$('pause').click();$('quality').value='low';$('quality').dispatchEvent(new Event('change'));document.querySelector('[data-train="2"]').click();for(let i=0;i<5;i++)$('uncouple').click();a.setSwitches(['Y-4']);const t=p.trains[2],extent=-t.group.userData.couplers.back.x;a.placeTrain(2,'T47',extent+80,-1);a.requestToggle('Y-4','panel');$('speed').value=100;$('speed').dispatchEvent(new Event('input'));for(let i=0;i<300;i++)a.step(1/60);p.renderFixed();return {guard:t.guard,fx:__s6.snapshot};}''');print('initial',results['initial']['fx'],flush=True)
 p.evaluate('__s6.update(performance.now()+500)');results['settled']=p.evaluate('__s6.snapshot');print('settled',results['settled'],flush=True)
 assert results['settled']['units'][0]['pose'] is not None,'no valid sign placement'
 assert not results['settled']['audio']['initialized']
 for name,day in [('day',48),('night',95)]:
  data=p.evaluate('''day=>{const p=__serienProfile,s=__s6.snapshot.units.find(u=>u.visible),o=s.pose;document.getElementById('day').value=day;document.getElementById('day').dispatchEvent(new Event('input'));window.__s6Tick(performance.now()+600);p.stop();p.controls.minDistance=1;p.controls.target.set(o.x,o.y+17,o.z);p.camera.position.set(o.x-60,o.y+45,o.z+15);p.camera.updateProjectionMatrix();p.controls.update();p.effects.render(false);p.renderer.getContext().finish();return p.renderer.domElement.toDataURL().split(',')[1];}''',day)
  (out/f'stop-{name}.png').write_bytes(base64.b64decode(data))
  if name=='day':
   hidden=p.evaluate("()=>{const p=__serienProfile;__s6.root.visible=false;p.effects.render(false);p.renderer.getContext().finish();const png=p.renderer.domElement.toDataURL().split(',')[1];__s6.root.visible=true;p.effects.render(false);return png;}")
   delta=ImageChops.difference(Image.open(io.BytesIO(base64.b64decode(data))).convert('RGB'),Image.open(io.BytesIO(base64.b64decode(hidden))).convert('RGB'))
   results['renderedSignChangedPixels']=sum(v!=(0,0,0) for v in delta.getdata());assert results['renderedSignChangedPixels']>100,'sign missing from actual render'


 def capture(name,code=''):
  data=p.evaluate("()=>{const p=__serienProfile;"+code+"p.effects.render(false);p.renderer.getContext().finish();return p.renderer.domElement.toDataURL().split(',')[1];}")
  (out/(name+'.png')).write_bytes(base64.b64decode(data))
 capture('home-wide',"p.renderFixed();__s6.update(performance.now()+500);")
 p.select_option('#cameraView','follow');p.evaluate('__s6Tick(performance.now()+1500);__serienProfile.stop()');capture('follow-train')
 p.evaluate("()=>{const p=__serienProfile,o=__s6.snapshot.units.find(u=>u.visible).pose;p.controls.minDistance=1;p.controls.target.set(o.x,o.y+17,o.z);p.camera.position.set(o.x-60,o.y+45,o.z+15);p.controls.update();}")
 results['animation']=p.evaluate('''()=>{__s6.clear();const t=performance.now()+2000;window.__s6Clock=t;__s6.update(t);return __s6.snapshot;}''')
 for delta in [0,200,400]:
  p.evaluate('d=>__s6.update(__s6Clock+d)',delta);capture('emergence-'+str(delta))
 p.evaluate('__s6.setReducedMotion(true);__s6.clear();__s6.update(performance.now()+3000)');capture('reduced-motion');assert p.evaluate('__s6.snapshot.units.find(u=>u.id===2).value')==1
 button=p.get_by_role('button',name='Mute railway warning bell');button.click();assert p.evaluate('__s6.bell.snapshot.initialized');assert p.evaluate('__s6.bell.snapshot.muted')
 button.focus();p.keyboard.press('Enter');assert not p.evaluate('__s6.bell.snapshot.muted')
 touch=p.context.new_cdp_session(p);touch.send('Emulation.setTouchEmulationEnabled',{'enabled':True});rect=button.bounding_box();touch.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':rect['x']+rect['width']/2,'y':rect['y']+rect['height']/2}]});touch.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});p.wait_for_function('__s6.bell.snapshot.muted',timeout=3000);results['muteInputs']=['mouse','keyboard Enter','CDP touch']
 p.locator('#pause').click();button.click();p.evaluate('__s6.update(performance.now()+3500)');p.wait_for_function('__s6.bell.snapshot.timer',timeout=10000);results['audioEnabled']=p.evaluate('__s6.bell.snapshot')
 p.locator('#pause').click();assert not p.evaluate('__s6.bell.snapshot.timer');assert p.evaluate('__s6.bell.snapshot.voices')==0
 results['multi']=p.evaluate('''()=>{const p=__serienProfile,a=__serienDiagnostics,$=id=>document.getElementById(id);document.querySelector('[data-train="0"]').click();for(let i=0;i<5;i++)$('uncouple').click();a.placeTrain(0,'T47',200,-1);$('speed').value=100;$('speed').dispatchEvent(new Event('input'));for(let i=0;i<600&&p.trains[0].speed;i++)a.step(1/60);__s6.setReducedMotion(false);__s6.update(performance.now()+4000);__s6.update(performance.now()+4500);return {guards:p.trains.map(t=>t.guard),fx:__s6.snapshot};}''');assert len([u for u in results['multi']['fx']['units'] if u['visible']])==2
 capture('two-risks',"p.renderFixed();__s6.update(performance.now()+5000);p.controls.minDistance=1;p.controls.target.set(775,12,257);p.camera.position.set(665,100,380);p.controls.update();")
 results['release']=p.evaluate('''()=>{const a=__serienDiagnostics,$=id=>document.getElementById(id);$('reverse').click();$('speed').value=25;$('speed').dispatchEvent(new Event('input'));a.step(2);__s6.update(performance.now()+6000);__s6.update(performance.now()+6500);return __s6.snapshot;}''');assert len([u for u in results['release']['units'] if u['visible']])==1
 capture('one-risk-remains')
 results['cpuAndResources']=p.evaluate('''()=>{const p=__serienProfile,before={...p.renderer.info.memory},t=performance.now();for(let i=0;i<100;i++)__s6.update(performance.now()+7000);return {before,after:{...p.renderer.info.memory},meanUpdateMs:(performance.now()-t)/100};}''')
 results['resolvedWhileStopped']=p.evaluate("()=>{const r=__serienDiagnostics.requestToggle('Y-4','panel');if(!r.changed)throw Error('correction refused');__serienDiagnostics.step(1/60);return {guard:__serienProfile.trains[2].guard,speed:__serienProfile.trains[2].speed};}");assert results['resolvedWhileStopped']['guard']['state']=='SAFE' and results['resolvedWhileStopped']['speed']==0
 p.evaluate("()=>{const p=__serienProfile,o=__s6.snapshot.units.find(u=>u.visible).pose;p.controls.target.set(o.x,o.y+17,o.z);p.camera.position.set(o.x-60,o.y+45,o.z+15);p.controls.update();}")
 p.evaluate('window.__ret=performance.now()+8000;__s6.update(__ret)')
 for delta in [0,150,300]:
  p.evaluate('d=>__s6.update(__ret+d)',delta);capture('retraction-'+str(delta))
 p.evaluate("()=>{const a=__serienDiagnostics,t=__serienProfile.trains[2];document.querySelector('[data-train=\"2\"]').click();a.setSwitches([]);a.placeTrain(2,'T47',-t.group.userData.couplers.back.x+40,-1);document.getElementById('speed').value=100;document.getElementById('speed').dispatchEvent(new Event('input'));t.velocity=-150;a.frames([.2]);__s6.update(performance.now()+9000);}")
 p.locator('#pause').click();p.evaluate('__s6.update(performance.now()+9500)');p.wait_for_function('__s6.bell.snapshot.timer');p.locator('#stopAll').click();assert not p.evaluate('__s6.bell.snapshot.timer');p.evaluate('__s6.update(performance.now()+10000);__s6.update(performance.now()+10400)');assert not p.evaluate('__s6.bell.snapshot.timer');assert all(not u['visible'] for u in p.evaluate('__s6.snapshot.units'));capture('retracted')
 samples=p.evaluate('''async()=>{const offline=new OfflineAudioContext(1,48000,48000),ctx={state:'running',currentTime:0,destination:offline.destination,createGain:()=>offline.createGain(),createOscillator:()=>offline.createOscillator(),resume:()=>Promise.resolve(),close:()=>Promise.resolve()};const bell=__s6BellFactory({createContext:()=>ctx,schedule:()=>0,cancel:()=>{}});bell.setActive(true);await bell.unlock();const buffer=await offline.startRendering();bell.dispose();return Array.from(buffer.getChannelData(0));}''')
 with wave.open(str(out/'bell.wav'),'wb') as wav:
  wav.setnchannels(1);wav.setsampwidth(2);wav.setframerate(48000);wav.writeframes(b''.join(struct.pack('<h',round(max(-1,min(1,x))*32767)) for x in samples))
 results['offlineAudio']={'seconds':1,'sampleRate':48000,'peak':max(abs(x) for x in samples)};assert 0<results['offlineAudio']['peak']<.1
 p.on('dialog',lambda d:d.accept());p.locator('#reset').click();assert not p.evaluate('__s6.bell.snapshot.timer');assert all(not u['visible'] for u in p.evaluate('__s6.snapshot.units'));p.evaluate('__serienProfile.renderFixed()');results['reset']=True
 results['dispose']=p.evaluate('''()=>{const p=__serienProfile,before={...p.renderer.info.memory};__s6.dispose();__s6.dispose();p.effects.render(false);return {before,after:{...p.renderer.info.memory},snapshot:__s6.snapshot,children:__s6.root.children.length};}''');assert results['dispose']['children']==0;assert results['dispose']['before']['geometries']-results['dispose']['after']['geometries']==4;assert results['dispose']['before']['textures']-results['dispose']['after']['textures']==1
 results['engineWithoutFX']=p.evaluate("()=>{const a=__serienDiagnostics,t=__serienProfile.trains[2];document.querySelector('[data-train=\"2\"]').click();for(let i=0;i<5;i++)document.getElementById('uncouple').click();a.setSwitches([]);a.placeTrain(2,'T47',-t.group.userData.couplers.back.x+40,-1);document.getElementById('speed').value=100;document.getElementById('speed').dispatchEvent(new Event('input'));t.velocity=-150;a.frames([60]);return {guard:t.guard,gap:t.journey.position+t.group.userData.couplers.back.x};}");assert results['engineWithoutFX']['guard']['state']=='GUARDED_STOP';assert results['engineWithoutFX']['gap']>30
 assert not errors,errors
 results['result']='PASS';results['errors']=errors;(out/'browser.json').write_text(json.dumps(clean(results),indent=2,allow_nan=False)+'\n');b.close()
