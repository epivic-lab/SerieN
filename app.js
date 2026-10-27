import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const $=id=>document.getElementById(id);
const host=$('view3d');
const scene=new THREE.Scene();
scene.background=new THREE.Color('#9fbcc5');
scene.fog=new THREE.Fog('#b8c3af',1900,3700);
const camera=new THREE.OrthographicCamera(-1100,1100,650,-650,1,6500);
camera.position.set(1580,1150,1570);
camera.lookAt(750,0,350);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.23;
host.prepend(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);
controls.target.set(750,0,350);
controls.enableDamping=true;controls.dampingFactor=.065;
controls.minPolarAngle=.25;controls.maxPolarAngle=1.38;
controls.minZoom=.65;controls.maxZoom=3.4;
controls.enablePan=true;
controls.update();

const mat=(hex,rough=1,metal=0)=>new THREE.MeshStandardMaterial({color:hex,roughness:rough,metalness:metal});
const wood=mat('#876d4f'),earth=mat('#8d785f'),ballast=mat('#8c8476'),sleepers=mat('#50453b'),steel=mat('#889698',.46,.58);
const cream=mat('#cfbda3'),brick=mat('#a56b51'),roofRed=mat('#744a3f'),roofGray=mat('#5d655e'),gravel=mat('#9c9985');
const grassMaterials=[mat('#809767'),mat('#839b6b'),mat('#71895a'),mat('#91a470')];
const shadowCast=o=>{o.castShadow=true;o.receiveShadow=true;return o};
const box=(w,h,d,m,parent=scene,x=0,y=0,z=0)=>{const o=shadowCast(new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m));o.position.set(x,y,z);parent.add(o);return o};
const sphere=(r,m,parent=scene,x=0,y=0,z=0)=>{const o=shadowCast(new THREE.Mesh(new THREE.IcosahedronGeometry(r,1),m));o.position.set(x,y,z);parent.add(o);return o};
const cylinder=(r1,r2,h,m,parent=scene,x=0,y=0,z=0,n=10)=>{const o=shadowCast(new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,n),m));o.position.set(x,y,z);parent.add(o);return o};
const PI=Math.PI,lerp=(a,b,t)=>a+(b-a)*t,clamp=(v,a,b)=>Math.min(b,Math.max(a,v)),mod=(v,n=1)=>(v%n+n)%n;
let seed=20261027;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
const val=(v)=>typeof v==='number'?v:0;
const topLights=[];
const sun=new THREE.DirectionalLight('#ffe7c7',2.45);sun.position.set(-480,1200,-650);
sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-1150;sun.shadow.camera.right=1150;sun.shadow.camera.top=950;sun.shadow.camera.bottom=-950;sun.shadow.camera.near=1;sun.shadow.camera.far=3000;sun.shadow.bias=-.00035;scene.add(sun);
scene.add(new THREE.HemisphereLight('#e5eff2','#506344',1.65));
const fill=new THREE.DirectionalLight('#d4e5f4',.65);fill.position.set(900,600,950);scene.add(fill);

// The railway geometry is in millimetres, following the physical 1500 × 700 mm base.
const ballastLayer=box(1500,18,700,mat('#77664d'),scene,750,-12,350);
ballastLayer.castShadow=false;
const ground=box(1498,3,698,mat('#799461'),scene,750,-1.3,350);
ground.castShadow=false;
function ellipse(x,z,rx,rz,y,color){const o=new THREE.Mesh(new THREE.SphereGeometry(1,14,9),color);o.scale.set(rx,y,rz);o.position.set(x,-4,z);o.castShadow=true;o.receiveShadow=true;scene.add(o);return o}
// Instancing avoids a thousand individual draw calls for grass.
const grassGeo=new THREE.PlaneGeometry(1,1),dummy=new THREE.Object3D();
for(let kind=0;kind<grassMaterials.length;kind++){
 const n=255,inst=new THREE.InstancedMesh(grassGeo,grassMaterials[kind],n);
 for(let i=0;i<n;i++){dummy.position.set(25+rnd()*1450,.4+rnd()*.2,20+rnd()*660);dummy.rotation.set(-PI/2,0,rnd()*PI);dummy.scale.set(2+rnd()*7,2+rnd()*7,1);dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix)}
 inst.instanceMatrix.needsUpdate=true;scene.add(inst)
}
// Terrain hills beyond the lines of running, avoiding the operational yard.
ellipse(1250,398,115,94,50,mat('#789063'));
ellipse(1150,465,120,94,44,mat('#798f62'));
ellipse(235,460,105,82,28,mat('#819763'));
ellipse(1355,480,54,70,25,mat('#879c70'));
// The shelf edge is clad in dark timber for the eventual premium display frame.
box(1510,22,8,wood,scene,750,-16,702);
box(8,22,706,wood,scene,-5,-16,350);
box(8,22,706,wood,scene,1505,-16,350);

