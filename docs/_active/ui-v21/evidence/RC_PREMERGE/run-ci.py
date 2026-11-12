import pathlib,subprocess,os,json,hashlib
R=pathlib.Path.cwd();E=R/'docs/_active/ui-v21/evidence/RC_PREMERGE';env=os.environ.copy();env['PATH']=str(R/'work/rc-tools/node_modules/node/bin')+':'+env['PATH'];env['npm_config_cache']=str(R/'work/rc/npm-cache');rows=[]
def run(name,args):
 p=subprocess.run(args,env=env,capture_output=True,text=True);(E/(name+'.txt')).write_text(p.stdout+p.stderr);rows.append({'name':name,'argv':args,'exitCode':p.returncode});(E/'commands.json').write_text(json.dumps(rows,indent=2)+'\n');print(name,p.returncode,flush=True);assert p.returncode==0,name
run('versions',['bash','-c','node --version && npm --version && python3 --version'])
assert subprocess.check_output(['node','-p','process.versions.node'],env=env,text=True).startswith('22.')
run('npm-ci',['npm','ci'])
run('canonical',['python3','scripts/build-canonical-layout.py'])
run('canonical-diff',['git','diff','--exit-code','--','src/canonical-layout.json','docs/jmri-layout/canonical-graph.json','docs/jmri-layout/layout-canonical.svg','docs/jmri-layout/minimap-canonical.svg'])
run('python-audit',['python3','-m','unittest','discover','-s','tests','-p','jmri_audit_test.py'])
run('npm-test',['npm','test'])
run('build',['npm','run','build'])
s=pathlib.Path('.github/workflows/pages.yml').read_text();recipe=s.split('      - name: Prepare site\n        run: |\n')[1].split('      - name: Configure Pages')[0];recipe='\n'.join(x[10:] for x in recipe.splitlines())+'\n';(E/'prepare-site.sh').write_text(recipe)
assert recipe==pathlib.Path('docs/_active/ui-v21/evidence/REL002/prepare-site.sh').read_text()
run('prepare-site',['bash','-euo','pipefail',str(E/'prepare-site.sh')])
expected=json.loads(pathlib.Path('docs/_active/ui-v21/evidence/REL002/manifest-rel002.json').read_text());actual={p.relative_to('_site').as_posix():{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in pathlib.Path('_site').rglob('*') if p.is_file()};assert actual==expected
(E/'artifact-identity.json').write_text(json.dumps({'status':'PASS','node':subprocess.check_output(['node','--version'],env=env,text=True).strip(),'files':len(actual),'bytes':sum(x['bytes'] for x in actual.values()),'identicalToREL002Manifest':True,'bundle':actual['dist/game.js'],'runtimeAndBrowserReuse':'Exact artifact identity; U9 and REL002 browser/railway evidence reused, not rerun.'},indent=2)+'\n')
print('artifact exact identity PASS',flush=True)
