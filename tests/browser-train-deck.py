"""Real multitrain console / SVG / cached thumbnail integration and responsive checks."""
import json
import math
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

output=Path('docs/train-deck');output.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':650,'height':900});errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.add_init_script('''(()=>{const get=HTMLCanvasElement.prototype.getContext;window.__webglContexts=new Set();HTMLCanvasElement.prototype.getContext=function(type,...args){const context=get.call(this,type,...args);if(context&&String(type).includes('webgl'))window.__webglContexts.add(context);return context;};})();''')
    base=os.environ.get('SERIEN_URL','http://127.0.0.1:8000/')
    page.goto(base+'?diagnostics=1',wait_until='domcontentloaded')
    page.wait_for_function('window.__serienDiagnostics!==undefined',timeout=90000)
    page.evaluate("document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'));document.getElementById('pause').click()")
    page.wait_for_function("[...document.querySelectorAll('.locomotiveThumbnail')].every(i=>i.complete&&i.naturalWidth===320&&i.dataset.fallback==='false')",timeout=30000)
    lengths={e['id']:e['length'] for e in page.request.get(base+'docs/phase-0/layout.json').json()['network']['edges']}
    result=page.evaluate('''lengths=>{
      const api=__serienDiagnostics,$=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)],check=(ok,message)=>{if(!ok)throw Error(message)};
      const markers=()=>{const s=api.snapshot();for(const card of all('.trainConsole')){const t=s.stock[Number(card.dataset.consoleTrain)],m=card.querySelector('.trainMapMarker');check(Math.abs(Number(m.getAttribute('cx'))-t.vehicles[0].x)<1e-8,'map X '+t.id);check(Math.abs(Number(m.getAttribute('cy'))-t.vehicles[0].z)<1e-8,'map Z '+t.id);}};
      check(all('.trainConsole').length===3,'three consoles');check(all('.railwayDefinitions path').length===1,'shared geometry');check(all('.railwayMiniMap').length===3,'three maps');
      check(new Set(all('.railwayMiniMap svg').map(e=>e.getAttribute('viewBox'))).size===1,'map framing');
      check(new Set(all('.railwayMiniMap use').map(e=>e.getAttribute('href'))).size===1,'same original geometry');
      check(!$('.nextSwitchPreview')&&!$('.nextSwitchLegend'),'removed HUD section');
      check($('.nextSwitchHUD').getBoundingClientRect().width<=215,'compact HUD');
      const background=getComputedStyle($('.nextSwitchHUD')).backgroundImage;check(background.includes('0.64')||background.includes('0.639'),'translucent HUD');
      const keys=all('.locomotiveThumbnail').map(i=>i.dataset.thumbnailKey);check(keys.join(',')==='native-steam,native-diesel,native-shunter','actual native identity');
      const speed=(id,value)=>{const input=$('[data-console-train="'+id+'"] input');input.value=value;input.dispatchEvent(new Event('input'));};
      const command=(id,name)=>$('[data-console-train="'+id+'"] [data-command="'+name+'"]').click();
      speed(1,46);speed(0,15);let s=api.snapshot();check(s.stock[1].speed===46&&s.stock[0].speed===15&&s.stock[2].speed===0,'independent speed controls');
      const before=s.stock.map(t=>({x:t.vehicles[0].x,z:t.vehicles[0].z}));api.step(1);s=api.snapshot();markers();
      check(Math.hypot(s.stock[0].vehicles[0].x-before[0].x,s.stock[0].vehicles[0].z-before[0].z)>1,'train zero moves');
      check(Math.hypot(s.stock[1].vehicles[0].x-before[1].x,s.stock[1].vehicles[0].z-before[1].z)>1,'train one moves');
      check(s.stock[2].vehicles[0].x===before[2].x&&s.stock[2].vehicles[0].z===before[2].z,'stationary independent marker');
      [0,1,2].forEach(id=>command(id,'stop'));
      command(1,'reverse');speed(1,30);api.step(1);markers();command(1,'stop');
      command(2,'lights');s=api.snapshot();check(s.stock[2].lights&&s.stock[0].lights,'independent headlights');
      command(1,'uncouple');check(api.snapshot().stock[1].cars.length===1,'wagon detach from correct train');command(1,'couple');check(api.snapshot().stock[1].cars.length===2,'wagon recouple');
      for(const [edge,direction] of [['L0-0',1],['XA0',1],['XA0',-1],['XB1',1],['lead',1],['runMain',1],['runAround',-1],['upper',1],['middle',-1],['lower',1],['right',-1]]){api.placeTrain(0,edge,Math.min(200,lengths[edge]-10),direction);markers();}
      command(0,'stop');api.placeTrain(0,'L2-return',600,1);
      check(window.__webglContexts.size===1,'one WebGL context');
      return {nativeThumbnailKeys:keys,background,webglContexts:window.__webglContexts.size};
    }''',lengths)
    print('PASS: independent controls, real SVG positions in loops/crossovers/yard, native images and compact HUD',flush=True)
    page.evaluate("document.getElementById('rollingModels').value='kenney';document.getElementById('rollingModels').dispatchEvent(new Event('change'))")
    page.wait_for_function("[...document.querySelectorAll('.locomotiveThumbnail')].every(i=>i.complete&&i.naturalWidth===320&&i.dataset.thumbnailKey.startsWith('kenney')&&i.dataset.fallback==='false')",timeout=90000)
    keys=page.locator('.locomotiveThumbnail').evaluate_all('(imgs)=>imgs.map(i=>i.dataset.thumbnailKey)')
    assert keys==['kenney-steam','kenney-diesel','kenney-shunter'],keys
    result['kenneyThumbnailKeys']=keys
    page.evaluate("document.getElementById('rollingModels').value='native';document.getElementById('rollingModels').dispatchEvent(new Event('change'))")
    fourth=page.evaluate('__serienDiagnostics.addTrain()');assert fourth==3
    hidden=page.evaluate('''()=>{
      const api=__serienDiagnostics,check=(ok,msg)=>{if(!ok)throw Error(msg)},select=id=>document.querySelector('[data-train="'+id+'"]').click();
      select(0);const input=document.getElementById('speed');input.value=20;input.dispatchEvent(new Event('input'));
      [1,2,3].forEach(select);let s=api.snapshot();check(!s.consoles.visible.includes(0)&&s.consoles.visible.length===3,'recent-window eviction');
      const before=s.stock[0].vehicles[0],srcBefore='./assets/locomotive-thumbnails/native-steam.png';api.step(2);s=api.snapshot();
      check(s.stock[0].speed===20&&s.stock[0].velocity>0,'hidden train still running');check(Math.hypot(s.stock[0].vehicles[0].x-before.x,s.stock[0].vehicles[0].z-before.z)>1,'hidden train position advances');
      select(0);s=api.snapshot();const card=document.querySelector('[data-console-train="0"]'),m=card.querySelector('.trainMapMarker');
      check(card.querySelector('img').getAttribute('src')===srcBefore,'same cached locomotive image');check(Number(m.getAttribute('cx'))===s.stock[0].vehicles[0].x&&Number(m.getAttribute('cy'))===s.stock[0].vehicles[0].z,'returned train current position');
      check(document.querySelectorAll('.trainConsole.is-active').length===1,'one amber active console');
      for(const id of s.consoles.visible)document.querySelector('[data-console-train="'+id+'"] [data-command="stop"]').click();
      return {visible:s.consoles.visible,recent:s.consoles.recent,hiddenTrainAdvanced:true};
    }''')
    result['fourTrainScenario']=hidden
    print('PASS: Kenney/native identity and a real fourth train continuing outside the three visible consoles',flush=True)
    # A deliberate missing image checks the neutral placeholder, then restore it.
    fallback=page.evaluate("const i=document.querySelector('.locomotiveThumbnail');const original=i.src;i.src='./assets/locomotive-thumbnails/deliberately-missing.png';original")
    page.wait_for_function("document.querySelector('.locomotiveThumbnail').dataset.fallback==='true'")
    page.evaluate("src=>{const i=document.querySelector('.locomotiveThumbnail');i.dataset.fallback='false';i.src=src;}",fallback)
    page.evaluate("document.querySelector('.trainConsole .railwayMiniMap').click()")
    assert page.evaluate('__serienDiagnostics.snapshot().camera.preset')=='manual'
    result['minimapFocus']=True
    for width,height,label in [(1440,1000,'desktop'),(1024,900,'tablet'),(768,1024,'tablet-portrait'),(390,844,'mobile')]:
        page.set_viewport_size({'width':width,'height':height})
        page.wait_for_timeout(300)
        sizes=page.evaluate('''()=>({overflow:document.documentElement.scrollWidth>innerWidth,cards:[...document.querySelectorAll('.trainConsole')].map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})),contexts:window.__webglContexts.size})''')
        assert not sizes['overflow'],(label,sizes)
        assert sizes['contexts']==1
        if width>=768:assert all(c['width']>=210 for c in sizes['cards']),sizes
        page.screenshot(path=str(output/(label+'.png')),timeout=60000)
        result[label]=sizes
        print(label,sizes,flush=True)
    assert not errors,errors
    result['errors']=errors;result['result']='PASS';result['performanceNote']='Chromium software renderer; desktop/tablet viewport checks, not certification on physical iPad hardware.'
    (output/'browser-result.json').write_text(json.dumps(result,indent=2)+'\n')
    browser.close();print('Train deck browser PASS',flush=True)
