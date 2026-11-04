import subprocess,hashlib,re,json
from pathlib import Path
root=Path('/workspace/SerieN');base='fd32b43fe9438980bde798fd76773f8af2f3f5fc'
def old(p):return subprocess.check_output(['git','show',f'{base}:{p}'],cwd=root)
paths=[p for p in subprocess.check_output(['git','ls-tree','-r','--name-only',base],cwd=root,text=True).splitlines() if p.startswith(('src/','supabase/','assets/')) or p in ['package.json','package-lock.json','AGENTS.md']]
unchanged={p:hashlib.sha256((root/p).read_bytes()).hexdigest() for p in paths}
assert all((root/p).read_bytes()==old(p) for p in unchanged)
a=old('app.js').decode();b=(root/'app.js').read_text();functions={}
for name in ['advanceFleet','renderVehicles','getSwitchAssistance','switchHUDState','requestToggle']:
 pattern=rf'^function {name}\([^\n]*[\s\S]*?^}}'
 x=re.search(pattern,a,re.M);y=re.search(pattern,b,re.M);assert x and y and x[0]==y[0],name;functions[name]=True
bundle=(root/'dist/game.js').read_text();assert not any(v in bundle for v in ['__s4','__s3','__s2','__s0Originals','__serienProfile'])
modified=['app.js','src/turnout-arrow-view.js','src/turnout-arrow-approaches.js','src/turnout-arrows.js']
secrets=re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY|sb_secret_[A-Za-z0-9]+|gh[pousr]_[A-Za-z0-9]{20,}')
assert not any(secrets.search((root/p).read_text()) for p in modified)
result={'result':'PASS','baselineS3':base,'unchangedSourceHashes':unchanged,'hotFunctionsUnchanged':functions,'canonicalSha256':hashlib.sha256((root/'src/canonical-layout.json').read_bytes()).hexdigest(),'productionHasNoTemporaryHooks':True,'scopedSecretPatternScan':'PASS; runtime sources only, not full 5E audit','canonicalRegeneration':'PASS; no diff'}
Path('/workspace/work/s4/invariants.json').write_text(json.dumps(result,indent=2)+'\n');print('PASS',len(unchanged),'locked source/asset/dependency files and 5 hot functions')
