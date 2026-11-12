from playwright.sync_api import sync_playwright
import json
with sync_playwright() as w:
 b=w.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);p=b.new_page();p.route('**/focus.html',lambda r:r.fulfill(content_type='text/html',body='<html><head><title>focus</title></head><body><button id="open">Open</button></body></html>'));p.goto('http://127.0.0.1:8035/focus.html');p.evaluate("async()=>{const {createGuardModal}=await import('/src/ui/guard-modal.js');window.g=createGuardModal();g.request({origin:document.querySelector('#open'),valid:()=>true,confirm:()=>{}})}")
 def s(n):return {'name':n,'active':p.evaluate('({tag:document.activeElement.tagName,html:document.activeElement.outerHTML.slice(0,200)})')}
 a=[s('initial')];p.keyboard.press('Shift+Tab');a.append(s('ShiftTab'));p.wait_for_timeout(100);a.append(s('settled'));p.keyboard.press('Tab');a.append(s('Tab'));p.add_script_tag(path='/workspace/work/u9/package/axe.min.js');p.evaluate('async()=>await axe.run()');a.append(s('afterAxe'));p.keyboard.press('Shift+Tab');a.append(s('afterAxeShiftTab'));print(json.dumps(a,indent=2));b.close()
