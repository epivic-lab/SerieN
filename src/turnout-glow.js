import * as THREE from 'three';
import {TURNOUT_IDS,isTurnoutId} from './turnout-routes.js';

// Review defaults, not an aesthetic signoff. Both styles share every vertex,
// one shader/material and the S2 identity; no light or post-processing pass.
export const GLOW_CONFIG=Object.freeze({blue:'#37A8FA',edge:'#A9DDFF',periodMs:1400,fadeMs:160,touchHoldMs:1100,
  bedOffset:11.95,bedHeight:1.44,railOffset:4.95,railHeight:6.025,envelope:3.8,sampleMm:1.5,
  endTaperMm:3,railScale:.6,edgeMix:.42,softCutoff:.8});
export const GLOW_STYLES=Object.freeze({
  A:Object.freeze({core:.42,soft:1.05,softAlpha:.13,coreAlpha:.88,rail:.38,pulseMin:.76}),
  B:Object.freeze({core:.55,soft:2.5,softAlpha:.31,coreAlpha:.92,rail:.60,pulseMin:.57})
});
const smooth=t=>t*t*(3-2*t);
const ignoreRaycast=()=>{};

function measured(path) {
  const distance=[0];
  for(let i=1;i<path.points.length;i++)distance.push(distance[i-1]+Math.hypot(path.points[i].x-path.points[i-1].x,path.points[i].z-path.points[i-1].z));
  return {...path,distance,length:distance.at(-1)};
}
function sample(path,s) {
  s=Math.max(0,Math.min(path.length,s));let i=1;
  while(i<path.distance.length-1&&path.distance[i]<s)i++;
  const a=path.points[i-1],b=path.points[i],t=(s-path.distance[i-1])/(path.distance[i]-path.distance[i-1]||1);
  return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};
}
function offset(path,s,amount,delta) {
  const p=sample(path,s),a=sample(path,s-delta),b=sample(path,s+delta),length=Math.hypot(b.x-a.x,b.z-a.z)||1;
  return {x:p.x-(b.z-a.z)/length*amount,z:p.z+(b.x-a.x)/length*amount};
}
function distanceTo(path,p) {
  let best=Infinity;
  for(let i=1;i<path.points.length;i++) {
    const a=path.points[i-1],b=path.points[i],dx=b.x-a.x,dz=b.z-a.z;
    const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1)));
    best=Math.min(best,Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz));
  }
  return best;
}

/** Only new presentation buffers: outline the union of the actual device
 * beds; preserve internal X paths with restrained paired rail-edge accents.
 * No centreline graphics and no fictitious intersection/node is generated. */
export function turnoutGlowGeometry(paths) {
  if(!Array.isArray(paths)||!paths.length||paths.some(p=>!Array.isArray(p.points)||p.points.length<2||p.points.some(v=>!Number.isFinite(v.x)||!Number.isFinite(v.z))))throw new RangeError('Invalid canonical glow paths');
  const data=paths.map(measured),vertices=[],uv=[],roles=[],fades=[],seen=new Set(),config=GLOW_CONFIG;
  if(data.some(p=>p.length<=0))throw new RangeError('Degenerate glow path');
  function segment(a,b,height,role,fadeA,fadeB) {
    const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);if(length<1e-7)return;
    const key=[a,b].map(p=>`${Math.round(p.x*10)},${Math.round(p.z*10)}`).sort().join('/')+':'+role;
    if(seen.has(key))return;seen.add(key);
    const nx=-dz/length*config.envelope,nz=dx/length*config.envelope;
    vertices.push(a.x+nx,height,a.z+nz,a.x-nx,height,a.z-nz,b.x+nx,height,b.z+nz,
      a.x-nx,height,a.z-nz,b.x-nx,height,b.z-nz,b.x+nx,height,b.z+nz);
    uv.push(1,0,-1,0,1,1,-1,0,-1,1,1,1);roles.push(role,role,role,role,role,role);
    fades.push(fadeA,fadeA,fadeB,fadeA,fadeB,fadeB);
  }
  for(const path of data) {
    const count=Math.ceil(path.length/config.sampleMm);
    for(const side of [-1,1])for(let i=0;i<count;i++) {
      const s0=path.length*i/count,s1=path.length*(i+1)/count;
      const fadeA=smooth(Math.min(1,Math.min(s0,path.length-s0)/config.endTaperMm)),fadeB=smooth(Math.min(1,Math.min(s1,path.length-s1)/config.endTaperMm));
      const a=offset(path,s0,side*config.bedOffset,path.length*.001),b=offset(path,s1,side*config.bedOffset,path.length*.001);
      const mid={x:(a.x+b.x)/2,z:(a.z+b.z)/2};
      // Trim bed edges buried in another constituent path of this device.
      if(!data.some(other=>other!==path&&distanceTo(other,mid)<config.bedOffset-.18))segment(a,b,config.bedHeight,0,fadeA,fadeB);
      segment(offset(path,s0,side*config.railOffset,.3),offset(path,s1,side*config.railOffset,.3),config.railHeight,1,fadeA,fadeB);
    }
  }
  // Ends taper along the real longitudinal paths, with no transverse bars
  // that could turn a WX into a generic rectangular selection frame.
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  geometry.setAttribute('role',new THREE.Float32BufferAttribute(roles,1));
  geometry.setAttribute('endFade',new THREE.Float32BufferAttribute(fades,1));
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
  return geometry;
}

