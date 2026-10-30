import * as THREE from 'three';
import {TURNOUT_IDS,turnoutArrowView} from './turnout-arrow-view.js';

export const ARROW_CONFIG=Object.freeze({color:'#EF5066',height:6.08,width:.85,envelope:1.25,headLength:7,headHalfWidth:2.35,
  endInset:6,durationMs:340,idleOpacity:.58,revealOpacity:.92,refreshMs:150});
const noop=()=>{},ease=t=>t*t*(3-2*t);
function measured(path){const distance=[0];for(let i=1;i<path.points.length;i++)distance.push(distance.at(-1)+Math.hypot(path.points[i].x-path.points[i-1].x,path.points[i].z-path.points[i-1].z));return {points:path.points,distance,length:distance.at(-1)};}
function point(path,s){s=Math.max(0,Math.min(path.length,s));let i=1;while(i<path.points.length-1&&path.distance[i]<s)i++;const a=path.points[i-1],b=path.points[i],t=(s-path.distance[i-1])/(path.distance[i]-path.distance[i-1]||1);return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};}
export function arrowGeometry(source) {
  if(!source?.points||source.points.length<2||source.points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.z)))throw new RangeError('Invalid arrow path');
  const p=measured(source),c=ARROW_CONFIG,positions=[],uv=[],roles=[];
  if(!Number.isFinite(p.length)||p.length<=2*(c.endInset+c.headLength))throw new RangeError('Arrow path too short');
  function segment(a,b,sa,sb,role){const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);if(len<1e-8)return;const nx=-dz/len*c.envelope,nz=dx/len*c.envelope;
    positions.push(a.x+nx,c.height,a.z+nz,a.x-nx,c.height,a.z-nz,b.x+nx,c.height,b.z+nz,a.x-nx,c.height,a.z-nz,b.x-nx,c.height,b.z-nz,b.x+nx,c.height,b.z+nz);
    uv.push(1,sa,-1,sa,1,sb,-1,sa,-1,sb,1,sb);roles.push(role,role,role,role,role,role);}
  const stations=[c.endInset,...p.distance.filter(s=>s>c.endInset&&s<p.length-c.endInset),p.length-c.endInset];
  for(let i=1;i<stations.length;i++)segment(point(p,stations[i-1]),point(p,stations[i]),stations[i-1]/p.length,stations[i]/p.length,0);
  for(const sign of [-1,1]){const s=sign>0?p.length-c.endInset:c.endInset,tip=point(p,s),before=point(p,s-.1*sign),after=point(p,s+.1*sign),dx=after.x-before.x,dz=after.z-before.z,len=Math.hypot(dx,dz);
    // The tip follows the local canonical tangent, including curved branches.
    const back={x:tip.x-dx/len*c.headLength,z:tip.z-dz/len*c.headLength};
    for(const side of [-1,1])segment({x:back.x-dz/len*c.headHalfWidth*side,z:back.z+dx/len*c.headHalfWidth*side},tip,s/p.length,s/p.length,sign>0?1:2);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setAttribute('role',new THREE.Float32BufferAttribute(roles,1));geometry.computeBoundingSphere();return geometry;
}
function arrowMaterial(){return new THREE.ShaderMaterial({name:'Selected route · not clearance',transparent:true,depthTest:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,extensions:{derivatives:true},
 uniforms:{color:{value:new THREE.Color(ARROW_CONFIG.color)},progress:{value:1},opacity:{value:ARROW_CONFIG.idleOpacity},sign:{value:0}},
 vertexShader:'attribute float role;varying vec2 vBand;varying float vRole;void main(){vBand=uv;vRole=role;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:`uniform vec3 color;uniform float progress;uniform float opacity;uniform float sign;varying vec2 vBand;varying float vRole;void main(){
 if((vRole>1.5&&sign>.5)||(vRole>.5&&vRole<1.5&&sign<-.5))discard;
 float distance=sign<-.5?1.-vBand.y:vBand.y;
 float reveal=1.-smoothstep(progress,progress+.018,distance);if(progress>=.999)reveal=1.;
 float d=abs(vBand.x)*${ARROW_CONFIG.envelope},aa=max(fwidth(d),.035);
 float core=1.-smoothstep(${ARROW_CONFIG.width*.5}-aa,${ARROW_CONFIG.width*.5}+aa,d);
 float alpha=(core*.85+exp(-d*d/.45)*.15)*opacity*reveal;if(alpha<.003)discard;
 gl_FragColor=vec4(color,alpha);
 #include <colorspace_fragment>
 }`});}

/** Cache only presentation buffers. Observe state, never request or authorize
 * a change. Throttle read-only approach scans; idle frames allocate nothing. */
export function createTurnoutArrows(scene,model,{getState,getApproaches=()=>[],choose=null,reducedMotion=false,now=()=>performance.now()}={}) {
  if(typeof getState!=='function'||typeof getApproaches!=='function'||typeof now!=='function'||typeof reducedMotion!=='boolean')throw new TypeError('Invalid arrow options');
  const root=new THREE.Group(),units=new Map();let disposed=false,lastRead=-Infinity;
  root.name='Selected turnout routes';root.userData.dynamic=true;root.userData.pickThrough=true;scene.add(root);
  for(const id of TURNOUT_IDS){const material=arrowMaterial(),paths=new Map();for(const path of model.read(id,false).paths){const mesh=new THREE.Mesh(arrowGeometry(path),material);mesh.visible=false;mesh.renderOrder=3;mesh.raycast=noop;mesh.name=path.edge;mesh.onBeforeRender=()=>{material.uniforms.sign.value=mesh.userData.sign??0;material.uniformsNeedUpdate=true;};root.add(mesh);paths.set(path.edge,mesh);}units.set(id,{material,paths,state:undefined,view:null,started:null});}
  function update(at=now(),force=false){if(disposed)return;if(typeof force!=='boolean')throw new TypeError('Invalid arrow refresh');if(!Number.isFinite(at)||at<0)throw new RangeError('Invalid arrow time');
    let changed=false;for(const [id,u] of units)if(getState(id)!==u.state){changed=true;break;}
    if(force||changed||at-lastRead>=ARROW_CONFIG.refreshMs){const approaches=getApproaches();lastRead=at;
      for(const [id,u] of units){const state=getState(id),view=turnoutArrowView(model,id,state,approaches,choose),switched=u.state!==undefined&&state!==u.state;
        for(const mesh of u.paths.values())mesh.visible=false;
        for(const item of view.paths){const mesh=u.paths.get(item.path.edge);mesh.visible=true;mesh.userData.sign=item.sign;}
        u.state=state;u.view=view;if(switched)u.started=at;
      }
    }
    for(const u of units.values()){const t=reducedMotion||u.started===null?1:Math.max(0,Math.min(1,(at-u.started)/ARROW_CONFIG.durationMs));u.material.uniforms.progress.value=ease(t);u.material.uniforms.opacity.value=ARROW_CONFIG.idleOpacity+(ARROW_CONFIG.revealOpacity-ARROW_CONFIG.idleOpacity)*(1-ease(t));if(t===1)u.started=null;}
  }
  return {root,update,setReducedMotion(value){if(typeof value!=='boolean')throw new TypeError('Invalid reduced motion');reducedMotion=value;},
    get snapshot(){return {reducedMotion,units:[...units].map(([id,u])=>({id,state:u.state,unknown:u.view?.unknown??true,paths:u.view?.paths.map(p=>({edge:p.path.edge,sign:p.sign,source:p.directionSource}))??[],progress:u.material.uniforms.progress.value,opacity:u.material.uniforms.opacity.value}))};},
    dispose(){if(disposed)return;disposed=true;root.removeFromParent();for(const u of units.values()){for(const m of u.paths.values())m.geometry.dispose();u.material.dispose();}units.clear();root.clear();}};
}
