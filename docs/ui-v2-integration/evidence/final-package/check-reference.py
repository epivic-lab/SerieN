from playwright.sync_api import sync_playwright
from pathlib import Path
import json
out=Path('/workspace/work/ui-v21-final');r={'scope':'independent reference smoke, not simulator regression or full interactive acceptance','pageErrors':[],'localHttpFailures':[],'externalBlocked':[],'tabs':[]}
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);p=b.new_page(viewport={'width':1440,'height':900})
 p.on('pageerror',lambda e:r['pageErrors'].append(str(e)))
 p.on('response',lambda e:r['localHttpFailures'].append({'url':e.url,'status':e.status}) if e.status>=400 and '127.0.0.1' in e.url else None)
 def route(q):
  if q.request.url.startswith('http://127.0.0.1:8011/'):q.continue_()
  else:r['externalBlocked'].append(q.request.url);q.abort()
 p.route('**/*',route)
 p.goto('http://127.0.0.1:8011/design-baseline/serien-mainui-v21/design/reference/serien-ui-v2-reference.html?tm=layout&notes=0',wait_until='networkidle')
 p.wait_for_selector('#tmD.on')
 r['tabControls']=p.locator('#tmTabs button').evaluate_all('(es)=>es.map(e=>({text:e.textContent,attrs:[...e.attributes].map(a=>[a.name,a.value])}))')
 for view in ['layout','catalog','projects','depot']:
  tab=p.locator('#tmTabs [data-view="'+view+'"]');tab.click();r['tabs'].append({'view':view,'selected':tab.get_attribute('aria-selected'),'textExcerpt':p.locator('#tmD').inner_text()[:180]})
 p.screenshot(path=str(out/'reference-depot.png'))
 r['status']='PASS' if not r['pageErrors'] and not r['localHttpFailures'] and all(t['selected']=='true' for t in r['tabs']) else 'FAIL'
 b.close()
(out/'reference-smoke.json').write_text(json.dumps(r,indent=2));print(json.dumps(r,indent=2))
