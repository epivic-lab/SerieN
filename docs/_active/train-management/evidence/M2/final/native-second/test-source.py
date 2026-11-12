"""M2-RUNTIME: production minified bundle, continuous native RAF, no simulation stepping.
A scratch HTML harness reuses index.html's simulator DOM; authentication is
outside this runtime test and its source is neither loaded nor modified.
"""
import hashlib
import json
import os
import re
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

out=Path(os.environ.get('M2_RUNTIME_OUTPUT','work/m2-runtime'));out.mkdir(parents=True,exist_ok=True)
base=os.environ.get('SERIEN_URL','http://127.0.0.1:8000/')
html=Path('index.html').read_text()
html,n=re.subn(r'<script type="module">\s*import\("\./auth-gate\.js\?v=1"\).*?</script>', '<script type="module" src="./dist/game.js"></script>',html,flags=re.S)
assert n==1,'Auth module boundary changed: review harness before testing'
html=html.replace('<head>','<head><base href="'+base+'">',1).replace('<body class="auth-locked">','<body>',1).replace('<section id="authGate"','<section hidden id="authGate"',1)
Path('work/m2-runtime-runtime.html').write_text(html)
result={'testedHead':os.popen('git rev-parse HEAD').read().strip(),'bundleSHA256':hashlib.sha256(Path('dist/game.js').read_bytes()).hexdigest(),'harness':'index.html simulator DOM, auth not loaded; original production bundle served without route interception','profile':'low','rafInterception':False,'manualSimulationSteps':False,'checks':{},'checkpoints':[],'pageErrors':[],'consoleErrors':[],'failedRequests':[],'httpFailures':[]}

previous_path=os.environ.get('M2_RUNTIME_RESUME_FROM')
if previous_path:
    previous=json.loads(Path(previous_path).read_text())
    assert previous['bundleSHA256']==result['bundleSHA256']
    required=['openCloseThreeMoving','continuousSceneChanged','selectionSideConsoleScene','desktopZoomScrollFit','focus3D']
    assert all(previous['checks'].get(key,'').startswith('PASS') for key in required), 'Resume requires recorded successful checks on the same bundle'
    result['priorSession']={'path':previous_path,'bundleSHA256':previous['bundleSHA256'],'provenChecks':required}
    result['checks'].update({key:value for key,value in previous['checks'].items() if value.startswith('PASS')})

def save(): (out/'result.json').write_text(json.dumps(result,indent=2)+'\n')

def percent(values,p):
    if not values:return None
    return sorted(values)[min(len(values)-1,round((len(values)-1)*p))]

