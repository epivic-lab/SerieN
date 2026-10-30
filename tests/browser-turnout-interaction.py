"""S2 actual mouse/touch/keyboard, occlusion and lifecycle checks.
Requires temporary S2 profiling observer via S2_BUNDLE; production dist is not altered.
"""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('S2_OUTPUT','turnout-s2'));out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':960,'height':820});errors=[];failed=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('requestfailed',lambda r:failed.append(r.url))
 page.route('**/dist/game.js*',lambda r:r.fulfill(path=os.environ['S2_BUNDLE'],content_type='application/javascript'))
 page.goto(os.environ.get('SERIEN_URL','http://127.0.0.1:8002/')+'?diagnostics=1',wait_until='domcontentloaded',timeout=120000)
 page.wait_for_function('window.__s2',timeout=180000)
 page.evaluate('''()=>{
 const p=__serienProfile,api=__serienDiagnostics,T=__s2.THREE,$=id=>document.getElementById(id);
 p.stop();$('pause').click();$('quality').value='low';$('quality').dispatchEvent(new Event('change'));
 window.__setup=(id,on=false)=>{api.setSwitches(on?[id]:[]);['T12','T0','T16'].forEach((e,i)=>api.placeTrain(i,e,150));api.step(0);__s2.interaction.clear();};
 window.__state=()=>{const s=api.snapshot();return {on:s.switchIndicators.states.map(c=>[c.id,c.on]),stock:s.stock.map(t=>({journey:t.journey,speed:t.speed,velocity:t.velocity,odometer:t.odometer,dir:t.dir}))};};
 window.__aim=(id,zoom=1,pathIndex=0)=>{const def=api.turnoutView(id).paths[pathIndex],edge=p.network.edges[def.edge],s=edge.length*.5;
  const i=edge.distance.findIndex(d=>d>=s),a=edge.points[i-1],b=edge.points[i],f=(s-edge.distance[i-1])/(edge.distance[i]-edge.distance[i-1]),x=a.x+(b.x-a.x)*f,z=a.z+(b.z-a.z)*f;
  p.controls.enableDamping=false;p.controls.target.set(x,6.08,z);p.camera.position.set(x+100*zoom,6.08+300*zoom,z+150*zoom);p.controls.update();p.camera.updateMatrixWorld();p.effects.render(false);p.renderer.getContext().finish();
  const v=new T.Vector3(x,6.08,z).project(p.camera),r=p.renderer.domElement.getBoundingClientRect();return {x:r.left+(v.x+1)/2*r.width,y:r.top+(1-v.y)/2*r.height};};
 window.__hoverId=()=>api.turnoutInteractionState().active;
 }''')
 ids=page.evaluate('__serienDiagnostics.indicatorState().states.map(c=>c.id)');hover=[];zoomCases=[]
 for index,id in enumerate(ids):
  page.evaluate('id=>__setup(id)',id);before=page.evaluate('__state()')
  page.locator(f'[data-switch-hover="{index}"]').hover()
  assert page.evaluate('__hoverId()')==id
  assert page.evaluate('document.querySelector("canvas").dataset.turnoutId')==id
  assert page.evaluate('__s2.picking.root.userData.activeControl')==id
  assert page.evaluate('__state()')==before
  target=page.evaluate('id=>__aim(id)',id);page.mouse.move(target['x'],target['y'])
  page.wait_for_function('id=>__hoverId()===id',arg=id,timeout=30000)
  assert page.locator(f'[data-switch-hover="{index}"]').evaluate('e=>e.classList.contains("is-identified")')
  assert page.evaluate('__state()')==before
  hover.append(id);print('hover',id,'PASS',flush=True)
  for zoom in [.8,1.6]:
   page.evaluate('id=>__setup(id)',id);target=page.evaluate('a=>__aim(...a)',[id,zoom]);page.mouse.click(target['x'],target['y'])
   assert dict(page.evaluate('__state().on'))[id] is True,(id,zoom)
   zoomCases.append([id,zoom])
 # Every physical branch, including both diagonals of both WX devices, identifies the same controller.
 branches=[]
 for id in ids:
  count=page.evaluate('id=>__serienDiagnostics.turnoutView(id).paths.length',id)
  for pathIndex in range(count):
   page.evaluate('id=>__setup(id)',id);target=page.evaluate('a=>__aim(...a)',[id,1,pathIndex]);page.mouse.move(target['x'],target['y'])
   page.wait_for_function('id=>__hoverId()===id',arg=id,timeout=30000);branches.append([id,pathIndex])
 # Genuine drag, out-and-back gesture, pointer cancellation and lost capture.
 gestures=[]
 for kind in ['drag-return','cancel','lost-capture','blur','wheel']:
  page.evaluate("__setup('WX-A')");point=page.evaluate("__aim('WX-A')");before=page.evaluate('__state()')
  page.mouse.move(point['x'],point['y']);page.mouse.down()
  if kind=='drag-return':page.mouse.move(point['x']+45,point['y']+20,steps=4);page.mouse.move(point['x'],point['y'],steps=4)
  elif kind=='cancel':page.evaluate("document.querySelector('#view3d canvas').dispatchEvent(new PointerEvent('pointercancel',{pointerId:1}))")
  elif kind=='lost-capture':page.evaluate("{const c=document.querySelector('#view3d canvas');if(c.hasPointerCapture(1))c.releasePointerCapture(1);}")
  elif kind=='blur':page.evaluate("window.dispatchEvent(new Event('blur'))")
  else:page.mouse.wheel(0,180)
  page.mouse.up();assert page.evaluate('__state()')==before,kind;gestures.append(kind)
 # Browser-generated touch events, not synthetic clicks; OrbitControls receives the same gestures.
 cdp=page.context.new_cdp_session(page);cdp.send('Emulation.setTouchEmulationEnabled',{'enabled':True,'maxTouchPoints':5})
 touches=[]
 for kind in ['tap','swipe-return','pinch']:
  page.evaluate("__setup('WX-B')");point=page.evaluate("__aim('WX-B')");before=page.evaluate('__state()')
  t={'x':point['x'],'y':point['y'],'id':10};points=[t] if kind!='pinch' else [t,{'x':point['x']+25,'y':point['y'],'id':11}]
  cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':points})
  if kind=='swipe-return':
   cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{**t,'x':t['x']+45}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[t]})
  elif kind=='pinch':cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[t,{**points[1],'x':point['x']+65}]})
  cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
  if kind=='tap':assert dict(page.evaluate('__state().on'))['WX-B'] is True
  else:assert page.evaluate('__state()')==before,kind
  touches.append(kind)
 cdp.send('Emulation.setTouchEmulationEnabled',{'enabled':False})
 # Keyboard identification for all eight panel controls.
 page.evaluate("__setup('Y-4');__serienDiagnostics.placeTrain(0,'T12',150)")
 keyboard=[]
 for index,id in enumerate(ids):
  before=page.evaluate('__state()');page.keyboard.press('Tab');page.locator(f'[data-switch="{index}"]').focus()
  assert page.evaluate('__hoverId()')==id;assert page.evaluate('__state()')==before;keyboard.append(id)
 # Real visible scenery blocks picking without modifying track geometry.
 page.evaluate("__setup('Y-R1')");point=page.evaluate("__aim('Y-R1')");before=page.evaluate('__state()')
 page.evaluate('''()=>{const T=__s2.THREE,p=__serienProfile,target=p.controls.target;
 const mesh=new T.Mesh(new T.BoxGeometry(100,15,100),new T.MeshBasicMaterial());mesh.position.set(target.x,35,target.z);p.scene.add(mesh);window.__occluder=mesh;}''')
 page.mouse.click(point['x'],point['y']);assert page.evaluate('__state()')==before
 page.evaluate('__occluder.removeFromParent();__occluder.geometry.dispose();__occluder.material.dispose();delete window.__occluder')
 # Locomotive selection remains a physical hit, not a turnout command.
 point=page.evaluate('''()=>{const p=__serienProfile,T=__s2.THREE,t=p.trains[0].group.position;
 document.querySelector('[data-train="2"]').click();p.controls.target.set(t.x,t.y+10,t.z);p.camera.position.set(t.x+100,t.y+310,t.z+150);p.controls.update();p.camera.updateMatrixWorld();p.effects.render(false);
 const v=new T.Vector3(t.x,t.y+10,t.z).project(p.camera),r=p.renderer.domElement.getBoundingClientRect();return {x:r.left+(v.x+1)/2*r.width,y:r.top+(1-v.y)/2*r.height};}''')
 page.mouse.click(point['x'],point['y']);assert page.evaluate('__serienDiagnostics.snapshot().consoles.active')==0
 # All picking resources are off-scene, and dispose is idempotent/inert.
 resources=page.evaluate('''()=>{let geometries=0,materials=0;const root=__s2.picking.root;
 root.children.forEach(m=>m.geometry.addEventListener('dispose',()=>geometries++));root.children[0].material.addEventListener('dispose',()=>materials++);
 const before={regions:root.children.length,parent:root.parent===null,render:__serienDiagnostics.snapshot().render};
 __s2.interaction.dispose();__s2.interaction.dispose();__s2.picking.dispose();__s2.picking.dispose();return {before,geometries,materials,remaining:root.children.length,active:__serienDiagnostics.turnoutInteractionState().active};}''')
 assert resources['before']['parent'] and resources['before']['regions']==8
 assert resources['geometries']==8 and resources['materials']==1 and resources['remaining']==0 and resources['active'] is None
 result={'result':'PASS','hoverBidirectional':hover,'zoomClicks':zoomCases,'physicalBranches':branches,'rejectedMouseGestures':gestures,'touchCDP':touches,'keyboard':keyboard,'occlusion':True,'locomotiveSelection':True,'resources':resources,'errors':errors,'failedRequests':failed,'hardwareTouch':'NOT VERIFIED; Chromium touch emulation'}
 assert not errors and not failed,result
 (out/'interaction.json').write_text(json.dumps(result,indent=2)+'\n');print('S2 interaction PASS',flush=True);b.close()
