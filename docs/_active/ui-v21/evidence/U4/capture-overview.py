"""Fresh real app Overview for whole-layout day/night review; focus evidence is separate."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('U4_OVERVIEW_OUTPUT','/workspace/work/ui-v21-u4/overview'));out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1440,'height':900});page.set_default_timeout(60000)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.route('**/auth-gate.js*',lambda r:r.fulfill(content_type='text/javascript',body="document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;await import('./dist/game.js');"))
    page.add_init_script("const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>{if(cb.toString().includes('requestAnimationFrame')&&cb.toString().includes('.render(')){window.__frame=cb;return 1;}return raf(cb);};")
    page.goto(os.environ.get('SERIEN_URL','http://127.0.0.1:8033/')+'?diagnostics=1');page.wait_for_function('Boolean(window.__serienDiagnostics)')
    page.evaluate("document.getElementById('pause').click();document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'))")
    rows=[]
    for width,height in [(1440,900),(1024,768),(390,844)]:
        page.set_viewport_size({'width':width,'height':height})
        for mode,value in [('day',10),('night',95)]:
            page.evaluate('v=>{document.getElementById("day").value=v;document.getElementById("day").dispatchEvent(new Event("input"));document.querySelector(".sidebar").scrollTop=0;window.scrollTo(0,0);__frame(performance.now());}',value)
            page.wait_for_timeout(850);page.screenshot(path=str(out/f'{width}-{mode}-overview.png'))
            assert page.evaluate('__serienDiagnostics.snapshot().camera.preset')=='overview'
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            rows.append({'viewport':[width,height],'daylight':value,'glyph':page.locator('#sun').inner_text()})
        if width==390:page.screenshot(path=str(out/'390-full-overview.png'),full_page=True)
    assert not errors,errors
    (out/'results.json').write_text(json.dumps({'status':'PASS','captures':rows,'errors':errors},indent=2)+'\n');browser.close()
