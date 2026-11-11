import manifest from '../assets/rolling-stock-sides/manifest.json' with {type:'json'};
import {STOCK} from './rolling-stock.js';

const locomotives=new Set(['steam','diesel','shunter']);
const importedNames={steam:'train-locomotive-a',diesel:'train-diesel-a',shunter:'train-diesel-box-a',lumber:'train-carriage-lumber',tank:'train-carriage-tank',box:'train-carriage-box'};
// One immutable catalog identity for each of M1's fourteen existing models.
export const PROJECT_CATALOG=Object.freeze(Object.entries(manifest).map(([id,asset])=>{
  const split=id.indexOf('-'),source=id.slice(0,split),kind=id.slice(split+1),spec=source==='native'?STOCK[kind]:null;
  return Object.freeze({id,kind,role:locomotives.has(kind)?'locomotive':'trailer',source:source==='native'?'SerieN':'Kenney CC0 · stylized',
    name:source==='native'?(spec?.name??(kind==='diesel'?'Diesel locomotive':kind)):importedNames[kind],
    length:spec?.length??asset.bounds.maxX-asset.bounds.minX,width:spec?.width,
    image:`./assets/${locomotives.has(kind)?'locomotive':'rolling-stock'}-thumbnails/${id}.png`,asset});
}));
const models=new Map(PROJECT_CATALOG.map(m=>[m.id,m]));
export function projectModel(id){const m=models.get(id);if(!m)throw new RangeError('Unknown catalog model');return m;}
export function realComposition(train,generation=0){
  if(!train)return null;
  return {trainId:train.id,generation,vehicles:[train.group,...train.carObjs].map((g,i)=>({id:g.uuid,
    modelId:g.userData.assetDimensions?`kenney-${g.userData.assetDimensions.type}`:`native-${i===0?train.modelKey:g.userData.stock?.kind}`}))};
}
export function validateProject(project){
  const errors=[];
  if(typeof project.name!=='string'||!project.name.trim()||project.name.length>80)errors.push('Enter a project name (1–80 characters).');
  if(!Array.isArray(project.vehicles)||project.vehicles.length<1||project.vehicles.length>6)return [...errors,'Choose one locomotive and up to five trailers.'];
  const ids=new Set();
  project.vehicles.forEach((v,i)=>{
    const m=models.get(v.modelId);
    if(!m||m.role!==(i===0?'locomotive':'trailer'))errors.push('Keep one locomotive first, followed by up to five trailers.');
    if(typeof v.id!=='string'||!v.id||ids.has(v.id))errors.push('Every planned vehicle needs its own identity.');ids.add(v.id);
    if(![1,-1].includes(v.orientation))errors.push('Invalid planned orientation.');
  });return errors;
}
// Read-only comparison: model equality never implies physical identity or permission.
export function compareProject(project,real,generation=0){
  if(!project.source)return {status:'unlinked',message:'Independent project: no physical train is linked.',differences:[]};
  if(!real||project.source.generation!==generation||real.trainId!==project.source.trainId)return {status:'stale',message:'Source reference invalidated. Copy the current train into a new project.',differences:[]};
  const source=project.source.vehicles,now=real.vehicles,planned=project.vehicles;
  const changed=JSON.stringify(source)!==JSON.stringify(now);
  const differences=[];
  for(let i=0;i<Math.max(now.length,planned.length);i++){
    const p=planned[i],r=now[i];
    if(!p)differences.push(`Position ${i+1}: real vehicle only.`);
    else if(!r)differences.push(`Position ${i+1}: planned vehicle only.`);
    else {
      if(p.modelId!==r.modelId)differences.push(`Position ${i+1}: different model.`);
      if(p.sourceVehicleId!==r.id)differences.push(`Position ${i+1}: different physical identity or order.`);
      if(p.orientation!==1)differences.push(`Position ${i+1}: planned reversal; R1 has no individual reversal command.`);
    }
  }
  return {status:changed?'changed':differences.length?'different':'matching',message:changed?'Real composition changed since the copy. Review the current comparison.':differences.length?'Project differs from the real composition.':'Project matches the current real composition.',differences};
}
export function railwayProjectCapabilities(train){
  if(!train)return {uncouple:'No current train.',couple:'No current train.',apply:'Whole-project application, arbitrary reorder and individual reversal are unsupported.'};
  const stopped=Number.isFinite(train.velocity)&&Math.abs(train.velocity)<=.1&&train.speed===0;
  return {uncouple:!stopped?'Stop the train before uncoupling.':train.carObjs.length?'Tail uncoupling supported by R1; the vehicle stays on the track.':'No trailer to uncouple.',
    couple:!stopped?'Stop the train before coupling.':train.carObjs.length>=5?'Maximum five trailers.':'R1 must verify a nearby rear vehicle, alignment, route history and space at execution.',
    apply:'Whole-project application, arbitrary reorder and individual reversal are unsupported.'};
}

