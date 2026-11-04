"""Document-contract checks only. No serializer, gateway, DB or railway mutation.
Run: python3 docs/_active/train-management/evidence/6A1/validate-schema.py
Requires preinstalled jsonschema (validation tooling, not an app dependency).
Fixture is synthetic, not an approved catalog entry or a restore/round-trip proof.
"""
from pathlib import Path
from copy import deepcopy
import json
from jsonschema import Draft202012Validator, FormatChecker
base=Path(__file__).resolve().parents[2]
schema=json.loads((base/'STATE_SCHEMA.json').read_text())
Draft202012Validator.check_schema(schema)
v=Draft202012Validator(schema,format_checker=FormatChecker())
fixture=json.loads((Path(__file__).parent/'schema-fixture.json').read_text())
v.validate(fixture)
# Reject implementation regressions in the document's important structural gates.
cases=[]
def reject(label,fn):
 f=deepcopy(fixture);fn(f)
 assert list(v.iter_errors(f)),label+' was accepted'
 cases.append({'case':label,'result':'PASS'})
reject('unsupported version',lambda f:f.update(schemaVersion=2))
reject('unknown root property',lambda f:f.update(mesh={}))
reject('missing mandatory Journey history',lambda f:f['trains'][0]['journey'].pop('segments'))
reject('extra ninth switch',lambda f:f['layout']['switches'].update(unknown=False))
reject('missing eighth switch',lambda f:f['layout']['switches'].pop('Y-4'))
reject('nonboolean switch',lambda f:f['layout']['switches'].update({'WX-A':0}))
reject('malformed workspace UUID',lambda f:f.update(workspaceId='another-workspace'))
reject('automatic resume',lambda f:f.update(resumePolicy='RUNNING'))
reject('clock overflow',lambda f:f['time'].update(accumulatorSeconds=1/60))
reject('fifth train',lambda f:f.update(trains=f['trains']*5))
reject('seventh consist member',lambda f:f['consists'][0].update(members=f['consists'][0]['members']*7))
reject('fourth console slot',lambda f:f['ui'].update(consoleSlots=f['ui']['consoleSlots']*4))
reject('invalid orientation',lambda f:f['items'][0].update(orientation=0))
reject('arbitrary boundary object',lambda f:f['trains'][0]['guard'].update(boundary={'code':'execute'}))
reject('extra live Journey network',lambda f:f['trains'][0]['journey'].update(network={}))
reject('malformed digest',lambda f:f['models'][0]['asset'].update(digest='bad'))
# Every field is documented; all objects are closed and all declared fields required.
fields=0
refs=0
def walk(x):
 global fields,refs
 if isinstance(x,dict):
  if '$ref' in x:
   assert x['$ref'].startswith('#/$defs/')
   assert x['$ref'].split('/')[-1] in schema['$defs'];refs+=1
  if x.get('type')=='object':
   assert x.get('additionalProperties') is False
   assert set(x['required'])==set(x['properties'])
   for k,p in x['properties'].items():
    assert all(p.get(a) for a in ('x-source','x-restore','x-authority')),(k,p)
    fields+=1
  for value in x.values():walk(value)
 elif isinstance(x,list):
  for value in x:walk(value)
walk(schema)
print(json.dumps({'metaSchema':'PASS','syntheticFixture':'PASS; schema only, not railway/catalog validation','rejectionCases':cases,'annotatedFields':fields,'resolvedLocalRefs':refs,'limitations':'Cross-record ownership, catalog, rail topology, round-trip and atomicity are future tests P01-P17, not proven by JSON Schema.'},indent=2))
