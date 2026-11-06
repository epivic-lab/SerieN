import * as THREE from 'three';
import {STOCK,buildStock} from '../src/rolling-stock.js';
import {attachTrainAsset,importedTrains,disposeTrainAssets} from '../src/train-assets.js';
import {captureLocomotiveThumbnail} from '../src/locomotive-thumbnails.js';
window.captureStock=async()=>{
 const renderer=new THREE.WebGLRenderer({alpha:true});const results={};
 for(const kind of Object.keys(STOCK).filter(k=>!['steam','shunter'].includes(k))){const group=buildStock(kind);results['native-'+kind]=captureLocomotiveThumbnail(renderer,group).dataURL;}
 importedTrains(true);
 for(const kind of ['box','lumber','tank']){const group=new THREE.Group();await attachTrainAsset(group,kind);results['kenney-'+kind]=captureLocomotiveThumbnail(renderer,group).dataURL;}
 disposeTrainAssets();renderer.dispose();return results;
};
