import {createGuardModal} from './ui/guard-modal.js';
import {THUMBNAIL_FALLBACK} from './locomotive-thumbnails.js';
import {createTrainSideView} from './train-side-view.js';
import {createTrainProjects,PROJECT_CATALOG,projectModel,validateProject,realComposition,compareProject,railwayProjectCapabilities} from './train-projects.js';

export function createTrainProjectsView({getTrains,getSelected,getGeneration,onChange,guard:sharedGuard}){
  const store=createTrainProjects(),root=document.createElement('section'),side=createTrainSideView();root.className='managementProjects u7-projects';
  const ownsGuard=!sharedGuard,guard=sharedGuard??createGuardModal({title:'Discard draft changes?',cancelLabel:'Keep editing',confirmLabel:'Discard and continue',titleId:'u7GuardTitle',guardClass:'u6-guard'});
  let savedId=null,selectedVehicleId=null,signature='',message='',disposed=false;
  const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
  function action(label,key,fn,disabled=false){const b=el('button',label);b.type='button';b.dataset.projectAction=key;const ctrl={new:'031',add:'033',tray:'033',up:'034',down:'034',flip:'035',remove:'036',confirm:'037',cancel:'038',link:'039',open:'057',edit:'058'}[key.split('-')[0]];if(ctrl)b.dataset.ctrl=`CTRL-${ctrl}`;b.disabled=disabled;b.onclick=()=>{if(!disposed&&!guard.active)run(fn);};return b;}
  let runDepth=0;
  function run(fn){if(disposed)return;runDepth++;try{if(runDepth===1)message='';fn();}catch(error){message=error.message;}finally{runDepth--;}if(runDepth||guard.active)return;signature='';sync();onChange();}
  // Boolean contract retained. Dirty cancellation requires an explicit coordinator intent.
  function discard(){if(store.dirty)return false;store.cancel();return true;}
  function intent(fn,validTarget=()=>true){
    if(disposed||guard.active)return;
    const expected=JSON.stringify(store.draft),generation=getGeneration(),confirmed=JSON.stringify(store.projects),origin=document.activeElement;
    const apply=()=>{if(discardAfterConsent(expected)){run(fn);}};
    if(!store.dirty){if(validTarget())apply();return;}
    guard.request({origin,fallbackOrigin:root.closest('dialog')?.querySelector('[data-close]'),message:'Discard the unconfirmed draft changes and continue? Confirmed projects and Depot reservations are kept.',
      valid:()=>!disposed&&getGeneration()===generation&&JSON.stringify(store.draft)===expected&&JSON.stringify(store.projects)===confirmed&&validTarget(),
      invalid:()=>run(()=>{message='The context changed. No changes were discarded. Request the action again.';}),confirm:apply});
  }
  function start(fn,validTarget){intent(()=>{fn();savedId=null;selectedVehicleId=null;},validTarget);}
  function copy(train){const composition=JSON.stringify(realComposition(train,getGeneration()));start(()=>store.copy(train,getGeneration()),()=>getTrains().includes(train)&&JSON.stringify(realComposition(train,getGeneration()))===composition);}
  function previewImage(model){const img=el('img');img.src=model.image;img.alt=model.name;img.width=320;img.height=160;img.decoding='async';img.onerror=()=>{img.onerror=null;img.src=THUMBNAIL_FALLBACK;img.alt='Model preview unavailable';};return img;}
  function selectVehicle(id){selectedVehicleId=id;signature='';sync();root.querySelector(`[data-planned-vehicle="${id}"]`)?.focus({preventScroll:true});}
  function comparison(project){
    const section=el('section',undefined,'projectComparison');section.setAttribute('aria-label','Project and real composition comparison');
    const train=project.source?getTrains().find(t=>t.id===project.source.trainId):null;
    const result=compareProject(project,realComposition(train,getGeneration()),getGeneration());section.dataset.comparison=result.status;
    section.append(el('h4',`Compare · ${result.status.charAt(0).toUpperCase()+result.status.slice(1)}`),el('p',result.message));
    if(result.status!=='stale'&&train){
      const table=el('table'),head=el('tr');for(const name of ['Position','Planned slot / source reference','Real train / physical identity'])head.append(el('th',name));table.append(head);
      const real=realComposition(train,getGeneration());
      for(let i=0;i<Math.max(project.vehicles.length,real.vehicles.length);i++){
        const p=project.vehicles[i],r=real.vehicles[i],row=el('tr');row.append(el('th',String(i+1)),el('td',p?`${projectModel(p.modelId).name} · ${p.orientation===1?'forward':'reversed'} · slot ${p.id} · source ${p.sourceVehicleId??'unlinked'}`:'—'),el('td',r?`${PROJECT_CATALOG.find(m=>m.id===r.modelId)?.name??'Unknown model'} · physical ${r.id}`:'—'));table.append(row);
      }section.append(table);
      const list=el('ul');for(const difference of result.differences)list.append(el('li',difference));section.append(list);
    }
    const capabilities=railwayProjectCapabilities(train);
    section.append(el('h4','Railway operations'),el('p',capabilities.apply),el('p',`Uncouple: ${capabilities.uncouple}`),el('p',`Couple: ${capabilities.couple}`),el('p','Use the existing train consoles for individual R1 operations. A detached wagon remains on the track.','managementMuted'));
    return section;
  }
  function sync(){
    if(disposed)return;
    const draft=store.draft,projects=store.projects,project=draft??projects.find(p=>p.id===savedId);
    const real=getTrains().map(t=>[realComposition(t,getGeneration()),railwayProjectCapabilities(t)]);
    const next=JSON.stringify([draft,projects,savedId,selectedVehicleId,message,getGeneration(),real,getSelected()]);if(next===signature)return;signature=next;
    const focused=root.contains(document.activeElement)?document.activeElement:null,focusKey=focused?.dataset.projectAction,selection=focused?.tagName==='INPUT'?[focused.selectionStart,focused.selectionEnd]:null;
    const scroll=root.closest('dialog')?.scrollTop;
    root.replaceChildren();
    const toolbar=el('div',undefined,'projectToolbar');toolbar.append(action('＋ New project','new',()=>start(()=>store.begin())));root.append(toolbar,
      el('p','Projects are kept only in this open page. Reloading or closing the page loses them. Confirming a project does not put vehicles on the tracks.','projectNotice'));
    const columns=el('div',undefined,'projectColumns'),list=el('section',undefined,'projectList'),detail=el('section',undefined,'managementDetail projectEditor');list.append(el('h3',`Confirmed projects · ${projects.length}`));
    if(!projects.length)list.append(el('p','No confirmed projects yet.','managementMuted'));
    for(const p of projects){const b=action(p.name,`open-${p.id}`,()=>intent(()=>{savedId=p.id;selectedVehicleId=null;},()=>store.projects.some(v=>v.id===p.id)));b.dataset.projectId=p.id;b.setAttribute('aria-pressed',String(p.id===project?.id));const edit=action(`Edit ${p.name}`,`edit-${p.id}`,()=>start(()=>store.open(p.id),()=>store.projects.some(v=>v.id===p.id)));edit.dataset.editProject=p.id;list.append(b,edit);}
    if(message){const status=el('p',message,'projectNotice');status.setAttribute('role','alert');detail.append(status);}
    if(project){
      detail.append(el('h3',draft?'Edit project':'Confirmed project'));
      if(draft){const label=el('label','Project name'),input=el('input');input.type='text';input.maxLength=80;input.value=draft.name;input.dataset.projectAction='name';input.dataset.ctrl='CTRL-032';input.setAttribute('aria-label','Project name');
        input.oninput=()=>run(()=>store.rename(input.value));label.append(input);detail.append(label);
        const dirty=el('p',store.dirty?'Unconfirmed changes':'No unconfirmed changes','managementMuted');dirty.dataset.projectDirty=String(store.dirty);detail.append(dirty);
      }else detail.append(el('strong',project.name));
      if(project.vehicles.length){side.updateProject(project);side.root.dataset.ctrl='CTRL-040';detail.append(side.root);}else detail.append(el('p','Choose a locomotive to start the preview.'));
      const ordered=el('ol',undefined,'projectVehicles');ordered.tabIndex=0;ordered.setAttribute('aria-label','Planned vehicle rail');
      if(!project.vehicles.some(v=>v.id===selectedVehicleId))selectedVehicleId=project.vehicles[0]?.id??null;
      for(const [i,v] of project.vehicles.entries()){
        const row=el('li');row.dataset.plannedVehicle=v.id;row.tabIndex=0;row.setAttribute('aria-label',`Planned vehicle ${i+1}`);row.classList.toggle('u7-selected',v.id===selectedVehicleId);
        const select=el('button',`Select vehicle ${i+1}`);select.type='button';select.dataset.selectVehicle=v.id;select.onclick=()=>selectVehicle(v.id);row.append(previewImage(projectModel(v.modelId)),select);row.append(el('strong',`${i===0?'Locomotive':`Trailer ${i}`} · ${projectModel(v.modelId).name}`),el('small',`${v.orientation===1?'Forward':'Reversed'} · planned orientation`));
        if(draft){const commands=el('div',undefined,'projectToolbar');commands.append(action('↑ Earlier',`up-${v.id}`,()=>store.move(v.id,-1),i<2),action('↓ Later',`down-${v.id}`,()=>store.move(v.id,1),i===0||i===project.vehicles.length-1),action('↔ Reverse',`flip-${v.id}`,()=>store.flip(v.id)),action('Remove',`remove-${v.id}`,()=>store.remove(v.id),i===0&&project.vehicles.length>1));row.append(commands);}ordered.append(row);
      }detail.append(ordered);
      const selectedVehicle=project.vehicles.find(v=>v.id===selectedVehicleId),inspector=el('section',undefined,'u7-inspector');inspector.setAttribute('aria-label','Planned vehicle inspector');
      inspector.append(el('h4','Vehicle inspector'));
      if(selectedVehicle){const model=projectModel(selectedVehicle.modelId);inspector.append(el('strong',model.name),el('p',`${model.role} · ${model.source} · ${model.length.toFixed(1)} mm N`),el('p',`Slot ${selectedVehicle.id}`),el('p',`Planned orientation: ${selectedVehicle.orientation===1?'Forward':'Reversed'}`),el('p',`Physical source: ${selectedVehicle.sourceVehicleId??'Unlinked'}`));}
      else inspector.append(el('p','Select a vehicle after adding a locomotive.'));
      detail.append(inspector);

      if(draft){
        const label=el('label',draft.vehicles.length?'Add a trailer':'Choose a locomotive'),select=el('select');select.setAttribute('aria-label','Catalog model');select.dataset.projectAction='model';
        for(const model of PROJECT_CATALOG.filter(m=>m.role===(draft.vehicles.length?'trailer':'locomotive'))){const option=el('option',`${model.name} · ${model.source}`);option.value=model.id;select.append(option);}label.append(select);
        detail.append(label,action('Add model','add',()=>store.add(select.value),draft.vehicles.length>=6));
        const tray=el('section',undefined,'u7-tray');tray.setAttribute('aria-label','Model tray');tray.append(el('h4',draft.vehicles.length?'Trailer tray':'Locomotive tray'));
        for(const model of PROJECT_CATALOG.filter(m=>m.role===(draft.vehicles.length?'trailer':'locomotive'))){const b=action(`Add ${model.name}`,`tray-${model.id}`,()=>store.add(model.id),draft.vehicles.length>=6);b.dataset.addModel=model.id;b.prepend(previewImage(model));tray.append(b);}detail.append(tray);

        const errors=validateProject(draft),controls=el('div',undefined,'projectToolbar');
        controls.append(action('Confirm project','confirm',()=>{const saved=store.confirm();savedId=saved.id;},errors.length>0),action('Cancel changes','cancel',()=>{const id=draft.id;intent(()=>{savedId=id;selectedVehicleId=null;});}));detail.append(controls);
        if(errors.length)detail.append(el('p',errors.join(' '),'managementMuted'));
        detail.append(action('Compare with selected real train','link',()=>store.link(getTrains().find(t=>t.id===getSelected()),getGeneration())));
      }else detail.append(action('Edit project','edit',()=>start(()=>store.open(project.id),()=>store.projects.some(p=>p.id===project.id))));
      detail.append(comparison(project));
    }else detail.append(el('p','Create a new project, or copy a train from “On the layout”.'));
    columns.append(list,detail);root.append(columns);
    if(focusKey){const target=[...root.querySelectorAll('[data-project-action]')].find(n=>n.dataset.projectAction===focusKey);target?.focus({preventScroll:true});if(selection&&target?.tagName==='INPUT')target.setSelectionRange(...selection);}
    if(scroll!==undefined)root.closest('dialog').scrollTop=scroll;
  }
  const keyboard=e=>{
    if(disposed||guard.active||!root.isConnected||!root.closest('dialog')?.open||document.querySelector('dialog[open]:not(.trainManagement)')||e.defaultPrevented||e.repeat||e.target.closest('input,textarea,select,button,a,[contenteditable]')||root.closest('dialog')?.open===false)return;
    const draft=store.draft,id=e.target.closest('[data-planned-vehicle]')?.dataset.plannedVehicle??selectedVehicleId;
    if(!draft||!draft.vehicles.some(v=>v.id===id))return;
    let action=null,index=draft.vehicles.findIndex(v=>v.id===id);if(e.altKey&&!e.ctrlKey&&!e.metaKey&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const delta=e.key==='ArrowLeft'?-1:1;if(index>0&&index+delta>0&&index+delta<draft.vehicles.length)action=()=>store.move(id,delta);}
    else if(!e.altKey&&!e.ctrlKey&&!e.metaKey&&e.key.toLowerCase()==='f')action=()=>store.flip(id);
    else if(!e.altKey&&!e.ctrlKey&&!e.metaKey&&e.key==='Delete'){e.preventDefault();if(index>0||draft.vehicles.length===1)action=()=>store.remove(id);}
    if(action){e.preventDefault();selectedVehicleId=id;run(action);root.querySelector(`[data-planned-vehicle="${id}"]`)?.focus({preventScroll:true});}
  };root.addEventListener('keydown',keyboard);
  // U6 shell only: a consumed, unchanged consent. Original discard() remains synchronous.
  function discardAfterConsent(expected){if(disposed||JSON.stringify(store.draft)!==expected)return false;store.cancel();return true;}
  return {root,sync,copy,discard,discardAfterConsent,get snapshot(){return {confirmed:store.projects,draft:store.draft};},get dirty(){return store.dirty;},get hasProjects(){return store.projects.length>0;},dispose(){disposed=true;if(ownsGuard)guard.dispose();else if(guard.active)guard.cancel();root.removeEventListener('keydown',keyboard);root.querySelectorAll('button,input,select,img').forEach(e=>{e.onclick=null;e.oninput=null;e.onchange=null;e.onerror=null;});side.dispose();root.remove();store.cancel();}};
}
