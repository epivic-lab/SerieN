"""Native requestAnimationFrame, real motion and UI on production bundle.
RAF observer forwards every request unchanged; no manual renderer/simulation steps.
"""
import hashlib,json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('U5_NATIVE_OUTPUT','work/u5-native'));out.mkdir(parents=True,exist_ok=True)
r={'status':'RUNNING','method':'production native RAF; local Auth boundary','hardware':'Chromium SwiftShader; physical GPU NOT VERIFIED','errors':[]}
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader']);p=b.new_page(viewport={'width':650,'height':760});p.set_default_timeout(120000)
 p.on('pageerror',lambda e:r['errors'].append(str(e)))
 p.route('**/auth-gate.js*',lambda q:q.fulfill(content_type='text/javascript',body="document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;await import('./dist/game.js');"))
 p.add_init_script("const raf=requestAnimationFrame.bind(window);window.__nativeFrames=[];window.requestAnimationFrame=cb=>raf(t=>{if(cb.toString().includes('requestAnimationFrame')&&cb.toString().includes('.render('))__nativeFrames.push(t);cb(t);});")
 def js(s):return p.evaluate(s)
 def click(s):p.locator(s).click(force=True)
 def frames(n=3):before=js('__nativeFrames.length');p.wait_for_function('n=>__nativeFrames.length>=n+3',arg=before)
 try:
  base=os.environ.get('SERIEN_URL','http://127.0.0.1:8033/');p.goto(base+'?diagnostics=1',wait_until='domcontentloaded');p.wait_for_function('Boolean(window.__serienDiagnostics)')
  r['bundleSHA256']=hashlib.sha256(p.request.get(base+'dist/game.js').body()).hexdigest()
  js("document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'));document.getElementById('addTrain').click();for(const e of document.querySelectorAll('.trainConsole input')){e.value=20;e.dispatchEvent(new Event('input'));}")
  r['before']=js('__serienDiagnostics.snapshot().stock.map(t=>t.journey.travel)');frames()
  r['motion']=js('__serienDiagnostics.snapshot().stock.map(t=>({travel:t.journey.travel,velocity:t.velocity}))')
  assert len(r['motion'])==4 and all(t['velocity']>0 and t['travel']>a for a,t in zip(r['before'],r['motion']))
  # Select fourth from sidebar's real shared selection, then focus carousel to issue Space.
  p.locator('.u4-map-trains [data-map-train="3"]').click();p.locator('#trainDeck').focus();p.keyboard.press('Space')
  r['space']=js('__serienDiagnostics.snapshot().stock.map(t=>t.speed)');assert r['space']==[20,20,20,0]
  click('#stopAll');assert js('__serienDiagnostics.snapshot().stock.every(t=>t.speed===0&&t.velocity===0)')
  click('[data-train="0"]');p.locator('#speed').fill('20');p.locator('#speed').dispatch_event('input');frames()
  assert js('__serienDiagnostics.snapshot().stock[0].velocity>0')
  click('#pause');before=js('__serienDiagnostics.snapshot().stock.map(t=>t.journey.travel)');frames();assert before==js('__serienDiagnostics.snapshot().stock.map(t=>t.journey.travel)')
  click('#pause');frames();assert js('__serienDiagnostics.snapshot().stock[0].journey.travel')>before[0]
  click('#stopAll');p.screenshot(path=str(out/'native-four-trains-stopped.png'))
  r['frames']=js('__nativeFrames');assert not r['errors'];r['status']='PASS'
 except Exception as e:r['status']='FAIL';r['failure']=str(e);raise
 finally:(out/'results.json').write_text(json.dumps(r,indent=2)+'\n');b.close()
print(r['status'])