// Procedural grass and stone materials deliberately avoid pixel art.
const pebbleColors=['#958b76','#6f7164','#aaa58d','#555f54'];
for(let i=0;i<300;i++){
 const x=rnd()*1480+10,z=rnd()*685+8;
 const m=mat(pebbleColors[i%4]),p=sphere(1.5+rnd()*3,m,scene,x,.8,z);
 p.scale.set(1.5,.32,.8);
}
// A broadleaf forest in gold, amber, rust and muted green.
const bark=mat('#574736');
const leafColors=['#c88835','#dcad50','#b86535','#d19b40','#a65f39','#7e995c','#c2a44e','#d5b06f','#58794f'];
const leafMats=leafColors.map(c=>mat(c));
const pineMats=[mat('#446849'),mat('#547650'),mat('#3b5746')];
const trunkGeometry=new THREE.CylinderGeometry(1,1,1,7);
function broadleaf(x,z,h,color){
 const g=new THREE.Group();g.position.set(x,0,z);
 cylinder(h*.052,h*.065,h*.7,bark,g,0,h*.35,0,7);
 const leaf=leafMats[color%leafMats.length],leaf2=leafMats[(color+2)%leafMats.length];
 sphere(h*.26,leaf,g,-h*.15,h*.67,0).scale.set(1,.95,1.04);
 sphere(h*.27,leaf2,g,h*.13,h*.75,-h*.08).scale.set(1,.9,.9);
 sphere(h*.29,leaf,g,0,h*.87,h*.13).scale.set(.95,1.05,1);
 sphere(h*.21,leaf2,g,-h*.05,h*.97,-h*.1);
 scene.add(g);return g;
}
function pine(x,z,h,c){
 const g=new THREE.Group();g.position.set(x,0,z);
 cylinder(1.8,2.6,h*.75,bark,g,0,h*.37,0,6);
 for(let i=0;i<4;i++){const hh=h*(.51+i*.13),r=h*(.29-i*.053);
 const o=new THREE.Mesh(new THREE.ConeGeometry(r,hh,8),pineMats[(c+i)%3]);
 o.position.y=h*(.37+i*.165);o.castShadow=true;o.receiveShadow=true;g.add(o)}
 scene.add(g);return g;
}
// Keep track and building clearances. Place forest in the village/sawmill gap.
for(let i=0;i<165;i++){
 const x=30+rnd()*1440,z=18+rnd()*664;
 const onPerimeter=(x<175||x>1320||z<135||z>570);
 const woodland=(x>1000&&x<1340&&z>315&&z<585);
 const corner=(x<400&&z>320&&z<570);
 const protectedTracks=(z<160&&x>300&&x<1200)||(x>155&&x<1100&&z>160&&z<320)||(z>575&&x>290&&x<1200);
 const village=(z>330&&z<570&&x>240&&x<950);
 if(!((onPerimeter||woodland||corner)&&!protectedTracks&&!village))continue;
 const h=23+rnd()*37;
 if(rnd()>.32)broadleaf(x,z,h,Math.floor(rnd()*leafMats.length));else pine(x,z,h,Math.floor(rnd()*3));
}
for(let i=0;i<70;i++){const x=1100+rnd()*260,z=335+rnd()*260;if(rnd()>.25)broadleaf(x,z,22+rnd()*25,Math.floor(rnd()*8));else pine(x,z,24+rnd()*26,0)}

// A path representation with exact model-space X/Z control points and measured lengths.
const pt=(x,z)=>new THREE.Vector3(x,3.5,z);
function pathBySamples(points){let distance=[0],length=0;for(let i=1;i<points.length;i++){length+=points[i].distanceTo(points[i-1]);distance.push(length)}return{points,distance,length}}
function pathFromControl(coords,closed=false){
 const curve=new THREE.CatmullRomCurve3(coords.map(v=>pt(v[0],v[1])),closed,'centripetal',.25);
 const steps=Math.max(120,Math.round(coords.length*43));
 return pathBySamples(curve.getPoints(steps));
}
function stadium(r){
 const coords=[];
 for(let x=360;x<=1140;x+=7)coords.push(pt(x,350-r));
 for(let i=1;i<=90;i++){const a=-PI/2+i*PI/90;coords.push(pt(1140+r*Math.cos(a),350+r*Math.sin(a)))}
 for(let x=1132;x>=360;x-=7)coords.push(pt(x,350+r));
 for(let i=1;i<=90;i++){const a=PI/2+i*PI/90;coords.push(pt(360+r*Math.cos(a),350+r*Math.sin(a)))}
 coords.push(coords[0].clone());return pathBySamples(coords);
}
const loops=[stadium(249),stadium(282),stadium(315)];
const yard={
 lead:pathFromControl([[812,101],[780,125],[714,167],[627,212],[525,257],[410,284]]),
 upper:pathFromControl([[812,101],[725,127],[628,155],[505,184],[369,216],[243,231]]),
 middle:pathFromControl([[410,284],[348,269],[271,276],[177,292]]),
 lower:pathFromControl([[410,284],[333,305],[229,331],[122,362]]),
 runMain:pathFromControl([[410,284],[490,267],[578,247],[674,239],[748,243],[825,247]]),
 runAround:pathFromControl([[410,284],[485,302],[566,307],[667,289],[761,268],[825,247]]),
 right:pathFromControl([[825,247],[940,247],[1095,247],[1250,247]])
};
// Runaround: parallel tracks between B and C with TWO connecting turnouts, not a dead siding.
const graphLabels=[
 {s:'TRONCHINO 1',x:240,z:226},{s:'TRONCHINO 2',x:180,z:285},
 {s:'TRONCHINO 3',x:120,z:354},{s:'TRONCHINO 4',x:1263,z:246},
 {s:'RUNAROUND LUNGO',x:595,z:294}
];

