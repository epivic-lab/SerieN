"""Validate the real S4 capture set after acquisition, without changing images."""
import json,sys
from pathlib import Path
from PIL import Image,ImageChops
out=Path(sys.argv[1]);meta=json.loads((out/'capture.json').read_text());result=json.loads((out/'comparison.json').read_text());candidate=meta['candidate']
for id in ['Y-IN','Y-R1','Y-R2','Y-3','Y-4','Y-2','WX-A','WX-B']:
 for day in [48,95]:
  for on in [0,1]:
   image=out/f'candidate-{id}-{day}-{on}.png';assert image.exists(),image
   view=next(u for u in candidate[f'{id}-{day}-{on}']['arrows']['units'] if u['id']==id)
   assert view['state']==bool(on) and not view['unknown'] and len(view['paths'])==(2 if id.startswith('WX') else 1),view
   assert all(p['sign']==0 for p in view['paths']),view
result['oppositeDirections']={}
for id in ['WX-A','WX-B']:
 for on in [0,1]:
  ports=['UL','LR'] if on else ['UL','UR'];observed=[]
  for port in ports:
   unit=next(u for u in candidate[f'{id}-direction-{on}-{port}']['arrows']['units'] if u['id']==id)
   moving=[p for p in unit['paths'] if p['source']=='JOURNEY'];assert len(moving)==1,(id,on,port,unit);observed.append(moving[0])
  assert observed[0]['edge']==observed[1]['edge'] and observed[0]['sign']==-observed[1]['sign'],observed
  result['oppositeDirections'][f'{id}-{on}']=observed
ims=[Image.open(out/f'candidate-reveal-{phase}.png').convert('RGB') for phase in [0,170,340]]
result['threeRevealFramesDistinct']=all(ImageChops.difference(ims[a],ims[b]).getbbox() is not None for a,b in [(0,1),(1,2),(0,2)])
progress=[next(u for u in candidate[f'reveal-{phase}']['arrows']['units'] if u['id']=='Y-IN')['progress'] for phase in [0,170,340]]
assert progress==[0,.5,1],progress
assert result['threeRevealFramesDistinct'] and all(result['blueBUnchangedExact'].values()) and all(result['arrowsVisible'].values())
result['all8BothStatesDayNight']=True;result['revealProgress']=progress;result['result']='PASS'
(out/'comparison.json').write_text(json.dumps(result,indent=2)+'\n');print('PASS: all8/both states/day-night, B exact, opposite WX directions, three real reveal frames')
