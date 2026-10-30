"""Reviewable 5D tables from raw measurements. No estimated or invented samples."""
import argparse,json,statistics,gzip,collections,math
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('before');p.add_argument('after',nargs='?');p.add_argument('--output',required=True);p.add_argument('--require-complete',action='store_true');a=p.parse_args()
def load(root,name):
 path=Path(root)/name
 return json.loads(path.read_text()) if path.exists() else None
def median(xs):return statistics.median(xs)
def p95(xs):return sorted(xs)[math.ceil(.95*len(xs))-1]
def summarize(root):
 r={'normal':{},'components':{},'extended':{},'cycles':{},'profiles':{}}
 for v in load(root,'normal/normal.json') or []:
  key='/'.join(map(str,[v['scenario'],v['quality'],v['day'],v['camera']]))
  r['normal'].setdefault(key,[]).append(v)
 def frame_row(v):
  interactions=[i for x in v for i in x['raw'].get('interactions',[])]
  scripts=[]
  for x in v:
   if 'cdpAfter' in x:
    metrics=lambda k:{m['name']:m['value'] for m in x[k]['metrics']}
    scripts.append(metrics('cdpAfter').get('ScriptDuration',0)-metrics('cdpBefore').get('ScriptDuration',0))
  return {'runs':len(v),'frames':sum(x['frame']['n'] for x in v),'medianFrameMs':median([x['frame']['medianMs'] for x in v]),'p95FrameMs':median([x['frame']['p95Ms'] for x in v]),'pooledP95FrameMs':p95([f for x in v for f in x['raw']['frames']]),'maxFrameMs':max(x['frame']['maxMs'] for x in v),'meanFrameMs':median([x['frame']['meanMs'] for x in v]),'effectiveFps':median([x['frame']['effectiveFps'] for x in v]),'tickWallMedianMs':median([x['tick']['medianMs'] for x in v]),'longTasks':sum(len(x['raw']['longTasks']) for x in v),'interactionMedianMs':median([i['durationMs'] for i in interactions]) if interactions else None,'interactions':interactions,'cdpScriptDurationSecondsMedian':median(scripts) if scripts else None,'cdpScope':'CDP ScriptDuration is elapsed script time including the after-snapshot; not hardware CPU or GPU time'}
 r['normal']={k:frame_row(v) for k,v in r['normal'].items()}
 for row in load(root,'profile/components.json') or []:
  r['components'][row['scenario']]={k:{'perCallMedianMs':median([b[k]['totalMs']/b[k]['iterations'] for b in row['batches']]),'perCallSamplesMs':[b[k]['totalMs']/b[k]['iterations'] for b in row['batches']]} for k in row['batches'][0]}
 for path in sorted((Path(root)/'extended').glob('extended-*.json')):
  v=json.loads(path.read_text());r['extended'][path.stem]={'wallSeconds':v[-1]['elapsed'],'windows':len(v),'heapFirstBytes':v[0]['heap']['usedSize'],'heapLastBytes':v[-1]['heap']['usedSize'],'heapAllBytes':[x['heap']['usedSize'] for x in v],'backingFirstBytes':v[0]['heap'].get('backingStorageSize'),'backingLastBytes':v[-1]['heap'].get('backingStorageSize'),'backingAllBytes':[x['heap'].get('backingStorageSize') for x in v],'residentGeometries':[x['state']['render']['geometries'] for x in v],'residentTextures':[x['state']['render']['textures'] for x in v],'frameMediansMs':[x['frame']['medianMs'] for x in v],'domCounters':[x.get('dom') for x in v]}
 for path in sorted((Path(root)/'extended').glob('cycles-*.json')):
  r['cycles'][path.stem]=[{'cycle':x['cycle'],'quality':x['state']['quality']['profile'],'heapBytes':x['heap']['usedSize'],'backingBytes':x['heap'].get('backingStorageSize'),'geometries':x['state']['render']['geometries'],'textures':x['state']['render']['textures'],'dom':x.get('dom')} for x in json.loads(path.read_text())]
 for path in sorted((Path(root)/'profile').glob('*.cpuprofile*')):
  v=json.loads(gzip.decompress(path.read_bytes()) if path.suffix=='.gz' else path.read_text());nodes={x['id']:x for x in v['nodes']};cost=collections.Counter()
  for node,delta in zip(v.get('samples',[]),v.get('timeDeltas',[])):
   f=nodes[node]['callFrame'];cost[f['functionName']+'@'+str(f['lineNumber'])]+=delta/1000
  r['profiles'][path.name.split('.')[0]]={'scope':'self sampled elapsed milliseconds, includes native/idle (program); not GPU timings','top':cost.most_common(25)}
 return r
