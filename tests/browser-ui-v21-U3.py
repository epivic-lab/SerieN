"""U3 real app. Local Auth boundary only; deterministic on-demand RAF, no mock rail data.
Optional U3_OBSERVER exposes actual objects for trusted picking/cleanup verification.
Production dist is never replaced on disk. Outputs are isolated from historic evidence.
"""
import hashlib, json, os
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
out = Path(os.environ.get('U3_OUTPUT', '/workspace/work/ui-v21-u3/browser'))
out.mkdir(parents=True, exist_ok=True)
base = os.environ.get('SERIEN_URL', 'http://127.0.0.1:8033/')
observer = os.environ.get('U3_OBSERVER')
result = {'status':'RUNNING', 'method':'real app; local Auth boundary; on-demand production RAF',
          'bundleSHA256':hashlib.sha256(Path(observer or root/'dist/game.js').read_bytes()).hexdigest(),
          'observer':bool(observer), 'checks':[], 'pageErrors':[], 'consoleErrors':[], 'httpFailures':[], 'failedRequests':[], 'external':[]}

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                                args=['--no-sandbox', '--enable-unsafe-swiftshader'])
    page = browser.new_page(viewport={'width':1440, 'height':900})
    page.set_default_timeout(45000)
    page.on('pageerror', lambda e: result['pageErrors'].append(str(e)))
    page.on('console', lambda m: result['consoleErrors'].append(m.text) if m.type == 'error' else None)
    page.on('response', lambda r: result['httpFailures'].append([r.url,r.status]) if r.status >= 400 else None)
    page.on('requestfailed', lambda r: result['failedRequests'].append(r.url))
    page.on('request', lambda r: result['external'].append(r.url) if r.url.startswith('http') and not r.url.startswith(base) else None)
    page.route('**/auth-gate.js*', lambda r:r.fulfill(content_type='text/javascript', body="document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;document.getElementById('signOut').hidden=false;await import('./dist/game.js');"))
    if observer:
        page.route('**/dist/game.js*', lambda r:r.fulfill(path=observer, content_type='text/javascript'))
    page.add_init_script("const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>{if(cb.toString().includes('requestAnimationFrame')&&cb.toString().includes('.render(')){window.__u3Frame=cb;return 1;}return raf(cb);};")

    def save(): (out/'results.json').write_text(json.dumps(result, indent=2)+'\n')
    def check(name):
        result['checks'].append(name)
        save()
        print(name+': PASS', flush=True)
    def frame(): page.evaluate('__u3Frame(performance.now())')
    def tools():
        if page.locator('#camt').get_attribute('aria-expanded') == 'false': page.locator('#camt').click()
    def menu(): page.locator('.top').get_by_role('button', name='Menu', exact=True).click()
    def close_menu(): page.locator('#dlg').get_by_role('button', name='Close', exact=True).click()
    def shot(name):
        frame()
        page.wait_for_timeout(850)
        page.screenshot(path=str(out/(name+'.png')))
    def snapshot(): return page.evaluate('__serienDiagnostics.snapshot()')

    try:
        page.goto(base+'?diagnostics=1', wait_until='domcontentloaded')
        page.wait_for_function('Boolean(window.__serienDiagnostics && window.__u3Frame)')
        page.wait_for_load_state('networkidle')
        page.evaluate("document.getElementById('pause').click();document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'))")
        frame()
        assert page.locator('#view3d canvas').count() == 1
        assert page.locator('#view3d').evaluate('e=>e.firstElementChild.tagName') == 'CANVAS'
        assert page.locator('#loadMsg').is_hidden()
        assert page.locator('#log').count() == 1 and page.locator('.sidebar #log').count() == 0
        check('single-canvas-original-startup-and-one-persistent-log')

        for preset in ['station','yard','overview','follow']:
            tools()
            page.locator('[data-preset='+preset+']').click()
            frame()
            assert snapshot()['camera']['preset'] == preset
            assert page.locator('[data-preset='+preset+']').get_attribute('aria-pressed') == 'true'
        page.locator('#viewPan').click()
        assert page.locator('#viewPan').get_attribute('aria-pressed') == 'true'
        page.locator('#viewOrbit').click()
        assert page.locator('#viewOrbit').get_attribute('aria-pressed') == 'true'
        before = snapshot()['camera']['position']
        page.locator('#viewZoomIn').click()
        assert snapshot()['camera']['position'] != before
        page.locator('#viewZoomOut').click()
        page.locator('#viewFollow').click()
        assert snapshot()['camera']['preset'] == 'follow'
        page.keyboard.press('Escape')
        assert page.locator('#u3CameraTools').is_hidden()
        assert page.locator('#camt').evaluate('e=>document.activeElement===e')
        # Genuine pointer reaches OrbitControls through the transparent layout layer.
        box = page.locator('#view3d canvas').bounding_box()
        x,y = box['x']+box['width']*.46, box['y']+box['height']*.48
        page.mouse.move(x,y); page.mouse.down(); page.mouse.move(x+45,y+15,steps=4); page.mouse.up()
        frame()
        assert snapshot()['camera']['preset'] == 'manual'
        assert page.locator('.u3-camera-state').inner_text() == 'Free camera'
        page.locator('#viewHome').click()
        assert snapshot()['camera']['preset'] == 'overview'
        check('real-presets-home-follow-zoom-pan-orbit-escape-and-trusted-drag-breaks-follow')

        tools()
        # Use the existing engine clock contract at precise boundaries: a software
        # render can itself take several seconds, so wall-clock waits are not an oracle.
        result['routeBoundary'] = page.evaluate("""()=>{
          const real=performance.now.bind(performance),start=real();let elapsed=0;
          Object.defineProperty(performance,'now',{configurable:true,value:()=>start+elapsed});
          const button=document.getElementById('routePreview'),a=__serienDiagnostics;
          try {
            button.click();a.step(0);const at0=button.getAttribute('aria-pressed');
            elapsed=14999;a.step(0);const before=button.getAttribute('aria-pressed');
            elapsed=15000;a.step(0);const at15=button.getAttribute('aria-pressed');
            button.click();a.step(0);button.click();a.step(0);
            return {at0,before14999ms:before,at15000ms:at15,secondClickHides:!a.snapshot().nextSwitch.highlighted};
          } finally {Object.defineProperty(performance,'now',{configurable:true,value:real});}
        }""")
        assert result['routeBoundary'] == {'at0':'true','before14999ms':'true','at15000ms':'false','secondClickHides':True}
        assert 'not movement authority' in page.locator('#routePreview').get_attribute('title')
        page.keyboard.press('Escape')
        check('real-15-second-route-expiry-second-click-hides-and-disclaimer')

        # HUD emits only minimize/expand. Do not render across the read-only checkpoint.
        initial = page.evaluate('__serienDiagnostics.railwayState()')
        switch_state = snapshot()['switchIndicators']
        for _ in range(4): page.locator('.nextSwitchMinimize').click()
        page.locator('.nextSwitchScheme').dispatch_event('click')
        assert page.evaluate('__serienDiagnostics.railwayState()') == initial
        assert snapshot()['switchIndicators'] == switch_state
        assert page.locator('#nextSwitchHUD button').count() == 1
        hud_states = []
        for train in [0,1,2]:
            page.locator('[data-train="'+str(train)+'"]').click(); page.evaluate('__serienDiagnostics.step(0)')
            state = snapshot()
            assert page.locator('.nextSwitchName').inner_text() == state['nextSwitch']['name']
            if state['nextSwitch']['destination']:
                assert state['nextSwitch']['destination'] in page.locator('.nextSwitchDestination').inner_text()
            if observer:
                assert page.evaluate('''()=>{const expected=document.createElement('div');expected.innerHTML=__u3.schemaSVG(__u3.network,__u3.nextSwitchHUD.snapshot.preview);return __u3.nextSwitchHUD.panel.querySelector('.nextSwitchScheme').innerHTML===expected.innerHTML;}''')
            hud_states.append(state['nextSwitch'])
        result['hudStates'] = hud_states
        check('read-only-hud-no-switch-actions-real-train-name-route-and-topology-svg')

        # Real misaligned yard approach, using the baseline engine's diagnostic placement.
        guard = page.evaluate("""()=>{
          const a=__serienDiagnostics,$=id=>document.getElementById(id);
          document.querySelector('[data-train="2"]').click();for(let i=0;i<5;i++)$('uncouple').click();
          a.setSwitches(['Y-4']);const t=a.snapshot().stock[2];
          a.placeTrain(2,'T47',-t.vehicles[0].couplers.back.x+80,-1);
          a.requestToggle('Y-4','panel');$('speed').value=100;$('speed').dispatchEvent(new Event('input'));
          a.step(5);return a.snapshot().stock[2].guard;
        }""")
        frame()
        assert guard['state'] == 'GUARDED_STOP'
        warning = page.locator('[data-ctrl=CTRL-047]').inner_text()
        assert 'Approach blocked' in warning and guard['risk'] in warning and guard['reason'] in warning
        page.locator('#pause').click(); frame()  # Allow the real Bell controller to become active.
        assert page.evaluate('__serienDiagnostics.guardedStopState().audio.active')
        menu()
        page.locator('#bellSeg').click()
        assert page.locator('#bellChip').get_attribute('aria-pressed') == 'true'
        assert page.locator('#bellSeg').get_attribute('aria-pressed') == 'true'
        for name in ['UI sound: Off','UI sound: On']:
            page.locator('#dlg').get_by_role('button',name=name,exact=True).click()
            assert page.evaluate('__serienDiagnostics.guardedStopState().audio.muted')
        close_menu()
        assert page.locator('[data-ctrl=CTRL-047]').inner_text() == warning
        page.locator('#bellChip').click()
        assert page.locator('#bellSeg').get_attribute('aria-pressed') == 'false'
        assert page.evaluate('__serienDiagnostics.guardedStopState().audio.timer')
        page.locator('#bellChip').click()
        assert not page.evaluate('__serienDiagnostics.guardedStopState().audio.timer')
        check('real-guard-risk-retained-muted-single-bell-menu-chip-and-independent-ui-sound')

        # R1 permits correcting the misaligned approach while stopped. For a refusal,
        # occupy a different real turnout rather than assert that this correction fails.
        refused = page.evaluate("""()=>{
          const a=__serienDiagnostics;
          document.querySelector('[data-train="0"]').click();
          for(let i=0;i<5;i++)document.getElementById('uncouple').click();
          a.placeTrain(0,'TO0:AB',100);
          document.querySelector('[data-train="2"]').click();a.step(0);
          return a.requestToggle('Y-IN','panel');
        }""")
        assert not refused['changed'] and refused['message']
        message = page.locator('#log').inner_text()
        assert message == refused['message']
        page.wait_for_timeout(1700)
        assert page.locator('#log').inner_text() == message
        result['refusalMessage'] = message
        result['guard'] = guard
        check('exact-engine-refusal-message-retained-in-operations-log')

        result['visual'] = []
        for width,height in [(1440,900),(1024,768),(390,844)]:
            page.set_viewport_size({'width':width,'height':height})
            if page.locator('.nextSwitchMinimize').get_attribute('aria-expanded') == 'true': page.locator('.nextSwitchMinimize').click()
            shot(str(width)+'-guard-muted')
            page.locator('.nextSwitchMinimize').click()
            shot(str(width)+'-hud-warning')
            tools(); page.locator('#routePreview').click(); shot(str(width)+'-camera-route-tools')
            page.keyboard.press('Escape')
            page.locator('#bellChip').click(); shot(str(width)+'-guard-bell-on'); page.locator('#bellChip').click()
            boxes = {s:page.locator(s).bounding_box() for s in ['#view3d','#cam','#nextSwitchHUD','#guardedStopStatus','.u3-operations']}
            for selector,rect in boxes.items():
                assert rect['x'] >= -1 and rect['x']+rect['width'] <= width+1,(selector,rect)
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            assert page.locator('#log').inner_text() == message
            for selector in ['#bellChip','.nextSwitchMinimize','#camt','#viewZoomIn','#viewHome']:
                box = page.locator(selector).bounding_box()
                assert box['height'] >= 44 and box['width'] >= 44,(selector,box)
            result['visual'].append({'viewport':[width,height], 'boxes':boxes})
        check('real-app-three-viewport-screenshots-risk-muted-active-hud-camera-log-touch-targets')

        page.evaluate("__serienDiagnostics.placeTrain(2,'T50',100,-1);__serienDiagnostics.step(0)")
        assert snapshot()['nextSwitch']['site'] is None
        assert snapshot()['nextSwitch']['stop'] == 'terminal'
        assert page.locator('.nextSwitchName').inner_text() == 'No switches ahead'
        assert 'End of track in' in page.locator('.nextSwitchDistance').inner_text()
        shot('390-hud-real-terminal')
        check('real-terminal-no-next-switch-state-with-distance')

        # Typed input/selection never becomes a railway command; body Space still selects Stop.
        page.set_viewport_size({'width':1440,'height':900})
        tools(); page.locator('#cameraView').focus()
        before = snapshot()['stock']
        page.keyboard.press('Space')
        assert snapshot()['stock'] == before
        page.keyboard.press('Escape')
        menu(); page.keyboard.press('Escape'); assert page.locator('#dlg').is_hidden()
        page.evaluate("document.getElementById('stopAll').click();document.body.tabIndex=-1;document.body.focus()")
        page.keyboard.press('Space')
        assert 'stopped' in page.locator('#log').inner_text()
        check('keyboard-space-selected-stop-form-exclusion-and-u2-escape-preserved')

        if observer:
            # Closely aim the real camera only; no replacement picker or controller.
            page.evaluate("""()=>{
              const u=__u3,a=__serienDiagnostics;
              a.setSwitches([]);['T12','T0','T16'].forEach((e,i)=>a.placeTrain(i,e,150));
              u.controls.enableDamping=false;
              window.__aimU3=(id)=>{const def=a.turnoutView(id).paths[0],e=u.network.edges[def.edge],s=e.length*.5;
                const i=e.distance.findIndex(d=>d>=s),p=e.points[i-1],q=e.points[i],f=(s-e.distance[i-1])/(e.distance[i]-e.distance[i-1]),x=p.x+(q.x-p.x)*f,z=p.z+(q.z-p.z)*f;
                u.controls.target.set(x,6.08,z);u.camera.position.set(x+100,306.08,z+150);u.controls.update();u.camera.updateMatrixWorld();
                const v=new u.THREE.Vector3(x,6.08,z).project(u.camera),r=u.renderer.domElement.getBoundingClientRect();return {x:r.left+(v.x+1)/2*r.width,y:r.top+(1-v.y)/2*r.height};};
            }""")
            controls = page.evaluate('__serienDiagnostics.indicatorState().states.map(s=>s.id)')
            for control in controls:
                page.evaluate('__serienDiagnostics.setSwitches([])')
                point = page.evaluate('id=>__aimU3(id)',control)
                assert page.evaluate('p=>document.elementFromPoint(p.x,p.y).tagName',point) == 'CANVAS'
                page.mouse.click(point['x'],point['y'])
                assert dict(page.evaluate('__serienDiagnostics.indicatorState().states.map(s=>[s.id,s.on])'))[control]
            point = page.evaluate("""()=>{const u=__u3,t=u.trains[0].group.position;document.querySelector('[data-train="2"]').click();u.controls.target.set(t.x,t.y+10,t.z);u.camera.position.set(t.x+100,t.y+310,t.z+150);u.controls.update();u.camera.updateMatrixWorld();const v=new u.THREE.Vector3(t.x,t.y+10,t.z).project(u.camera),r=u.renderer.domElement.getBoundingClientRect();return {x:r.left+(v.x+1)/2*r.width,y:r.top+(1-v.y)/2*r.height};}""")
            page.mouse.click(point['x'],point['y'])
            assert snapshot()['consoles']['active'] == 0
            check('trusted-canvas-picking-all-eight-real-switches-and-real-train')
            page.evaluate('window.dispatchEvent(new PageTransitionEvent("pagehide",{persisted:false}))')
            assert page.locator('.u3-overlays').count() == 0 and page.locator('#bellSeg').count() == 0
            assert not page.evaluate('__u3.guardedStops.bell.snapshot.timer')
            assert page.evaluate('__u3.guardedStops.bell.snapshot.voices') == 0
            page.evaluate('__u3.viewportOverlays.dispose();__u3.guardedStops.dispose()')
            check('real-pagehide-cleanup-no-overlays-menu-bell-timer-or-voices-idempotent')

        assert not result['pageErrors'] and not result['consoleErrors'] and not result['httpFailures'] and not result['failedRequests'] and not result['external'],result
        result['status'] = 'PASS'
    except Exception as error:
        result['status'] = 'FAIL'
        result['failure'] = str(error)
        page.screenshot(path=str(out/'failure.png'))
        raise
    finally:
        save()
        browser.close()
