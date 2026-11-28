"""L02-F candidate: split wheel/rod sides by immutable triangle indices.
The source GLB is never rewritten. Only positive-side wheel/rod phases change.
"""
import importlib.util,json,math,struct,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'docs/_active/rolling-stock/evidence/L02-F'
spec=importlib.util.spec_from_file_location('audit',Path(__file__).with_name('audit-quartering.py'))
audit=importlib.util.module_from_spec(spec);spec.loader.exec_module(audit)
measured=audit.audit()
b=(audit.SOURCE/'prototype.glb').read_bytes();n=struct.unpack_from('<I',b,12)[0];j=json.loads(b[20:20+n]);data=b[28+n:]
rig=json.loads((audit.SOURCE/'rig.json').read_text())
original=json.loads((ROOT/'docs/_active/rolling-stock/evidence/L02-E/coupling-rods.json').read_text())
def acc(i):
 a=j['accessors'][i];v=j['bufferViews'][a['bufferView']];count={'VEC3':3,'SCALAR':1}[a['type']];fmt={5126:'f',5125:'I',5123:'H'}[a['componentType']];size=count*struct.calcsize(fmt)
 return [struct.unpack_from('<'+fmt*count,data,v.get('byteOffset',0)+a.get('byteOffset',0)+k*v.get('byteStride',size)) for k in range(a['count'])]
result={'sourceSha256':measured['sourceSha256'],'positiveSidePhaseRad':math.pi/2,'wheels':{},'frames':{},'scope':'wheel quartering and crank calibration; nominal valve gear supplied by mechanism-rig and valve-gear modules'}
for record in measured['axles']:
 name=record['axle'];node=next(x for x in j['nodes'] if x.get('name')==name);items=[]
 for pi,pr in enumerate(j['meshes'][node['mesh']]['primitives']):
  positions=acc(pr['attributes']['POSITION']);indices=[x[0] for x in acc(pr['indices'])];positive=[];mixed=0
  for t in range(len(indices)//3):
   xs=[positions[i][0] for i in indices[3*t:3*t+3]]
   if min(xs)>0:positive.append(t)
   elif max(xs)>0 and min(xs)<0:mixed+=1
  items.append({'primitive':pi,'indexCount':len(indices),'positiveTriangles':positive,'crossingAxisTriangles':mixed})
 result['wheels'][name]={'primitives':items}
for frame,old in original['frames'].items():
 pins=[cap for r in measured['axles'] if rig['axles'][r['axle']]['parent']==frame for cap in r['samples'][0]['sides'].values()]
 along=sum(p['alongMm'] for p in pins)/len(pins);height=sum(p['heightMm'] for p in pins)/len(pins)
 node=next(x for x in j['nodes'] if x.get('name')==frame);items=[]
 for item in old['primitives']:
  pr=j['meshes'][node['mesh']]['primitives'][item['primitive']];positions=acc(pr['attributes']['POSITION']);indices=[x[0] for x in acc(pr['indices'])]
  sides={'-1':[],'1':[]}
  for t in item['triangles']:
   xs=[positions[i][0] for i in indices[t*3:t*3+3]]
   if min(xs)>0:sides['1'].append(t)
   elif max(xs)<0:sides['-1'].append(t)
   else:raise ValueError('Coupling rod crosses the axle centre')
  items.append({'primitive':item['primitive'],'indexCount':item['indexCount'],'sides':sides})
 result['frames'][frame]={'crankAlongMm':along,'crankHeightMm':height,'calibration':'mean of eight measured cap centres in this motor; see candidate-quartering.json for residuals','primitives':items}
OUT.mkdir(parents=True,exist_ok=True);(OUT/'quartering-rig.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'wheels':len(result['wheels']),'motors':len(result['frames']),'sha256':hashlib.sha256((OUT/'quartering-rig.json').read_bytes()).hexdigest()}))
