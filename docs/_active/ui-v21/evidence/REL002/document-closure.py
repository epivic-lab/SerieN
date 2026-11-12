import pathlib,re,json,urllib.parse
from html.parser import HTMLParser
R=pathlib.Path(__file__).resolve().parents[5]; seen=set(); edges=[]; missing=[]
# REL001 audit: two HTML references plus four bundled canonical-source metadata paths.
# JSON provenance strings and plain-text code/log paths are not browser links.
seeds=['docs/jmri-layout/minimap-canonical.svg','docs/consolidation/index.html','docs/jmri-layout/source.xml','docs/jmri-layout/railmodeller-original.pdf','docs/consolidation/SerieN_Dossier_Tecnico_Codex_REV_A.pdf','docs/phase-0/kato-parts.csv']
def add(s,v):
 if not v or v.startswith(('#','data:','mailto:','javascript:')):return
 u=urllib.parse.urlsplit(urllib.parse.urljoin('https://epivic-lab.github.io/SerieN/'+s,v))
 if u.netloc!='epivic-lab.github.io':return
 assert u.path.startswith('/SerieN/'),(s,v)
 p=urllib.parse.unquote(u.path[8:]) or 'index.html'
 edges.append({'source':s,'reference':v,'target':p})
 if not (R/p).is_file():missing.append((s,v,p));return
 if p not in seen:seen.add(p);scan(p)
class H(HTMLParser):
 def handle_starttag(self,t,attrs):
  for k,v in attrs:
   if k in ['href','src','poster'] or (t=='object' and k=='data'):add(self.source,v)
def scan(p):
 if pathlib.Path(p).suffix not in ['.html','.md','.css','.svg']:return
 text=(R/p).read_text()
 if p.endswith(('.html','.svg')):
  h=H();h.source=p;h.feed(text)
 if p.endswith('.md'):
  text=re.sub(r'```.*?```','',text,flags=re.S)
  for v in re.findall(r'!?\[[^\]]*\]\(([^\s)]+)(?:\s+[^)]*)?\)',text):add(p,v)
 for v in re.findall(r'''(?:fetch\(\s*|url\(\s*)["']([^"']+)["']''',text):add(p,v)
for p in seeds:
 source='index.html' if p in seeds[:2] else 'dist/game.js'
 add(source,'/SerieN/'+p)
print('Closure',len(seen),'bytes',sum((R/p).stat().st_size for p in seen),'missing',missing)
print('\n'.join(sorted(seen)))
(pathlib.Path(__file__).parent/'document-closure.json').write_text(json.dumps({'paths':sorted(seen),'edges':edges,'missing':missing},indent=2)+'\n')
