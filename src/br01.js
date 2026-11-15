import * as THREE from 'three';
import {BR01_GEAR,buildDrawgear} from './br01-drawbar.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

// 23.94 m over buffers at 1:160. Separate Journey vehicles keep the tender
// inside its own swept envelope when the engine enters a curve.
const scale = (23940 / 160) / (20.066135 + 19.735239);
const joint = -5.55;
const origins = {engine: (20.066135 + joint)/2, tender: (-19.735239 + joint)/2};
const axles = [
  [-17.03,-1.76,.705],[-13.88,-1.76,.705],[-10.36,-1.76,.705],[-7.21,-1.76,.705],
  [-3.52,-1.44,.999],[2.865,-.775,1.632],[6.675,-.775,1.632],[10.605,-.775,1.632],
  [13.61,-1.76,.705],[17.32,-1.76,.705]
];
const truckCenters = [-15.455,-8.785,15.465,-3.52];
const metal = new THREE.MeshStandardMaterial({color:0xafaead,metalness:.6,roughness:.36});
const crimson = new THREE.MeshStandardMaterial({color:0x9a2e26,metalness:.4,roughness:.48});
const barGeometry = new THREE.BoxGeometry(1,1,1);
const pinGeometry = new THREE.CylinderGeometry(1,1,1,14).rotateX(Math.PI/2);
let template;

export async function loadBR01(){
  template ??= new GLTFLoader().loadAsync('./assets/br01/locomotive.glb').then(g=>g.scene);
  return template;
}

function linkage(parent, side){
  const bars = new Map(), pins = new Map();
  function bar(name,a,b,z,height,depth,material=metal){
    if(!bars.has(name)){
      const mesh=new THREE.Mesh(barGeometry,material);
      parent.add(mesh);bars.set(name,mesh);
    }
    const node=bars.get(name), dx=b[0]-a[0],dy=b[1]-a[1];
    node.position.set((a[0]+b[0])/2,(a[1]+b[1])/2,side*z);
    node.scale.set(Math.hypot(dx,dy),height,depth);
    node.rotation.z=Math.atan2(dy,dx);
  }
  function pin(name,at,z,radius){
    if(!pins.has(name)){const mesh=new THREE.Mesh(pinGeometry,metal);parent.add(mesh);pins.set(name,mesh);}
    const node=pins.get(name);node.position.set(at[0],at[1],side*z);node.scale.set(radius,radius,.18);
  }
  // Intersect a rigid rod with the horizontal crosshead guide.
  function slider(crank,length,y){return [crank[0]+Math.sqrt(length*length-(crank[1]-y)**2),y];}
  return angle=>{
    const phase=angle+(side<0?Math.PI/2:0)-Math.PI/2;
    const dx=.62*Math.cos(phase),dy=.62*Math.sin(phase);
    const cranks=axles.slice(5,8).map(([x,y])=>[x+dx,y+dy]);
    const crank=cranks[1],cross=slider(crank,6.05,-.62);
    bar('coupling',cranks[0],cranks[2],1.49,.16,.12,crimson);
    cranks.forEach((p,i)=>pin('pin'+i,p,1.52,.20));
    bar('main',crank,cross,1.82,.22,.16);
    pin('big end',crank,1.86,.23);
    bar('crosshead',[cross[0]-.30,cross[1]],[cross[0]+.30,cross[1]],1.82,.4,.30);
    bar('piston',cross,[cross[0]+2.8,cross[1]],1.82,.14,.14);
    const eccentric=[6.675+.35*Math.cos(phase+.95),-.775+.35*Math.sin(phase+.95)];
    bar('return crank',crank,eccentric,2.08,.16,.1);
    // Expansion link pivots about a fixed trunnion. Solve the intersection
    // of the eccentric rod circle and link circle for the lower pin.
    const pivot=[10.04,.54],vx=pivot[0]-eccentric[0],vy=pivot[1]-eccentric[1],d=Math.hypot(vx,vy);
    const along=(3.54**2-.99**2+d*d)/(2*d),h=Math.sqrt(Math.max(0,3.54**2-along*along));
    const foot=[eccentric[0]+(along*vx+h*vy)/d,eccentric[1]+(along*vy-h*vx)/d];
    const top=[pivot[0]+(pivot[0]-foot[0])*.33,pivot[1]+(pivot[1]-foot[1])*.33];
    bar('eccentric rod',eccentric,foot,2.18,.12,.09);
    bar('link',foot,top,2.18,.15,.11);
    const valve=slider(top,3.58,.32);
    bar('radius rod',top,valve,2.19,.10,.10);
    bar('valve stem',valve,[valve[0]+1.5,valve[1]],2.19,.10,.10);
    pin('return',eccentric,2.2,.13);pin('trunnion',pivot,2.2,.13);
  };
}

