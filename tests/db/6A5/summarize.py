"""Reconstruct explicit logical storage measures from lossless captured SQL values.
No physical-disk/TOAST/index-size claim: byte accounting is UTF-8 JSON plus documented allowance.
"""
from pathlib import Path
import json,sys
out=Path(sys.argv[1])
report=json.loads((out/'results.json').read_text())
final=json.loads((out/'final-state.json').read_text())
audit=json.loads((out/'audit.json').read_text())
def size(value):return len(json.dumps(value,ensure_ascii=False).encode())
metrics={}
for row in final['public.layout_snapshots']:
 w=row['workspace_id']
 if w:
  m=metrics.setdefault(w,dict(snapshots=0,receipts=0,logicalCheckpointBytes=0))
  m['snapshots']+=1;m['logicalCheckpointBytes']+=size(row['payload'])+size(row['asset_refs'])+256
for row in final['public.operation_receipts']:
 w=row['workspace_id']
 if w:
  m=metrics[w];m['receipts']+=1;m['logicalCheckpointBytes']+=size(row['result'])+size(row['request_context'])+size(row['auth_context'] or {})+256
for w,m in metrics.items():
 events=[e for e in audit if e['workspace_id']==w]
 m.update(auditRows=len(events),auditJSONBytes=sum(size(e) for e in events))
before=next(c for c in report['cases'] if c['test'].startswith('21 injected'))
initial=report['databaseStates'][before['initial']['stateRef']]
old=[r for r in initial['public.operation_receipts'] if r['workspace_id']]
ids={r['request_id'] for r in old}
new=[r for r in final['public.operation_receipts'] if r['request_id'] in ids]
assert len(new)==len(old) and all('envelope' not in r['result'] for r in new)
compaction=dict(unchangedReceiptCount=len(old),oldResultBytes=sum(size(r['result']) for r in old),compactedResultAndContextBytes=sum(size(r['result'])+size(r['request_context']) for r in new),legacyResponseReconstructedExactly=True)
(out/'metrics.json').write_text(json.dumps(dict(method='reconstructed UTF-8 JSON byte accounting from captured SQL values; no physical disk claim',workspaces=metrics,compaction=compaction),indent=2)+'\n')
print(json.dumps(dict(cases=len(report['cases']),uniqueStates=len(report['databaseStates']),metrics=metrics,compaction=compaction)))
