"""Final responsive and static-map checks against the built release."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':390,'height':844});errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    base=os.environ.get('SERIEN_URL','http://127.0.0.1:8000/')
    page.goto(base+'?diagnostics=1',wait_until='domcontentloaded')
    page.wait_for_function('window.__serienDiagnostics!==undefined',timeout=90000)
    page.evaluate("document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'));document.getElementById('pause').click()")
    assert page.locator('#nextSwitchBody').is_hidden()
    tabs=page.locator('#tabs button').evaluate_all('(buttons)=>buttons.map(b=>{const r=b.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width}})')
    assert len(tabs)==3 and all(b['left']>=0 and b['right']<=390 and b['width']>=44 for b in tabs),tabs
    assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
    page.evaluate("document.querySelector('.nextSwitchMinimize').click()")
    assert page.locator('#nextSwitchBody').is_visible()
    assert page.evaluate("document.getElementById('nextSwitchHUD').getBoundingClientRect().bottom<=document.querySelector('.cameraToolbar').getBoundingClientRect().top")
    page.evaluate("document.querySelector('.nextSwitchMinimize').click()")
    page.screenshot(path='docs/next-switch/mobile.png',timeout=60000)
    page.set_viewport_size({'width':1280,'height':900})
    page.evaluate('''()=>{
      __serienDiagnostics.placeTrain(0,'L2-return',600,1);
      document.querySelector('[data-switch="0"]').click();
      __serienDiagnostics.placeTrain(0,'L0-0',10,1);
      document.querySelector('.nextSwitchMinimize').click();
      document.querySelector('.nextSwitchPreview').click();
      __serienDiagnostics.step(0);
    }''')
    state=page.evaluate('__serienDiagnostics.snapshot().nextSwitch')
    assert state['highlighted'] and state['site']=='WX-A' and state['outgoing']['edge']=='XA0',state
    assert '15 s' not in page.locator('.nextSwitchPreview').inner_text()  # active label is Hide
    page.screenshot(path='docs/next-switch/desktop.png',timeout=60000)
    assert not errors,errors
    page.close()
    page=browser.new_page(viewport={'width':1280,'height':900})
    assert page.goto(base+'docs/phase-0/index.html').status==200
    assert page.locator('[data-layer]').count()==5
    page.locator('[data-layer="zones"]').uncheck()
    assert page.locator('#zones').evaluate('(e)=>e.style.display')=='none'
    page.locator('[data-layer="zones"]').check()
    parts=page.request.get(base+'docs/phase-0/kato-parts.json').json()
    assert parts['totalPieces']==61 and parts['distinctCodes']==17
    browser.close();print('PASS: final mobile train tabs and HUD bounds, real route highlight, interactive map and Kato inventory',flush=True)
