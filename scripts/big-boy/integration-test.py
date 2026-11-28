"""L01 browser validation: genuine V06/Legacy runtime and explicit physics steps.
Screenshots and results are CI artifacts; do not change auth code or production settings.
"""
import base64, json, math, os
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT=Path(os.environ.get('SERIEN_EVIDENCE','docs/_active/rolling-stock/evidence/L02-G'))
OUT.mkdir(parents=True,exist_ok=True)
BASE=os.environ.get('SERIEN_URL','http://127.0.0.1:8027/')

def run_case(browser,scenario):
    # Route-based auth fixture must run outside a service worker: a controlling
    # worker serves the real auth module without invoking page.route.
    page=browser.new_page(viewport={'width':1280,'height':900},device_scale_factor=1,service_workers='block')
    errors=[];responses=[];audioWarnings=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.on('console',lambda m: (audioWarnings if 'AudioContext encountered an error from the audio device' in m.text else errors).append(m.text) if m.type=='error' else None)
    page.on('response',lambda r: responses.append({'status':r.status,'url':r.url}) if r.status>=400 else None)
    page.route('**/auth-gate.js*',lambda route:route.fulfill(
        content_type='text/javascript',
        body="document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;await import('./dist/game.js');"
    ))
    page.goto(BASE+'?scenario='+scenario+'&diagnostics=1',wait_until='domcontentloaded',timeout=120000)
    page.wait_for_function('window.__serienDiagnostics!==undefined',timeout=150000)
    # Keep rendering real frames, but advance physics only through diagnostics.
    # Matching a callback name is unreliable in the minified production bundle.
    page.locator('#pause').click()
    before=page.evaluate("()=>__serienDiagnostics.snapshot().stock.map(x=>x.modelKey)")
    assert before==['br01-engine'],before
    page.evaluate("()=>{document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'));}")
    page.locator('.top').get_by_role('button',name='Menu',exact=True).click()
    page.locator('#dlg #trainManagement').click()
    page.locator('dialog.trainManagement [data-view="catalog"]').click()
    assert page.locator('dialog.trainManagement .managementModel[data-model-id="native-big-boy"]').count()==1
    page.locator('dialog.trainManagement [data-view="layout"]').click()
    page.wait_for_selector('dialog.trainManagement button[data-model-id="native-big-boy"]',timeout=30000)
    page.locator('dialog.trainManagement button[data-model-id="native-big-boy"]').click()
    page.wait_for_function("__serienDiagnostics.snapshot().stock.some(t=>t.modelKey==='big-boy')",timeout=90000)
    state=page.evaluate("""()=>({stock:__serienDiagnostics.snapshot().stock.map(t=>({
      id:t.id,modelKey:t.modelKey,wheels:t.animation?.wheels??[],speed:t.speed,
      front:t.vehicles[0].couplers.front.x,back:t.vehicles[0].couplers.back.x
    })),railway:__serienDiagnostics.railwayState().occupied.length})""")
    assert len(state['stock'])==2,state
    loco=state['stock'][1]
    assert loco['modelKey']=='big-boy',loco
    assert len(loco['wheels'])==19,loco
    assert loco['front']==128 and loco['back']==-132,loco
    assert state['railway']>0,state
    page.locator('dialog.trainManagement [data-close]').click()
    page.locator('#dlg').get_by_role('button',name='Close',exact=True).click()
    selected=page.evaluate('__serienDiagnostics.snapshot().consoles.active')
    assert selected==loco['id'],(selected,loco['id'])
    read_loco="()=>__serienDiagnostics.snapshot().stock.find(x=>x.modelKey==='big-boy')"
    original=page.evaluate(read_loco)
    thumbnail=page.evaluate('id=>__serienDiagnostics.captureThumbnail(id)',loco['id'])
    (OUT/(scenario+'-thumbnail.png')).write_bytes(base64.b64decode(thumbnail.pop('dataURL').split(',',1)[1]))
    page.evaluate("()=>{const c=document.getElementById('cameraView');c.value='follow';c.dispatchEvent(new Event('change'));}")
    page.wait_for_function("__serienDiagnostics.snapshot().camera.preset==='follow'")
    page.locator('#view3d canvas').focus()
    page.keyboard.down('a');page.wait_for_timeout(1600);page.keyboard.up('a')
    page.keyboard.down('ArrowDown');page.wait_for_timeout(450);page.keyboard.up('ArrowDown')
    page.screenshot(path=str(OUT/(scenario+'-closeup.png')))
    page.evaluate("""()=>{const s=document.querySelector('.trainConsole.is-active input.thr');
      if(!s)throw Error('Big Boy throttle missing');
      s.value='25';s.dispatchEvent(new Event('input',{bubbles:true}));}""")
    page.evaluate('__serienDiagnostics.step(2)')
    after=page.evaluate("""()=>{const s=__serienDiagnostics.snapshot().stock.find(x=>x.modelKey==='big-boy');
      return {id:s.id,speed:s.speed,velocity:s.velocity,travel:s.journey.travel,
      wheels:s.animation.wheels.map(w=>w.angle),length:s.layout.tail+s.vehicles[0].couplers.front.x,
      x:s.vehicles[0].x,z:s.vehicles[0].z}}""")
    assert after['speed']==25,after
    assert after['travel']>original['journey']['travel']+1,after
    current=page.evaluate(read_loco)
    assert current['odometer']>original['odometer']+1,current
    assert all(math.isclose(w['angle'],current['odometer']/w['radius'],abs_tol=1e-7) for w in current['animation']['wheels'])
    assert len(after['wheels'])==19,after
    assert all(isinstance(w,(int,float)) and abs(w)<1e6 for w in after['wheels']),after
    assert after['length']==260,after
    page.locator('.trainConsole.is-active [data-command="reverse"]').click()
    reversed_dir=page.evaluate("()=>__serienDiagnostics.snapshot().stock.find(x=>x.modelKey==='big-boy').dir")
    assert reversed_dir==-1,reversed_dir
    page.evaluate('__serienDiagnostics.step(5)')
    reverse_motion=page.evaluate(read_loco)
    assert reverse_motion['velocity']<0,reverse_motion
    assert reverse_motion['odometer']<current['odometer'],reverse_motion
    assert all(math.isclose(w['angle'],reverse_motion['odometer']/w['radius'],abs_tol=1e-7) for w in reverse_motion['animation']['wheels'])
    page.locator('.trainConsole.is-active [data-command="stop"]').click()
    stopped=page.evaluate("()=>__serienDiagnostics.snapshot().stock.find(x=>x.modelKey==='big-boy').speed")
    assert stopped==0,stopped
    stopped_pose=page.evaluate(read_loco)
    page.evaluate('__serienDiagnostics.step(2)')
    assert page.evaluate(read_loco)['odometer']==stopped_pose['odometer']
    page.locator('.trainConsole.is-active [data-command="lights"]').click()
    assert page.evaluate(read_loco)['lights'] is True
    # Free the circuit through the ordinary guarded UI before the lap test.
    page.locator('.top').get_by_role('button',name='Menu',exact=True).click()
    page.locator('#dlg #trainManagement').click()
    page.locator('dialog.trainManagement [data-composition="0"]').click()
    page.locator('dialog.trainManagement').get_by_role('button',name='Remove from layout',exact=True).click()
    page.get_by_role('button',name='Remove composition',exact=True).click()
    page.wait_for_function('__serienDiagnostics.snapshot().stock.length===1')
    page.locator('dialog.trainManagement [data-close]').click()
    page.locator('#dlg').get_by_role('button',name='Close',exact=True).click()
    # One complete un-diverted circuit, including curves and protected switches.
    page.locator('.trainConsole.is-active [data-command="reverse"]').click()
    page.evaluate("()=>{const s=document.querySelector('.trainConsole.is-active input.thr');s.value='25';s.dispatchEvent(new Event('input',{bubbles:true}));}")
    samples=[];protected=None
    for _ in range(40):
        page.evaluate('__serienDiagnostics.step(3)')
        s=page.evaluate(read_loco)
        samples.append({'edge':s['vehicles'][0]['edge'],'x':s['vehicles'][0]['x'],'z':s['vehicles'][0]['z'],'odometer':s['odometer'],'velocity':s['velocity']})
        assert all(math.isfinite(v) for v in [s['odometer'],s['vehicles'][0]['x'],s['vehicles'][0]['z']])
        assert math.hypot(s['vehicles'][0]['x']-s['vehicles'][0]['rendered']['x'],s['vehicles'][0]['z']-s['vehicles'][0]['rendered']['z'])<1e-7
        safety=page.evaluate('()=>__serienDiagnostics.snapshot().nextSwitch')
        if protected is None and safety['controls'] and (safety.get('safety') or {}).get('blocked'):
            protected=page.evaluate("id=>__serienDiagnostics.requestToggle(id,'panel')",safety['controls'][0])
            assert protected['changed'] is False,protected
    assert len(set(s['edge'] for s in samples))>=4,samples
    assert samples[-1]['odometer']-samples[0]['odometer']>4000,samples
    assert protected is not None,'no protected turnout tested'
    page.locator('.trainConsole.is-active [data-command="stop"]').click()
    page.screenshot(path=str(OUT/(scenario+'-curve.png')))
    page.screenshot(path=str(OUT/(scenario+'-layout.png')),full_page=False)
    page.locator('.top').get_by_role('button',name='Menu',exact=True).click()
    page.locator('#dlg #trainManagement').click()
    page.screenshot(path=str(OUT/(scenario+'-train-management.png')),full_page=False)
    page.locator('dialog.trainManagement [data-close]').click()
    page.locator('#dlg').get_by_role('button',name='Close',exact=True).click()

    assert not errors,errors
    assert not responses,responses
    result={'scenario':scenario,'stock':current,'lapSamples':samples,'protectedTurnout':protected,'errors':errors,'httpErrors':responses,'audioWarnings':audioWarnings}
    (OUT/(scenario+'-browser.json')).write_text(json.dumps(result,indent=2)+'\n');print(scenario+' PASS',flush=True);page.close();return result
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),headless=True)
 results=[run_case(browser,s) for s in ['legacy','v06']]
 (OUT/'browser.json').write_text(json.dumps(results,indent=2)+'\n');browser.close()
