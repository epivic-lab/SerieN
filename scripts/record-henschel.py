"""Record genuine canvas motion against localhost; no synthesized animation."""
import base64, json, os
from pathlib import Path
from playwright.sync_api import sync_playwright

out=Path('work/henschel-l01');out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH'))
    page=browser.new_page(viewport={'width':1280,'height':900},service_workers='block')
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.route('**/auth-gate.js*',lambda r:r.fulfill(content_type='text/javascript',body="document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;await import('./dist/game.js');"))
    page.goto(os.environ.get('SERIEN_URL','http://127.0.0.1:8000/')+'?scenario=v06&diagnostics=1',wait_until='domcontentloaded')
    page.wait_for_function('!!window.__serienDiagnostics',timeout=150000)
    loco=page.evaluate("()=>__serienDiagnostics.addTrain('henschel-dhg-500-c')")
    page.evaluate("id=>__serienDiagnostics.placeTrain(id,'V06-P060',155)",loco)
    page.locator(f'[data-console-train="{loco}"] .trainConsoleSelect').click()
    page.evaluate("()=>{for(const [id,value] of [['quality','low'],['cameraView','follow']]){const e=document.getElementById(id);e.value=value;e.dispatchEvent(new Event('change'));}}")
    page.evaluate('document.activeElement.blur()')
    page.keyboard.down('a');page.wait_for_timeout(450);page.keyboard.up('a')
    page.keyboard.down('ArrowDown');page.wait_for_timeout(650);page.keyboard.up('ArrowDown')
    page.keyboard.down('ArrowRight');page.wait_for_timeout(2600);page.keyboard.up('ArrowRight')
    result=page.evaluate("""async()=>{
      const read=()=>{const s=__serienDiagnostics.snapshot().stock.find(t=>t.modelKey==='henschel-dhg-500-c');return {odometer:s.odometer,velocity:s.velocity,wheels:s.animation.wheels};};
      const stream=document.querySelector('#view3d canvas').captureStream(24),chunks=[];
      const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8'});
      recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      const stopped=new Promise(resolve=>recorder.onstop=resolve);
      const before=read();recorder.start();
      const throttle=document.querySelector('.trainConsole.is-active input.thr');throttle.value='12';throttle.dispatchEvent(new Event('input',{bubbles:true}));
      await new Promise(r=>setTimeout(r,2500));const forward=read();
      document.querySelector('.trainConsole.is-active [data-command="reverse"]').click();
      await new Promise(r=>setTimeout(r,3500));const reverse=read();
      document.querySelector('.trainConsole.is-active [data-command="stop"]').click();
      await new Promise(r=>setTimeout(r,500));recorder.stop();await stopped;stream.getTracks().forEach(t=>t.stop());
      const url=await new Promise(resolve=>{const f=new FileReader();f.onload=()=>resolve(f.result);f.readAsDataURL(new Blob(chunks,{type:'video/webm'}));});
      return {before,forward,reverse,stopped:read(),dataURL:url};
    }""")
    assert result['forward']['odometer']>result['before']['odometer']
    assert result['reverse']['velocity']<0
    assert result['reverse']['odometer']<result['forward']['odometer']
    assert result['stopped']['velocity']==0
    assert not errors,errors
    (out/'motion.webm').write_bytes(base64.b64decode(result.pop('dataURL').split(',',1)[1]))
    (out/'motion.json').write_text(json.dumps(result,indent=2)+'\n')
    page.screenshot(path=str(out/'motion-poster.png'))
    browser.close()
print('PASS real-time forward/reverse/stop recording')
