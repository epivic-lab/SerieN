"""DOM adapter contract test only; callback counters do not claim railway validation."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('U5_LIFECYCLE_OUTPUT','work/u5-lifecycle'));out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);p=b.new_page();p.route('**/u5-lifecycle.html',lambda r:r.fulfill(content_type='text/html',body='<html></html>'));p.goto('http://127.0.0.1:8033/u5-lifecycle.html')
 p.set_content('<section class="u5-dock"><button id="reset">Reset</button><div id="tabs"></div><div id="trainDeck" tabindex="0"></div></section>')
 p.evaluate("""async()=>{const {mountDock}=await import('/src/ui/dock.js'),{mountKeyboard}=await import('/src/ui/keyboard.js');
 window.fleet=[{id:0}],window.generation=0,window.resets=0,window.stops=0;
 window.mount=()=>{window.dock=mountDock({host:document.getElementById('trainDeck'),tabs:document.getElementById('tabs'),button:document.getElementById('reset'),getTrains:()=>fleet,getSelected:()=>0,onSelect:()=>{},getGeneration:()=>generation,onReset:()=>{resets++;generation++}});window.keys=mountKeyboard({onStop:()=>stops++})};mount();}""")
 p.locator('#reset').click();p.evaluate('generation++');p.locator('[data-confirm]').click();assert p.evaluate('resets')==0
 p.locator('#reset').click();p.evaluate('fleet=[{id:0}]');p.locator('[data-confirm]').click();assert p.evaluate('resets')==0
 p.locator('#reset').click();p.evaluate('dock.dispose()');assert p.locator('dialog').count()==0 and p.evaluate('resets')==0
 p.locator('#reset').click();assert p.locator('dialog').count()==0
 p.evaluate('keys.dispose()');p.locator('#trainDeck').focus();p.keyboard.press('Space');assert p.evaluate('stops')==0
 p.evaluate('mount()');p.locator('#trainDeck').focus();p.keyboard.down('Space');p.keyboard.down('Space');p.keyboard.up('Space');assert p.evaluate('stops')==1
 p.locator('#reset').click();p.evaluate('()=>{const b=document.querySelector("[data-confirm]");b.click();b.click()}');assert p.evaluate('resets')==1
 p.evaluate('dock.dispose();keys.dispose()');assert p.locator('.u5-carousel-nav').count()==0
 (out/'results.json').write_text(json.dumps({'status':'PASS','scope':'DOM adapter lifecycle and callback boundary only','checks':['obsolete generation rejected','replaced identity rejected','pending dispose no callback','removed reset handler inert','keyboard removed and remounted once','held Space one callback','double confirm one callback','navigation/dialog cleanup']},indent=2));b.close()
