"""Production RAF benchmark. Profiling uses a separate, explicitly labelled bundle.
No clock override, asset downgrade or source mutation. Outputs outside old reports.
"""
import argparse,json,math,platform,time,statistics,datetime
from pathlib import Path
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('--base',required=True);p.add_argument('--output',required=True);p.add_argument('--profile-bundle');p.add_argument('--repeats',type=int,default=3);p.add_argument('--frames',type=int,default=24);p.add_argument('--mode',choices=['normal','profile','extended'],default='normal');p.add_argument('--session-seconds',type=int,default=120);p.add_argument('--resume',action='store_true');p.add_argument('--case-filter',default='');p.add_argument('--graphics-frames',type=int,default=16);p.add_argument('--cycles',type=int,default=12);args=p.parse_args()
out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
def stats(xs):
 s=sorted(xs);return {'n':len(xs),'meanMs':statistics.mean(xs),'medianMs':statistics.median(xs),'p95Ms':s[max(0,math.ceil(len(s)*.95)-1)],'maxMs':max(xs),'effectiveFps':1000/statistics.mean(xs),'framesOver50Ms':sum(x>50 for x in xs)}
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--enable-precise-memory-info'])
 page=browser.new_page(viewport={'width':650,'height':760},device_scale_factor=1);errors=[];failed=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('requestfailed',lambda r:failed.append(r.url))
 if args.mode!='normal':
  assert args.profile_bundle
  page.route('**/dist/game.js*',lambda route:route.fulfill(path=args.profile_bundle,content_type='application/javascript'))
 page.add_init_script('''()=>{}''')
 page.add_init_script('''(()=>{const raf=requestAnimationFrame.bind(window);window.__perf={frames:[],ticks:[],longTasks:[],collect:false};window.requestAnimationFrame=callback=>raf(time=>{const start=performance.now();callback(time);if(__perf.collect){__perf.tickIndex++;if(__perf.action)__perf.action(__perf.tickIndex);__perf.ticks.push(performance.now()-start);}});new PerformanceObserver(list=>{if(__perf.collect)for(const e of list.getEntries())__perf.longTasks.push({start:e.startTime,duration:e.duration});}).observe({type:'longtask',buffered:false});window.__sampleFrames=count=>new Promise(resolve=>{let last;const step=now=>{if(last!==undefined)__perf.frames.push(now-last);last=now;if(__perf.frames.length>=count){__perf.collect=false;resolve({frames:__perf.frames,ticks:__perf.ticks,longTasks:__perf.longTasks,interactions:__perf.interactions});}else raf(step);};__perf.frames=[];__perf.ticks=[];__perf.longTasks=[];__perf.tickIndex=0;__perf.interactions=[];__perf.collect=true;raf(step);});})();''')
 started=time.monotonic();page.goto(args.base+'?diagnostics=1',wait_until='domcontentloaded',timeout=120000);page.wait_for_function('window.__serienDiagnostics!==undefined',timeout=180000)
 page.evaluate("document.getElementById('pause').click();document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'));window.confirm=()=>true")
 page.wait_for_function("[...document.querySelectorAll('.locomotiveThumbnail')].every(i=>i.complete&&i.naturalWidth)",timeout=90000)
 first_ready=time.monotonic()-started
 page.evaluate("document.getElementById('rollingModels').value='kenney';document.getElementById('rollingModels').dispatchEvent(new Event('change'))")
 page.wait_for_function('__serienDiagnostics.snapshot().stock.every(t=>t.vehicles.every(v=>v.dimensions))',timeout=90000)
 page.evaluate("document.getElementById('rollingModels').value='native';document.getElementById('rollingModels').dispatchEvent(new Event('change'));__serienDiagnostics.addTrain();__serienDiagnostics.step(0)")
 cdp=page.context.new_cdp_session(page);cdp.send('Performance.enable');cdp.send('HeapProfiler.enable')
 env=page.evaluate('''()=>{const canvas=document.querySelector('canvas'),gl=canvas.getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');return {userAgent:navigator.userAgent,dpr:devicePixelRatio,viewport:[innerWidth,innerHeight],gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null,gpuTimerQuery:gl.getSupportedExtensions().includes('EXT_disjoint_timer_query_webgl2'),navigation:performance.getEntriesByType('navigation')[0].toJSON(),resources:performance.getEntriesByType('resource').map(e=>({name:e.name,duration:e.duration,transfer:e.transferSize,encoded:e.encodedBodySize,decoded:e.decodedBodySize}))};}''')
 env.update(os=platform.platform(),browser=browser.version,firstReadyWallSeconds=first_ready,mode=args.mode)
 env_file=out/'environment.json'
 if env_file.exists() and args.resume:env_file=out/('environment-resume-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'.json')
 env_file.write_text(json.dumps(env,indent=2)+'\n')
 def prepare(scenario,quality='low',day=48,camera='overview'):
  return page.evaluate('''({scenario,quality,day,camera})=>{
 const $=id=>document.getElementById(id),api=__serienDiagnostics;$('reset').click();$('pause').click();
 $('quality').value=quality;$('quality').dispatchEvent(new Event('change'));$('day').value=day;$('day').dispatchEvent(new Event('input'));$('cameraView').value=camera;$('cameraView').dispatchEvent(new Event('change'));
 const speed=(id,v)=>{document.querySelector('[data-train="'+id+'"]').click();$('speed').value=v;$('speed').dispatchEvent(new Event('input'));};
 if(scenario==='B')speed(0,45);if(['C','D','E','F'].includes(scenario))[0,1,2].forEach(id=>speed(id,35+id*10));
 window.__perf.action=null;
 if(scenario==='D'){document.querySelector('[data-train="3"]').click();$('reverse').click();speed(3,25);$('routePreview').click();
 __perf.action=n=>{if(![8,16,17,24].includes(n))return;const start=performance.now();if(n===8)speed(0,55);if(n===16)$('stopAll').click();if(n===17)[0,1,2,3].forEach(id=>speed(id,35));if(n===24){document.querySelector('[data-train="3"]').click();$('reverse').click();}__perf.interactions.push({frame:n,kind:n===16?'STOP_ALL':n===24?'reverse':'speed',durationMs:performance.now()-start});};
 }
 $('pause').click();return {scenario,quality,day,camera};}''',dict(scenario=scenario,quality=quality,day=day,camera=camera))
 def compact():
  return page.evaluate('''()=>{const s=__serienDiagnostics.snapshot();return {render:s.render,quality:s.quality,camera:s.camera,stock:s.stock.map(t=>({id:t.id,speed:t.speed,velocity:t.velocity,travel:t.journey.travel,cars:t.cars.length})),consoles:s.consoles};}''')
 def gc_heap():
  cdp.send('HeapProfiler.collectGarbage');return cdp.send('Runtime.getHeapUsage')
 results=json.loads((out/'normal.json').read_text()) if args.resume and args.mode=='normal' and (out/'normal.json').exists() else []
 if args.mode=='normal':
  cases=[('A','low',48,'overview'),('B','low',48,'overview'),('C','low',48,'overview'),('D','low',48,'overview'),('C','low',95,'overview')]+[('E',q,d,c) for q in ['high','cinema'] for d in [10,95] for c in ['overview','follow']]
  for scenario,quality,day,camera in cases:
   if args.case_filter and args.case_filter not in '/'.join(map(str,[scenario,quality,day,camera])):continue
   for repeat in range(args.repeats):
    if any(x['scenario']==scenario and x['quality']==quality and x['day']==day and x['camera']==camera and x['repeat']==repeat for x in results):continue
    config=prepare(scenario,quality,day,camera);page.evaluate('__sampleFrames(3)');before=compact();metrics_before=cdp.send('Performance.getMetrics');t=time.monotonic();raw=page.evaluate('n=>__sampleFrames(n)',args.frames if quality=='low' else args.graphics_frames)
    # D includes recorded synchronous UI commands; RAF and clock are unmodified.
    entry={**config,'repeat':repeat,'wallSeconds':time.monotonic()-t,'frame':stats(raw['frames']),'tick':stats(raw['ticks']),'raw':raw,'before':before,'after':compact(),'cdpBefore':metrics_before,'cdpAfter':cdp.send('Performance.getMetrics'),'heap':cdp.send('Runtime.getHeapUsage')}
    results.append(entry);(out/'normal.json').write_text(json.dumps(results,indent=2)+'\n');print(scenario,quality,day,camera,repeat,entry['frame']['medianMs'],flush=True)
 elif args.mode=='profile':
  for scenario in ['A','B','C','D']:
   prepare(scenario);page.evaluate('__sampleFrames(3)');cdp.send('Profiler.enable');cdp.send('Profiler.setSamplingInterval',{'interval':1000});cdp.send('Profiler.start');page.evaluate('__sampleFrames(10)');profile=cdp.send('Profiler.stop')['profile'];(out/(scenario+'.cpuprofile')).write_text(json.dumps(profile)+'\n')
   page.evaluate('__serienProfile.stop()')
   batches=[]
   for repeat in range(args.repeats):
    prepare(scenario)
    if scenario=='D':page.evaluate('__serienProfile.longFleet()')
    page.evaluate('__serienProfile.renderer.getContext().finish()')
    batches.append(page.evaluate('''()=>{const p=__serienProfile,result={};for(const [name,fn,count] of [['models',p.renderVehicles,100],['assistance',p.getSwitchAssistance,60],['deck',()=>p.trainDeck.update(),500],['simulation',()=>p.advanceFleet(1/60),300]]){for(let i=0;i<10;i++)fn();const start=performance.now();for(let i=0;i<count;i++)fn();result[name]={iterations:count,totalMs:performance.now()-start};}if(p.trains[3])p.trains[3].initial={loop:2,cars:0,edge:'T47',s:80};return result;}'''))
   results.append({'scenario':scenario,'batches':batches,'heap':gc_heap()});(out/'components.json').write_text(json.dumps(results,indent=2)+'\n');page.evaluate('__serienProfile.resume()');print('profile',scenario,flush=True)
  whole=[]
  for q in ['low','high','cinema']:
   prepare('E',q);page.evaluate('__sampleFrames(3)');page.evaluate('__serienProfile.stop()')
   whole.append(page.evaluate('''q=>{const p=__serienProfile;p.renderer.info.autoReset=false;p.renderer.info.reset();p.effects.render(q==='cinema');p.renderer.getContext().finish();const result={quality:q,calls:p.renderer.info.render.calls,triangles:p.renderer.info.render.triangles,memory:{...p.renderer.info.memory},scope:'all render calls in one complete frame'};p.renderer.info.autoReset=true;return result;}''',q));page.evaluate('__serienProfile.resume()')
  (out/'whole-frame-counters.json').write_text(json.dumps(whole,indent=2)+'\n')
  prepare('A');page.evaluate('__sampleFrames(3)');page.evaluate('__serienProfile.staticScene()');raw=page.evaluate('''()=>new Promise(resolve=>{const p=__serienProfile,samples=[];let last;const f=t=>{p.renderer.render(p.scene,p.camera);if(last!==undefined)samples.push(t-last);last=t;if(samples.length===24)resolve(samples);else requestAnimationFrame(f);};requestAnimationFrame(f);})''');(out/'static-scene.json').write_text(json.dumps({'scope':'renderer-only scene; train roots removed, application tick stopped','frame':stats(raw),'raw':raw},indent=2)+'\n')
 else:
  for repeat in range(args.repeats):
   prepare('F');samples=[];start=time.monotonic()
   while time.monotonic()-start<args.session_seconds:
    raw=page.evaluate('__sampleFrames(12)');samples.append({'elapsed':time.monotonic()-start,'frame':stats(raw['frames']),'state':compact(),'heap':gc_heap()})
    (out/f'extended-{repeat}.json').write_text(json.dumps(samples,indent=2)+'\n');print('extended',repeat,round(samples[-1]['elapsed']),flush=True)
   cycles=[]
   for i in range(args.cycles):
    prepare('A',quality=['low','high','cinema'][i%3],day=[10,95][i%2]);page.evaluate('__sampleFrames(3)');cycles.append({'cycle':i,'state':compact(),'heap':gc_heap()})
   (out/f'cycles-{repeat}.json').write_text(json.dumps(cycles,indent=2)+'\n')
 (out/'errors.json').write_text(json.dumps({'errors':errors,'failedRequests':failed},indent=2)+'\n');assert not errors,errors;assert not failed,failed;browser.close()
