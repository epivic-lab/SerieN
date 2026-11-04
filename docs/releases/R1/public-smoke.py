"""Verify the real served production bundle. No routing override/profile injection."""
import os,json,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('R1_OUTPUT','/workspace/work/r1/public'));out.mkdir(parents=True,exist_ok=True)
base=os.environ.get('R1_URL','https://epivic-lab.github.io/SerieN/');version=os.environ['R1_SHA'];expected=os.environ['R1_BUNDLE_SHA256'];results={}
with sync_playwright()as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader']);context=b.new_context(viewport={'width':1100,'height':860},ignore_https_errors=False);p=context.new_page();errors=[];failed=[];bad=[];models=[]
 p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text)if m.type=='error' else None);p.on('response',lambda r:models.append(r.url)if r.status==200 and '.glb' in r.url else None);p.on('requestfailed',lambda r:failed.append(r.url));p.on('response',lambda r:bad.append([r.status,r.url])if r.status>=400 else None)
 r=context.request.get(base+'dist/game.js?r1='+version,timeout=120000);assert r.ok;actual=hashlib.sha256(r.body()).hexdigest();assert actual==expected,(actual,expected);results['servedBundleSha256']=actual
 with p.expect_response(lambda r:'/dist/game.js' in r.url,timeout=180000)as served:
  p.goto(base+'?diagnostics=1&r1='+version,wait_until='domcontentloaded',timeout=180000)
 actualScript=hashlib.sha256(served.value.body()).hexdigest();assert actualScript==expected,(actualScript,expected);results['executedScriptSha256']=actualScript
 p.wait_for_function('window.__serienDiagnostics',timeout=180000);print('production loaded',flush=True)
 p.evaluate("()=>{const q=document.getElementById('quality');q.value='low';q.dispatchEvent(new Event('change'));document.getElementById('pause').click();}")
 assert not p.evaluate('__serienDiagnostics.guardedStopState().audio.initialized')
 p.wait_for_function("[...document.querySelectorAll('.locomotiveThumbnail')].every(i=>i.complete&&i.naturalWidth>0)",timeout=120000)
 p.evaluate("()=>{__serienDiagnostics.setSwitches([]);['T12','T0','T16'].forEach((e,i)=>__serienDiagnostics.placeTrain(i,e,150));}")
 for index,id in [(2,'Y-IN'),(0,'WX-A')]:
  before=p.evaluate('id=>__serienDiagnostics.indicatorState().states.find(s=>s.id===id).on',id);p.locator(f'[data-switch-hover="{index}"]').hover(timeout=120000);p.wait_for_function('id=>{const g=__serienDiagnostics.turnoutGlowState();return g.active===id&&g.visible&&g.gain>0;}',arg=id,timeout=120000)
  glow=p.evaluate('__serienDiagnostics.turnoutGlowState()');assert glow['variant']=='B';p.locator(f'[data-switch="{index}"]').click(timeout=120000)
  after=p.evaluate('id=>__serienDiagnostics.indicatorState().states.find(s=>s.id===id).on',id);assert after!=before
  paths=p.evaluate('id=>__serienDiagnostics.turnoutArrowsState().units.find(s=>s.id===id).paths',id);assert len(paths)==(2 if id=='WX-A' else 1);print('control',id,'PASS',flush=True);results[id]={'before':before,'after':after,'glow':glow,'arrows':paths}
 p.evaluate("()=>{const a=__serienDiagnostics,$=id=>document.getElementById(id);document.querySelector('[data-train=\"2\"]').click();for(let i=0;i<5;i++)$('uncouple').click();a.setSwitches(['Y-4']);const t=a.snapshot().stock[2],extent=-t.vehicles[0].couplers.back.x;a.placeTrain(2,'T47',extent+80,-1);a.requestToggle('Y-4','panel');$('speed').value=100;$('speed').dispatchEvent(new Event('input'));a.step(5);}")
 p.wait_for_function('__serienDiagnostics.guardedStopState().units.some(u=>u.visible&&u.value>=1)',timeout=120000);results['protectedStop']=p.evaluate('({train:__serienDiagnostics.snapshot().stock[2],fx:__serienDiagnostics.guardedStopState()})');assert results['protectedStop']['train']['guard']['state']=='GUARDED_STOP';assert results['protectedStop']['train']['velocity']==0
 print('protected STOP visible',flush=True);results['renderCounters']=p.evaluate('__serienDiagnostics.snapshot().render');p.screenshot(path=str(out/'public-stop-desktop.png'),timeout=120000)
 p.locator('#pause').click(timeout=120000);p.wait_for_function('__serienDiagnostics.guardedStopState().audio.timer',timeout=120000);results['audio']=p.evaluate('__serienDiagnostics.guardedStopState().audio');button=p.get_by_role('button',name='Mute railway warning bell');button.click(timeout=120000);assert p.evaluate('__serienDiagnostics.guardedStopState().audio.muted');assert not p.evaluate('__serienDiagnostics.guardedStopState().audio.timer');assert p.evaluate('__serienDiagnostics.guardedStopState().audio.voices')==0
 p.locator('#stopAll').click(timeout=120000);assert p.evaluate('__serienDiagnostics.snapshot().stock.every(t=>t.velocity===0&&t.speed===0)');assert not p.evaluate('__serienDiagnostics.guardedStopState().audio.timer')
 p.set_viewport_size({'width':390,'height':844});p.screenshot(path=str(out/'public-mobile.png'),timeout=120000);assert p.evaluate('document.documentElement.scrollWidth<=innerWidth')
 assert not errors and not failed and not bad,(errors,failed,bad)
 assert models,'No successful 3D GLB load observed'
 results.update(result='PASS',url=base,releaseMainSha=version,errors=errors,failedRequests=failed,httpErrors=bad,profileInjection=False,loadedModels=models);(out/'result.json').write_text(json.dumps(results,indent=2)+'\n');b.close()
