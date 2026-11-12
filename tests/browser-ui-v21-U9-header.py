"""U9-HDR: real app, frozen original plaque cascade, original local SVG/texture/fonts.
Original Main UI markup is a style-only comparison fixture, never application code.
"""
import hashlib,json,os,re
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('U9_HEADER_OUTPUT','work/u9-header'));out.mkdir(parents=True,exist_ok=True)
base=os.environ.get('SERIEN_URL','http://127.0.0.1:8035/')
r={'status':'RUNNING','bundleSHA256':hashlib.sha256(Path('dist/game.js').read_bytes()).hexdigest(),'cssSHA256':hashlib.sha256(Path('ui/css/serien-ui-integration.css').read_bytes()).hexdigest(),'checks':[],'viewports':[],'errors':[],'external':[],'httpFailures':[]}
def save():(out/'results.json').write_text(json.dumps(r,indent=2)+'\n')
styles="""e=>{const c=getComputedStyle(e),t=getComputedStyle(e.querySelector('span')),p=getComputedStyle(e,'::before');return {box:e.getBoundingClientRect().toJSON(),height:c.height,paddingLeft:c.paddingLeft,gap:c.gap,borderRadius:c.borderRadius,backgroundImage:c.backgroundImage,blend:c.backgroundBlendMode,shadow:c.boxShadow,animation:c.animationName,font:t.fontFamily,weight:t.fontWeight,size:t.fontSize,tracking:t.letterSpacing,ink:t.color,textTransform:t.textTransform,textShadow:t.textShadow,before:{content:p.content,inset:p.inset,border:p.border,borderRadius:p.borderRadius},screws:[...e.querySelectorAll('.scr')].map(s=>({width:getComputedStyle(s).width,height:getComputedStyle(s).height,bg:getComputedStyle(s).backgroundImage})),leaf:{width:getComputedStyle(e.querySelector('.lf')).width,height:getComputedStyle(e.querySelector('.lf')).height},textClipped:e.querySelector('span').scrollWidth>e.querySelector('span').clientWidth}}"""
with sync_playwright() as w:
 b=w.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader']);p=b.new_page(viewport={'width':1440,'height':900});p.set_default_timeout(60000)
 p.on('pageerror',lambda e:r['errors'].append(str(e)));p.on('response',lambda q:r['httpFailures'].append([q.url,q.status]) if q.status>=400 else None);p.on('request',lambda q:r['external'].append(q.url) if q.url.startswith('http')and not q.url.startswith(base)else None)
 p.route('**/auth-gate.js*',lambda q:q.fulfill(content_type='text/javascript',body="document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;document.getElementById('signOut').hidden=false;await import('./dist/game.js');"))
 p.add_init_script("const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>{if(cb.toString().includes('requestAnimationFrame')&&cb.toString().includes('.render(')){window.__frame=cb;return 1;}return raf(cb);};")
 try:
  p.goto(base+'?diagnostics=1');p.wait_for_function('Boolean(window.__serienDiagnostics&&window.__frame)');p.evaluate("document.getElementById('pause').click();document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'))");p.wait_for_load_state('networkidle')
  original=Path(os.environ['U9_HEADER_REFERENCE']).read_text();markup=re.search(r'<div class="edp".*?</div>',original,re.S).group();symbol=re.search(r'<symbol id="emb-maple".*?</symbol>',original,re.S).group()
  faces=''.join(re.findall(r'@font-face\{[^}]+\}',Path('ui/css/serien-ui-integration.css').read_text())).replace("../fonts/","/ui/fonts/")
  fixture='<html lang="en"><head><title>Frozen Claude plaque</title><link rel="stylesheet" href="'+base+'ui/css/tokens.css"><link rel="stylesheet" href="'+base+'ui/css/serien-ui.css"><style>'+faces+'</style></head><body><svg width="0" height="0" aria-hidden="true">'+symbol+'</svg><div class="st"><header class="m hd"><div class="mi"><div class="plq"><b class="inl">SERIE N</b></div>'+markup+'</div></header></div></body></html>'
  ref=b.new_page();ref.route('**/u9-frozen-header.html',lambda q:q.fulfill(content_type='text/html',body=fixture));ref.goto(base+'u9-frozen-header.html');ref.evaluate('document.fonts.ready')
  for width,height in [(1920,1080),(1440,900),(1024,768),(768,1024),(390,844)]:
   p.set_viewport_size({'width':width,'height':height});ref.set_viewport_size({'width':width,'height':height});p.wait_for_timeout(150);p.evaluate('__frame(performance.now())')
   assert p.locator('.top .edp').count()==1 and p.locator('.top .u2-edition').count()==0
   assert p.locator('.top .plq').inner_text()=='SERIE N'
   text=p.locator('.top').aria_snapshot();assert len(re.findall('autumn railways',text,re.I))==1,text
   assert p.locator('.edp .scr').count()==2 and p.locator('.edp .lf').count()==1
   assert p.locator('.edp .scr,.edp .lf').evaluate_all('(es)=>es.every(e=>e.getAttribute("aria-hidden")==="true"&&!e.onclick&&!e.querySelector("button,a"))')
   actual=p.locator('.top .edp').evaluate(styles);expected=ref.locator('.edp').evaluate(styles)
   record={'width':width,'height':height,'actual':actual,'frozenReference':expected,'headerAccessibleSnapshot':text};r['viewports'].append(record);save()
   for key in ['height','paddingLeft','gap','borderRadius','font','weight','size','tracking','ink','textTransform','textShadow','before','screws','leaf','animation']:
    assert actual[key]==expected[key],(width,key,actual[key],expected[key])
   assert 'brass-brushed.jpg' in actual['backgroundImage'] and 'overlay' in actual['blend'] and actual['shadow']!='none'
   assert actual['font']=='Federo' and actual['weight']=='400' and actual['ink']=='rgb(90, 61, 16)'
   assert not actual['textClipped'],(width,actual)
   assert p.locator('.top button').evaluate_all('(es)=>es.filter(e=>e.getClientRects().length).every(e=>{const r=e.getBoundingClientRect();return r.x>=0&&r.right<=innerWidth&&r.y>=0&&r.bottom<=document.querySelector(".top").getBoundingClientRect().bottom})')
   assert p.evaluate('document.documentElement.scrollWidth<=innerWidth')
   p.screenshot(path=str(out/f'{width}-after.png'));p.locator('.top').screenshot(path=str(out/f'{width}-after-header.png'));ref.locator('.edp').screenshot(path=str(out/f'{width}-frozen-plaque.png'))
  r['checks']=['unique plaque and accessible text; no free subtitle','original SERIE N plaque and critical controls preserved','frozen final geometry/cascade matched on five viewports','local brass and SVG screw/leaf assets','real Federo 400 and original engraving ink/shadows','no clipped lettering or horizontal overflow; header buttons reachable']
  r['texture']={'path':'ui/assets/textures/brass-brushed.jpg','httpStatus':p.request.get(base+'ui/assets/textures/brass-brushed.jpg').status,'sha256':hashlib.sha256(Path('ui/assets/textures/brass-brushed.jpg').read_bytes()).hexdigest()};assert r['texture']['httpStatus']==200
  assert not r['errors'] and not r['external'] and not r['httpFailures'],r
  r['comparisonLimit']='Computed final cascade and original markup compared; original archived screenshot also reviewed. No whole-header pixel parity claimed: functional shell has different real controls and definitive local fonts.'
  r['status']='PASS';save()
 except Exception as e:r['status']='FAIL';r['failure']=str(e);save();p.screenshot(path=str(out/'failure.png'));raise
 finally:b.close()
