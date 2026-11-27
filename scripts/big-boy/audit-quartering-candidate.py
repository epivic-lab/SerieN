"""Independent acceptance of the L02-F triangle-partition candidate.
The measured vertices are transformed by the declared side rotation, without
using the browser's rendering implementation or its computed cap centres.
"""
import importlib.util,json,math,struct
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'docs/_active/rolling-stock/evidence/L02-F'
spec=importlib.util.spec_from_file_location('source_audit',Path(__file__).with_name('audit-quartering.py'))
source=importlib.util.module_from_spec(spec);spec.loader.exec_module(source)


def audit(manifest=None):
    manifest=manifest or json.loads((OUT/'quartering-rig.json').read_text())
    baseline=source.audit()
    if manifest['sourceSha256']!=baseline['sourceSha256']:
        raise ValueError('Candidate/source identity mismatch')
    phase=manifest['positiveSidePhaseRad']
    if not math.isfinite(phase):raise ValueError('Non-finite phase')
    b=(source.SOURCE/'prototype.glb').read_bytes();n=struct.unpack_from('<I',b,12)[0];j=json.loads(b[20:20+n]);data=b[28+n:]
    rig=json.loads((source.SOURCE/'rig.json').read_text())
    def accessor(index):
        a=j['accessors'][index];v=j['bufferViews'][a['bufferView']];count={'VEC3':3,'SCALAR':1}[a['type']];fmt={5126:'f',5125:'I',5123:'H'}[a['componentType']];size=count*struct.calcsize(fmt)
        return [struct.unpack_from('<'+fmt*count,data,v.get('byteOffset',0)+a.get('byteOffset',0)+k*v.get('byteStride',size)) for k in range(a['count'])]
    records=[];total=0
    for record in baseline['axles']:
        name=record['axle'];node=next(v for v in j['nodes'] if v.get('name')==name);primitives=j['meshes'][node['mesh']]['primitives'];candidate=manifest['wheels'][name]['primitives'];points=[];count=0
        if len(primitives)!=len(candidate):raise ValueError('Primitive mismatch')
        for pr,part in zip(primitives,candidate):
            positions=accessor(pr['attributes']['POSITION']);indices=[x[0] for x in accessor(pr['indices'])];selected=set(part['positiveTriangles'])
            if len(selected)!=len(part['positiveTriangles']) or not all(isinstance(t,int) and 0<=t<len(indices)//3 for t in selected):raise ValueError('Invalid triangle partition')
            if part['indexCount']!=len(indices):raise ValueError('Index count changed')
            for t in range(len(indices)//3):
                triangle=[positions[i] for i in indices[3*t:3*t+3]]
                if (min(p[0] for p in triangle)>0)!=(t in selected):raise ValueError('Side partition changed')
                for x,y,z in triangle:
                    points.append((x,y*math.cos(phase)-z*math.sin(phase),y*math.sin(phase)+z*math.cos(phase)) if t in selected else (x,y,z))
                count+=1
        caps={str(side):source.cap_centre(points,side,6.0) for side in [-1,1]}
        vectors=[(caps[str(side)]['alongMm'],caps[str(side)]['heightMm']) for side in [-1,1]]
        frame=rig['axles'][name]['parent'];q=(manifest['frames'][frame]['crankAlongMm'],manifest['frames'][frame]['crankHeightMm'])
        if not all(math.isfinite(v) for v in q):raise ValueError('Non-finite calibration')
        residual=max(2*math.hypot(q[0]-p['alongMm'],q[1]-p['heightMm']) for p in record['samples'][0]['sides'].values())
        records.append({'axle':name,'triangles':count,'caps':caps,'phaseDifferenceDegrees':source.phase_difference(*vectors),'quarteringPass':source.quartered(*vectors),'maximumCrankMotionDifferenceMm':residual,'motionCalibrationPass':residual<=.03})
        total+=count
    if len(manifest['wheels'])!=8:raise ValueError('Unexpected wheelset')
    return {'sourceSha256':baseline['sourceSha256'],'positiveSidePhaseRad':phase,'targetDegrees':90,'toleranceDegrees':source.TOLERANCE_DEGREES,'motionToleranceMm':.03,'axles':records,'driverTrianglesConserved':total,'maximumQuarteringErrorDegrees':max(abs(r['phaseDifferenceDegrees']-90) for r in records),'maximumCrankMotionDifferenceMm':max(r['maximumCrankMotionDifferenceMm'] for r in records),'pass':all(r['quarteringPass'] and r['motionCalibrationPass'] for r in records),'scope':'quartering and crank displacement; rod-hole seating, main rods, valve gear and swept interference are not qualified'}

if __name__=='__main__':
    result=audit();(OUT/'candidate-quartering.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps({k:result[k] for k in ['pass','driverTrianglesConserved','maximumQuarteringErrorDegrees','maximumCrankMotionDifferenceMm']},indent=2))
    raise SystemExit(0 if result['pass'] else 2)
