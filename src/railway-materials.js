import * as THREE from 'three';

// Small, deterministic surface maps. No additional network assets or stone meshes.
const hash=(x,y)=>{let n=Math.imul(x,374761393)^Math.imul(y,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;};
function texture(data,size,color=false) {
  const map=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);
  map.wrapS=map.wrapT=THREE.RepeatWrapping;
  map.magFilter=THREE.LinearFilter;map.minFilter=THREE.LinearMipmapLinearFilter;
  map.generateMipmaps=true;map.anisotropy=4;
  if(color)map.colorSpace=THREE.SRGBColorSpace;
  map.needsUpdate=true;return map;
}

export function createRailwayMaterials() {
  const size=512,cells=40,color=new Uint8Array(size*size*4),height=new Uint8Array(color.length);
  const wrap=n=>(n%cells+cells)%cells;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const px=x/size*cells,py=y/size*cells,cx=Math.floor(px),cy=Math.floor(py);
    let first=Infinity,second=Infinity,sx=0,sy=0;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++) {
      const ix=cx+dx,iy=cy+dy,hx=wrap(ix),hy=wrap(iy);
      const ax=px-ix-.15-.7*hash(hx,hy),ay=py-iy-.15-.7*hash(hy+97,hx+31);
      const distance=ax*ax+ay*ay;
      if(distance<first){second=first;first=distance;sx=hx;sy=hy;}else if(distance<second)second=distance;
    }
    const seed=hash(sx+211,sy+89),joint=Math.min(1,(Math.sqrt(second)-Math.sqrt(first))*9);
    const grain=(hash(x,y)-.5)*13,facet=1-.15*Math.sqrt(first),i=(y*size+x)*4;
    const palette=seed<.15?[112,109,99]:seed<.45?[143,139,127]:seed<.8?[158,155,142]:[124,127,121];
    for(let c=0;c<3;c++)color[i+c]=Math.round(palette[c]*facet*(.62+.38*joint)+grain);
    const h=Math.round(255*(.18+.5*joint+.22*Math.max(0,1-Math.sqrt(first))));
    color[i+3]=height[i+3]=255;height[i]=height[i+1]=height[i+2]=h;
  }
  const ballastMap=texture(color,size,true),ballastBump=texture(height,size);
  const woodSize=256,wood=new Uint8Array(woodSize*woodSize*4);
  for(let y=0;y<woodSize;y++)for(let x=0;x<woodSize;x++) {
    const grain=Math.sin(y*.8+Math.sin(x*.026)*1.7)*5+(hash(x>>4,y)-.5)*14+(hash(x,y)-.5)*7;
    const i=(y*woodSize+x)*4;
    wood[i]=70+grain;wood[i+1]=62+grain;wood[i+2]=51+grain;wood[i+3]=255;
  }
  const woodMap=texture(wood,woodSize,true);
  return {
    ballast:new THREE.MeshStandardMaterial({color:0xffffff,map:ballastMap,bumpMap:ballastBump,bumpScale:.22,roughness:1,metalness:0}),
    sleepers:new THREE.MeshStandardMaterial({color:0xffffff,map:woodMap,bumpMap:woodMap,bumpScale:.08,roughness:.96}),
    rails:new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.38,metalness:.65}),
    fasteners:new THREE.MeshStandardMaterial({color:'#4c4035',roughness:.86,metalness:.35})
  };
}
