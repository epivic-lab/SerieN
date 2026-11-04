import subprocess,hashlib,json,re,os
from pathlib import Path
root=Path(os.environ.get('SERIEN_ROOT','/workspace/SerieN'));out=Path(os.environ.get('S5_WORK','/workspace/work/s5'));base='a3ace86c0b8e2fe792bbc8dd4499c65d8237eafc'
allowed={'src/simulation.js','src/railway-step.js','src/fleet-commands.js','src/railway-types.js'}
def old(p):return subprocess.check_output(['git','show',f'{base}:{p}'],cwd=root)
paths=[p for p in subprocess.check_output(['git','ls-tree','-r','--name-only',base],cwd=root,text=True).splitlines() if p.startswith(('src/','supabase/','assets/')) or p in ['package.json','package-lock.json','AGENTS.md','index.html','style.css']]
locked={p:hashlib.sha256((root/p).read_bytes()).hexdigest() for p in paths if p not in allowed};assert all((root/p).read_bytes()==old(p) for p in locked)
functions={};a=old('app.js').decode();b=(root/'app.js').read_text()
for name in ['advanceFleet','renderVehicles','getSwitchAssistance','switchHUDState','requestToggle']:
 pattern=rf'^function {name}\([^\n]*[\s\S]*?^}}';x=re.search(pattern,a,re.M);y=re.search(pattern,b,re.M);assert x and y and x[0]==y[0];functions[name]=True
# The router and Journey selection/movement bodies are unchanged. Only a raw
# control-state accessor was added for classification of missing boolean state.
s=(root/'src/simulation.js').read_text();s=s.replace('  choose.controlState=state; // Read-only raw state for the engine guard; routing semantics unchanged.\n','');assert s==old('src/simulation.js').decode()
production=(root/'dist/game.js').read_text();assert not any(v in production for v in ['__s4','__s3','__s2','__s0Originals','__serienProfile'])
secret=re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY|sb_secret_[A-Za-z0-9]+|gh[pousr]_[A-Za-z0-9]{20,}')
assert not any(secret.search((root/p).read_text()) for p in ['app.js',*allowed,'src/railway-guard.js'])
result={'result':'PASS','baselineS4':base,'unchangedSourceHashes':locked,'allowedSafetyCoreChanges':sorted(allowed|{'src/railway-guard.js'}),'unchangedAppHotFunctions':functions,'routerAndJourneyBodiesUnchanged':True,'canonicalSha256':hashlib.sha256((root/'src/canonical-layout.json').read_bytes()).hexdigest(),'productionHasNoTemporaryHooks':True,'scopedSecretPatternScan':'PASS; modified runtime only, not full5E audit','canonicalRegeneration':'check separately via build-canonical-layout.py and git diff'}
(out/'invariants.json').write_text(json.dumps(result,indent=2)+'\n');print('PASS',len(locked),'locked files, router/Journey and five hot functions; original graphics unchanged')
