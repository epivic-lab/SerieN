"""Production native RAF and live physical sidebar markers; no manual simulation/render steps."""
import hashlib,json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('U4_NATIVE_OUTPUT','/workspace/work/ui-v21-u4/native'));out.mkdir(parents=True,exist_ok=True)
result={'status':'RUNNING','method':'native RAF; production bundle; local Auth boundary','hardware':'Chromium SwiftShader; physical GPU NOT VERIFIED'}
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':650,'height':760});page.set_default_timeout(120000)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.route('**/auth-gate.js*',lambda r:r.fulfill(content_type='text/javascript',body="document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;await import('./dist/game.js');"))
    page.add_init_script("const raf=requestAnimationFrame.bind(window);window.__u4NativeFrames=[];window.requestAnimationFrame=cb=>raf(t=>{if(cb.toString().includes('requestAnimationFrame')&&cb.toString().includes('.render('))__u4NativeFrames.push(t);cb(t);});")
    try:
        base=os.environ.get('SERIEN_URL','http://127.0.0.1:8033/')
        page.goto(base+'?diagnostics=1',wait_until='domcontentloaded');page.wait_for_function('Boolean(window.__serienDiagnostics)')
        result['bundleSHA256']=hashlib.sha256(page.request.get(base+'dist/game.js').body()).hexdigest()
        page.evaluate("document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'));for(const e of document.querySelectorAll('.trainConsole input')){e.value=20;e.dispatchEvent(new Event('input'));}")
        result['before']=page.evaluate('__serienDiagnostics.snapshot().stock.map(t=>t.journey.travel)')
        frames=page.evaluate('__u4NativeFrames.length')
        page.wait_for_function('n=>__u4NativeFrames.length>=n+4',arg=frames)
        result['state']=page.evaluate("""()=>{const a=__serienDiagnostics,s=a.snapshot();return {travel:s.stock.map(t=>t.journey.travel),velocity:s.stock.map(t=>t.velocity),markers:s.stock.map(t=>{const e=document.querySelector('#sidebarRailwayMap [data-map-train="'+t.id+'"]');return {id:t.id,x:t.vehicles[0].x,z:t.vehicles[0].z,cx:+e.getAttribute('cx'),cy:+e.getAttribute('cy')};})};}""")
        assert all(v>0 for v in result['state']['velocity'])
        assert all(after>before for before,after in zip(result['before'],result['state']['travel']))
        assert all(abs(m['x']-m['cx'])<1e-7 and abs(m['z']-m['cy'])<1e-7 for m in result['state']['markers'])
        result['focus']=page.evaluate("""()=>{const a=__serienDiagnostics,before=JSON.stringify(a.railwayState());document.querySelector('.u4-map-trains [data-map-train="1"]').click();return {railwayUnchanged:before===JSON.stringify(a.railwayState()),selected:a.snapshot().consoles.active,preset:a.snapshot().camera.preset};}""")
        assert result['focus']=={'railwayUnchanged':True,'selected':1,'preset':'manual'}
        page.screenshot(path=str(out/'native-three-trains.png'))
        result['frames']=page.evaluate('__u4NativeFrames')
        result['errors']=errors
        assert page.locator('#view3d canvas').count()==1 and not errors
        result['status']='PASS'
    except Exception as e:
        result['status']='FAIL';result['failure']=str(e)
        raise
    finally:
        (out/'results.json').write_text(json.dumps(result,indent=2)+'\n');browser.close()
print(result['status'])
