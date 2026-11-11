"""U1 isolated fixture validator; no app boot or historical test changes."""
from pathlib import Path
from urllib.parse import urlparse,unquote
import json,hashlib,mimetypes
from playwright.sync_api import sync_playwright
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[4];BASE='http://127.0.0.1:8012';URL=BASE+'/docs/_active/ui-v21/evidence/U1/fixture.html'
manifest=json.loads((HERE/'asset-manifest.json').read_text());fm=json.loads((ROOT/'ui/fonts/manifest.json').read_text());r={'status':'IN_PROGRESS','http':{},'offline':{},'files':[]}
for p in sorted((ROOT/'ui').rglob('*')):
 if p.is_file():r['files'].append({'path':str(p.relative_to(ROOT)),'size':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);r['chromium']=b.version
 for mode in ['http','offline']:
  c=b.new_context(viewport={'width':1440,'height':900},offline=mode=='offline');p=c.new_page();e={'requests':[],'responses':[],'external':[],'pageErrors':[],'consoleErrors':[],'failedRequests':[]}
  def route(q):
   u=urlparse(q.request.url)
   if u.netloc!='127.0.0.1:8012':e['external'].append(q.request.url);q.abort();return
   if mode=='http':q.continue_();return
   f=(ROOT/unquote(u.path).lstrip('/')).resolve()
   if ROOT not in f.parents or not f.is_file():q.fulfill(status=404,body='missing');return
   q.fulfill(status=200,body=f.read_bytes(),content_type=mimetypes.guess_type(f.name)[0] or 'application/octet-stream')
  p.route('**/*',route);p.on('request',lambda q:e['requests'].append({'url':q.url,'type':q.resource_type}));p.on('response',lambda q:e['responses'].append({'url':q.url,'status':q.status}));p.on('pageerror',lambda q:e['pageErrors'].append(str(q)));p.on('console',lambda q:e['consoleErrors'].append(q.text) if q.type=='error' else None);p.on('requestfailed',lambda q:e['failedRequests'].append({'url':q.url,'failure':q.failure}))
  p.goto(URL,wait_until='networkidle');p.evaluate('document.fonts.ready');p.wait_for_timeout(850)
  e['order']=p.locator('link[rel=stylesheet]').evaluate_all('(es)=>es.map(e=>e.dataset.order)')
  e['fontFaces']=p.evaluate('Array.from(document.fonts).map(f=>({family:f.family,weight:f.weight,status:f.status}))')
  e['typography']=p.evaluate("['font-cinzel','font-federo','font-cutive'].map(id=>{const s=getComputedStyle(document.getElementById(id));return {id,family:s.fontFamily,weight:s.fontWeight,synthesis:s.fontSynthesis}})")
  # Compare identical specimens with/without legacy sheet: detect accidental legacy leaks.
  script="""()=>Object.fromEntries(['header-tm','card-normal','card-selected','card-disabled','font-cinzel','font-federo','font-cutive'].map(id=>{const s=getComputedStyle(document.getElementById(id));return [id,Object.fromEntries(['fontFamily','fontWeight','fontSize','color','backgroundImage','borderTopWidth','borderTopStyle','borderRadius','paddingTop','paddingLeft','boxShadow','opacity'].map(k=>[k,s[k]]))]}))"""
  before=p.evaluate(script);p.locator('link[data-order=legacy]').evaluate('(e)=>e.disabled=true');after=p.evaluate(script);p.locator('link[data-order=legacy]').evaluate('(e)=>e.disabled=false');e['cascadeDifferences']=[{'id':id,'property':k,'withLegacy':v,'withoutLegacy':after[id][k]} for id,s in before.items() for k,v in s.items() if v!=after[id][k]];e['computed']=before
  e['overflow']=p.evaluate('({page:document.documentElement.scrollWidth>innerWidth,height:document.documentElement.scrollHeight})')
  p.screenshot(path=str(HERE/(mode+'-1440x900.png')),full_page=True)
  if mode=='http':
   e['inventoryHTTP']=[{'path':v['path'],'status':c.request.get(BASE+'/'+v['path']).status} for v in r['files']]
  e['checks']={'order':e['order']==['legacy','tokens-v1','css-v1','tokens-tm','css-tm','integration'],'noExternal':not e['external'],'local200':all(a['status']==200 for a in e['responses']) and all(a['status']==200 for a in e.get('inventoryHTTP',[])),'fontsLoaded':len(e['fontFaces'])==3 and all(f['status']=='loaded' for f in e['fontFaces']),'weights':[t['weight'] for t in e['typography']]==['700','400','400'],'families':all(n in t['family'] for n,t in zip(['Cinzel Decorative','Federo','Cutive Mono'],e['typography'])),'noSynthetic':all(t['synthesis']=='none' for t in e['typography']),'noScripts':all(q['type']!='script' for q in e['requests']),'noErrors':not e['pageErrors'] and not e['consoleErrors'] and not e['failedRequests'],'noOverflow':not e['overflow']['page']}
  r[mode]=e;c.close()
 b.close()
r['status']='PASS' if all(all(e['checks'].values()) for e in [r['http'],r['offline']]) else 'FAIL'
(HERE/'fixture-results.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps({m:{'checks':r[m]['checks'],'cascade':r[m]['cascadeDifferences']} for m in ['http','offline']},indent=2))
if r['status']!='PASS':raise SystemExit(1)
