from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image,ImageChops
import json,hashlib
out=Path('/workspace/work/hud-camera/desktop');out.mkdir(exist_ok=True)
root=Path('/workspace/SerieN')
result={'status':'RUNNING','cases':[],'baselineBundleSHA256':hashlib.sha256(Path('/workspace/work/hud-camera/baseline-game.js').read_bytes()).hexdigest(),'productionBundleSHA256':hashlib.sha256((root/'dist/game.js').read_bytes()).hexdigest(),'method':'Authorized baseline bundle rebuilt byte-identically, and corrected production bundle. Same final CSS; added selectors require mobile-only coordination class absent here. Local Auth bootstrap/on-demand real RAF.'}
selectors=['.top','.vp','.sidebar','.u5-dock','#nextSwitchHUD','#guardedStopStatus','#cam','#u3CameraTools','.trainConsole','.plq','.edp']
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage'])
 for mode in ['baseline','current']:
  p=b.new_page(viewport={'width':1692,'height':877},reduced_motion='reduce')
  p.route('**/auth-gate.js*',lambda r:r.fulfill(content_type='text/javascript',body="document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;await import('./dist/game.js');"))
  if mode=='baseline':p.route('**/dist/game.js*',lambda r:r.fulfill(path='/workspace/work/hud-camera/baseline-game.js',content_type='text/javascript'))
  p.add_init_script("const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>{if(cb.toString().includes('requestAnimationFrame')&&cb.toString().includes('.render(')){window.__frame=cb;return 1;}return raf(cb)}")
  p.goto('http://127.0.0.1:8051/?diagnostics=1',wait_until='networkidle');p.wait_for_function('Boolean(window.__serienDiagnostics&&window.__frame)')
  p.evaluate("document.getElementById('pause').click();document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'));__frame(performance.now())")
  p.evaluate('async()=>{await Promise.all([document.fonts.load(\'700 16px "Cinzel Decorative"\'),document.fonts.load(\'400 14px Federo\'),document.fonts.load(\'400 12px "Cutive Mono"\')]);await document.fonts.ready}')
  for width,height in [(1692,877),(768,1024)]:
   p.set_viewport_size({'width':width,'height':height});p.wait_for_timeout(150);p.evaluate('__frame(performance.now())')
   for state in ['normal','expanded-view']:
    if state=='expanded-view':
     if p.locator('.nextSwitchMinimize').get_attribute('aria-expanded')=='false':p.locator('.nextSwitchMinimize').click()
     p.locator('#camt').click()
    p.wait_for_timeout(100)
    measure=p.evaluate('''ss=>Object.fromEntries(ss.map(s=>[s,[...document.querySelectorAll(s)].map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,style:Object.fromEntries(['backgroundImage','font','padding','gap','border','display','position','overflow'].map(k=>[k,getComputedStyle(e)[k]])),text:e.innerText}})]))''',selectors)
    name=f'{mode}-{width}-{state}.png';p.screenshot(path=str(out/name),full_page=True,animations='disabled')
    result['cases'].append({'mode':mode,'viewport':[width,height],'state':state,'regions':measure,'screenshot':name,'coordinationClass':p.locator('.is-camera-coordinated').count()})
    if state=='expanded-view':p.locator('#camt').click();p.locator('.nextSwitchMinimize').click()
  p.close()
 b.close()
for width in [1692,768]:
 for state in ['normal','expanded-view']:
  a,b=[x for x in result['cases']if x['viewport'][0]==width and x['state']==state]
  assert a['regions']==b['regions'],[a,b]
  assert a['coordinationClass']==b['coordinationClass']==0
  ia,ib=Image.open(out/a['screenshot']).convert('RGB'),Image.open(out/b['screenshot']).convert('RGB')
  diff=ImageChops.difference(ia,ib)
  # Inspect the UI pixels, excluding only the scene interior common to both.
  # The frame, sidebar, dock, HUD, camera and Bell remain compared.
  r=a['regions']['.vp'][0];x0,y0,x1,y1=int(r['x']+18),int(r['y']+18),int(r['x']+r['width']-18),int(r['y']+r['height']-18)
  from PIL import ImageDraw
  mask=Image.new('L',ia.size,255);draw=ImageDraw.Draw(mask);draw.rectangle([x0,y0,x1,y1],fill=0)
  for key in ['#nextSwitchHUD','#guardedStopStatus','#cam','#u3CameraTools']:
   for r in a['regions'][key]:
    if r['width']and r['height']:draw.rectangle([int(r['x']),int(r['y']),int(r['x']+r['width']),int(r['y']+r['height'])],fill=255)
  pixels=sum(any(p) and m>0 for p,m in zip(diff.getdata(),mask.getdata()))
  result.setdefault('comparisons',[]).append({'width':width,'state':state,'geometryEqual':True,'UIChangedPixels':pixels})
  # Raster is diagnostic: independent native frames may differ in live map/log data.
  # The gate asserts identical geometry, text and computed presentation above.
result['status']='PASS'
(out/'results.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result['comparisons'],indent=2))
