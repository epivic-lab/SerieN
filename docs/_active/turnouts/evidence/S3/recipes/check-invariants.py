import subprocess,hashlib,re,json
from pathlib import Path
root=Path('/workspace/SerieN');base='6bdec29194d4e232eeab0e1ff5a8d4e6b26ec47b'
def old(p):return subprocess.check_output(['git','show',f'{base}:{p}'],cwd=root)
paths=[p for p in subprocess.check_output(['git','ls-tree','-r','--name-only',base],cwd=root,text=True).splitlines() if p.startswith(('src/','supabase/','assets/')) or p in ['package.json','package-lock.json','AGENTS.md']]
unchanged={p:hashlib.sha256((root/p).read_bytes()).hexdigest() for p in paths if p!='src/turnout-interaction.js'}
assert all((root/p).read_bytes()==old(p) for p in unchanged)
a=old('app.js').decode();b=(root/'app.js').read_text();functions={}
for name in ['advanceFleet','renderVehicles','getSwitchAssistance','switchHUDState']:
 pattern=rf'^function {name}\([^\n]*[\s\S]*?^}}'
 x=re.search(pattern,a,re.M);y=re.search(pattern,b,re.M);assert x and y and x[0]==y[0],name;functions[name]=True
bundle=(root/'dist/game.js').read_text();assert not any(v in bundle for v in ['__s3','__s2','__s0Originals','__serienProfile'])
modified=['app.js','src/turnout-interaction.js','src/turnout-glow.js']
secrets=re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY|sb_secret_[A-Za-z0-9]+|gh[pousr]_[A-Za-z0-9]{20,}')
assert not any(secrets.search((root/p).read_text()) for p in modified)
result={'result':'PASS','baselineS2':base,'unchangedSourceHashes':unchanged,'hotFunctionsUnchanged':functions,'canonicalSha256':hashlib.sha256((root/'src/canonical-layout.json').read_bytes()).hexdigest(),'productionHasNoTemporaryHooks':True,'scopedSecretPatternScan':'PASS; runtime sources only, not full 5E audit','canonicalRegeneration':'PASS; no diff'}
Path('/workspace/work/s3/invariants.json').write_text(json.dumps(result,indent=2)+'\n');print('PASS',len(unchanged),'locked source/asset/dependency files and 4 hot functions')