export function buildBR01(source,kind,id){
  const root=new THREE.Group(),body=new THREE.Group();
  const origin=origins[kind],tender=kind==='tender';
  // Longitudinal support of the unchanged body or its rotating gear,
  // whichever projects farther. The tender width includes bogie swing.
  const front=tender?Math.max((-5.278371334075928-origin)*scale,BR01_GEAR.tenderPin+Math.hypot(BR01_GEAR.tongue,.25)):(20.06613540649414-origin)*scale;
  const back=tender?(-19.735239028930664-origin)*scale:Math.min((-6.508633136749268-origin)*scale,BR01_GEAR.enginePin-Math.hypot(BR01_GEAR.sleeve,.39));
  root.userData.stock={id:'br01-'+kind,kind:'br01-'+kind,name:tender?'Tender 2′2′':'BR 01',length:front-back,width:tender?20.4:5.784*scale};
  root.userData.couplers={front:{x:front,y:8,z:0},back:{x:back,y:8,z:0}};
  if(!tender)root.userData.stock.tenderPitch=BR01_GEAR.pitch;
  root.userData.trainId=id;
  root.add(body);body.scale.setScalar(scale);body.position.set(-origin*scale,2.407*scale,0);
  const trucks=new Map(),wheels=[];
  function truck(i){
    if(!trucks.has(i)){const node=new THREE.Group();node.position.x=truckCenters[i];body.add(node);trucks.set(i,node);}
    return trucks.get(i);
  }
  for(const original of source.children){
    const part=original.userData.rigPart;
    const axle=part.startsWith('axle_')?Number(part.slice(5)):-1;
    const onTender=part==='tender'||part.startsWith('truck_')||(axle>=0&&axle<4);
    if(tender!==onTender)continue;
    const mesh=original.clone();mesh.userData.trainId=id;mesh.castShadow=true;
    let carrier=body;
    const truckIndex=part.startsWith('truck_')?Number(part.slice(6)):axle>=8?2:axle>=0&&axle<4?Math.floor(axle/2):axle===4?3:-1;
    if(truckIndex>=0){carrier=truck(truckIndex);mesh.position.x=-truckCenters[truckIndex];}
    if(axle>=0){
      const [x,y,r]=axles[axle],node=new THREE.Group();
      node.position.set(x+mesh.position.x,r-2.407,0);carrier.add(node);node.add(mesh);mesh.position.set(-x,-y,0);wheels.push({node,r,x,axle});
    }else carrier.add(mesh);
  }
  const sides=tender?[]:[linkage(body,-1),linkage(body,1)];
  if(!tender){
    const head=new THREE.MeshStandardMaterial({color:0xfff4d1,emissive:0xffe4ad});
    for(const side of [-1,1]){const lens=new THREE.Mesh(pinGeometry,head);lens.rotation.y=Math.PI/2;lens.scale.set(.13,.13,.08);lens.position.set(18.75,.20,side*1.48);body.add(lens);}
    const beam=new THREE.SpotLight(0xffe4a2,2,320,.38,.65);
    beam.position.set(45,12,0);beam.target.position.set(200,0,0);root.add(beam,beam.target);
    Object.assign(root.userData,{headMaterial:head,beam});
  }
  root.br01Pose=(distance,journey,at,pose)=>{
    for(const {node,r,x,axle} of wheels){
      node.rotation.z=-distance/(scale*r);
      if(axle>=5 && axle<=7){
        // Axial play of the coupled axles keeps the treads on a curved rail.
        const axis=journey.locate(at+(x-origin)*scale);
        node.position.z=((axis.x-pose.x)*Math.sin(pose.angle)+(axis.z-pose.z)*Math.cos(pose.angle))/scale;
      }
    }
    for(const solve of sides)solve(-distance/(1.632*scale));
    const c=Math.cos(pose.angle),s=Math.sin(pose.angle);
    for(const [i,node] of trucks){
      const offset=(truckCenters[i]-origin)*scale, half=(i===3?0.05:i===2?1.855:1.575)*scale;
      const front=journey.locate(at+offset+half),back=journey.locate(at+offset-half);
      const dx=(front.x+back.x)/2-pose.x,dz=(front.z+back.z)/2-pose.z;
      node.position.set(origin+(c*dx-s*dz)/scale,0,(s*dx+c*dz)/scale);
      node.rotation.y=-Math.atan2(front.z-back.z,front.x-back.x)-pose.angle;
    }
  };
  buildDrawgear(root,tender);
  return root;
}
