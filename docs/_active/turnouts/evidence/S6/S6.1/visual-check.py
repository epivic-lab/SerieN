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



 results['gpu']=p.evaluate('({memory:{...__serienProfile.renderer.info.memory},calls:__serienProfile.renderer.info.render.calls,pose:__s6.snapshot.units})');(out/'visual-check.json').write_text(json.dumps(clean(results),indent=2)+'\n');b.close()
