"""S4 actual commands, B identity, live Journey direction, motion preference,
unknown suppression, depth and resource lifecycle. Temporary S4 profile only.
"""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('S4_OUTPUT','turnout-s4-browser'));out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader']);page=b.new_page(viewport={'width':960,'height':820});errors=[];failed=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);page.on('requestfailed',lambda r:failed.append(r.url))
 page.add_init_script('let seed=516;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);')
 page.route('**/dist/game.js*',lambda r:r.fulfill(path=os.environ['S4_BUNDLE'],content_type='application/javascript'))
 page.goto(os.environ.get('SERIEN_URL','http://127.0.0.1:8003/')+'?diagnostics=1',wait_until='domcontentloaded',timeout=120000);page.wait_for_function('__s4',timeout=180000)
 page.evaluate('''()=>{const p=__serienProfile,api=__serienDiagnostics,a=__s4.arrows,$=id=>document.getElementById(id);p.stop();$('pause').click();$('quality').value='low';$('quality').dispatchEvent(new Event('change'));
 window.__setup=()=>{api.setSwitches([]);['T12','T0','T16'].forEach((e,i)=>api.placeTrain(i,e,150));__s3.interaction.clear();a.update(performance.now(),true);a.update(performance.now()+500);};
 window.__settle=()=>{a.update(performance.now(),true);a.update(performance.now()+500);__s3.glow.update(performance.now()+200);p.effects.render(false);p.renderer.getContext().finish();return a.snapshot;};
 window.__state=()=>{const s=api.snapshot();return {controls:s.switchIndicators.states.map(c=>[c.id,c.on]),stock:s.stock.map(t=>({journey:t.journey,speed:t.speed,velocity:t.velocity,dir:t.dir,odometer:t.odometer}))};};
 __setup();}''')
 assert page.evaluate('__s3.glow.snapshot.variant')=='B','Official default must be approved B'
 ids=page.evaluate('__s4.switchSpecs.map(c=>c.id)');commands=[]
 for index,id in enumerate(ids):
  page.evaluate('__setup()');before=page.evaluate('__state()');page.locator(f'[data-switch-hover="{index}"]').hover();snap=page.evaluate('__settle()')
  assert page.evaluate('__s3.glow.snapshot.active')==id and page.evaluate('__s3.glow.snapshot.variant')=='B';assert page.evaluate('__state()')==before
  for origin in ['panel','device']:
   value=page.evaluate('''({id,origin})=>{const api=__serienDiagnostics,result=api.requestToggle(id,origin);__s4.arrows.update(performance.now(),true);return {result,view:__s4.arrows.snapshot.units.find(u=>u.id===id),oracle:api.turnoutView(id).activePaths.map(p=>p.edge)};}''',dict(id=id,origin=origin))
   assert value['result']['changed'] and value['view']['progress']==0,value
   assert [p['edge'] for p in value['view']['paths']]==value['oracle'];commands.append([id,origin,value['result']['on']])
  print('commands and B hover',id,'PASS',flush=True)
 # Actual moving locomotive, both states and all four ports of both WX devices.
 page.evaluate("document.querySelector('[data-train=\"0\"]').click();for(let i=0;i<5;i++)document.getElementById('uncouple').click();")
 directions=[]
 for id in ['WX-A','WX-B']:
  for on in [False,True]:
   for port in ['UL','UR','LL','LR']:
    value=page.evaluate('''({id,on,port})=>{__setup();const s=__s4,p=__serienProfile,api=__serienDiagnostics,c=p.network.controllers.find(c=>c.id===id),incoming=p.network.nodes[c.ports[port]].find(e=>!c.internal.includes(e.edge)),edge=p.network.edges[incoming.edge],states=on?[id]:[];if(edge.switchId&&edge.requiredState)states.push(edge.switchId);api.setSwitches(states);const direction=incoming.end?1:-1,j=new s.Journey(p.network,edge.id,incoming.end?edge.length:0);if(!j.move(-direction*120,0,s.route))throw Error('Cannot place approach');const location=j.locate(),segment=j.segments.find(v=>j.position>=v.start&&j.position<=v.end),motion=direction*segment.sign;api.placeTrain(0,location.edge,location.s,motion);s.trains[0].velocity=motion*25;
     const before=JSON.stringify(s.trains[0].journey);s.arrows.update(performance.now()+500,true);const local=s.model.read(id,on,{incomingEdge:edge.id,incomingEnd:incoming.end,choose:s.route}),actual=s.arrows.snapshot.units.find(u=>u.id===id);s.trains[0].velocity=0;
     return {local,actual,journeyUnchanged:before===JSON.stringify(s.trains[0].journey)};}''',dict(id=id,on=on,port=port))
    assert value['journeyUnchanged'] and not value['local']['unknown'],value
    route=value['local']['approach'];actual=value['actual'];assert len(actual['paths'])==2
    assert next(p for p in actual['paths'] if p['edge']==route['edge'])['sign']==route['sign'],value
    directions.append([id,on,port,route['edge'],route['sign']])
 # Settle on one clock and re-enter the row after diagnostic clear(); a
 # stationary pointer cannot emit another pointerenter by itself.
 # Occupied: identification still works, rejection cannot restart route reveal.
 page.evaluate("__setup();__serienDiagnostics.placeTrain(0,'TO4:AB',100);");page.mouse.move(5,5);page.locator('[data-switch-hover="7"]').hover();before=page.evaluate('__settle()');rejected=page.evaluate("['panel','device'].map(o=>__serienDiagnostics.requestToggle('Y-4',o))");after=page.evaluate('__settle()')
 assert all(not r['changed'] and r['reason']=='occupied' for r in rejected);assert before==after,{'before':before,'after':after,'rejected':rejected};assert page.evaluate('__s3.glow.snapshot.active')=='Y-4'
 # Unknown is never rendered as a fictitious valid route.
 unknown=page.evaluate("()=>{const c=__s4.switchSpecs.find(c=>c.id==='WX-A'),old=c.on;c.on=null;__s4.arrows.update(performance.now(),true);const v=__s4.arrows.snapshot.units.find(u=>u.id===c.id);c.on=old;return v;}");assert unknown['unknown'] and not unknown['paths']
 page.emulate_media(reduced_motion='reduce');page.wait_for_function('__s4.arrows.snapshot.reducedMotion');page.evaluate('__setup();__serienDiagnostics.setSwitches(["WX-A"]);__s4.arrows.update(performance.now(),true)');assert page.evaluate('__s4.arrows.snapshot.units.every(u=>u.progress===1)')
 page.emulate_media(reduced_motion='no-preference');page.wait_for_function('!__s4.arrows.snapshot.reducedMotion')
 # A solid foreground object must occlude the red shader, including both heads.
 depth=page.evaluate('''()=>{__setup();const p=__serienProfile,T=__s3.THREE,a=__s4.arrows,c=p.network.controllers.find(c=>c.id==='Y-IN');p.controls.enableDamping=false;p.controls.target.set(c.x,0,c.z);p.camera.position.set(c.x+50,300,c.z+250);p.controls.update();const box=new T.Mesh(new T.BoxGeometry(500,50,500),new T.MeshBasicMaterial({color:'#655b4c'}));box.position.set(c.x,35,c.z);p.scene.add(box);const saved=a.root.children.map(m=>m.visible);a.root.children.forEach(m=>{m.visible=m.visible&&c.internal.includes(m.name);});const render=()=>{p.effects.render(false);p.renderer.getContext().finish();return p.renderer.domElement.toDataURL();};a.root.visible=false;const off=render();a.root.visible=true;const on=render();box.removeFromParent();box.geometry.dispose();box.material.dispose();a.root.children.forEach((m,i)=>m.visible=saved[i]);return off===on;}''');assert depth
 # Both selected pairs upload once, then repeated state changes reuse all buffers.
 resources=page.evaluate('''()=>{const p=__serienProfile,a=__s4.arrows,api=__serienDiagnostics,all=__s4.switchSpecs.map(c=>c.id);__setup();p.renderFixed();const cycle=()=>{for(const ids of [all,[]]){api.setSwitches(ids);a.update(performance.now()+500,true);p.effects.render(false);}p.renderer.getContext().finish();};cycle();const before={...p.renderer.info.memory,programs:p.renderer.info.programs.length};for(let i=0;i<3;i++)cycle();const after={...p.renderer.info.memory,programs:p.renderer.info.programs.length};let geometries=0,materials=0;for(const mesh of a.root.children)mesh.geometry.addEventListener('dispose',()=>geometries++);for(const mat of new Set(a.root.children.map(m=>m.material)))mat.addEventListener('dispose',()=>materials++);a.dispose();a.dispose();p.effects.render(false);p.renderer.getContext().finish();return {before,after,disposed:{...p.renderer.info.memory,programs:p.renderer.info.programs.length},geometries,materials,removed:a.root.parent===null};}''')
 assert resources['before']==resources['after'] and resources['geometries']==20 and resources['materials']==8 and resources['removed'],resources
 assert resources['disposed']['geometries']==resources['after']['geometries']-20,resources
 materialReader="async()=>{const list=new Set();__serienProfile.scene.traverse(o=>{if(o.isMesh&&!Array.isArray(o.material)&&(o.material.name==='Weathered rail web / polished running head'||o.material.bumpScale===.22))list.add(o.material)});\n   const digest=async a=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(a.buffer,a.byteOffset,a.byteLength)))].map(x=>x.toString(16).padStart(2,'0')).join(''),result=[];\n   for(const m of list){const textures={};for(const key of ['map','roughnessMap','bumpMap'])if(m[key]){const im=m[key].image;let data=im.data;if(!data&&im.getContext)data=im.getContext('2d').getImageData(0,0,im.width,im.height).data;textures[key]={width:im.width,height:im.height,sha256:data?await digest(data):null};}result.push({name:m.name,type:m.type,color:m.color.toArray(),roughness:m.roughness,metalness:m.metalness,bumpScale:m.bumpScale,vertexColors:m.vertexColors,textures});}return result.sort((a,b)=>a.name.localeCompare(b.name));}"
 materialAfter=page.evaluate(materialReader);page.close()
 reference=b.new_page();reference.add_init_script('let seed=516;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);');reference.route('**/dist/game.js*',lambda r:r.fulfill(path=os.environ['S3_BASELINE_BUNDLE'],content_type='application/javascript'));reference.goto(os.environ.get('SERIEN_URL','http://127.0.0.1:8003/')+'?diagnostics=1',wait_until='domcontentloaded',timeout=120000);reference.wait_for_function('__serienProfile',timeout=180000);reference.evaluate('__serienProfile.stop()');materialBefore=reference.evaluate(materialReader);assert len(materialBefore)>=2 and materialBefore==materialAfter;reference.close()
 assert not errors and not failed,(errors,failed)
 result={'result':'PASS','railMaterialsAndTexturesUnchanged':True,'materialSignatures':materialAfter,'commands':commands,'blueBDefaultAndHoverAll8':True,'WXDirections':directions,'occupiedRejectionKeepsRoutes':True,'unknownSuppression':True,'reducedMotion':True,'depthExact':depth,'resources':resources,'errors':errors,'failedRequests':failed,'physicalGPUAndTouch':'NOT VERIFIED'}
 (out/'arrows-browser.json').write_text(json.dumps(result,indent=2)+'\n');print('S4 browser PASS',flush=True);b.close()
