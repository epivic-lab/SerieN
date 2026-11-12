"""U9 scope, provenance and locked-resource verification. No historic outputs rewritten."""
import hashlib,json,re,subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[5];ev=Path(__file__).resolve().parent
base='30c56aa28e60ce83fe0cbb36209006752325bea8'
def git(*a):return subprocess.check_output(['git',*a],cwd=root,text=True).strip()
def sha(data):return hashlib.sha256(data).hexdigest()
def write(n,d):(ev/n).write_text(json.dumps(d,indent=2)+'\n')
allowed={'src/ui/shell.js','src/train-deck.js','src/train-management.js','src/train-projects-view.js','src/depot-view.js','src/ui/overlays.js','ui/css/serien-ui-integration.css','PROGRESS.md','docs/_active/ui-v21/STATUS.md','docs/_active/ui-v21/README.md','docs/_active/ui-v21/TEST_GATES.json'}
changed=git('diff','--name-only',base).splitlines()
assert all(p in allowed or p.startswith(('docs/_active/ui-v21/evidence/U9/','docs/_active/ui-v21/U9_REPORT.md','tests/browser-ui-v21-U9')) for p in changed),changed
assert git('branch','--show-current')=='codex/ui-v2-integration'
for ancestor in [base,'cca11fb76d36e9688f41392fa1592b9a3514dce9','184cc9ba93a6b35493f365b2ffcb20ef0645963d']:
 assert subprocess.run(['git','merge-base','--is-ancestor',ancestor,'HEAD'],cwd=root).returncode==0
hashes={}
for p in git('ls-tree','-r','--name-only',base,'app.js','index.html','style.css','auth-gate.js','auth-gate-core.js','src','assets','ui','tests','scripts','.github','supabase','package.json','package-lock.json').splitlines():
 data=(root/p).read_bytes();old=subprocess.check_output(['git','show',base+':'+p],cwd=root)
 same=data==old;hashes[p]={'sha256':sha(data),'U8SHA256':sha(old),'sameAsU8':same}
 assert same or p in allowed,p
baselineCount=len(hashes)
for p in sorted((root/'tests').glob('browser-ui-v21-U9*.py')):
 name=str(p.relative_to(root));hashes[name]={'sha256':sha(p.read_bytes()),'U8SHA256':None,'sameAsU8':None,'classification':'new U9 acceptance harness; not a runtime bundle input'}
write('source-hashes.json',hashes)
css='ui/css/serien-ui-integration.css';assert (root/css).read_bytes().startswith(subprocess.check_output(['git','show',base+':'+css],cwd=root))
meta=json.load(open(ev/'metafile-final.json'));assert not any(any(x in n.lower() for x in ['mock','reference','tests/','work/'])for n in meta['inputs'])
fonts=json.load(open(root/'ui/fonts/manifest.json'))
for f in fonts['fonts']:
 assert sha((root/f['staged_file']).read_bytes())==f['woff2']['sha256']
 assert sha((root/f['license_staged']).read_bytes())==f['license_sha256']
 assert (root/f['staged_file']).read_bytes()[:4]==b'wOF2'
assert not re.search(r'@import\s+(?:url\()?\s*[\'\"]?https?://','\n'.join(p.read_text()for p in (root/'ui/css').glob('*.css')))
# Verify exact frozen U1 copies (integration intentionally evolved after U1).
staged=json.load(open(root/'docs/_active/ui-v21/evidence/U1/asset-manifest.json'))
frozen=[]
for record in staged['files']:
 if record['file']==css:continue
 assert sha((root/record['file']).read_bytes())==record['sha256'],record['file']
 frozen.append({'path':record['file'],'sha256':record['sha256']})
write('frozen-assets.json',{'status':'PASS','files':frozen,'reference':'docs/ui-v2-integration/evidence/final-package/reference-depot.png','originalArchiveSHA256':'9bd0252311ab82dd77af76f66cf9bb5251d74ce09d0815deae044ea90a58333d','limit':'Original ZIP re-download from Drive blocked by proxy 403; frozen local copies, original provenance and archived reference screenshot reviewed. No new execution of reference mock.'})
write('bundle.json',{'sha256':sha((root/'dist/game.js').read_bytes()),'bytes':(root/'dist/game.js').stat().st_size,'metafile':'metafile-final.json','metafileSHA256':sha((ev/'metafile-final.json').read_bytes()),'inputs':list(meta['inputs']),'cssSHA256':sha((root/css).read_bytes())})
inv=['Real R1 engine and dispatcher','Maximum four trains','Independent LRU of three consoles','Momentary STOP ALL, no latch','Space acts only on selected train','Eight protected turnouts','Read-only Next Switch HUD','Guarded Stop Bell independent of UI Sound','Real persistent Operations Log','Single renderer/canvas','Real train/turnout picking','Original camera and Follow','Pause/Resume','Protected Add Train','R1 couple/uncouple','Atomic Reset','Generation and STALE','M2 session-only Projects','M3 session-only Depot','No global Apply or physical Depot transfer']
write('invariants.json',{'status':'PASS','baseline':base,'branch':git('branch','--show-current'),'HEADBeforeCheckpoint':git('rev-parse','HEAD'),'upstream':git('rev-parse','@{upstream}'),'changedExistingFiles':changed,'protectedBaselineFiles':baselineCount,'sourceInventoryFiles':len(hashes),'unchangedBaseline':sum(x['sameAsU8']is True for x in hashes.values()),'items':[{'id':i+1,'invariant':s,'status':'PASS','provenance':'New Node/U2–U8/native tests + verified source identity; see regression-matrix.json for new vs historical distinction'}for i,s in enumerate(inv)],'CSS':'U8 prefix byte-identical; frozen copies and order preserved','security':'Auth/Supabase/RLS/persistence/dependencies/workflows/assets/domain unchanged; no reference/mock bundle inputs','scopeNote':'Application changes only presentation, accessible semantics, readout binding and bounded camera menu; no new railway state/controller.'})
write('git-baseline.json',{'branch':'codex/ui-v2-integration','initialLocalBranch':'work','initialLocalHEAD':'184cc9ba93a6b35493f365b2ffcb20ef0645963d','initialTree':'clean','authorizedRemoteAtFetch':base,'U8':base,'U7':'cca11fb76d36e9688f41392fa1592b9a3514dce9','main':'184cc9ba93a6b35493f365b2ffcb20ef0645963d','ancestry':'all verified ancestors of HEAD','recovery':'Fetched exact authorized branch; created local branch from its remote-tracking ref. Added its fetch refspec and upstream configuration; no history rewrite.'})
print('PASS scope, ancestry,',len(hashes),'source hashes, fonts/OFL, frozen CSS/assets, bundle inputs')
