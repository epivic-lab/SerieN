import * as THREE from "three";

const THUMBNAIL_SIZE=Object.freeze({width:320,height:160});
const modelKinds=["steam","diesel","shunter"];
function thumbnailKey(train) {
  const kind=train.modelKey??modelKinds[train.id]??"shunter";
  return `${train.group.userData.assetDimensions?"kenney":"native"}-${kind}`;
}
function thumbnailURL(train) { return `./assets/locomotive-thumbnails/${thumbnailKey(train)}.png`; }
const THUMBNAIL_FALLBACK="./assets/locomotive-thumbnails/unavailable.svg";

// Build-time/diagnostic capture only. Reuse the main WebGL context and one
// temporary target; normal play displays six prerendered PNGs from browser cache.
function captureLocomotiveThumbnail(renderer,group,environment=null) {
  const root=group.clone(true),materials=new Set();
  root.position.set(0,0,0);root.rotation.set(0,0,0);root.scale.set(1,1,1);
  function prune(parent) {
    for(const child of [...parent.children]) {
      if(!child.visible||child.isLight||child.isSprite){parent.remove(child);continue;}
      if(child.isMesh){
        const clone=(m)=>{const c=m.clone();if(c.emissiveIntensity!==undefined)c.emissiveIntensity=Math.min(c.emissiveIntensity,.25);materials.add(c);return c;};
        child.material=Array.isArray(child.material)?child.material.map(clone):clone(child.material);
        child.castShadow=child.receiveShadow=false;
      }
      prune(child);
    }
  }
  prune(root);root.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(root);
  if(bounds.isEmpty()){materials.forEach((m)=>m.dispose());throw Error("No visible locomotive geometry");}
  const center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
  const scene=new THREE.Scene();scene.environment=environment;scene.environmentIntensity=.3;scene.add(root);
  scene.add(new THREE.AmbientLight("#e6eff5",1.6));
  const key=new THREE.DirectionalLight("#fff1db",3);key.position.set(100,160,110);scene.add(key);
  const fill=new THREE.DirectionalLight("#c3e2ef",1.3);fill.position.set(-100,65,-80);scene.add(fill);
  const camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,2000);
  camera.position.copy(center).add(new THREE.Vector3(1,.62,1.45).normalize().multiplyScalar(250));
  camera.lookAt(center);camera.updateMatrixWorld(true);
  const cameraBounds=bounds.clone().applyMatrix4(camera.matrixWorldInverse),aspect=THUMBNAIL_SIZE.width/THUMBNAIL_SIZE.height;
  const halfHeight=Math.max(cameraBounds.max.y-cameraBounds.min.y,(cameraBounds.max.x-cameraBounds.min.x)/aspect)/2*1.18;
  const cx=(cameraBounds.min.x+cameraBounds.max.x)/2,cy=(cameraBounds.min.y+cameraBounds.max.y)/2;
  camera.left=cx-halfHeight*aspect;camera.right=cx+halfHeight*aspect;camera.top=cy+halfHeight;camera.bottom=cy-halfHeight;camera.updateProjectionMatrix();
  const {width,height}=THUMBNAIL_SIZE;
  const target=new THREE.WebGLRenderTarget(width,height,{format:THREE.RGBAFormat});target.texture.colorSpace=THREE.SRGBColorSpace;
  const state={target:renderer.getRenderTarget(),viewport:renderer.getViewport(new THREE.Vector4()),scissor:renderer.getScissor(new THREE.Vector4()),scissorTest:renderer.getScissorTest(),color:renderer.getClearColor(new THREE.Color()).clone(),alpha:renderer.getClearAlpha(),autoClear:renderer.autoClear,exposure:renderer.toneMappingExposure,shadows:renderer.shadowMap.enabled};
  try {
    renderer.autoClear=true;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=false;
    renderer.setRenderTarget(target);renderer.setScissorTest(false);renderer.setClearColor(0x000000,0);
    renderer.clear();renderer.render(scene,camera);
    const pixels=new Uint8Array(width*height*4),flipped=new Uint8ClampedArray(pixels.length);
    renderer.readRenderTargetPixels(target,0,0,width,height,pixels);
    for(let row=0;row<height;row++)flipped.set(pixels.subarray(row*width*4,(row+1)*width*4),(height-row-1)*width*4);
    const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;
    canvas.getContext("2d").putImageData(new ImageData(flipped,width,height),0,0);
    return {dataURL:canvas.toDataURL("image/png"),bounds:{length:size.x,height:size.y,width:size.z},width,height};
  } finally {
    renderer.setRenderTarget(state.target);renderer.setViewport(state.viewport);renderer.setScissor(state.scissor);renderer.setScissorTest(state.scissorTest);renderer.setClearColor(state.color,state.alpha);renderer.autoClear=state.autoClear;renderer.toneMappingExposure=state.exposure;renderer.shadowMap.enabled=state.shadows;
    target.dispose();materials.forEach((m)=>m.dispose());
  }
}
export {THUMBNAIL_SIZE,THUMBNAIL_FALLBACK,thumbnailKey,thumbnailURL,captureLocomotiveThumbnail};
