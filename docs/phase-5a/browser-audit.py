"""Non-persistent browser audit; no source/deployment changes. Outputs metadata only."""
import argparse,json,statistics
from pathlib import Path
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser();parser.add_argument('--base',default='http://127.0.0.1:8000/');parser.add_argument('--output',required=True);parser.add_argument('--probe',action='store_true');args=parser.parse_args()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 page=browser.new_page(viewport={'width':650,'height':760});errors=[];failed=[];http_errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('requestfailed',lambda r:failed.append(r.url));page.on('response',lambda r:http_errors.append({'url':r.url,'status':r.status}) if r.status>=400 else None)
 response=page.goto(args.base+'?diagnostics=1',wait_until='domcontentloaded');page.wait_for_function('window.__serienDiagnostics!==undefined',timeout=120000)
 page.evaluate("document.getElementById('pause').click();document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'))")
 page.wait_for_function("[...document.querySelectorAll('.locomotiveThumbnail')].every(i=>i.complete&&i.naturalWidth===320)",timeout=60000)
 page.evaluate("document.getElementById('rollingModels').value='kenney';document.getElementById('rollingModels').dispatchEvent(new Event('change'))")
 page.wait_for_function('__serienDiagnostics.snapshot().stock.every(t=>t.vehicles.every(v=>v.dimensions))',timeout=90000)
 result={'base':args.base,'status':response.status,'headers':{k:v for k,v in response.headers.items() if k in ['content-security-policy','content-security-policy-report-only','referrer-policy','x-content-type-options','x-frame-options','strict-transport-security','cache-control','content-type']},'kenneyVehiclesLoaded':True,'nativeThumbnailCounts':page.locator('.locomotiveThumbnail').count()}
 result['graphics']=page.evaluate("(()=>{const gl=document.querySelector('#view3d canvas').getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');return {vendor:ext?gl.getParameter(ext.UNMASKED_VENDOR_WEBGL):null,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null};})()")
 page.evaluate("document.getElementById('rollingModels').value='native';document.getElementById('rollingModels').dispatchEvent(new Event('change'))")
 page.evaluate('__serienDiagnostics.step(0)')
 if args.probe:
  result['collisionProbe']=page.evaluate('''()=>{
   const api=__serienDiagnostics,$=s=>document.querySelector(s);
   $('[data-train="2"]').click();$('#uncouple').click();$('#uncouple').click();
   $('#addTrain').click();api.placeTrain(2,'T47',238,1);api.placeTrain(3,'T46',10,1);
   const before=api.snapshot();
   for(const id of [2,3]){$('[data-train="'+id+'"]').click();$('#speed').value=25;$('#speed').dispatchEvent(new Event('input'));}
   api.step(.12);const after=api.snapshot();const pair=after.stock.filter(t=>[2,3].includes(t.id));
   const a=pair[0].vehicles[0],b=pair[1].vehicles[0];
   $('#stopAll').click();
   return {scenario:'Native shunter and BR216 on adjoining straight T47/T46, no trailing vehicles',before:before.stock.filter(t=>[2,3].includes(t.id)).map(t=>({id:t.id,point:t.vehicles[0],cars:t.cars.length})),after:pair.map(t=>({id:t.id,velocity:t.velocity,edge:t.vehicles[0].edge,s:t.vehicles[0].s})),centreDistance:Math.hypot(a.x-b.x,a.z-b.z),bothStillMoving:pair.every(t=>t.velocity>0)};
  }''')
  # Clear the isolated scenario by resetting; use the production command, not synthetic disposal.
  page.evaluate("window.confirm=()=>true;document.getElementById('reset').click();document.getElementById('pause').click()")
  page.wait_for_timeout(1000);samples=[]
  for i in range(11):
   if i:page.evaluate("document.getElementById('reset').click();document.getElementById('pause').click()")
   page.wait_for_timeout(250)
   samples.append(page.evaluate('__serienDiagnostics.snapshot().render'))
  result['resetSamples']={'count':10,'metrics':samples,'note':'GPU resource counters after warmup; not a JS heap or physical GPU leak proof'}
  result['frameIntervalsMs']=page.evaluate('''()=>new Promise(resolve=>{let last=performance.now(),samples=[];const f=now=>{samples.push(now-last);last=now;if(samples.length===20)resolve(samples);else requestAnimationFrame(f);};requestAnimationFrame(f);})''')
 result.update(errors=errors,failedRequests=failed,httpErrors=http_errors)
 result['passNormalLoad']=response.status==200 and not errors and not failed and not http_errors
 Path(args.output).write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k not in ['collisionProbe','resetSamples','frameIntervalsMs']}));browser.close()
