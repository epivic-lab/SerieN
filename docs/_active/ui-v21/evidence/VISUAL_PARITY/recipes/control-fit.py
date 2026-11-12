"""Check complete mission content and every visible console at all seven widths."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json,hashlib,difflib
out={'status':'RUNNING','missionCases':[],'controls':[],'method':'Real original Next Mission callback; all four states at every viewport. Local Auth bootstrap, no renderer/simulation stepping.'}
with sync_playwright() as w:
 b=w.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader']);p=b.new_page(viewport={'width':1692,'height':877},reduced_motion='reduce')
 p.route('**/auth-gate.js*',lambda r:r.fulfill(content_type='text/javascript',body="document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;await import('./dist/game.js')"))
 p.add_init_script("const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>{if(cb.toString().includes('requestAnimationFrame')&&cb.toString().includes('.render('))return 1;return raf(cb)}")
 try:
  p.goto('http://127.0.0.1:8041/?diagnostics=1');p.wait_for_function('Boolean(window.__serienDiagnostics)');p.evaluate("document.getElementById('pause').click()");p.evaluate('async()=>{await Promise.all([document.fonts.load(\'700 16px \"Cinzel Decorative\"\'),document.fonts.load(\'400 14px Federo\'),document.fonts.load(\'400 12px \"Cutive Mono\"\')]);await document.fonts.ready}')
  for width,height in [(1692,877),(1648,895),(1440,900),(1366,768),(1024,768),(390,844),(768,1024)]:
   p.set_viewport_size({'width':width,'height':height});p.wait_for_timeout(80)
   for _ in range(4):
    x=p.evaluate("""()=>{const e=document.querySelector('.m-ms>.mi'),r=e.getBoundingClientRect();return {title:document.getElementById('missionName').textContent,index:document.getElementById('missionIndex').textContent,panel:{height:r.height,client:e.clientHeight,scroll:e.scrollHeight},parts:[...e.querySelectorAll('#missionName,#missionStatus,#nextMission')].map(e=>{const a=e.getBoundingClientRect();return {id:e.id,inside:a.bottom<=r.bottom+1&&a.top>=r.top-1,client:e.clientHeight,scroll:e.scrollHeight,height:a.height}})}}""");x['viewport']=[width,height];out['missionCases'].append(x);assert all(q['inside']for q in x['parts']),x;p.evaluate("document.getElementById('nextMission').click()")
   c=p.evaluate("""()=>{const h=document.getElementById('trainDeck').getBoundingClientRect();return {width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,clipped:[...document.querySelectorAll('.trainConsole')].filter(e=>{const r=e.getBoundingClientRect();return r.left>=h.left-1&&r.right<=h.right+1}).flatMap(c=>[...c.querySelectorAll('.trainConsoleBody,.trainConsoleMeta,.trainConsoleCommands,.actualSpeed')].map(e=>{const a=e.getBoundingClientRect(),r=c.getBoundingClientRect();return {class:e.className,overflow:e.scrollHeight>e.clientHeight+1||a.bottom>r.bottom+1||a.right>r.right+1,client:e.clientHeight,scroll:e.scrollHeight}})).filter(e=>e.overflow)}}""");out['controls'].append(c);assert not c['clipped']and not c['overflow'],c
  assert len({x['title']for x in out['missionCases']})==4
  p.set_viewport_size({'width':650,'height':700});p.wait_for_timeout(80)
  native_scope=p.evaluate("()=>({viewport:[innerWidth,innerHeight],missionWidth:document.querySelector('.m-ms').getBoundingClientRect().width,missionTitleFont:getComputedStyle(document.getElementById('missionName')).fontSize})")
  R=Path('/workspace/SerieN');E=Path('/workspace/work/visual-parity/evidence');before=Path('/workspace/work/visual-parity/validated-main-before-mission-fit.css');after=R/'ui/css/serien-ui-integration.css';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
  native=json.loads((E/'native-final/results.json').read_text())
  assert sha(before)==native['cssSHA256']
  assert sha(R/'dist/game.js')==native['bundleSHA256']
  assert native_scope['missionWidth']>270 and native_scope['missionTitleFont']=='13px'
  scope={'status':'PASS','productionBundleUnchanged':sha(R/'dist/game.js'),'CSSBeforeMissionFit':sha(before),'CSSFinal':sha(after),'lastChange':'Only mission inline-size container and title/status/Next typography below 270px; no JavaScript or engine change','CSSDiff':list(difflib.unified_diff(before.read_text().splitlines(),after.read_text().splitlines(),fromfile='validated-before-mission-fit',tofile='final',lineterm='')),'nativeSuiteViewportVerifiedUnaffected':native_scope,'finalCSSChecks':'All 28 mission states and seven console/overflow cases plus full seven-viewport recapture'}
  (E/'final-scope-verification.json').write_text(json.dumps(scope,indent=2)+'\n')
  out['status']='PASS'
 except Exception as e:out['status']='FAIL';out['failure']=str(e);raise
 finally:
  b.close();Path('/workspace/work/visual-parity/evidence/control-fit.json').write_text(json.dumps(out,indent=2)+'\n')
print('PASS — 28 complete mission states and seven console/overflow checks')