// Session-only project store. No engine objects, storage, network or shared arrays.
export function createTrainProjects({newId=()=>crypto.randomUUID()}={}){
  const confirmed=new Map();let draft=null,original=null;
  const clone=x=>x===null?null:structuredClone(x);
  const content=p=>JSON.stringify(p);
  const requireDraft=()=>{if(!draft)throw new Error('Open a project first.');return draft;};
  function edit(action){const p=clone(requireDraft());action(p);const errors=p.vehicles.length?validateProject({...p,name:p.name.trim()||'Untitled'}):[];if(errors.length)throw new RangeError(errors[0]);draft=p;return clone(p);}
  return {
    get draft(){return clone(draft);},get projects(){return [...confirmed.values()].map(clone);},
    get dirty(){return draft!==null&&content(draft)!==content(original);},
    begin(name='Untitled project'){if(draft)throw new Error('Finish or cancel the open draft first.');draft={id:newId(),name,vehicles:[],source:null};original=null;return clone(draft);},
    copy(train,generation=0){if(draft)throw new Error('Finish or cancel the open draft first.');const source=realComposition(train,generation);if(!source)throw new RangeError('Source train unavailable.');
      const p={id:newId(),name:`${train.name} project`.slice(0,80),source,vehicles:source.vehicles.map(v=>({id:newId(),modelId:v.modelId,orientation:1,sourceVehicleId:v.id}))};
      const errors=validateProject(p);if(errors.length)throw new RangeError(errors[0]);draft=p;original=null;return clone(draft);},
    open(id){if(draft)throw new Error('Finish or cancel the open draft first.');if(!confirmed.has(id))throw new RangeError('Unknown project');draft=clone(confirmed.get(id));original=clone(draft);return clone(draft);},
    rename(name){if(typeof name!=='string'||name.length>80)throw new RangeError('Project name too long.');requireDraft().name=name;},
    add(modelId){const model=projectModel(modelId);return edit(p=>{if(model.role==='locomotive'){if(p.vehicles.length)throw new RangeError('Remove the existing composition before choosing another locomotive.');}
      else if(!p.vehicles.length)throw new RangeError('Choose a locomotive first.');p.vehicles.push({id:newId(),modelId,orientation:1});});},
    remove(id){return edit(p=>{const i=p.vehicles.findIndex(v=>v.id===id);if(i<0)throw new RangeError('Unknown planned vehicle');if(i===0&&p.vehicles.length>1)throw new RangeError('Remove trailers before removing the locomotive.');p.vehicles.splice(i,1);});},
    move(id,delta){return edit(p=>{const i=p.vehicles.findIndex(v=>v.id===id),target=i+delta;if(![-1,1].includes(delta)||i<1||target<1||target>=p.vehicles.length)throw new RangeError('Only trailers can move within the trailer order.');[p.vehicles[i],p.vehicles[target]]=[p.vehicles[target],p.vehicles[i]];});},
    flip(id){return edit(p=>{const v=p.vehicles.find(v=>v.id===id);if(!v)throw new RangeError('Unknown planned vehicle');v.orientation*=-1;});},
    confirm(){const p=requireDraft(),errors=validateProject(p);if(errors.length)throw new RangeError(errors[0]);p.name=p.name.trim();confirmed.set(p.id,clone(p));const saved=clone(p);draft=original=null;return saved;},
    cancel(){draft=original=null;}
  };
}
