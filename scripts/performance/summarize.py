"""Create reviewable benchmark tables from raw 5D measurements; no invented values."""
import argparse,json,statistics,gzip,collections
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('before');p.add_argument('after',nargs='?');p.add_argument('--output',required=True);a=p.parse_args()
def load(root,name):
 p=Path(root)/name
 return json.loads(p.read_text()) if p.exists() else None
def median(xs):return statistics.median(xs)
def summarize(root):
 r={'normal':{},'components':{},'extended':{},'profiles':{}}
 for v in load(root,'normal/normal.json') or []:
  key='/'.join(map(str,[v['scenario'],v['quality'],v['day'],v['camera']]))
  r['normal'].setdefault(key,[]).append(v)
 r['normal']={k:{'runs':len(v),'frames':sum(x['frame']['n'] for x in v),'medianFrameMs':median([x['frame']['medianMs'] for x in v]),'p95FrameMs':median([x['frame']['p95Ms'] for x in v]),'meanFrameMs':median([x['frame']['meanMs'] for x in v]),'effectiveFps':median([x['frame']['effectiveFps'] for x in v]),'tickWallMedianMs':median([x['tick']['medianMs'] for x in v]),'longTasks':sum(len(x['raw']['longTasks']) for x in v),'interactionMedianMs':median([i['durationMs'] for x in v for i in x['raw'].get('interactions',[])]) if any(x['raw'].get('interactions') for x in v) else None,'cdpScriptCpuSecondsMedian':median([dict((m['name'],m['value']) for m in x['cdpAfter']['metrics']).get('ScriptDuration',0)-dict((m['name'],m['value']) for m in x['cdpBefore']['metrics']).get('ScriptDuration',0) for x in v]) if all('cdpAfter' in x for x in v) else None} for k,v in r['normal'].items()}
 for row in load(root,'profile/components.json') or []:
  r['components'][row['scenario']]={k:{'perCallMedianMs':median([b[k]['totalMs']/b[k]['iterations'] for b in row['batches']]),'perCallSamplesMs':[b[k]['totalMs']/b[k]['iterations'] for b in row['batches']]} for k in row['batches'][0]}
 for p in (Path(root)/'extended').glob('extended-*.json'):
  v=json.loads(p.read_text());r['extended'][p.stem]={'wallSeconds':v[-1]['elapsed'],'windows':len(v),'heapFirstBytes':v[0]['heap']['usedSize'],'heapLastBytes':v[-1]['heap']['usedSize'],'residentGeometries':[x['state']['render']['geometries'] for x in v],'residentTextures':[x['state']['render']['textures'] for x in v],'frameMediansMs':[x['frame']['medianMs'] for x in v]}
 for p in (Path(root)/'profile').glob('*.cpuprofile'):
  v=json.loads(p.read_text());nodes={x['id']:x for x in v['nodes']};cost=collections.Counter()
  for node,delta in zip(v.get('samples',[]),v.get('timeDeltas',[])):
   f=nodes[node]['callFrame'];cost[f['functionName']+'@'+str(f['lineNumber'])]+=delta/1000
  r['profiles'][p.stem]={'scope':'self sampled wall milliseconds, includes native/idle (program); not GPU timings','top':cost.most_common(25)}
 return r
before=summarize(a.before);after=summarize(a.after) if a.after else None
result={'before':before,'after':after,'deltas':{}}
if after:
 for scenario,components in before['components'].items():
  for name,value in components.items():
   if scenario in after['components'] and name in after['components'][scenario]:
    b=value['perCallMedianMs'];c=after['components'][scenario][name]['perCallMedianMs'];result['deltas'][scenario+'/'+name]={'beforeMs':b,'afterMs':c,'reductionPercent':100*(b-c)/b if b else None}
Path(a.output).write_text(json.dumps(result,indent=2)+'\n')
print('| Scenario/component | Before ms/call | After ms/call | Reduction |\n|---|---:|---:|---:|')
for name,v in result['deltas'].items():print(f"| {name} | {v['beforeMs']:.4f} | {v['afterMs']:.4f} | {v['reductionPercent']:.1f}% |")
print('\n| Scenario/quality/day/camera | Runs | Frames | Frame median ms | Frame p95 ms | Effective FPS |\n|---|---:|---:|---:|---:|---:|')
for name,v in before['normal'].items():print(f"| {name} | {v['runs']} | {v['frames']} | {v['medianFrameMs']:.2f} | {v['p95FrameMs']:.2f} | {v['effectiveFps']:.2f} |")
