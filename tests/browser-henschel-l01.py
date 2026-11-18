"""L01 browser smoke: genuine V06/Legacy runtime with deterministic manual RAF.
Screenshots and results are CI artifacts; do not change auth code or production settings.
"""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT=Path('work/henschel-l01')
OUT.mkdir(parents=True,exist_ok=True)
BASE=os.environ.get('SERIEN_URL','http://127.0.0.1:8000/')

def run_case(browser,scenario):
    page=browser.new_page(viewport={'width':1280,'height':900},device_scale_factor=1)
    errors=[];responses=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.on('console',lambda m: errors.append(m.text) if m.type=='error' else None)
    page.on('response',lambda r: responses.append({'status':r.status,'url':r.url}) if r.status>=400 else None)
    page.route('**/auth-gate.js*',lambda route:route.fulfill(
        content_type='text/javascript',
        body="document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;await import('./dist/game.js');"
    ))
    page.add_init_script("""
    const raf=window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame=(callback)=>{
      if(callback.name==='tick'){window.__l01Frame=callback;return 1;}
      return raf(callback);
    };""")
    page.goto(BASE+'?scenario='+scenario+'&diagnostics=1',wait_until='domcontentloaded',timeout=120000)
    page.wait_for_function('window.__serienDiagnostics!==undefined',timeout=150000)
    before=page.evaluate("()=>__serienDiagnostics.snapshot().stock.map(x=>x.modelKey)")
    assert before==['br01-engine'],before
    page.evaluate("()=>{document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'));}")
    page.locator('.top').get_by_role('button',name='Menu',exact=True).click()
    page.locator('#dlg #trainManagement').click()
    page.locator('dialog.trainManagement [data-view="catalog"]').click()
    assert page.locator('dialog.trainManagement .managementModel[data-model-id="native-henschel-dhg-500-c"]').count()==1
    page.locator('dialog.trainManagement [data-view="layout"]').click()
    page.wait_for_selector('dialog.trainManagement button[data-model-id="native-henschel-dhg-500-c"]',timeout=30000)
    page.locator('dialog.trainManagement button[data-model-id="native-henschel-dhg-500-c"]').click()
    state=page.evaluate("""()=>({stock:__serienDiagnostics.snapshot().stock.map(t=>({
      id:t.id,modelKey:t.modelKey,wheels:t.animation?.wheels??[],speed:t.speed,
      front:t.vehicles[0].couplers.front.x,back:t.vehicles[0].couplers.back.x
    })),railway:__serienDiagnostics.railwayState().occupied.length})""")
    assert len(state['stock'])==2,state
    loco=state['stock'][1]
    assert loco['modelKey']=='henschel-dhg-500-c',loco
    assert len(loco['wheels'])==6,loco
    assert abs(loco['front']-31.9375)<.001 and abs(loco['back']+31.9375)<.001,loco
    assert state['railway']>0,state
    page.locator('dialog.trainManagement [data-close]').click()
    page.locator('#dlg').get_by_role('button',name='Close',exact=True).click()
    selected=page.evaluate('__serienDiagnostics.snapshot().consoles.active')
    assert selected==loco['id'],(selected,loco['id'])
    page.evaluate("""()=>{const s=document.querySelector('.trainConsole.is-active input.thr');
      if(!s)throw Error('Henschel throttle missing');
      s.value='25';s.dispatchEvent(new Event('input',{bubbles:true}));}""")
    page.evaluate('__serienDiagnostics.step(2)')
    after=page.evaluate("""()=>{const s=__serienDiagnostics.snapshot().stock.find(x=>x.modelKey==='henschel-dhg-500-c');
      return {id:s.id,speed:s.speed,velocity:s.velocity,travel:s.journey.travel,
      wheels:s.animation.wheels.map(w=>w.angle),length:s.layout.tail+s.vehicles[0].couplers.front.x,
      x:s.vehicles[0].x,z:s.vehicles[0].z}}""")
    assert after['speed']==25,after
    assert len(after['wheels'])==6,after
    assert all(isinstance(w,(int,float)) and abs(w)<1e6 for w in after['wheels']),after
    assert after['length']>61 and after['length']<70,after
    page.locator('.trainConsole.is-active [data-command="reverse"]').click()
    reversed_dir=page.evaluate("()=>__serienDiagnostics.snapshot().stock.find(x=>x.modelKey==='henschel-dhg-500-c').dir")
    assert reversed_dir==-1,reversed_dir
    page.locator('.trainConsole.is-active [data-command="stop"]').click()
    stopped=page.evaluate("()=>__serienDiagnostics.snapshot().stock.find(x=>x.modelKey==='henschel-dhg-500-c').speed")
    assert stopped==0,stopped
    page.evaluate('()=>window.__l01Frame?.(performance.now())')
    page.screenshot(path=str(OUT/(scenario+'-layout.png')),full_page=False)
    page.locator('.top').get_by_role('button',name='Menu',exact=True).click()
    page.locator('#dlg #trainManagement').click()
    page.screenshot(path=str(OUT/(scenario+'-train-management.png')),full_page=False)
    page.locator('dialog.trainManagement [data-close]').click()
    page.locator('#dlg').get_by_role('button',name='Close',exact=True).click()
    page.set_viewport_size({'width':390,'height':844})
    page.evaluate('()=>window.__l01Frame?.(performance.now())')
    page.screenshot(path=str(OUT/(scenario+'-mobile.png')),full_page=False)
    assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
    assert not errors,errors
    assert not responses,responses
    page.close()
    return {'scenario':scenario,'initialModelKeys':before,'added':loco,
      'afterMovement':after,'reverseDirection':reversed_dir,'stopped':stopped,
      'mobileNoOverflow':True,'pageErrors':errors,'failedResponses':responses}

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
    results=[]
    try:
        for scenario in ['v06','legacy']:
            results.append(run_case(browser,scenario))
    finally:
        browser.close()
    (OUT/'report.json').write_text(json.dumps({'result':'PASS','checks':results},indent=2)+'\n')
    print('PASS L01 Henschel browser V06+Legacy: 2 scenarios, train spawn, 6 wheels, controls, 390px mobile',flush=True)
