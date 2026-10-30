"""Isolated 5D/S4/S5 comparison with ACTIVE railway simulation and identical rendering.
16 RAF samples after3warmups; 1600 extra fixed core steps measured separately.
Not a physical-GPU FPS claim or a repeat of the full5D matrix.
"""
import os,json,statistics,math
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('S5_PERF_OUTPUT','railway-s5-performance'));out.mkdir(parents=True,exist_ok=True);results={}
def clean(v):
 if isinstance(v,float) and not math.isfinite(v):return None
 if isinstance(v,dict):return {k:clean(x) for k,x in v.items()}
 if isinstance(v,list):return [clean(x) for x in v]
 return v
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 cases=([('5D',os.environ['S5_5D_BUNDLE'])] if os.environ.get('S5_5D_BUNDLE') else [])+[('S4',os.environ['S4_BASELINE_BUNDLE']),('S5',os.environ['S5_BUNDLE'])]
 for label,bundle in cases:
  context=b.new_context(viewport={'width':650,'height':760},device_scale_factor=1);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.add_init_script('let seed=516;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);')
  page.route('**/dist/game.js*',lambda r:r.fulfill(path=bundle,content_type='application/javascript'))
  page.goto(os.environ.get('SERIEN_URL','http://127.0.0.1:8003/')+'?diagnostics=1',wait_until='domcontentloaded',timeout=120000);page.wait_for_function('__serienProfile',timeout=180000)
  page.evaluate('''()=>{const p=__serienProfile,$=id=>document.getElementById(id);p.stop();$('quality').value='low';$('quality').dispatchEvent(new Event('change'));$('day').value=48;$('day').dispatchEvent(new Event('input'));__serienDiagnostics.setSwitches([]);p.renderFixed();p.trains.forEach((t,i)=>{t.dir=i===1?-1:1;t.speed=70;t.velocity=105*t.dir;});$('pause').click();p.resume();}''')
  startTravel=page.evaluate('__serienProfile.trains.map(t=>t.journey.travel)')
  samples=page.evaluate('''()=>new Promise(resolve=>{let before;const samples=[];function f(t){if(before!==undefined)samples.push(t-before);before=t;if(samples.length===19)resolve(samples.slice(3));else requestAnimationFrame(f)}requestAnimationFrame(f)})''')
  page.evaluate('__serienProfile.stop()')
  activeTravel=page.evaluate('__serienProfile.trains.map(t=>t.journey.travel)');assert all(a>b for a,b in zip(activeTravel,startTravel))
  details=page.evaluate('''()=>{const p=__serienProfile,values=[];for(let batch=0;batch<16;batch++){const start=performance.now();for(let i=0;i<100;i++)p.advanceFleet(1/60);values.push((performance.now()-start)/100);}return {coreBatchMeansMs:values,coreSteps:1600,render:__serienDiagnostics.snapshot().render,trains:p.trains.map(t=>({id:t.id,speed:t.speed,velocity:t.velocity,travel:t.journey.travel,guard:t.guard??null}))};}''')
  assert not errors and all(t['speed']==70 for t in details['trains']),(label,errors,details)
  if label=='S5':assert all(t['guard']['state']=='SAFE' for t in details['trains'])
  results[label]={**details,'activeRafTravelMm':[a-b for a,b in zip(activeTravel,startTravel)],'samplesMs':samples,'p50Ms':statistics.median(samples),'p95Ms':sorted(samples)[math.ceil(.95*len(samples))-1],'coreMedianMs':statistics.median(details['coreBatchMeansMs']),'errors':errors}
  (out/'performance.json').write_text(json.dumps(clean(results),indent=2,allow_nan=False)+'\n');print(label,results[label]['p50Ms'],results[label]['p95Ms'],'core',results[label]['coreMedianMs'],flush=True);context.close()
 b.close()
