"""Sampled triangle/BVH gate on the candidate mechanism and retained source body.
Named shared-joint component pairs and source attachment/entry parts are excluded
explicitly; this is not a contact solver or a continuous clearance certificate.
"""
import json,struct,sys,math,hashlib
from pathlib import Path
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[2]
args=sys.argv[sys.argv.index('--')+1:];sample=json.loads(Path(args[0]).read_text());out=Path(args[1])
base=ROOT/'docs/_active/rolling-stock/evidence';rig=json.loads((base/'L02-D/prototype/rig.json').read_text());removal=json.loads((base/'L02-F/mechanism-rig.json').read_text())
b=(base/'L02-D/prototype/prototype.glb').read_bytes();n=struct.unpack_from('<I',b,12)[0];j=json.loads(b[20:20+n]);data=b[28+n:]
def acc(i):
 a=j['accessors'][i];v=j['bufferViews'][a['bufferView']];count={'VEC3':3,'SCALAR':1}[a['type']];fmt={5126:'f',5125:'I',5123:'H'}[a['componentType']];size=count*struct.calcsize(fmt)
 return [struct.unpack_from('<'+fmt*count,data,v.get('byteOffset',0)+a.get('byteOffset',0)+k*v.get('byteStride',size)) for k in range(a['count'])]
