import {createGuardModal} from './ui/guard-modal.js';
import {PROJECT_CATALOG,projectModel} from './train-projects.js';
import {projectSlots,railwayInventoryView} from './depot-inventory.js';
import {THUMBNAIL_FALLBACK} from './locomotive-thumbnails.js';

export function createDepotView({inventory,getProjects,getTrains,getDetached,getGeneration,onChange,guard:sharedGuard}){
  const root=document.createElement('section');root.className='managementDepot u8-depot';root.setAttribute('aria-label','Depot inventory');
  const ownsGuard=!sharedGuard,guard=sharedGuard??createGuardModal({title:'Confirm virtual inventory action?',cancelLabel:'Cancel',confirmLabel:'Confirm',titleId:'u8GuardTitle',guardClass:'u6-guard'});
  let signature='',message='',disposed=false,modelChoice=PROJECT_CATALOG[0].id;const choices=new Map();
  const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
  function mutate(fn){if(disposed)return;try{fn();message='';signature='';sync();onChange();}catch(e){message=e.message;signature='';sync();}}
  function button(label,key,fn,disabled=false){const b=el('button',label);b.type='button';b.dataset.depotAction=key;const ctrl={add:'041',assign:'042',release:'043',remove:'044'}[key.split('-')[0]];if(ctrl)b.dataset.ctrl=`CTRL-${ctrl}`;b.disabled=disabled;b.onclick=()=>{if(!disposed&&!guard.active)fn();};return b;}
  function protect(item,kind){
    if(disposed||guard.active)return;
    const generation=getGeneration(),expected=JSON.stringify(item),origin=document.activeElement;
    const assignment=item.assignment?projectSlots(getProjects().confirmed).find(s=>s.projectId===item.assignment.projectId&&s.vehicleId===item.assignment.vehicleId):null;
    if(kind==='remove'&&(item.state!=='available'||item.assignment))return;
    if(kind==='release'&&!assignment)return;
    guard.request({title:kind==='release'?'Release virtual reservation?':'Remove virtual record?',cancelLabel:'Cancel',confirmLabel:kind==='release'?'Release reservation':'Remove record',origin,fallbackOrigin:root.closest('dialog')?.querySelector('[data-close]'),message:`${kind==='release'?'Release the planning reservation for':'Remove the virtual record'} ${item.code}? Physical railway vehicles are unaffected.`,
      valid:()=>{
        if(disposed||getGeneration()!==generation)return false;
        const current=inventory.items.find(v=>v.id===item.id);
        if(!current||JSON.stringify(current)!==expected)return false;
        if(kind==='remove')return current.state==='available'&&!current.assignment;
        const target=projectSlots(getProjects().confirmed).find(s=>s.projectId===current.assignment?.projectId&&s.vehicleId===current.assignment?.vehicleId);
        return target?.modelId===item.modelId&&target?.vehicleId===assignment.vehicleId&&target?.projectId===assignment.projectId;
      },
      invalid:()=>{message='The inventory context changed. No action was applied; review the current record.';signature='';sync();},
      confirm:()=>mutate(()=>{if(kind==='release')inventory.release(item.id);else{inventory.remove(item.id);choices.delete(item.id);}})});
  }
  function sync(){
    if(disposed)return;inventory.reconcile();
    const snapshot=getProjects(),items=inventory.items,slots=projectSlots(snapshot.confirmed),physical=railwayInventoryView(getTrains(),getDetached(),getGeneration());
    const next=JSON.stringify([items,snapshot,physical,message]);if(next===signature)return;signature=next;
    const focus=root.contains(document.activeElement)?document.activeElement?.dataset.depotAction:null,scroll=root.closest('dialog')?.scrollTop;
    root.replaceChildren();root.append(el('h3',`Off-scene inventory (virtual) · ${items.length}`),el('p','Depot records are virtual and kept only in this open page. They have no railway position. Reserving a record is planning only: it does not create, remove or claim a physical vehicle.','projectNotice'));
    if(message){const alert=el('p',message,'projectNotice');alert.setAttribute('role','alert');root.append(alert);}
    const creation=el('div',undefined,'depotCreate'),label=el('label','Inventory model'),select=el('select');select.setAttribute('aria-label','Inventory model');select.dataset.depotAction='model';select.dataset.ctrl='CTRL-059';
    for(const m of PROJECT_CATALOG){const o=el('option',`${m.name} · ${m.source}`);o.value=m.id;select.append(o);}select.value=modelChoice;select.onchange=()=>{modelChoice=select.value;};label.append(select);creation.append(label,button('Add virtual depot item','add',()=>mutate(()=>inventory.add(select.value))));root.append(creation);
    const grid=el('div',undefined,'managementCatalog depotItems');
    if(!items.length)grid.append(el('p','No off-scene inventory records. The model catalog and the railway stock are separate.','managementMuted'));
    for(const item of items){
      const m=projectModel(item.modelId),card=el('article',undefined,'managementModel depotItem');card.dataset.depotId=item.id;card.dataset.depotState=item.state;
      const image=el('img');image.src=m.image;image.alt=m.name;image.width=320;image.height=160;image.onerror=()=>{image.onerror=null;image.src=THUMBNAIL_FALLBACK;image.alt='Model preview unavailable';};
      card.append(image,el('strong',`${item.code} · ${m.name}`),el('small',`Virtual record · ${item.id}`),el('small',`Catalog model · ${item.modelId}`),el('strong',item.state==='available'?'Available for planning':'Reserved for planning'));
      if(item.notice)card.append(el('p',item.notice,'managementMuted'));
      if(item.assignment){const target=slots.find(s=>s.projectId===item.assignment.projectId&&s.vehicleId===item.assignment.vehicleId);card.append(el('p',`${target.projectName} · vehicle ${target.position} · slot ${target.vehicleId}`),button('Release reservation',`release-${item.id}`,()=>protect(item,'release')));}
      else {
        const targets=slots.filter(s=>s.modelId===item.modelId&&!items.some(v=>v.assignment?.projectId===s.projectId&&v.assignment.vehicleId===s.vehicleId));
        const assignment=el('label',`Reserve ${item.code} for`),pick=el('select');pick.setAttribute('aria-label',`Reserve ${item.code} for`);pick.dataset.depotAction=`target-${item.id}`;
        for(const target of targets){const o=el('option',`${target.projectName} · vehicle ${target.position} · slot ${target.vehicleId}`);o.value=JSON.stringify([target.projectId,target.vehicleId]);pick.append(o);}
        if(!targets.length){const o=el('option','No matching unreserved vehicle in confirmed projects');o.value='';pick.append(o);card.append(el('p','No compatible unreserved slot in confirmed projects. Draft-only slots cannot be reserved.','u8-no-slot'));}pick.disabled=!targets.length;
        if(targets.some(t=>JSON.stringify([t.projectId,t.vehicleId])===choices.get(item.id)))pick.value=choices.get(item.id);
        pick.onchange=()=>choices.set(item.id,pick.value);assignment.append(pick);card.append(assignment,button('Reserve for project',`assign-${item.id}`,()=>mutate(()=>{const [p,v]=JSON.parse(pick.value);inventory.assign(item.id,p,v);choices.delete(item.id);}),!targets.length));
      }
      card.append(button('Remove virtual item',`remove-${item.id}`,()=>protect(item,'remove'),item.state==='reserved'));grid.append(card);
    }root.append(grid);
    const gate=el('section',undefined,'depotTransferGate');gate.dataset.ctrl='CTRL-045';gate.append(el('h3','Physical transfers · unavailable'),el('p','R1 has no generic safe depot entry/exit command. Detached vehicles remain on the track. Use the existing consoles only for supported coupling and uncoupling.'),el('p','Place on Layout · unavailable','u8-unavailable'),el('p','Withdraw from Layout · unavailable','u8-unavailable'));root.append(gate);
    const plans=el('section',undefined,'depotPlans');plans.append(el('h3',`M2 confirmed planned vehicles (virtual) · ${slots.length}`));
    if(!slots.length)plans.append(el('p','Confirm an M2 project to reserve a matching inventory record.','managementMuted'));
    for(const s of slots){const row=el('p',`${s.projectName} · vehicle ${s.position} · ${projectModel(s.modelId).name} · virtual slot ${s.vehicleId} · project ${s.projectId}`);row.dataset.depotPlannedId=s.vehicleId;row.dataset.projectId=s.projectId;plans.append(row);}
    if(snapshot.draft){const draft=el('p',`Open draft: ${snapshot.draft.name} · ${snapshot.draft.vehicles.length} virtual vehicles. Reservations use only the confirmed version; cancelling edits keeps its reservations.`,'projectNotice');draft.dataset.depotDraft=snapshot.draft.id;plans.append(draft);}root.append(plans);
    const real=el('section',undefined,'depotRailway');real.append(el('h3',`Physical railway stock (read only) · ${physical.length}`),el('p','These are R1 objects on the layout, never off-scene inventory. Matching models do not imply matching identities.','managementMuted'));
    for(const v of physical){const row=el('p',`${v.name} · ${v.state==='on-train'?`Physical · engaged on ${v.trainName}`:`Physical · detached on track ${v.edge}`} · physical UUID ${v.id} · generation ${v.generation} · not depot stock`);row.dataset.depotPhysicalId=v.id;row.dataset.depotPhysicalState=v.state;row.dataset.generation=String(v.generation);real.append(row);}root.append(real);
    if(focus){const candidates=[...root.querySelectorAll('[data-depot-action]')],alternate=focus.replace(/^assign-/,'release-').replace(/^release-(?!$)/,focus.startsWith('release-')?'assign-':'release-');const target=candidates.find(e=>e.dataset.depotAction===focus&&!e.disabled)??candidates.find(e=>e.dataset.depotAction===alternate&&!e.disabled)??root.querySelector('[data-depot-action=add]');target?.focus({preventScroll:true});}
    if(scroll!==undefined)root.closest('dialog').scrollTop=scroll;
  }
  return {root,sync,dispose(){disposed=true;if(ownsGuard)guard.dispose();else if(guard.active)guard.cancel();root.querySelectorAll('button,select,img').forEach(e=>{e.onclick=null;e.onchange=null;e.onerror=null;});choices.clear();root.remove();}};
}
