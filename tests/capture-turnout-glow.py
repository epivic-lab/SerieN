"""S3 actual A/B/no-glow renders, fixed camera/lighting and pulse frames.
Needs S3_BASELINE_BUNDLE (S2) and S3_BUNDLE (temporary profile hooks).
"""
import os,json,base64,shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image,ImageChops
out=Path(os.environ.get('S3_OUTPUT','turnout-s3-visual'));out.mkdir(parents=True,exist_ok=True)
views=['Y-IN','Y-2','WX-A','WX-B','overview'];meta={};errors=[]
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 for label in ['baseline','candidate']:
  context=b.new_context(viewport={'width':1100,'height':860},device_scale_factor=1);page=context.new_page();failed=[]
  page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);page.on('requestfailed',lambda r:failed.append(r.url))
  bundle=os.environ['S3_BASELINE_BUNDLE'] if label=='baseline' else os.environ['S3_BUNDLE']
  page.route('**/dist/game.js*',lambda r:r.fulfill(path=bundle,content_type='application/javascript'))
  page.add_init_script('let seed=516;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);')
  page.goto(os.environ.get('SERIEN_URL','http://127.0.0.1:8003/')+'?diagnostics=1',wait_until='domcontentloaded',timeout=120000)
  page.wait_for_function('__serienProfile',timeout=180000)
  page.evaluate('''()=>{const p=__serienProfile,api=__serienDiagnostics,$=id=>document.getElementById(id);p.stop();$('pause').click();$('quality').value='low';$('quality').dispatchEvent(new Event('change'));api.setSwitches([]);['T12','T0','T16'].forEach((edge,id)=>api.placeTrain(id,edge,150));
   for(const day of [95,48]){$('day').value=day;$('day').dispatchEvent(new Event('input'));p.renderFixed();p.effects.render(false);p.renderer.getContext().finish();}
   window.__s3Render=({id,day,variant,phase=700})=>{const g=window.__s3?.glow;if(g){g.identify(null,0);g.update(200);g.setReducedMotion(false);}
    $('day').value=day;$('day').dispatchEvent(new Event('input'));p.renderFixed();
    if(id!=='overview'){const c=p.network.controllers.find(c=>c.id===id),wx=id.startsWith('WX');p.controls.target.set(c.x,0,c.z+15);p.camera.position.set(c.x+50,wx?380:300,c.z+(wx?310:250));p.camera.zoom=wx?1.1:1.4;p.camera.updateProjectionMatrix();p.controls.update();}
    if(g&&variant!=='off'){g.setVariant(variant);g.identify(id==='overview'?'WX-B':id,0);g.update(phase);}
    p.effects.render(false);p.renderer.getContext().finish();return {png:p.renderer.domElement.toDataURL().split(',')[1],camera:p.camera.position.toArray(),target:p.controls.target.toArray(),zoom:p.camera.zoom,fov:p.camera.fov,day,quality:'low',phase,glow:g?.snapshot??null,render:api.snapshot().render};};
  }''')
  meta[label]={}
  for view in views:
   for day in [48,95]:
    for variant in (['off'] if label=='baseline' else ['off','A','B']):
     key=f'{view}-{day}-{variant}';value=page.evaluate('__s3Render',dict(id=view,day=day,variant=variant))
     name=f'{label}-{key}.png';(out/name).write_bytes(base64.b64decode(value.pop('png')));meta[label][key]=value
     print(label,key,flush=True)
     if label=='candidate' and view=='Y-IN' and day==48 and variant!='off':
      for phase in [200,700,1100]:
       frame=page.evaluate('__s3Render',dict(id=view,day=day,variant=variant,phase=phase));(out/f'pulse-{variant}-{phase}.png').write_bytes(base64.b64decode(frame.pop('png')));meta[label][f'pulse-{variant}-{phase}']=frame
  assert not failed,failed;context.close()
 b.close()
assert not errors,errors
result={'errors':errors,'baselineOffExact':{},'variantsVisible':{},'pulseDistinct':{}}
for view in views:
 for day in [48,95]:
  key=f'{view}-{day}';before=Image.open(out/f'baseline-{key}-off.png').convert('RGB');off=Image.open(out/f'candidate-{key}-off.png').convert('RGB')
  result['baselineOffExact'][key]=ImageChops.difference(before,off).getbbox() is None
  for variant in ['A','B']:
   im=Image.open(out/f'candidate-{key}-{variant}.png').convert('RGB');a=meta['candidate'][f'{key}-{variant}'];z=meta['candidate'][f'{key}-off']
   assert (a['camera'],a['target'],a['zoom'],a['day'])==(z['camera'],z['target'],z['zoom'],z['day'])
   result['variantsVisible'][f'{key}-{variant}']=ImageChops.difference(off,im).getbbox() is not None
for variant in ['A','B']:
 ims=[Image.open(out/f'pulse-{variant}-{phase}.png').convert('RGB') for phase in [200,700,1100]]
 result['pulseDistinct'][variant]=all(ImageChops.difference(ims[a],ims[b]).getbbox() is not None for a,b in [(0,1),(1,2),(0,2)])
(out/'capture.json').write_text(json.dumps(meta,indent=2)+'\n');(out/'comparison.json').write_text(json.dumps(result,indent=2)+'\n')
assert all(result['baselineOffExact'].values()),'Unexpected no-glow regression'
assert all(result['variantsVisible'].values()) and all(result['pulseDistinct'].values()),result
print('PASS: baseline exact, two visible styles and three distinct pulse frames each',flush=True)
