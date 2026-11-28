"""Partition exterior static source mechanism into an explicitly replaced set.
Source meshes, frames, wheels and track assets are immutable. No triangle cuts.
"""
import json,struct,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'docs/_active/rolling-stock/evidence/L02-F'
SOURCE=ROOT/'docs/_active/rolling-stock/evidence/L02-D/prototype';b=(SOURCE/'prototype.glb').read_bytes()
assert hashlib.sha256(b).hexdigest()=='14622eac1e9dc20e58411ceea59cf7ea053724936c637dbd2413596a5ba331e1'
n=struct.unpack_from('<I',b,12)[0];j=json.loads(b[20:20+n]);data=b[28+n:];rig=json.loads((SOURCE/'rig.json').read_text())
def acc(i):
 a=j['accessors'][i];v=j['bufferViews'][a['bufferView']];count={'VEC3':3,'SCALAR':1}[a['type']];fmt={5126:'f',5125:'I',5123:'H'}[a['componentType']];size=count*struct.calcsize(fmt)
 return [struct.unpack_from('<'+fmt*count,data,v.get('byteOffset',0)+a.get('byteOffset',0)+k*v.get('byteStride',size)) for k in range(a['count'])]
result={'sourceSha256':hashlib.sha256(b).hexdigest(),'method':'whole exterior islands only; moving linkage and its guides replaced by nominal simulator mechanism','frames':{}}
for name in ['engine_rear','engine_front']:
 frame=rig['frames'][name];node=next(x for x in j['nodes'] if x.get('name')==name);entries=[];first=rig['axles'][frame['axleNodes'][0]]['sMm']
 for pi,pr in enumerate(j['meshes'][node['mesh']]['primitives']):
  pts=acc(pr['attributes']['POSITION']);indices=[x[0] for x in acc(pr['indices'])];parent=list(range(len(pts)));seen={}
  def root(i):
   while parent[i]!=i:parent[i]=parent[parent[i]];i=parent[i]
   return i
  for i,p in enumerate(pts):
   key=tuple(round(x,3) for x in p)
   if key in seen:parent[root(i)]=root(seen[key])
   else:seen[key]=i
  for t in range(len(indices)//3):
   a,c,d=indices[t*3:t*3+3];parent[root(c)]=root(a);parent[root(d)]=root(a)
  groups={}
  for t in range(len(indices)//3):groups.setdefault(root(indices[t*3]),[]).append(t)
  removed=[];islands=0;relief=[]
  for triangles in groups.values():
   p=[pts[indices[t*3+k]] for t in triangles for k in range(3)];lo=[min(v[k] for v in p) for k in range(3)];hi=[max(v[k] for v in p) for k in range(3)]
   s0=-hi[2]+frame['pivotMm'][0];s1=-lo[2]+frame['pivotMm'][0];h0=lo[1]+frame['pivotMm'][1];h1=hi[1]+frame['pivotMm'][1]
   if name=='engine_front' and (lo[0]>1.8 or hi[0]<-1.8) and max(abs(lo[0]),abs(hi[0]))<7.5 and first-3<s0<first and first+18<s1<first+22 and 1<h0<2 and 10<h1<11:
    relief.extend(set(indices[t*3+k] for t in triangles for k in range(3)))
   old_rear_link=(name=='engine_rear' and (lo[0]>9.2 or hi[0]<-9.2) and max(abs(lo[0]),abs(hi[0]))<9.8 and 18<s0<s1<25 and 8<h0<h1<14)
   if old_rear_link or ((lo[0]>5.8 or hi[0]<-5.8) and h0>2 and h1<13 and s0>first-3 and s1<first+52):
    removed+=triangles;islands+=1
  entries.append({'primitive':pi,'indexCount':len(indices),'removedTriangles':sorted(removed),'wholeIslands':islands,'lateralReliefVertices':sorted(set(relief)),'lateralReliefFactor':.35})
 result['frames'][name]={'primitives':entries,'removedTriangles':sum(len(e['removedTriangles']) for e in entries)}
result['removedTriangles']=sum(f['removedTriangles'] for f in result['frames'].values())
# All old coupling-rod triangles must be removed exactly once: no ghost rods.
old=json.loads((ROOT/'docs/_active/rolling-stock/evidence/L02-E/coupling-rods.json').read_text())
for name,frame in old['frames'].items():
 for item in frame['primitives']:assert set(item['triangles'])<=set(result['frames'][name]['primitives'][item['primitive']]['removedTriangles'])
(OUT/'mechanism-rig.json').write_text(json.dumps(result,separators=(',',':'))+'\n');print(result['removedTriangles'])
