import * as THREE from 'three';
import {guardedStopView,stopProgress} from './guarded-stop-view.js';
import {createGuardedBell} from './guarded-stop-bell.js';
// All offsets are along the canonical tangent/normal. Geometry decides whether
// a candidate fits; an unavailable site suppresses the sign, not engine safety.
export function createGuardedStops({scene,network,getTrains,getDetached=()=>[],host,isPaused,isHidden=()=>document.hidden,terrainRoot=null,reducedMotion=false}){
 const root=new THREE.Group();root.name='Guarded STOP · engine observation';root.userData.dynamic=true;scene.add(root);
 const bell=createGuardedBell(),ui=document.createElement('div');ui.style.cssText='position:absolute;left:12px;top:12px;z-index:4;display:flex;gap:8px;align-items:center;max-width:70%;font-size:12px';
 const text=document.createElement('span'),mute=document.createElement('button');text.setAttribute('role','status');text.setAttribute('aria-live','polite');text.style.cssText='color:#fff;background:#16251ee8;padding:5px;border-radius:4px';mute.type='button';mute.textContent='Bell: on';mute.setAttribute('aria-label','Mute railway warning bell');mute.setAttribute('aria-pressed','false');ui.append(mute,text);host.append(ui);
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.font='bold 78px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('STOP',128,132);const texture=new THREE.CanvasTexture(canvas);
 const metal=new THREE.MeshStandardMaterial({color:'#929894',metalness:.55,roughness:.65}),red=new THREE.MeshStandardMaterial({color:'#b92c35',roughness:.86,emissive:'#b92c35',emissiveIntensity:.22}),white=new THREE.MeshStandardMaterial({map:texture,emissive:0xffffff,emissiveMap:texture,emissiveIntensity:.28,transparent:true,roughness:1,side:THREE.DoubleSide,depthWrite:false});
 const pole=new THREE.CylinderGeometry(.18,.22,16,8),board=new THREE.CylinderGeometry(2.8,2.8,.35,8),label=new THREE.PlaneGeometry(5.3,5.3),base=new THREE.CylinderGeometry(.9,1.1,.4,8),units=new Map();let reduced=reducedMotion,disposed=false,last=0;
 const terrain=terrainRoot??(scene.getObjectByName('Terrain · continuous relief and multiscale surface')??scene.children.find(o=>o.isMesh&&o.material?.map?.repeat.x===1496/128&&o.material.map.repeat.y===696/128)),ray=new THREE.Raycaster(),point=new THREE.Vector3(),triangle=new THREE.Triangle(),box=new THREE.Box3(),matrix=new THREE.Matrix4(),instance=new THREE.Matrix4();
 function ancestors(o,groups){for(let v=o;v;v=v.parent)if(groups.includes(v))return true;return false;}
 function free(candidate){
  // 18mm existing railway envelope plus full 3mm signal radius.
  for(const e of Object.values(network.edges))for(let i=1;i<e.points.length;i++){const a=e.points[i-1],b=e.points[i],dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((candidate.x-a.x)*dx+(candidate.z-a.z)*dz)/(dx*dx+dz*dz)));if(Math.hypot(candidate.x-a.x-t*dx,candidate.z-a.z-t*dz)<21)return false;}
  box.set(new THREE.Vector3(candidate.x-3,candidate.y-.01,candidate.z-3),new THREE.Vector3(candidate.x+3,candidate.y+23,candidate.z+3));let blocked=false;
  const dynamic=getTrains().flatMap(t=>[t.group,...t.carObjs]).concat(getDetached().map(d=>d.group));
  scene.updateMatrixWorld(true);
  scene.traverse(o=>{if(blocked||!o.isMesh||ancestors(o,[terrain,root])||o.userData.pickThrough||dynamic.some(g=>g.userData.beam&&ancestors(o,[g.userData.beam])))return;
   // Actual world-space triangles, also for merged scenery/instanced foliage.
   const geometry=o.geometry,pos=geometry?.attributes.position;if(!pos)return;const indices=geometry.index;
   const count=o.isInstancedMesh?o.count:1;
   for(let k=0;k<count&&!blocked;k++){matrix.copy(o.matrixWorld);if(o.isInstancedMesh){o.getMatrixAt(k,instance);matrix.multiply(instance);}if(!geometry.boundingBox)geometry.computeBoundingBox();const bounds=geometry.boundingBox.clone().applyMatrix4(matrix);if(!bounds.intersectsBox(box))continue;
    if(ancestors(o,dynamic)){blocked=true;break;}
    for(let i=0;i<(indices?indices.count:pos.count)&&!blocked;i+=3){for(let j=0;j<3;j++){point.fromBufferAttribute(pos,indices?indices.getX(i+j):i+j).applyMatrix4(matrix);triangle[['a','b','c'][j]].copy(point);}if(box.intersectsTriangle(triangle))blocked=true;}
   }
  });return !blocked;
 }
 function bodyBounds(g){const b=new THREE.Box3();g.updateWorldMatrix(true,true);g.traverseVisible(o=>{if(!o.isMesh||g.userData.beam&&ancestors(o,[g.userData.beam]))return;if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();b.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));});return b;}
 function place(p){if(!p||!terrain)return null;for(const offset of [24,-24,30,-30,36,-36,42,-42]){const candidate={x:p.x-p.tz*offset,z:p.z+p.tx*offset,y:0};if(candidate.x<4||candidate.x>1496||candidate.z<4||candidate.z>696)continue;
   ray.set(new THREE.Vector3(candidate.x,terrainRoot?500:150,candidate.z),new THREE.Vector3(0,-1,0));const hit=ray.intersectObject(terrain,Boolean(terrainRoot))[0];if(!hit)continue;candidate.y=hit.point.y;if([...units.values()].some(u=>u.pose&&Math.hypot(u.pose.x-candidate.x,u.pose.z-candidate.z)<7))continue;if(free(candidate))return {...candidate,angle:Math.atan2(-p.tx,-p.tz),edge:p.edge,s:p.s,offset,geometricClearanceVerified:true};
  }return null;}
 function unit(id){if(units.has(id))return units.get(id);const group=new THREE.Group();for(const [g,m,y,rotation]of [[base,metal,.2,0],[pole,metal,8,0],[board,red,17,Math.PI/2],[label,white,17,0]]){const mesh=new THREE.Mesh(g,m);mesh.position.y=y;if(g===label)mesh.position.z=.22;mesh.rotation.x=rotation;mesh.raycast=()=>{};group.add(mesh);}const back=new THREE.Mesh(label,white);back.position.set(0,17,-.22);back.rotation.y=Math.PI;back.raycast=()=>{};group.add(back);group.visible=false;root.add(group);const u={group,from:0,to:0,start:0,value:0,pose:null};units.set(id,u);return u;}
 function clear(){bell.setActive(false);for(const u of units.values()){u.group.visible=false;u.value=u.from=u.to=0;u.pose=null;u.key=null;u.nextPlace=0;}text.textContent='';text.hidden=true;}
 const unlock=e=>{if(e.isTrusted)bell.unlock();};document.addEventListener('pointerdown',unlock,true);document.addEventListener('keydown',unlock,true);
 mute.onclick=()=>{const value=!bell.snapshot.muted;bell.setMuted(value);mute.textContent=value?'Bell: muted':'Bell: on';mute.setAttribute('aria-pressed',String(value));};
 const quiet=()=>bell.setActive(false);document.addEventListener('visibilitychange',quiet);window.addEventListener('pagehide',quiet);
 return {root,bell,clear,get ui(){return Object.freeze({root:ui,mute,text});},setReducedMotion(v){reduced=Boolean(v);},update(now){if(disposed)return;last=now;const hazards=getTrains().map(guardedStopView).filter(Boolean),live=new Set(hazards.map(h=>h.id));bell.setActive(hazards.length>0&&!isPaused()&&!isHidden());
   const message=hazards.map(h=>`${h.name}: Approach blocked · ${h.braking?'braking':'guarded stop'} · ${h.risk} · ${h.reason}`).join('; ');if(text.textContent!==message)text.textContent=message;text.hidden=!message;
   for(const h of hazards){const u=unit(h.id),key=h.pose?`${h.pose.edge}:${h.pose.s}`:null;if(!key||u.key!==key){u.pose=null;u.value=u.from=u.to=0;u.nextPlace=0;u.key=key;u.group.visible=false;}if(!key)continue;if(!u.pose&&now>=(u.nextPlace??0)){const began=performance.now();u.pose=place(h.pose);u.placementMs=performance.now()-began;u.nextPlace=now+1000;}if(u.pose&&u.to!==1){u.from=u.value;u.to=1;u.start=now;}}
   for(const [id,u]of units){if(u.pose){const envelope=new THREE.Box3(new THREE.Vector3(u.pose.x-3,u.pose.y,u.pose.z-3),new THREE.Vector3(u.pose.x+3,u.pose.y+23,u.pose.z+3));if(getTrains().flatMap(t=>[t.group,...t.carObjs]).concat(getDetached().map(d=>d.group)).some(g=>envelope.intersectsBox(bodyBounds(g)))){u.group.visible=false;u.pose=null;u.value=u.from=u.to=0;}}if(!live.has(id)&&u.to!==0){u.from=u.value;u.to=0;u.start=now;}u.value=stopProgress(u.from,u.to,now-u.start,reduced);u.group.visible=Boolean(u.pose&&u.value>0);if(u.pose){u.group.position.set(u.pose.x,u.pose.y-24*(1-u.value),u.pose.z);u.group.rotation.y=u.pose.angle;}if(!u.to&&u.value===0){u.pose=null;u.key=null;u.nextPlace=0;}}
  },get snapshot(){return {time:last,units:[...units].map(([id,u])=>({id,visible:u.group.visible,value:u.value,pose:u.pose,placementMs:u.placementMs})),audio:bell.snapshot};},dispose(){if(disposed)return;disposed=true;clear();document.removeEventListener('pointerdown',unlock,true);document.removeEventListener('keydown',unlock,true);document.removeEventListener('visibilitychange',quiet);window.removeEventListener('pagehide',quiet);bell.dispose();ui.remove();root.removeFromParent();for(const g of [pole,board,label,base])g.dispose();for(const m of [metal,red,white])m.dispose();texture.dispose();root.clear();units.clear();}};
}
