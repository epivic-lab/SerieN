"""L02-E standalone browser evidence. Does not load the production app/Auth."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path('docs/_active/rolling-stock/evidence/L02-E');OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),headless=True)
 page=browser.new_page(viewport={'width':1440,'height':950},service_workers='block');errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(os.environ.get('SERIEN_URL','http://127.0.0.1:8027/')+'scripts/big-boy/lab.html');page.wait_for_function('window.bigBoyLab',timeout=60000)
 page.evaluate('bigBoyLab.pause()');report={'browser':browser.version,'checks':[]}
 for scenario in ['legacy','v06']:
  page.select_option('#scenario',scenario)
  initial=page.evaluate('({state:bigBoyLab.snapshot(),visual:bigBoyLab.visual()})')
  page.screenshot(path=str(OUT/(scenario+'-initial.png')))
  page.click('#forward')
  run=page.evaluate('''()=>{
   const times=[];let minimum=Infinity;const edges=new Set();
   for(let i=0;i<720;i++){
    const t=performance.now(),s=bigBoyLab.step(1/60);times.push(performance.now()-t);
    if(s.speed!==35)throw Error('Unexpected stop');
    if(Math.abs(s.occupation.reduce((n,e)=>n+e.hi-e.lo,0)-260)>1e-6)throw Error('Incomplete footprint');
    minimum=Math.min(minimum,s.drawbar.margin);s.occupation.forEach(e=>edges.add(e.id));
   }
   times.sort((a,b)=>a-b);return {minimumDrawbarMarginMm:minimum,edges:[...edges],p50StepAndRenderMs:times[360],p95StepAndRenderMs:times[684],state:bigBoyLab.snapshot(),visual:bigBoyLab.visual()};
  }''')
  assert run['minimumDrawbarMarginMm']>0
  assert len(run['visual']['axles'])==19
  assert run['visual']['rods']!=initial['visual']['rods']
  for name,a in run['visual']['axles'].items():assert a['angle']!=initial['visual']['axles'][name]['angle']
  page.click('#stop');stopped=page.evaluate('({state:bigBoyLab.snapshot(),visual:bigBoyLab.visual()})')
  page.evaluate('()=>{for(let i=0;i<60;i++)bigBoyLab.step(1/60)}')
  assert page.evaluate('({state:bigBoyLab.snapshot(),visual:bigBoyLab.visual()})')==stopped
  page.click('#reverse');page.evaluate('()=>{for(let i=0;i<720;i++)bigBoyLab.step(1/60)}');page.click('#stop')
  final=page.evaluate('({state:bigBoyLab.snapshot(),visual:bigBoyLab.visual()})')
  assert abs(final['state']['station']-initial['state']['station'])<1e-7
  assert abs(final['state']['odometer'])<1e-7
  for name,a in final['visual']['axles'].items():assert abs(a['angle']-initial['visual']['axles'][name]['angle'])<1e-7
  page.click('#forward');page.evaluate('()=>{for(let i=0;i<10;i++)bigBoyLab.step(1/60)}');page.click('#stop');page.screenshot(path=str(OUT/(scenario+'-crank.png')))
  run.pop('state');run.pop('visual');run.update({'scenario':scenario,'signedDistanceForwardMm':420,'reverseReturn':True,'stopStable':True,'all19AxlesRotate':True,'info':page.evaluate('bigBoyLab.info()')});report['checks'].append(run)
 page.set_viewport_size({'width':390,'height':844});page.screenshot(path=str(OUT/'mobile.png'))
 report['pageErrors']=errors;assert not errors
 page.evaluate('bigBoyLab.dispose()');browser.close();(OUT/'browser.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
