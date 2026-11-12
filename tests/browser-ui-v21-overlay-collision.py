"""HUD/View collision regression on the real production bundle, localhost only.

SERIEN_URL selects the local server; OVERLAY_OUTPUT selects isolated evidence.
Auth bootstrap and on-demand RAF are laboratory-only. No fake camera, HUD,
railway snapshots or production credentials. Fault arrangements use the existing
diagnostic commands against the real local simulation.
"""
import hashlib
import json
import os
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
base = os.environ.get('SERIEN_URL', 'http://127.0.0.1:8051/')
assert urlsplit(base).hostname in ('127.0.0.1', 'localhost'), 'Local Auth bootstrap only'
out = Path(os.environ.get('OVERLAY_OUTPUT', '/workspace/work/hud-camera/browser'))
out.mkdir(parents=True, exist_ok=True)
result = {'status': 'RUNNING', 'bundleSHA256': hashlib.sha256((root/'dist/game.js').read_bytes()).hexdigest(),
          'method': 'Production bundle, real camera/engine; localhost Auth bootstrap, controlled real RAF, trusted input',
          'checks': [], 'measurements': [], 'errors': [], 'httpFailures': []}

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                                args=['--no-sandbox', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'])
    page = browser.new_page(viewport={'width':390, 'height':844}, reduced_motion='reduce')
    page.set_default_timeout(20000)
    page.on('pageerror', lambda e: result['errors'].append(str(e)))
    page.on('response', lambda r: result['httpFailures'].append([r.url,r.status]) if r.status >= 400 else None)
    page.route('**/auth-gate.js*', lambda r: r.fulfill(content_type='text/javascript', body="document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;await import('./dist/game.js');"))
    page.add_init_script("""
      const raf=requestAnimationFrame.bind(window);
      window.requestAnimationFrame=cb=>{if(cb.toString().includes('requestAnimationFrame')&&cb.toString().includes('.render(')){window.__overlayFrame=cb;return 1;}return raf(cb)};
      const add=EventTarget.prototype.addEventListener,remove=EventTarget.prototype.removeEventListener;
      window.__overlayListeners=[];
      EventTarget.prototype.addEventListener=function(type,fn,options){__overlayListeners.push({target:this,type,fn,options,active:true});return add.call(this,type,fn,options)};
      EventTarget.prototype.removeEventListener=function(type,fn,options){for(const e of __overlayListeners)if(e.target===this&&e.type===type&&e.fn===fn)e.active=false;return remove.call(this,type,fn,options)};
      const RO=ResizeObserver;window.__overlayObservers=[];
      window.ResizeObserver=class extends RO{constructor(cb){super(cb);this.targets=[];this.off=false;__overlayObservers.push(this)}observe(e,...args){this.targets.push(e);return super.observe(e,...args)}disconnect(){this.off=true;return super.disconnect()}};
    """)

    def save(): (out/'results.json').write_text(json.dumps(result, indent=2)+'\n')
    def check(name):
        result['checks'].append(name)
        save()
        print('PASS '+name, flush=True)
    def js(code, arg=None): return page.evaluate(code, arg)
    def frame(): js('__overlayFrame(performance.now())')
    def expanded(): return page.locator('.nextSwitchMinimize').get_attribute('aria-expanded') == 'true'
    def set_hud(value):
        if expanded() != value: page.locator('.nextSwitchMinimize').click()
    def open_view():
        if page.locator('#camt').get_attribute('aria-expanded') != 'true': page.locator('#camt').click()
        page.wait_for_timeout(80)
    def close_view():
        if page.locator('#camt').get_attribute('aria-expanded') == 'true': page.locator('#camt').click()
    def railway(): return js('__serienDiagnostics.railwayState()')
    def safe_menu(label):
        measurement = js("""()=>{
          const box=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
          const camera=document.getElementById('u3CameraTools'),c=box(camera);
          const blockers=['#nextSwitchHUD','#guardedStopStatus'].map(s=>{const e=document.querySelector(s),b=box(e);return {selector:s,box:b,area:Math.max(0,Math.min(c.right,b.right)-Math.max(c.x,b.x))*Math.max(0,Math.min(c.bottom,b.bottom)-Math.max(c.y,b.y))}});
          return {viewport:[innerWidth,innerHeight],camera:c,blockers,world:box(document.getElementById('view3d'))};
        }""")
        measurement['case'] = label
        result['measurements'].append(measurement)
        assert all(x['area'] == 0 for x in measurement['blockers']), measurement
        c,w = measurement['camera'],measurement['world']
        assert c['x'] >= w['x']-1 and c['right'] <= w['right']+1 and c['y'] >= w['y']-1 and c['bottom'] <= w['bottom']+1, measurement
        assert c['height'] >= 44, measurement
    def click_preset(preset):
        button = page.locator('[data-preset='+preset+']')
        button.scroll_into_view_if_needed()
        assert button.evaluate("e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return hit===e||e.contains(hit)}"), preset
        before = js('__serienDiagnostics.snapshot().camera')
        button.click()
        frame()
        after = js('__serienDiagnostics.snapshot().camera')
        assert after['preset'] == preset, after
        assert button.get_attribute('aria-pressed') == 'true'
        if preset == 'station' and before['preset'] != preset:
            assert after['position'] != before['position'] or after['target'] != before['target'], [before,after]
        return after

    try:
        page.goto(base+'?diagnostics=1', wait_until='networkidle')
        page.wait_for_function('Boolean(window.__serienDiagnostics&&window.__overlayFrame)')
        js("document.getElementById('pause').click();document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'));window.__originalWarning=document.querySelector('.nextSwitchWarning')")
        frame()
        js('async()=>{await Promise.all([document.fonts.load(\'700 16px "Cinzel Decorative"\'),document.fonts.load(\'400 14px Federo\'),document.fonts.load(\'400 12px "Cutive Mono"\')]);await document.fonts.ready}')
        for width,height in [(320,700),(375,812),(390,844),(430,932),(768,1024),(1692,877)]:
            page.set_viewport_size({'width':width,'height':height})
            js('window.scrollTo(0,0)')
            page.wait_for_timeout(150)
            rail = railway()
            set_hud(True)
            open_view()
            safe_menu('A-HUD-View')
            assert expanded() == (width > 700)
            response = click_preset('station')
            result.setdefault('stationCameraResponses', []).append({'viewport':[width,height], 'camera':response})
            if width == 390:
                page.locator('#u3CameraTools').evaluate('e=>e.scrollTop=0')
                page.screenshot(path=str(out/'after-390x844.png'), full_page=True)
            close_view()
            assert expanded(), 'Prior expanded state must be restored'
            assert page.locator('#camt').get_attribute('aria-expanded') == 'false'
            assert js("document.querySelector('.nextSwitchWarning')===__originalWarning&&__originalWarning.parentElement.id==='nextSwitchBody'")
            set_hud(False)
            open_view()
            page.locator('.nextSwitchMinimize').click()
            assert expanded()
            assert page.locator('#u3CameraTools').is_hidden() == (width <= 700)
            assert page.locator('.nextSwitchMinimize').evaluate('e=>document.activeElement===e')
            close_view()
            for preset in ['overview','station','yard','follow']:
                open_view()
                safe_menu('all-presets-'+preset)
                click_preset(preset)
                close_view()
            assert railway() == rail, 'Overlay/camera commands mutated railway state'
            check(f'{width}x{height}: A/B, real Station and all presets, ARIA/focus, no railway mutation')

        page.set_viewport_size({'width':390,'height':844})
        js('window.scrollTo(0,0)')
        set_hud(True)
        page.locator('#camt').focus()
        page.keyboard.press('Enter')
        page.keyboard.press('Tab')
        assert page.locator('#cameraView').evaluate('e=>document.activeElement===e')
        page.keyboard.press('Escape')
        assert expanded() and page.locator('#u3CameraTools').is_hidden()
        assert page.locator('#camt').evaluate('e=>document.activeElement===e')
        open_view()
        page.locator('.nextSwitchMinimize').focus()
        page.keyboard.press('Escape')
        assert expanded() and page.locator('#u3CameraTools').is_hidden()
        assert page.locator('#camt').evaluate('e=>document.activeElement===e')
        for _ in range(12):
            open_view(); close_view(); assert expanded()
        set_hud(False); open_view(); close_view(); assert not expanded()
        set_hud(True); open_view()
        page.locator('.nextSwitchMinimize').click()
        assert expanded() and page.locator('#u3CameraTools').is_hidden()
        page.locator('.nextSwitchMinimize').click()
        assert not expanded(), 'No stale restore after explicit user state change'
        check('keyboard Escape/focus, twelve repeated cycles, compact intent and user cancellation')

        set_hud(True); open_view()
        for width,height in [(844,390),(768,1024),(390,844)]:
            page.set_viewport_size({'width':width,'height':height})
            js("window.dispatchEvent(new Event('orientationchange'));window.scrollTo(0,0)")
            page.wait_for_timeout(180)
            safe_menu('resize-orientation')
            assert expanded() == (width > 700 and height > 480)
        close_view(); assert expanded()
        check('open-menu resize, portrait/landscape, desktop exit and narrow reentry restore state')

        # Original occupied protection, with no invented warning text or risk logic.
        js("""()=>{const a=__serienDiagnostics;
          document.querySelector('[data-train="2"]').click();for(let i=0;i<5;i++)document.getElementById('uncouple').click();
          a.setSwitches(['Y-4']);a.placeTrain(2,'TO4:AC',100,-1);a.step(0);
        }""")
        frame()
        tile = page.locator('button[data-switch-id="Y-4"]')
        assert tile.is_disabled()
        assert 'occupied' in page.locator('#switchReason-Y-4').inner_text().lower()
        warning_text = page.locator('.nextSwitchWarning').text_content()
        for width,height in [(320,700),(390,844)]:
            page.set_viewport_size({'width':width,'height':height})
            set_hud(True); open_view(); safe_menu('occupied')
            assert page.locator('#switchReason-Y-4').is_visible()
            assert tile.is_disabled()
            assert page.locator('.nextSwitchWarning').text_content() == warning_text
            if warning_text: assert page.locator('.nextSwitchWarning').is_visible()
            click_preset('station'); close_view()
        check('real occupied switch remains disabled; original reasons and HUD warning available')

        set_hud(True); open_view()
        js("""()=>{const a=__serienDiagnostics;
          a.setSwitches(['Y-4']);const t=a.snapshot().stock[2];
          a.placeTrain(2,'T47',-t.vehicles[0].couplers.back.x+80,-1);a.requestToggle('Y-4','panel');
          const s=document.getElementById('speed');s.value=100;s.dispatchEvent(new Event('input'));a.step(5);
        }""")
        frame()
        assert js('__serienDiagnostics.snapshot().stock[2].guard.state') == 'GUARDED_STOP'
        warning_text = page.locator('.nextSwitchWarning').text_content()
        guard_text = page.locator('[data-ctrl="CTRL-047"]').text_content()
        assert warning_text and 'guarded stop' in guard_text.lower(), [warning_text,guard_text]
        page.wait_for_timeout(150)
        safe_menu('Guarded Stop arrives while View is already open')
        assert page.locator('.nextSwitchWarning').is_visible()
        assert page.locator('[data-ctrl="CTRL-047"]').is_visible()
        close_view(); assert expanded()
        for width,height in [(320,700),(375,812),(390,844),(430,932),(768,1024),(1692,877)]:
            page.set_viewport_size({'width':width,'height':height})
            js('window.scrollTo(0,0)')
            set_hud(True)
            rail = railway()
            open_view(); page.wait_for_timeout(150); safe_menu('GUARDED_STOP')
            assert page.locator('.nextSwitchWarning').is_visible()
            assert page.locator('.nextSwitchWarning').text_content() == warning_text
            assert page.locator('[data-ctrl="CTRL-047"]').is_visible()
            assert page.locator('[data-ctrl="CTRL-047"]').text_content() == guard_text
            assert js('document.querySelector(".nextSwitchWarning")===__originalWarning')
            for preset in ['overview','station','yard','follow']: click_preset(preset)
            assert railway() == rail
            if width in [320,390]:
                page.locator('#u3CameraTools').evaluate('e=>e.scrollTop=0')
                page.screenshot(path=str(out/f'guarded-{width}x{height}.png'),full_page=True)
            close_view(); assert expanded()
        check('real Guarded Stop and original live warning remain visible with all presets at six viewports')

        page.set_viewport_size({'width':390,'height':844})
        open_view()
        cleanup = js("""()=>{
          const nodes=[document.getElementById('camt'),document.querySelector('.nextSwitchMinimize'),document.querySelector('#view3d canvas')];
          window.__ownedListeners=__overlayListeners.filter(e=>e.active&&((e.target===window&&['resize','orientationchange'].includes(e.type))||nodes.includes(e.target)));
          window.__ownedRO=__overlayObservers.filter(e=>e.targets.some(t=>t.id==='nextSwitchHUD'||t.id==='guardedStopStatus'));
          window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:false}));
          return {active:__ownedListeners.filter(e=>e.active).map(e=>e.type),observerDisconnected:__ownedRO.every(e=>e.off),overlayCount:document.querySelectorAll('.u3-overlays').length};
        }""")
        result['cleanup'] = cleanup
        assert cleanup == {'active':[], 'observerDisconnected':True, 'overlayCount':0}, cleanup
        js("window.dispatchEvent(new Event('resize'));window.dispatchEvent(new Event('orientationchange'))")
        assert not result['errors'] and not result['httpFailures'], result
        check('pagehide during coordinated View: listeners removed, ResizeObserver disconnected, no residual overlay/errors')
        result['status'] = 'PASS'
    except Exception as error:
        result['status'] = 'FAIL'
        result['failure'] = str(error)
        page.screenshot(path=str(out/'failure.png'), full_page=True)
        raise
    finally:
        save()
        browser.close()
