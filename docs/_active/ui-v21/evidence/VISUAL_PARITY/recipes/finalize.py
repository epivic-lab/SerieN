from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo
import json,hashlib,subprocess,shutil,re
R=Path('/workspace/SerieN');E=Path('/workspace/work/visual-parity/evidence');D=R/'docs/_active/ui-v21/evidence/VISUAL_PARITY'
read=lambda p:json.loads((E/p).read_text())
digest=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
fit=read('control-fit.json');assert fit['status']=='PASS' and len(fit['missionCases'])==28
assert read('final-scope-verification.json')['status']=='PASS'
ui,native,picking=read('ui-gate/results.json'),read('native-final/results.json'),read('picking-final/results.json')
assert all(x['status']=='PASS'for x in [ui,native,picking])
bundle=R/'dist/game.js';bundleSHA=digest(bundle)
assert native['bundleSHA256']==ui['productionBundleSHA256']==bundleSHA
assert ui['observerSHA256']==picking['observerSHA256']==digest(Path('/workspace/work/visual-parity/observer.js'))
assert 'tests 254' in (E/'node-tests-final.txt').read_text() and 'fail 0' in (E/'node-tests-final.txt').read_text()
assert 'Ran 9 tests' in (E/'python-tests-final.txt').read_text() and 'OK' in (E/'python-tests-final.txt').read_text()
assert len(read('railway-5c/docs/phase-5c-close/acceptance.json')['cases'])==11
subprocess.run(['bash','-euo','pipefail','docs/_active/ui-v21/evidence/REL002/prepare-site.sh'],cwd=R,check=True)
manifest={p.relative_to(R/'_site').as_posix():{'bytes':p.stat().st_size,'sha256':digest(p)}for p in (R/'_site').rglob('*')if p.is_file()}
assert len(manifest)==97 and sum(p.startswith('docs/')for p in manifest)==24
(E/'package-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
allowed={'index.html','src/train-deck.js','src/ui/dock.js','src/ui/overlays.js','src/ui/shell.js','src/ui/sidebar.js','ui/css/serien-ui-integration.css'}
immutable={}
for p in subprocess.check_output(['git','ls-tree','-r','--name-only','d77b8aa','--','src','assets','ui','auth-gate.js','auth-gate-core.js','supabase','package.json','package-lock.json','.github/workflows'],cwd=R,text=True).splitlines():
 if p in allowed:continue
 assert (R/p).read_bytes()==subprocess.check_output(['git','show','d77b8aa:'+p],cwd=R),p
 immutable[p]=digest(R/p)
before=subprocess.check_output(['git','show','d77b8aa:ui/css/serien-ui-integration.css'],cwd=R,text=True)
tm=before[before.index('/* U6 /'):before.index('/* U9 / CTRL-016')]
assert tm in (R/'ui/css/serien-ui-integration.css').read_text()
ref=Path('/workspace/work/visual-parity/reference/index.html');original='docs/design/main-ui-redesign/serien-mainui-v1/reference/serien-ui-reference.html'
assert ref.read_bytes()==subprocess.check_output(['git','show','cf2c29a:'+original],cwd=R)
provenance={'capturedSourcesVerifiedAtFinalization':datetime.now(ZoneInfo('Europe/Rome')).isoformat(),'reference':{'commit':'cf2c29a8112b37a53c62cb84fca44061942aea31','path':original,'htmlSHA256':digest(ref),'quality':'High selected through original reference control; three approved local WOFF2 supplied by isolated font route'},'baseline':{'commit':'d77b8aa2710fa474fdb069b204705364b4a9e7e6','bundle':digest(Path('/workspace/work/visual-parity/baseline/dist/game.js'))},'current':{'bundle':bundleSHA,'CSS':digest(R/'ui/css/serien-ui-integration.css'),'index':digest(R/'index.html')},'capture':'All seven viewports; Day0, reduced motion; real local Auth-bootstrap runtime, on-demand RAF for deterministic images; no source fallback or UI replacement.'}
(E/'capture-provenance.json').write_text(json.dumps(provenance,indent=2)+'\n')
invariants={'status':'PASS','baseline':'d77b8aa2710fa474fdb069b204705364b4a9e7e6','applicationScope':sorted(allowed|{'src/ui/speedometer.js'}),'unchangedFileCount':len(immutable),'immutableFiles':immutable,'canonicalSHA256':digest(R/'src/canonical-layout.json'),'backendAuthWorkflowsDependenciesUnchanged':True,'existingTMAdaptersBytePreserved':True,'package':{'files':97,'bytes':sum(x['bytes']for x in manifest.values()),'publicDocuments':24,'bundle':manifest['dist/game.js']}}
(E/'invariants-and-package.json').write_text(json.dumps(invariants,indent=2)+'\n')
comparison=read('comparison-results.json');reference=read('reference-measurements.json');corrected=read('current-measurements.json')
assert all(not v['overflow']and v['canvas']==1 for v in corrected['viewports'])
assert all(not read(m+'-measurements.json')['errors'] and not read(m+'-measurements.json')['networkFailures']for m in ['reference','baseline','current'])
rows=[]
for a,b,c in zip(reference['viewports'],corrected['viewports'],comparison['viewports']):
 get=lambda view,name:view['regions'][name][0]['height']
 pairs=[f'{get(a,n):.2f}/{get(b,n):.2f}'for n in ['header','viewport','dock']]
 gate='0px'if c['desktopMacroMaxErrorPx']==0 else 'Adattamento dichiarato'
 rows.append('| '+str(a['width'])+'×'+str(a['height'])+' | '+' | '.join(pairs)+' | '+gate+' |')
report=Path('/workspace/work/visual-parity/report-template.md').read_text()
replacements={'DATE':datetime.now(ZoneInfo('Europe/Rome')).strftime('%Y-%m-%d'),'PR_URL':'PENDING — creazione dopo il primo checkpoint verificato','APP_SHA':'checkpoint che introduce questa ricostruzione; SHA aggiornato dopo il commit','GEOMETRY_ROWS':'\n'.join(rows),'UI_STATES':len(ui['states']),'NATIVE_CHECKS':len(native['checks']),'NATIVE_FRAMES':len(native['frames']),'BUNDLE_BYTES':bundle.stat().st_size,'BUNDLE_SHA':bundleSHA,'PACKAGE_BYTES':invariants['package']['bytes'],'IMMUTABLE_FILES':len(immutable)}
for k,v in replacements.items():report=report.replace('{{'+k+'}}',str(v))
assert not re.search(r'\{\{[A-Z_]+\}\}',report)
D.mkdir(parents=True,exist_ok=True)
for p in E.iterdir():
 if p.is_file() and (p.suffix in ['.png','.json','.txt','.md','.log']):shutil.copyfile(p,D/p.name)
for name in ['ui-gate','native-final','picking-final','railway-5c','failures']:
 shutil.copytree(E/name,D/name,dirs_exist_ok=True)
recipes=D/'recipes';recipes.mkdir(exist_ok=True)
for name in ['server.py','capture.py','compare.py','ui-gate.py','run-suite.py','control-fit.py','build-observer.mjs','finalize.py']:shutil.copyfile(Path('/workspace/work/visual-parity/tools')/name,recipes/name)
(R/'docs/_active/ui-v21/VISUAL_PARITY_REPORT.md').write_text(report)
manifest={p.relative_to(D).as_posix():{'bytes':p.stat().st_size,'sha256':digest(p)}for p in sorted(D.rglob('*'))if p.is_file()and p.name!='evidence-manifest.json'}
(D/'evidence-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'status':'PASS','files':len(manifest),'evidenceBytes':sum(x['bytes']for x in manifest.values()),'bundle':manifest.get('build-final.txt'),'package':invariants['package'],'nativeFrames':len(native['frames']),'nativeChecks':len(native['checks']),'uiStates':len(ui['states'])},indent=2))
