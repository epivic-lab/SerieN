"""Additional real cycle/destination SVG and active Route at the three review viewports."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('U3_NORMAL_OUTPUT','/workspace/work/ui-v21-u3/normal-route'));out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1440,'height':900});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.route('**/auth-gate.js*',lambda r:r.fulfill(content_type='text/javascript',body="document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;await import('./dist/game.js');"))
    page.add_init_script("const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>{if(cb.toString().includes('requestAnimationFrame')&&cb.toString().includes('.render(')){window.__frame=cb;return 1;}return raf(cb);};")
    page.goto(os.environ.get('SERIEN_URL','http://127.0.0.1:8033/')+'?diagnostics=1');page.wait_for_function('Boolean(window.__serienDiagnostics)')
    page.evaluate("document.getElementById('pause').click();document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'));__frame(performance.now());__serienDiagnostics.step(0)")
    captures=[]
    for width,height in [(1440,900),(1024,768),(390,844)]:
        page.set_viewport_size({'width':width,'height':height})
        if page.locator('.nextSwitchMinimize').get_attribute('aria-expanded')=='false':page.locator('.nextSwitchMinimize').click()
        page.locator('#camt').click();page.locator('#routePreview').click();page.keyboard.press('Escape')
        page.evaluate('__frame(performance.now())');page.wait_for_timeout(850)
        page.screenshot(path=str(out/f'{width}-hud-real-route.png'))
        state=page.evaluate('__serienDiagnostics.snapshot().nextSwitch')
        assert state['outgoing'] and state['destination'] and state['highlighted'],state
        assert page.locator('.nextSwitchScheme [marker-end]').count()>0
        captures.append({'viewport':[width,height],'nextSwitch':state})
        page.locator('#camt').click()
        assert page.locator('#routePreview').evaluate('e=>getComputedStyle(e).color')=='rgb(42, 29, 8)'
        page.locator('#routePreview').click();page.keyboard.press('Escape')
    assert not errors,errors
    (out/'results.json').write_text(json.dumps({'status':'PASS','captures':captures,'errors':errors},indent=2)+'\n')
    browser.close()
