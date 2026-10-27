"""Optional Chromium regression check. Requires Python Playwright and a local npm start server.
SERIEN_URL and CHROMIUM_PATH can select a different test server/browser.
"""
import math, os
from playwright.sync_api import sync_playwright

def gauge(snapshot):
    for vehicle in snapshot['stock']:
        for hull in [vehicle['hull'], *vehicle['cars']]:
            for point in hull:
                for radius in [249,282]:
                    for direction in [-1,1]:
                        lateral=abs(math.hypot(radius+direction*point['z'],point['x'])-radius)
                        assert lateral < 14, ('rolling gauge width',lateral,point)
                        roof=48+math.sqrt(max(0,196-lateral*lateral))
                        assert point['y']<roof, ('rolling gauge height',point,roof)

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':650,'height':900}); errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('console',lambda m:errors.append(m.text) if m.type=='error' and '404' not in m.text else None)
    page.goto(os.environ.get('SERIEN_URL','http://127.0.0.1:8000/')+'?diagnostics=1',wait_until='domcontentloaded')
    page.wait_for_function('window.__serienDiagnostics!==undefined',timeout=90000)
    page.evaluate("document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'))")
    page.wait_for_timeout(1000);before=page.evaluate('__serienDiagnostics.snapshot()');gauge(before)
    print('Actual rolling hulls clear both bores',flush=True)
    page.evaluate("window.confirm=()=>true;for(let i=0;i<20;i++)document.getElementById('reset').click()")
    page.wait_for_timeout(1000);after=page.evaluate('__serienDiagnostics.snapshot()');gauge(after)
    assert after['render']['geometries'] <= before['render']['geometries']+15,(before['render'],after['render'])
    print('20 resets: geometries',before['render']['geometries'],'->',after['render']['geometries'],flush=True)
    for value in ['station','yard','follow','overview']:
        page.evaluate("v=>{const e=document.getElementById('cameraView');e.value=v;e.dispatchEvent(new Event('change'));}",value)
        page.wait_for_timeout(300)
        snap=page.evaluate('__serienDiagnostics.snapshot()');assert all(math.isfinite(v) for v in snap['camera']['position']);assert snap['camera']['preset']==value
    page.set_viewport_size({'width':390,'height':844});assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
    assert sorted(after['pendingStops'])==['lower','middle']
    assert not errors,errors
    browser.close();print('Browser regression PASS',flush=True)
