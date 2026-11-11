"""Trusted input, real topology SVG and cleanup via an isolated read-only build observer."""
import hashlib, json, os
from pathlib import Path
from playwright.sync_api import sync_playwright

bundle = Path(os.environ['U3_OBSERVER'])
out = Path(os.environ.get('U3_PICKING_OUTPUT','/workspace/work/ui-v21-u3/picking'))
out.mkdir(parents=True, exist_ok=True)
result = {'status':'RUNNING','observerSHA256':hashlib.sha256(bundle.read_bytes()).hexdigest(),
          'method':'same app plus object observer; trusted CDP/mouse; on-demand RAF',
          'checks':[], 'errors':[]}
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,
                                args=['--no-sandbox','--enable-unsafe-swiftshader'])
    page = browser.new_page(viewport={'width':1440,'height':900})
    page.on('pageerror',lambda e:result['errors'].append(str(e)))
    page.route('**/auth-gate.js*',lambda r:r.fulfill(content_type='text/javascript',body="document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;await import('./dist/game.js');"))
    page.route('**/dist/game.js*',lambda r:r.fulfill(path=bundle,content_type='text/javascript'))
    page.add_init_script("const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>{if(cb.toString().includes('requestAnimationFrame')&&cb.toString().includes('.render(')){window.__u3Frame=cb;return 1;}return raf(cb);};")
    def check(name):
        result['checks'].append(name)
        (out/'results.json').write_text(json.dumps(result,indent=2)+'\n')
        print(name+': PASS',flush=True)
    try:
        page.goto(os.environ.get('SERIEN_URL','http://127.0.0.1:8033/')+'?diagnostics=1')
        page.wait_for_function('Boolean(window.__u3)')
        page.evaluate("document.getElementById('pause').click();document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'));__u3Frame(performance.now())")
        page.evaluate("""()=>{
          const u=__u3,a=__serienDiagnostics;
          a.setSwitches([]);['T12','T0','T16'].forEach((e,i)=>a.placeTrain(i,e,150));
          u.controls.enableDamping=false;
          window.__aimU3=(id,pathIndex=0)=>{
            const def=a.turnoutView(id).paths[pathIndex],e=u.network.edges[def.edge],s=e.length*.5;
            const i=e.distance.findIndex(d=>d>=s),p=e.points[i-1],q=e.points[i],f=(s-e.distance[i-1])/(e.distance[i]-e.distance[i-1]),x=p.x+(q.x-p.x)*f,z=p.z+(q.z-p.z)*f;
            u.controls.target.set(x,6.08,z);u.camera.position.set(x+100,306.08,z+150);u.controls.update();u.camera.updateMatrixWorld();
            __serienProfile.effects.render(false);u.renderer.getContext().finish();
            const v=new u.THREE.Vector3(x,6.08,z).project(u.camera),r=u.renderer.domElement.getBoundingClientRect();return {x:r.left+(v.x+1)/2*r.width,y:r.top+(1-v.y)/2*r.height};
          };
        }""")
        controls = page.evaluate('__serienDiagnostics.indicatorState().states.map(s=>s.id)')
        result['switches'] = []
        for control in controls:
            page.evaluate('__serienDiagnostics.setSwitches([])')
            point = page.evaluate('id=>__aimU3(id)',control)
            assert page.evaluate('p=>document.elementFromPoint(p.x,p.y).tagName',point) == 'CANVAS'
            page.mouse.click(point['x'],point['y'])
            assert dict(page.evaluate('__serienDiagnostics.indicatorState().states.map(s=>[s.id,s.on])'))[control]
            result['switches'].append(control)
        check('all-eight-real-3D-turnout-clicks-reach-original-dispatcher')

        point = page.evaluate("""()=>{const u=__u3,t=u.trains[0].group.position;
          document.querySelector('[data-train="2"]').click();u.controls.target.set(t.x,t.y+10,t.z);u.camera.position.set(t.x+100,t.y+310,t.z+150);u.controls.update();u.camera.updateMatrixWorld();
          __serienProfile.effects.render(false);u.renderer.getContext().finish();
          const v=new u.THREE.Vector3(t.x,t.y+10,t.z).project(u.camera),r=u.renderer.domElement.getBoundingClientRect();return {x:r.left+(v.x+1)/2*r.width,y:r.top+(1-v.y)/2*r.height};
        }""")
        page.mouse.click(point['x'],point['y'])
        assert page.evaluate('__serienDiagnostics.snapshot().consoles.active') == 0
        check('trusted-real-train-hit-selects-same-console')

        page.locator('#camt').click();page.locator('#viewPan').click();page.keyboard.press('Escape')
        before = page.evaluate('__u3.controls.target.toArray()')
        page.mouse.move(point['x'],point['y']);page.mouse.down();page.mouse.move(point['x']+60,point['y']+15,steps=4);page.mouse.up()
        assert page.evaluate('__u3.controls.target.toArray()') != before
        assert page.evaluate('__u3.nav.preset') == 'manual'
        page.locator('#camt').click();page.locator('#viewOrbit').click();page.keyboard.press('Escape')
        position = page.evaluate('__u3.camera.position.toArray()')
        cdp = page.context.new_cdp_session(page)
        cdp.send('Emulation.setTouchEmulationEnabled',{'enabled':True,'maxTouchPoints':2})
        touch = {'x':point['x'],'y':point['y'],'id':10}
        cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[touch]})
        cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{**touch,'x':touch['x']+50}]})
        cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
        assert page.evaluate('__u3.camera.position.toArray()') != position
        cdp.send('Emulation.setTouchEmulationEnabled',{'enabled':False})
        check('trusted-pan-and-touch-orbit-after-view-panel-closes')

        page.evaluate('__serienDiagnostics.step(0)')
        assert page.evaluate('''()=>{const expected=document.createElement('div');expected.innerHTML=__u3.schemaSVG(__u3.network,__u3.nextSwitchHUD.snapshot.preview);return __u3.nextSwitchHUD.panel.querySelector('.nextSwitchScheme').innerHTML===expected.innerHTML;}''')
        before = page.evaluate('__serienDiagnostics.railwayState()')
        for _ in range(4):page.locator('.nextSwitchMinimize').click()
        assert page.evaluate('__serienDiagnostics.railwayState()') == before
        check('real-generated-topology-svg-identical-and-hud-read-only')

        # Actual guarded approach before teardown, so timer cleanup is meaningful.
        page.evaluate("""()=>{const a=__serienDiagnostics,u=__u3,$=id=>document.getElementById(id);
          document.querySelector('[data-train="2"]').click();for(let i=0;i<5;i++)$('uncouple').click();
          a.setSwitches(['Y-4']);a.placeTrain(2,'T47',-u.trains[2].group.userData.couplers.back.x+80,-1);a.requestToggle('Y-4','panel');
          $('speed').value=100;$('speed').dispatchEvent(new Event('input'));a.step(5);$('pause').click();u.guardedStops.update(performance.now());u.viewportOverlays.update();
        }""")
        assert page.evaluate('__u3.guardedStops.bell.snapshot.timer')
        page.evaluate('window.dispatchEvent(new PageTransitionEvent("pagehide",{persisted:false}))')
        assert page.locator('.u3-overlays').count() == 0 and page.locator('#bellSeg').count() == 0
        assert not page.evaluate('__u3.guardedStops.bell.snapshot.timer')
        assert page.evaluate('__u3.guardedStops.bell.snapshot.voices') == 0
        page.evaluate('__u3.viewportOverlays.dispose();__u3.guardedStops.dispose()')
        assert not result['errors'], result['errors']
        check('actual-pagehide-cleans-active-bell-timer-voices-and-all-overlay-listeners')
        result['status'] = 'PASS'
    except Exception as e:
        result['status'] = 'FAIL';result['failure'] = str(e)
        page.screenshot(path=str(out/'failure.png'))
        raise
    finally:
        (out/'results.json').write_text(json.dumps(result,indent=2)+'\n')
        browser.close()
