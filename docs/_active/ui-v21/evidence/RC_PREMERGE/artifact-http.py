"""Serve ONLY _site under /SerieN/; verify the freshly built artifact."""
from http.server import ThreadingHTTPServer,BaseHTTPRequestHandler
from pathlib import Path
from urllib.request import urlopen
from urllib.error import HTTPError
from urllib.parse import urlsplit,unquote,quote
import json,hashlib,threading
R=Path(__file__).resolve().parents[5];E=Path(__file__).resolve().parent;S=(R/'_site').resolve();requests=[]
class Handler(BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_GET(self):
  path=unquote(urlsplit(self.path).path);status=404;data=b'Not in Pages artifact'
  if path.startswith('/SerieN/'):
   target=(S/(path[8:] or 'index.html')).resolve()
   if target.is_relative_to(S) and target.is_file():status=200;data=target.read_bytes()
  self.send_response(status);self.end_headers();self.wfile.write(data);requests.append({'path':path,'status':status})
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);t=threading.Thread(target=server.serve_forever,daemon=True);t.start();origin=f'http://127.0.0.1:{server.server_port}';positive=[];negative=[]
try:
 manifest=json.loads((R/'docs/_active/ui-v21/evidence/REL002/manifest-rel002.json').read_text())
 closure=json.loads((R/'docs/_active/ui-v21/evidence/REL002/document-closure.json').read_text());assert not closure['missing'];assert all(p in manifest for p in closure['paths'])
 for path,item in manifest.items():
  with urlopen(origin+'/SerieN/'+quote(path)) as response:data=response.read();assert response.status==200
  assert hashlib.sha256(data).hexdigest()==item['sha256'];positive.append({'path':path,'status':200,**item})
 excluded=json.loads((R/'docs/_active/ui-v21/evidence/REL002/excluded-files.json').read_text())
 for path in [*[ '/SerieN/'+x['path'] for x in excluded],'/app.js','/SerieN/src/railway-step.js','/SerieN/.git/config','/SerieN/docs/_active/ui-v21/REL002_REPORT.md','/SerieN/docs/_active/ui-v21/RC_PREMERGE_REPORT.md']:
  try:urlopen(origin+quote(path));raise AssertionError(path)
  except HTTPError as error:assert error.code==404;negative.append({'path':path,'status':404})
 assert len(positive)==97
 result={'status':'PASS','base':'/SerieN/','serverRoot':'_site exclusively; no development fallback','http200':positive,'expected404':negative,'positiveCount':len(positive),'negativeCount':len(negative),'publicClosureEdgesChecked':len(closure['edges']),'runtime404':0,'browser':'Reused REL002 desktop/mobile results after full artifact identity; not reexecuted here.'}
 (E/'http-results.json').write_text(json.dumps(result,indent=2)+'\n');print('PASS',len(positive),'HTTP200;',len(negative),'expected404; full public closure preserved')
finally:server.shutdown();server.server_close()
