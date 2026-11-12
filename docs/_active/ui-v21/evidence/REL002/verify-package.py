"""Run at repository root AFTER preparing the unchanged REL-001 recipe once."""
import hashlib,json,pathlib,subprocess,tarfile
R=pathlib.Path.cwd(); E=R/'docs/_active/ui-v21/evidence/REL002'; S=R/'_site'
def save(n,x):(E/n).write_text(json.dumps(x,indent=2)+'\n')
def manifest():
 return {p.relative_to(S).as_posix():{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(S.rglob('*')) if p.is_file()}
def run(args):
 p=subprocess.run(args,capture_output=True,text=True);commands.append({'argv':args,'exitCode':p.returncode,'stdout':p.stdout,'stderr':p.stderr});save('commands.json',commands);assert p.returncode==0,p.stderr;return p.stdout
commands=[];before=manifest();save('manifest-rel001.json',before)
assert len(before)==3562 and sum(x['bytes'] for x in before.values())==718776848
workflow=(R/'.github/workflows/pages.yml').read_text();recipe=workflow.split('      - name: Prepare site\n        run: |\n')[1].split('      - name: Configure Pages')[0];recipe='\n'.join(x[10:] for x in recipe.splitlines())+'\n';(E/'prepare-site.sh').write_text(recipe)
# The first run exercises an existing full archive and a stale marker.
(S/'stale-rel002.txt').write_text('must disappear')
run(['bash','-euo','pipefail','-c',recipe]);after=manifest();assert not (S/'stale-rel002.txt').exists()
# Re-run against residues; a fresh destination follows below.
(S/'docs/stale-rel002.txt').write_text('must disappear')
run(['bash','-euo','pipefail','-c',recipe]);assert manifest()==after
# Move the temporary artifact aside to exercise a genuinely absent destination.
held=R/'work/rel002/residue-site';assert not held.exists();S.rename(held)
run(['bash','-euo','pipefail','-c',recipe]);assert manifest()==after
save('manifest-rel002.json',after)
assert all(before[p]==v for p,v in after.items())
removed=sorted(set(before)-set(after));assert all(p.startswith('docs/') for p in removed)
closure=json.loads((E/'document-closure.json').read_text());assert not closure['missing']
assert all(p in after for p in closure['paths'])
assert {p for p in after if p.startswith('docs/')}=={p for p in closure['paths'] if p.startswith('docs/')}
assert not any(p.startswith('docs/_active/') for p in after)
save('excluded-files.json',[{'path':p,**before[p],'reason':'Outside transitive runtime/public-link closure; retained unchanged in Git.'} for p in removed])
save('whitelist.json',[{'path':p,'incomingReferences':[e for e in closure['edges'] if e['target']==p]} for p in after if p.startswith('docs/')])
assets={p:v for p,v in after.items() if not p.startswith('docs/')};save('application-hashes.json',assets)
# Prove byte identity against REL001 tracked inputs, including ALL sources/tests.
run(['git','diff','--exit-code','06a01c5ae70bfd4147e2c866f06803139904f264','--','app.js','src','ui','assets','index.html','auth-gate.js','auth-gate-core.js','style.css','legacy-v0.1.html','tests','package.json','package-lock.json'])
bundle=next(x for x in json.loads((E.parent/'REL001/package-audit.json').read_text())['runtimeInventory'] if x['path']=='dist/game.js');assert assets['dist/game.js']['sha256']==bundle['sha256']
# Original tar flags from REL001, same GNU tar convention.
run(['tar','--format=gnu','--dereference','--hard-dereference','-cf','work/rel002/pages.tar','-C','_site','.'])
size=lambda m:sum(x['bytes'] for x in m.values())
old=size(before);new=size(after);docs={p:v for p,v in after.items() if p.startswith('docs/')}
save('artifact-size.json',{'baselineBytes':old,'siteBytes':new,'siteFiles':len(after),'docsBytes':size(docs),'docsFiles':len(docs),'excludedFiles':len(removed),'reductionBytes':old-new,'reductionPercent':100*(old-new)/old,'tarBytes':(R/'work/rel002/pages.tar').stat().st_size,'repeatedPackaging':'PASS: full REL001 residues, stale markers and absent destination; identical manifests','bundleIdentical':True})
(E/'workflow-diff.txt').write_text(run(['git','diff','--','.github/workflows/pages.yml']))
print((E/'artifact-size.json').read_text())
