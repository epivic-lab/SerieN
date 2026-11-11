import {createTrainSideView} from './train-side-view.js';
import {createTrainProjects,PROJECT_CATALOG,projectModel,validateProject,realComposition,compareProject,railwayProjectCapabilities} from './train-projects.js';

export function createTrainProjectsView({getTrains,getSelected,getGeneration,onChange}){
  const store=createTrainProjects(),root=document.createElement('section'),side=createTrainSideView();root.className='managementProjects';
  let savedId=null,signature='',message='',disposed=false;
  const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
  function action(label,key,fn,disabled=false){const b=el('button',label);b.type='button';b.dataset.projectAction=key;b.disabled=disabled;b.onclick=()=>run(fn);return b;}
  function run(fn){try{message='';fn();}catch(error){message=error.message;}signature='';sync();onChange();}
  function discard(){if(store.dirty&&!window.confirm('Discard unsaved project changes?'))return false;store.cancel();return true;}
  function start(fn){if(discard()){fn();savedId=null;}}
  function copy(train){run(()=>start(()=>store.copy(train,getGeneration())));}
  function comparison(project){
    const section=el('section',undefined,'projectComparison');section.setAttribute('aria-label','Project and real composition comparison');
    const train=project.source?getTrains().find(t=>t.id===project.source.trainId):null;
    const result=compareProject(project,realComposition(train,getGeneration()),getGeneration());section.dataset.comparison=result.status;
    section.append(el('h4','Comparison with the layout'),el('p',result.message));
    if(result.status!=='stale'&&train){
      const table=el('table'),head=el('tr');for(const name of ['Position','Project','Real train'])head.append(el('th',name));table.append(head);
      const real=realComposition(train,getGeneration());
      for(let i=0;i<Math.max(project.vehicles.length,real.vehicles.length);i++){
        const p=project.vehicles[i],r=real.vehicles[i],row=el('tr');row.append(el('th',String(i+1)),el('td',p?`${projectModel(p.modelId).name} · ${p.orientation===1?'forward':'reversed'}`:'—'),el('td',r?PROJECT_CATALOG.find(m=>m.id===r.modelId)?.name??'Unknown model':'—'));table.append(row);
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
    const next=JSON.stringify([draft,projects,savedId,message,getGeneration(),real,getSelected()]);if(next===signature)return;signature=next;
    const focused=root.contains(document.activeElement)?document.activeElement:null,focusKey=focused?.dataset.projectAction,selection=focused?.tagName==='INPUT'?[focused.selectionStart,focused.selectionEnd]:null;
    const scroll=root.closest('dialog')?.scrollTop;
    root.replaceChildren();
    const toolbar=el('div',undefined,'projectToolbar');toolbar.append(action('＋ New project','new',()=>start(()=>store.begin())));root.append(toolbar,
      el('p','Projects are kept only in this open page. Reloading or closing the page loses them. Confirming a project does not put vehicles on the tracks.','projectNotice'));
    const columns=el('div',undefined,'projectColumns'),list=el('section',undefined,'projectList'),detail=el('section',undefined,'managementDetail projectEditor');list.append(el('h3',`Confirmed projects · ${projects.length}`));
    if(!projects.length)list.append(el('p','No confirmed projects yet.','managementMuted'));
    for(const p of projects){const b=action(p.name,`open-${p.id}`,()=>start(()=>store.open(p.id)));b.dataset.projectId=p.id;b.setAttribute('aria-pressed',String(p.id===project?.id));list.append(b);}
    if(message){const status=el('p',message,'projectNotice');status.setAttribute('role','alert');detail.append(status);}
    if(project){
      detail.append(el('h3',draft?'Edit project':'Confirmed project'));
      if(draft){const label=el('label','Project name'),input=el('input');input.type='text';input.maxLength=80;input.value=draft.name;input.dataset.projectAction='name';input.setAttribute('aria-label','Project name');
        input.oninput=()=>run(()=>store.rename(input.value));label.append(input);detail.append(label);
        const dirty=el('p',store.dirty?'Unconfirmed changes':'No unconfirmed changes','managementMuted');dirty.dataset.projectDirty=String(store.dirty);detail.append(dirty);
      }else detail.append(el('strong',project.name));
      if(project.vehicles.length){side.updateProject(project);detail.append(side.root);}else detail.append(el('p','Choose a locomotive to start the preview.'));
      const ordered=el('ol',undefined,'projectVehicles');
      for(const [i,v] of project.vehicles.entries()){
        const row=el('li');row.dataset.plannedVehicle=v.id;row.append(el('strong',`${i===0?'Locomotive':`Trailer ${i}`} · ${projectModel(v.modelId).name}`),el('small',`${v.orientation===1?'Forward':'Reversed'} · planned orientation`));
        if(draft){const commands=el('div',undefined,'projectToolbar');commands.append(action('↑ Earlier',`up-${v.id}`,()=>store.move(v.id,-1),i<2),action('↓ Later',`down-${v.id}`,()=>store.move(v.id,1),i===0||i===project.vehicles.length-1),action('↔ Reverse',`flip-${v.id}`,()=>store.flip(v.id)),action('Remove',`remove-${v.id}`,()=>store.remove(v.id),i===0&&project.vehicles.length>1));row.append(commands);}ordered.append(row);
      }detail.append(ordered);
      if(draft){
        const label=el('label',draft.vehicles.length?'Add a trailer':'Choose a locomotive'),select=el('select');select.setAttribute('aria-label','Catalog model');select.dataset.projectAction='model';
        for(const model of PROJECT_CATALOG.filter(m=>m.role===(draft.vehicles.length?'trailer':'locomotive'))){const option=el('option',`${model.name} · ${model.source}`);option.value=model.id;select.append(option);}label.append(select);
        detail.append(label,action('Add model','add',()=>store.add(select.value),draft.vehicles.length>=6));
        const errors=validateProject(draft),controls=el('div',undefined,'projectToolbar');
        controls.append(action('Confirm project','confirm',()=>{const saved=store.confirm();savedId=saved.id;},errors.length>0),action('Cancel changes','cancel',()=>{const id=draft.id;if(discard())savedId=id;}));detail.append(controls);
        if(errors.length)detail.append(el('p',errors.join(' '),'managementMuted'));
        detail.append(action('Compare with selected real train','link',()=>store.link(getTrains().find(t=>t.id===getSelected()),getGeneration())));
      }else detail.append(action('Edit project','edit',()=>start(()=>store.open(project.id))));
      detail.append(comparison(project));
    }else detail.append(el('p','Create a new project, or copy a train from “On the layout”.'));
    columns.append(list,detail);root.append(columns);
    if(focusKey){const target=[...root.querySelectorAll('[data-project-action]')].find(n=>n.dataset.projectAction===focusKey);target?.focus({preventScroll:true});if(selection&&target?.tagName==='INPUT')target.setSelectionRange(...selection);}
    if(scroll!==undefined)root.closest('dialog').scrollTop=scroll;
  }
  return {root,sync,copy,discard,get dirty(){return store.dirty;},get hasProjects(){return store.projects.length>0;},dispose(){disposed=true;side.dispose();root.remove();store.cancel();}};
}