source=[]
for name,frame in rig['frames'].items():
 node=next(v for v in j['nodes'] if v.get('name')==name)
 for pi,pr in enumerate(j['meshes'][node['mesh']]['primitives']):
  pts=acc(pr['attributes']['POSITION']);ind=[v[0] for v in acc(pr['indices'])];removed=set(removal['frames'][name]['primitives'][pi]['removedTriangles']) if name in removal['frames'] else set()
  if name in removal['frames']:
   rel=removal['frames'][name]['primitives'][pi];selected=set(rel['lateralReliefVertices']);pts=[(x*rel['lateralReliefFactor'] if k in selected else x,y,z) for k,(x,y,z) in enumerate(pts)]
  faces=[ind[i:i+3] for i in range(0,len(ind),3) if i//3 not in removed];source.append((name,pts,faces))

wheel_source=[]
for name,axle in rig['axles'].items():
 node=next(v for v in j['nodes'] if v.get('name')==name)
 for pr in j['meshes'][node['mesh']]['primitives']:
  pts=acc(pr['attributes']['POSITION']);ind=[v[0] for v in acc(pr['indices'])];wheel_source.append((name,pts,[ind[i:i+3] for i in range(0,len(ind),3)]))

def wheel_tree(case):
 verts=[];faces=[]
 for name,pts,tri in wheel_source:
  axle=rig['axles'][name];p=case['frames'][axle['parent']];pivot=rig['frames'][axle['parent']]['pivotMm'][0];driver=axle['parent'] in ('engine_rear','engine_front');angle=case['odometer']/axle['heightMm'];shift=case['slides'].get(name,0);start=len(verts)
  for quarter in (0,math.pi/2 if driver else 0):
   co,si=math.cos(angle+quarter),math.sin(angle+quarter)
   for x,y,z in pts:
    along=axle['sMm']-pivot-si*y-co*z;cross=x+shift;height=axle['heightMm']+co*y-si*z
    verts.append((p['x']+p['cos']*along-p['sin']*cross,height,p['z']+p['sin']*along+p['cos']*cross))
  for t in tri:
   offset=len(pts) if driver and min(pts[i][0] for i in t)>0 else 0
   faces.append(tuple(start+offset+i for i in t))
 return BVHTree.FromPolygons(verts,faces,all_triangles=True)

def body_tree(poses):
 verts=[];faces=[];names=[]
 for name,pts,tri in source:
  p=poses[name];h=rig['frames'][name]['pivotMm'][1];start=len(verts)
  verts.extend((p['x']-p['cos']*z-p['sin']*x,h+y,p['z']-p['sin']*z+p['cos']*x) for x,y,z in pts)
  faces.extend(tuple(start+i for i in t) for t in tri);names.extend([name]*len(tri))
 return BVHTree.FromPolygons(verts,faces,all_triangles=True),names,verts,faces

def groups(case):
 result={}
 for kind,instances in case['meshes'].items():
  t=sample['templates'][kind];points=[Vector(t['positions'][i:i+3]) for i in range(0,len(t['positions']),3)];faces=[t['indices'][i:i+3] for i in range(0,len(t['indices']),3)]
  for i,label in enumerate(instances['labels']):
   a=instances['matrices'][i*16:(i+1)*16];matrix=Matrix([a[k::4] for k in range(4)])
   g=result.setdefault(label['id'],{'vertices':[],'faces':[],'category':label['category'],'joints':set(label['joints'])});start=len(g['vertices'])
   g['vertices'].extend(matrix@p for p in points);g['faces'].extend(tuple(start+v for v in f) for f in faces)
 for g in result.values():
  g['tree']=BVHTree.FromPolygons(g['vertices'],g['faces'],all_triangles=True)
  g['low']=[min(v[k] for v in g['vertices']) for k in range(3)];g['high']=[max(v[k] for v in g['vertices']) for k in range(3)]
 return result

def boxes(a,b):return all(a['low'][k]<=b['high'][k] and b['low'][k]<=a['high'][k] for k in range(3))
report={'phaseStepDegrees':sample['step'],'cases':[],'excludedBodyCategories':['body-mount','cylinder-entry'],'excludedSelfPairs':'component pairs sharing a named joint; internal components of each named part','sourceWheels':'all 19 wheelsets; journal/pin and crosshead joint categories excluded from wheel contact test','inputSha256':hashlib.sha256(Path(args[0]).read_bytes()).hexdigest(),'pass':True}
cache={}
for case in sample['cases']:
 if case['id'] not in cache:cache[case['id']]=body_tree(case['frames'])
 body,names,bodyVertices,bodyFaces=cache[case['id']];parts=groups(case);hits=[];selfhits=[];wheelhits=[];wheels=wheel_tree(case)
 for name,g in parts.items():
  if g['category'] not in report['excludedBodyCategories']:
   pairs=g['tree'].overlap(body)
   if pairs:
    points=[bodyVertices[i] for _,q in pairs for i in bodyFaces[q]]
    hits.append({'part':name,'pairs':len(pairs),'sourceFrames':sorted(set(names[q] for _,q in pairs)),'sourceHitBoundsWorld':[[min(v[k] for v in points) for k in range(3)],[max(v[k] for v in points) for k in range(3)]]})
 for name,g in parts.items():
  if g['category']!='joint':
   pairs=g['tree'].overlap(wheels)
   if pairs:wheelhits.append({'part':name,'pairs':len(pairs)})
 entries=list(parts.items())
 for i,(name,a) in enumerate(entries):
  for other,b in entries[i+1:]:
   if a['joints']&b['joints'] or not boxes(a,b):continue
   pairs=a['tree'].overlap(b['tree'])
   if pairs:selfhits.append({'a':name,'b':other,'pairs':len(pairs)})
 ok=not hits and not selfhits and not wheelhits;report['pass']&=ok
 report['cases'].append({'pose':case['id'],'angle':case['angle'],'bodyHits':hits,'unconnectedPartHits':selfhits,'wheelHits':wheelhits,'maxLinkClosureMm':max(v['residual'] for v in case['summary'].values()),'pass':ok})
 print(case['id'],case['angle'],'body',len(hits),'self',len(selfhits),'wheels',len(wheelhits),flush=True)
report['failingCases']=sum(not c['pass'] for c in report['cases']);out.write_text(json.dumps(report,indent=2)+'\n')
print('PASS' if report['pass'] else 'FAIL',flush=True)

if not report['pass']:raise RuntimeError('Sampled mechanism clearance gate failed; see written report')
