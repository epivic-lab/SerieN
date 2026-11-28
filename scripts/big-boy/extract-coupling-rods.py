"""Index-only extraction of the four coupling-rod sets; source GLB is immutable.
No triangles are synthesized. Main rods and valve gear remain static in L02-E.
"""
import hashlib,json,struct
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'docs/_active/rolling-stock/evidence/L02-D/prototype'
b=(SOURCE/'prototype.glb').read_bytes(); n=struct.unpack_from('<I',b,12)[0]
j=json.loads(b[20:20+n]); data=b[28+n:];rig=json.loads((SOURCE/'rig.json').read_text())
def accessor(i):
 a=j['accessors'][i];v=j['bufferViews'][a['bufferView']];fmt={5126:'f',5125:'I',5123:'H'}[a['componentType']];count={'VEC3':3,'SCALAR':1}[a['type']];size=struct.calcsize(fmt)*count
 return [struct.unpack_from('<'+fmt*count,data,v.get('byteOffset',0)+a.get('byteOffset',0)+k*v.get('byteStride',size)) for k in range(a['count'])]
assert hashlib.sha256(b).hexdigest()=='14622eac1e9dc20e58411ceea59cf7ea053724936c637dbd2413596a5ba331e1'
result={'sourceSha256':hashlib.sha256(b).hexdigest(),'frames':{}}
for name in ['engine_rear','engine_front']:
 frame=rig['frames'][name];node=next(v for v in j['nodes'] if v.get('name')==name); entries=[]
 band=(6.1,8.4) if name=='engine_rear' else (2.5,4.9)
 stations=[rig['axles'][a]['sMm'] for a in frame['axleNodes']]
 for pi,pr in enumerate(j['meshes'][node['mesh']]['primitives']):
  pts=accessor(pr['attributes']['POSITION']);ind=[x[0] for x in accessor(pr['indices'])];parent=list(range(len(pts)));seen={}
  def root(i):
   while parent[i]!=i:parent[i]=parent[parent[i]];i=parent[i]
   return i
  for i,p in enumerate(pts):
   key=tuple(round(x,3) for x in p)
   if key in seen:parent[root(i)]=root(seen[key])
   else:seen[key]=i
  for i in range(0,len(ind),3):
   a,c,d=ind[i:i+3];parent[root(c)]=root(a);parent[root(d)]=root(a)
  groups={}
  for i in range(0,len(ind),3):groups.setdefault(root(ind[i]),[]).append(i//3)
  selected=[]
  for triangles in groups.values():
   v=[pts[ind[t*3+c]] for t in triangles for c in range(3)]
   lo=[min(p[k] for p in v) for k in range(3)];hi=[max(p[k] for p in v) for k in range(3)]
   s0=-hi[2]+frame['pivotMm'][0];s1=-lo[2]+frame['pivotMm'][0]
   h0=lo[1]+frame['pivotMm'][1];h1=hi[1]+frame['pivotMm'][1]
   # Whole disconnected islands in the measured coupling-rod band.
   if (lo[0]>6 or hi[0]<-6) and max(abs(lo[0]),abs(hi[0]))<7.55 and h0>band[0] and h1<band[1] and s0>min(stations)-3 and s1<max(stations)+3:
    selected.extend(triangles)
  entries.append({'primitive':pi,'indexCount':len(ind),'triangles':sorted(selected)})
 assert sum(len(e['triangles']) for e in entries)=={'engine_rear':3642,'engine_front':3766}[name],name
 result['frames'][name]={'crankHeightMm':(7.26024 if name=='engine_rear' else 3.69919)-rig['axles'][frame['axleNodes'][0]]['heightMm'], 'crankAlongMm':(19.95109 if name=='engine_rear' else 71.71428)-(min(stations)+max(stations))/2,'primitives':entries}
out=ROOT/'docs/_active/rolling-stock/evidence/L02-E/coupling-rods.json'
out.write_text(json.dumps(result,indent=2)+'\n')
print({k:sum(len(p['triangles']) for p in v['primitives']) for k,v in result['frames'].items()})
