"""Export the exact L02-D procedural meshes for the isolated Three.js lab."""
import bpy,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(Path(__file__).parent))
from drawgear import build_drawgear,build_mounts
rig=json.loads((ROOT/'docs/_active/rolling-stock/evidence/L02-D/prototype/rig.json').read_text())
frames={}
for name in rig['frames']:
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);frames[name]=o
members=build_drawgear(rig['kinematics']['drawbar']);mounts=build_mounts(rig,frames)
result={}
for name,obj in [('engine',members[0]),('tender',members[1]),*[(k+'Mount',v) for k,v in mounts.items()]]:
 m=obj.data;m.calc_loop_triangles()
 # Along/up/lateral; bracket x is lateral, y is along in build_mounts.
 xyz=[(v.co.y,v.co.z,v.co.x) if name.endswith('Mount') else (v.co.x,v.co.z,v.co.y) for v in m.vertices]
 # Swapping two axes reverses winding.
 result[name]={'positions':[c for p in xyz for c in p],'indices':[i for t in m.loop_triangles for i in (t.vertices if name.endswith('Mount') else reversed(t.vertices))]}
(ROOT/'docs/_active/rolling-stock/evidence/L02-E/drawgear.json').write_text(json.dumps(result,separators=(',',':'))+'\n')
