"""Real dispatcher/3D parity and fail-closed history fixture via isolated object observer.
Fault setup changes actual engine test objects only; never mocks UI snapshots or handlers.
"""
import hashlib, json, os
from pathlib import Path
from playwright.sync_api import sync_playwright

bundle=Path(os.environ['U4_OBSERVER'])
out=Path(os.environ.get('U4_SAFETY_OUTPUT','/workspace/work/ui-v21-u4/safety'));out.mkdir(parents=True,exist_ok=True)
result={'status':'RUNNING','observerSHA256':hashlib.sha256(bundle.read_bytes()).hexdigest(),'checks':[],'errors':[],'cases':{}}
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1440,'height':900});page.set_default_timeout(60000)
    page.on('pageerror',lambda e:result['errors'].append(str(e)));page.on('dialog',lambda d:d.accept())
    page.route('**/auth-gate.js*',lambda r:r.fulfill(content_type='text/javascript',body="document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;await import('./dist/game.js');"))
    page.route('**/dist/game.js*',lambda r:r.fulfill(path=bundle,content_type='text/javascript'))
    page.add_init_script("const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>{if(cb.toString().includes('requestAnimationFrame')&&cb.toString().includes('.render(')){window.__u4Frame=cb;return 1;}return raf(cb);};")
    def check(name):
        result['checks'].append(name);(out/'results.json').write_text(json.dumps(result,indent=2)+'\n');print(name+': PASS',flush=True)
    try:
        page.goto(os.environ.get('SERIEN_URL','http://127.0.0.1:8033/')+'?diagnostics=1')
        page.wait_for_function('Boolean(window.__u4)')
        page.evaluate("document.getElementById('pause').click();document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'));__u4Frame(performance.now())")
        page.evaluate("""()=>{
          const a=__serienDiagnostics,u=__u3,v=__u4,$=id=>document.getElementById(id);
          window.__prepareU4=()=>{$('reset').click();$('pause').click();a.setSwitches([]);['T12','T0','T16'].forEach((e,i)=>a.placeTrain(i,e,150));document.querySelector('[data-train="2"]').click();for(let i=0;i<5;i++)$('uncouple').click();};
          window.__aimU4=(id,pathIndex=0)=>{const def=a.turnoutView(id).paths[pathIndex],e=u.network.edges[def.edge],s=e.length*.5;
            const i=e.distance.findIndex(d=>d>=s),p=e.points[i-1],q=e.points[i],f=(s-e.distance[i-1])/(e.distance[i]-e.distance[i-1]),x=p.x+(q.x-p.x)*f,z=p.z+(q.z-p.z)*f;
            u.controls.enableDamping=false;u.controls.target.set(x,6.08,z);u.camera.position.set(x+100,306.08,z+150);u.controls.update();u.camera.updateMatrixWorld();__serienProfile.effects.render(false);u.renderer.getContext().finish();
            const point=new u.THREE.Vector3(x,6.08,z).project(u.camera),r=u.renderer.domElement.getBoundingClientRect();return {x:r.left+(point.x+1)/2*r.width,y:r.top+(1-point.y)/2*r.height};
          };
        }""")
        for kind in ['occupied','approaching','unknown']:
            setup=page.evaluate("""kind=>{
              __prepareU4();const a=__serienDiagnostics,u=__u3,v=__u4,$=id=>document.getElementById(id);
              let id='Y-4';
              if(kind==='occupied'){a.setSwitches(['Y-4']);a.placeTrain(2,'TO4:AC',100,-1);}
              if(kind==='approaching'){a.setSwitches(['Y-4']);const t=u.trains[2];a.placeTrain(2,'T47',-t.group.userData.couplers.back.x+120,-1);$('speed').value=100;$('speed').dispatchEvent(new Event('input'));t.velocity=-100;}
              if(kind==='unknown'){
                document.querySelector('[data-train="0"]').click();for(let i=0;i<5;i++)$('uncouple').click();a.placeTrain(0,'T12',150,1);
                const t=u.trains[0],next=v.getSwitchAssistance().preview.next;
                t.journey.ensure(t.journey.position+5000,v.route);
                t.journey.move(next.distance-150,0,v.route,t.group.userData.couplers.front.x);
                u.renderVehicles();
                id=next.site.controls[0];
                // Reproduce a stale route fault as the existing railway guard tests do.
                const control=v.switchSpecs.find(s=>s.id===id);control.on=!control.on;t.velocity=150;
              }
              v.ui();u.nextSwitchHUD.refresh(true);v.sidebarUI.update();
              const safety=v.getSwitchAssistance().safetyByControl.get(id);
              return {id,safety,preview:v.getSwitchAssistance().preview.stop};
            }""",kind)
            control=setup['id'];safety=setup['safety']
            assert safety['blocked'] and safety['kind']==kind,setup
            button=page.locator('[data-switch][data-switch-id="'+control+'"]')
            reason=page.locator('#switchReason-'+control)
            assert button.is_disabled() and reason.inner_text()==safety['message']
            reason.scroll_into_view_if_needed();assert reason.is_visible()
            before=page.evaluate('__serienDiagnostics.railwayState()')
            states=page.evaluate('__serienDiagnostics.indicatorState().states.map(s=>[s.id,s.on])')
            button.dispatch_event('click')
            assert page.locator('#log').inner_text()==safety['message']
            point=page.evaluate('id=>__aimU4(id)',control)
            assert page.evaluate('p=>document.elementFromPoint(p.x,p.y).tagName',point)=='CANVAS'
            page.mouse.click(point['x'],point['y'])
            assert page.locator('#log').inner_text()==safety['message']
            assert page.evaluate('__serienDiagnostics.indicatorState().states.map(s=>[s.id,s.on])')==states
            assert page.evaluate('__serienDiagnostics.railwayState()')==before
            result['cases'][kind]=setup
            page.screenshot(path=str(out/(kind+'-actual-guard.png')))
            check(kind+'-real-engine-lock-visible-exact-reason-and-3D-panel-parity')

        page.evaluate('__prepareU4()')
        lighting=[]
        for value in [41,42,71,72]:
            sample=page.evaluate("""value=>{const e=document.getElementById('day');e.value=value;e.dispatchEvent(new Event('input'));__u4Frame(performance.now());return {day:__u4.getDay(),glyph:document.getElementById('sun').textContent,intensity:__u4.sun.intensity};}""",value)
            expected=2.65+(0.16-2.65)*max(0,min(1,(value-35)/65))
            assert sample['day']==value and abs(sample['intensity']-expected)<1e-9,sample
            lighting.append(sample)
        result['sceneLighting']=lighting
        check('original-daylight-value-and-actual-scene-sun-follow-original-threshold-binding')

        page.locator('.u4-map-trains [data-map-train="1"]').click()
        focused=page.evaluate("""()=>{const u=__u3,point=u.trains[1].journey.locate();for(let i=0;i<100;i++){u.nav.update(.2,point);u.controls.update();}return {point,target:u.controls.target.toArray(),preset:u.nav.preset};}""")
        assert abs(focused['target'][0]-focused['point']['x'])<.1 and abs(focused['target'][2]-focused['point']['z'])<.1,focused
        assert focused['preset']=='manual'
        result['focus']=focused
        check('map-focus-real-camera-target-matches-physical-locomotive')

        page.evaluate("window.__oldMapButton=document.querySelector('.u4-map-trains button');window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:false}));__u4.sidebarUI.dispose();__oldMapButton.click()")
        assert page.locator('#sidebarRailwayMap').count()==0
        assert page.locator('.u4-region > .m').count()==0
        assert not result['errors'],result['errors']
        check('pagehide-sidebar-cleanup-and-detached-map-click-no-callback')
        result['status']='PASS'
    except Exception as e:
        result['status']='FAIL';result['failure']=str(e)
        page.screenshot(path=str(out/'failure.png'))
        raise
    finally:
        (out/'results.json').write_text(json.dumps(result,indent=2)+'\n');browser.close()
