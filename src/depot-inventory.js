import {projectModel,realComposition} from './train-projects.js';
import {vehicleView,detachedView} from './train-management-state.js';

export function projectSlots(projects){
  return projects.flatMap(p=>p.vehicles.map((v,i)=>({projectId:p.id,projectName:p.name,vehicleId:v.id,modelId:v.modelId,position:i+1})));
}
// Read-only projections. Physical groups never enter the virtual inventory store.
export function railwayInventoryView(trains,detached,generation){
  return [...trains.flatMap(t=>{
    const c=realComposition(t,generation);
    return [t.group,...t.carObjs].map((g,i)=>({...vehicleView(g),modelId:c.vehicles[i].modelId,category:'physical',state:'on-train',trainId:t.id,trainName:t.name,generation}));
  }),...detached.map(d=>{
    const v=detachedView(d);return {...v,modelId:`${v.imported?'kenney':'native'}-${v.kind}`,category:'physical',state:'detached-on-track',generation};
  })];
}
export function createDepotInventory({getProjects=()=>[],newId=()=>`depot:${crypto.randomUUID()}`}={}){
  const items=new Map();let serial=0,disposed=false;
  const copy=x=>structuredClone(x);
  function active(){if(disposed)throw new Error('Depot inventory disposed.');}
  function item(id){active();const value=items.get(id);if(!value)throw new RangeError('Unknown virtual depot item.');return value;}
  const slot=(projects,projectId,vehicleId)=>projectSlots(projects).find(s=>s.projectId===projectId&&s.vehicleId===vehicleId);
  return {
    get size(){return items.size;},
    get items(){return [...items.values()].map(v=>({...copy(v),category:'off-scene-virtual',state:v.assignment?'reserved':'available'}));},
    add(modelId){active();projectModel(modelId);const id=newId();if(typeof id!=='string'||!id.startsWith('depot:')||id.length<=6||items.has(id))throw new RangeError('Invalid or duplicate depot identity.');
      const value={id,code:`D${String(++serial).padStart(3,'0')}`,modelId,assignment:null,notice:null};items.set(id,value);return copy(value);},
    assign(id,projectId,vehicleId){const value=item(id);if(value.assignment)throw new RangeError('Release the existing virtual reservation first.');
      const target=slot(getProjects(),projectId,vehicleId);if(!target)throw new RangeError('Choose a vehicle in a confirmed M2 project.');
      if(target.modelId!==value.modelId)throw new RangeError('The project vehicle must use the same catalog model.');
      if([...items.values()].some(v=>v.assignment?.projectId===projectId&&v.assignment.vehicleId===vehicleId))throw new RangeError('This project vehicle is already reserved.');
      value.assignment={projectId,vehicleId};value.notice=null;return copy(value);},
    release(id){const value=item(id);if(!value.assignment)throw new RangeError('This virtual item has no reservation.');value.assignment=null;value.notice='Virtual planning reservation released.';},
    remove(id){const value=item(id);if(value.assignment)throw new RangeError('Release the virtual reservation before removing this inventory record.');items.delete(id);},
    reconcile(projects=getProjects()){active();const released=[];
      for(const value of items.values())if(value.assignment){const target=slot(projects,value.assignment.projectId,value.assignment.vehicleId);
        if(!target||target.modelId!==value.modelId){value.assignment=null;value.notice='Reservation released: the confirmed project vehicle was removed or changed.';released.push(value.id);}}
      return released;
    },
    dispose(){items.clear();disposed=true;}
  };
}
