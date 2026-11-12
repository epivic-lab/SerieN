import pathlib,json,urllib.request,urllib.error,hashlib,concurrent.futures,datetime,time
E=pathlib.Path('work/release-v21/evidence');stamp=str(time.time_ns())
manifest=json.loads(pathlib.Path('docs/_active/ui-v21/evidence/REL002/manifest-rel002.json').read_text())
excluded=['docs/_active/ui-v21/U9_REPORT.md','docs/_active/ui-v21/evidence/U9/results.json','docs/_active/ui-v21/evidence/REL002/manifest-rel002.json','docs/_active/turnouts/STATUS.md','docs/phase-5d/FINAL_GATES.json','docs/supabase/alignment/S3.md','docs/turnouts/FINAL_REPORT.md','src/canonical-layout.json','app.js','package.json','RELEASE_V21_FINAL_REPORT.md']
def get(path):
 url='https://epivic-lab.github.io/SerieN/'+urllib.parse.quote(path,safe='/')+'?release-v21='+stamp
 req=urllib.request.Request(url,headers={'Cache-Control':'no-cache','Pragma':'no-cache','Accept-Encoding':'identity'})
 row={'path':path,'expectedStatus':200 if path in manifest else 404}
 try:
  with urllib.request.urlopen(req,timeout=25) as r:
   data=r.read();row.update(status=r.status,bytes=len(data),sha256=hashlib.sha256(data).hexdigest(),headers={k:v for k,v in r.headers.items() if k.lower() in ['date','etag','last-modified','age','x-cache','content-type','content-length']})
 except urllib.error.HTTPError as e:row['status']=e.code
 except Exception as e:row['error']=str(e)
 row['pass']=row.get('status')==row['expectedStatus'] and (path not in manifest or all(row[k]==manifest[path][k] for k in ['bytes','sha256']))
 return row
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool: rows=list(pool.map(get,list(manifest)+excluded))
assets=[r for r in rows if r['path'] in manifest]; exclusions=[r for r in rows if r['path'] not in manifest]
result={'capturedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':'https://epivic-lab.github.io/SerieN/','releaseSHA':'d77b8aa2710fa474fdb069b204705364b4a9e7e6','provenance':'New HTTP GET of every approved REL002 path; cache-busting query, no-cache request and exact content comparison; no local fallback','expectedFileCount':97,'expectedBytes':4491628,'checkedFiles':len(assets),'matchingFiles':sum(r['pass'] for r in assets),'servedBytes':sum(r.get('bytes',0) for r in assets),'publicDocuments':sum(r['path'].startswith('docs/') for r in assets),'excludedPathsChecked':len(exclusions),'expected404':sum(r['pass'] for r in exclusions),'status':'PASS' if all(r['pass'] for r in rows) else 'FAIL','files':assets,'excluded':exclusions}
(E/'public-assets.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k not in ['files','excluded']},indent=2))
for r in rows:
 if not r['pass']: print(json.dumps(r))
raise SystemExit(0 if result['status']=='PASS' else 1)
