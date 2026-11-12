import json,re,hashlib,subprocess
from pathlib import Path
from urllib.parse import urlsplit,unquote
root=Path(__file__).resolve().parents[5];ev=root/'docs/_active/ui-v21/evidence/U9'
html=(root/'index.html').read_text();workflow=(root/'.github/workflows/pages.yml').read_text();styles=re.findall(r'<link[^>]*href="([^"?]+)(?:\?[^\"]*)?"[^>]*>',html)
refs=[]
for css in styles:
 if not css.endswith('.css'):continue
 p=(root/css).resolve();refs.append(p)
 for url in re.findall(r'url\([\'\"]?([^\)\'\"]+)',p.read_text()):
  if not unquote(url).startswith(('data:','http:','https:','#')):refs.append((p.parent/url).resolve())
for url in re.findall(r'href="([^"]+)"',(root/'src/ui/shell.js').read_text()):
 if url.startswith('./ui/'):refs.append((root/url.split('#')[0]).resolve())
refs=sorted(set(refs));print('Missing checkout references:',[str(p)for p in refs if not p.is_file()]);copied=lambda p:p.parts[0] in ['dist','assets','docs'] or str(p) in ['index.html','style.css','auth-gate.js','auth-gate-core.js','legacy-v0.1.html','.nojekyll']
rows=[{'path':str(p.relative_to(root)),'existsInCheckout':p.is_file(),'includedByCurrentWorkflow':copied(p.relative_to(root)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest() if p.is_file() else None}for p in refs]
assert all(x['existsInCheckout'] for x in rows)
assert any(not x['includedByCurrentWorkflow'] for x in rows)
assert 'cp -R dist assets _site/' in workflow and 'cp -R dist assets ui _site/' not in workflow
r={'status':'RELEASE_BLOCKED','uiCodeAcceptance':'separate from deployable package','workflow':'.github/workflows/pages.yml','workflowSHA256':hashlib.sha256((root/'.github/workflows/pages.yml').read_bytes()).hexdigest(),'workflowUnchangedSinceU8':subprocess.check_output(['git','show','30c56aa:.github/workflows/pages.yml'],cwd=root)==(root/'.github/workflows/pages.yml').read_bytes(),'directCSSAndAssetClosure':rows,'missingFromPackage':[x['path']for x in rows if not x['includedByCurrentWorkflow']],'minimumProposedFutureDelta':'In Prepare site change cp -R dist assets _site/ to cp -R dist assets ui _site/. Requires separate authorization; not applied.','blockers':[{'id':'REL-001','severity':'release-blocker','file':'.github/workflows/pages.yml','reason':'Prepare site omits ui/ including all five runtime CSS copies, fonts and textures; dist/game.js does not embed these assets.'}],'otherRisks':['Workflow copies all docs including large audit evidence; monitor Pages artifact size before release. No workflow change authorized.'],'paths':'HTML/CSS uses relative ./ui and ../fonts / ../assets; compatible with a /SerieN/ prefix once ui/ included. Live deployment NOT VERIFIED.','externalFonts':'No remote @import in runtime CSS. Auth network is an explicit preexisting boundary; live OAuth NOT VERIFIED.','deploymentPerformed':False}
(ev/'release-readiness.json').write_text(json.dumps(r,indent=2)+'\n');print('PASS audit; RELEASE_BLOCKED REL-001; missing',len(r['missingFromPackage']),'required files from current workflow')
