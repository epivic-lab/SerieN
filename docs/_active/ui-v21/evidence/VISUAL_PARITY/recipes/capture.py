import os,json,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path('/workspace/work/visual-parity');out=root/'evidence';out.mkdir(exist_ok=True)
viewports=[(1692,877),(1648,895),(1440,900),(1366,768),(1024,768),(390,844),(768,1024)]
mode=sys.argv[1];result={'mode':mode,'viewports':[],'errors':[],'networkFailures':[],'provenance':'Isolated original reference / actual runtime bundle with explicit local Auth bootstrap; no OAuth claim'}
selectors={'frame':'.st' if mode=='reference' else '.app','header':'.hd' if mode=='reference' else '.top','viewport':'.vp' if mode!='baseline' else '#view3d','canvasViewport':'.win' if mode=='reference' else '#view3d','sidebar':'.side','dock':'.dk' if mode=='reference' else '.u5-dock','environment':'.m-env','switches':'.m-sw','map':'.m-lg','missions':'.m-ms','cards':'.tr' if mode=='reference' else '.trainConsole','hud':'.nx' if mode=='reference' else '#nextSwitchHUD','camera':'.cam' if mode=='reference' else '#cam','plaque':'.plq','edition':'.edp'}
selectors.update({'bell':'.bell' if mode=='reference' else '#guardedStopStatus','log':'.crt' if mode=='reference' else '.u3-operations','gauges':'.gg' if mode=='reference' else '.u5-gauge','throttles':'.thr' if mode=='reference' else '.trainConsoleSpeed input','commands':'.bs' if mode=='reference' else '.trainConsoleCommands'})
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage'])
 p=b.new_page(viewport={'width':1692,'height':877},reduced_motion='reduce');p.set_default_timeout(90000)
 p.on('pageerror',lambda e:result['errors'].append(str(e)))
 p.on('response',lambda r:result['networkFailures'].append({'url':r.url,'status':r.status}) if r.status>=400 else None)
 p.route('https://fonts.googleapis.com/**',lambda r:r.fulfill(content_type='text/css',body=''.join('@font-face{font-family:"'+family+'";font-weight:'+weight+';src:url(http://127.0.0.1:8040/baseline/ui/fonts/'+file+')} ' for family,weight,file in [('Cinzel Decorative','700','CinzelDecorative-700.woff2'),('Federo','400','Federo-400.woff2'),('Cutive Mono','400','CutiveMono-400.woff2')])))
 if mode!='reference':
  p.route('**/auth-gate.js*',lambda r:r.fulfill(content_type='text/javascript',body="document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;document.getElementById('signOut').hidden=false;await import('./dist/game.js');"))
  p.add_init_script("const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>{if(cb.toString().includes('requestAnimationFrame')&&cb.toString().includes('.render(')){window.__frame=cb;return 1;}return raf(cb);};")
 p.goto('http://127.0.0.1:8040/'+mode+'/?diagnostics=1',wait_until='networkidle')
 if mode=='reference':
  p.evaluate("document.querySelector('#qsg [data-q=high]').click()")
 if mode!='reference':
  p.wait_for_function('Boolean(window.__serienDiagnostics&&window.__frame)')
  p.evaluate("document.getElementById('pause').click();document.getElementById('day').value=0;document.getElementById('day').dispatchEvent(new Event('input'));document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'));__frame(performance.now())")
 p.evaluate('async()=>{await Promise.all([document.fonts.load(\'700 16px "Cinzel Decorative"\'),document.fonts.load(\'400 14px Federo\'),document.fonts.load(\'400 12px "Cutive Mono"\')]);await document.fonts.ready}')
 for w,h in viewports:
  p.set_viewport_size({'width':w,'height':h});p.evaluate('window.scrollTo(0,0)');p.wait_for_timeout(150)
  if mode!='reference':p.evaluate('__frame(performance.now())')
  measurements=p.evaluate('''selectors=>{const box=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {x:r.x,y:r.y,width:r.width,height:r.height,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth,scrollHeight:e.scrollHeight,clientHeight:e.clientHeight,padding:s.padding,gap:s.gap,display:s.display,gridRows:s.gridTemplateRows,background:s.backgroundImage,font:s.font}};return {regions:Object.fromEntries(Object.entries(selectors).map(([k,s])=>[k,[...document.querySelectorAll(s)].map(box)])),overflow:document.documentElement.scrollWidth>innerWidth,bodyHeight:document.documentElement.scrollHeight,fonts:[...document.fonts].map(f=>({family:f.family,status:f.status})),canvas:document.querySelectorAll('canvas').length}}''',selectors)
  name=f'{mode}-{w}x{h}.png';p.screenshot(path=str(out/name),full_page=True)
  result['viewports'].append({'width':w,'height':h,'screenshot':name,**measurements});(out/(mode+'-measurements.json')).write_text(json.dumps(result,indent=2)+'\n')
  print(mode,w,h,{k:[round(x['height'],1) for x in v] for k,v in measurements['regions'].items() if k in ['header','viewport','dock','sidebar']},flush=True)
 b.close()
