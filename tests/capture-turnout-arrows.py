"""Actual S4 renders, both states of all8, blue B, WX directions and reveal.
Temporary S3_BASELINE_BUNDLE and S4_BUNDLE profiles; never alter production dist.
"""
import os,json,base64
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image,ImageChops
out=Path(os.environ.get('S4_OUTPUT','turnout-s4-visual'));out.mkdir(parents=True,exist_ok=True);metadata={};errors=[]
views=os.environ.get('S4_VIEWS','Y-IN,Y-R1,Y-R2,Y-3,Y-4,Y-2,WX-A,WX-B,overview').split(',');days=list(map(int,os.environ.get('S4_DAYS','48,95').split(',')))
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 labels=['candidate'] if os.environ.get('S4_PREVIEW') else ['baseline','candidate']
 for label in labels:
  c=b.new_context(viewport={'width':1100,'height':860},device_scale_factor=1);page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
  page.route('**/dist/game.js*',lambda r:r.fulfill(path=os.environ['S4_BUNDLE'] if label=='candidate' else os.environ['S3_BASELINE_BUNDLE'],content_type='application/javascript'))
  page.add_init_script('let seed=516;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);')
  page.goto(os.environ.get('SERIEN_URL','http://127.0.0.1:8003/')+'?diagnostics=1',wait_until='domcontentloaded',timeout=120000);page.wait_for_function('__serienProfile',timeout=180000)
  page.evaluate('''()=>{const p=__serienProfile,api=__serienDiagnostics,$=id=>document.getElementById(id);p.stop();$('pause').click();$('quality').value='low';$('quality').dispatchEvent(new Event('change'));['T12','T0','T16'].forEach((e,i)=>api.placeTrain(i,e,150));api.setSwitches([]);
   for(const day of [95,48]){$('day').value=day;$('day').dispatchEvent(new Event('input'));p.renderFixed();p.effects.render(false);p.renderer.getContext().finish();}
   window.__render=({id,on,day,blue=false,hide=false,entry=null,phase=null})=>{const g=__s3.glow,a=window.__s4?.arrows;g.identify(null,0);g.update(200);g.setVariant('B');g.setReducedMotion(false);api.setSwitches(on?(id==='overview'?api.indicatorState().states.map(c=>c.id):[id]):[]);$('day').value=day;$('day').dispatchEvent(new Event('input'));p.renderFixed();
    if(id!=='overview'){const c=p.network.controllers.find(c=>c.id===id),wx=id.startsWith('WX');p.controls.target.set(c.x,0,c.z+15);p.camera.position.set(c.x+50,wx?380:300,c.z+(wx?310:250));p.camera.zoom=wx?1.1:1.4;p.camera.updateProjectionMatrix();p.controls.update();}
    if(a){a.update(performance.now()+500,true);a.root.visible=!hide;}
    if(entry){const s=__s4,unit=p.network.controllers.find(c=>c.id===id),port=p.network.nodes[unit.ports[entry]].find(v=>!unit.internal.includes(v.edge)),edge=p.network.edges[port.edge];
      if(edge.switchId)s.switchSpecs.find(c=>c.id===edge.switchId).on=edge.requiredState;
      const views=s.model.read(id,on,{incomingEdge:edge.id,incomingEnd:port.end,choose:s.route});if(views.unknown||views.approach.status!=='ROUTABLE')throw Error('Bad capture entry');
      // Actual Journey and actual velocity, with a bare locomotive sufficiently
      // far from the device; the collector uses this same read-only context.
      document.querySelector('[data-train="0"]').click();for(let i=0;i<5;i++)$('uncouple').click();const direction=port.end?1:-1,j=new s.Journey(p.network,edge.id,port.end?edge.length:0);if(!j.move(-direction*120,0,s.route))throw Error('Cannot place approach');const location=j.locate(),segment=j.segments.find(v=>j.position>=v.start&&j.position<=v.end),motion=direction*segment.sign;api.placeTrain(0,location.edge,location.s,motion);s.trains[0].velocity=motion*25;
      a.update(performance.now()+1000,true);s.trains[0].velocity=0;
    }
    if(phase!==null&&a){api.setSwitches(on?[]:[id]);a.update(0,true);a.update(500,true);api.setSwitches(on?[id]:[]);a.update(1000,true);a.update(1000+phase);}
    if(blue){g.identify(id==='overview'?'WX-B':id,0);g.update(700);}
    p.effects.render(false);p.renderer.getContext().finish();return {png:p.renderer.domElement.toDataURL().split(',')[1],camera:p.camera.position.toArray(),target:p.controls.target.toArray(),zoom:p.camera.zoom,day,on,blue,entry,phase,arrows:a?.snapshot??null,glow:g.snapshot};};}''')
  metadata[label]={}
  def capture(key,**args):
   v=page.evaluate('__render',args);(out/f'{label}-{key}.png').write_bytes(base64.b64decode(v.pop('png')));metadata[label][key]=v;(out/'capture.json').write_text(json.dumps(metadata,indent=2)+'\n');print(label,key,flush=True)
  for id in views:
   for day in days:
    for on in [False,True]:
     if label=='baseline' and (id not in ['Y-IN','WX-A','WX-B','overview'] or on):continue
     capture(f'{id}-{day}-{int(on)}',id=id,on=on,day=day)
     if not on and id in ['Y-IN','WX-A','WX-B']:
      capture(f'{id}-{day}-blue',id=id,on=on,day=day,blue=True)
      if label=='candidate':capture(f'{id}-{day}-blue-reference',id=id,on=on,day=day,blue=True,hide=True)
  if label=='candidate' and not os.environ.get('S4_PREVIEW'):
   for id in ['WX-A','WX-B']:
    for on in [False,True]:
     for entry in (['UL','LR'] if on else ['UL','UR']):capture(f'{id}-direction-{int(on)}-{entry}',id=id,on=on,day=48,entry=entry)
   for phase in [0,170,340]:capture(f'reveal-{phase}',id='Y-IN',on=True,day=48,phase=phase,blue=True)
  c.close()
 b.close()
(out/'capture.json').write_text(json.dumps(metadata,indent=2)+'\n');assert not errors,errors
if 'baseline' in metadata:
 result={'blueBUnchangedExact':{},'arrowsVisible':{},'errors':errors}
 for key in metadata['baseline']:
  before=Image.open(out/f'baseline-{key}.png').convert('RGB')
  candidate=Image.open(out/f'candidate-{key}.png').convert('RGB')
  result['arrowsVisible'][key]=ImageChops.difference(before,candidate).getbbox() is not None
  if key.endswith('blue'):
   reference=Image.open(out/f'candidate-{key}-reference.png').convert('RGB');result['blueBUnchangedExact'][key]=ImageChops.difference(before,reference).getbbox() is None
 (out/'comparison.json').write_text(json.dumps(result,indent=2)+'\n');assert all(result['blueBUnchangedExact'].values()),result;assert all(result['arrowsVisible'].values()),result
print('S4 capture PASS',flush=True)
