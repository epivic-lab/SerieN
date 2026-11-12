import {createGuardModal} from './ui/guard-modal.js';
import {createTrainSideView} from './train-side-view.js';
import {PROJECT_CATALOG} from './train-projects.js';
import {createTrainProjectsView} from './train-projects-view.js';
import {createDepotInventory} from './depot-inventory.js';
import {createDepotView} from './depot-view.js';
import {compositionView,detachedView} from './train-management-state.js';
import {THUMBNAIL_FALLBACK,thumbnailURL} from './locomotive-thumbnails.js';

export function mountTrainManagement({button,getTrains,getDetached,getSelected,getImportedCatalog,onSelect,onFocus}) {
  const dialog=document.createElement('dialog');dialog.className='trainManagement u6-tm';dialog.id='tmD';
  dialog.setAttribute('aria-labelledby','managementTitle');
  dialog.innerHTML=`<header class="managementHead"><div><span class="eyebrow">ROLLING STOCK · 1:160</span><h2 id="managementTitle">Train Management</h2></div><button type="button" data-close>✕ Close</button></header><p class="managementIntro">Explore available models, inspect real trains and design independent projects.</p><p class="u6-session">Session only · no cloud storage</p><p class="u6-notice" role="status"></p><nav class="managementNav" role="tablist" aria-label="Train Management views"><button type="button" data-view="layout">On the layout</button><button type="button" data-view="catalog">Model catalog</button><button type="button" data-view="projects">Projects</button><button type="button" data-view="depot">Depot</button></nav><div class="managementBody"></div>`;
  document.body.append(dialog);
  const guard=createGuardModal({title:'Discard draft changes?',cancelLabel:'Keep editing',confirmLabel:'Discard and continue',titleId:'u6GuardTitle',guardClass:'u6-guard'});
  const notice=dialog.querySelector('.u6-notice');let roleFilter='all',sourceFilter='all',searchFilter='';
  const sideView=createTrainSideView();
  let generation=0,inventory,launcher=button;
  const projects=createTrainProjectsView({guard,getTrains,getSelected,getGeneration:()=>generation,onChange:()=>{inventory?.reconcile();signature='';sync();}});
  inventory=createDepotInventory({getProjects:()=>projects.snapshot.confirmed});
  const depot=createDepotView({guard,inventory,getProjects:()=>projects.snapshot,getTrains,getDetached,getGeneration:()=>generation,onChange:()=>{signature='';sync();}});
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
    heading(body,'Model Catalog');
    body.append(element('p','Model definitions at N scale · not inventory quantities.','managementMuted'));
    const toolbar=element('div',undefined,'u6-catalog-filters');
    function filter(label,key,options,value,change){const l=element('label',label),select=element('select');select.setAttribute('aria-label',label);select.dataset.u6Filter=key;for(const [v,text]of options){const o=element('option',text);o.value=v;select.append(o);}select.value=value;select.onchange=()=>{change(select.value);render();};l.append(select);toolbar.append(l);}
    filter('Model role','role',[['all','All roles'],['locomotive','Locomotive'],['trailer','Trailer']],roleFilter,v=>roleFilter=v);
    filter('Model source','source',[['all','All sources'],['native','SerieN'],['kenney','Kenney']],sourceFilter,v=>sourceFilter=v);
    const label=element('label','Find model'),search=element('input');search.type='search';search.value=searchFilter;search.dataset.u6Filter='search';search.setAttribute('aria-label','Find model');search.oninput=()=>{searchFilter=search.value;render();};label.append(search);toolbar.append(label);
    // CTRL-014: one event to the original validated model binding; re-read rollback.
    const original=document.getElementById('rollingModels');
    if(original){const l=element('label','Models on the layout'),select=original.cloneNode(true);select.id='u6RollingModels';select.setAttribute('aria-label','Models on the layout');select.dataset.ctrl='CTRL-014';select.value=original.value;select.onchange=()=>{original.value=select.value;original.dispatchEvent(new Event('change'));select.value=original.value;notice.textContent=document.getElementById('log')?.textContent??'';};l.append(select);toolbar.append(l);}
    const count=element('p',undefined,'managementMuted'),grid=element('div',undefined,'managementCatalog');
    body.append(toolbar,count,grid);
    function render(){grid.replaceChildren();
      const entries=PROJECT_CATALOG.filter(m=>(roleFilter==='all'||m.role===roleFilter)&&(sourceFilter==='all'||m.id.startsWith(sourceFilter+'-'))&&`${m.name} ${m.kind} ${m.source}`.toLowerCase().includes(searchFilter.toLowerCase()));
      count.textContent=`${entries.length} of ${PROJECT_CATALOG.length} model definitions`;
      for(const item of entries){const card=element('article',undefined,'managementModel');card.dataset.modelId=item.id;card.dataset.ctrl='CTRL-066';card.append(image(item.image,item.name??item.kind),element('strong',item.name??item.kind),element('span',item.role==='locomotive'?'Locomotive':'Trailer'),element('small',dimensions(item.length,item.width)),element('small',item.source));grid.append(card);}
      if(!entries.length)grid.append(element('p','No models match these filters.'));
    }render();
  }
  function requestAction(action,origin,target=null){
    if(disposed||guard.active||!dialog.open)return;
    const validTarget=()=>!target||getTrains().find(t=>t.id===target.id)===target;
    if(!validTarget())return;
    if(!projects.dirty){if(projects.discard())action();return;}
    const expected=JSON.stringify(projects.snapshot.draft),currentGeneration=generation,currentView=view,composition=target?JSON.stringify(compositionView(target)):null;
    guard.request({origin,fallbackOrigin:dialog.querySelector('[data-close]'),message:'Continue and discard the unconfirmed draft changes? Confirmed projects and Depot records stay in this session.',
      valid:()=>!disposed&&dialog.open&&generation===currentGeneration&&view===currentView&&validTarget()&&JSON.stringify(projects.snapshot.draft)===expected&&(!target||JSON.stringify(compositionView(target))===composition),
      invalid:()=>{notice.textContent='The context changed. No draft was discarded; request the action again.';},
      confirm:()=>{if(projects.discardAfterConsent(expected)){action();signature='';sync();}}});
  }
  function layout() {
    const trains=getTrains(),selected=getSelected(),columns=element('div',undefined,'managementColumns'),list=element('section'),detail=element('section',undefined,'managementDetail');
    heading(list,`${trains.length} compositions on the layout`);
    for(const train of trains){const c=compositionView(train),b=element('button',undefined,'managementTrain');b.type='button';b.dataset.composition=String(c.id);b.dataset.ctrl='CTRL-028';b.setAttribute('aria-pressed',String(c.id===selected));b.classList.toggle('active',c.id===selected);b.append(image(thumbnailURL(train),c.name),element('strong',c.name),element('small',`${c.vehicles.length} vehicles · ${mm(c.length)}`),element('span',train.guard?.intervened?'Guarded stop':Math.abs(train.velocity??0)>.1?'Moving':train.speed>0?'Starting':'Stopped','u6-state'));b.onclick=()=>onSelect(c.id);list.append(b);}
    const train=trains.find(t=>t.id===selected);
    if(train){const c=compositionView(train);heading(detail,c.name);detail.append(element('p',c.description),element('p',`${c.reverse?'Reverse':'Forward'} · ${mm(c.length)} overall`,'managementSummary'),element('small','Order from locomotive to tail. Reversing preserves this order.'));
      sideView.update(train);sideView.root.dataset.ctrl='CTRL-040';detail.append(sideView.root);
      const ordered=element('ol');ordered.dataset.consist=String(c.id);
      for(const [i,v] of c.vehicles.entries()){const row=element('li');row.dataset.vehicleId=v.id;row.append(element('strong',`${i===0?'Locomotive':`Wagon ${i}`} · ${i===0?c.name:v.name}`),element('small',`${dimensions(v.length,v.width)} · ${v.imported?'Kenney':'SerieN'}`));ordered.append(row);}detail.append(ordered);
      const focus=element('button','◎ Focus in 3D');focus.type='button';focus.dataset.ctrl='CTRL-029';focus.onclick=()=>requestAction(()=>{onFocus(c.id);dialog.close();},focus,train);detail.append(focus);
      const copy=element('button','Copy to project');copy.type='button';copy.dataset.copyTrain=String(c.id);copy.dataset.ctrl='CTRL-030';copy.onclick=()=>requestAction(()=>{projects.copy(train);view='projects';signature='';sync();},copy,train);detail.append(copy);
    }else detail.append(element('p','Select a composition to inspect it.'));
    columns.append(list,detail);body.append(columns);
    const detached=getDetached().map(detachedView),section=element('section',undefined,'managementDetached');heading(section,`Detached rolling stock · ${detached.length}`);
    if(!detached.length)section.append(element('p','No detached vehicles on the tracks.','managementMuted'));
    for(const v of detached){const row=element('p');row.dataset.detachedId=v.id;row.dataset.ctrl='CTRL-065';row.title=v.id;row.textContent=`Detached · ${v.name} · Track ${v.edge} · ${mm(v.length)}${Number.isFinite(v.width)?` × ${mm(v.width)}`:''} · ${v.id}`;section.append(row);}body.append(section);
  }
  function sync() {
    if(disposed||!dialog.open)return;
    // No per-frame DOM rebuilding: only structural/model/selection changes.
    const next=JSON.stringify([view,getSelected(),getTrains().map(compositionView),getDetached().map(detachedView),getImportedCatalog(),generation,getTrains().map(t=>Boolean(t.speed||Math.abs(t.velocity)>.1)),inventory.items,projects.snapshot]);
    if(next===signature)return;signature=next;
    body.setAttribute('aria-labelledby',`u6-tab-${view}`);body.dataset.u6View=view;body.classList.toggle('u6-view',view==='layout'||view==='catalog');
    const scroll=body.scrollTop,focused=document.activeElement?.dataset.composition,filterFocus=document.activeElement?.dataset.u6Filter,selection=document.activeElement?.selectionStart;
    for(const b of dialog.querySelectorAll('[data-view]')){const active=b.dataset.view===view;b.setAttribute('aria-pressed',String(active));b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;}
    dialog.querySelector('.u6-session').textContent=`Session only · ${projects.dirty?'Unconfirmed changes':projects.hasProjects||inventory.size?'Virtual data in RAM':'No virtual data'}`;
    if(view==='depot'){if(depot.root.parentNode!==body)body.replaceChildren(depot.root);depot.sync();}
    else if(view==='projects'){if(projects.root.parentNode!==body)body.replaceChildren(projects.root);projects.sync();}
    else {body.replaceChildren();if(view==='catalog')catalog();else layout();}body.scrollTop=scroll;
    if(filterFocus){const f=body.querySelector(`[data-u6-filter="${filterFocus}"]`);f?.focus({preventScroll:true});if(f?.type==='search'&&selection!==null)f.setSelectionRange(selection,selection);}
    if(focused!==undefined)body.querySelector(`[data-composition="${Number(focused)}"]`)?.focus();
  }
  function open(initialView,origin=button){if(disposed)return;if(['layout','catalog','projects','depot'].includes(initialView))view=initialView;launcher=origin;signature='';if(!dialog.open)dialog.showModal();sync();}
  button.onclick=()=>open(undefined,button);
  function requestClose(){requestAction(()=>dialog.close(),dialog.querySelector('[data-close]'));}
  dialog.querySelector('[data-close]').onclick=requestClose;dialog.querySelector('[data-close]').dataset.ctrl='CTRL-055';
  dialog.addEventListener('click',e=>{if(e.target===dialog)requestClose();});
  dialog.addEventListener('keydown',e=>{if(e.key==='Escape')e.stopPropagation();});
  dialog.addEventListener('cancel',event=>{event.preventDefault();requestClose();});
  function beforeUnload(event){if(projects.dirty||projects.hasProjects||inventory.size>0){event.preventDefault();event.returnValue='';}}
  window.addEventListener('beforeunload',beforeUnload);
  const tabs=[...dialog.querySelectorAll('[data-view]')];for(const [i,b]of tabs.entries()){b.setAttribute('role','tab');b.dataset.ctrl='CTRL-056';b.id=`u6-tab-${b.dataset.view}`;b.setAttribute('aria-controls','u6-panel');b.onclick=()=>{if(disposed||guard.active)return;view=b.dataset.view;sync();body.scrollTop=0;};b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const n=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowLeft'?-1:1)+tabs.length)%tabs.length;tabs[n].click();tabs[n].focus();};}body.id='u6-panel';body.setAttribute('role','tabpanel');
  dialog.addEventListener('close',()=>{if(launcher?.isConnected)launcher.focus();});
  return {sync,open,get sessionSummary(){return Object.freeze({dirty:projects.dirty,projects:projects.snapshot.confirmed.length,depot:inventory.size,hasSessionData:projects.dirty||projects.hasProjects||inventory.size>0,generation});},invalidateReferences(){generation++;if(guard.active){guard.cancel();notice.textContent='Railway reset changed the context. Pending action cancelled; draft preserved.';}signature='';sync();},update(now){if(dialog.open&&now-lastSync>=250){lastSync=now;sync();}},dispose(){disposed=true;guard.dispose();button.onclick=null;dialog.querySelectorAll('button,input,select,img').forEach(e=>{e.onclick=null;e.onkeydown=null;e.onchange=null;e.oninput=null;e.onerror=null;});sideView.dispose();projects.dispose();depot.dispose();inventory.dispose();window.removeEventListener('beforeunload',beforeUnload);dialog.remove();}};
}
