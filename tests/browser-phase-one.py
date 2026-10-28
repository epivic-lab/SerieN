"""Phase 1 acceptance: full desk height halved, live controls, English UI.
Run against npm start with Python Playwright and Chromium installed.
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

out=Path('docs/phase-1');out.mkdir(exist_ok=True)
baseline=json.loads((out/'baseline-ui.json').read_text())
base=os.environ.get('SERIEN_URL','http://127.0.0.1:8000/')
viewports=[(1440,1000,'desktop'),(1024,900,'tablet'),(768,1024,'tablet-portrait'),(390,844,'phone')]
init_context_counter='''(()=>{const get=HTMLCanvasElement.prototype.getContext;window.__webglContexts=new Set();HTMLCanvasElement.prototype.getContext=function(type,...args){const context=get.call(this,type,...args);if(context&&String(type).includes('webgl'))window.__webglContexts.add(context);return context;};})();'''
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':650,'height':900},locale='en-GB');errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.add_init_script(init_context_counter)
    page.goto(base+'?diagnostics=1',wait_until='domcontentloaded')
    page.wait_for_function('window.__serienDiagnostics!==undefined',timeout=120000)
    page.evaluate("document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'));document.getElementById('pause').click()")
    page.wait_for_function("[...document.querySelectorAll('.locomotiveThumbnail')].every(i=>i.complete&&i.naturalWidth===320)",timeout=60000)
    result=page.evaluate('''()=>{
      const api=__serienDiagnostics,$=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)],check=(ok,msg)=>{if(!ok)throw Error(msg)};
      const english=()=>{const text=document.body.innerText+' '+all('[title],[aria-label],img[alt]').map(e=>[e.title,e.getAttribute('aria-label'),e.getAttribute('alt')].join(' ')).join(' ');check(!/\\b(plancia|consolle|convogli|scambi|scambio|velocità|direzione|arresta|luci|sgancia|aggancia|riprendi|pausa|stazione|scalo|panorama|tronchino|percorso|destinazione|giorno|tramonto|notte|giri|obiettivo|rotabili|miniatura|disponibile)\\b/i.test(text),'untranslated interface text');};
      const select=id=>$('[data-train="'+id+'"]').click(),speed=(id,v)=>{select(id);const input=$('#speed');input.value=v;input.dispatchEvent(new Event('input'));},command=(id,name)=>{select(id);$('#'+name).click();};
      const markers=()=>{const state=api.snapshot();for(const card of all('.trainConsole')){const vehicle=state.stock[+card.dataset.consoleTrain].vehicles[0],dot=card.querySelector('.trainMapMarker');check(Math.abs(+dot.getAttribute('cx')-vehicle.x)<1e-8&&Math.abs(+dot.getAttribute('cy')-vehicle.z)<1e-8,'real minimap coordinates');}};
      check(document.documentElement.lang==='en','document language');check(!$('.titleScene,.instructions,.scenePills,#fps,#sceneInfo'),'requested overlays removed');
      check(all('.trainConsole').length===3,'three consoles');check(all('.railwayDefinitions path').length===1,'one canonical map definition');
      for(const card of all('.trainConsole')){check(card.querySelectorAll('[data-command]').length===5,'all five controls retained');check([...card.querySelectorAll('[data-command]')].every(b=>b.getAttribute('aria-label')&&b.title),'named compact controls');}
      speed(0,24);speed(1,49);speed(2,33);api.step(2);let state=api.snapshot();markers();check(state.stock.map(t=>t.speed).join(',')==='24,49,33','independent speed sliders');
      command(0,'stop');check(api.snapshot().stock[0].velocity===0&&api.snapshot().stock[1].speed===49,'individual stop');
      command(0,'uncouple');check(api.snapshot().stock[0].cars.length===2,'uncouple button');command(0,'couple');check(api.snapshot().stock[0].cars.length===3,'couple button');
      command(0,'reverse');check(api.snapshot().stock[0].dir===-1,'reverse button');command(1,'lights');check(api.snapshot().stock[1].lights,'light button');english();
      $('#stopAll').click();check(api.snapshot().stock.every(t=>t.speed===0&&t.velocity===0),'STOP ALL');check($('#log').textContent.includes('every train stopped'),'English operation log');
      const missions=[];for(let i=0;i<4;i++){missions.push($('#missionName').textContent);english();$('#nextMission').click();}
      $('#helpBtn').click();check(!$('#helpModal').hidden&&$('#helpModal').innerText.includes('Using SerieN'),'English help');english();$('[data-close="helpModal"]').click();
      $('#planBtn').click();check(!$('#planModal').hidden&&$('#planModal').innerText.includes('Railway track plan'),'English track-plan dialog');english();$('[data-close="planModal"]').click();
      $('#routePreview').click();api.step(0);check(api.snapshot().nextSwitch.highlighted,'route preview still works');$('#routePreview').click();api.step(0);
      $('.trainConsole.is-active .railwayMiniMap').click();check(api.snapshot().camera.preset==='manual','minimap still focuses camera');$('#viewHome').click();
      check(window.__webglContexts.size===1,'one renderer for the desk');
      return {result:'PASS',englishInterface:true,missionTitles:missions,allFiveCommands:true,independentSpeeds:true,individualAndGlobalStop:true,coupling:true,realMinimapMarkers:true,routePreview:true,minimapFocus:true,removedOverlays:true,webglContexts:window.__webglContexts.size};
    }''')
    print('PASS: compact controls, English interface/messages/dialogs, real minimaps and all operations',flush=True)
    measurements={}
    for fleet in [3,4]:
        if fleet==4:
            fourth=page.evaluate('''()=>{
              const api=__serienDiagnostics,select=id=>document.querySelector('[data-train="'+id+'"]').click(),check=(ok,msg)=>{if(!ok)throw Error(msg)};
              select(0);const slider=document.getElementById('speed');slider.value=20;slider.dispatchEvent(new Event('input'));[1,2].forEach(select);document.getElementById('addTrain').click();
              const before=api.snapshot();check(before.stock.length===4&&!before.consoles.visible.includes(0),'LRU replacement');api.step(2);const after=api.snapshot();check(after.stock[0].speed===20&&after.stock[0].journey.travel>before.stock[0].journey.travel,'hidden train keeps running');
              document.getElementById('stopAll').click();check(api.snapshot().stock.every(t=>t.speed===0&&t.velocity===0),'global stop includes hidden train');return {hiddenTrainContinues:true,globalStopIncludesHidden:true};
            }''');result['fourthTrain']=fourth
        for w,h,label in viewports:
            page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(150)
            size=page.evaluate('''()=>{
              const box=e=>{const b=e.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height};};
              return {console:box(document.querySelector('.console')).height,world:box(document.querySelector('#view3d')).height,header:box(document.querySelector('.consoleHead')).height,overflow:document.documentElement.scrollWidth>innerWidth,visuals:[...document.querySelectorAll('.trainConsole')].map(c=>({image:box(c.querySelector('img')),map:box(c.querySelector('.railwayMiniMap')),buttons:[...c.querySelectorAll('[data-command]')].map(box)}))};
            }''')
            key=f'{label}-{fleet}';old=baseline[key]['console'];size['baselineHeight']=old;size['reductionPercent']=round(100*(1-size['console']/old),2)
            assert size['console']<=old*.5,(key,size)
            assert not size['overflow'],(key,size)
            if w>930:assert size['world']>=baseline[key]['world']+(old-size['console'])-2,(key,size)
            for visual in size['visuals']:
                assert visual['image']['right']<=visual['map']['left']+1,(key,visual)
                assert abs(visual['image']['top']-visual['map']['top'])<1,(key,visual)
                assert all(b['height']>=30 and b['width']>=26 for b in visual['buttons']),(key,visual)
            measurements[key]=size
            if fleet==3:page.screenshot(path=str(out/(label+'.png')),timeout=90000)
            print(key,size['console'],'px, reduction',size['reductionPercent'],'%',flush=True)
    # Validate the actual imported model names and images in the compact slots.
    page.evaluate("document.getElementById('rollingModels').value='kenney';document.getElementById('rollingModels').dispatchEvent(new Event('change'))")
    page.wait_for_function("__serienDiagnostics.snapshot().stock.every(t=>t.vehicles.every(v=>v.dimensions))",timeout=90000)
    imported=page.evaluate("__serienDiagnostics.snapshot().stock.map(t=>({id:t.id,name:t.name}))")
    assert len({t['name'] for t in imported})==4,imported
    assert all(not any(word in t['name'] for word in ['Vapore','Manovra']) for t in imported),imported
    assert 'Thumbnail unavailable' in page.request.get(base+'assets/locomotive-thumbnails/unavailable.svg').text()
    result['kenneyIdentities']=imported
    result.update(sizes=measurements,errors=errors,performanceNote='Chromium/SwiftShader; physical tablet hardware remains untested.')
    (out/'browser-desktop-result.json').write_text(json.dumps(result,indent=2)+'\n')
    page.close()
    # A fresh touch context exercises the coarse-pointer CSS, one renderer at a time.
    context=browser.new_context(viewport={'width':650,'height':900},has_touch=True,is_mobile=True,device_scale_factor=1,locale='en-GB')
    touch=context.new_page();touch.on('pageerror',lambda e:errors.append(str(e)));touch.goto(base+'?diagnostics=1',wait_until='domcontentloaded');touch.wait_for_function('window.__serienDiagnostics!==undefined',timeout=120000)
    touch.evaluate("document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'));document.getElementById('pause').click()")
    touch.set_viewport_size({'width':768,'height':1024})
    touch_size=touch.evaluate("({height:document.querySelector('.console').getBoundingClientRect().height,coarse:matchMedia('(pointer: coarse)').matches,buttons:[...document.querySelectorAll('.trainConsoleCommands button')].map(e=>e.getBoundingClientRect().height)})")
    assert touch_size['coarse'] and touch_size['height']<=baseline['tablet-portrait-3']['console']*.5,touch_size
    assert min(touch_size['buttons'])>=40,touch_size
    touch.locator('.trainConsole.is-active [data-command="lights"]').tap(timeout=90000);assert not touch.evaluate('__serienDiagnostics.snapshot().stock[0].lights')
    result.update(sizes=measurements,touchEmulation=touch_size,errors=errors,performanceNote='Chromium/SwiftShader. Touch emulation verifies CSS and events, not physical tablet GPU performance.')
    assert not errors,errors
    (out/'browser-result.json').write_text(json.dumps(result,indent=2)+'\n')
    (out/'browser-desktop-result.json').unlink(missing_ok=True)
    browser.close();print('Phase 1 PASS: at least 50% less height in all measured cases, including touch controls',flush=True)
