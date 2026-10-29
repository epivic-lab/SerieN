import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
export const STOCK=Object.freeze({
 steam:{id:'db-055-study',name:'BR 055 · study',length:114.3,front:48,width:18.5,prototypeMm:18285,description:'DB era III, G 8.1 with tender; original dimensional study, not a certified replica'},
 shunter:{id:'db-v60-study',name:'BR 260 · study',length:65.3,front:32.65,width:19.4,prototypeMm:10450,description:'DB era IV V60, three coupled axles; original dimensional study'},
 closed:{id:'db-era-closed',length:62.5,width:18,description:'Generic DB-era two-axle covered wagon; 10m design length'},
 open:{id:'db-era-open',length:62.5,width:18,description:'Generic DB-era open wagon; 10m design length'},
 tank:{id:'db-era-tank',length:62.5,width:18,description:'Generic DB-era tank wagon; 10m design length'},
 flat:{id:'db-era-flat',length:81.25,width:18,description:'Generic DB-era bogie flat wagon; 13m design length'},
 coach:{id:'db-era-coach',length:165,width:17.7,description:'Generic DB-era bogie passenger coach; 26.4m design length'}
});
export const FUTURE_STOCK=Object.freeze(['BR 44','BR 212','BR 232'].map(name=>({name,status:'planned; no model or historical identity assigned'})));
const mats={};
for(const [k,color] of Object.entries({black:'#252928',red:'#9e3028',diesel:'#a83529',roof:'#686961',metal:'#8a8d85',glass:'#314b52',wood:'#795a3c',brown:'#784b32',green:'#304c3a',ivory:'#c9c6ac'}))mats[k]=new THREE.MeshStandardMaterial({color,roughness:k==='metal'?.45:.78,metalness:k==='metal'?.65:.12});
function box(p,w,h,d,m,x=0,y=0,z=0){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mats[m]);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;p.add(o);return o;}
function cyl(p,r,len,m,x,y,z,axis='y'){const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,len,16),mats[m]);if(axis==='x')o.rotation.z=Math.PI/2;if(axis==='z')o.rotation.x=Math.PI/2;o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;p.add(o);return o;}
function wheels(parent,x,r,rig,red=false){const axle=new THREE.Group();axle.position.set(x,2.45+r,0);parent.add(axle);rig.wheels.push({node:axle,radius:r});
 for(const s of [-1,1]){cyl(axle,r,1.1,red?'red':'black',0,0,s*4.7,'z');cyl(axle,r*.3,1.25,'metal',0,0,s*4.7,'z');for(let j=0;j<6;j++){const spoke=box(axle,r*1.65,.32,.2,red?'red':'metal',0,0,s*5.32);spoke.rotation.z=j*Math.PI/3;}}
 batch(axle);
}
function bogie(parent,x,rig,axleSpacing=10){const b=new THREE.Group();b.position.x=x;parent.add(b);box(b,axleSpacing+5,2,12,'black',0,6.6);for(const a of [-axleSpacing/2,axleSpacing/2])wheels(b,a,2.9,rig);rig.bogies.push({node:b,offset:x,wheelbase:axleSpacing});return b;}
function batch(parent){parent.updateMatrixWorld(true);const map=new Map();for(const o of [...parent.children]){if(!o.isMesh)continue;const g=o.geometry.toNonIndexed();g.applyMatrix4(o.matrix);if(!map.has(o.material))map.set(o.material,[]);map.get(o.material).push(g);parent.remove(o);o.geometry.dispose();}
 for(const [m,geos]of map){const o=new THREE.Mesh(mergeGeometries(geos),m);o.castShadow=o.receiveShadow=true;parent.add(o);geos.forEach(g=>g.dispose());}
}
export function buildStock(kind){const spec=STOCK[kind];if(!spec)throw Error('Unknown stock '+kind);const root=new THREE.Group(),body=new THREE.Group();root.add(body);root.userData.dynamic=true;
 const rig={body,wheels:[],bogies:[],rods:[],pistons:[]};root.stockRig=rig;root.userData.stock={...spec,kind};const front=spec.front??spec.length/2;
 root.userData.couplers={front:{x:front+1.6,y:8,z:0},back:{x:front-spec.length-1.6,y:8,z:0}};
 for(const x of [front-1,front-spec.length+1]){for(const s of [-1,1]){cyl(body,1,2,'metal',x,8,s*5,'x');cyl(body,1.5,.5,'black',x+Math.sign(x),8,s*5,'x');}box(body,3.2,1.2,1.3,'black',x+Math.sign(x)*1.0,7);}
 if(kind==='steam'){
  box(body,69,2.5,16,'red',10,9);cyl(body,6.9,49,'black',10,19,0,'x');box(body,17,18,18,'black',-20,20);box(body,20,1.5,20,'black',-20,30);
  for(const s of [-1,1]){box(body,8,7,.4,'glass',-21,24,s*9.1);box(body,65,.8,1,'black',8,12,s*9);cyl(body,.35,42,'metal',9,24,s*7.1,'x');}
  for(const x of [1,14])cyl(body,2.2,4,'black',x,27,0);cyl(body,2.5,9,'black',30,28,0);cyl(body,3.4,.8,'black',30,32.6,0);
  for(const x of [-10,-1,8,17])wheels(body,x,4.22,rig,true);
  cyl(body,6.6,.8,'black',35,19,0,'x');cyl(body,1.1,1,'metal',35.7,19,0,'x');
  for(const side of [-1,1]){
   cyl(body,2.1,9,'black',29,7,side*7.7,'x');
   for(const x of [-27,-24])for(const y of [5,8,11])box(body,3.2,.5,2.5,'metal',x,y,side*9.5);
   for(const x of [-25,-17])box(body,.45,8,.5,'metal',x,24,side*9.35);
   box(body,8,.45,.5,'metal',-21,28,side*9.35);
   const piston=box(body,1,.6,.6,'metal',22.15,6.67,side*6);piston.scale.x=9;rig.pistons.push({node:piston,side});
  }
  const tender=bogie(body,-46,rig,22);wheels(tender,0,2.9,rig);box(tender,34,2.5,17,'red',0,9);box(tender,30,12,17,'black',0,16);box(tender,23,1,13,'black',0,22.7);
  // Coal pieces are original geometry, not an external texture.
  for(let i=0;i<30;i++){const coal=box(tender,2.4,1.1+i%3*.3,2.1,'black',-11+i%10*2.4,23+Math.sin(i*7)*.5,-4+Math.floor(i/10)*4);coal.rotation.y=i*2.4;}
  // Three-axle tender steers as a separate rigid body on the canonical route.
  batch(tender);
 }else if(kind==='shunter'){
  box(body,61,3,18,'red',0,9);box(body,32,13,15,'diesel',10,17);box(body,12,12,15,'diesel',-23,16);
  box(body,17,21,19,'diesel',-10,21);box(body,20,1.5,21,'roof',-10,32.2);
  for(const s of [-1,1]){box(body,12,7,.4,'glass',-10,26,s*9.6);for(let x=0;x<24;x+=2)box(body,.45,7,.35,'black',x,19,s*7.6);for(const x of [-29,27])box(body,4,1,3,'metal',x,9,s*8);}
  cyl(body,1,8,'black',18,27,0);for(const x of [-16,0,16])wheels(body,x,3.91,rig,true);
 }else{
  const l=spec.length-6;box(body,l,2.5,18,'black',0,9);
  if(kind==='flat'||kind==='coach'){for(const x of [-spec.length*.32,spec.length*.32])bogie(body,x,rig);}
  else for(const x of [-19,19])wheels(body,x,2.9,rig);
  if(kind==='tank'){cyl(body,8,l-5,'roof',0,19,0,'x');cyl(body,2,2,'black',0,27,0);for(const x of [-15,15])box(body,1,15,16,'black',x,17);}
  else if(kind==='coach'){
   box(body,l,17,17.7,'green',0,19);box(body,l+1,2,18.2,'roof',0,28.2);
   for(const s of [-1,1])for(let x=-l/2+9;x<l/2-5;x+=10){box(body,6.5,7,.35,'glass',x,22,s*9);box(body,7,.5,.4,'ivory',x,17.6,s*9);}
  }else if(kind==='closed'){
   box(body,l-2,17,17.8,'brown',0,19);box(body,l,2,18,'roof',0,28);
   for(const s of [-1,1]){box(body,13,15,.5,'wood',0,19,s*9);for(let x=-l/2+3;x<l/2;x+=6)box(body,.5,16,.6,'black',x,19,s*9);}
  }else if(kind==='open'){
   box(body,l,1,17,'wood',0,11);for(const s of [-1,1]){box(body,l,9,.7,'brown',0,15,s*8.5);for(let x=-l/2+2;x<l/2;x+=8)box(body,.7,9,1,'black',x,15,s*8.5);}for(const x of [-l/2,l/2])box(body,.7,9,17,'brown',x,15);
  }else{box(body,l,1,18,'wood',0,11);for(const s of [-1,1])for(let x=-l/2+3;x<l/2;x+=12)box(body,.65,8,.65,'black',x,15,s*8.5);}
 }
 if(kind==='steam'||kind==='shunter')for(const side of [-1,1]){const rod=box(body,kind==='steam'?27:32,.65,.65,'metal',kind==='steam'?3.5:0,7,side*6);rig.rods.push({node:rod,side,radius:kind==='steam'?4.22:3.91,baseX:rod.position.x});}
 // Preserve animation nodes while batching static body geometry by material.
 const rods=new Set([...rig.rods,...rig.pistons].map(r=>r.node));for(const o of rods)body.remove(o);batch(body);for(const o of rods)body.add(o);
 return root;
}
export function animateStock(root,journey,coordinate,distance){const rig=root.stockRig;if(!rig||root.userData.assetDimensions)return;
 for(const w of rig.wheels)w.node.rotation.z=-distance/w.radius;
 for(const r of rig.rods){const a=-distance/r.radius+(r.side<0?Math.PI/2:0);r.node.position.set(r.baseX+Math.cos(a)*1.3,2.45+r.radius+Math.sin(a)*1.3,r.side*6);}
 for(const p of rig.pistons){const a=-distance/4.22+(p.side<0?Math.PI/2:0),x=17+Math.cos(a)*1.3,y=6.67+Math.sin(a)*1.3;
  const dx=Math.sqrt(9*9-(y-6.67)**2),dy=6.67-y;p.node.position.set(x+dx/2,(y+6.67)/2,p.side*6);p.node.scale.x=9;p.node.rotation.z=Math.atan2(dy,dx);
 }
 const base=journey.locate(coordinate);
 for(const b of rig.bogies){const p=journey.locate(coordinate+b.offset),front=journey.locate(coordinate+b.offset+b.wheelbase/2),rear=journey.locate(coordinate+b.offset-b.wheelbase/2);
  // Root yaw uses -atan2(dz,dx); convert the chord heading to local yaw.
  const angle=-Math.atan2(front.z-rear.z,front.x-rear.x);b.node.rotation.y=angle-base.angle;
  const dx=p.x-base.x,dz=p.z-base.z,c=Math.cos(base.angle),s=Math.sin(base.angle);b.node.position.set(c*dx-s*dz,0,s*dx+c*dz);
 }
}
