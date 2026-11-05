import {Journey} from '../simulation.js';
import {layoutFor,vehiclePositions} from '../railway-state.js';
import {vehiclesConflict,envelopeGap} from '../railway-conflicts.js';
import {couplingDistance} from '../consist.js';
import {plainCopy,validateSchema,assert} from './schema.js';
import {catalog,modelId} from './identity.js';
import {location} from './capture.js';
const near=(a,b)=>Math.abs(a-b)<=1e-6;
export function hydrateJourney(data,network){
  assert(data.segments.length&&data.segments.length<=10000,'Journey segment limit');
  for(let i=0;i<data.segments.length;i++){
    const s=data.segments[i],e=network.edges[s.id];assert(e&&near(s.end-s.start,e.length),'Journey edge/length');
    if(i){const p=data.segments[i-1],prev=network.edges[p.id];assert(near(p.end,s.start)&&(p.sign===1?prev.to:prev.from)===(s.sign===1?e.from:e.to),'Journey adjacency');assert(!(prev.unit&&prev.unit===e.unit),'turnout internal reversal');}
  }
  assert(data.position>=data.segments[0].start&&data.position<=data.segments.at(-1).end,'Journey position');
  const j=Object.create(Journey.prototype);Object.assign(j,{network,segments:data.segments.map(s=>({...s})),position:data.position,travel:data.travel});
  if(data.lastBlock){j.lastBlock=structuredClone(data.lastBlock);for(const k of ['edge','node','boundary'])if(j.lastBlock[k]===null)delete j.lastBlock[k];}
  return j;
}
export function validateDocument(input,context,network){
  const s=validateSchema(plainCopy(input));
  assert(s.topologyHash===catalog.topologyHash,'topology incompatible');
  assert(s.workspaceId===context.workspaceId&&s.layoutId===context.layoutId,'workspace/layout mismatch');
  assert(s.inventoryStorage.length===0,'inventory requires 6D');
  const index=(values,label)=>{const m=new Map(values.map(v=>[v.id,v]));assert(m.size===values.length,`${label} duplicate ID`);return m;};
  const models=index(s.models,'model'),items=index(s.items,'item'),consists=index(s.consists,'consist'),trains=index(s.trains,'train'),used=new Set(),usedConsists=new Set();
  for(const m of s.models){assert(m.revision===catalog.revision,'catalog revision');if(m.asset)assert(m.asset.digest===(m.representation==='native'?catalog.revision:catalog.assets[m.runtimeKey])&&m.asset.revision===catalog.revision&&m.asset.id===m.id,'asset revision/digest');}
  for(const i of s.items){const m=models.get(i.modelId),n=models.get(i.nativeModelId);assert(i.orientation===1,'orientation requires 6D');assert(m&&n&&m.revision===i.modelRevision&&n.revision===i.nativeModelRevision&&n.representation==='native'&&n.runtimeKey===i.nativeKind&&n.id===modelId(i.nativeKind),'item model');assert(m.id===modelId(i.nativeKind,m.representation==='kenney'),'effective model identity');}
  const use=id=>{assert(items.has(id)&&!used.has(id),'item assignment');used.add(id);};
  const boundary=b=>{
    if(b===null)return;
    if(typeof b==='string'){assert(network.edges[b]||network.nodes[b],'boundary reference');return;}
    const edge=network.edges[b.edge];assert(edge&&b.from>=0&&b.to>=0&&b.from<=edge.length+1e-6&&b.to<=edge.length+1e-6,'boundary range');
  };
  const checkLocation=(record)=>{const j=hydrateJourney(record.journey,network),p=location(j);assert(p.edge===record.location.edge&&near(p.s,record.location.s)&&p.heading===record.location.heading,'location assertion');if(j.lastBlock){if(j.lastBlock.edge)assert(network.edges[j.lastBlock.edge],'lastBlock edge');if(j.lastBlock.node)assert(network.nodes[j.lastBlock.node],'lastBlock node');}return j;};
  const journeys=new Map();
  s.trains.forEach((t,i)=>{
    assert(t.runtimeSlot===i,'runtime slots');const c=consists.get(t.consistId);assert(c&&!usedConsists.has(c.id),'consist assignment');usedConsists.add(c.id);
    c.members.forEach((v,k)=>{use(v.itemId);assert(v.orientation===1&&models.get(items.get(v.itemId).modelId).kind===(k?'wagon':'locomotive'),'member kind/orientation');});
    assert(t.id===c.members[0].itemId,'train locomotive identity');assert(items.get(t.id).nativeKind===t.modelKey,'train modelKey');
    journeys.set(t.id,checkLocation(t));assert(t.routeContext.laps===Math.floor(t.journey.travel/network.mainLoops[t.routeContext.loop].length),'laps');
    if(t.routeContext.section!==null)assert(network.edges[t.routeContext.section],'section');
    const seed=t.resetSeed;assert(seed.fraction!==null?seed.edge===null&&seed.s===null:seed.edge!==null&&seed.s!==null&&network.edges[seed.edge]&&seed.s<=network.edges[seed.edge].length,'reset seed');
    if(t.guard){assert((t.guard.probeDelta===null)===(t.guard.probeKind===null)&&t.guard.probeDelta!==0,'probe');if(t.guard.distance===null)assert(t.guard.risk==='SAFE'&&t.guard.reason==='available','infinite guard distance');}
    if(t.guard)boundary(t.guard.boundary);if(t.journey.lastBlock)boundary(t.journey.lastBlock.boundary);
  });
  s.looseStock.forEach(d=>{use(d.itemId);assert(models.get(items.get(d.itemId).modelId).kind==='wagon','loose locomotive');journeys.set(d.itemId,checkLocation(d));if(d.journey.lastBlock)boundary(d.journey.lastBlock.boundary);});
  assert(used.size===items.size&&usedConsists.size===consists.size,'orphan record');
  const ui=s.ui;assert(trains.has(ui.selectedTrainId)&&ui.consoleSlots.includes(ui.selectedTrainId)&&ui.consoleSlots.length===Math.min(3,trains.size)&&ui.recentTrainIds.length===trains.size&&ui.recentTrainIds[0]===ui.selectedTrainId&&[...ui.consoleSlots,...ui.recentTrainIds].every(id=>trains.has(id)),'console/LRU references');
  return {state:s,models,items,consists,journeys};
}
// Staged trusted builders, before any live-state mutation; never ensure/reconcile.
export function validateStaging(trains,detached){
  function coverage(j,lo,hi){assert(j.position-lo>=j.segments[0].start-1e-6&&j.position+hi<=j.segments.at(-1).end+1e-6,'history does not cover body');}
  const bodies=trains.map(t=>{coverage(t.journey,layoutFor(t).tail,t.group.userData.couplers?.front?.x??48);return vehiclePositions(t);});
  for(const d of detached){coverage(d.journey,-(d.group.userData.couplers?.back?.x??-48),d.group.userData.couplers?.front?.x??48);bodies.push([{...d.point,vehicle:d.group}]);}
  function legalCouplerContact(p,q){
    const t=p.train,d=detached.find(d=>d.group===p.vehicle);
    if(t&&p.vehicle!==t.carObjs.at(-1)&&p.vehicle!==t.group)return false;
    if(t&&t.carObjs.length&&p.vehicle===t.group)return false;
    const j=t?.journey??d?.journey;if(!j)return false;
    const offset=t?layoutFor(t,[q.vehicle]).offsets.at(-1):couplingDistance(p.vehicle.userData,q.vehicle.userData);
    const at=j.position-offset;if(at<j.segments[0].start||at>j.segments.at(-1).end)return false;
    const expected=j.locate(at);return expected.edge===q.edge&&near(expected.s,q.s)&&Math.cos(expected.angle-q.angle)>1-1e-10;
  }
  bodies.forEach((a,i)=>bodies.slice(i+1).forEach(b=>a.forEach(p=>b.forEach(q=>assert(!vehiclesConflict(p,q)||envelopeGap(p,q)>=-1e-6||legalCouplerContact(p,q)||legalCouplerContact(q,p),'collision in restored fleet')))));
}
