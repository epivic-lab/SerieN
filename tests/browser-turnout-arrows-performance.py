"""Short isolated RAF comparison against the actual published 5D and S4.
Uses temporary profiling bundles; not a repeat of the full 5D audit.
"""
import json,statistics,math,os
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('S4_PERF_OUTPUT','turnout-s4-performance'));out.mkdir(parents=True,exist_ok=True);results={}
baseline=os.environ['S4_5D_BUNDLE'];candidate=os.environ['S4_BUNDLE'];prior=os.environ['S3_BASELINE_BUNDLE']
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 for label,bundle,variant in [('5D',baseline,None),('S3-B',prior,None),('S4-red',candidate,None),('S4-red-blue',candidate,'B')]:
  c=b.new_context(viewport={'width':650,'height':760},device_scale_factor=1);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.route('**/dist/game.js*',lambda r:r.fulfill(path=bundle,content_type='application/javascript'))
  page.add_init_script('let seed=516;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);')
  page.goto(os.environ.get('SERIEN_URL','http://127.0.0.1:8003/')+'?diagnostics=1',wait_until='domcontentloaded',timeout=120000);page.wait_for_function('__serienProfile',timeout=180000)
  page.evaluate("__serienProfile.stop();document.getElementById('pause').click();document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'));document.getElementById('day').value=48;document.getElementById('day').dispatchEvent(new Event('input'));__serienProfile.renderFixed()")
  if label=='S3-B':page.evaluate("__s3.glow.setVariant('B')")
  if variant:page.evaluate("v=>{__s3.glow.setVariant(v);__s3.glow.identify('Y-IN',performance.now());}",variant)
  page.evaluate('__serienProfile.resume()')
  samples=page.evaluate('''()=>new Promise(resolve=>{let previous;const values=[];function f(t){if(previous!==undefined)values.push(t-previous);previous=t;if(values.length===19)resolve(values.slice(3));else requestAnimationFrame(f)}requestAnimationFrame(f)})''')
  page.evaluate('__serienProfile.stop()');data=page.evaluate('''()=>({render:__serienDiagnostics.snapshot().render,programs:__serienProfile.renderer.info.programs.length,glow:window.__s3?.glow.snapshot??null})''')
  if label=='S4-red':
   data['movingProjectionCpu']=page.evaluate('''()=>{const s=__s4,old=s.trains.map(t=>t.velocity),values=[];s.trains.forEach(t=>t.velocity=25*t.dir);for(let batch=0;batch<16;batch++){const start=performance.now();for(let i=0;i<100;i++)s.arrows.update(performance.now(),true);values.push((performance.now()-start)/100);}s.trains.forEach((t,i)=>t.velocity=old[i]);return {batchMeansMs:values,forcedUpdates:1600,note:'3 moving-train Journey observations plus all8 projections; graphics update only, no physics or rendering; normal cadence at most 150ms'};}''')
  results[label]={**data,'samplesMs':samples,'p50Ms':statistics.median(samples),'p95NearestRankMs':sorted(samples)[math.ceil(.95*len(samples))-1],'errors':errors};assert not errors
  (out/'performance.json').write_text(json.dumps(results,indent=2)+'\n');print(label,results[label]['p50Ms'],results[label]['p95NearestRankMs'],data['render'],flush=True);c.close()
 b.close()
