"""S3 railway material signatures and opposite/low/overview glow projections.
Requires temporary S2 and S3 profiles; captures actual WebGL, never edits images.
"""
import os,json,base64
from pathlib import Path
from PIL import Image,ImageChops
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('S3_OUTPUT','turnout-s3-views'));out.mkdir(parents=True,exist_ok=True)
materials={};cases=[];errors=[]
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 for label,bundle in [('S2',os.environ['S3_BASELINE_BUNDLE']),('S3',os.environ['S3_BUNDLE'])]:
  c=b.new_context(viewport={'width':960,'height':820});page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
  page.route('**/dist/game.js*',lambda r:r.fulfill(path=bundle,content_type='application/javascript'))
  page.add_init_script('let seed=516;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);')
  page.goto(os.environ.get('SERIEN_URL','http://127.0.0.1:8003/')+'?diagnostics=1',wait_until='domcontentloaded',timeout=120000);page.wait_for_function('__serienProfile',timeout=180000)
  page.evaluate("__serienProfile.stop();document.getElementById('pause').click();document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'));__serienDiagnostics.setSwitches([]);['T12','T0','T16'].forEach((e,i)=>__serienDiagnostics.placeTrain(i,e,150));__serienProfile.renderFixed()")
  materials[label]=page.evaluate('''async()=>{const list=new Set();__serienProfile.scene.traverse(o=>{if(o.isMesh&&!Array.isArray(o.material)&&(o.material.name==='Weathered rail web / polished running head'||o.material.bumpScale===.22))list.add(o.material)});
   const digest=async a=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(a.buffer,a.byteOffset,a.byteLength)))].map(x=>x.toString(16).padStart(2,'0')).join(''),result=[];
   for(const m of list){const textures={};for(const key of ['map','roughnessMap','bumpMap'])if(m[key]){const im=m[key].image;let data=im.data;if(!data&&im.getContext)data=im.getContext('2d').getImageData(0,0,im.width,im.height).data;textures[key]={width:im.width,height:im.height,sha256:data?await digest(data):null};}result.push({name:m.name,type:m.type,color:m.color.toArray(),roughness:m.roughness,metalness:m.metalness,bumpScale:m.bumpScale,vertexColors:m.vertexColors,textures});}return result.sort((a,b)=>a.name.localeCompare(b.name));}''')
  if label=='S3':
   for id in ['Y-IN','WX-A','WX-B']:
    for view in ['opposite','low']:
     for variant in ['A','B']:
      data=page.evaluate('''({id,view,variant})=>{const p=__serienProfile,g=__s3.glow,c=p.network.controllers.find(c=>c.id===id);g.identify(null,0);g.update(200);p.controls.enableDamping=false;p.controls.target.set(c.x,0,c.z);p.camera.position.set(c.x+(view==='opposite'?-90:100),view==='opposite'?400:130,c.z+(view==='opposite'?-320:320));p.camera.zoom=view==='opposite'?.8:1.2;p.camera.updateProjectionMatrix();p.controls.update();
       const draw=()=>{p.effects.render(false);p.renderer.getContext().finish();return p.renderer.domElement.toDataURL().split(',')[1];};const off=draw();g.setVariant(variant);g.identify(id,0);g.update(700);return {off,on:draw(),camera:p.camera.position.toArray(),target:p.controls.target.toArray(),zoom:p.camera.zoom};}''',dict(id=id,view=view,variant=variant))
      key=f'{id}-{view}-{variant}'
      for state in ['off','on']:(out/f'{key}-{state}.png').write_bytes(base64.b64decode(data.pop(state)))
      delta=ImageChops.difference(Image.open(out/f'{key}-off.png').convert('RGB'),Image.open(out/f'{key}-on.png').convert('RGB')).getbbox();assert delta,(id,view,variant)
      cases.append(dict(id=id,view=view,variant=variant,changedBounds=delta,**data));print(key,'PASS',flush=True)
  c.close()
 b.close()
assert len(materials['S2'])>=2 and materials['S2']==materials['S3'],'Rail/ballast material or texture changed'
assert not errors,errors
(out/'views-materials.json').write_text(json.dumps({'result':'PASS','railMaterialsIdentical':True,'materials':materials,'views':cases,'errors':errors,'limits':'Two additional opposite/low camera angles and zooms, not every possible angle or physical GPU'},indent=2)+'\n')
print('PASS: materials/textures exact; both styles visible from opposite/low cameras',flush=True)