function at(path,u){const target=clamp(u,0,1)*path.length,ds=path.distance;let low=0,high=ds.length-1;while(high-low>1){const m=(low+high)>>1;if(ds[m]<target)low=m;else high=m}
 const t=clamp((target-ds[low])/(ds[high]-ds[low]||1),0,1);
 return path.points[low].clone().lerp(path.points[high],t)}
function tangent(path,u){let a=at(path,clamp(u-.001,0,1)),b=at(path,clamp(u+.001,0,1));return b.sub(a).normalize()}
function pathAtLoop(path,u){return at(path,mod(u))}
function addRail(path,label){
 const points=path.points;const railbed=new THREE.BufferGeometry();let verts=[],indices=[],uv=[];
 for(let i=0;i<points.length;i++){const p=points[i],t=tangent(path,i/(points.length-1)),side=new THREE.Vector3(-t.z,0,t.x).multiplyScalar(12.3);
 verts.push(p.x-side.x,1.3,p.z-side.z,p.x+side.x,1.3,p.z+side.z);
 uv.push(0,i*.07,1,i*.07);if(i){const k=i*2;indices.push(k-2,k-1,k,k-1,k+1,k)}}
 railbed.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));railbed.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));railbed.setIndex(indices);railbed.computeVertexNormals();
 const bedMesh=new THREE.Mesh(railbed,ballast);bedMesh.receiveShadow=true;scene.add(bedMesh);
 // Railheads + web are separate metallic 3D objects.
 for(const signed of [-1,1]){
  const railPts=[];for(let i=0;i<points.length;i+=3){const p=points[i],tan=tangent(path,i/(points.length-1)),side=new THREE.Vector3(-tan.z,0,tan.x).multiplyScalar(signed*4.5);railPts.push(new THREE.Vector3(p.x+side.x,5.15,p.z+side.z))}
  railPts.push(railPts[0].distanceTo(railPts[railPts.length-1])<10?railPts[0].clone():railPts[railPts.length-1].clone());
  const railCurve=new THREE.CatmullRomCurve3(railPts,false,'centripetal');
  const mesh=new THREE.Mesh(new THREE.TubeGeometry(railCurve,Math.max(80,railPts.length*2),.8,5,false),steel);
  mesh.castShadow=true;scene.add(mesh);
 }
 const slpShape=new THREE.BoxGeometry(15,1.8,2.5),instances=Math.max(3,Math.floor(path.length/12.5));
 const ties=new THREE.InstancedMesh(slpShape,sleepers,instances),obj=new THREE.Object3D();
 for(let i=0;i<instances;i++){const u=(i+.5)/instances,p=at(path,u),tan=tangent(path,u);obj.position.set(p.x,2.65,p.z);obj.rotation.set(0,-Math.atan2(tan.z,tan.x),0);obj.updateMatrix();ties.setMatrixAt(i,obj.matrix)}
 ties.instanceMatrix.needsUpdate=true;ties.receiveShadow=true;scene.add(ties);
 return {mesh:bedMesh,label};
}
loops.forEach((l,i)=>addRail(l,'ANELLO '+(i+1)));
Object.entries(yard).forEach(([name,p])=>addRail(p,name));

// Small crossovers visually connect adjacent running tracks.
const wxSegments=[
 pathFromControl([[440,101],[492,94],[548,69]]),
 pathFromControl([[440,69],[492,76],[548,101]]),
 pathFromControl([[860,69],[918,61],[975,35]]),
 pathFromControl([[860,35],[918,43],[975,69]])];
wxSegments.forEach(p=>addRail(p,'wx'));

