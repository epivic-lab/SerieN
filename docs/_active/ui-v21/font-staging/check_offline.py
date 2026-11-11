"""Isolated font loading evidence. Does not load the simulator or alter tests."""
from pathlib import Path
import json,base64
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent;m=json.loads((root/'manifest.json').read_text());r={'offline':True,'method':'Chromium FontFace from local ArrayBuffer, context offline, all network aborted','networkAttempts':[],'pageErrors':[],'console':[],'fonts':[]}
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);r['browser']=b.version;c=b.new_context(offline=True,viewport={'width':1100,'height':450});p=c.new_page()
 def stop(q):r['networkAttempts'].append(q.request.url);q.abort()
 p.route('**/*',stop);p.on('pageerror',lambda e:r['pageErrors'].append(str(e)));p.on('console',lambda e:r['console'].append({'type':e.type,'text':e.text}))
 p.set_content('<html><body style="background:#15271d;color:#edd7a4;padding:25px"><h1 style="font:18px system-ui">PRE-U1 — isolated offline font specimen</h1><main></main></body></html>')
 for f in m['fonts']:
  result=p.evaluate('''async f=>{const bytes=Uint8Array.from(atob(f.data),c=>c.charCodeAt(0));const face=new FontFace(f.family,bytes.buffer,{weight:String(f.weight),style:'normal'});await face.load();document.fonts.add(face);await document.fonts.ready;const node=document.createElement('p');node.style.fontFamily='"'+f.family+'"';node.style.fontWeight=String(f.weight);node.style.fontSize='30px';node.style.fontSynthesis='none';node.textContent=f.family+' '+f.weight+' — SerieN 0123456789 ÀÉàèìòù';document.querySelector('main').append(node);return {family:f.family,weight:f.weight,status:face.status,check:document.fonts.check(f.weight+' 30px "'+f.family+'"'),computedFamily:getComputedStyle(node).fontFamily,computedWeight:getComputedStyle(node).fontWeight};}''',{'family':f['family'],'weight':f['weight'],'data':base64.b64encode((root/f['woff2']['file']).read_bytes()).decode()});r['fonts'].append(result)
 p.screenshot(path=str(root/'offline-specimen.png'));b.close()
r['status']='PASS' if len(r['fonts'])==3 and all(f['status']=='loaded' and f['check'] and f['computedWeight']==str(f['weight']) for f in r['fonts']) and not r['pageErrors'] and not r['networkAttempts'] else 'FAIL'
(root/'offline-validation.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r,indent=2))
if r['status']!='PASS':raise SystemExit(1)
