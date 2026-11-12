"""Real production UI U4, local Auth boundary and on-demand RAF; no mocked railway state."""
import hashlib, json, os
from pathlib import Path
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]
out=Path(os.environ.get('U4_OUTPUT','/workspace/work/ui-v21-u4/production'));out.mkdir(parents=True,exist_ok=True)
base=os.environ.get('SERIEN_URL','http://127.0.0.1:8033/')
result={'status':'RUNNING','bundleSHA256':hashlib.sha256((root/'dist/game.js').read_bytes()).hexdigest(),
        'method':'production minified app; local Auth boundary; on-demand RAF','checks':[],
        'pageErrors':[],'consoleErrors':[],'httpFailures':[],'failedRequests':[],'external':[]}
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1440,'height':900});page.set_default_timeout(60000)
    page.on('pageerror',lambda e:result['pageErrors'].append(str(e)))
    page.on('console',lambda m:result['consoleErrors'].append(m.text) if m.type=='error' else None)
    page.on('response',lambda r:result['httpFailures'].append([r.url,r.status]) if r.status>=400 else None)
    page.on('requestfailed',lambda r:result['failedRequests'].append(r.url))
    page.on('request',lambda r:result['external'].append(r.url) if r.url.startswith('http') and not r.url.startswith(base) else None)
    page.route('**/auth-gate.js*',lambda r:r.fulfill(content_type='text/javascript',body="document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;document.getElementById('signOut').hidden=false;await import('./dist/game.js');"))
    page.add_init_script("const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>{if(cb.toString().includes('requestAnimationFrame')&&cb.toString().includes('.render(')){window.__u4Frame=cb;return 1;}return raf(cb);};")
    page.on('dialog',lambda d:d.accept())
    def save(): (out/'results.json').write_text(json.dumps(result,indent=2)+'\n')
    def check(name):
        result['checks'].append(name);save();print(name+': PASS',flush=True)
    def frame():page.evaluate('__u4Frame(performance.now())')
    def snapshot():return page.evaluate('__serienDiagnostics.snapshot()')
    def shot(name):
        frame();page.wait_for_timeout(850);page.screenshot(path=str(out/(name+'.png')))
    def verify_map():
        state=snapshot()
        for train in state['stock']:
            marker=page.locator('#sidebarRailwayMap [data-map-train="'+str(train['id'])+'"]')
            assert abs(float(marker.get_attribute('cx'))-train['vehicles'][0]['x'])<1e-7
            assert abs(float(marker.get_attribute('cy'))-train['vehicles'][0]['z'])<1e-7
            assert marker.get_attribute('aria-pressed')==str(train['id']==state['consoles']['active']).lower()
        assert page.locator('#sidebarRailwayMap circle').count()==len(state['stock'])
    try:
        page.goto(base+'?diagnostics=1',wait_until='domcontentloaded')
        page.wait_for_function('Boolean(window.__serienDiagnostics&&window.__u4Frame)')
        page.evaluate("document.getElementById('pause').click();document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'));__u4Frame(performance.now())")
        page.wait_for_load_state('networkidle')
        ids=page.evaluate('__serienDiagnostics.indicatorState().states.map(s=>s.id)')
        assert len(ids)==8 and page.locator('#switchList [data-switch]').count()==8
        assert page.locator('[data-switch-hover]').count()==8
        assert page.locator('#switchList').evaluate('(e)=>[...e.querySelectorAll("[data-switch]")].map(b=>b.dataset.switchId)')==ids
        assert page.locator('#log').count()==1 and page.locator('.sidebar #log').count()==0
        assert page.locator('#view3d canvas').count()==1
        check('eight-canonical-tiles-original-hooks-one-canvas-and-one-operations-log')

        page.evaluate("__serienDiagnostics.setSwitches([]);['T12','T0','T16'].forEach((e,i)=>__serienDiagnostics.placeTrain(i,e,150));__serienDiagnostics.step(0)")
        for position in [True,False]:
            for index,control in enumerate(ids):
                button=page.locator('[data-switch="'+str(index)+'"]')
                assert button.is_enabled(),control
                button.click()
                states=page.evaluate('__serienDiagnostics.indicatorState().states.map(s=>[s.id,s.on])')
                assert dict(states)[control] is position
                assert button.locator('.u4-switch-position').inner_text()==('Diverging' if position else 'Straight')
                assert button.evaluate('(e)=>e.classList.contains("active")') is position
                count=sum(on for _,on in states)
                assert page.locator('#switchCount').inner_text()==f'{count} / 8'
        check('all-eight-original-panel-callbacks-both-positions-and-real-counter')

        svg_path=page.locator('#sidebarRailwayMap path').get_attribute('d')
        assert svg_path==page.locator('.railwayDefinitions path').get_attribute('d')
        page.locator('#addTrain').click()
        assert len(snapshot()['stock'])==4 and page.locator('#sidebarRailwayMap circle').count()==4
        verify_map()
        before=page.evaluate('__serienDiagnostics.railwayState()')
        for train_id in range(4):
            page.locator('.u4-map-trains [data-map-train="'+str(train_id)+'"]').click()
            state=snapshot()
            assert state['consoles']['active']==train_id and state['camera']['preset']=='manual'
            assert len(state['consoles']['visible'])==4
            assert page.evaluate('__serienDiagnostics.railwayState()')==before
            verify_map()
        page.evaluate("document.querySelector('[data-train=\"0\"]').click();document.getElementById('speed').value=30;document.getElementById('speed').dispatchEvent(new Event('input'))")
        page.locator('#sidebarRailwayMap [data-map-train="0"]').focus();page.keyboard.press('Space')
        assert snapshot()['stock'][0]['speed']==30
        page.evaluate('__serienDiagnostics.step(1)');verify_map()
        page.evaluate("document.getElementById('stopAll').click()")
        check('canonical-map-live-four-physical-markers-focus-LRU-and-marker-Space-no-stop')

        initial=page.locator('#missionName').inner_text();missions=[]
        rail_before=page.evaluate('__serienDiagnostics.railwayState()')
        for _ in range(4):
            assert page.locator('#nextMission').is_enabled()
            missions.append({'name':page.locator('#missionName').inner_text(),'text':page.locator('#missionText').inner_text(),'status':page.locator('#missionStatus').inner_text()})
            page.locator('#nextMission').click()
        assert page.locator('#missionName').inner_text()==initial
        assert len({m['name'] for m in missions})==4
        assert page.evaluate('__serienDiagnostics.railwayState()')==rail_before
        result['missions']=missions
        check('original-four-mission-cycle-next-enabled-without-completion-no-railway-mutation')

        lighting=[]
        for value,glyph in [(0,'☀'),(41,'☀'),(42,'◐'),(71,'◐'),(72,'☾'),(100,'☾'),(48,'◐')]:
            page.evaluate('v=>{const e=document.getElementById("day");e.value=v;e.dispatchEvent(new Event("input"));}',value)
            assert page.locator('#sun').inner_text()==glyph
            assert page.locator('#dayValue').inner_text().startswith(str(value)+'%')
            lighting.append([value,glyph])
        result['lightingThresholds']=lighting
        check('original-daylight-input-value-glyph-thresholds-42-and-72')

        # Original reset, then real occupied and approaching cases through the existing engine.
        page.evaluate("document.getElementById('reset').click();document.querySelector('dialog.u5-guard [data-confirm]').click();document.getElementById('pause').click();document.querySelector('[data-train=\"2\"]').click();for(let i=0;i<5;i++)document.getElementById('uncouple').click();__serienDiagnostics.setSwitches(['Y-4']);__serienDiagnostics.placeTrain(2,'TO4:AC',100,-1);__serienDiagnostics.step(0)")
        # Baseline reset preserves the real fleet, including the fourth train.
        assert page.locator('#sidebarRailwayMap circle').count()==len(snapshot()['stock'])==4
        button=page.locator('[data-switch-id=Y-4][data-switch]')
        assert button.is_disabled()
        reason=page.locator('#switchReason-Y-4')
        assert reason.is_visible() and reason.inner_text()==button.get_attribute('title')
        assert reason.inner_text()=='Switch area occupied · operation blocked'
        before=page.evaluate('__serienDiagnostics.railwayState()')
        switches=page.evaluate('__serienDiagnostics.indicatorState().states.map(s=>[s.id,s.on])')
        button.dispatch_event('click') # Even a synthetic delivery cannot bypass the original dispatcher.
        assert page.locator('#log').inner_text()==reason.inner_text()
        assert page.evaluate('__serienDiagnostics.indicatorState().states.map(s=>[s.id,s.on])')==switches
        assert page.evaluate('__serienDiagnostics.railwayState()')==before
        rejected=page.evaluate("__serienDiagnostics.requestToggle('Y-4','device')")
        assert not rejected['changed'] and rejected['message']==reason.inner_text()
        result['occupied']=rejected
        check('occupied-disabled-reason-visible-dispatcher-refuses-both-panel-and-device')

        # Move the retained fourth locomotive out of this approach, then allow the
        # real 45 units/s² acceleration to reach the actual approach lock margin.
        page.evaluate("__serienDiagnostics.placeTrain(3,'T8',100);__serienDiagnostics.placeTrain(2,'T47',-__serienDiagnostics.snapshot().stock[2].vehicles[0].couplers.back.x+120,-1);document.getElementById('speed').value=100;document.getElementById('speed').dispatchEvent(new Event('input'));__serienDiagnostics.step(1.5)")
        assert button.is_disabled()
        assert reason.inner_text()=='Train approaching · operation blocked',reason.inner_text()
        switches=page.evaluate('__serienDiagnostics.indicatorState().states.map(s=>[s.id,s.on])')
        rejected=page.evaluate("__serienDiagnostics.requestToggle('Y-4','panel')")
        assert rejected['reason']=='approaching'
        assert page.evaluate('__serienDiagnostics.indicatorState().states.map(s=>[s.id,s.on])')==switches
        result['approaching']=rejected
        check('real-moving-approach-blocked-with-readable-engine-reason-and-no-toggle')

        result['visual']=[]
        for width,height in [(1440,900),(1024,768),(390,844)]:
            page.set_viewport_size({'width':width,'height':height})
            page.evaluate("document.getElementById('day').value=10;document.getElementById('day').dispatchEvent(new Event('input'));document.querySelector('.sidebar').scrollTop=0;window.scrollTo(0,0)")
            shot(str(width)+'-day-overall')
            page.locator('#switchReason-Y-4').scroll_into_view_if_needed()
            shot(str(width)+'-switches-blocked')
            assert reason.is_visible() and reason.inner_text()
            page.locator('.sidebar .m-lg').scroll_into_view_if_needed()
            shot(str(width)+'-map')
            verify_map()
            page.locator('.sidebar .m-ms').scroll_into_view_if_needed()
            shot(str(width)+'-missions')
            page.evaluate("document.getElementById('day').value=95;document.getElementById('day').dispatchEvent(new Event('input'));document.querySelector('.sidebar').scrollTop=0;window.scrollTo(0,0)")
            shot(str(width)+'-night-overall')
            assert page.locator('#sun').inner_text()=='☾'
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            for selector in ['#day','#nextMission','.u4-map-trains button','[data-switch="0"]']:
                box=page.locator(selector).first.bounding_box()
                assert box['width']>=44 and box['height']>=44,(selector,box)
            result['visual'].append({'viewport':[width,height],'sidebar':page.locator('.sidebar').bounding_box()})
        page.screenshot(path=str(out/'390-full-page.png'),full_page=True)
        check('three-real-viewports-day-night-blocked-reasons-missions-map-and-44px-targets')

        page.set_viewport_size({'width':1440,'height':900});page.evaluate('window.scrollTo(0,0)')
        page.locator('.top').get_by_role('button',name='Menu',exact=True).click();page.keyboard.press('Escape')
        assert page.locator('#dlg').is_hidden()
        page.locator('#camt').click();page.keyboard.press('Escape');assert page.locator('#u3CameraTools').is_hidden()
        page.evaluate("document.getElementById('trainManagement').click()")
        assert page.locator('dialog.trainManagement').count()==1
        page.locator('dialog.trainManagement [data-close]').click()
        assert page.locator('#log').count()==1
        assert not result['pageErrors'] and not result['consoleErrors'] and not result['httpFailures'] and not result['failedRequests'] and not result['external'],result
        check('U2-menu-TM-and-U3-camera-dialogs-survive-sidebar-integration-no-errors')
        result['status']='PASS'
    except Exception as e:
        result['status']='FAIL';result['failure']=str(e)
        page.screenshot(path=str(out/'failure.png'))
        raise
    finally:
        save();browser.close()
