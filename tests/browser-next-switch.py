"""Next Switch HUD integration with real graph positions, router and UI controls."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':650,'height':900});errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    base=os.environ.get('SERIEN_URL','http://127.0.0.1:8000/')
    page.goto(base+'?diagnostics=1',wait_until='domcontentloaded')
    page.wait_for_function('window.__serienDiagnostics!==undefined',timeout=90000)
    page.evaluate("document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'));document.getElementById('pause').click()")
    lengths={e['id']:e['length'] for e in page.request.get(base+'docs/phase-0/layout.json').json()['network']['edges']}
    snap=lambda:page.evaluate('__serienDiagnostics.snapshot().nextSwitch')
    results=page.evaluate('''lengths=>{
        const api=__serienDiagnostics, snapshot=()=>api.snapshot(),check=(ok,msg)=>{if(!ok)throw Error(msg)},$=s=>document.querySelector(s),results=[];
        for(let id=0;id<3;id++){
            $('[data-train="'+id+'"]').click();check($('.nextSwitchTrain').textContent===$('#trainName').textContent,'selected train');
        }
        $('[data-train="0"]').click();
        for(let lane=0;lane<3;lane++){
            api.placeTrain(0,'L'+lane+'-0',10,1);let a=snapshot().nextSwitch;
            check(a.site===(lane===2?'WX-B':'WX-A'),'first switch loop '+lane);
            check(Math.abs(a.distance-(lane===2?412:52))<1e-6,'track distance loop '+lane);
            if(lane<2)check(a.safety.blocked,'nearby turnout lock');
            $('#reverse').click();check(snapshot().nextSwitch.distance>1000,'reverse loop '+lane);
            results.push({lane,forward:a.distance,reverse:snapshot().nextSwitch.distance});
        }
        for(const [edge,site] of [['lead','yard-north'],['approach','yard-west'],['runMain','yard-east'],['runAround','yard-east']]){
            api.placeTrain(0,edge,lengths[edge]-20,1);const a=snapshot().nextSwitch;
            check(a.site===site,'yard site '+edge);check(Math.abs(a.distance-20)<1e-6,'yard distance '+edge);
            if(site==='yard-west'){
                check(a.controls.length===2,'compound controls');check(document.querySelectorAll('.nextSwitchScheme polyline[stroke="#829792"]').length===5,'five actual west branches');
            }
        }
        for(const edge of ['upper','middle','lower','right']){
            api.placeTrain(0,edge,lengths[edge]-5,1);check(snapshot().nextSwitch.site===null,'terminal '+edge);
            check($('.nextSwitchName').textContent==='Percorso libero da deviatoi','terminal label');
            $('#reverse').click();check(snapshot().nextSwitch.site!==null,'terminal reverse '+edge);
        }
        api.placeTrain(0,'runMain',300,-1);const native=snapshot();
        check(Math.abs(native.nextSwitch.distance-(300-native.stock[0].layout.offsets.at(-1)))<1e-6,'native reverse origin');
        return {loops:results,nativeReverseDistance:native.nextSwitch.distance};
    }''',lengths)
    print('PASS: all three loops forward/reverse, train selection, yard, four terminals and runaround',flush=True)
    page.evaluate("document.getElementById('rollingModels').value='kenney';document.getElementById('rollingModels').dispatchEvent(new Event('change'))")
    page.wait_for_function('__serienDiagnostics.snapshot().stock.every(t=>t.vehicles.every(v=>v.dimensions))',timeout=90000)
    compact=page.evaluate('''()=>{
        __serienDiagnostics.step(0);const s=__serienDiagnostics.snapshot();
        if(s.nextSwitch.site!=='yard-west'||Math.abs(s.nextSwitch.distance-(300-s.stock[0].layout.offsets.at(-1)))>1e-6)throw Error('Kenney reverse origin');
        document.getElementById('rollingModels').value='native';document.getElementById('rollingModels').dispatchEvent(new Event('change'));__serienDiagnostics.step(0);
        return s.nextSwitch.distance;
    }''')
    assert compact>results['nativeReverseDistance']
    results['kenneyReverseDistance']=compact
    page.evaluate('''()=>{
        const api=__serienDiagnostics,$=s=>document.querySelector(s),check=(ok,msg)=>{if(!ok)throw Error(msg)};
        api.placeTrain(0,'L0-0',10,1);check($('[data-switch="0"]').disabled,'occupied command not disabled');
        const before=api.snapshot().nextSwitch.outgoing.edge;
        $('[data-switch="0"]').disabled=false;$('[data-switch="0"]').click();
        check(api.snapshot().nextSwitch.outgoing.edge===before,'unsafe actuation changed route');
        check($('#log').textContent.includes('bloccata'),'missing lock explanation');
        api.placeTrain(0,'L2-return',600,1);check(!$('[data-switch="0"]').disabled,'far crossover should be operable');
        $('[data-switch="0"]').click();api.placeTrain(0,'L0-0',10,1);
        check(api.snapshot().nextSwitch.outgoing.edge==='XA0','real crossover state not reflected');
        check(api.snapshot().nextSwitch.destination==='Anello centrale','crossover destination');
        check(document.querySelectorAll('#switchList button').length===8,'eight commands changed');
        check(!$('.nextSwitchScheme button'),'HUD should be informational');
        $('.nextSwitchPreview').click();check(api.snapshot().nextSwitch.highlighted,'highlight not enabled');
        $('.nextSwitchPreview').click();check(!api.snapshot().nextSwitch.highlighted,'highlight not disabled');
    }''')
    print('PASS: actual Kenney origin, shared safety guard and real WX310 state/destination',flush=True)
    page.set_viewport_size({'width':1280,'height':900})
    page.evaluate("document.getElementById('homeView').click();document.querySelector('.nextSwitchPreview').click()")
    page.wait_for_timeout(2500)
    Path('docs/next-switch').mkdir(parents=True,exist_ok=True)
    page.screenshot(path='docs/next-switch/desktop.png',timeout=60000)
    bounds=page.evaluate('''() => {const h=document.getElementById('nextSwitchHUD').getBoundingClientRect(),w=document.getElementById('view3d').getBoundingClientRect(),s=document.querySelector('.sidebar').getBoundingClientRect();return {inside:h.left>=w.left&&h.right<=w.right&&h.top>=w.top&&h.bottom<=w.bottom,separate:h.right<=s.left}}''')
    assert bounds['inside'] and bounds['separate'],bounds
    page.evaluate("document.querySelector('.nextSwitchMinimize').click()")
    assert page.locator('#nextSwitchBody').is_hidden()
    page.set_viewport_size({'width':390,'height':844})
    assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
    page.screenshot(path='docs/next-switch/mobile.png',timeout=60000)
    page.evaluate("document.querySelector('.nextSwitchMinimize').click()")
    assert page.locator('#nextSwitchBody').is_visible()
    bounds=page.evaluate('''() => {const h=document.getElementById('nextSwitchHUD').getBoundingClientRect(),t=document.querySelector('.cameraToolbar').getBoundingClientRect();return {hudBottom:h.bottom,toolbarTop:t.top}}''')
    assert bounds['hudBottom']<=bounds['toolbarTop'],bounds
    page.evaluate("if(document.querySelector('.nextSwitchPreview').getAttribute('aria-pressed')==='true')document.querySelector('.nextSwitchPreview').click();document.querySelector('.nextSwitchPreview').click()")
    assert snap()['highlighted']
    page.wait_for_timeout(16000)
    page.evaluate('__serienDiagnostics.step(0)')
    assert not snap()['highlighted']
    assert not errors,errors
    assert page.locator('.modal:not([hidden])').count()==0
    Path('docs/next-switch/browser-result.json').write_text(json.dumps({'result':'PASS','errors':errors,**results,'cases':['all three loops forward/reverse','selection','four sidings','runaround','compound schematic','shared safety guard','WX310 actual selection','Kenney reverse origin','highlight toggle and expiry','desktop and mobile bounds']},indent=2)+'\n')
    browser.close();print('PASS: responsive/minimizable HUD, temporary overlay, no modal or JS error',flush=True)
