"""S2 before/after proof: only markers removed, geometry-conformal CPU pickers stay invisible. Temporary profiling bundles required via S2_BEFORE_BUNDLE and S2_AFTER_BUNDLE."""
import json,base64,math,statistics,hashlib,os
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image,ImageChops
out=Path(os.environ.get('S2_OUTPUT','turnout-s2-visual'));out.mkdir(parents=True,exist_ok=True)
referenceOnly=os.environ.get('S2_REFERENCE_ONLY')=='1'
partial=bool(os.environ.get('S2_VIEWS'))
result={};metadata=json.loads((out/'capture.json').read_text()) if referenceOnly or partial else {}
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 for label in (['before'] if referenceOnly else ['before','after']):
  c=b.new_context(viewport={'width':960,'height':820},device_scale_factor=1);page=c.new_page();errors=[];failed=[]
  page.on('pageerror',lambda e:errors.append(str(e)));page.on('requestfailed',lambda r:failed.append(r.url))
  page.route('**/dist/game.js*',lambda r:r.fulfill(path=os.environ['S2_BEFORE_BUNDLE'] if label=='before' else os.environ['S2_AFTER_BUNDLE'],content_type='application/javascript'))
  page.add_init_script('let seed=516;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);')
  page.goto(os.environ.get('SERIEN_URL','http://127.0.0.1:8000/')+'?diagnostics=1',wait_until='domcontentloaded',timeout=120000);page.wait_for_function('__serienProfile',timeout=180000)
  page.evaluate("__serienProfile.stop();document.getElementById('pause').click();document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'))")
  page.evaluate("()=>{for(const day of [95,48]){document.getElementById('day').value=day;document.getElementById('day').dispatchEvent(new Event('input'));__serienProfile.renderFixed();__serienProfile.effects.render(false);__serienProfile.renderer.getContext().finish();}}")
  oldViews=metadata.get(label,{}).get('views',{}) if partial else {}
  oldTiming=metadata.get(label,{}).get('timing')
  metadata[label]={'errors':errors,'failedRequests':failed,'views':oldViews}
  if oldTiming:metadata[label]['timing']=oldTiming
  metadata[label]['railMaterials']=page.evaluate('''async()=>{const list=new Set();__serienProfile.scene.traverse(o=>{if(o.isMesh&&!Array.isArray(o.material)&&(o.material.name==='Weathered rail web / polished running head'||o.material.bumpScale===.22))list.add(o.material)});
   const digest=async data=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',data))].map(x=>x.toString(16).padStart(2,'0')).join('');const result=[];
   for(const m of list){const textures={};for(const key of ['map','bumpMap','roughnessMap','metalnessMap'])if(m[key]){const image=m[key].image;let data=image.data;if(!data&&image.getContext)data=image.getContext('2d').getImageData(0,0,image.width,image.height).data;textures[key]={width:image.width,height:image.height,sha256:data?await digest(data):null};}
   result.push({name:m.name,type:m.type,color:m.color.toArray(),roughness:m.roughness,metalness:m.metalness,bumpScale:m.bumpScale,vertexColors:m.vertexColors,textures});}return result.sort((a,b)=>a.name.localeCompare(b.name));}''')
  for view in os.environ.get('S2_VIEWS','overview,Y-IN,WX-A,WX-B').split(','):
   for day in map(int,os.environ.get('S2_DAYS','48,95').split(',')):
    key=f'{view}-{day}'
    data=page.evaluate('''({view,day})=>{const p=__serienProfile,$=id=>document.getElementById(id);$('day').value=day;$('day').dispatchEvent(new Event('input'));p.renderFixed();if(view!=='overview'){const c=p.network.controllers.find(c=>c.id===view);p.controls.target.set(c.x,0,c.z);p.camera.position.set(c.x+190,340,c.z+270);p.controls.update();p.effects.render(false);p.renderer.getContext().finish();}p.effects.render(false);p.renderer.getContext().finish();return {scenePNG:p.renderer.domElement.toDataURL().split(',')[1],camera:p.camera.position.toArray(),target:p.controls.target.toArray(),day,quality:'low',render:__serienDiagnostics.snapshot().render};}''',{'view':view,'day':day})
    (out/f'{label}-scene-{key}.png').write_bytes(base64.b64decode(data.pop('scenePNG')));metadata[label]['views'][key]=data;page.screenshot(path=str(out/f'{label}-{key}.png'),timeout=120000)
    if label=='before':
     raw=page.evaluate("()=>{__serienProfile.scene.children.filter(o=>o.userData.switchId).forEach(o=>o.visible=false);__serienProfile.effects.render(false);__serienProfile.renderer.getContext().finish();return __serienProfile.renderer.domElement.toDataURL().split(',')[1];}")
     (out/f'reference-scene-{key}.png').write_bytes(base64.b64decode(raw))
     page.screenshot(path=str(out/f'reference-without-markers-{key}.png'),timeout=120000)
     page.evaluate("__serienProfile.scene.children.filter(o=>o.userData.switchId).forEach(o=>o.visible=true)")
    print(label,key,flush=True)
  # Small paired RAF sample, same viewport/fixture/settings on both revisions.
  if not referenceOnly and not partial:
   page.set_viewport_size({'width':650,'height':760})
   page.evaluate("document.getElementById('day').value=48;document.getElementById('day').dispatchEvent(new Event('input'));__serienProfile.renderFixed();__serienProfile.resume()")
   values=page.evaluate('''()=>new Promise(resolve=>{let last;const values=[];function f(t){if(last!==undefined)values.push(t-last);last=t;if(values.length===15)resolve(values.slice(3));else requestAnimationFrame(f);}requestAnimationFrame(f);})''')
   page.evaluate('__serienProfile.stop()')
   metadata[label]['timing']={'samplesMs':values,'samples':len(values),'p50Ms':statistics.median(values),'p95NearestRankMs':sorted(values)[math.ceil(.95*len(values))-1],'render':page.evaluate('__serienDiagnostics.snapshot().render'),'viewport':[650,760],'note':'12 paused-idle RAF samples after 3 warmup; Low/day48/fixed overview, instrumented SwiftShader. Not full 5D benchmark or hardware FPS.'}
  assert not errors and not failed,(errors,failed);c.close()
 b.close()
for image in sorted(out.glob('after-scene-*.png')):
 key=image.stem[len('after-scene-'):];a=Image.open(image).convert('RGB');ref=Image.open(out/f'reference-scene-{key}.png').convert('RGB');before=Image.open(out/f'before-scene-{key}.png').convert('RGB')
 delta=ImageChops.difference(a,ref);removed=ImageChops.difference(a,before)
 result[key]={'onlyArtificialMarkersDiffer':delta.getbbox() is None,'beforeAfterChangedBounds':removed.getbbox(),'sameCamera':metadata['before']['views'][key]['camera']==metadata['after']['views'][key]['camera'],'sameTarget':metadata['before']['views'][key]['target']==metadata['after']['views'][key]['target']}
assert len(metadata['before']['railMaterials'])>=2
result['railMaterialsIdentical']=metadata['before']['railMaterials']==metadata['after']['railMaterials']
(out/'capture.json').write_text(json.dumps(metadata,indent=2)+'\n');(out/'comparison.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2));assert result['railMaterialsIdentical'];assert all(v['onlyArtificialMarkersDiffer'] and v['sameCamera'] and v['sameTarget'] for k,v in result.items() if k!='railMaterialsIdentical')
