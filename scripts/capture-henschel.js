import * as THREE from 'three';
import {loadHenschel,buildHenschel} from '../src/henschel.js';
import {captureStockSide} from './capture-stock-sides.js';
import {captureLocomotiveThumbnail} from '../src/locomotive-thumbnails.js';

window.captureHenschel=async()=>{
  const renderer=new THREE.WebGLRenderer({alpha:true});
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  const model=buildHenschel(await loadHenschel(),0);
  try{return {side:captureStockSide(renderer,model),thumbnail:captureLocomotiveThumbnail(renderer,model)};}
  finally{model.userData.disposeRollingStock();renderer.dispose();}
};