def complete(root,r):
 rows=load(root,'normal/normal.json') or []
 expected=[('A','low',48,'overview'),('B','low',48,'overview'),('C','low',48,'overview'),('D','low',48,'overview'),('C','low',95,'overview')]+[('E',q,d,c) for q in ['high','cinema'] for d in [10,95] for c in ['overview','follow']]
 assert len(rows)==39,(root,'Expected 39 normal runs',len(rows))
 for scenario,quality,day,camera in expected:
  matches=[x for x in rows if (x['scenario'],x['quality'],x['day'],x['camera'])==(scenario,quality,day,camera)]
  assert sorted(x['repeat'] for x in matches)==[0,1,2],(root,scenario,quality,day,camera)
  assert all(x['frame']['n']==(24 if quality=='low' else 16) for x in matches)
  assert all(x['before']['quality']['profile']==quality for x in matches)
  assert all(x['before']['render']['calls']>0 and x['after']['render']['calls']>0 and x['after']['render']['geometries']>0 and x['after']['render']['textures']>0 for x in matches)
  assert all(len(x['raw']['frames'])==x['frame']['n'] for x in matches)
 assert set(r['components'])==set('ABCD') and all(len(x['models']['perCallSamplesMs'])==3 for x in r['components'].values())
 assert len(r['extended'])==3 and all(x['wallSeconds']>=120 for x in r['extended'].values())
 assert len(r['cycles'])==3 and all(len(x)==6 for x in r['cycles'].values())
 for folder in ['normal','profile','extended']:
  errors=load(root,folder+'/errors.json');assert errors is not None and not errors['errors'] and not errors['failedRequests'],(root,folder,errors)
before=summarize(a.before);after=summarize(a.after) if a.after else None
if a.require_complete:
 assert after is not None
 complete(a.before,before);complete(a.after,after)
result={'before':before,'after':after,'deltas':{},'frameDeltas':{}}
if after:
 for scenario,components in before['components'].items():
  for name,value in components.items():
   if scenario in after['components'] and name in after['components'][scenario]:
    b=value['perCallMedianMs'];c=after['components'][scenario][name]['perCallMedianMs'];result['deltas'][scenario+'/'+name]={'beforeMs':b,'afterMs':c,'reductionPercent':100*(b-c)/b if b else None}
 for key,b in before['normal'].items():
  if key in after['normal']:
   c=after['normal'][key];dm=100*(c['medianFrameMs']/b['medianFrameMs']-1);dp=100*(c['p95FrameMs']/b['p95FrameMs']-1)
   result['frameDeltas'][key]={'medianChangePercent':dm,'p95ChangePercent':dp,'repeatRequired':dm>10 or dp>15}
Path(a.output).write_text(json.dumps(result,indent=2)+'\n')
print('| Scenario/component | Before ms/call | After ms/call | Reduction |\n|---|---:|---:|---:|')
for name,v in result['deltas'].items():print(f"| {name} | {v['beforeMs']:.4f} | {v['afterMs']:.4f} | {v['reductionPercent']:.1f}% |")
print('\nFrame medians and p95 below are medians of three run statistics; pooled p95 and raw samples are in JSON. FPS = median of per-run 1000/mean frame time. Software backend only.\n')
for label,r in [('Before',before),('After',after)]:
 if not r:continue
 print(f'\n{label}\n\n| Scenario/quality/day/camera | Runs | Frames | Frame median ms | Frame p95 ms | Effective FPS |\n|---|---:|---:|---:|---:|---:|')
 for name,v in r['normal'].items():print(f"| {name} | {v['runs']} | {v['frames']} | {v['medianFrameMs']:.2f} | {v['p95FrameMs']:.2f} | {v['effectiveFps']:.2f} |")
print('\n| Scenario | Median change | P95 change | Repeat required |\n|---|---:|---:|---|')
for name,v in result['frameDeltas'].items():print(f"| {name} | {v['medianChangePercent']:+.1f}% | {v['p95ChangePercent']:+.1f}% | {v['repeatRequired']} |")
print('\nNegative frame change is faster; positive is slower. A flag requires a matched repetition, not automatic attribution to code.')
print('\n| Revision/session | Real seconds | GC heap first → last MiB | Backing first → last MiB | Geometries | Textures |\n|---|---:|---:|---:|---|---|')
def mib(value):return f'{value/1048576:.2f}' if value is not None else 'unavailable'
for label,r in [('Before',before),('After',after)]:
 if not r:continue
 for name,v in r['extended'].items():print(f"| {label}/{name} | {v['wallSeconds']:.1f} | {mib(v['heapFirstBytes'])} → {mib(v['heapLastBytes'])} | {mib(v['backingFirstBytes'])} → {mib(v['backingLastBytes'])} | {sorted(set(v['residentGeometries']))} | {sorted(set(v['residentTextures']))} |")
print('\n| Revision/quality reset cycles | Samples | Geometries | Textures | GC heap first → last MiB | Backing first → last MiB |\n|---|---:|---|---|---:|---:|')
for label,r in [('Before',before),('After',after)]:
 if not r:continue
 cycles=[x for block in r['cycles'].values() for x in block]
 for quality in ['low','high','cinema']:
  v=[x for x in cycles if x['quality']==quality]
  if v:print(f"| {label}/{quality} | {len(v)} | {sorted(set(x['geometries'] for x in v))} | {sorted(set(x['textures'] for x in v))} | {mib(v[0]['heapBytes'])} → {mib(v[-1]['heapBytes'])} | {mib(v[0]['backingBytes'])} → {mib(v[-1]['backingBytes'])} |")
