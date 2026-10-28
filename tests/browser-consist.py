"""Real GLB spacing, model switching, shunting and reverse regression.
Run against npm start, with Python Playwright and /usr/bin/chromium installed.
"""
import json
import math
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

def check(snapshot, imported):
    for train in snapshot['stock']:
        offsets=train['layout']['offsets']
        for i,v in enumerate(train['vehicles']):
            assert bool(v['dimensions'])==imported, v
            assert math.hypot(v['x']-v['rendered']['x'],v['z']-v['rendered']['z'])<1e-6,v
            if not i: continue
            if imported:
                a=train['vehicles'][i-1]
                expected=-a['couplers']['back']['x']+v['couplers']['front']['x']
                assert abs(offsets[i]-offsets[i-1]-expected)<1e-8
                assert offsets[i]-offsets[i-1]<64
                assert abs(expected-(a['dimensions']['length']+v['dimensions']['length'])/2-1.5)<1e-8
            else:
                assert offsets[i]-offsets[i-1]==64

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':650,'height':760});errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(os.environ.get('SERIEN_URL','http://127.0.0.1:8000/')+'?diagnostics=1',wait_until='domcontentloaded')
    page.wait_for_function('window.__serienDiagnostics!==undefined',timeout=90000)
    page.evaluate("document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'));document.getElementById('pause').click()")
    page.wait_for_timeout(500)
    native=page.evaluate('__serienDiagnostics.snapshot()');check(native,False)
    assert native['scenery']['tunnel']==False
    page.evaluate("document.getElementById('rollingModels').value='kenney';document.getElementById('rollingModels').dispatchEvent(new Event('change'))")
    page.wait_for_function('__serienDiagnostics.snapshot().stock.every(t=>t.vehicles.every(v=>v.dimensions))',timeout=90000)
    page.evaluate('__serienDiagnostics.step(0)')
    compact=page.evaluate('__serienDiagnostics.snapshot()');check(compact,True)
    for a,b in zip(native['stock'],compact['stock']):
        assert b['layout']['tail']<a['layout']['tail']
        assert a['vehicles'][0]['x']==b['vehicles'][0]['x']
        assert a['vehicles'][0]['z']==b['vehicles'][0]['z']
    print('PASS: all actual Kenney vehicles compact individually, locomotive positions preserved',flush=True)
    page.evaluate("document.getElementById('uncouple').click();__serienDiagnostics.step(0)")
    detached=page.evaluate('__serienDiagnostics.snapshot()')
    expected=compact['stock'][0]['vehicles'][-1]
    assert len(detached['stock'][0]['vehicles'])==3 and len(detached['detached'])==1
    assert math.hypot(detached['detached'][0]['x']-expected['x'],detached['detached'][0]['z']-expected['z'])<1e-8
    page.evaluate("document.getElementById('couple').click();__serienDiagnostics.step(0)")
    attached=page.evaluate('__serienDiagnostics.snapshot()');check(attached,True)
    assert not attached['detached']
    assert attached['stock'][0]['layout']==compact['stock'][0]['layout']
    print('PASS: detach/recouple preserves the actual wagon position',flush=True)
    page.evaluate("document.getElementById('speed').value=35;document.getElementById('speed').dispatchEvent(new Event('input'));__serienDiagnostics.step(8)")
    moved=page.evaluate('__serienDiagnostics.snapshot()');check(moved,True)
    assert math.hypot(moved['stock'][0]['vehicles'][0]['x']-compact['stock'][0]['vehicles'][0]['x'],moved['stock'][0]['vehicles'][0]['z']-compact['stock'][0]['vehicles'][0]['z'])>30
    page.evaluate("document.getElementById('stop').click();document.getElementById('reverse').click();document.getElementById('speed').value=35;document.getElementById('speed').dispatchEvent(new Event('input'));__serienDiagnostics.step(8);document.getElementById('stop').click()")
    reversed=page.evaluate('__serienDiagnostics.snapshot()');check(reversed,True)
    assert math.hypot(reversed['stock'][0]['vehicles'][0]['x']-compact['stock'][0]['vehicles'][0]['x'],reversed['stock'][0]['vehicles'][0]['z']-compact['stock'][0]['vehicles'][0]['z'])<1e-6
    print('PASS: forward/reverse uses the same compact route ribbon',flush=True)
    page.evaluate("document.getElementById('rollingModels').value='native';document.getElementById('rollingModels').dispatchEvent(new Event('change'));__serienDiagnostics.step(0)")
    check(page.evaluate('__serienDiagnostics.snapshot()'),False)
    page.evaluate("document.getElementById('rollingModels').value='kenney';document.getElementById('rollingModels').dispatchEvent(new Event('change'));window.confirm=()=>true;document.getElementById('reset').click();document.getElementById('pause').click()")
    page.wait_for_function('__serienDiagnostics.snapshot().stock.every(t=>t.vehicles.every(v=>v.dimensions))',timeout=90000)
    page.evaluate('__serienDiagnostics.step(0)')
    check(page.evaluate('__serienDiagnostics.snapshot()'),True)
    page.evaluate("document.getElementById('viewFollow').click()")
    page.wait_for_timeout(3000)
    Path('docs/consolidation/consist').mkdir(parents=True,exist_ok=True)
    page.screenshot(path='docs/consolidation/consist/kenney-follow.png',timeout=60000)
    assert not errors,errors
    Path('docs/consolidation/consist/consist-check.json').write_text(json.dumps({'result':'PASS','errors':errors,'nativeOffsets':[t['layout'] for t in native['stock']],'kenneyOffsets':[t['layout'] for t in compact['stock']]},indent=2)+'\n')
    browser.close()
    print('PASS: native restore, reset and Kenney reload; no JavaScript errors',flush=True)