with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    result['browserVersion']=browser.version
    page=browser.new_page(viewport={'width':650 if previous_path else 1280,'height':800 if previous_path else 1000},device_scale_factor=1)
    page.set_default_timeout(90000)
    viewport=page.locator('.sideViewport')
    page.on('pageerror',lambda e:result['pageErrors'].append(str(e)))
    page.on('console',lambda m:result['consoleErrors'].append(m.text) if m.type=='error' else None)
    page.on('requestfailed',lambda r:result['failedRequests'].append({'url':r.url,'error':r.failure}))
    page.on('response',lambda r:result['httpFailures'].append({'url':r.url,'status':r.status}) if r.status>=400 else None)
    # Keep the genuine function identity. No RAF, cancelRAF, tick, renderer or
    # timing API is replaced. This listener uses the existing quality control.
    page.add_init_script("""window.__runtimeNativeRAF=window.requestAnimationFrame;
    document.addEventListener('DOMContentLoaded',()=>{const quality=document.getElementById('quality');quality.value='low';quality.dispatchEvent(new Event('change'));},{once:true});""")
    cdp=page.context.new_cdp_session(page);cdp.send('Performance.enable')
    def checkpoint(name):
        state=page.evaluate("""()=>{const s=__serienDiagnostics.snapshot();return {nativeRAF:window.requestAnimationFrame===window.__runtimeNativeRAF&&requestAnimationFrame.toString().includes('[native code]'),hidden:document.hidden,phase:window.__runtime?.phase,frameObservations:window.__runtime?.frames.length,stock:s.stock.map(t=>({id:t.id,speed:t.speed,velocity:t.velocity,travel:t.journey.travel,position:t.journey.position,vehicles:t.vehicles.map(v=>({x:v.x,z:v.z,rendered:v.rendered})),layout:t.layout})),active:s.consoles.active,render:s.render,camera:s.camera,sideIds:[...document.querySelectorAll('.sideStage image')].map(n=>n.dataset.sideVehicle),railway:__serienDiagnostics.railwayState()};}""")
        assert state['nativeRAF'] and not state['hidden'],name
        state['name']=name;state['metrics']={m['name']:m['value'] for m in cdp.send('Performance.getMetrics')['metrics'] if m['name'] in ['JSHeapUsedSize','JSHeapTotalSize','TaskDuration','ScriptDuration','LayoutDuration','LayoutCount','Nodes','Documents']}
        result['checkpoints'].append(state);save();return state
    def phase(name):page.evaluate('(name)=>{__runtime.phase=name;}',name)
    def sample(seconds):page.wait_for_timeout(seconds*1000)
    def moving(state,count=3):assert sum(t['velocity']>.1 for t in state['stock'])==count,state['name']
    def selected_consistent():
        return page.evaluate("""()=>{const check=(ok,m)=>{if(!ok)throw Error(m)},api=__serienDiagnostics,s=api.snapshot(),id=s.consoles.active,t=s.stock[id],images=[...document.querySelectorAll('.sideStage image')],ids=api.railwayState().identities.trains[id];check(JSON.stringify(images.map(n=>n.dataset.sideVehicle))===JSON.stringify(ids),'side / railway identity');check(document.querySelector('.trainConsole.is-active').dataset.consoleTrain===String(id),'console selection');check(document.querySelector('[data-composition="'+id+'"]').getAttribute('aria-pressed')==='true','composition selection');check(document.querySelector('[data-consist]').dataset.consist===String(id),'textual detail');for(let i=0;i<images.length;i++)check(Math.abs(+images[i].dataset.offsetMm-t.layout.offsets[i])<1e-8,'side layout spacing');for(const train of s.stock){for(const v of train.vehicles)check(Math.hypot(v.x-v.rendered.x,v.z-v.rendered.z)<1e-8,'3D pose / railway');const card=document.querySelector('[data-console-train="'+train.id+'"]');if(card){const m=card.querySelector('.trainMapMarker');check(Math.abs(+m.getAttribute('cx')-train.vehicles[0].x)<1e-8&&Math.abs(+m.getAttribute('cy')-train.vehicles[0].z)<1e-8,'console minimap / scene');}}return {active:id,vehicles:ids.length,length:t.layout.tail+t.vehicles[0].couplers.front.x};}""")
    try:
        page.goto(base+'work/m2-runtime-runtime.html?diagnostics=1',wait_until='domcontentloaded',timeout=120000)
        page.wait_for_function('window.__serienDiagnostics!==undefined',timeout=120000)
        if previous_path:page.set_viewport_size({'width':1024,'height':768})
        result['servedBundleSHA256']=hashlib.sha256(page.request.get(base+'dist/game.js').body()).hexdigest()
        assert result['servedBundleSHA256']==result['bundleSHA256']
        result['webgl']=page.evaluate("""()=>{const gl=document.querySelector('#view3d>canvas').getContext('webgl2'),info=gl.getExtension('WEBGL_debug_renderer_info');return {renderer:gl.getParameter(info?info.UNMASKED_RENDERER_WEBGL:gl.RENDERER),vendor:gl.getParameter(info?info.UNMASKED_VENDOR_WEBGL:gl.VENDOR),version:gl.getParameter(gl.VERSION)};}""")
        result['physicalGPUVerified']=not any(word in result['webgl']['renderer'].lower() for word in ['swiftshader','llvmpipe','software'])
        page.evaluate("""()=>{window.__runtime={phase:'warmup',frames:[],longTasks:[],start:performance.now()};const r=__runtime;function observe(timestamp){r.frames.push({at:timestamp,phase:r.phase});requestAnimationFrame(observe);}requestAnimationFrame(observe);new PerformanceObserver(list=>{for(const e of list.getEntries())r.longTasks.push({start:e.startTime,duration:e.duration,phase:r.phase});}).observe({type:'longtask',buffered:true});}""")
        for train_id,value in [(0,25),(1,30),(2,20)]:
            page.locator('[data-console-train="'+str(train_id)+'"] input').evaluate('(e,v)=>{e.value=String(v);e.dispatchEvent(new Event("input",{bubbles:true}));}',value)
        page.wait_for_function('__serienDiagnostics.snapshot().stock.every(t=>t.velocity>.1)',timeout=60000)
        phase('closed-three-moving');sample(8)
        initial=checkpoint('three-moving-before-management');moving(initial)
        if not previous_path:
            page.screenshot(path=str(out/'scene-before.png'),clip=page.locator('#view3d>canvas').bounding_box(),timeout=120000)
            for cycle in range(3):
                page.locator('#trainManagement').click();phase('open-three-moving-'+str(cycle));sample(5)
                current=checkpoint('open-cycle-'+str(cycle));moving(current);selected_consistent()
                assert all(t['travel']>initial['stock'][i]['travel'] for i,t in enumerate(current['stock']))
                if cycle==0:page.screenshot(path=str(out/'desktop-three-moving.png'))
                page.locator('dialog [data-close]').click();phase('closed-three-moving-'+str(cycle));sample(3)
                current=checkpoint('closed-cycle-'+str(cycle));moving(current)
                assert page.locator('#trainManagement').evaluate('(b)=>document.activeElement===b')
            result['checks']['openCloseThreeMoving']='PASS: 3 cycles, all three continued advancing'
            page.screenshot(path=str(out/'scene-after.png'),clip=page.locator('#view3d>canvas').bounding_box(),timeout=120000)
            assert hashlib.sha256((out/'scene-before.png').read_bytes()).digest()!=hashlib.sha256((out/'scene-after.png').read_bytes()).digest()
            result['checks']['continuousSceneChanged']='PASS'
            page.locator('#trainManagement').click();phase('selection-and-desktop-controls')
            for train_id in [0,1,2,0]:
                page.locator('[data-composition="'+str(train_id)+'"]').click();sample(.5);result['lastSelection']=selected_consistent()
            result['checks']['selectionSideConsoleScene']='PASS'
            page.locator('.sideToolbar input').evaluate('(e)=>{e.value="4";e.dispatchEvent(new Event("input",{bubbles:true}));}')
            viewport=page.locator('.sideViewport');viewport.evaluate('(v)=>{v.scrollLeft=v.scrollWidth;}')
            assert viewport.evaluate('(v)=>v.scrollWidth>v.clientWidth&&v.scrollLeft>0')
            page.locator('[data-fit]').click()
            page.wait_for_function("document.querySelector('.sideViewport').scrollWidth<=document.querySelector('.sideViewport').clientWidth+1&&document.querySelector('.sideViewport').scrollLeft===0")
            result['checks']['desktopZoomScrollFit']='PASS'
            page.get_by_role('button',name='Focus in 3D').click();sample(2)
            assert page.evaluate('__serienDiagnostics.snapshot().camera.preset')=='manual'
            result['checks']['focus3D']='PASS'
        if 'projectEditorThreeMoving' not in result['checks']:
            page.locator('#trainManagement').click();page.locator('[data-view="layout"]').click();page.locator('[data-composition="0"]').click()
            before_editor=checkpoint('before-project-editor');moving(before_editor)
            page.locator('[data-copy-train="0"]').click();phase('project-editor-three-moving')
            assert page.locator('[data-comparison="matching"]').count()==1
            planned=page.locator('[data-planned-vehicle]').evaluate_all('(nodes)=>nodes.map(n=>n.dataset.plannedVehicle)')
            assert not set(planned)&set(before_editor['railway']['identities']['trains'][0])
            page.get_by_label('Project name',exact=True).fill('Moving fleet project')
            page.locator('[data-project-action="flip-'+planned[0]+'"]').click()
            assert page.locator('[data-comparison="different"]').count()==1
            page.locator('[data-project-action="confirm"]').click();sample(5)
            current=checkpoint('confirmed-project-three-moving');moving(current)
            assert current['railway']['identities']==before_editor['railway']['identities']
            assert all(t['travel']>before_editor['stock'][i]['travel'] for i,t in enumerate(current['stock']))
            # These are the existing R1 buttons; both commands must be refused in motion.
            page.evaluate("document.querySelector('[data-console-train=\"0\"] [data-command=\"uncouple\"]').click();document.querySelector('[data-console-train=\"0\"] [data-command=\"couple\"]').click()")
            guarded=checkpoint('moving-coupling-commands-refused');moving(guarded)
            assert guarded['railway']['identities']==before_editor['railway']['identities']
            assert 'Stop the train' in page.locator('#log').inner_text()
            assert 'Stop the train' in page.locator('.projectComparison').inner_text()
            page.get_by_role('button',name='Edit project',exact=True).click()
            page.locator('[data-project-action="flip-'+planned[0]+'"]').click();page.locator('[data-project-action="confirm"]').click()
            assert page.locator('[data-comparison="matching"]').count()==1
            page.locator('.projectEditor').evaluate('(e)=>e.scrollIntoView({block:"start"})');page.screenshot(path=str(out/'project-editor-three-moving.png'))
            result['checks']['projectEditorThreeMoving']='PASS: copy, edit, planned flip, confirm and re-edit while all three advance; physical identities unchanged'
            result['checks']['movingCoupleUncoupleRefused']='PASS: both actual R1 commands refused while moving; editor reports stop requirement'
            page.locator('[data-view="layout"]').click();selected_consistent();page.locator('dialog [data-close]').click()
        if 'liveUncoupleRecouple' not in result['checks']:
            # Stop just one train using its real console; the other two keep moving.
            page.locator('[data-console-train="0"] [data-command="stop"]').click()
            page.locator('#trainManagement').click();phase('coupling-two-moving')
            original_ids=page.locator('.sideStage image').evaluate_all('(nodes)=>nodes.map(n=>n.dataset.sideVehicle)')
            # An existing command can update the open read-only dialog. We send the
            # ordinary button event; no direct fleet mutation or simulation step.
            page.evaluate("document.querySelector('[data-console-train=\"0\"] [data-command=\"uncouple\"]').click()")
            page.wait_for_function('(count)=>document.querySelectorAll(".sideStage image").length===count',arg=len(original_ids)-1)
            selected_consistent();moving(checkpoint('after-uncouple'),2)
            assert page.locator('[data-detached-id]').get_attribute('data-detached-id')==original_ids[-1]
            page.evaluate("document.querySelector('[data-console-train=\"0\"] [data-command=\"couple\"]').click()")
            page.wait_for_function('(count)=>document.querySelectorAll(".sideStage image").length===count',arg=len(original_ids))
            assert page.locator('.sideStage image').evaluate_all('(nodes)=>nodes.map(n=>n.dataset.sideVehicle)')==original_ids
            selected_consistent();moving(checkpoint('after-recouple'),2)
            assert page.locator('[data-detached-id]').count()==0
            result['checks']['liveUncoupleRecouple']='PASS: actual commands, dialog open, other two moving'
            page.locator('dialog [data-close]').click()
        page.locator('[data-console-train="0"] input').evaluate('(e)=>{e.value="25";e.dispatchEvent(new Event("input",{bubbles:true}));}')
        page.wait_for_function('__serienDiagnostics.snapshot().stock.every(t=>t.velocity>.1)')
        page.locator('#trainManagement').click();phase('tablet-three-moving')
        cdp.send('Emulation.setTouchEmulationEnabled',{'enabled':True,'maxTouchPoints':5})
        for width,height,label in [(1024,768,'tablet-landscape'),(768,1024,'tablet-portrait')]:
            page.set_viewport_size({'width':width,'height':height});sample(4)
            page.evaluate("document.querySelector('dialog').scrollTop=0")
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            assert page.locator('dialog').evaluate('(d)=>d.scrollWidth<=d.clientWidth')
            page.locator('[data-zoom="in"]').click()
            box=viewport.bounding_box();x=box['x']+box['width']*.8;y=box['y']+min(70,box['height']/2)
            cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
            for offset in [40,80,120,160,200]:cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x-offset,'y':y}]})
            cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
            page.wait_for_function("document.querySelector('.sideViewport').scrollLeft>0")
            fit=page.locator('[data-fit]').bounding_box();fx=fit['x']+fit['width']/2;fy=fit['y']+fit['height']/2
            cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':fx,'y':fy}]})
            cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
            page.wait_for_function("document.querySelector('.sideToolbar output').textContent==='100%'&&document.querySelector('.sideViewport').scrollWidth<=document.querySelector('.sideViewport').clientWidth+1&&document.querySelector('.sideViewport').scrollLeft===0")
            sample(.5)
            assert viewport.evaluate('(v)=>v.scrollWidth<=v.clientWidth+1&&v.scrollLeft===0')
            selected_consistent();moving(checkpoint(label));page.screenshot(path=str(out/(label+'.png')))
        result['checks']['tabletZoomScrollFit']='PASS: landscape and portrait during movement, native CDP touch swipe and Fit'
        page.locator('[data-view="catalog"]').click();sample(2)
        assert page.locator('.managementModel').count()==14
        page.locator('[data-view="layout"]').click();selected_consistent()
        result['checks']['catalogWhileMoving']='PASS: 14 models, return to current composition'
        page.locator('dialog [data-close]').click();phase('final-three-moving');sample(8)
        final=checkpoint('final');moving(final)
        assert final['frameObservations']>initial['frameObservations']
        assert page.evaluate('window.requestAnimationFrame===window.__runtimeNativeRAF')
        assert not result['pageErrors'] and not result['consoleErrors'] and not result['failedRequests'] and not result['httpFailures']
        result['checks']['errorsAndRequests']='PASS'
        result['checks']['nativeContinuousRAF']='PASS'
        result['status']='M2-RUNTIME PASS' if result['physicalGPUVerified'] else 'M2-RUNTIME PASS CON LIMITI'
    except Exception as error:
        result['status']='M2-RUNTIME BLOCKED';result['failure']=str(error)
        try:page.screenshot(path=str(out/'failure.png'),timeout=15000)
        except Exception:pass
    finally:
        try:
            result['finalRuntimeState']=page.evaluate("()=>({nativeRAF:requestAnimationFrame===window.__runtimeNativeRAF,contextLost:document.querySelector('#view3d>canvas').getContext('webgl2').isContextLost(),quality:window.__serienDiagnostics?.snapshot().quality})")
            observations=page.evaluate('window.__runtime??null')
            if observations:
                (out/'frame-observations.json').write_text(json.dumps(observations,indent=2)+'\n')
                frames=observations['frames'];stats={}
                for name in sorted(set(f['phase'] for f in frames)):
                    group=[f['at'] for f in frames if f['phase']==name];intervals=[group[i]-group[i-1] for i in range(1,len(group))]
                    stats[name]={'frames':len(group),'durationMs':group[-1]-group[0] if group else 0,'fps':1000*(len(group)-1)/(group[-1]-group[0]) if len(group)>1 else None,'p50Ms':percent(intervals,.5),'p95Ms':percent(intervals,.95),'maxMs':max(intervals) if intervals else None}
                result['frameStats']=stats;result['longTasksCount']=len(observations['longTasks'])
        except Exception as error:result['measurementFailure']=str(error)
        save();browser.close()
    print(json.dumps({'status':result.get('status'),'failure':result.get('failure'),'webgl':result.get('webgl'),'checks':result['checks'],'frameStats':result.get('frameStats')},indent=2),flush=True)

if result.get('status')=='M2-RUNTIME BLOCKED':
    raise SystemExit(1)
