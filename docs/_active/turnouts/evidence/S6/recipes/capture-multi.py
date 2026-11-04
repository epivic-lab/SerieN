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

 def capture(name,code):
  data=p.evaluate("()=>{const p=__serienProfile;"+code+"p.effects.render(false);p.renderer.getContext().finish();return p.renderer.domElement.toDataURL().split(',')[1];}");(out/(name+'.png')).write_bytes(base64.b64decode(data))
 results['multi']=p.evaluate('''()=>{const p=__serienProfile,a=__serienDiagnostics,$=id=>document.getElementById(id);document.querySelector('[data-train="0"]').click();for(let i=0;i<5;i++)$('uncouple').click();a.placeTrain(0,'T47',200,-1);$('speed').value=100;$('speed').dispatchEvent(new Event('input'));for(let i=0;i<600&&p.trains[0].speed;i++)a.step(1/60);__s6.setReducedMotion(false);__s6.update(performance.now()+4000);__s6.update(performance.now()+4500);return {guards:p.trains.map(t=>t.guard),fx:__s6.snapshot};}''');assert len([u for u in results['multi']['fx']['units'] if u['visible']])==2

 p.evaluate("()=>{document.getElementById('day').value=48;document.getElementById('day').dispatchEvent(new Event('input'));__s6Tick(performance.now()+4500);__serienProfile.stop();__s6.update(performance.now()+5000);}")
 capture('multi-top',"p.controls.minDistance=1;p.controls.target.set(775,12,257);p.camera.position.set(775,220,230);p.controls.update();")
 capture('second-risk-close',"const o=__s6.snapshot.units.find(u=>u.id===0).pose;p.controls.target.set(o.x,o.y+17,o.z);p.camera.position.set(o.x+60,o.y+45,o.z-15);p.controls.update();")
 (out/'multi-capture.json').write_text(json.dumps(__import__('builtins').dict(fx=results['multi']['fx'],cameras={'multi-top':[775,220,230],'second-risk-close':'pose + [60,45,-15]'},source='native S6 fixture, same two guarded trains; day48'),indent=2)+'\n')
 b.close()
