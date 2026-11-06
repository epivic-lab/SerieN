import manifest from '../assets/rolling-stock-sides/manifest.json' with {type:'json'};
import {compositionSideLayout} from './train-side-layout.js';

// DOM/SVG and cached PNGs only. No canvas, GPU resource, animation or railway state.
export function createTrainSideView() {
  const root=document.createElement('section');root.className='trainSideView';root.setAttribute('aria-label','Complete train side view');
  root.innerHTML='<div class="sideHeading"><strong>Complete train · side view</strong><span class="sideSummary"></span></div><div class="sideToolbar" role="group" aria-label="Side view zoom"><button type="button" data-zoom="out" aria-label="Zoom out side view">−</button><label>Zoom <input type="range" min="1" max="6" step="0.25" value="1" aria-label="Side view zoom level"></label><button type="button" data-zoom="in" aria-label="Zoom in side view">＋</button><button type="button" data-fit>Fit train</button><output>100%</output></div><div class="sideViewport" tabindex="0" role="region" aria-label="Train side view, scroll horizontally when zoomed"><div class="sideStage"></div></div><p class="sideStatus managementMuted"></p>';
  const viewport=root.querySelector('.sideViewport'),stage=root.querySelector('.sideStage'),slider=root.querySelector('input'),output=root.querySelector('output'),status=root.querySelector('.sideStatus');
  let zoom=1,selected=null,signature='';
  const ns='http://www.w3.org/2000/svg';
  function svgElement(tag,attrs={}){const el=document.createElementNS(ns,tag);for(const [key,value]of Object.entries(attrs))el.setAttribute(key,String(value));return el;}
  function setZoom(value){zoom=Math.max(1,Math.min(6,value));stage.style.width=`${zoom*100}%`;slider.value=String(zoom);output.textContent=`${Math.round(zoom*100)}%`;root.querySelector('[data-zoom="out"]').disabled=zoom===1;root.querySelector('[data-zoom="in"]').disabled=zoom===6;}
  root.querySelector('[data-zoom="out"]').onclick=()=>setZoom(zoom-.5);
  root.querySelector('[data-zoom="in"]').onclick=()=>setZoom(zoom+.5);
  slider.oninput=()=>setZoom(Number(slider.value));
  root.querySelector('[data-fit]').onclick=()=>{setZoom(1);viewport.scrollLeft=0;viewport.scrollTop=0;};
  setZoom(1);
  function update(train) {
    const model=compositionSideLayout(train,manifest),next=JSON.stringify(model);
    if(next===signature)return;signature=next;
    if(selected!==train.id){selected=train.id;setZoom(1);viewport.scrollLeft=0;viewport.scrollTop=0;}
    root.querySelector('.sideSummary').textContent=`${model.vehicles.length} vehicles · ${model.length.toFixed(1)} mm · N scale`;
    const svg=svgElement('svg',{viewBox:model.viewBox.join(' '),role:'img','aria-label':`${train.name}, complete side view, locomotive to tail, ${model.vehicles.length} vehicles, ${model.length.toFixed(1)} millimetres at N scale`});
    const title=svgElement('title');title.textContent=`${train.name} · locomotive to tail`;svg.append(title);
    const missing=model.vehicles.filter(v=>!v.asset);
    status.textContent=missing.length?'Side view incomplete: a model preview is unavailable. See the vehicle list below.':'Locomotive to tail · travel direction preserves this order. Scroll horizontally after zooming.';
    for(const v of model.vehicles)if(v.asset){
      const image=svgElement('image',{href:v.asset.url,x:v.x,y:v.y,width:v.width,height:v.height,'data-side-vehicle':v.id,'data-side-key':v.key,'data-offset-mm':v.offset,'data-origin-mm':v.origin,'data-orientation':v.orientation,preserveAspectRatio:'xMidYMid meet'});
      image.addEventListener('error',()=>{status.textContent='Side view incomplete: a model preview is unavailable. See the vehicle list below.';});svg.append(image);
    }
    const y=model.dimensionY;
    const dimension=svgElement('path',{d:`M0 ${y-2}v4m0 -2H${model.length}m0 -2v4`,class:'sideDimension','aria-hidden':'true'});svg.append(dimension);
    const label=svgElement('text',{x:model.length/2,y:y+7,'text-anchor':'middle',class:'sideDimensionLabel','aria-hidden':'true'});label.textContent=`${model.length.toFixed(1)} mm`;svg.append(label);
    stage.replaceChildren(svg);
  }
  return {root,update,dispose(){root.remove();stage.replaceChildren();}};
}
