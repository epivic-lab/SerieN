import {createTrainSideView} from './train-side-view.js';
import {PROJECT_CATALOG} from './train-projects.js';
import {createTrainProjectsView} from './train-projects-view.js';
import {compositionView,detachedView} from './train-management-state.js';
import {THUMBNAIL_FALLBACK,thumbnailURL} from './locomotive-thumbnails.js';

export function mountTrainManagement({button,getTrains,getDetached,getSelected,getImportedCatalog,onSelect,onFocus}) {
  const dialog=document.createElement('dialog');dialog.className='trainManagement';
  dialog.setAttribute('aria-labelledby','managementTitle');
  dialog.innerHTML=`<header class="managementHead"><div><span class="eyebrow">ROLLING STOCK · 1:160</span><h2 id="managementTitle">Train Management</h2></div><button type="button" data-close>✕ Close</button></header><p class="managementIntro">Explore available models, inspect real trains and design independent projects.</p><nav class="managementNav" aria-label="Train Management views"><button type="button" data-view="layout">On the layout</button><button type="button" data-view="catalog">Model catalog</button><button type="button" data-view="projects">Projects</button></nav><div class="managementBody"></div>`;
  document.body.append(dialog);
  const sideView=createTrainSideView();
  let generation=0;
  const projects=createTrainProjectsView({getTrains,getSelected,getGeneration:()=>generation,onChange:()=>{signature='';sync();}});
  const body=dialog.querySelector('.managementBody');let view='layout',signature='',disposed=false,lastSync=0;
  const element=(tag,text,className)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;};
  const mm=n=>Number.isFinite(n)?`${n.toFixed(1)} mm`:'Not measured';
  function image(src,alt) {
    const img=element('img');img.src=src;img.alt=alt;img.width=320;img.height=160;img.decoding='async';
    img.onerror=()=>{img.onerror=null;img.src=THUMBNAIL_FALLBACK;img.alt=`Preview unavailable: ${alt}`;};return img;
  }
  function heading(parent,title){parent.append(element('h3',title));}
  function dimensions(length,width){return `${mm(length)} long${Number.isFinite(width)?` × ${mm(width)} wide`:''}`;}
  function catalog() {
    const grid=element('div',undefined,'managementCatalog');
    const entries=PROJECT_CATALOG;
    heading(body,`${entries.length} available models`);
    body.append(element('p','Model dimensions at N scale. Composition lengths include the existing coupler spacing.','managementMuted'));
    for(const item of entries){
      const card=element('article',undefined,'managementModel');card.append(image(item.image,item.name??item.kind),element('strong',item.name??item.kind),element('span',item.kind),element('small',dimensions(item.length,item.width)),element('small',item.source));grid.append(card);
    }
    body.append(grid);
  }
  function layout() {
    const trains=getTrains(),selected=getSelected(),columns=element('div',undefined,'managementColumns'),list=element('section'),detail=element('section',undefined,'managementDetail');
    heading(list,`${trains.length} compositions on the layout`);
    for(const train of trains){const c=compositionView(train),b=element('button',undefined,'managementTrain');b.type='button';b.dataset.composition=String(c.id);b.setAttribute('aria-pressed',String(c.id===selected));b.classList.toggle('active',c.id===selected);b.append(image(thumbnailURL(train),c.name),element('strong',c.name),element('small',`${c.vehicles.length} vehicles · ${mm(c.length)}`));b.onclick=()=>onSelect(c.id);list.append(b);}
    const train=trains.find(t=>t.id===selected);
    if(train){const c=compositionView(train);heading(detail,c.name);detail.append(element('p',c.description),element('p',`${c.reverse?'Reverse':'Forward'} · ${mm(c.length)} overall`,'managementSummary'),element('small','Order from locomotive to tail. Reversing preserves this order.'));
      sideView.update(train);detail.append(sideView.root);
      const ordered=element('ol');ordered.dataset.consist=String(c.id);
      for(const [i,v] of c.vehicles.entries()){const row=element('li');row.dataset.vehicleId=v.id;row.append(element('strong',`${i===0?'Locomotive':`Wagon ${i}`} · ${i===0?c.name:v.name}`),element('small',`${dimensions(v.length,v.width)} · ${v.imported?'Kenney':'SerieN'}`));ordered.append(row);}detail.append(ordered);
      const focus=element('button','◎ Focus in 3D');focus.type='button';focus.onclick=()=>{if(projects.discard()){onFocus(c.id);dialog.close();}};detail.append(focus);
      const copy=element('button','Copy to project');copy.type='button';copy.dataset.copyTrain=String(c.id);copy.onclick=()=>{projects.copy(train);view='projects';signature='';sync();};detail.append(copy);
    }else detail.append(element('p','Select a composition to inspect it.'));
    columns.append(list,detail);body.append(columns);
    const detached=getDetached().map(detachedView),section=element('section',undefined,'managementDetached');heading(section,`Detached rolling stock · ${detached.length}`);
    if(!detached.length)section.append(element('p','No detached vehicles on the tracks.','managementMuted'));
    for(const v of detached){const row=element('p');row.dataset.detachedId=v.id;row.textContent=`${v.name} · Track ${v.edge} · ${mm(v.length)}`;section.append(row);}body.append(section);
  }
  function sync() {
    if(disposed||!dialog.open)return;
    // No per-frame DOM rebuilding: only structural/model/selection changes.
    const next=JSON.stringify([view,getSelected(),getTrains().map(compositionView),getDetached().map(detachedView),getImportedCatalog(),generation,getTrains().map(t=>Boolean(t.speed||Math.abs(t.velocity)>.1))]);
    if(next===signature)return;signature=next;
    const scroll=body.scrollTop,focused=document.activeElement?.dataset.composition;
    for(const b of dialog.querySelectorAll('[data-view]'))b.setAttribute('aria-pressed',String(b.dataset.view===view));
    if(view==='projects'){if(projects.root.parentNode!==body)body.replaceChildren(projects.root);projects.sync();}
    else {body.replaceChildren();if(view==='catalog')catalog();else layout();}body.scrollTop=scroll;
    if(focused!==undefined)body.querySelector(`[data-composition="${Number(focused)}"]`)?.focus();
  }
  button.onclick=()=>{signature='';dialog.showModal();sync();};
  function requestClose(){if(projects.discard())dialog.close();}
  dialog.querySelector('[data-close]').onclick=requestClose;
  dialog.addEventListener('cancel',event=>{event.preventDefault();requestClose();});
  function beforeUnload(event){if(projects.dirty||projects.hasProjects){event.preventDefault();event.returnValue='';}}
  window.addEventListener('beforeunload',beforeUnload);
  for(const b of dialog.querySelectorAll('[data-view]'))b.onclick=()=>{view=b.dataset.view;sync();};
  dialog.addEventListener('close',()=>button.focus());
  return {sync,invalidateReferences(){generation++;signature='';sync();},update(now){if(dialog.open&&now-lastSync>=250){lastSync=now;sync();}},dispose(){disposed=true;button.onclick=null;sideView.dispose();projects.dispose();window.removeEventListener('beforeunload',beforeUnload);dialog.remove();}};
}
