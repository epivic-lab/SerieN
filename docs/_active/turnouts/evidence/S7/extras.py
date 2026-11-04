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

 results['missions']=p.evaluate("()=>{const names=[];for(let i=0;i<4;i++){names.push({name:document.getElementById('missionName').textContent,status:document.getElementById('missionStatus').textContent});document.getElementById('nextMission').click();}return names;}")
 assert len(set(x['name'] for x in results['missions']))==4 and all(x['status'] for x in results['missions'])
 button=p.get_by_role('button',name='Mute railway warning bell');button.click();button.click();p.evaluate("document.getElementById('pause').click();__s6.update(performance.now()+1000)");p.wait_for_function('__s6.bell.snapshot.timer')
 p.evaluate("window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}))");assert not p.evaluate('__s6.bell.snapshot.timer');assert p.evaluate('__s6.bell.snapshot.voices')==0
 p.evaluate("Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));__s6.update(performance.now()+1500)");assert not p.evaluate('__s6.bell.snapshot.timer')
 results['lifecycle']='PASS: synthetic persisted-pagehide and hidden-document fixture silence voices/timer';results['result']='PASS';(out/'extras.json').write_text(json.dumps(clean(results),indent=2)+'\n');b.close()
