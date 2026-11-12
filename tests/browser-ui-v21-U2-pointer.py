"""Actual canvas pointer delivery after U2 menu close; local boot fixture."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('U2_POINTER_OUTPUT','work/u2-pointer'));out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader']);p=b.new_page(viewport={'width':1440,'height':900});errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
 p.route('**/auth-gate.js*',lambda q:q.fulfill(content_type='text/javascript',body="document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;await import('./dist/game.js');"))
 p.add_init_script("const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>{if(cb.toString().includes('requestAnimationFrame')&&cb.toString().includes('.render('))return 1;return raf(cb);};")
 p.goto(os.environ.get('SERIEN_URL','http://127.0.0.1:8022/')+'?diagnostics=1',wait_until='domcontentloaded');p.wait_for_function('Boolean(window.__serienDiagnostics)')
 p.locator('.top').get_by_role('button',name='Menu',exact=True).click();p.keyboard.press('Escape');assert not p.locator('#dlg').is_visible()
 box=p.locator('#view3d canvas').bounding_box();x=box['x']+box['width']*.5;y=box['y']+box['height']*.5;p.mouse.move(x,y);p.mouse.down();p.mouse.move(x+45,y+20,steps=4);p.mouse.up()
 assert p.evaluate('__serienDiagnostics.snapshot().camera.preset')=='manual';assert p.locator('#view3d canvas').count()==1;assert not errors
 result={'status':'PASS','checks':['menu Escape removes top layer','trusted pointer drag reaches original OrbitControls','single original canvas','no pageerror'],'limit':'Does not certify all 3D turnout hit regions; real controller/guard domain tests retained.'};(out/'result.json').write_text(json.dumps(result,indent=2)+'\n');print(result);b.close()
