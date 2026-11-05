import {manifest,nativeManifest,catalog} from './identity.js';
import {plainCopy,validateSchema,assert,STATE_SCHEMA} from './schema.js';
export function captureJourney(j){return {segments:j.segments.map(s=>({...s})),position:j.position,travel:j.travel,lastBlock:j.lastBlock?{edge:j.lastBlock.edge??null,node:j.lastBlock.node??null,reason:j.lastBlock.reason,boundary:j.lastBlock.boundary??null}:null};}
export function location(j){const p=j.locate(),seg=j.segments.find(s=>j.position>=s.start-1e-6&&j.position<=s.end+1e-6);return {edge:p.edge,s:p.s,heading:seg.sign};}
export function captureGuard(g){if(!g)return null;return Object.fromEntries(STATE_SCHEMA.$defs.guard.required.map(k=>[k,k==='distance'&&g[k]===Infinity?null:g[k]??null]));}
// Synchronous at an event/RAF boundary. Asset completion must have settled first.
export function captureState(runtime,ids,context){
  assert(!runtime.pending,'assets pending');
  const {trains,detached}=runtime,models=new Map(),items=[];
  const item=(g)=>{
    const kind=g.userData.persistenceKind;assert(kind,'unknown native builder');
    const desc=runtime.describe(g),m=manifest(g,kind,desc),native=nativeManifest(g,kind,desc);
    for(const x of [native,m]){if(models.has(x.id))assert(JSON.stringify(models.get(x.id))===JSON.stringify(x),'inconsistent catalog');models.set(x.id,x);}
    const value={id:ids.id(g),modelId:m.id,modelRevision:m.revision,nativeModelId:native.id,nativeModelRevision:native.revision,nativeKind:kind,displayName:g.userData.persistenceDisplayName??kind,orientation:1};items.push(value);return value.id;
  };
  const consists=trains.map(t=>({id:ids.id(t),name:t.persistenceName??t.name,members:[t.group,...t.carObjs].map(g=>({itemId:item(g),orientation:1}))}));
  const records=trains.map((t,i)=>({id:ids.id(t.group),runtimeSlot:i,consistId:consists[i].id,name:t.name,description:t.desc,nativeName:t.nativeName,nativeDescription:t.nativeDescription,modelKey:t.modelKey,
    journey:captureJourney(t.journey),location:location(t.journey),speed:t.speed,requestedSpeed:t.requestedSpeed,velocity:t.velocity,dir:t.dir,odometer:t.odometer,lights:t.lights,guard:captureGuard(t.guard),
    routeContext:{loop:t.loop,previousLane:t.previousLane,mode:t.mode,section:t.section??null,laps:t.laps},resetSeed:{loop:t.initial.loop,cars:t.initial.cars,fraction:t.initial.fraction??null,edge:t.initial.edge??null,s:t.initial.s??null}}));
  const looseStock=detached.map(d=>{assert(Number.isFinite(d.animationDistanceMm),'missing detached wheel phase');return {itemId:item(d.group),journey:captureJourney(d.journey),location:location(d.journey),animationDistanceMm:d.animationDistanceMm};});
  const result={schemaVersion:1,stateId:ids.uuid(),workspaceId:context.workspaceId,layoutId:context.layoutId,topologyHash:catalog.topologyHash,engineRevision:STATE_SCHEMA.properties.engineRevision.const,resumePolicy:'STOPPED',layout:{switches:{...runtime.switches}},time:{...runtime.time},models:[...models.values()].sort((a,b)=>a.id.localeCompare(b.id)),items,consists,trains:records,looseStock,inventoryStorage:[],missions:{...runtime.missions},ui:{...runtime.ui,selectedTrainId:records[runtime.ui.selectedTrainId].id,consoleSlots:runtime.ui.consoleSlots.map(i=>records[i].id),recentTrainIds:runtime.ui.recentTrainIds.map(i=>records[i].id)}};
  return validateSchema(plainCopy(result));
}
