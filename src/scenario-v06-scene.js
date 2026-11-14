import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {sample} from './network.js';
import {createStaticRaycast} from './static-raycast.js';
import {verifiedBytes} from './scenario-profile.js';

const HEAD=8.4,OFFSET=4.725;
// Nominal N running surface. This is a simulator rendering, not a certified
// manufacturing section or a reconstruction of undocumented blade actuators.
const SECTION=[[-.75,6],[.75,6],[.75,6.3],[.18,6.3],[.18,7.8],[.225,8.1],[.225,HEAD],[-.225,HEAD],[-.225,8.1],[-.18,7.8],[-.18,6.3],[-.75,6.3]];
export function v06RailGeometry(edge,side) {
  const vertices=[],indices=[],n=Math.ceil(edge.length/2),width=SECTION.length;
  for(let i=0;i<=n;i++) {
    const s=edge.length*i/n,p=sample(edge,s),a=sample(edge,s-.1),b=sample(edge,s+.1),length=Math.hypot(b.x-a.x,b.z-a.z);
    for(const [offset,y] of SECTION)vertices.push(p.x-(b.z-a.z)/length*(side*OFFSET+offset),y,p.z+(b.x-a.x)/length*(side*OFFSET+offset));
    if(i)for(let j=0;j<width;j++){const k=i*width+j,next=i*width+(j+1)%width;indices.push(k-width,next-width,k,next-width,next,k);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  return geometry;
}
export function createV06Railway(network) {
  const root=new THREE.Group();root.name='V06 R02 railway · exclusive procedural variant';
  root.userData.layoutId=network.metadata.layoutId;
  const metal=new THREE.MeshStandardMaterial({color:'#879096',roughness:.43,metalness:.58});
  const geometries=Object.values(network.edges).flatMap(e=>[-1,1].map(side=>v06RailGeometry(e,side)));
  const railGeometry=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());
  const rails=new THREE.Mesh(railGeometry,metal);rails.name='R02 running rails';rails.castShadow=true;rails.receiveShadow=true;root.add(rails);
  // A single owned cell per bed location: no superposed ballast strips at
  // WX diamonds or shared turnout leads. Only the bed outline is rasterized;
  // every running surface retains the exact operational polyline and gauge.
  const cells=new Set(),ties=[],tieKeys=new Set(),step=1;
  for(const edge of Object.values(network.edges)) {
    for(let i=1;i<edge.points.length;i++) {
      const a=edge.points[i-1],b=edge.points[i],dx=b.x-a.x,dz=b.z-a.z,l2=dx*dx+dz*dz;
      for(let x=Math.floor(Math.min(a.x,b.x)-12.3);x<Math.ceil(Math.max(a.x,b.x)+12.3);x++)
        for(let z=Math.floor(Math.min(a.z,b.z)-12.3);z<Math.ceil(Math.max(a.z,b.z)+12.3);z++) {
          const t=((x+.5-a.x)*dx+(z+.5-a.z)*dz)/l2;
          if(t<0&&i===1||t>1&&i===edge.points.length-1)continue;
          const q=Math.max(0,Math.min(1,t));
          if((x+.5-a.x-q*dx)**2+(z+.5-a.z-q*dz)**2<=12.3**2)cells.add(x+','+z);
        }
    }
    for(let s=2;s<edge.length;s+=4.5) {
      const p=sample(edge,s),a=sample(edge,s-.2),b=sample(edge,s+.2),angle=-Math.atan2(b.z-a.z,b.x-a.x);
      const key=Math.round(p.x/2)+','+Math.round(p.z/2);
      if(!tieKeys.has(key)){tieKeys.add(key);ties.push({p,angle});}
    }
  }
  const rows=new Map();for(const key of cells){const [x,z]=key.split(',').map(Number);if(!rows.has(x))rows.set(x,[]);rows.get(x).push(z);}
  const rectangles=[],active=new Map();let prior=-Infinity;
  for(const [x,zs] of [...rows].sort((a,b)=>a[0]-b[0])) {
    if(x!==prior+1){rectangles.push(...active.values());active.clear();}prior=x;zs.sort((a,b)=>a-b);
    const spans=[];let begin=zs[0],end=begin+1;for(const z of zs.slice(1)){if(z===end)end++;else{spans.push([begin,end]);begin=z;end=z+1;}}spans.push([begin,end]);
    const next=new Set();for(const [z0,z1] of spans){const key=z0+','+z1;next.add(key);if(active.has(key))active.get(key).x1=x+1;else active.set(key,{x0:x,x1:x+1,z0,z1});}
    for(const [key,rect] of active)if(!next.has(key)){rectangles.push(rect);active.delete(key);}
  }
  rectangles.push(...active.values());
  const positions=[];for(const {x0:x,x1,z0:z,z1} of rectangles)positions.push(x,3.75,z,x,3.75,z1,x1,3.75,z,x1,3.75,z,x,3.75,z1,x1,3.75,z1);
  const bedGeometry=new THREE.BufferGeometry();bedGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));bedGeometry.computeVertexNormals();
  const bed=new THREE.Mesh(bedGeometry,new THREE.MeshStandardMaterial({color:'#8b877b',roughness:1}));bed.name='R02 single-owner ballast';bed.receiveShadow=true;root.add(bed);
  const sleepers=new THREE.InstancedMesh(new THREE.BoxGeometry(16,1.1,1.5),new THREE.MeshStandardMaterial({color:'#514d43',roughness:.95}),ties.length),dummy=new THREE.Object3D();
  ties.forEach(({p,angle},i)=>{dummy.position.set(p.x,5.45,p.z);dummy.rotation.y=angle;dummy.updateMatrix();sleepers.setMatrixAt(i,dummy.matrix);});
  sleepers.name='R02 sleepers';sleepers.receiveShadow=true;root.add(sleepers);
  for(const terminal of network.metadata.terminals.filter(t=>t.type.startsWith('buffer-'))) {
    const edge=network.edges[terminal.edge],p=sample(edge,terminal.end?edge.length:0),a=sample(edge,terminal.end?edge.length-.5:.5);
    const buffer=new THREE.Group();buffer.name=terminal.type;buffer.position.set(p.x,0,p.z);buffer.rotation.y=-Math.atan2(a.z-p.z,a.x-p.x);
    const bar=new THREE.Mesh(new THREE.BoxGeometry(2,2,16),new THREE.MeshStandardMaterial({color:'#d0c8a8',roughness:.8}));bar.position.y=11.5;buffer.add(bar);
    for(const side of [-1,1]){const leg=new THREE.Mesh(new THREE.BoxGeometry(7,7,1.4),new THREE.MeshStandardMaterial({color:'#4c4740',roughness:.85}));leg.position.set(3,7.5,side*5);buffer.add(leg);}root.add(buffer);
  }
  return {root,stats:{edges:Object.keys(network.edges).length,railTop:HEAD,gauge:9,railCentreOffset:OFFSET,bedCells:cells.size,bedRectangles:rectangles.length,bedResolutionMm:step,
    originalRailwayAttached:false,variant:'complete-procedural-R02',bladeActuatorsCertified:false}};
}