// Buildings: brick/wood facades, roof ridges, windows and chimneys.
const windowDay=mat('#3f5d62'),windowNight=new THREE.MeshStandardMaterial({color:'#ebc174',emissive:'#ffbb58',emissiveIntensity:.2,roughness:.9});
const windows=[];
function buildHouse(x,z,w,d,h,wall,roof,type='house',orientation=0){
 const g=new THREE.Group();g.position.set(x,1.5,z);g.rotation.y=orientation;scene.add(g);
 const base=box(w,h,d,wall,g,0,h/2,0);
 // Two sloping rectangular roof panels.
 const pitch=type==='factory'?.19:.36,roofHeight=w*pitch*.5;
 const roofA=box(Math.hypot(w*.5,roofHeight)+7,3,d+10,roof,g,-w*.25,h+roofHeight*.54,0);roofA.rotation.z=-Math.atan2(roofHeight,w*.5);
 const roofB=box(Math.hypot(w*.5,roofHeight)+7,3,d+10,roof,g,w*.25,h+roofHeight*.54,0);roofB.rotation.z=Math.atan2(roofHeight,w*.5);
 for(let side of [-1,1]){
  for(let i=-1;i<=1;i++){const pane=box(10,13,1,windowDay,g,i*w*.27,h*.52,side*(d/2+.8));const bright=box(8,11,1.5,windowNight,g,i*w*.27,h*.52,side*(d/2+1.2));windows.push(bright)}
 }
 box(15,24,1.2,roofRed,g,-w*.33,12,d/2+1);
 if(type==='factory'){box(8,h*.72,8,mat('#996958'),g,w*.29,h*.99,-d*.3);}
 return g;
}
const hstyle=mat('#d8c4a6'),hbrick=mat('#b68d77'),hboard=mat('#98735b');
buildHouse(280,455,75,54,48,hstyle,roofRed);
buildHouse(385,456,78,61,60,hbrick,roofGray);
buildHouse(490,480,65,53,48,hstyle,roofRed);
buildHouse(583,449,80,57,62,hbrick,roofRed);
buildHouse(711,473,77,58,50,hstyle,roofGray);
buildHouse(814,465,94,60,46,hbrick,roofRed);
buildHouse(945,459,83,50,51,hstyle,roofGray);
const station=buildHouse(750,565,135,63,56,hbrick,roofGray);
buildHouse(1033,333,125,80,52,hboard,roofRed,'factory');
buildHouse(1165,338,77,58,45,cream,roofGray,'factory');
buildHouse(250,195,120,68,51,hboard,roofGray,'factory');
buildHouse(430,168,80,55,43,hboard,roofRed,'factory');

// Industrial lumber stacks along the right siding.
const logmat=mat('#7f6749');for(let i=0;i<38;i++){
 const x=1070+(i%10)*8,z=294+Math.floor(i/10)*7;const l=cylinder(2.9,2.9,47,logmat,scene,x,5.2+Math.floor(i/20)*5,z,7);l.rotation.z=PI/2;
}
// A lit water tower.
const tower=mat('#66665d');cylinder(3.2,3.2,55,tower,scene,915,29,331,8);
const tank=cylinder(16,14,22,mat('#6a7d7c'),scene,915,65,331,12);
for(let j=0;j<4;j++){const a=j*PI/2;box(2,46,2,tower,scene,915+11*Math.cos(a),25,331+11*Math.sin(a))}
const round=mat('#9c8c72');cylinder(7,7,2,round,scene,915,78,331,10);

// Extra landscaping along the front village road; retain the required 100 mm max scenic impression.
const roadMat=mat('#686c61'),curb=mat('#aaa99a');
box(1010,1.2,34,roadMat,scene,650,1.1,535);
box(1008,1,2.5,curb,scene,650,1.8,516);
box(1008,1,2.5,curb,scene,650,1.8,553);
for(let x=198;x<1110;x+=70)box(30,.5,1.2,mat('#d2c8a5'),scene,x,2,535);
const glow=new THREE.MeshStandardMaterial({color:'#ead4a3',emissive:'#edb768',emissiveIntensity:.6});
const lamps=[];
for(let x=520;x<=915;x+=78){const pole=cylinder(.7,.8,27,tower,scene,x,14,513,6);const ball=sphere(2.3,glow,scene,x,29,513);lamps.push(ball)}

// Mountains behind the board. They are separate stage elements, not part of the 17 cm physical clearance.
const mountain=mat('#7e8e83');
for(let i=0;i<13;i++){const x=-100+i*160+rnd()*80;const z=-360-rnd()*120;const m=sphere(145+rnd()*90,mountain,scene,x,-19,z);m.scale.set(1.6,.65,.62);m.castShadow=false}
for(let i=0;i<25;i++)pine(i*66+rnd()*25,-170-rnd()*80,48+rnd()*70,i%3);

