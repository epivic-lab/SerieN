"""Phase 2 acceptance against npm start; Python Playwright + Chromium required."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

out=Path('docs/phase-2');out.mkdir(exist_ok=True)
base=os.environ.get('SERIEN_URL','http://127.0.0.1:8000/')
previous=json.loads(Path('docs/phase-1/browser-result.json').read_text())
capture=os.environ.get('SERIEN_CAPTURE','1')!='0'
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':650,'height':900},locale='en-GB');errors=[]
    page.set_default_timeout(90000)
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
    page.add_init_script("const get=HTMLCanvasElement.prototype.getContext;window.__webglContexts=new Set();HTMLCanvasElement.prototype.getContext=function(type,...args){const ctx=get.call(this,type,...args);if(ctx&&String(type).includes('webgl'))__webglContexts.add(ctx);return ctx;}")
    page.goto(base+'?diagnostics=1',wait_until='domcontentloaded')
    page.wait_for_function('window.__serienDiagnostics!==undefined',timeout=120000)
    print('Loaded real scene',flush=True)
    page.evaluate("document.getElementById('pause').click();document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'))")
    page.wait_for_function("[...document.querySelectorAll('.locomotiveThumbnail')].every(i=>i.complete&&i.naturalWidth===320)",timeout=60000)
    result={'result':'RUNNING','sizes':{},'hover':[]}
    for w,h,label in [(1690,914,'user-viewport'),(1440,1000,'desktop'),(1024,900,'tablet'),(768,1024,'tablet-portrait'),(390,844,'phone')]:
        page.set_viewport_size({'width':w,'height':h})
        page.wait_for_function('Math.abs(__serienDiagnostics.snapshot().camera.aspect-document.querySelector("#view3d").clientWidth/document.querySelector("#view3d").clientHeight)<.001')
        size=page.evaluate('''()=>{
          const box=e=>{const b=e.getBoundingClientRect();return {left:b.left,right:b.right,center:b.top+b.height/2,width:b.width,height:b.height};};
          const state=__serienDiagnostics.snapshot();
          return {desk:box(document.querySelector('.console')).height,overflow:document.documentElement.scrollWidth>innerWidth,camera:state.camera,render:state.render,visuals:[...document.querySelectorAll('.trainConsole')].map(c=>({fields:[...c.querySelector('.trainConsoleHeading').children].map(box),map:box(c.querySelector('.railwayMiniMap')),scale:c.querySelector('.railwayMiniMap use').getScreenCTM().a,marker:[+c.querySelector('.trainMapMarker').getAttribute('cx'),+c.querySelector('.trainMapMarker').getAttribute('cy')],actual:state.stock[+c.dataset.consoleTrain].vehicles[0],commands:[...c.querySelectorAll('[data-command]')].map(box)}))};
        }''')
        old=183 if label=='user-viewport' else previous['sizes'][label+'-3']['console']
        assert size['desk']==old,(label,'desk height changed',size['desk'],old)
        assert not size['overflow'],label
        assert all(abs(axis)<1 for point in size['camera']['projectedBase'] for axis in point[:2]),(label,'table clipped',size['camera'])
        for v in size['visuals']:
            assert max(f['center'] for f in v['fields'])-min(f['center'] for f in v['fields'])<1,(label,'fields not in one row',v)
            assert all(a['right']<=b['left']+1 for a,b in zip(v['fields'],v['fields'][1:])),(label,'overlapping fields',v)
            assert v['map']['height']==66,(label,'map height')
            assert abs(v['marker'][0]-v['actual']['x'])<1e-8 and abs(v['marker'][1]-v['actual']['z'])<1e-8,'real marker'
            assert len(v['commands'])==5 and all(b['height']>=34 for b in v['commands']),'commands retained'
        result['sizes'][label]=size
        (out/'browser-result.json').write_text(json.dumps(result,indent=2)+'\n')
        if capture and label in ['user-viewport','tablet-portrait','phone']:page.screenshot(path=str(out/('after-overview.png' if label=='user-viewport' else label+'.png')),timeout=90000)
        print(label,'PASS, desk',size['desk'],'map 66; entire table inside frame',flush=True)
    page.set_viewport_size({'width':1690,'height':914})
    page.evaluate("document.getElementById('viewHome').click()")
    rectangles=page.evaluate("[...document.querySelectorAll('[data-switch-hover]')].map(e=>{const b=e.getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2}})")
    # Native mouse events on all eight controls, including a disabled occupied WX.
    initial=page.evaluate('__serienDiagnostics.indicatorState().states.map(s=>s.on)')
    for i in range(8):
        rectangle=rectangles[i]
        page.mouse.move(rectangle['x'],rectangle['y'])
        hover=page.evaluate('''i=>{const state=__serienDiagnostics.indicatorState(),button=document.querySelector('[data-switch="'+i+'"]');return {i,id:state.active,disabled:button.disabled,states:state.states};}''',i)
        assert hover['id']==hover['states'][i]['id'],hover
        assert [s['on'] for s in hover['states']]==initial,'hover actuated switch'
        assert hover['states'] and page.evaluate('__serienDiagnostics.indicatorState().markers')==0,'artificial indicators remain'
        result['hover'].append(hover)
    assert any(h['disabled'] for h in result['hover']),'occupied switch hover not tested'
    # Check immediate shared identification in the same event turn (no dependence on GPU FPS).
    feedback=page.evaluate('''()=>{
      const cell=document.querySelector('[data-switch-hover="0"]'),button=cell.querySelector('button'),api=__serienDiagnostics;
      cell.dispatchEvent(new PointerEvent('pointerleave',{pointerType:'mouse'}));cell.dispatchEvent(new PointerEvent('pointerenter',{pointerType:'mouse'}));
      const identified=api.indicatorState();document.querySelector('[data-train="1"]').click();const stable=button===cell.querySelector('button')&&cell===document.querySelector('[data-switch-hover="0"]');
      cell.dispatchEvent(new PointerEvent('pointerleave',{pointerType:'mouse'}));const leave=api.indicatorState();
      cell.dispatchEvent(new PointerEvent('pointerenter',{pointerType:'touch'}));const touch=api.indicatorState();
      return {identified,stable,leave,touch};
    }''')
    assert feedback['identified']['active']=='WX-A' and feedback['identified']['markers']==0,feedback
    assert feedback['stable'],'UI replaced hovered control'
    assert feedback['leave']['active'] is None,'leave did not restore indicators'
    assert feedback['touch']['active'] is None,'touch latched hover'
    page.mouse.move(1000,90)
    assert page.evaluate('__serienDiagnostics.indicatorState().active') is None
    result['feedback']=feedback
    (out/'browser-result.json').write_text(json.dumps(result,indent=2)+'\n')
    print('PASS: all eight real hover targets, occupied control, shared identification, restoration, stable DOM, no switch actuation',flush=True)
    operations=page.evaluate('''()=>{
      const $=s=>document.querySelector(s),api=__serienDiagnostics,check=(ok,msg)=>{if(!ok)throw Error(msg)},select=id=>$('[data-train="'+id+'"]').click();
      const markers=()=>{const state=api.snapshot();for(const c of document.querySelectorAll('.trainConsole')){const v=state.stock[+c.dataset.consoleTrain].vehicles[0],m=c.querySelector('.trainMapMarker');check(Math.abs(+m.getAttribute('cx')-v.x)<1e-8&&Math.abs(+m.getAttribute('cy')-v.z)<1e-8,'marker lost real position');}};
      for(const id of [0,1,2]){select(id);$('#speed').value=20+id*10;$('#speed').dispatchEvent(new Event('input'));}api.step(1);markers();check(api.snapshot().stock.map(t=>t.speed).join(',')==='20,30,40','independent speeds');
      select(0);$('#stop').click();$('#reverse').click();api.step(.2);markers();check(api.snapshot().stock[0].dir===-1,'reverse');
      $('#uncouple').click();check(api.snapshot().stock[0].cars.length===2,'uncouple');$('#couple').click();check(api.snapshot().stock[0].cars.length===3,'couple');$('#lights').click();
      $('#speed').value=22;$('#speed').dispatchEvent(new Event('input'));select(1);select(2);$('#addTrain').click();const before=api.snapshot();check(!before.consoles.visible.includes(0),'MRU replacement');api.step(1);const after=api.snapshot();check(after.stock[0].journey.travel!==before.stock[0].journey.travel,'hidden train stopped');markers();
      $('#stopAll').click();check(api.snapshot().stock.every(t=>t.speed===0&&t.velocity===0),'global stop');
      $('.trainConsole.is-active .railwayMiniMap').click();check(api.snapshot().camera.preset==='manual','map focus');$('#viewHome').click();
      check(!api.snapshot().scenery.tunnel,'tunnel introduced');check(__webglContexts.size===1,'extra WebGL renderer');
      return {independentSpeeds:true,reverse:true,coupling:true,realMapMarkers:true,hiddenTrainContinues:true,stopAll:true,mapFocus:true,tunnels:false,webglContexts:__webglContexts.size};
    }''')
    result['operations']=operations
    (out/'browser-result.json').write_text(json.dumps(result,indent=2)+'\n')
    print('PASS: desk controls, reverse, real positions, MRU hidden train, STOP ALL and map focus',flush=True)
    # Render High at a modest viewport for software WebGL; capture real daytime/night.
    page.set_viewport_size({'width':1100,'height':900})
    page.evaluate("document.getElementById('quality').value='high';document.getElementById('quality').dispatchEvent(new Event('change'))")
    page.wait_for_function("__serienDiagnostics.snapshot().quality.profile==='high'",timeout=90000)
    page.wait_for_timeout(500)
    page.screenshot(path=str(out/'high-day.png'),timeout=120000)
    result['high']=page.evaluate('__serienDiagnostics.snapshot().render')
    page.evaluate("document.getElementById('day').value=100;document.getElementById('day').dispatchEvent(new Event('input'))")
    page.screenshot(path=str(out/'high-night.png'),timeout=120000)
    print('PASS: High/day and High/night rendered',flush=True)
    page.close()
    context=browser.new_context(viewport={'width':650,'height':900},has_touch=True,is_mobile=True,device_scale_factor=1)
    touch=context.new_page();touch.on('pageerror',lambda e:errors.append(str(e)))
    touch.goto(base+'?diagnostics=1',wait_until='domcontentloaded');touch.wait_for_function('window.__serienDiagnostics!==undefined',timeout=120000)
    touch.evaluate("document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'));document.getElementById('pause').click()")
    touch.set_viewport_size({'width':768,'height':1024})
    result['touch']=touch.evaluate("({desk:document.querySelector('.console').getBoundingClientRect().height,map:document.querySelector('.railwayMiniMap').getBoundingClientRect().height,coarse:matchMedia('(pointer:coarse)').matches,buttons:[...document.querySelectorAll('.trainConsoleCommands button')].map(b=>b.getBoundingClientRect().height)})")
    assert result['touch']['desk']==previous['touchEmulation']['height'] and result['touch']['map']==66 and min(result['touch']['buttons'])>=40,result['touch']
    result['errors']=errors;assert not errors,errors
    result['result']='PASS'
    result['performanceNote']='Chromium/SwiftShader; GPU timing and physical tablet performance are not measured.'
    (out/'browser-result.json').write_text(json.dumps(result,indent=2)+'\n')
    browser.close();print('Phase 2 PASS: unchanged desk height, larger maps, uncropped table, safe hover, graphics and touch CSS',flush=True)
