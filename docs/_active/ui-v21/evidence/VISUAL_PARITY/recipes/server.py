from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit,unquote
roots={'current':Path('/workspace/SerieN'),'baseline':Path('/workspace/work/visual-parity/baseline'),'reference':Path('/workspace/work/visual-parity/reference')}
class Handler(SimpleHTTPRequestHandler):
 def translate_path(self,path):
  parts=unquote(urlsplit(path).path).strip('/').split('/')
  root=roots.get(parts[0],Path('/workspace/work/visual-parity'))
  f=(root/('/'.join(parts[1:]) or 'index.html')).resolve()
  return str(f if f.is_relative_to(root) else root/'not-found')
 def log_message(self,*args):pass
ThreadingHTTPServer(('127.0.0.1',8040),Handler).serve_forever()
