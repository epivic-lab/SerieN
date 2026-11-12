"""G-U9 integrated UI acceptance. Production bundle, local Auth event boundary.
Deterministic RAF for DOM/visual checks only; native RAF has its own gate.
axe is a test-only external installation, never a project dependency or app asset.
"""
import hashlib,json,os
from pathlib import Path
from playwright.sync_api import sync_playwright

out=Path(os.environ.get('U9_OUTPUT','work/u9-browser'));out.mkdir(parents=True,exist_ok=True)
base=os.environ.get('SERIEN_URL','http://127.0.0.1:8035/')
viewports=[(1920,1080),(1440,900),(1280,800),(1024,768),(820,1180),(768,1024),(390,844)]
r={'status':'RUNNING','bundleSHA256':hashlib.sha256(Path('dist/game.js').read_bytes()).hexdigest(),'cssSHA256':hashlib.sha256(Path('ui/css/serien-ui-integration.css').read_bytes()).hexdigest(),'checks':[],'screenshots':[],'responsive':[],'accessibility':[],'errors':[],'external':[],'httpFailures':[]}
def save():(out/'results.json').write_text(json.dumps(r,indent=2)+'\n')
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 p=b.new_page(viewport={'width':1440,'height':900},has_touch=True);p.set_default_timeout(60000)
 p.on('pageerror',lambda e:r['errors'].append(str(e)))
 p.on('response',lambda q:r['httpFailures'].append([q.url,q.status]) if q.status>=400 else None)
 p.on('request',lambda q:r['external'].append(q.url) if q.url.startswith('http') and not q.url.startswith(base) else None)
 p.route('**/auth-gate.js*',lambda q:q.fulfill(content_type='text/javascript',body="document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;document.getElementById('signOut').hidden=false;await import('./dist/game.js');"))
 p.add_init_script("const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>{if(cb.toString().includes('requestAnimationFrame')&&cb.toString().includes('.render(')){window.__frame=cb;return 1;}return raf(cb);};")
 def js(s,a=None):return p.evaluate(s,a)
 def click(s):js('(s)=>document.querySelector(s).click()',s)
 def tab(n):click('[data-view="'+n+'"]')
 def pa(n):click('[data-project-action="'+n+'"]')
 def frame():js('__frame(performance.now())')
 def shot(n,selector=None,full=False):
  p.wait_for_timeout(80)
  if selector:p.locator(selector).first.evaluate('(e)=>e.scrollIntoView({block:"start"})')
  path=out/(n+'.png');p.screenshot(path=str(path),full_page=full);r['screenshots'].append({'file':path.name,'viewport':p.viewport_size,'state':n});save()
 def check(n):r['checks'].append(n);save();print('PASS '+n,flush=True)
 def a11y(state):
  duplicates=js('()=>{const ids=[...document.querySelectorAll("[id]")].map(e=>e.id);return ids.filter((id,i)=>ids.indexOf(id)!==i)}');assert not duplicates,duplicates
  result=js("async()=>{const a=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return {violations:a.violations.map(v=>({id:v.id,impact:v.impact,help:v.help,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),incomplete:a.incomplete.map(v=>({id:v.id,nodes:v.nodes.length}))}}")
  result['state']=state;result['duplicateIDs']=duplicates;r['accessibility'].append(result);save()
 def geometry(state,w,h):
  d=js('''()=>({bodyOverflow:document.documentElement.scrollWidth>innerWidth+1,dialogOverflow:!!document.querySelector('#tmD[open]')&&document.querySelector('#tmD').scrollWidth>document.querySelector('#tmD').clientWidth+1,targets:[...document.querySelectorAll('button,input,select,summary,a,[role=button]')].filter(e=>e.getClientRects().length&&!e.disabled&&(!document.querySelector('#tmD[open]')||e.closest('#tmD'))).filter(e=>{const r=e.getBoundingClientRect();return r.width<43.9||r.height<43.9}).map(e=>({tag:e.tagName,id:e.id,text:e.textContent.slice(0,60),width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}))})''')
  d.update({'state':state,'width':w,'height':h});r['responsive'].append(d);save();assert not d['bodyOverflow'] and not d['dialogOverflow'],d
  # Small map markers have identical actions on the adjacent 44px legend.
  assert all(x['tag']=='circle' for x in d['targets']),d['targets']
 try:
  p.goto(base+'?diagnostics=1');p.wait_for_function('Boolean(window.__serienDiagnostics&&window.__frame)')
  click('#pause');js("document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'))");frame();p.wait_for_load_state('networkidle');frame()
  p.add_script_tag(path=os.environ['U9_AXE']);r['axeVersion']=js('axe.version')
  # Regression for the real U9 defect: the two outputs must retain independent values.
  js("const s=document.getElementById('speed');s.value=37;s.dispatchEvent(new Event('input'))")
  assert p.locator('.is-active .trainConsoleSpeed output').inner_text()=='37%'
  assert p.locator('.is-active .actualSpeed').inner_text()=='0.0 layout/s'
  click('#stopAll');a11y('main');check('independent-commanded-throttle-and-real-velocity-readouts')
  for w,h in viewports:
   p.set_viewport_size({'width':w,'height':h});js('window.scrollTo(0,0)');p.wait_for_timeout(150);frame();geometry('main',w,h);shot(f'{w}-main',full=True)
   for day,quality,name in [(0,'low','day-low'),(100,'high','night-high')]:
    js("([d,q])=>{const e=document.getElementById('day');e.value=d;e.dispatchEvent(new Event('input'));const k=document.getElementById('quality');k.value=q;k.dispatchEvent(new Event('change'))}",[day,quality]);frame();shot(f'{w}-{name}')
   js("document.getElementById('day').value=48;document.getElementById('day').dispatchEvent(new Event('input'));document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'))");frame()
   click('#camt');p.locator('[data-preset=station]').click();assert js('__serienDiagnostics.snapshot().camera.preset')=='station'
   popup=p.locator('.u3-camera-tools').bounding_box();world=p.locator('#view3d').bounding_box();assert popup['y']>=world['y'] and popup['y']+popup['height']<=world['y']+world['height']
   shot(f'{w}-camera-tools');p.keyboard.press('Escape');click('#viewHome');frame()
   # There must be a real picking surface reachable between the visible plates.
   d=js('''()=>{const e=document.querySelector('canvas'),r=e.getBoundingClientRect();let hits=0;for(let x=.1;x<1;x+=.1)for(let y=.1;y<1;y+=.1)if(document.elementFromPoint(r.x+r.width*x,r.y+r.height*y)===e)hits++;return {hits,width:r.width,height:r.height,canvases:document.querySelectorAll('canvas').length,overlayPointer:getComputedStyle(document.querySelector('.u3-overlays')).pointerEvents}}''');assert d['hits']>0 and d['canvases']==1 and d['overlayPointer']=='none',d
   r['responsive'][-1]['pickingSurface']=d
   click('#trainManagement')
   for view in ['layout','catalog','projects','depot']:
    tab(view);geometry(view,w,h);shot(f'{w}-{view}-initial')
   click('dialog.trainManagement [data-close]')
  check('seven-viewports-main-day-night-Low-High-TM-views-scroll-and-pointer-pass-through')
  p.set_viewport_size({'width':1440,'height':900});js('window.scrollTo(0,0)');click('#trainManagement');tab('layout');a11y('layout');tab('catalog');a11y('catalog');tab('projects');pa('new');shot('invalid-empty-project');assert p.locator('[data-project-action=confirm]').is_disabled()
  p.get_by_label('Catalog model',exact=True).select_option('native-steam');pa('add')
  for _ in range(5):p.get_by_label('Catalog model',exact=True).select_option('native-tank');pa('add')
  p.get_by_label('Project name',exact=True).fill('U9 six vehicle project');a11y('composer')
  for w,h in viewports:
   p.set_viewport_size({'width':w,'height':h});js('document.querySelector(".managementBody").scrollTop=0');geometry('composer',w,h);shot(f'{w}-composer');shot(f'{w}-inspector','.u7-inspector');shot(f'{w}-compare','[data-comparison]')
   p.locator('.sideToolbar [data-fit]').evaluate('(e)=>e.click()');rail=p.locator('.projectVehicles');rail.evaluate('(e)=>{e.scrollLeft=e.scrollWidth}');assert rail.evaluate('(e)=>e.scrollLeft>0');shot(f'{w}-rail-end','.projectVehicles')
  check('mobile-rail-inspector-context-and-six-vehicle-overflow-contained')
  pa('confirm');tab('depot');p.get_by_label('Inventory model',exact=True).select_option('native-tank');click('[data-depot-action=add]');click('[data-depot-action^=assign-]');a11y('depot-reserved')
  for w,h in viewports:
   p.set_viewport_size({'width':w,'height':h});js('document.querySelector(".managementBody").scrollTop=0');geometry('depot-reserved',w,h);shot(f'{w}-depot-reserved');shot(f'{w}-depot-card','.depotItem');p.locator('.depotItem summary').click();assert 'slot ' in p.locator('.depotItem details').inner_text();shot(f'{w}-depot-identity','.depotItem');p.locator('.depotItem summary').click()
  check('depot-model-code-state-project-priority-and-expandable-full-UUIDs')
  p.set_viewport_size({'width':390,'height':844});p.locator('[data-depot-action^=release-]').click();assert js('document.activeElement.matches(".u6-guard [data-cancel]")');a11y('guard');shot('390-guard')
  # Native dialog focus trap both directions and top-dialog-only Escape.
  p.keyboard.press('Shift+Tab')
  # Chromium permits a browser-chrome boundary (BODY) in native dialog tab order.
  # It must never reach an underlying application control; native modal inertness remains.
  if js('document.activeElement===document.body'):p.keyboard.press('Shift+Tab')
  assert js('document.activeElement.matches(".u6-guard [data-confirm]")')
  p.keyboard.press('Tab')
  if js('document.activeElement===document.body'):p.keyboard.press('Tab')
  assert js('document.activeElement.matches(".u6-guard [data-cancel]")');p.keyboard.press('Escape');assert p.locator('#tmD').evaluate('(e)=>e.open') and not p.locator('.u6-guard').is_visible()
  p.wait_for_function('document.activeElement.matches("[data-depot-action^=release-]")');assert p.locator('[data-depot-state=reserved]').count()==1
  p.locator('[data-view=depot]').focus();p.keyboard.press('Home');assert p.locator('[data-view=layout]').get_attribute('aria-selected')=='true'
  p.keyboard.press('End');assert p.locator('[data-view=depot]').get_attribute('aria-selected')=='true'
  p.keyboard.press('Escape');p.wait_for_function('document.activeElement===document.getElementById("trainManagement")')
  # Visible focus and local carousel semantics.
  p.locator('#trainDeck').focus();p.keyboard.press('End');assert js('__serienDiagnostics.snapshot().consoles.active')==2
  p.keyboard.press('Home');assert js('__serienDiagnostics.snapshot().consoles.active')==0
  assert p.locator('#trainDeck').evaluate('(e)=>getComputedStyle(e).outlineStyle')!='none';shot('carousel-keyboard-focus','#trainDeck')
  check('native-focus-trap-Tab-ShiftTab-top-Escape-return-TM-tabs-and-carousel-keyboard')
  p.emulate_media(reduced_motion='reduce');click('#trainManagement');tab('depot');assert js('matchMedia("(prefers-reduced-motion: reduce)").matches');shot('390-reduced-motion')
  # Text enlargement: measured 200% root text, and a 200% browser zoom equivalent CSS viewport.
  js("document.documentElement.style.fontSize='200%'");geometry('text-200-percent',390,844);shot('390-text-200-percent');js("document.documentElement.style.fontSize=''")
  p.set_viewport_size({'width':720,'height':450});geometry('200-percent-zoom-equivalent',720,450);shot('zoom-equivalent-200-percent');p.set_viewport_size({'width':1440,'height':900});click('dialog.trainManagement [data-close]')
  r['fonts']=js('''async()=>{await document.fonts.ready;return {faces:[...document.fonts].map(f=>({family:f.family,weight:f.weight,status:f.status})),computed:['.trainConsoleName','.trainConsoleDescription','.actualSpeed'].map(s=>{const f=getComputedStyle(document.querySelector(s));return {selector:s,family:f.fontFamily,weight:f.fontWeight}}),sheets:[...document.styleSheets].map(s=>s.href)}}''')
  assert all(f['status']=='loaded' for f in r['fonts']['faces'])
  assert all(any(f['family']==family and f['weight']==weight for f in r['fonts']['faces']) for family,weight in [('Cinzel Decorative','700'),('Federo','400'),('Cutive Mono','400')])
  # Test actual local bytes with the browser offline; this does not claim app cold-start offline Auth.
  r['fonts']['offline']=js('''async()=>{const files=[['Cinzel Decorative','700','CinzelDecorative-700.woff2'],['Federo','400','Federo-400.woff2'],['Cutive Mono','400','CutiveMono-400.woff2']];window.__fontBytes=await Promise.all(files.map(async([f,w,n])=>[f,w,await (await fetch('ui/fonts/'+n)).arrayBuffer()]));return __fontBytes.map(([family,weight,bytes])=>({family,weight,bytes:bytes.byteLength}))}''')
  p.context.set_offline(True);assert js('''async()=>{for(const [f,w,b]of __fontBytes){const face=new FontFace(f,b,{weight:w});await face.load();if(face.status!=='loaded')return false;}return true}''');p.context.set_offline(False)
  check('reduced-motion-text-enlargement-zoom-equivalent-local-real-weights-offline-font-decode')
  assert not r['errors'] and not r['external'] and not r['httpFailures'],r
  violations=[v for row in r['accessibility'] for v in row['violations']];assert not violations,violations
  assert not any(v['id']=='aria-prohibited-attr' for row in r['accessibility'] for v in row['incomplete'])
  assert p.locator('#tabs').get_attribute('role')=='group'
  r['status']='PASS';save()
 except Exception as e:r['status']='FAIL';r['failure']=str(e);save();shot('failure');raise
 finally:b.close()
