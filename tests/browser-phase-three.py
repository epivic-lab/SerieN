"""Phase 3 visual integration and scenery checks; requires local npm start.
Run from a temporary validation copy if reports must stay outside the checkout.
"""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('docs/phase-3');out.mkdir(parents=True,exist_ok=True)
base=os.environ.get('SERIEN_URL','http://127.0.0.1:8000/')
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1440,'height':1000});errors=[];failed=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
    page.on('requestfailed',lambda r:failed.append(r.url))
    page.add_init_script("const get=HTMLCanvasElement.prototype.getContext;window.__contexts=new Set();HTMLCanvasElement.prototype.getContext=function(t,...args){const c=get.call(this,t,...args);if(c&&t.includes('webgl'))__contexts.add(c);return c;}")
    page.goto(base+'?diagnostics=1',wait_until='domcontentloaded')
    page.wait_for_function('window.__serienDiagnostics!==undefined',timeout=120000)
    page.evaluate("document.getElementById('pause').click();document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'))")
    page.wait_for_function("[...document.querySelectorAll('.locomotiveThumbnail')].every(i=>i.complete&&i.naturalWidth===320)",timeout=60000)
    result={'sizes':{},'profiles':{}}
    state=page.evaluate('__serienDiagnostics.snapshot()')
    buildings={b['id']:b for b in state['scenery']['buildings'] if 'id' in b}
    assert (buildings['farmhouse']['x'],buildings['farmhouse']['z'])==(1174,183)
    assert any(b['x']==480 and b['z']==440 for b in state['scenery']['buildings'])
    assert (buildings['station']['x'],buildings['station']['z'])==(750,525)
    assert state['scenery']['trees']>80 and not state['scenery']['tunnel']
    result['scenery']=state['scenery']
    for w,h,label in [(1440,1000,'overview'),(1024,900,'tablet'),(390,844,'phone')]:
        page.set_viewport_size({'width':w,'height':h})
        page.wait_for_timeout(500)
        size=page.evaluate("({overflow:document.documentElement.scrollWidth>innerWidth,desk:document.querySelector('.console').getBoundingClientRect().height,maps:[...document.querySelectorAll('.railwayMiniMap')].map(e=>e.getBoundingClientRect().height),base:__serienDiagnostics.snapshot().camera.projectedBase})")
        assert not size['overflow'] and size['desk']==(212 if w==390 else 183),size
        assert size['maps']==[66,66,66]
        assert all(abs(v)<1 for point in size['base'] for v in point[:2])
        result['sizes'][label]=size
        page.screenshot(path=str(out/('after-'+label+'.png')),timeout=120000)
        print(label,'PASS',flush=True)
    page.set_viewport_size({'width':1100,'height':900})
    for quality,day,label in [('high',0,'high-day'),('high',100,'high-night'),('cinema',48,'cinema')]:
        page.evaluate("([q,d])=>{const e=document.getElementById('quality');e.value=q;e.dispatchEvent(new Event('change'));const t=document.getElementById('day');t.value=d;t.dispatchEvent(new Event('input'));}",[quality,day])
        page.wait_for_function('q=>__serienDiagnostics.snapshot().quality.profile===q',arg=quality,timeout=90000)
        page.wait_for_timeout(600)
        page.screenshot(path=str(out/(label+'.png')),timeout=120000)
        result['profiles'][label]=page.evaluate('__serienDiagnostics.snapshot().render')
        print(label,'rendered',flush=True)
    page.evaluate("document.getElementById('quality').value='high';document.getElementById('quality').dispatchEvent(new Event('change'));document.getElementById('day').value=0;document.getElementById('day').dispatchEvent(new Event('input'))")
    for preset in ['station','yard']:
        page.evaluate("v=>{const e=document.getElementById('cameraView');e.value=v;e.dispatchEvent(new Event('change'));}",preset)
        page.wait_for_timeout(1500)
        page.screenshot(path=str(out/(preset+'.png')),timeout=120000)
    assert page.evaluate('__contexts.size')==1
    assert not errors,errors
    assert not failed,failed
    result.update(result='PASS',errors=errors,failedRequests=failed,webglContexts=1,performanceNote='Chromium/SwiftShader; no physical GPU FPS claim.')
    (out/'browser-result.json').write_text(json.dumps(result,indent=2)+'\n')
    browser.close()
    print('Phase 3 PASS',flush=True)
