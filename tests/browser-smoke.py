"""Optional Chromium regression check. Requires Python Playwright and a local npm start server.
SERIEN_URL and CHROMIUM_PATH can select a different test server/browser.
"""
import math, os
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':650,'height':900}); errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('console',lambda m:errors.append(m.text) if m.type=='error' and '404' not in m.text else None)
    page.goto(os.environ.get('SERIEN_URL','http://127.0.0.1:8000/')+'?diagnostics=1',wait_until='domcontentloaded')
    page.wait_for_function('window.__serienDiagnostics!==undefined',timeout=90000)
    page.evaluate("document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'))")
    page.wait_for_timeout(1000);before=page.evaluate('__serienDiagnostics.snapshot()')
    page.evaluate("window.confirm=()=>true;for(let i=0;i<20;i++)document.getElementById('reset').click()")
    page.wait_for_timeout(1000);after=page.evaluate('__serienDiagnostics.snapshot()')
    assert after['render']['geometries'] <= before['render']['geometries']+15,(before['render'],after['render'])
    print('20 resets: geometries',before['render']['geometries'],'->',after['render']['geometries'],flush=True)
    fourth=page.evaluate('''()=>{
      const api=__serienDiagnostics,check=(ok,msg)=>{if(!ok)throw Error(msg)};
      const e=document.getElementById('pause');e.click();
      for(let i=0;i<3;i++)document.getElementById('uncouple').click();
      api.placeTrain(0,'T47',80,1);document.getElementById('addTrain').click();check(api.snapshot().stock.length===3,'occupied insertion refused');
      document.getElementById('reset').click();document.getElementById('pause').click();
      document.getElementById('addTrain').click();let s=api.snapshot();check(s.stock.length===4,'real fourth train added');const before=s.stock[3].vehicles[0];
      document.getElementById('reset').click();document.getElementById('pause').click();s=api.snapshot();const after=s.stock[3].vehicles[0];
      check(before.edge==='T47'&&after.edge==='T47'&&before.x===after.x&&before.z===after.z,'fourth reset retains initial parked location');
      return {occupiedInsertionRefused:true,fourthResetParked:true};
    }''')
    print('PASS: occupied insertion refused; fourth locomotive reset returns to the actual siding',flush=True)
    for value in ['station','yard','follow','overview']:
        page.evaluate("v=>{const e=document.getElementById('cameraView');e.value=v;e.dispatchEvent(new Event('change'));}",value)
        page.wait_for_timeout(300)
        snap=page.evaluate('__serienDiagnostics.snapshot()');assert all(math.isfinite(v) for v in snap['camera']['position']);assert snap['camera']['preset']==value
    page.set_viewport_size({'width':390,'height':844});assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
    assert after['pendingStops']==[]
    assert not errors,errors
    report=browser.new_page();assert report.goto(os.environ.get('SERIEN_URL','http://127.0.0.1:8000/')+'docs/consolidation/index.html').status==200
    report.wait_for_selector('#terminals tr');assert report.locator('#terminals tr').count()==4
    report.wait_for_function("Boolean(document.getElementById('plan').contentDocument?.getElementById('profile-review'))")
    report.locator('[data-layer="profile-review"]').uncheck();assert report.evaluate("document.getElementById('plan').contentDocument.getElementById('profile-review').style.display")=="none"
    assert not errors,errors
    import json
    from pathlib import Path
    Path('docs/consolidation/smoke-result.json').write_text(json.dumps({'result':'PASS','twentyResets':{'before':before['render']['geometries'],'after':after['render']['geometries']},'fourthTrain':fourth,'cameraPresets':['station','yard','follow','overview'],'mobileNoOverflow':True,'interactiveReport':True,'errors':errors},indent=2)+'\n')
    browser.close();print('Browser regression PASS',flush=True)
