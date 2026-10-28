import {ClampToEdgeWrapping,Color,DataTexture,LinearFilter,LinearMipmapLinearFilter,MeshStandardMaterial,NoColorSpace,RGBAFormat,RepeatWrapping,SRGBColorSpace,Vector3} from "three";

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function hash(x,y,seed){let n=Math.imul(x+seed,374761393)^Math.imul(y+19,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;}
function texture(bytes,size,colorSpace) {
  const map=new DataTexture(bytes,size,size,RGBAFormat);
  map.colorSpace=colorSpace;map.wrapS=map.wrapT=RepeatWrapping;
  map.magFilter=LinearFilter;map.minFilter=LinearMipmapLinearFilter;map.generateMipmaps=true;map.needsUpdate=true;
  return map;
}
// Original deterministic textures. Red is bump height, green is roughness;
// albedo is sRGB while packed material data stays linear.
function surfaceMaps(kind,size=256) {
  if(!['ballast','terrain'].includes(kind))throw new RangeError('Unknown surface');
  const color=new Uint8Array(size*size*4),data=new Uint8Array(color.length);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const i=(y*size+x)*4,n=hash(x,y,47);let rgb,h,rough;
    if(kind==='ballast') {
      const cx=Math.floor(x/4),cy=Math.floor(y/4);let best=Infinity,stone=0;
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++) {
        const a=cx+dx,b=cy+dy,period=size/4,ax=(a+period)%period,by=(b+period)%period,sx=(a+.2+.6*hash(ax,by,7))*4,sy=(b+.2+.6*hash(ax,by,11))*4,d=Math.hypot(x-sx,y-sy);
        if(d<best){best=d;stone=hash(ax,by,29);}
      }
      h=clamp(1-best/3.6,0,1);const v=92+stone*65+h*18+(n-.5)*8;
      rgb=[v+5,v+2,v-6];rough=.8+stone*.15;
    } else {
      const a=x/size*Math.PI*2,b=y/size*Math.PI*2;
      const broad=Math.sin(a)*Math.cos(b)*.55+Math.sin(a*4+b*3)*.2;
      const v=231+broad*9+(n-.5)*14;rgb=[v,v-2,v-7];h=.5+broad*.13+(n-.5)*.25;rough=.91+n*.07;
    }
    for(let c=0;c<3;c++)color[i+c]=clamp(Math.round(rgb[c]),0,255);
    color[i+3]=255;data[i]=Math.round(clamp(h,0,1)*255);data[i+1]=Math.round(rough*255);data[i+2]=0;data[i+3]=255;
  }
  return {albedo:texture(color,size,SRGBColorSpace),detail:texture(data,size,NoColorSpace)};
}
function createRailMaterial() {
  const size=128,data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const u=x/(size-1),t=clamp((u-.78)/.2,0,1),polish=t*t*(3-2*t),i=(y*size+x)*4;
    data[i]=128;data[i+1]=Math.round((.9-polish*.63)*255);data[i+2]=Math.round((.12+polish*.75)*255);data[i+3]=255;
  }
  const finish=texture(data,size,NoColorSpace);finish.wrapS=ClampToEdgeWrapping;
  const material=new MeshStandardMaterial({color:'#ffffff',vertexColors:true,roughness:1,metalness:1,roughnessMap:finish,metalnessMap:finish});
  material.name='Weathered rail web / polished running head';
  return material;
}
function railColor(height) {
  const t=clamp((height-5.35)/.5,0,1);
  return new Color('#69513f').lerp(new Color('#bdc6cc'),t*t*(3-2*t));
}
function fitSunShadow(light) {
  const camera=light.shadow.camera;
  camera.position.copy(light.position);camera.lookAt(light.target.position);camera.updateMatrixWorld(true);
  const points=[];
  for(const x of [-20,1520])for(const y of [-40,160])for(const z of [-20,720])points.push(new Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse));
  camera.left=Math.min(...points.map(p=>p.x))-60;camera.right=Math.max(...points.map(p=>p.x))+60;
  camera.bottom=Math.min(...points.map(p=>p.y))-60;camera.top=Math.max(...points.map(p=>p.y))+60;
  camera.near=Math.max(1,-Math.max(...points.map(p=>p.z))-100);camera.far=-Math.min(...points.map(p=>p.z))+100;
  camera.updateProjectionMatrix();light.shadow.bias=-.0001;light.shadow.normalBias=.16;
}
export {surfaceMaps,createRailMaterial,railColor,fitSunShadow};