// Track selectors with colored luminous pips.
const signalGreen=new THREE.MeshStandardMaterial({color:'#55b98a',emissive:'#259e58',emissiveIntensity:.4});
const signalGold=new THREE.MeshStandardMaterial({color:'#f0bd64',emissive:'#aa7724',emissiveIntensity:.6});
const switchSpecs=[
 {id:'WX-A',name:'WX310 ovest',x:510,z:78,kind:'cross',lanes:[0,1],on:false},
 {id:'WX-B',name:'WX310 est',x:915,z:50,kind:'cross',lanes:[1,2],on:false},
 {id:'Y-IN',name:'Accesso merci',x:812,z:101,kind:'lead',on:false},
 {id:'Y-2',name:'Tronchino nord',x:693,z:162,kind:'upper',on:false},
 {id:'Y-3',name:'Tronchini ovest',x:410,z:284,kind:'west',on:false},
 {id:'Y-R1',name:'Runaround ovest',x:474,z:279,kind:'passing',on:false},
 {id:'Y-R2',name:'Runaround est',x:825,z:247,kind:'passing',on:false},
 {id:'Y-4',name:'Tronchino est',x:935,z:247,kind:'right',on:false}
];
const switchHandles=[];
function makeSwitch(s){
 const group=new THREE.Group();group.position.set(s.x,0,s.z);
 box(12,2,12,mat('#34473e'),group,0,6,0);
 const bulb=sphere(6,signalGreen,group,0,14,0);bulb.userData.switchId=s.id;group.userData.switchId=s.id;
 const stalk=cylinder(1.1,1.1,9,mat('#5b6d5a'),group,0,9,0);stalk.userData.switchId=s.id;
 scene.add(group);s.group=group;s.bulb=bulb;switchHandles.push(group)
}switchSpecs.forEach(makeSwitch);

// Three separately controlled, illustrated 3D locomotives.
const railWheel=mat('#292c2a',.8),chassisRed=mat('#9a3a30');
const locoBlack=mat('#323736',.62,.16),locoCrimson=mat('#b94334'),locoCream=mat('#d8c49a');
const wagonColors=['#8f5c43','#71826f','#a27e50','#7f6e5d'];
const wagonMats=wagonColors.map(c=>mat(c));
function wheelSet(group,len){for(let a of [-len*.31,len*.31])for(let side of [-6,6]){
 const o=cylinder(4.2,4.2,2,railWheel,group,a,3.7,side,12);o.rotation.x=PI/2;
 }}
