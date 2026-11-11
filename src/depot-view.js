import {PROJECT_CATALOG,projectModel} from './train-projects.js';
import {projectSlots,railwayInventoryView} from './depot-inventory.js';
import {THUMBNAIL_FALLBACK} from './locomotive-thumbnails.js';

export function createDepotView({inventory,getProjects,getTrains,getDetached,getGeneration,onChange}){
  const root=document.createElement('section');root.className='managementDepot';root.setAttribute('aria-label','Depot inventory');
  let signature='',message='',disposed=false,modelChoice=PROJECT_CATALOG[0].id;const choices=new Map();
  const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
  function button(label,key,fn,disabled=false){const b=el('button',label);b.type='button';b.dataset.depotAction=key;b.disabled=disabled;b.onclick=()=>{try{message='';fn();}catch(e){message=e.message;}signature='';sync();onChange();};return b;}
  function sync(){
    if(disposed)return;inventory.reconcile();
    const snapshot=getProjects(),items=inventory.items,slots=projectSlots(snapshot.confirmed),physical=railwayInventoryView(getTrains(),getDetached(),getGeneration());
    const next=JSON.stringify([items,snapshot,physical,message]);if(next===signature)return;signature=next;
    const focus=root.contains(document.activeElement)?document.activeElement?.dataset.depotAction:null,scroll=root.closest('dialog')?.scrollTop;
    root.replaceChildren();root.append(el('h3',`Off-scene inventory (virtual) · ${items.length}`),el('p','Depot records are virtual and kept only in this open page. They have no railway position. Reserving a record is planning only: it does not create, remove or claim a physical vehicle.','projectNotice'));
    if(message){const alert=el('p',message,'projectNotice');alert.setAttribute('role','alert');root.append(alert);}
    const creation=el('div',undefined,'depotCreate'),label=el('label','Inventory model'),select=el('select');select.setAttribute('aria-label','Inventory model');select.dataset.depotAction='model';
    for(const m of PROJECT_CATALOG){const o=el('option',`${m.name} · ${m.source}`);o.value=m.id;select.append(o);}select.value=modelChoice;select.onchange=()=>{modelChoice=select.value;};label.append(select);creation.append(label,button('Add virtual depot item','add',()=>inventory.add(select.value)));root.append(creation);
    const grid=el('div',undefined,'managementCatalog depotItems');
    if(!items.length)grid.append(el('p','No off-scene inventory records. The model catalog and the railway stock are separate.','managementMuted'));
    for(const item of items){
      const m=projectModel(item.modelId),card=el('article',undefined,'managementModel depotItem');card.dataset.depotId=item.id;card.dataset.depotState=item.state;
      const image=el('img');image.src=m.image;image.alt=m.name;image.width=320;image.height=160;image.onerror=()=>{image.onerror=null;image.src=THUMBNAIL_FALLBACK;};
      card.append(image,el('strong',`${item.code} · ${m.name}`),el('small','Virtual off-scene inventory'),el('strong',item.state==='available'?'Available for planning':'Reserved for planning'));
      if(item.notice)card.append(el('p',item.notice,'managementMuted'));
      if(item.assignment){const target=slots.find(s=>s.projectId===item.assignment.projectId&&s.vehicleId===item.assignment.vehicleId);card.append(el('p',`${target.projectName} · vehicle ${target.position}`),button('Release reservation',`release-${item.id}`,()=>inventory.release(item.id)));}
      else {
        const targets=slots.filter(s=>s.modelId===item.modelId&&!items.some(v=>v.assignment?.projectId===s.projectId&&v.assignment.vehicleId===s.vehicleId));
        const assignment=el('label',`Reserve ${item.code} for`),pick=el('select');pick.setAttribute('aria-label',`Reserve ${item.code} for`);pick.dataset.depotAction=`target-${item.id}`;
        for(const target of targets){const o=el('option',`${target.projectName} · vehicle ${target.position}`);o.value=JSON.stringify([target.projectId,target.vehicleId]);pick.append(o);}
        if(!targets.length){const o=el('option','No matching unreserved vehicle in confirmed projects');o.value='';pick.append(o);}pick.disabled=!targets.length;
        if(targets.some(t=>JSON.stringify([t.projectId,t.vehicleId])===choices.get(item.id)))pick.value=choices.get(item.id);
        pick.onchange=()=>choices.set(item.id,pick.value);assignment.append(pick);card.append(assignment,button('Reserve for project',`assign-${item.id}`,()=>{const [p,v]=JSON.parse(pick.value);inventory.assign(item.id,p,v);choices.delete(item.id);},!targets.length));
      }
      card.append(button('Remove virtual item',`remove-${item.id}`,()=>{inventory.remove(item.id);choices.delete(item.id);},item.state==='reserved'));grid.append(card);
    }root.append(grid);
    const gate=el('section',undefined,'depotTransferGate');gate.append(el('h3','Physical transfers · unavailable'),el('p','R1 has no generic safe depot entry/exit command. Detached vehicles remain on the track. Use the existing consoles only for supported coupling and uncoupling.'),button('Place on layout · unavailable','enter',()=>{},true),button('Withdraw from layout · unavailable','exit',()=>{},true));root.append(gate);
    const plans=el('section',undefined,'depotPlans');plans.append(el('h3',`M2 confirmed planned vehicles (virtual) · ${slots.length}`));
    if(!slots.length)plans.append(el('p','Confirm an M2 project to reserve a matching inventory record.','managementMuted'));
    for(const s of slots){const row=el('p',`${s.projectName} · vehicle ${s.position} · ${projectModel(s.modelId).name} · virtual plan`);row.dataset.depotPlannedId=s.vehicleId;row.dataset.projectId=s.projectId;plans.append(row);}
    if(snapshot.draft){const draft=el('p',`Open draft: ${snapshot.draft.name} · ${snapshot.draft.vehicles.length} virtual vehicles. Reservations use only the confirmed version; cancelling edits keeps its reservations.`,'projectNotice');draft.dataset.depotDraft=snapshot.draft.id;plans.append(draft);}root.append(plans);
    const real=el('section',undefined,'depotRailway');real.append(el('h3',`Physical railway stock (read only) · ${physical.length}`),el('p','These are R1 objects on the layout, never off-scene inventory. Matching models do not imply matching identities.','managementMuted'));
    for(const v of physical){const row=el('p',`${v.name} · ${v.state==='on-train'?`Physical · engaged on ${v.trainName}`:`Physical · detached on track ${v.edge}`} · not depot stock`);row.dataset.depotPhysicalId=v.id;row.dataset.depotPhysicalState=v.state;row.dataset.generation=String(v.generation);real.append(row);}root.append(real);
    if(focus)[...root.querySelectorAll('[data-depot-action]')].find(e=>e.dataset.depotAction===focus)?.focus({preventScroll:true});
    if(scroll!==undefined)root.closest('dialog').scrollTop=scroll;
  }
  return {root,sync,dispose(){disposed=true;choices.clear();root.remove();}};
}
