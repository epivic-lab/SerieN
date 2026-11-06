"""M1.1 side-view checks against the production bundle; local auth/render fixture."""
import json
import os
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright

out=Path(os.environ.get('M11_OUTPUT','work/m11-browser'));out.mkdir(parents=True,exist_ok=True)
base=os.environ.get('SERIEN_URL','http://127.0.0.1:8000/')
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1440,'height':1200});errors=[];failed=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('response',lambda r:failed.append(r.url) if r.status>=400 else None)
    page.route('**/auth-gate.js*',lambda r:r.fulfill(content_type='text/javascript',body="document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;await import('./dist/game.js');"))
    page.add_init_script("""const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>{if(cb.toString().includes('requestAnimationFrame')&&cb.toString().includes('.render(')){window.__sideFrame=cb;return 1;}return raf(cb);};
    const get=HTMLCanvasElement.prototype.getContext;window.__contexts=new Set();HTMLCanvasElement.prototype.getContext=function(type,...args){const context=get.call(this,type,...args);if(context&&String(type).includes('webgl'))window.__contexts.add(context);return context;};""")
    page.goto(base+'?diagnostics=1',wait_until='domcontentloaded')
    page.wait_for_function('Boolean(window.__serienDiagnostics&&window.__sideFrame)',timeout=90000)
    page.evaluate("document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'));document.getElementById('pause').click();__sideFrame(performance.now())")
    page.locator('#trainManagement').click()
    page.wait_for_selector('.sideStage image')
    def ready(target=page):
        target.evaluate("""async()=>{await Promise.all([...document.querySelectorAll('.sideStage image')].map(node=>new Promise((resolve,reject)=>{const image=new Image();image.onload=resolve;image.onerror=reject;image.src=node.getAttribute('href');})));}""")
    ready()
    result=page.evaluate("""()=>{
      const check=(value,msg)=>{if(!value)throw Error(msg)},api=__serienDiagnostics,state=api.snapshot(),t=state.stock[0],images=[...document.querySelectorAll('.sideStage image')];
      check(images.length===4,'locomotive and three wagons');
      check(JSON.stringify(images.map(n=>n.dataset.sideVehicle))===JSON.stringify(api.railwayState().identities.trains[0]),'real ordered identities');
      for(let i=0;i<images.length;i++)check(Math.abs(Number(images[i].dataset.originMm)-(t.vehicles[0].couplers.front.x+t.layout.offsets[i]))<1e-8,'actual layout origin '+i);
      const matrices=images.map(n=>n.getScreenCTM());check(matrices.every(m=>Math.abs(m.a-matrices[0].a)<1e-8&&Math.abs(m.d-m.a)<1e-8),'one uniform scale');
      check(window.__contexts.size===1,'only existing renderer');
      check(document.querySelector('.managementDetail ol').compareDocumentPosition(document.querySelector('.trainSideView'))&Node.DOCUMENT_POSITION_PRECEDING,'text remains below the graphic');
      window.__sideImage=images[0];window.__sideSvg=document.querySelector('.sideStage svg');
      return {vehicles:images.map(n=>n.dataset.sideKey),origins:images.map(n=>Number(n.dataset.originMm)),totalLength:t.layout.tail+t.vehicles[0].couplers.front.x,contexts:window.__contexts.size};
    }""")
    page.screenshot(path=str(out/'desktop-complete-four-vehicles.png'))
    before=page.evaluate('__serienDiagnostics.railwayState()')
    page.locator('[data-zoom="in"]').click()
    page.locator('.sideToolbar input').fill('4')
    page.locator('.sideToolbar input').dispatch_event('input')
    page.locator('.sideViewport').evaluate('(v)=>{v.scrollLeft=v.scrollWidth;}')
    assert page.locator('.sideViewport').evaluate('(v)=>v.scrollLeft>0')
    page.screenshot(path=str(out/'desktop-zoom-scroll.png'))
    page.locator('[data-fit]').click()
    assert page.locator('.sideToolbar output').inner_text()=='100%'
    assert page.locator('.sideViewport').evaluate('(v)=>v.scrollWidth<=v.clientWidth+1&&v.scrollLeft===0')
    assert page.evaluate('__serienDiagnostics.railwayState()')==before
    # Real existing commands, delivered while the consultation dialog stays open.
    ids=page.locator('.sideStage image').evaluate_all('(nodes)=>nodes.map(n=>n.dataset.sideVehicle)')
    page.evaluate("document.getElementById('reverse').click()")
    assert page.locator('.sideStage image').evaluate_all('(nodes)=>nodes.map(n=>n.dataset.sideVehicle)')==ids
    assert page.evaluate('window.__sideImage===document.querySelector(".sideStage image")&&window.__sideSvg===document.querySelector(".sideStage svg")')
    page.evaluate("document.getElementById('uncouple').click()")
    assert page.locator('.sideStage image').count()==3
    page.evaluate("document.getElementById('couple').click()")
    assert page.locator('.sideStage image').evaluate_all('(nodes)=>nodes.map(n=>n.dataset.sideVehicle)')==ids
    page.evaluate("window.__sideSvg=document.querySelector('.sideStage svg');for(let i=0;i<3;i++)__sideFrame(performance.now()+1000*i)")
    assert page.evaluate('window.__sideSvg===document.querySelector(".sideStage svg")')
    for width,height,name in [(1024,768,'tablet-landscape'),(768,1024,'tablet-portrait')]:
        page.set_viewport_size({'width':width,'height':height})
        page.evaluate("__sideFrame(performance.now());document.querySelector('dialog').scrollTop=0")
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        assert page.locator('dialog').evaluate('(d)=>d.scrollWidth<=d.clientWidth')
        assert page.locator('.sideViewport').evaluate('(v)=>v.scrollWidth<=v.clientWidth+1')
        page.screenshot(path=str(out/(name+'.png')))
    page.evaluate("document.getElementById('rollingModels').value='kenney';document.getElementById('rollingModels').dispatchEvent(new Event('change'))")
    page.wait_for_function("[...document.querySelectorAll('.sideStage image')].length===4&&[...document.querySelectorAll('.sideStage image')].every(n=>n.dataset.sideKey.startsWith('kenney-'))")
    ready()
    page.screenshot(path=str(out/'tablet-kenney-complete.png'))
    result['kenneyVehicles']=page.locator('.sideStage image').evaluate_all('(nodes)=>nodes.map(n=>n.dataset.sideKey)')
    page.locator('dialog [data-close]').click()
    assert page.locator('#trainManagement').evaluate('(b)=>document.activeElement===b')
    # A separate pure UI fixture stresses six long vehicles, with no simulator mutation.
    entry=Path('work/long-side-entry.js')
    entry.write_text("""import {createTrainSideView} from '../src/train-side-view.js';
import manifest from '../assets/rolling-stock-sides/manifest.json' with {type:'json'};
const keys=['native-steam',...Array(5).fill('native-coach')];
const groups=keys.map((key,i)=>({uuid:'long-'+i,userData:{stock:{kind:key.split('-')[1]},couplers:manifest[key].couplers}}));
const view=createTrainSideView();const host=document.createElement('main');host.className='managementDetail';host.style.maxWidth='1000px';host.style.margin='20px auto';host.append(view.root);document.body.append(host);
view.update({id:'long',name:'Six-vehicle UI fixture',modelKey:'steam',group:groups[0],carObjs:groups.slice(1)});window.__longSideReady=true;
""")
    subprocess.run(['node_modules/.bin/esbuild',str(entry),'--bundle','--format=esm','--outfile=work/long-side-bundle.js'],check=True)
    touch=browser.new_page(viewport={'width':1024,'height':768},has_touch=True)
    touch.on('pageerror',lambda e:errors.append(str(e)))
    touch.on('response',lambda r:failed.append(r.url) if r.status>=400 else None)
    touch.route('**/favicon.ico',lambda r:r.fulfill(status=204))
    touch.goto(base+'work/',wait_until='domcontentloaded')
    touch.evaluate("base=>{document.body.replaceChildren();const element=document.createElement('base');element.href=base;document.head.append(element);}",base)
    touch.add_style_tag(url=base+'style.css')
    touch.add_script_tag(url=base+'work/long-side-bundle.js',type='module')
    touch.wait_for_function('window.__longSideReady')
    ready(touch)
    assert touch.locator('.sideStage image').count()==6
    assert touch.locator('.sideViewport').evaluate('(v)=>v.scrollWidth<=v.clientWidth+1')
    touch.screenshot(path=str(out/'long-six-vehicle-fixture.png'))
    touch.locator('[data-zoom="in"]').tap()
    assert touch.locator('.sideViewport').evaluate('(v)=>v.scrollWidth>v.clientWidth')
    # CDP touch swipe of the same scrollable region.
    box=touch.locator('.sideViewport').bounding_box();x=box['x']+box['width']*.8;y=box['y']+70
    cdp=touch.context.new_cdp_session(touch)
    cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
    for step in range(1,7):cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x-step*50,'y':y}]})
    cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    touch.wait_for_function("document.querySelector('.sideViewport').scrollLeft>0")
    touch.locator('[data-fit]').tap()
    touch.wait_for_function("document.querySelector('.sideToolbar output').textContent==='100%'&&document.querySelector('.sideViewport').scrollWidth<=document.querySelector('.sideViewport').clientWidth+1&&document.querySelector('.sideViewport').scrollLeft===0",timeout=5000)
    assert not errors,errors
    assert not failed,failed
    result.update(result='PASS',productionBundle=True,checks=['real gapped coupler positions','common orthographic scale','order preserved on reverse','no graphic rebuild on frames/reverse','live uncouple/recouple','zoom/scroll/fit','six-vehicle long fixture','desktop/tablet','touch zoom/swipe/fit','one WebGL renderer','unchanged railway state when browsing'],pageErrors=errors,failedResponses=failed)
    (out/'browser.json').write_text(json.dumps(result,indent=2)+'\n')
    browser.close();print(json.dumps(result))
