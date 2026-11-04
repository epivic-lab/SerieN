import json,hashlib,math,statistics,time
from pathlib import Path
from playwright.sync_api import sync_playwright
import os
root=Path(__file__).resolve().parents[4]
out=Path(os.environ.get('S0_OUTPUT',str(Path.cwd()/'s0-captures')));out.mkdir(parents=True,exist_ok=True)
bundle=os.environ.get('S0_PROFILE','/workspace/work/s0/profile.js')
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':960,'height':820},device_scale_factor=1)
 errors=[];failed=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('requestfailed',lambda r:failed.append(r.url))
 page.route('**/dist/game.js*',lambda r:r.fulfill(path=bundle,content_type='application/javascript'))
 page.add_init_script('''let seed=516;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);''')
 page.goto(os.environ.get('SERIEN_URL','http://127.0.0.1:8000/')+'?diagnostics=1',wait_until='domcontentloaded',timeout=120000)
 page.wait_for_function('window.__serienProfile',timeout=180000)
 page.evaluate("__serienProfile.stop();document.getElementById('pause').click();document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'))")
 geometry=page.evaluate('''async()=>{
 const digest=async v=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(v))))].map(x=>x.toString(16).padStart(2,'0')).join('');
 const edges=Object.values(__serienProfile.network.edges);let ri=0,bi=0;const result=[];
 for(const m of __s0Originals){const rail=m.kind==='rail',edge=edges[rail?Math.floor(ri/2):bi++];const positions=m.attributes.position.array;const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<positions.length;i++){const k=i%3;min[k]=Math.min(min[k],positions[i]);max[k]=Math.max(max[k],positions[i]);}
 result.push({kind:m.kind,id:rail?edge.id+':'+(ri++%2===0?'-1':'+1'):edge.id,position:m.position,quaternion:m.quaternion,scale:m.scale,matrix:m.matrix,bounds:{min,max},vertices:positions.length/3,indexCount:m.index?.length??0,geometrySha256:await digest({attributes:m.attributes,index:m.index}),endpoints:[edge.points[0],edge.points.at(-1)]});}
 return {meshes:result,controllers:__serienProfile.network.controllers,statistics:__serienProfile.network.metadata.statistics};}''')
 assert len([m for m in geometry['meshes'] if m['kind']=='rail'])==150
 assert len([m for m in geometry['meshes'] if m['kind']=='ballast'])==75
 (out/'geometry.json').write_text(json.dumps(geometry,indent=2)+'\n')
 print('geometry: 150 rails + 75 beds',flush=True)
 metadata={'browser':b.version,'viewport':[960,820],'DPR':1,'quality':'low','seed':516,'instrumentation':'temporary profiling bundle; no production changes','screenshots':{},'errors':errors,'failedRequests':failed}
 for view in ['overview','Y-IN','WX-A','WX-B']:
  for day in [48,95]:
   key=f'{view}-{day}'
   state=page.evaluate('''({view,day})=>{const p=__serienProfile,$=id=>document.getElementById(id);$('day').value=day;$('day').dispatchEvent(new Event('input'));p.renderFixed();
   if(view!=='overview'){const c=p.network.controllers.find(c=>c.id===view);p.controls.target.set(c.x,0,c.z);p.camera.position.set(c.x+190,340,c.z+270);p.controls.update();p.effects.render(false);p.renderer.getContext().finish();}
   return {snapshot:__serienDiagnostics.snapshot(),camera:p.camera.position.toArray(),target:p.controls.target.toArray(),day,view};}''',dict(view=view,day=day))
   page.screenshot(path=str(out/(key+'.png')),timeout=120000)
   metadata['screenshots'][key]=state
   print(key,flush=True)
 # Short fresh sample: isolated from fixed image capture, real RAF, paused engine.
 page.evaluate("document.getElementById('day').value=48;document.getElementById('day').dispatchEvent(new Event('input'));__serienProfile.renderFixed();__serienProfile.resume()")
 intervals=page.evaluate('''()=>new Promise(resolve=>{const values=[];let last;function frame(t){if(last!==undefined)values.push(t-last);last=t;if(values.length===12)resolve(values);else requestAnimationFrame(frame)}requestAnimationFrame(frame)})''')
 page.evaluate('__serienProfile.stop()')
 metadata['shortIdleTiming']={'rawMs':intervals,'p50Ms':statistics.median(intervals),'p95NearestRankMs':sorted(intervals)[math.ceil(.95*len(intervals))-1],'samples':len(intervals),'snapshot':page.evaluate('__serienDiagnostics.snapshot()'),'note':'12 RAF intervals; paused simulation, Low/day48/fixed overview, 960x820; instrumented SwiftShader, not comparable to full 5D benchmark or hardware FPS'}
 assert not errors and not failed,(errors,failed)
 (out/'capture.json').write_text(json.dumps(metadata,indent=2)+'\n')
 b.close()
