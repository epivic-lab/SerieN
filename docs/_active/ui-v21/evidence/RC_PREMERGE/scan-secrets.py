"""Pattern scan of every new blob in candidate history, with redacted findings."""
import subprocess,re,json,pathlib,hashlib,base64,collections
E=pathlib.Path('docs/_active/ui-v21/evidence/RC_PREMERGE');B='184cc9ba93a6b35493f365b2ffcb20ef0645963d';H='29b55b40dfa37c51fae827bdf25ded94948a3a45'
patterns={
 'private-key':rb'-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----',
 'github-token':rb'\b(?:gh[pousr]_[A-Za-z0-9]{30,255}|github_pat_[A-Za-z0-9_]{50,255})\b',
 'aws-access-key':rb'\b(?:AKIA|ASIA)[A-Z0-9]{16}\b',
 'google-api-key':rb'\bAIza[0-9A-Za-z_-]{35}\b',
 'slack-token':rb'\bxox[baprs]-[0-9A-Za-z-]{20,}\b',
 'stripe-secret':rb'\b(?:sk|rk)_live_[0-9a-zA-Z]{16,}\b',
 'supabase-secret':rb'\bsb_secret_[A-Za-z0-9_-]{20,}\b',
 'openai-secret':rb'\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{40,}\b',
 'credential-url':rb'\b(?:postgres(?:ql)?|mysql|https?)://[^\s/:"<>]+:[^\s/@"<>]{8,}@',
 'jwt':rb'\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{10,}\b',
 'credential-assignment':rb'''(?im)\b(?:password|passwd|client_secret|api_secret|access_token|refresh_token|service_role_key|aws_secret_access_key)\b["']?\s*[:=]\s*["']([^"'\r\n]{8,})["']'''
};patterns={k:re.compile(v) for k,v in patterns.items()};findings=[];scanned=0;size=0;extensions=collections.Counter()
objects=subprocess.check_output(['git','rev-list','--objects',H,'^'+B]).decode().splitlines();p=subprocess.Popen(['git','cat-file','--batch'],stdin=subprocess.PIPE,stdout=subprocess.PIPE)
for item in objects:
 oid,_,name=item.partition(' ');p.stdin.write((oid+'\n').encode());p.stdin.flush();header=p.stdout.readline().decode().split();data=p.stdout.read(int(header[2]));assert p.stdout.read(1)==b'\n'
 if header[1]!='blob':continue
 scanned+=1;size+=len(data);extensions[pathlib.Path(name).suffix]+=1
 for kind,pat in patterns.items():
  for m in pat.finditer(data):
   value=m.group();classification='REVIEW'
   if kind=='jwt':
    try:
     role=json.loads(base64.urlsafe_b64decode(value.split(b'.')[1]+b'===' )).get('role')
     classification='public-anon-key' if role=='anon' else 'REVIEW-JWT-'+str(role)
    except Exception:pass
   findings.append({'path':name,'blob':oid,'pattern':kind,'line':data[:m.start()].count(b'\n')+1,'fingerprint':hashlib.sha256(value).hexdigest(),'classification':classification})
p.stdin.close();p.wait();result={'scope':'All newly reachable Git blobs across the 25 commits, including intermediate versions and binaries as raw bytes. No secret values logged. Supplemented by manual review; no universal credential absence guarantee.','blobs':scanned,'bytes':size,'patterns':list(patterns),'findings':findings,'extensions':dict(extensions)};(E/'secret-scan.json').write_text(json.dumps(result,indent=2)+'\n');print('Scanned',scanned,'blobs;',size,'bytes;',len(findings),'redacted candidates');print(json.dumps(findings,indent=2))
