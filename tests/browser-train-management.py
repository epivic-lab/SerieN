"""M1 integration. Local auth fixture only; never connects to Supabase."""
import json
import os
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright

output=Path(os.environ.get('M1_OUTPUT','work/m1-browser'));output.mkdir(parents=True,exist_ok=True)
subprocess.run(['node_modules/.bin/esbuild','app.js','--bundle','--format=esm','--outfile=work/m1-test-bundle.js'],check=True)
base=os.environ.get('SERIEN_URL','http://127.0.0.1:8000/')
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1440,'height':1000});errors=[];failed=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('response',lambda r:failed.append(r.url) if r.status>=400 else None)
    # Replace only the test page's auth module; production authentication is unchanged.
    page.route('**/auth-gate.js*',lambda r:r.fulfill(content_type='text/javascript',body="document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;await import('./dist/game.js');"))
    # Deterministic rendering fixture: render on demand instead of a hot SwiftShader loop.
    page.add_init_script("const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=callback=>{if(callback.name==='tick'){window.__m1Frame=callback;return 1;}return raf(callback);};")
    page.route('**/dist/game.js',lambda r:r.fulfill(path='work/m1-test-bundle.js',content_type='text/javascript'))
    page.goto(base+'?diagnostics=1',wait_until='domcontentloaded')
    page.wait_for_function('window.__serienDiagnostics!==undefined',timeout=90000)
    page.evaluate("document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'));document.getElementById('pause').click()")
    page.wait_for_function("document.querySelectorAll('.locomotiveThumbnail').length===3 && [...document.querySelectorAll('.locomotiveThumbnail')].every(i=>i.complete)")
    page.evaluate('__m1Frame(performance.now())')
    page.locator('#trainManagement').click()
    page.wait_for_selector('[data-composition="2"]')
    before=page.evaluate('__serienDiagnostics.railwayState()')
    page.locator('[data-composition="2"]').click()
    assert page.evaluate('__serienDiagnostics.snapshot().consoles.active')==2
    assert page.locator('.trainConsole.is-active').get_attribute('data-console-train')=='2'
    assert page.locator('[data-consist="2"] li').count()==3
    assert page.evaluate('__serienDiagnostics.railwayState()')==before
    page.locator('dialog.trainManagement [data-close]').click()
    page.locator('#reverse').click()
    page.locator('#trainManagement').click()
    assert 'Reverse' in page.locator('.managementSummary').inner_text()
    reversed_ids=page.locator('[data-consist] li').evaluate_all('(rows)=>rows.map(r=>r.dataset.vehicleId)')
    assert reversed_ids==before['identities']['trains'][2]
    page.locator('dialog.trainManagement [data-close]').click()
    page.locator('#uncouple').click()
    page.locator('#trainManagement').click()
    assert page.locator('[data-detached-id]').count()==1
    assert page.locator('[data-consist] li').count()==2
    assert page.locator('[data-detached-id]').get_attribute('data-detached-id')==reversed_ids[-1]
    page.locator('dialog.trainManagement [data-close]').click()
    page.locator('[data-train="1"]').click()
    page.locator('#trainManagement').click()
    assert page.locator('[data-composition="1"]').get_attribute('aria-pressed')=='true'
    for width,height,name in [(1440,1000,'desktop'),(1024,768,'tablet-landscape'),(768,1024,'tablet-portrait')]:
        page.set_viewport_size({'width':width,'height':height})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        assert page.locator('dialog.trainManagement').evaluate('(d)=>d.scrollWidth<=d.clientWidth')
        page.evaluate('__m1Frame(performance.now())')
        page.screenshot(path=str(output/(name+'.png')))
    page.locator('[data-view="catalog"]').click()
    page.wait_for_function("document.querySelectorAll('.managementModel').length===14")
    page.wait_for_function("[...document.querySelectorAll('.managementModel img')].every(i=>i.complete&&i.naturalWidth===320)")
    assert page.locator('.managementModel').count()==14
    page.screenshot(path=str(output/'catalog-tablet.png'))
    page.locator('dialog.trainManagement [data-close]').click()
    page.select_option('#rollingModels','kenney')
    page.locator('#trainManagement').click()
    page.wait_for_function("document.querySelectorAll('.managementModel').length===14")
    page.locator('[data-view="layout"]').click()
    page.get_by_role('button',name='Focus in 3D').click()
    assert page.evaluate('__serienDiagnostics.snapshot().camera.preset')=='manual'
    assert page.locator('#trainManagement').evaluate('(b)=>document.activeElement===b')
    page.locator('#trainManagement').click();page.keyboard.press('Escape')
    assert not page.locator('dialog.trainManagement').evaluate('(d)=>d.open')
    assert page.locator('#trainManagement').evaluate('(b)=>document.activeElement===b')
    assert not errors,errors
    assert not failed,failed
    result={'result':'PASS','pageErrors':errors,'failedResponses':failed,'catalogModels':14,'checks':['shared selection and console','railway state unchanged by browsing','reverse preserves order','detached identity','external selection','native and imported catalog','3D focus','Escape and focus return','responsive overflow']}
    (output/'browser.json').write_text(json.dumps(result,indent=2)+'\n')
    touch=browser.new_page(viewport={'width':1024,'height':768},has_touch=True)
    touch.on('pageerror',lambda e:errors.append(str(e)))
    touch.on('response',lambda r:failed.append(r.url) if r.status>=400 else None)
    touch.route('**/auth-gate.js*',lambda r:r.fulfill(content_type='text/javascript',body="document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;await import('./dist/game.js');"))
    # Exercise the actual minified build; intercept only its self-scheduling render loop.
    touch.add_init_script("const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>{if(cb.toString().includes('requestAnimationFrame')&&cb.toString().includes('.render(')){window.__m1Frame=cb;return 1;}return raf(cb);};")
    touch.goto(base+'?diagnostics=1',wait_until='domcontentloaded')
    touch.wait_for_function('window.__serienDiagnostics!==undefined',timeout=90000)
    touch.locator('#trainManagement').tap()
    touch.locator('[data-composition="1"]').tap()
    assert touch.evaluate('__serienDiagnostics.snapshot().consoles.active')==1
    assert touch.locator('[data-composition="1"]').get_attribute('aria-pressed')=='true'
    touch.locator('[data-view="catalog"]').tap()
    assert touch.locator('.managementCatalog').is_visible()
    touch.locator('dialog.trainManagement [data-close]').tap()
    assert not touch.locator('dialog.trainManagement').evaluate('(d)=>d.open')
    assert not errors,errors
    assert not failed,failed
    result['productionMinifiedTouch']='PASS'
    (output/'browser.json').write_text(json.dumps(result,indent=2)+'\n')
    browser.close();print(json.dumps(result))
