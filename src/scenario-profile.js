import {createNetwork,validateNetwork,loopPosition} from './network.js';
import {createTurnoutRegistry} from './turnout-registry.js';
import {Journey} from './simulation.js';
import {layoutFor,vehiclePositions} from './railway-state.js';
import {occupiedRanges,siteSafety} from './next-switch.js';
import {vehiclesConflict} from './railway-conflicts.js';

export const V06_DATASET_SHA256='4fd022e1173ef5517a7c826f4163dd10ab1ff776e1ecfaf144f53d40473ccef7';
export const selectScenario=search=>{
  const id=new URLSearchParams(search).get('scenario')??'legacy';
  if(!['legacy','v06'].includes(id))throw new RangeError('Unknown scenario');
  return id;
};
export async function verifiedBytes(url,expected,{fetcher=fetch,cryptoProvider=globalThis.crypto,signal}={}) {
  const response=await fetcher(url,{signal});
  if(!response.ok)throw new Error('Scenario file unavailable');
  const bytes=await response.arrayBuffer();
  if(expected.bytes!==undefined&&bytes.byteLength!==expected.bytes)throw new Error('Scenario file size mismatch');
  const digest=await cryptoProvider.subtle.digest('SHA-256',bytes);
  const hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  if(hash!==expected.sha256)throw new Error('Scenario file integrity mismatch');
  return bytes;
}
export function createScenarioProfile(id,dataset) {
  if(!['legacy','v06'].includes(id))throw new RangeError('Unknown scenario');
  if(id==='v06'&&(!dataset||dataset.layoutId!=='V06-R1A'||dataset.version!==1))throw new Error('Invalid V06 dataset');
  const network=id==='legacy'?createNetwork():createNetwork(dataset);
  validateNetwork(network);
  const registry=createTurnoutRegistry(network);
  return Object.freeze({id,network,registry,railTop:id==='v06'?8.4:5.95,
    // A new software simulation starts in known S0/N, not a reading of hardware.
    initialStates:Object.freeze(Object.fromEntries(registry.ids.map(id=>[id,false]))),
    sessionId:globalThis.crypto.randomUUID(),layoutId:id==='v06'?'V06-R1A':'legacy'});
}
export async function loadScenarioProfile(search,{baseURL,fetcher=fetch,signal}={}) {
  const id=selectScenario(search);
  if(id==='legacy')return createScenarioProfile(id);
  const bytes=await verifiedBytes(new URL('./assets/scenario-v06/dataset.json',baseURL),{sha256:V06_DATASET_SHA256},{fetcher,signal});
  return createScenarioProfile(id,JSON.parse(new TextDecoder().decode(bytes)));
}

/** Full-consist admission for a new browser session. No nearest-edge mapping,
 * invisible spawn, overlap, occupied turnout, or unselected cached history. */
export function findScenarioSpawn({network,switchTopology,trains,detached,route,train,lane=null}) {
  const other=trains.filter(t=>t!==train&&t.journey).flatMap(vehiclePositions)
    .concat(detached.map(d=>({...d.point,vehicle:d.group})));
  const lanes=lane===null?network.mainLoops.map(l=>l.lane):[lane];
  const original=train.journey;
  try {
    for(const candidateLane of lanes)for(let i=0;i<160;i++) {
      const position=loopPosition(network,candidateLane,(i+.5)/160);
      const journey=new Journey(network,position.edge,position.s);
      if(position.sign<0){journey.segments[0].sign=-1;journey.position=network.edges[position.edge].length-position.s;}
      const front=train.group.userData.couplers?.front?.x??48,tail=layoutFor(train).tail;
      if(!journey.ensure(journey.position-tail,route)||!journey.ensure(journey.position+front,route))continue;
      train.journey=journey;
      const vehicles=vehiclePositions(train);
      const occupied=vehicles.flatMap((v,j)=>occupiedRanges(network,journey,layoutFor(train).offsets[j],v.vehicle.userData.couplers));
      if(occupied.some(r=>network.edges[r.edge].hiddenIntervalsMm?.some(([a,b])=>r.max>=a&&r.min<=b)))continue;
      if(switchTopology.sites.some(site=>siteSafety(site,occupied,[]).blocked))continue;
      if(vehicles.some(p=>other.some(q=>vehiclesConflict(p,q)||Math.hypot(p.x-q.x,p.z-q.z)<90)))continue;
      return {edge:position.edge,s:position.s,sign:position.sign,loop:candidateLane};
    }
    return null;
  } finally {
    if(original===undefined)delete train.journey;else train.journey=original;
  }
}