function material() {
  return new THREE.ShaderMaterial({name:'Turnout identity · conformal blue',transparent:true,depthTest:true,depthWrite:false,
    side:THREE.DoubleSide,toneMapped:false,extensions:{derivatives:true},
    uniforms:{blue:{value:new THREE.Color(GLOW_CONFIG.blue)},edge:{value:new THREE.Color(GLOW_CONFIG.edge)},
      core:{value:0},soft:{value:0},softAlpha:{value:0},coreAlpha:{value:0},rail:{value:0},gain:{value:0}},
    vertexShader:'attribute float role;attribute float endFade;varying vec2 vBand;varying float vRole;varying float vFade;void main(){vBand=uv;vRole=role;vFade=endFade;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`uniform vec3 blue;uniform vec3 edge;uniform float core;uniform float soft;uniform float softAlpha;uniform float coreAlpha;uniform float rail;uniform float gain;
      varying vec2 vBand;varying float vRole;varying float vFade;
      void main(){
        float d=abs(vBand.x)*${GLOW_CONFIG.envelope.toFixed(1)};
        float scale=mix(1.,${GLOW_CONFIG.railScale.toFixed(2)},vRole),aa=max(fwidth(d),.035);
        float centre=1.-smoothstep(core*scale*.5-aa,core*scale*.5+aa,d);
        float spread=exp(-d*d/max(.001,soft*soft*scale*scale));
        float alpha=(centre*coreAlpha+(1.-centre)*spread*softAlpha)*mix(1.,rail,vRole)*gain*vFade*(1.-smoothstep(${(GLOW_CONFIG.envelope*GLOW_CONFIG.softCutoff).toFixed(3)},${GLOW_CONFIG.envelope.toFixed(3)},d));
        if(alpha<.003)discard;
        gl_FragColor=vec4(mix(blue,edge,centre*${GLOW_CONFIG.edgeMix.toFixed(2)}),min(alpha,.95));
        #include <colorspace_fragment>
      }`});
}

export function createTurnoutGlow(scene,model,{variant='A',reducedMotion=false,now=()=>performance.now()}={}) {
  if(typeof variant!=='string'||!Object.hasOwn(GLOW_STYLES,variant))throw new RangeError('Unknown glow variant');
  if(typeof reducedMotion!=='boolean'||typeof now!=='function')throw new TypeError('Invalid glow preferences');
  const root=new THREE.Group(),shared=material(),meshes=new Map();let disposed=false,active=null,shown=null,changed=0,pulseStarted=0,opacity=0,fadeFrom=0,style;
  root.name='Turnout identity overlay';root.userData.dynamic=true;root.userData.pickThrough=true;root.visible=false;scene.add(root);
  for(const id of TURNOUT_IDS) {
    const mesh=new THREE.Mesh(turnoutGlowGeometry(model.read(id,false).paths),shared);
    mesh.name=id;mesh.visible=false;mesh.renderOrder=2;mesh.raycast=ignoreRaycast;root.add(mesh);meshes.set(id,mesh);
  }
  function time(value){if(!Number.isFinite(value)||value<0)throw new RangeError('Invalid glow time');return value;}
  function setVariant(value) {
    if(typeof value!=='string'||!Object.hasOwn(GLOW_STYLES,value))throw new RangeError('Unknown glow variant');
    variant=value;style=GLOW_STYLES[value];
    for(const key of ['core','soft','softAlpha','coreAlpha','rail'])shared.uniforms[key].value=style[key];
  }
  setVariant(variant);
  function identify(id,at=now()) {
    if(disposed)return;
    time(at);if(id!==null&&!isTurnoutId(id))throw new RangeError('Unknown glow control');
    if(id===active)return;
    // Never cross-fade different devices: one identity may be illuminated.
    if(id!==null&&id!==shown){if(shown!==null)meshes.get(shown).visible=false;shown=id;meshes.get(id).visible=true;opacity=0;pulseStarted=at;}
    fadeFrom=opacity;active=id;changed=at;
  }
  function update(at=now()) {
    if(disposed)return;time(at);
    if(shown===null&&active===null)return;
    const t=Math.max(0,Math.min(1,(at-changed)/GLOW_CONFIG.fadeMs));
    if(active!==null)opacity=fadeFrom+(1-fadeFrom)*smooth(t);
    else opacity=fadeFrom*(1-smooth(t));
    if(opacity<=0&&active===null){if(shown!==null)meshes.get(shown).visible=false;shown=null;}
    root.visible=shown!==null&&opacity>0;
    const pulse=reducedMotion ? .82 : style.pulseMin+(1-style.pulseMin)*(.5-.5*Math.cos((at-pulseStarted)*Math.PI*2/GLOW_CONFIG.periodMs));
    shared.uniforms.gain.value=opacity*pulse;
  }
  return {root,identify,update,setVariant,
    setReducedMotion(value){if(typeof value!=='boolean')throw new TypeError('Reduced motion must be boolean');reducedMotion=value;},
    get snapshot(){return {active,shown,variant,reducedMotion,opacity,gain:shared.uniforms.gain.value,visible:root.visible,
      visibleDevices:[...meshes].filter(([,mesh])=>mesh.visible&&root.visible).map(([id])=>id)};},
    dispose(){if(disposed)return;disposed=true;active=shown=null;opacity=0;root.visible=false;shared.uniforms.gain.value=0;root.removeFromParent();meshes.forEach(mesh=>mesh.geometry.dispose());shared.dispose();meshes.clear();root.clear();}
  };
}
