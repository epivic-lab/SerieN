// Browser-only metrology for BR01-B. Both rectangles come from the vehicle
// metadata consumed by railway-conflicts. Include every rendered mesh vertex.
import * as T from 'three';

const tolerance = .05;
const point = new T.Vector3(), other = new T.Vector3();
const matrix = new T.Matrix4(), relative = new T.Matrix4();

function outside(p, vehicle) {
  const {couplers, stock} = vehicle.userData;
  return Math.max(0, p.x-couplers.front.x, couplers.back.x-p.x, Math.abs(p.z)-stock.width/2);
}

function interfaceTriangles(group, engine) {
  const triangles = [];
  group.traverse(mesh=>{
    if (!mesh.isMesh || !mesh.name.startsWith(engine?'engine_':'tender_')) return;
    const pos=mesh.geometry.attributes.position, indices=mesh.geometry.index;
    for(let i=0;i<indices.count;i+=3){
      const ids=[indices.getX(i),indices.getX(i+1),indices.getX(i+2)];
      // Source-space broad phase at the adjoining ends, before applying world pose.
      if(ids.every(id=>engine?pos.getX(id)>-3:pos.getX(id)<-8)) continue;
      const v=ids.map(id=>new T.Vector3().fromBufferAttribute(pos,id).applyMatrix4(mesh.matrixWorld));
      triangles.push({mesh:mesh.name,face:i/3,v,box:new T.Box3().setFromPoints(v)});
    }
  });
  return triangles;
}

function interference(vehicles) {
  const [engine,tender]=vehicles.map((g,i)=>interfaceTriangles(g,i===0));
  const ray=new T.Ray(),hit=new T.Vector3();
  function crosses(a,b){
    for(let i=0;i<3;i++){
      const start=a[i],end=a[(i+1)%3];
      ray.origin.copy(start);ray.direction.subVectors(end,start);
      const length=ray.direction.length();if(length<1e-8)continue;
      ray.direction.divideScalar(length);
      if(ray.intersectTriangle(...b,false,hit)){
        const d=hit.distanceTo(start);
        if(d>1e-6 && d<length-1e-6)return true;
      }
    }
    return false;
  }
  engine.sort((a,b)=>Number(b.mesh==='engine_haus')-Number(a.mesh==='engine_haus'));
  for(const a of engine)for(const b of tender){
    if(a.box.intersectsBox(b.box) && (crosses(a.v,b.v)||crosses(b.v,a.v)))
      return {engine:[a.mesh,a.face],tender:[b.mesh,b.face],world:hit.toArray()};
  }
  return null;
}

export function measureJoint(vehicles, detailed=false) {
  vehicles.forEach(g=>g.updateMatrixWorld(true));
  const inverse=vehicles.map(g=>g.matrixWorld.clone().invert());
  const union={max:0,count:0};
  const bodies=vehicles.map((g,i)=>{
    const result={max:0,count:0,vertices:0,part:null};
    relative.multiplyMatrices(inverse[1-i],g.matrixWorld);
    g.traverse(mesh=>{
      if(!mesh.isMesh)return;
      const pos=mesh.geometry.attributes.position;
      matrix.multiplyMatrices(inverse[i],mesh.matrixWorld);
      for(let j=0;j<pos.count;j++){
        point.fromBufferAttribute(pos,j).applyMatrix4(matrix);
        const excess=outside(point,g);
        result.vertices++;
        if(excess<=0)continue;
        if(excess>result.max){result.max=excess;result.part=mesh.name||'generated linkage / lamp';}
        if(excess>tolerance)result.count++;
        const both=Math.min(excess,outside(other.copy(point).applyMatrix4(relative),vehicles[1-i]));
        union.max=Math.max(union.max,both);if(both>tolerance)union.count++;
      }
    });
    return result;
  });
  const pins=vehicles.map((g,i)=>new T.Vector3(g.userData.couplers[i?'front':'back'].x,8,0).applyMatrix4(g.matrixWorld));
  const yaw=vehicles[0].rotation.y-vehicles[1].rotation.y;
  return {bodies,union,relativeYawDegrees:T.MathUtils.radToDeg(Math.atan2(Math.sin(yaw),Math.cos(yaw))),
    nominalPinSeparation:pins[0].distanceTo(pins[1]),...(detailed?{triangleIntersection:interference(vehicles)}:{})};
}
