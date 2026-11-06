import * as THREE from 'three';

// Offline only: every asset uses the same 8 px/mm orthographic scale, viewed
// from -Z so the model's +X front faces left. Bounds retain the model origin.
export function captureStockSide(renderer,source,environment=null) {
  const root=source.clone(true),materials=new Set(),copies=new Map();
  function pair(a,b){copies.set(a.uuid,b);a.children.forEach((child,i)=>pair(child,b.children[i]));}
  pair(source,root);
  // Remove curvature of the parked train from the cloned articulated bodies.
  for(const bogie of source.stockRig?.bogies??[]){const node=copies.get(bogie.node.uuid);node.position.set(bogie.offset,0,0);node.rotation.y=0;}
  root.position.set(0,source.position.y,0);root.rotation.set(0,0,0);root.scale.set(1,1,1);
  function prune(parent) {
    for(const child of [...parent.children]) {
      if(!child.visible||child.isLight||child.isSprite){parent.remove(child);continue;}
      if(child.isMesh){
        const clone=m=>{const c=m.clone();if(c.emissiveIntensity!==undefined)c.emissiveIntensity=Math.min(c.emissiveIntensity,.25);materials.add(c);return c;};
        child.material=Array.isArray(child.material)?child.material.map(clone):clone(child.material);
        child.castShadow=child.receiveShadow=false;
      }
      prune(child);
    }
  }
  prune(root);root.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(root),ppm=8;
  if(box.isEmpty()){materials.forEach(m=>m.dispose());throw Error('Empty side-view model');}
  const bounds={minX:Math.floor((box.min.x-1)*ppm)/ppm,maxX:Math.ceil((box.max.x+1)*ppm)/ppm,minY:Math.floor((box.min.y-1)*ppm)/ppm,maxY:Math.ceil((box.max.y+1)*ppm)/ppm};
  const width=Math.round((bounds.maxX-bounds.minX)*ppm),height=Math.round((bounds.maxY-bounds.minY)*ppm);
  const scene=new THREE.Scene();scene.environment=environment;scene.environmentIntensity=.3;scene.add(root);
  scene.add(new THREE.AmbientLight('#e6eff5',1.6));
  const light=new THREE.DirectionalLight('#fff1db',3);light.position.set(100,160,-110);scene.add(light);
  const camera=new THREE.OrthographicCamera(-bounds.maxX,-bounds.minX,bounds.maxY,bounds.minY,.1,2000);
  camera.position.set(0,0,-500);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
  const target=new THREE.WebGLRenderTarget(width,height,{format:THREE.RGBAFormat});target.texture.colorSpace=THREE.SRGBColorSpace;
  const state={target:renderer.getRenderTarget(),viewport:renderer.getViewport(new THREE.Vector4()),scissor:renderer.getScissor(new THREE.Vector4()),scissorTest:renderer.getScissorTest(),color:renderer.getClearColor(new THREE.Color()).clone(),alpha:renderer.getClearAlpha(),autoClear:renderer.autoClear,exposure:renderer.toneMappingExposure,shadows:renderer.shadowMap.enabled};
  try {
    renderer.autoClear=true;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=false;
    renderer.setRenderTarget(target);renderer.setScissorTest(false);renderer.setClearColor(0,0);renderer.clear();renderer.render(scene,camera);
    const pixels=new Uint8Array(width*height*4),flipped=new Uint8ClampedArray(pixels.length);
    renderer.readRenderTargetPixels(target,0,0,width,height,pixels);
    for(let row=0;row<height;row++)flipped.set(pixels.subarray(row*width*4,(row+1)*width*4),(height-row-1)*width*4);
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    canvas.getContext('2d').putImageData(new ImageData(flipped,width,height),0,0);
    return {dataURL:canvas.toDataURL('image/png'),bounds,width,height,pixelsPerMm:ppm,couplers:structuredClone(source.userData.couplers),mountY:source.position.y};
  } finally {
    renderer.setRenderTarget(state.target);renderer.setViewport(state.viewport);renderer.setScissor(state.scissor);renderer.setScissorTest(state.scissorTest);renderer.setClearColor(state.color,state.alpha);renderer.autoClear=state.autoClear;renderer.toneMappingExposure=state.exposure;renderer.shadowMap.enabled=state.shadows;
    target.dispose();materials.forEach(m=>m.dispose());
  }
}
