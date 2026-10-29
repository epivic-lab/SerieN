"""Paired fixed-pose images; test-only time/seed controls, never production metrics."""
import argparse,base64,json
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image,ImageChops,ImageStat
p=argparse.ArgumentParser();p.add_argument('--before',required=True);p.add_argument('--after',required=True);p.add_argument('--before-bundle',required=True);p.add_argument('--after-bundle',required=True);p.add_argument('--output',required=True);a=p.parse_args();out=Path(a.output);out.mkdir(parents=True,exist_ok=True)
result={}
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 for label,url,bundle in [('before',a.before,a.before_bundle),('after',a.after,a.after_bundle)]:
  context=b.new_context(viewport={'width':650,'height':760},device_scale_factor=1);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.route('**/dist/game.js*',lambda r:r.fulfill(path=bundle,content_type='application/javascript'))
  page.add_init_script('''window.__seedRandom=()=>{let seed=516;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);};__seedRandom();''')
  page.goto(url+'?diagnostics=1',wait_until='domcontentloaded',timeout=120000);page.wait_for_function('window.__serienProfile',timeout=180000)
  page.evaluate("__serienProfile.stop();document.getElementById('pause').click();window.confirm=()=>true")
  for model in ['native','kenney']:
   page.evaluate("document.getElementById('reset').click();document.getElementById('pause').click();__serienProfile.stop()")
   page.evaluate("m=>{const e=document.getElementById('rollingModels');e.value=m;e.dispatchEvent(new Event('change'));}",model)
   if model=='kenney':page.wait_for_function('__serienDiagnostics.snapshot().stock.every(t=>t.vehicles.every(v=>v.dimensions))',timeout=90000)
   for q in (['low','high','cinema'] if model=='native' else ['low']):
    for day in [10,95]:
     key=f'{model}-{q}-{day}'
     image_data=page.evaluate('''({q,day})=>{const $=id=>document.getElementById(id);__seedRandom();$('quality').value='low';$('quality').dispatchEvent(new Event('change'));__serienProfile.effects.render(false);__seedRandom();$('quality').value=q;$('quality').dispatchEvent(new Event('change'));$('day').value=day;$('day').dispatchEvent(new Event('input'));const uri=__serienProfile.renderFixed();return uri.split(',')[1];}''',dict(q=q,day=day))
     (out/f'{label}-{key}.png').write_bytes(base64.b64decode(image_data));print(label,key,flush=True)
   motion=page.evaluate('''async()=>{const $=id=>document.getElementById(id),p=__serienProfile,result=[];for(const reversed of [false,true]){for(let id=0;id<3;id++){document.querySelector('[data-train="'+id+'"]').click();if(reversed)$('reverse').click();$('speed').value=35+id*10;$('speed').dispatchEvent(new Event('input'));}__serienDiagnostics.step(3);const transforms=[];for(const t of p.trains)for(const root of [t.group,...t.carObjs])root.traverse(o=>transforms.push([o.type,o.visible,o.position.toArray(),o.quaternion.toArray(),o.scale.toArray()]));const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(transforms)));result.push({reversed,transformCount:transforms.length,sha256:[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join(''),stock:__serienDiagnostics.snapshot().stock});$('stopAll').click();}return result;}''')
   (out/f'{label}-{model}-motion.json').write_text(json.dumps(motion,indent=2)+'\n')
  assert not errors,errors;context.close()
 b.close()
for before in sorted(out.glob('before-*.png')):
 after=out/before.name.replace('before-','after-');x=Image.open(before).convert('RGB');y=Image.open(after).convert('RGB');diff=ImageChops.difference(x,y);st=ImageStat.Stat(diff);extrema=diff.getextrema();result[before.stem[7:]]={'size':x.size,'exactPixels':diff.getbbox() is None,'meanAbsoluteChannelError':sum(st.mean)/3,'maxChannelError':max(e[1] for e in extrema)}
for model in ['native','kenney']:
 x=json.loads((out/f'before-{model}-motion.json').read_text());y=json.loads((out/f'after-{model}-motion.json').read_text());result[model+'-motion']={'exactPixels':x==y,'equivalentStateAndTransforms':x==y}
(out/'comparison.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2));assert all(x['exactPixels'] for x in result.values()),'Visual differences require investigation'
