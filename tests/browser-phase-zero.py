"""End-to-end canonical layout, real train simulation, HUD and global stop.
Requires a built local site, Python Playwright and Chromium. Uses the real engine
with deterministic fixed-clock stepping, not synthetic train animations.
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

out=Path('docs/consolidation');out.mkdir(parents=True,exist_ok=True)
base=os.environ.get('SERIEN_URL','http://127.0.0.1:8000/')
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':650,'height':900});errors=[];failed=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
    page.on('requestfailed',lambda r:failed.append(r.url))
    page.add_init_script('''(()=>{const get=HTMLCanvasElement.prototype.getContext;window.__webglContexts=new Set();HTMLCanvasElement.prototype.getContext=function(type,...args){const context=get.call(this,type,...args);if(context&&String(type).includes('webgl'))window.__webglContexts.add(context);return context;};})();''')
    page.goto(base+'?diagnostics=1',wait_until='domcontentloaded')
    page.wait_for_function('window.__serienDiagnostics!==undefined',timeout=120000)
    page.evaluate("document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'));document.getElementById('pause').click()")
    page.wait_for_function("[...document.querySelectorAll('.locomotiveThumbnail')].every(i=>i.complete&&i.naturalWidth===320)",timeout=60000)
    graph=page.request.get(base+'docs/jmri-layout/canonical-graph.json').json()
    result=page.evaluate('''graph=>{
      const api=__serienDiagnostics,$=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)],check=(ok,msg)=>{if(!ok)throw Error(msg)},snap=()=>api.snapshot();
      const select=id=>$('[data-train="'+id+'"]').click(),speed=(id,v)=>{select(id);const e=$('#speed');e.value=v;e.dispatchEvent(new Event('input'));},command=(id,name)=>{select(id);$('#'+name).click();};
      const markers=()=>{const state=snap();for(const card of all('.trainConsole')){const t=state.stock[Number(card.dataset.consoleTrain)],m=card.querySelector('.trainMapMarker'),v=t.vehicles[0];check(Math.abs(+m.getAttribute('cx')-v.x)<1e-8&&Math.abs(+m.getAttribute('cy')-v.z)<1e-8,'live SVG marker');for(const p of t.vehicles)check(Math.hypot(p.x-p.rendered.x,p.z-p.rendered.z)<1e-8,'world/rail identity');}};
      const expected=graph.edges.map(e=>e.points.map((p,i)=>(i?'L':'M')+p.x+','+p.z).join(' ')).join(' ');
      check($('.railwayDefinitions path').getAttribute('d')===expected,'exact canonical geometry in every minimap');
      check(all('.trainConsole').length===3&&window.__webglContexts.size===1,'three consoles and one renderer');
      const before=snap();[35,50,65].forEach((v,id)=>speed(id,v));api.step(120);let s=snap();markers();
      s.stock.forEach((t,id)=>{check(t.journey.travel>5000,'actual multiple-lap circulation '+id);check(t.velocity>0&&t.speed===[35,50,65][id],'independent speeds');check(graph.edges.find(e=>e.id===t.vehicles[0].edge).lane===[2,1,0][id],'separate main loops');});
      const travel=s.stock.map(t=>t.journey.travel);
      $('#stopAll').click();[0,1,2].forEach(id=>command(id,'reverse'));[35,50,65].forEach((v,id)=>speed(id,v));api.step(120);s=snap();markers();
      s.stock.forEach((t,id)=>{check(t.velocity<0&&t.journey.travel>travel[id]+5000,'reverse multiple-lap circulation '+id);check(graph.edges.find(e=>e.id===t.vehicles[0].edge).lane===[2,1,0][id],'reverse mainline identity');});
      const reverseTravel=s.stock.map((t,id)=>t.journey.travel-travel[id]);command(1,'stop');api.step(2);s=snap();check(s.stock[1].velocity===0&&Math.abs(s.stock[0].velocity)>0&&Math.abs(s.stock[2].velocity)>0,'individual stop');
      $('#stopAll').click();s=snap();check(s.stock.every(t=>t.speed===0&&t.velocity===0),'STOP TUTTI for all original trains');
      // A real fourth train is added through the production UI, not a mock.
      speed(0,20);[1,2].forEach(select);$('#addTrain').click();s=snap();check(s.stock.length===4&&s.consoles.visible.length===3&&!s.consoles.visible.includes(0),'LRU fourth console replacement');
      const hidden=s.stock[0],point=hidden.vehicles[0];api.step(2);s=snap();check(Math.abs(s.stock[0].velocity)>0&&s.stock[0].journey.travel>hidden.journey.travel,'hidden simulation continues');
      select(0);s=snap();check(s.stock[0].speed===20&&s.stock[0].dir===hidden.dir&&s.stock[0].lights===hidden.lights&&s.stock[0].cars.length===hidden.cars.length,'hidden state retained');markers();
      $('#stopAll').click();check(snap().stock.every(t=>t.speed===0&&t.velocity===0),'STOP TUTTI includes hidden fourth train');
      // Park the first three safely away from the freight turnouts.
      api.setSwitches([]);['T12','T0','T16'].forEach((id,i)=>api.placeTrain(i,id,150));
      api.placeTrain(3,'T47',80,-1);select(3);let hud=snap().nextSwitch;check(hud.site==='Y-4'&&Math.abs(hud.distance-80)<1e-7,'HUD distance to actual TO4');check(hud.outgoing===null,'misaligned branch blocks preview');
      $('[data-switch="7"]').click();hud=snap().nextSwitch;check(hud.outgoing?.edge==='TO4:AC','real command changes HUD routing');
      $('[data-switch="5"]').click();$('[data-switch="4"]').click();
      api.placeTrain(3,'TO4:AC',100,-1);check($('[data-switch="7"]').disabled,'occupied turnout disables real control');$('[data-switch="7"]').click();check($('[data-switch="7"]').classList.contains('active'),'unsafe toggle blocked');api.placeTrain(3,'T47',80,-1);
      $('#routePreview').click();api.step(0);check(snap().nextSwitch.highlighted,'temporary real rail highlight enabled');$('#routePreview').click();api.step(0);check(!snap().nextSwitch.highlighted,'highlight disabled');
      $('#routePreview').click();const originalNow=performance.now.bind(performance);Object.defineProperty(performance,'now',{configurable:true,value:()=>originalNow()+16000});api.step(0);check(!snap().nextSwitch.highlighted,'15-second timer expiry with controlled monotonic clock');Object.defineProperty(performance,'now',{configurable:true,value:originalNow});
      speed(3,30);api.step(25);s=snap();check(s.stock[3].vehicles[0].edge==='T37'&&s.stock[3].speed===0,'actual shunt through alternate runaround to western toe buffer');
      check(s.stock[3].journey.segments.some(p=>p.id==='T43'),'alternate runaround physically traversed');markers();
      check(!$('[data-switch="5"]').disabled,'TO1 clear before reversing route');$('[data-switch="5"]').click();command(3,'reverse');speed(3,30);api.step(24);s=snap();
      check(s.stock[3].journey.segments.some(p=>p.id==='T42'),'main runaround traversed after real reversal');check(s.stock[3].journey.segments.some(p=>p.id==='TO3:AC'),'yard rejoined to mainline through actual TO3');markers();
      $('#stopAll').click();const end=snap();check(end.stock.every(t=>t.velocity===0&&t.speed===0),'final global stop');
      $('.trainConsole.is-active .railwayMiniMap').click();check(snap().camera.preset==='manual','minimap focuses real locomotive');
      const minimized=$('.nextSwitchHUD').classList.contains('is-minimized');$('.nextSwitchMinimize').click();check($('.nextSwitchHUD').classList.contains('is-minimized')!==minimized,'HUD minimize');$('.nextSwitchMinimize').click();
      return {result:'PASS',canonicalStats:graph.statistics,loopTravelMm:travel,loopReverseTravelMm:reverseTravel,threeConcurrentTrains:true,independentStop:true,globalStop:true,fourthTrainViaProductionUI:true,hiddenSimulationContinues:true,canonicalMinimaps:true,worldAndMapPositions:true,switchCommandUpdatesHUD:true,temporaryHighlight:true,highlightExpiryControlledClock:true,occupiedSwitchGuard:true,runaround:{alternate:true,toeReversal:true,main:true,mainlineReturn:true},oneWebGLContext:window.__webglContexts.size,finalHud:end.nextSwitch};
    }''',graph)
    print('PASS: three real circuits, fourth train and LRU, actual switch/HUD, both runaround branches, reversal, global stop',flush=True)
    # Every actual cached model and GLB import, retaining locomotive positions.
    page.evaluate("document.getElementById('rollingModels').value='kenney';document.getElementById('rollingModels').dispatchEvent(new Event('change'))")
    page.wait_for_function("__serienDiagnostics.snapshot().stock.every(t=>t.vehicles.every(v=>v.dimensions))",timeout=90000)
    page.wait_for_function("[...document.querySelectorAll('.locomotiveThumbnail')].every(i=>i.complete&&i.naturalWidth===320&&i.dataset.thumbnailKey.startsWith('kenney'))",timeout=60000)
    result['actualGLBAndThumbnails']=True
    page.evaluate("document.getElementById('rollingModels').value='native';document.getElementById('rollingModels').dispatchEvent(new Event('change'))")
    for width,height,label in [(1440,1000,'desktop'),(1024,900,'tablet'),(768,1024,'tablet-portrait'),(390,844,'phone')]:
        page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(300)
        bounds=page.evaluate('''()=>{const hud=document.querySelector('.nextSwitchHUD').getBoundingClientRect(),host=document.querySelector('#view3d').getBoundingClientRect(),sidebar=document.querySelector('.sidebar').getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth,cards:[...document.querySelectorAll('.trainConsole')].map(e=>e.getBoundingClientRect().width),hudInViewport:hud.left>=host.left&&hud.right<=host.right+1,hudAwayFromSidebar:sidebar.width===0||hud.right<=sidebar.left||sidebar.top>=hud.bottom,contexts:window.__webglContexts.size};}''')
        assert not bounds['overflow'],(label,bounds)
        assert bounds['hudInViewport'] and bounds['hudAwayFromSidebar'],(label,bounds)
        assert bounds['contexts']==1
        if width>=768:assert min(bounds['cards'])>=210,(label,bounds)
        page.screenshot(path=str(out/(label+'.png')),timeout=90000)
        result[label]=bounds;print(label,bounds,flush=True)
    assert not errors,errors
    assert not failed,failed
    result.update(jsErrors=errors,failedRequests=failed,hardware='Chromium/SwiftShader software; touch and native tablet GPU performance require physical-device testing')
    (out/'browser-result.json').write_text(json.dumps(result,indent=2)+'\n')
    browser.close()
    print('PASS: all browser checks, no JavaScript errors or missing assets',flush=True)
