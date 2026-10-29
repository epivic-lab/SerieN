"""Real movement, stock animation, coupling and graphics acceptance for Phase 4."""
import json, os, time
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('docs/phase-4');out.mkdir(parents=True,exist_ok=True)
base=os.environ.get('SERIEN_URL','http://127.0.0.1:8000/')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1440,'height':1000});errors=[];failed=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.on('requestfailed',lambda r:failed.append(r.url))
 page.goto(base+'?diagnostics=1',wait_until='domcontentloaded');page.wait_for_function('window.__serienDiagnostics!==undefined',timeout=120000)
 page.evaluate("document.getElementById('pause').click();document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'))")
 page.wait_for_function("[...document.querySelectorAll('.locomotiveThumbnail')].every(i=>i.complete&&i.naturalWidth===320)",timeout=60000)
 result=page.evaluate('''()=>{
  const api=__serienDiagnostics,$=s=>document.querySelector(s),check=(ok,m)=>{if(!ok)throw Error(m)},snap=()=>api.snapshot();
  const select=i=>$('[data-train="'+i+'"]').click();
  const speed=(i,v)=>{select(i);$('#speed').value=v;$('#speed').dispatchEvent(new Event('input'));};
  const initial=snap();[0,1,2].forEach(i=>speed(i,25+i*5));api.step(4);const moved=snap();
  check(moved.stock.every((t,i)=>t.journey.travel>initial.stock[i].journey.travel),'three moving trains');
  for(const i of [0,2]){
    const t=moved.stock[i],before=initial.stock[i];check(t.animation.wheels.length>2,'real axles');
    t.animation.wheels.forEach((w,k)=>check(Math.abs(w.angle+t.odometer/w.radius)<1e-7,'distance synchronized wheel'));
    check(JSON.stringify(t.animation.rods)!==JSON.stringify(before.animation.rods),'rods move');
  }
  $('#stopAll').click();const stopped=snap();api.step(2);check(JSON.stringify(snap().stock.map(t=>t.animation))===JSON.stringify(stopped.stock.map(t=>t.animation)),'stationary animation frozen');
  [0,1,2].forEach(i=>{select(i);$('#reverse').click();speed(i,25+i*5);});api.step(4);$('#stopAll').click();
  const reversed=snap();check(reversed.stock.every((t,i)=>Math.hypot(t.vehicles[0].x-initial.stock[i].vehicles[0].x,t.vehicles[0].z-initial.stock[i].vehicles[0].z)<1e-5),'reverse returns to original location');
  select(0);const before=snap();$('#uncouple').click();const detached=snap();check(detached.detached.length===1,'actual wagon detached');
  $('#reverse').click();speed(0,30);api.step(2);$('#stop').click();$('#couple').click();check(snap().detached.length===1,'distant wagon rejected '+JSON.stringify({before:before.stock[0].odometer,current:snap().stock[0].odometer,dir:snap().stock[0].dir,speed:snap().stock[0].speed,detached:snap().detached}));
  $('#reverse').click();speed(0,30);api.step(2);$('#stop').click();$('#couple').click();const coupled=snap();check(coupled.detached.length===0&&coupled.stock[0].cars.length===before.stock[0].cars.length,'actual wagon recoupled');
  check(coupled.stock[1].vehicles.some(v=>v.stock?.kind==='coach'),'passenger coach integrated');
  check([...document.querySelectorAll('.trainConsoleCars')].every(e=>e.title.includes('mm')),'consist lengths in consoles');
  for(const t of coupled.stock)for(const v of t.vehicles)check(Math.hypot(v.x-v.rendered.x,v.z-v.rendered.z)<1e-8,'canonical centreline');
  return {threeMovingTrains:true,signedWheelAnimation:true,rods:true,freeze:true,reverse:true,nearCoupling:true,distantCouplingRejected:true,consoleLengths:true,canonicalPositions:true,native:coupled};
 }''')
 print('PASS: real motion, wheel/rod phases, reverse, coupling guard and consoles',flush=True)
 graph=page.request.get(base+'docs/jmri-layout/canonical-graph.json').json()
 result['terminalManoeuvres']=page.evaluate('''graph=>{
  const api=__serienDiagnostics,$=s=>document.querySelector(s),check=(ok,m)=>{if(!ok)throw Error(m)};
  $('#stopAll').click();['T12','T0','T16'].forEach((edge,i)=>api.placeTrain(i,edge,150));
  $('#addTrain').click();$('[data-train="3"]').click();const results=[];
  for(const edge of graph.edges.filter(e=>graph.nodes[e.from].terminal||graph.nodes[e.to].terminal)){
    const dir=graph.nodes[edge.to].terminal?1:-1;
    api.placeTrain(3,edge.id,dir===1?edge.length-50:50,dir);
    $('#speed').value=25;$('#speed').dispatchEvent(new Event('input'));api.step(20);
    const train=api.snapshot().stock[3],p=train.vehicles[0];
    check(train.speed===0&&train.velocity===0&&p.edge===edge.id,'terminal stop '+edge.id);
    const remaining=dir===1?edge.length-p.s:p.s;
    check(remaining>=30&&remaining<50,'actual buffer envelope '+edge.id);
    results.push({edge:edge.id,direction:dir,remainingMm:remaining,stopped:true});
  }
  check(results.length===4,'four canonical terminals');return results;
 }''',graph)
 print('PASS: short locomotive stops at all four real terminal envelopes',flush=True)
 for w,h,label in [(1440,1000,'desktop'),(768,1024,'tablet'),(390,844,'phone')]:
  page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(250)
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
  page.screenshot(path=str(out/(label+'.png')),timeout=120000)
 page.set_viewport_size({'width':1100,'height':900})
 page.evaluate("document.querySelector('[data-train=\"0\"]').click();document.getElementById('cameraView').value='follow';document.getElementById('cameraView').dispatchEvent(new Event('change'));document.getElementById('quality').value='high';document.getElementById('quality').dispatchEvent(new Event('change'))")
 page.wait_for_timeout(1000);page.screenshot(path=str(out/'steam-high.png'),timeout=120000)
 page.evaluate("document.querySelector('[data-train=\"2\"]').click();document.getElementById('cameraView').value='follow';document.getElementById('cameraView').dispatchEvent(new Event('change'))")
 page.wait_for_timeout(1000);page.screenshot(path=str(out/'shunter-high.png'),timeout=120000)
 # Actual browser frame intervals describe SwiftShader only, never physical desktop GPU FPS.
 page.evaluate("document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'))")
 result['softwareFrameIntervalsMs']=page.evaluate('''()=>new Promise(resolve=>{let last=performance.now(),samples=[];const frame=now=>{samples.push(now-last);last=now;if(samples.length===20)resolve(samples);else requestAnimationFrame(frame);};requestAnimationFrame(frame);})''')
 result['render']=page.evaluate('__serienDiagnostics.snapshot().render')
 assert not errors,errors
 assert not failed,failed
 result.update(result='PASS',errors=errors,failedRequests=failed,performanceNote='Chromium/SwiftShader. Physical desktop GPU performance untested.')
 (out/'browser-result.json').write_text(json.dumps(result,indent=2)+'\n');b.close()
 print('Phase 4 browser PASS',flush=True)
