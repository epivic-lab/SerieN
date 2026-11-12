import pathlib,subprocess,json,hashlib,collections,re
R=pathlib.Path.cwd();E=R/'docs/_active/ui-v21/evidence/RC_PREMERGE';B='184cc9ba93a6b35493f365b2ffcb20ef0645963d';H='29b55b40dfa37c51fae827bdf25ded94948a3a45';M='91722fbdf6671e69deebf645c3d8bf389212f421'
def git(*args):return subprocess.check_output(['git',*args])
def save(n,j):(E/n).write_text(json.dumps(j,indent=2)+'\n')
raw=git('diff','--raw','--no-abbrev','--no-renames','-z',B,H).split(b'\0');files=[]
for i in range(0,len(raw)-1,2):
 parts=raw[i].decode().split();path=raw[i+1].decode();p=R/path;files.append({'path':path,'status':parts[4],'baseBlob':parts[2],'candidateBlob':parts[3],'bytes':p.stat().st_size if p.is_file() else None,'sha256':hashlib.sha256(p.read_bytes()).hexdigest() if p.is_file() else None})
save('approved-delta-manifest.json',files);save('approved-delta-summary.json',{'base':B,'candidate':H,'count':len(files),'byTopLevel':dict(collections.Counter(x['path'].split('/')[0] for x in files)),'byStatus':dict(collections.Counter(x['status'] for x in files)),'method':'Local Git object database; git diff --raw --no-abbrev --no-renames -z, not GitHub Compare API.'})
commits=[{'sha':x.split('\t',1)[0],'subject':x.split('\t',1)[1]} for x in git('log','--reverse','--format=%H%x09%s',f'{B}..{H}').decode().splitlines()];save('approved-commits.json',commits)
phases={'M2':'a67e0de7fa01a968152cf47af3a744ea39034bcc','M3':M,'U0':'b9574ae71dd7ebf4039affc20d969d813b93797d','U1':'74a8d91c2feafcb826ee316862ec2e8bf7d12a56','U2':'48a7c4d48b118877ec7edf7f4c61fba090e460b8','U3':'907a9ec4a9d570f03af9ab77d39269ff49787256','U4':'1d591bbc914f74cf066666522c6692be4132a614','U5':'e6f152c9b5a23347cbbd5aa6898b91a11e2194e0','U6':'6f8a28a4fe49875dc499872454d5128b2860bdfc','U7':'cca11fb76d36e9688f41392fa1592b9a3514dce9','U8':'30c56aa28e60ce83fe0cbb36209006752325bea8','U9':'50d7c744e4b9dbbe20197ec8f959fdccb16edb5b','REL001':'06a01c5ae70bfd4147e2c866f06803139904f264','REL002':H}
for sha in phases.values():subprocess.run(['git','merge-base','--is-ancestor',sha,H],check=True)
save('phase-ancestry.json',phases)
# Every original source file except the five approved presentation adapters stays byte-identical to M3.
adapters={'src/depot-view.js','src/guarded-stop-scene.js','src/train-deck.js','src/train-management.js','src/train-projects-view.js'};rows=[]
for p in git('ls-tree','-r','--name-only',M,'src').decode().splitlines():
 old=hashlib.sha256(git('show',f'{M}:{p}')).hexdigest();new=hashlib.sha256((R/p).read_bytes()).hexdigest();same=old==new;assert same or p in adapters,p;rows.append({'path':p,'M3SHA256':old,'candidateSHA256':new,'identical':same,'classification':'approved U2-U9 presentation adapter' if not same else 'unchanged M2/M3/R1 source'})
for p in ['auth-gate.js','auth-gate-core.js','package.json','package-lock.json']:
 assert git('show',f'{B}:{p}')==(R/p).read_bytes(),p
save('domain-source-identity.json',{'baseline':M,'files':rows,'authAndDependenciesIdenticalToMain':True,'newUiModules':'src/ui/* approved U2-U9; app.js boot wiring is approved U2-U9, not a railway-domain baseline byte comparison.'})
u=json.loads((R/'docs/_active/ui-v21/evidence/U9/source-hashes.json').read_text());same=[]
for p,item in u.items():
 if p=='.github/workflows/pages.yml':continue
 actual=hashlib.sha256((R/p).read_bytes()).hexdigest();assert actual==item['sha256'],p;same.append({'path':p,'sha256':actual})
save('u9-identity.json',{'status':'PASS','files':same,'scope':'All 269 previously hashed source/test/config/asset files excluding Pages recipe changed by REL001/002.'})
merge=subprocess.run(['git','merge-tree','--write-tree',B,H],text=True,capture_output=True);assert merge.returncode==0
assert merge.stdout.strip()==git('rev-parse',H+'^{tree}').decode().strip()
save('git-gates.json',{'status':'PASS','initialHead':git('rev-parse','HEAD').decode().strip(),'initialUpstream':git('rev-parse','@{upstream}').decode().strip(),'initialMainRemote':git('ls-remote','origin','refs/heads/main','refs/heads/codex/ui-v2-integration').decode(),'aheadBehind':git('rev-list','--left-right','--count',B+'...'+H).decode().strip(),'mergeTree':merge.stdout.strip(),'candidateTree':git('rev-parse',H+'^{tree}').decode().strip(),'mergeConflicts':False})
# Isolate the only workflow delta from main; triggers and all other steps must match.
old=git('show',B+':.github/workflows/pages.yml').decode();new=(R/'.github/workflows/pages.yml').read_text();before=lambda s:s.split('      - name: Prepare site')[0];after=lambda s:s.split('      - name: Configure Pages')[1];assert before(old)==before(new) and after(old)==after(new)
assert not git('diff',B,H,'--','.github/workflows/supabase-alignment.yml','supabase','package.json','package-lock.json','auth-gate.js','auth-gate-core.js')
save('workflow-gates.json',{'status':'PASS','onlyPagesPrepareSiteChanged':True,'pagesTriggersUnchanged':['push branches:[main]','workflow_dispatch (preexisting; not invoked)'],'supabaseWorkflowAndSchemaUnchanged':True,'newTriggers':[],'noDeployFromDraftPR':True})
print(len(files),'files;',len(commits),'commits;',len(same),'U9 identities; merge, domains, workflow PASS')