function disposeRoot(root,extraMaterials=[]) {
  const geometries=new Set(),materials=new Set(extraMaterials),textures=new Set();
  root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});
  for(const m of materials)for(const v of Object.values(m))if(v?.isTexture)textures.add(v);
  textures.forEach(t=>{t.source?.data?.close?.();t.dispose();});materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());root.removeFromParent();root.clear();
}
export async function loadV06Scene(profile,{baseURL,onProgress=()=>{},signal}={}) {
  const root=new THREE.Group();root.name='V06 original scenery';root.scale.setScalar(1000);
  const technical=new THREE.Group();technical.name='V06 technical references';technical.scale.setScalar(1000);technical.visible=false;technical.userData.pickThrough=true;
  let terrain=null;
  const densityMeshes=[],materialMeshes=[],lowMaterials=new Map();
  const ownedMaterials=()=>[...lowMaterials.keys(),...lowMaterials.values()];
  const loader=new GLTFLoader(),modules=[],started=performance.now(),heightBounds=[],buildings=[];
  try {
    const lockBytes=await verifiedBytes(new URL('./assets/scenario-v06/asset-lock.json',baseURL),{sha256:'9ede69547d5da2e35eef63d4051d610d13d0647feb9413750f5510172a127499'},{signal});
    const lock=JSON.parse(new TextDecoder().decode(lockBytes));
    const entries=lock.files.filter(f=>f.path!=='modules/railway_visual.glb');
    for(const [i,entry] of entries.entries()) {
      if(!/^modules\/[a-z_]+\.glb$/.test(entry.path)||!Number.isSafeInteger(entry.bytes)||entry.bytes<=0||!/^[a-f0-9]{64}$/.test(entry.sha256))throw new Error('Invalid scenario inventory');
      onProgress(`Loading V06 · ${i+1} / ${entries.length}`);
      const bytes=await verifiedBytes(new URL('./assets/scenario-v06/'+entry.path,baseURL),entry,{signal});
      const gltf=await loader.parseAsync(bytes,'');
      if(signal?.aborted){disposeRoot(gltf.scene);throw new DOMException('Scenario load cancelled','AbortError');}
      if(entry.path==='modules/terrain.glb')terrain=gltf.scene;
      const target=entry.path.includes('technical_reference')?technical:root;target.add(gltf.scene);
      gltf.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;
        if(target!==technical){
          const convert=m=>{if(!lowMaterials.has(m)){const low=new THREE.MeshLambertMaterial({color:m.color,map:m.map,alphaMap:m.alphaMap,alphaTest:m.alphaTest,transparent:m.transparent,opacity:m.opacity,side:m.side,vertexColors:m.vertexColors,emissive:m.emissive,emissiveMap:m.emissiveMap,emissiveIntensity:m.emissiveIntensity});low.name=m.name+' · Low diffuse';low.forceSinglePass=true;lowMaterials.set(m,low);}return lowMaterials.get(m);};
          materialMeshes.push({mesh:o,original:o.material,low:Array.isArray(o.material)?o.material.map(convert):convert(o.material)});
        }
        const decorative=/vegetation|mountain_rocks|gardens_allotments/.test(entry.path);
        if(decorative)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.transparent&&m.side===THREE.DoubleSide)m.forceSinglePass=true;
        if(decorative&&o.isInstancedMesh&&o.count>12){
          const full=o.count,order=Array.from({length:full},(_,i)=>i);
          // Bit-reversed order distributes each density prefix across the
          // original instance sequence. Every original transform is retained.
          const reverse=n=>{let v=0;for(let bit=0;bit<24;bit++){v=(v<<1)|(n&1);n>>>=1;}return v;};order.sort((a,b)=>reverse(a)-reverse(b));
          for(const attribute of [o.instanceMatrix,o.instanceColor].filter(Boolean)){
            const old=attribute.array.slice(),size=attribute.itemSize;order.forEach((source,i)=>attribute.array.set(old.subarray(source*size,(source+1)*size),i*size));attribute.needsUpdate=true;
          }
          densityMeshes.push({mesh:o,full});
        }
      }});
      modules.push({path:entry.path,bytes:entry.bytes,sha256:entry.sha256});
    }
    root.updateMatrixWorld(true);technical.updateMatrixWorld(true);
    for(const module of root.children) {
      const bounds=new THREE.Box3().setFromObject(module);
      heightBounds.push(bounds);
      if(module.userData.module?.includes('building'))buildings.push({x:(bounds.min.x+bounds.max.x)/2,z:(bounds.min.z+bounds.max.z)/2,w:bounds.max.x-bounds.min.x,d:bounds.max.z-bounds.min.z,h:bounds.max.y-bounds.min.y,y:bounds.min.y});
    }
    const railway=createV06Railway(profile.network);
    const axes=new THREE.Group();axes.name='V06 operational axes';axes.visible=false;axes.userData.pickThrough=true;
    const material=new THREE.LineBasicMaterial({color:'#00e5dc',depthTest:true});
    for(const edge of Object.values(profile.network.edges))axes.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(edge.points.map(p=>new THREE.Vector3(p.x,HEAD+.3,p.z))),material));
    let attached=false,disposed=false,raycastIndex=null;
    const diagnostics={modules,loadMs:performance.now()-started,...railway.stats,technical:false,quality:null,decorativeInstanceDensity:1};
    return {root,terrain,diagnostics,trees:[],buildings,environment:{dispose(){}},
      cameraHeight:(x,z)=>heightBounds.reduce((height,b)=>x>=b.min.x&&x<=b.max.x&&z>=b.min.z&&z<=b.max.z?Math.max(height,b.max.y):height,0),
      zones:{pendingStops:[],update(){}},station:{update(){}},
      setQuality(value){const density=value==='low'?.3:1;for(const {mesh,full} of densityMeshes)mesh.count=Math.max(1,Math.ceil(full*density));for(const item of materialMeshes)item.mesh.material=value==='low'?item.low:item.original;diagnostics.materialModel=value==='low'?'Lambert':'original glTF PBR';diagnostics.quality=value;diagnostics.decorativeInstanceDensity=density;},update(){},
      attach(scene){if(disposed||attached)throw new Error('Invalid scenery lifecycle');scene.add(root,technical,railway.root,axes);raycastIndex=createStaticRaycast([root,technical,railway.root]);diagnostics.raycastObjects=raycastIndex.objectCount;attached=true;},
      raycastOccluders:(raycaster,scene,limit,hits)=>raycastIndex.cast(raycaster,scene,limit,hits),
      setTechnical(value){if(disposed)return;technical.visible=axes.visible=Boolean(value);diagnostics.technical=Boolean(value);},
      dispose(){if(disposed)return;disposed=true;raycastIndex?.dispose();disposeRoot(root,ownedMaterials());[technical,railway.root,axes].forEach(g=>disposeRoot(g));}};
  } catch(error) {disposeRoot(root,ownedMaterials());disposeRoot(technical);throw error;}
}