function freightWagon(i){
 const g=new THREE.Group();
 box(50,3,13,mat('#4b4640'),g,0,6,0);
 wheelSet(g,43);
 box(44,11,12,wagonMats[i%wagonMats.length],g,0,14,0);
 if(i%3===0){for(let j=-2;j<=2;j++){const log=cylinder(2.4,2.4,42,logmat,g,j*0.2,21,j*2.2);log.rotation.z=PI/2}}
 else{box(43,2,12,mat('#625a48'),g,0,20,0)}
 return g
}
function locoModel(id){
 const g=new THREE.Group();g.userData.trainId=id;
 if(id===0){
  box(62,3.6,13,chassisRed,g,2,9,0);
  wheelSet(g,58);
  const boiler=cylinder(8,8,43,locoBlack,g,7,20,0,14);boiler.rotation.z=PI/2;
  box(20,22,14,locoBlack,g,-24,22,0);
  box(17,3,17,locoBlack,g,-24,36,0);
  box(18,16,12,locoBlack,g,-38,17,0); // tender region
  for(let p of [16,26])cylinder(2,2,8,locoBlack,g,p,29,0);
  const cap=cylinder(4,4,2,locoBlack,g,27,33,0);cap.userData.trainId=id;
  box(50,1,1,steel,g,0,8.5,-8);
  box(50,1,1,steel,g,0,8.5,8);
 }else{
  const long=id===1?61:47;
  box(long,4,15,chassisRed,g,0,8,0);wheelSet(g,long*.85);
  box(long-6,id===1?19:16,14,id===1?locoCrimson:locoCrimson,g,0,id===1?22:21,0);
  if(id===1){box(long-5,5,15,mat('#a72d28'),g,0,34,0);for(let x of [-24,24])box(9,8,1,locoCream,g,x,26,7.6)}
  else{box(18,8,15,locoBlack,g,0,31,0);box(16,3,16,locoBlack,g,0,37,0)}
  for(let x of [-13,0,13]){box(7,3,.5,mat('#e8c6aa'),g,x,28,-7.6)}
 }
 g.traverse(o=>{if(o.isMesh)o.userData.trainId=id});
 scene.add(g);return g;
}
const trains=[
 {id:0,name:'BR 055',desc:'Vapore DB · Epoca III',icon:'🚂',loop:2,p:.19,speed:0,dir:1,cars:3,lights:true,laps:0,mode:'loop',group:locoModel(0),carObjs:[]},
 {id:1,name:'BR 216',desc:'Diesel DB · Epoca IV',icon:'🚆',loop:1,p:.59,speed:0,dir:1,cars:2,lights:false,laps:0,mode:'loop',group:locoModel(1),carObjs:[]},
 {id:2,name:'BR 260',desc:'Diesel da manovra DB',icon:'🚉',loop:0,p:.80,speed:0,dir:1,cars:2,lights:false,laps:0,mode:'loop',group:locoModel(2),carObjs:[]}
];
for(let t of trains){for(let i=0;i<5;i++){let g=freightWagon(i+t.id);scene.add(g);t.carObjs.push(g)}}
const detached=[];
const selectRing=new THREE.Mesh(new THREE.TorusGeometry(25,1.5,5,34),new THREE.MeshBasicMaterial({color:'#efdc9d'}));selectRing.rotation.x=PI/2;scene.add(selectRing);
let selected=0,paused=false,day=48,changes=0,transferred=false,visitedRunaround=false,didDetach=false,didAttach=false,mission=0;
const statuses=[
 {title:'Primo giro',body:'Fai completare un giro alla BR 055 sul suo anello.',done:()=>trains[0].laps>=1,detail:()=> 'Giri completati: '+trains[0].laps+' / 1'},
 {title:'Cambiare binario',body:'Attiva WX-A o WX-B e fai transitare una locomotiva da un anello all’altro.',done:()=>transferred,detail:()=>transferred?'Trasferimento riuscito':'Nessun trasferimento'},
 {title:'Il lungo runaround',body:'Predisponi il gruppo manovra e percorri con la BR 260 uno dei due rami del runaround lungo.',done:()=>visitedRunaround,detail:()=>visitedRunaround?'Runaround percorso':'In attesa della BR 260'},
 {title:'Composizione merci',body:'Sgancia un carro a treno fermo e poi riaggancialo sullo stesso binario.',done:()=>didDetach&&didAttach,detail:()=> 'Sgancio '+(didDetach?'✓':'○')+' · Aggancio '+(didAttach?'✓':'○')}
];
function log(s){$('log').textContent=s}
function switchBy(kind){return switchSpecs.find(s=>s.kind===kind)}
function ui(){
 $('tabs').innerHTML=trains.map(t=>'<button class="tab '+(t.id===selected?'active':'')+'" data-train="'+t.id+'"><span class="symbol">'+t.icon+'</span><span><strong>'+t.name+'</strong><small>'+(t.mode==='loop'?'ANELLO '+(t.loop+1):'FASCIO MERCI')+'</small></span></button>').join('');
 $('tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>select(+b.dataset.train));
 const t=trains[selected];$('trainIcon').textContent=t.icon;$('trainName').textContent=t.name;$('trainDescription').textContent=t.desc;
 $('trainRoute').textContent=t.mode==='loop'?'ANELLO '+(t.loop+1):t.section==='runAround'?'RUNAROUND LUNGO':'COMPARTO MERCI';
 $('speed').value=t.speed;$('speedNumber').textContent=t.speed+'%';$('cars').textContent=t.cars+' carri';
 $('lights').classList.toggle('active',t.lights);
 $('switchCount').textContent=switchSpecs.filter(s=>s.on).length+' / '+switchSpecs.length;
 $('switchList').innerHTML=switchSpecs.map((s,i)=>'<button class="sw '+(s.on?'active':'')+'" data-switch="'+i+'"><b>'+s.id+'</b><small>'+s.name+'</small></button>').join('');
 $('switchList').querySelectorAll('button').forEach(b=>b.onclick=()=>toggle(+b.dataset.switch));
 $('missionIndex').textContent=(mission+1)+' / 4';$('missionName').textContent=statuses[mission].title;$('missionText').textContent=statuses[mission].body;missionUI()
}
function missionUI(){$('missionStatus').textContent=statuses[mission].done()?'✓ Obiettivo completato':statuses[mission].detail()}
function select(id){selected=id;ui()}
function toggle(index){
 const s=switchSpecs[index];s.on=!s.on;s.bulb.material=s.on?signalGold:signalGreen;
 changes++;log(s.name+': '+(s.on?'deviato':'diritto'));ui()
}
function lineFraction(path,x,z){let best=Infinity,out=0;path.points.forEach((p,i)=>{const d=(p.x-x)**2+(p.z-z)**2;if(d<best){best=d;out=path.distance[i]/path.length}});return out}
const transfers=[
 {switchIndex:0,x:510,source:[0,1]},
 {switchIndex:1,x:915,source:[1,2]}
];
function crossed(before,after,needle,sign){
 const a=mod(before),b=mod(after);
 return sign>0?mod(needle-a)<mod(b-a):mod(a-needle)<mod(a-b)
}
function vehicleLocation(t,behind=0){
 let path,position;
 if(t.mode==='loop'){path=loops[t.loop];position=mod(t.p-t.dir*behind/path.length)}
 else {path=yard[t.section];position=clamp(t.s-t.dir*behind/path.length,0,1)}
 return {point:at(path,position),direction:tangent(path,position)}
}
function renderVehicles(){
 for(const t of trains){
 const pos=vehicleLocation(t);
 t.group.position.copy(pos.point).add(new THREE.Vector3(0,3.6,0));t.group.rotation.y=-Math.atan2(pos.direction.z,pos.direction.x);
 t.carObjs.forEach((o,i)=>{o.visible=i<t.cars;if(!o.visible)return;const q=vehicleLocation(t,64*(i+1));o.position.copy(q.point);o.rotation.y=-Math.atan2(q.direction.z,q.direction.x)});
 }
 const s=trains[selected];selectRing.position.copy(vehicleLocation(s).point);selectRing.position.y=5.2;
 for(const d of detached){let p=at(d.mode==='loop'?loops[d.loop]:yard[d.section],d.u);d.group.position.copy(p)}
}
function ensureYard(t,section,u=.001){t.mode='yard';t.section=section;t.s=u;t.cool=1;log(t.name+' → '+section)}
function advance(t,dt){
 if(!t.speed)return;
 let speed=(28+t.speed*1.55)*t.speed/100,delta=dt*speed;
 t.cool=Math.max(0,(t.cool||0)-dt);
 if(t.mode==='loop'){
 const before=t.p,after=mod(before+t.dir*delta/loops[t.loop].length);
 if(t.cool<=0){
  for(const tr of transfers){
   const s=switchSpecs[tr.switchIndex];
   if(!s.on||!tr.source.includes(t.loop))continue;
   const needle=lineFraction(loops[t.loop],tr.x,350-[249,282,315][t.loop]);
   if(crossed(before,after,needle,t.dir)){
    const to=tr.source[0]===t.loop?tr.source[1]:tr.source[0];
    t.loop=to;t.p=lineFraction(loops[to],tr.x,350-[249,282,315][to]);t.cool=2;
    transferred=true;log(t.name+' attraversa '+s.id+' → anello '+(to+1));ui();return;
   }
  }
  const y=switchBy('lead');
  if(y.on&&t.id===2&&t.loop===0&&crossed(before,after,lineFraction(loops[0],810,101),t.dir)){
   ensureYard(t,switchBy('upper').on?'upper':'lead');ui();return
  }
 }
 if(t.dir>0&&after<before||t.dir<0&&after>before)t.laps++;
 t.p=after;
 } else {
 if(t.dir<0&&t.s>=.999&&(t.section==='runMain'||t.section==='runAround')&&t.cool<=0){
   const desired=switchSpecs.find(s=>s.id==='Y-R2').on?'runAround':'runMain';
   if(t.section!==desired){t.section=desired;t.cool=1;log('Runaround est: instradamento sul binario '+(desired==='runAround'?'alternativo':'principale'));ui()}
  }
 const path=yard[t.section],next=t.s+t.dir*delta/path.length;
 if(next>=1){
   if(t.section==='lead'){
    if(switchBy('west').on){ensureYard(t,switchBy('passing').on?'lower':'middle');}
    else{ensureYard(t,switchBy('passing').on?'runAround':'runMain');visitedRunaround=true;log('BR 260 percorre il runaround lungo.')}
   }else if(t.section==='runMain'||t.section==='runAround'){
     if(switchBy('right').on){ensureYard(t,'right');}
     else {t.s=1;t.speed=0;log('Fine del runaround. Inverti la marcia per tornare.')}
   }else {t.s=1;t.speed=0;log('Fine tronchino. Inverti per uscire.')}
   ui();return;
 }
 if(next<0){
   if(t.section==='lead'){t.mode='loop';t.loop=0;t.p=lineFraction(loops[0],812,101);t.cool=2;log('BR 260 torna sull’anello interno')}
   else if(t.section==='runMain'||t.section==='runAround'||t.section==='middle'||t.section==='lower'){t.section='lead';t.s=.998}
   else if(t.section==='right'){t.section=switchSpecs.find(s=>s.id==='Y-R2').on?'runAround':'runMain';t.s=.998}
   else {t.s=0;t.speed=0}ui();return
 }
 t.s=clamp(next,0,1);
 }
}
function updateTrainStatus(){
 for(let a=0;a<trains.length;a++)for(let b=a+1;b<trains.length;b++){
  const u=trains[a],v=trains[b];if(u.mode==='loop'&&v.mode==='loop'&&u.loop===v.loop){
   const dist=Math.abs(mod(u.p-v.p+.5)-.5)*loops[u.loop].length;
   if(dist<62&&(u.speed||v.speed)){u.speed=v.speed=0;log('PROTEZIONE: treni sullo stesso binario, arresto automatico');ui()}
  }
 }
}
function uncouple(){const t=trains[selected];if(t.speed){log('Per sganciare, ferma prima il convoglio.');return}if(!t.cars){log('Nessun carro da sganciare.');return}
 const d=t.carObjs[t.cars-1];d.visible=true;
 const u=t.mode==='loop'?mod(t.p-t.dir*t.cars*64/loops[t.loop].length):clamp(t.s-t.dir*t.cars*64/yard[t.section].length,0,1);
 detached.push({mode:t.mode,loop:t.loop,section:t.section,u,group:d});t.cars--;didDetach=true;log(t.name+': ultimo carro sganciato');ui()
}
function couple(){const t=trains[selected];if(t.speed){log('Ferma il convoglio prima di agganciare.');return}
 const route=t.mode==='loop'?loops[t.loop]:yard[t.section],pos=t.mode==='loop'?t.p:t.s;
 const idx=detached.findIndex(d=>d.mode===t.mode&&(t.mode==='loop'?d.loop===t.loop:d.section===t.section)&&(Math.abs(d.u-pos)*route.length<115));
 if(idx<0){log('Nessun carro sganciato abbastanza vicino su questo binario.');return}
 const d=detached.splice(idx,1)[0];d.group.visible=false; // remove loose geometry, original wagon group resumes coupling
 t.cars++;didAttach=true;log(t.name+': carro agganciato');ui()
}
function reset(){
 if(!confirm('Riportare a zero locomotive, scambi e missioni?'))return;
 trains.forEach((t,i)=>{t.loop=[2,1,0][i];t.p=[.19,.59,.8][i];t.mode='loop';t.speed=0;t.dir=1;t.cars=[3,2,2][i];t.laps=0;t.cool=0});
 detached.length=0;switchSpecs.forEach(s=>{s.on=false;s.bulb.material=signalGreen});
 paused=false;mission=0;transferred=visitedRunaround=didDetach=didAttach=false;
 $('pause').textContent='Ⅱ Pausa';ui();log('Ripristino completato.');
}
$('speed').oninput=e=>{trains[selected].speed=+e.target.value;$('speedNumber').textContent=e.target.value+'%'};
$('reverse').onclick=()=>{const t=trains[selected];t.dir*=-1;log(t.name+' ha invertito direzione')};
$('stop').onclick=()=>{trains[selected].speed=0;ui();log(trains[selected].name+' ferma')};
$('lights').onclick=()=>{trains[selected].lights=!trains[selected].lights;ui()};
$('uncouple').onclick=uncouple;$('couple').onclick=couple;
$('day').oninput=e=>{day=+e.target.value;$('sun').textContent=day<42?'☀':day<72?'◐':'☾'};
$('nextMission').onclick=()=>{mission=(mission+1)%statuses.length;ui()};
$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'▶ Riprendi':'Ⅱ Pausa';log(paused?'Simulazione sospesa.':'Simulazione ripresa.')};
$('reset').onclick=reset;
$('homeView').onclick=()=>{camera.position.set(1580,1150,1570);controls.target.set(750,0,350);camera.zoom=1;camera.updateProjectionMatrix();controls.update()};
$('planBtn').onclick=()=>$('planModal').hidden=false;
$('helpBtn').onclick=()=>$('helpModal').hidden=false;
document.querySelectorAll('[data-close]').forEach(btn=>btn.onclick=()=>$($(btn).dataset.close).hidden=true);
document.querySelectorAll('.modal').forEach(el=>el.onclick=e=>{if(e.target===el)el.hidden=true});
window.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.modal').forEach(e=>e.hidden=true)});
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let down=null;
renderer.domElement.addEventListener('pointerdown',e=>down={x:e.clientX,y:e.clientY});
renderer.domElement.addEventListener('pointerup',e=>{
 if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>7)return;
 const rect=renderer.domElement.getBoundingClientRect();
 pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
 raycaster.setFromCamera(pointer,camera);
 const hit=raycaster.intersectObjects([...switchHandles,...trains.map(t=>t.group)],true);
 if(hit.length){
  let node=hit[0].object;while(node&&!node.userData.switchId&&node.userData.trainId===undefined)node=node.parent;
  if(node?.userData.switchId){let i=switchSpecs.findIndex(s=>s.id===node.userData.switchId);if(i>=0)toggle(i)}
  else if(node?.userData.trainId!==undefined)select(node.userData.trainId)
 }
 down=null;
});
const observer=new ResizeObserver(resize);observer.observe(host);
function resize(){
 const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;
 renderer.setSize(w,h,false);const aspect=w/h,span=1020;camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;camera.updateProjectionMatrix()
}
let last=performance.now(),frame=0;
function tick(now){
 const dt=Math.min(.05,(now-last)/1000);last=now;
 if(!paused){
  trains.forEach(t=>advance(t,dt));if(frame%15===0)updateTrainStatus();
 }
 frame++;renderVehicles();
 // daylight slider controls color temperature, sun intensity and house window glow.
 const night=clamp((day-35)/65,0,1);
 sun.intensity=lerp(2.4,.38,night);
 sun.color.set(day>40?'#e8b87d':'#ffe9c7');
 renderer.toneMappingExposure=lerp(1.24,.75,night);
 scene.background.set(night>.6?'#354d60':'#a1bec6');
 scene.fog.color.copy(scene.background);
 windowNight.emissiveIntensity=lerp(.25,2.4,night);
 glow.emissiveIntensity=lerp(.4,2.8,night);
 controls.update();renderer.render(scene,camera);
 if(frame%35===0){missionUI();$('sceneInfo').textContent=trains.filter(t=>t.speed>0).length+' CONVOGLI IN MARCIA · 4 TRONCHINI · RUNAROUND LUNGO'}
 requestAnimationFrame(tick)
}
resize();ui();$('loadMsg').hidden=true;requestAnimationFrame(tick);
