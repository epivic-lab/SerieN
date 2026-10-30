"""Count actual live ShaderMaterial owners across Cinema disposal, separately from FPS."""
import argparse,base64,json,time
from pathlib import Path
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('--base',required=True);p.add_argument('--bundle',required=True);p.add_argument('--output',required=True);p.add_argument('--cycles',type=int,default=6);p.add_argument('--session-seconds',type=int,default=0);a=p.parse_args();out=Path(a.output);out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader']);page=b.new_page(viewport={'width':650,'height':760});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.route('**/dist/game.js*',lambda r:r.fulfill(path=a.bundle,content_type='application/javascript'))
 page.add_init_script('''let seed=516;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);''')
 page.goto(a.base+'?diagnostics=1',wait_until='domcontentloaded',timeout=120000);page.wait_for_function('window.__serienProfile&&window.__serienShaderCache',timeout=180000)
 page.evaluate("__serienProfile.stop();document.getElementById('pause').click();document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'));document.getElementById('rollingModels').value='kenney';document.getElementById('rollingModels').dispatchEvent(new Event('change'))")
 page.wait_for_function('__serienDiagnostics.snapshot().stock.every(t=>t.vehicles.every(v=>v.dimensions))',timeout=90000)
 page.evaluate("document.getElementById('rollingModels').value='native';document.getElementById('rollingModels').dispatchEvent(new Event('change'));__serienProfile.renderFixed()")
 cdp=page.context.new_cdp_session(page);samples=[]
 for i in range(a.cycles):
  sample={'cycle':i}
  for quality in ['cinema','low']:
   uri=page.evaluate("q=>{const e=document.getElementById('quality');e.value=q;e.dispatchEvent(new Event('change'));return __serienProfile.renderFixed();}",quality)
   if i==a.cycles-1:(out/(quality+'.png')).write_bytes(base64.b64decode(uri.split(',')[1]))
   cdp.send('HeapProfiler.collectGarbage')
   sample[quality]=page.evaluate("()=>({shaderMaterials:__serienShaderCache.materialCache.size,bloomHighPass:[...__serienShaderCache.materialCache.keys()].filter(m=>m.uniforms?.luminosityThreshold).length,programs:__serienProfile.renderer.info.programs.length,memory:{...__serienProfile.renderer.info.memory}})")
   sample[quality]['heap']=cdp.send('Runtime.getHeapUsage')
  samples.append(sample);(out/'samples.json').write_text(json.dumps({'samples':samples,'errors':errors},indent=2)+'\n');print(i,sample['cinema']['bloomHighPass'],sample['low']['bloomHighPass'],sample['low']['shaderMaterials'],flush=True)
 if a.session_seconds:
  page.evaluate("for(let id=0;id<3;id++){document.querySelector('[data-train=\"'+id+'\"]').click();const e=document.getElementById('speed');e.value=35+id*10;e.dispatchEvent(new Event('input'));}document.getElementById('pause').click();__serienProfile.resume()")
  endurance=[];start=time.monotonic()
  while time.monotonic()-start<a.session_seconds:
   page.wait_for_timeout(12000);cdp.send('HeapProfiler.collectGarbage');record=page.evaluate("()=>({shaderMaterials:__serienShaderCache.materialCache.size,bloomHighPass:[...__serienShaderCache.materialCache.keys()].filter(m=>m.uniforms?.luminosityThreshold).length,memory:{...__serienProfile.renderer.info.memory},stock:__serienDiagnostics.snapshot().stock.map(t=>({speed:t.speed,velocity:t.velocity,travel:t.journey.travel}))})");record['heap']=cdp.send('Runtime.getHeapUsage');record['dom']=cdp.send('Memory.getDOMCounters');record['elapsedSeconds']=time.monotonic()-start;endurance.append(record);(out/'endurance.json').write_text(json.dumps(endurance,indent=2)+'\n')
 assert not errors,errors;b.close()
