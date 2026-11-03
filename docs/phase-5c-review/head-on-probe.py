import json
from pathlib import Path
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':650,'height':760})
 page.goto('http://127.0.0.1:8000/?diagnostics=1',wait_until='domcontentloaded',timeout=120000);page.wait_for_function('window.__serienDiagnostics!==undefined',timeout=120000)
 page.evaluate("document.getElementById('pause').click();document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'))")
 r=page.evaluate('''()=>{
 const api=__serienDiagnostics,$=s=>document.querySelector(s);
 for(const id of [0,2]){$('[data-train="'+id+'"]').click();for(let k=0;k<3;k++)$('#uncouple').click();}
 api.placeTrain(0,'T47',200,1);api.placeTrain(2,'T46',110,-1);
 const initial=api.snapshot();for(const i of [0,2]){$('[data-train="'+i+'"]').click();$('#speed').value=100;$('#speed').dispatchEvent(new Event('input'));}
 const samples=[];for(let i=0;i<240;i++) {api.step(1/60);const s=api.snapshot(),ts=[s.stock[0],s.stock[2]],vs=ts.map(t=>t.vehicles[0]);
 const distance=Math.hypot(vs[0].x-vs[1].x,vs[0].z-vs[1].z),extent=(vs[0].couplers?.front?.x??38)-(vs[1].couplers?.back?.x??-38);
 const stopped=ts.every(t=>t.speed===0&&t.velocity===0);
 if(distance<extent+15||stopped)samples.push({step:i+1,distance,extent,gap:distance-extent,stopped,velocities:ts.map(t=>t.velocity),points:vs});
 if(stopped)break;}
 return {initial:[initial.stock[0],initial.stock[2]],samples};}''')
 Path('head-on-probe.json').write_text(json.dumps(r,indent=2)+'\n')
 print(json.dumps(r['samples'][-1] if r['samples'] else {}));b.close()
