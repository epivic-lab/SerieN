"""Production bundle, native RAF, three actual trains. No manual simulation/render steps."""
import hashlib, json, os
from pathlib import Path
from playwright.sync_api import sync_playwright

out = Path(os.environ.get('U3_NATIVE_OUTPUT','/workspace/work/ui-v21-u3/native'))
out.mkdir(parents=True,exist_ok=True)
result = {'status':'RUNNING','method':'native RAF; production bundle; local Auth boundary',
          'hardware':'Chromium SwiftShader; physical GPU NOT VERIFIED'}
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
    page = browser.new_page(viewport={'width':1440,'height':900})
    page.set_default_timeout(120000)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.route('**/auth-gate.js*',lambda r:r.fulfill(content_type='text/javascript',body="document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;await import('./dist/game.js');"))
    page.add_init_script("const raf=requestAnimationFrame.bind(window);window.__nativeFrames=[];window.requestAnimationFrame=cb=>raf(t=>{if(cb.toString().includes('requestAnimationFrame')&&cb.toString().includes('.render('))__nativeFrames.push(t);cb(t);});")
    try:
        base=os.environ.get('SERIEN_URL','http://127.0.0.1:8033/')
        page.goto(base+'?diagnostics=1',wait_until='domcontentloaded')
        page.wait_for_function('Boolean(window.__serienDiagnostics)')
        body=page.request.get(base+'dist/game.js').body()
        result['bundleSHA256']=hashlib.sha256(body).hexdigest()
        page.evaluate("document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'));for(const e of document.querySelectorAll('.trainConsole input')){e.value=20;e.dispatchEvent(new Event('input'));}")
        before=page.evaluate('__serienDiagnostics.snapshot().stock.map(t=>t.journey.travel)')
        page.wait_for_function('b=>__serienDiagnostics.snapshot().stock.every((t,i)=>t.journey.travel>b[i]+10&&t.velocity>0)',arg=before,timeout=60000)
        page.locator('#camt').click();page.locator('[data-preset=follow]').click();page.keyboard.press('Escape')
        page.wait_for_function('__serienDiagnostics.snapshot().camera.preset==="follow"')
        box=page.locator('#view3d canvas').bounding_box();x=box['x']+box['width']*.46;y=box['y']+box['height']*.5
        page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+50,y+15,steps=4);page.mouse.up()
        page.wait_for_function('__serienDiagnostics.snapshot().camera.preset==="manual"')
        page.screenshot(path=str(out/'native-three-trains.png'))
        result['travelBefore']=before
        result['travelAfter']=page.evaluate('__serienDiagnostics.snapshot().stock.map(t=>t.journey.travel)')
        result['frames']=page.evaluate('__nativeFrames')
        result['canvasCount']=page.locator('#view3d canvas').count()
        result['errors']=errors
        assert len(result['frames'])>=3 and result['canvasCount']==1 and not errors,result
        result['checks']=['three actual trains advance on native RAF','production bundle over HTTP','native Follow and trusted drag to manual','one original canvas and no pageerror']
        result['status']='PASS'
    except Exception as e:
        result['status']='FAIL';result['failure']=str(e)
        raise
    finally:
        (out/'results.json').write_text(json.dumps(result,indent=2)+'\n')
        browser.close()
print(result['status'])
