import json,time,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=True)
result={'renderer':'Chromium/SwiftShader, software GPU; physical GPU NOT VERIFIED','errors':[]}
if '--high-only' in sys.argv: result=json.loads((out/'metrics.json').read_text())
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage'])
 c=b.new_context(viewport={'width':1440,'height':900})
 c.route('**/auth-gate.js*',lambda r:r.fulfill(content_type='text/javascript',body="document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;await import('./dist/game.js');"))
 c.add_init_script("const raf=requestAnimationFrame.bind(window);window.__nativeRaf=raf;window.requestAnimationFrame=cb=>{if(cb.toString().includes('requestAnimationFrame')&&cb.toString().includes('.render(')){window.__smokeFrame=cb;return 1;}return raf(cb);};")
 p=c.new_page();p.on('pageerror',lambda e:result['errors'].append(str(e)))
 start=time.monotonic();p.goto('http://127.0.0.1:8022/?scenario=v06&diagnostics=1',wait_until='domcontentloaded')
 p.wait_for_function('Boolean(window.__serienDiagnostics&&window.__smokeFrame)',timeout=240000)
 if '--high-only' not in sys.argv: result['coldReadySeconds']=time.monotonic()-start
 for quality in (['high'] if '--high-only' in sys.argv else ['low','high']):
  p.evaluate("q=>{document.getElementById('quality').value=q;document.getElementById('quality').dispatchEvent(new Event('change'));__smokeFrame(performance.now());}",quality)
  start=time.monotonic();p.screenshot(path=str(out/(quality+'.png')),timeout=180000)
  metrics=p.evaluate('''()=>{const s=__serienDiagnostics.snapshot();return {render:s.render,scenery:s.scenario.scenery,resources:performance.getEntriesByType('resource').filter(e=>e.name.includes('scenario-v06')).map(e=>({path:e.name.split('/scenario-v06/')[1],durationMs:e.duration,bytes:e.decodedBodySize})),gpu:(()=>{const gl=document.querySelector('#view3d canvas').getContext('webgl2');const x=gl.getExtension('WEBGL_debug_renderer_info');return x?gl.getParameter(x.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);})()};}''')
  metrics['captureSeconds']=time.monotonic()-start
  if quality=='low':
   metrics['nativeRAF']=p.evaluate('''async()=>{let a=[];for(let i=0;i<4;i++)await new Promise(r=>__nativeRaf(t=>{__smokeFrame(t);a.push(t);r();}));return a;}''')
  result[quality]=metrics
  (out/'metrics.json').write_text(json.dumps(result,indent=2)+'\n');print(quality,metrics['render'],flush=True)
 b.close()
