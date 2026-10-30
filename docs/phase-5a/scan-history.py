"""Limited offline secret-pattern scan. Never prints values or matched text."""
import subprocess,json,re
from pathlib import Path
patterns={
 'private-key':re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),
 'github-classic':re.compile(rb'gh[pousr]_[A-Za-z0-9]{36,}'),
 'github-fine-grained':re.compile(rb'github_pat_[A-Za-z0-9_]{50,}'),
 'aws-access-key-id':re.compile(rb'(?:AKIA|ASIA)[A-Z0-9]{16}')}
entries=subprocess.check_output(['git','rev-list','--objects','--all']).decode().splitlines()
count=0;findings=[];skipped=0
for row in entries:
 oid,_,name=row.partition(' ')
 if Path(name).suffix.lower() not in {'.js','.mjs','.py','.md','.json','.html','.css','.yml','.yaml','.txt','.env','.xml'}:continue
 b=subprocess.check_output(['git','cat-file','blob',oid]);count+=1
 for label,pattern in patterns.items():
  for m in pattern.finditer(b):findings.append({'object':oid,'path':name,'line':b[:m.start()].count(b'\n')+1,'pattern':label})
result={'scope':'text blobs reachable from current local refs; selected high-confidence credential patterns only, no values displayed','blobsScanned':count,'findings':findings,'limitations':['No entropy detector','No remote deleted refs or GitHub settings inspected','No proof of absence of secrets','Credential-shaped examples require human classification if found']}
Path('docs/phase-5a/secret-scan.json').write_text(json.dumps(result,indent=2)+'\n');print('Text blobs scanned:',count,'Pattern hits:',len(findings))
