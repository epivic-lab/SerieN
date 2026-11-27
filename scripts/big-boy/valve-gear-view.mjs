import * as THREE from 'three';
import {solveValveGear,VALVE_GEAR} from './valve-gear.mjs';
// Three instanced templates: link bars, bored eyes and cylindrical pins/stems.
// Nominal simulator geometry; no deformed/scaled source rods or floating ends.
export function createValveGear(rig,calibration){
 const group=new THREE.Group(),material=new THREE.MeshStandardMaterial({color:0x888c90,metalness:.8,roughness:.34});
 const templates={bar:new THREE.BoxGeometry(1,1,1),eye:new THREE.TorusGeometry(.65,.25,8,20),pin:new THREE.CylinderGeometry(.25,.25,1,16)};
 templates.pin.rotateX(Math.PI/2);
 const instances=Object.fromEntries(Object.entries(templates).map(([key,g])=>{const mesh=new THREE.InstancedMesh(g,material,512);mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;group.add(mesh);return [key,mesh];}));
 let records=[],summary={},labels={bar:[],eye:[],pin:[]},currentLabel=null;
 const matrix=new THREE.Matrix4(),basis=new THREE.Matrix4(),quat=new THREE.Quaternion(),position=new THREE.Vector3(),scale=new THREE.Vector3();
 function instance(kind,centre,x,y,z,sizes){basis.makeBasis(x,y,z);quat.setFromRotationMatrix(basis);position.copy(centre);scale.set(...sizes);matrix.compose(position,quat,scale);instances[kind].setMatrixAt(instances[kind].count++,matrix);labels[kind].push(currentLabel);}
 function update(state){
  for(const mesh of Object.values(instances))mesh.count=0;records=[];summary={};labels={bar:[],eye:[],pin:[]};
  for(const name of ['engine_rear','engine_front']){
   const frame=rig.frames[name],pose=state.frames[name],list=frame.axleNodes.map(n=>rig.axles[n]),driver=list[1],spec=calibration.frames[name],radius=Math.hypot(spec.crankAlongMm,spec.crankHeightMm);
   const theta=state.odometer/driver.heightMm+Math.atan2(spec.crankHeightMm,spec.crankAlongMm);
   for(const side of [-1,1]){
    const angle=theta+(side>0?calibration.positiveSidePhaseRad:0),p=solveValveGear(angle,radius,driver.heightMm),key=name+'_'+side;
    const lateral=new THREE.Vector3(-pose.sin,0,pose.cos),up=new THREE.Vector3(0,1,0),forward=new THREE.Vector3(pose.cos,0,pose.sin);
    const world=(point,plane)=>new THREE.Vector3(pose.x+pose.cos*(driver.sMm+point.s-frame.pivotMm[0])-pose.sin*side*plane,point.h,pose.z+pose.sin*(driver.sMm+point.s-frame.pivotMm[0])+pose.cos*side*plane);
    const record=(id,a,b,r,category='moving',jointIds=[])=>records.push({id:key+'/'+id,frame:name,side,a:a.toArray(),b:b.toArray(),radius:r,category,jointIds:jointIds.map(j=>key+'/'+j)});
    function rod(id,a,b,plane,width=.42,eyeScale=.8,joints=[]){
     currentLabel={id:key+'/'+id,category:'moving',joints:joints.map(j=>key+'/'+j)};
     const A=world(a,plane),B=world(b,plane),dir=B.clone().sub(A),length=dir.length();dir.normalize();const normal=lateral.clone(),vertical=normal.clone().cross(dir).normalize();
     instance('bar',A.clone().add(B).multiplyScalar(.5),dir,vertical,normal,[length,width,.3]);
     for(const point of [A,B])instance('eye',point,dir,vertical,normal,[eyeScale,eyeScale,.55]);
     record(id,A,B,Math.max(.9*eyeScale,.25),'moving',joints);
    }
    function pin(id,point,lo,hi,radiusScale=1,category='joint',jointIds=[]){
     currentLabel={id:key+'/'+id,category,joints:jointIds.map(j=>key+'/'+j)};
     const A=world(point,lo),B=world(point,hi);instance('pin',A.clone().add(B).multiplyScalar(.5),forward,up,lateral,[radiusScale,radiusScale,Math.abs(hi-lo)]);record(id,A,B,.25*radiusScale,category,jointIds);
    }
    function stem(id,a,b,plane,radiusScale=1,category='moving',jointIds=[]){
     currentLabel={id:key+'/'+id,category,joints:jointIds.map(j=>key+'/'+j)};
     const A=world(a,plane),B=world(b,plane),dir=B.clone().sub(A),length=dir.length();dir.normalize();const y=lateral.clone().cross(dir).normalize(),x=y.clone().cross(dir).normalize();
     instance('pin',A.clone().add(B).multiplyScalar(.5),x,y,dir,[radiusScale,radiusScale,length]);record(id,A,B,.25*radiusScale,category,jointIds);
    }
    const crank=list.map((axle,i)=>({s:axle.sMm-driver.sMm+p.C.s,h:p.C.h}));
    for(let i=0;i<3;i++)rod('coupling'+i,crank[i],crank[i+1],i===1?7.9:7.6,.55,1,['crank'+i,'crank'+(i+1)]);
    for(let i=0;i<4;i++){
     const slide=side*state.slides[frame.axleNodes[i]];
     pin('crankpin'+i,crank[i],6.3+slide,(i===1?10.1:i===2?8.3:8.0)+slide,1,'joint',['crank'+i]);
    }
    rod('main',p.C,p.Q,9.0,.65,1.1,['crank1','crosshead']);
    rod('returnCrank',p.C,p.E,10.0+side*state.slides[frame.axleNodes[1]],.45,.65,['crank1','eccentric']);
    rod('eccentricRod',p.E,p.P,10.8,.35,.65,['eccentric','rockerLower']);
    rod('expansionLink',p.P,p.F,10.8,.5,.65,['rockerLower','rockerPivot','die']);
    rod('radiusRod',p.D,p.U,9.55,.32,.55,['die','combinationTop']);
    rod('combinationLever',p.B,p.U,9.7,.4,.55,['combinationBottom','combinationTop','valve']);
    rod('dropLink',p.Q,p.K,9.7,.45,.6,['crosshead','drop']);
    rod('unionLink',p.K,p.B,9.7,.35,.55,['drop','combinationBottom']);
    const cylinder=name==='engine_front'?37:32;
    stem('pistonRod',p.Q,{s:cylinder,h:p.Q.h},9.1,1.3,'cylinder-entry',['crosshead']);
    stem('valveStem',p.V,{s:cylinder,h:p.V.h},10.35,.8,'cylinder-entry',['valve']);
    // Crosshead block between fixed guide rails; support attachments are named.
    currentLabel={id:key+'/crossheadBlock',category:'joint',joints:[key+'/crosshead']};const centre=world(p.Q,9.1);instance('bar',centre,forward,up,lateral,[1.5,2.3,.7]);record('crosshead',centre,centre,.92,'joint',['crosshead']);
    for(const height of [3.8,6.6])stem('guide'+height,{s:17,h:height},{s:26,h:height},9.1,.6,'fixed-guide');
    pin('rockerSupport',p.F,6.6,11.05,1.1,'body-mount',['rockerPivot']);
    const supportTop={s:p.F.s,h:12};stem('rockerSupport',p.F,supportTop,6.6,.8,'body-mount',['rockerPivot']);pin('rockerSupport',supportTop,2.7,6.6,.8,'body-mount',['rockerPivot']);
    for(const [id,point,lo,hi] of [['eccentric',p.E,9.35,11.0],['die',p.D,9.3,11.0],['combinationTop',p.U,9.3,9.95],['combinationBottom',p.B,9.55,9.95],['drop',p.K,9.5,9.95],['valve',p.V,9.5,10.55],['crosshead',p.Q,8.8,9.95]])pin(id,point,lo,hi,.8,'joint',[id]);
    summary[key]={theta:angle,residual:p.residual,points:p};
   }
  }
  for(const mesh of Object.values(instances))mesh.instanceMatrix.needsUpdate=true;
  return summary;
 }
 return {group,update,diagnostics:()=>({mechanisms:summary,primitives:records,instances:Object.fromEntries(Object.entries(instances).map(([k,v])=>[k,v.count]))}),
  exportMeshes:()=>Object.fromEntries(Object.entries(instances).map(([k,v])=>[k,{positions:Array.from(v.geometry.attributes.position.array),indices:Array.from(v.geometry.index.array),matrices:Array.from(v.instanceMatrix.array.slice(0,v.count*16)),labels:labels[k]}]))};
}
