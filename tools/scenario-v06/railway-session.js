// R1C: Node-only, explicitly selected railway laboratory. Never import in app.js.
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {createNetwork,validateNetwork} from '../../src/network.js';
import {Journey,routing} from '../../src/simulation.js';
import {createTurnoutRegistry} from '../../src/turnout-registry.js';
import {createTurnoutModel} from '../../src/turnout-routes.js';
import {createTurnoutCommands} from '../../src/turnout-commands.js';
import {createSwitchTopology,siteSafety,traceJourney} from '../../src/next-switch.js';
import {collectRailwayState,layoutFor,vehiclePositions} from '../../src/railway-state.js';
import {vehiclesConflict} from '../../src/railway-conflicts.js';
import {assessRailwayGuard,MOTION} from '../../src/railway-guard.js';
import {validateArtifact,sha256} from './validate-r1a.js';
import {createLabSpawnPlan,checkLabSpawn,labVehicles} from './session-spawn-plan.js';

export function freezeData(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freezeData); Object.freeze(value);
  }
  return value;
}
function readonlyMap(map) {
  return Object.freeze({get:key=>map.get(key),has:key=>map.has(key),get size(){return map.size;},
    entries:()=>map.entries(),values:()=>map.values(),keys:()=>map.keys(),[Symbol.iterator]:()=>map[Symbol.iterator]()});
}
const sessions = new WeakSet();
const unknown = reason => ({blocked:true,kind:'unknown',message:reason});

export function createRailwaySession({profile,v06Bytes} = {}) {
  if (!['legacy','v06'].includes(profile)) throw new TypeError('Explicit legacy or v06 profile required');
  if (profile === 'legacy' && v06Bytes !== undefined) throw new TypeError('Mixed profile input');
  // Copy caller bytes before admission. No object injection, digest bypass or
  // silent fallback. Hash/schema/semantic admission happens BEFORE createNetwork.
  const bytes = profile === 'v06' ? (v06Bytes === undefined
    ? readFileSync(new URL('../../src/datasets/v06-r1a.json',import.meta.url)) : Buffer.from(v06Bytes))
    : readFileSync(new URL('../../src/canonical-layout.json',import.meta.url));
  const admission = profile === 'v06' ? validateArtifact(bytes) : {status:'LEGACY_LOCAL_CANONICAL'};
  const data = freezeData(JSON.parse(bytes));
  const network = createNetwork(data), validation = validateNetwork(network);
  const registry = createTurnoutRegistry(network), specs = registry.createSpecs();
  // No metadata/controller/point array is shared with another session or the
  // imported legacy canonical object. Topology never changes during a session.
  freezeData(network);
  const identity = freezeData({sessionId:randomUUID(),profile,profileId:registry.profileId,
    schema:data.schema??'legacy-canonical',version:data.version??data.sourceSha256,
    datasetSha256:sha256(bytes),networkVersion:`${registry.profileId}@${sha256(bytes)}`});
  const topology = createSwitchTopology(network,specs);
  topology.sites.forEach(freezeData);
  for (const members of topology.byNode.values()) freezeData(members);
  const switchTopology = Object.freeze({sites:Object.freeze(topology.sites),
    byNode:readonlyMap(topology.byNode),byControl:readonlyMap(topology.byControl)});
  const spawnPlan = freezeData(createLabSpawnPlan(network,switchTopology,identity));
  let live=true;
  const trains=[],detached=[],owned=new Map(),reservations=new Map(),cache=new Map(),listeners=new Map(),timers=new Set(),cleanups=new Set();
  let cleanupErrors=[];
  const assertLive=()=>{if(!live)throw new Error('Session disposed');};
  const known=()=>specs.every(s=>typeof s.on==='boolean');
  const owns=train=>owned.has(train) && train.journey===owned.get(train) && train.journey.network===network;
  const validFleet=()=>trains.every(owns) && detached.every(owns);
  const validMotion=()=>[...trains,...detached].every(t=>[-1,1].includes(t.dir) &&
    ['speed','requestedSpeed'].every(k=>Number.isFinite(t[k])&&t[k]>=0&&t[k]<=MOTION.maxSpeed) &&
    Number.isFinite(t.velocity)&&Math.abs(t.velocity)<=MOTION.maxSpeed*MOTION.speedScale);
  const stopped=()=>validFleet() && [...trains,...detached].every(t=>
    ['speed','velocity','requestedSpeed'].every(k=>Number.isFinite(t[k]) && t[k]===0));
  const assertStopped=()=>{assertLive();if(!stopped())throw new Error('Moving, unknown or foreign fleet: session replacement refused');};
  const rawRoute=routing(network,id=>specs.find(s=>s.id===id)?.on);
  // A readiness boundary around the existing router, not a second routing rule.
  // In particular null never reaches its historical Boolean(null) fallback.
  const route=Object.assign((...args)=>live&&known()&&validFleet()?rawRoute(...args):null,{
    controlState:id=>live?rawRoute.controlState(id):null,
    reason:(...args)=>!live?'session-disposed':!known()||!validFleet()?'unknown-control':rawRoute.reason(...args)});
  Object.freeze(route);
  let model=createTurnoutModel(network,registry);
  const context=()=>({network,switchTopology,switchSpecs:specs,trains,detached,route,tracePoints:false});
  function state() {
    assertLive();
    if (!validFleet()) throw new Error('Foreign Journey or fleet reference');
    return collectRailwayState(context());
  }
  function getSafety(id) {
    if (!live || !registry.has(id) || !known() || !validFleet() || !validMotion()) return unknown('Session safety unknown');
    // Always re-read actual bodies, approaches and reservations at the command.
    const {occupied,moving}=state();
    return siteSafety(switchTopology.byControl.get(id),[...occupied,...reservations.values()],moving);
  }
  const commands=createTurnoutCommands({registry,switchSpecs:specs,trains,route,getSafety});
  function emit(event,value) {
    for(const callback of [...listeners.get(event)??[]]) if(live) callback(value);
  }
  function createLabTrainFixture({id,edge,s,sign=1,vehicles} = {}) {
    assertStopped();
    if (!Number.isInteger(id)||id<0||[...trains,...detached].some(t=>t.id===id)||![-1,1].includes(sign)) throw new TypeError('Invalid lab train identity/direction');
    const groups=labVehicles(vehicles),journey=new Journey(network,edge,s);
    if(sign<0){journey.segments[0].sign=-1;journey.position=network.edges[edge].length-s;}
    const train={id,name:`R1C fixture ${id}`,journey,group:groups[0],carObjs:groups.slice(1),cars:groups.length-1,
      dir:1,speed:0,requestedSpeed:0,velocity:0,odometer:0};
    const {tail}=layoutFor(train),front=groups[0].userData.couplers.front.x;
    // Static negative-test fixtures may occupy a switch, but must fit wholly
    // inside their edge. This method is explicitly NOT an operational spawn.
    if(journey.position-tail<0 || journey.position+front>network.edges[edge].length) throw new RangeError('Lab fixture does not fit edge');
    owned.set(train,journey);trains.push(train);emit('fixture-added',id);
    return train;
  }
  function checkSpawn(request) {
    assertLive();
    if(!known()||!stopped())return {ok:false,reason:'session-not-ready',runtimeAdmission:false};
    if(request?.id!==undefined&&(!Number.isInteger(request.id)||request.id<0||request.id>=3))
      return {ok:false,reason:'unconfigured-train-slot',runtimeAdmission:false};
    const result=checkLabSpawn(spawnPlan,request);
    if(!result.ok)return result;
    const groups=labVehicles(request.vehicles),j=new Journey(network,result.edge,result.s);
    if(result.sign<0){j.segments[0].sign=-1;j.position=network.edges[result.edge].length-result.s;}
    const candidate={journey:j,group:groups[0],carObjs:groups.slice(1)};
    const occupied=state().occupied;
    const reserved=[...reservations.values()];
    if([...occupied,...reserved].some(r=>r.edge===result.edge&&r.min<=result.extent.max&&result.extent.min<=r.max))
      return {ok:false,reason:'occupied-or-reserved',runtimeAdmission:false};
    const others=[...trains,...detached].flatMap(vehiclePositions);
    if(vehiclePositions(candidate).some(a=>others.some(b=>vehiclesConflict(a,b))))
      return {ok:false,reason:'vehicle-envelope-conflict',runtimeAdmission:false};
    return result;
  }
  const session=Object.freeze({identity,network,registry,switchTopology,spawnPlan,
    admission:freezeData({...admission,...validation}),route,
    get switchSpecs(){return freezeData(specs.map(s=>({...s})));},
    get trains(){return Object.freeze([...trains]);},get detached(){return Object.freeze([...detached]);},
    get disposed(){return !live;},get cleanupErrors(){return Object.freeze([...cleanupErrors]);},
    readiness(){return freezeData({sessionId:identity.sessionId,live,statesKnown:live&&known(),
      labReady:live&&known()&&validFleet()&&validMotion(),runtimeAdmission:false,
      reasons:!live?['session-disposed']:!known()?['unknown-control']:!validFleet()?['foreign-fleet']:!validMotion()?['invalid-motion']:['dynamic-gate-not-authorized']});},
    configureLabStates(values){
      assertStopped();
      if(trains.length||detached.length||reservations.size)throw new Error('Initial lab configuration requires an empty session');
      if(!values||Object.keys(values).length!==registry.ids.length||!registry.ids.every(id=>Object.hasOwn(values,id)&&typeof values[id]==='boolean'))
        throw new TypeError('Complete known boolean controller configuration required');
      specs.forEach(s=>{s.on=values[s.id];});cache.clear();
    },
    readTurnout(id,options){assertLive();return model.read(id,specs.find(s=>s.id===id)?.on,{...options,choose:route});},
    getSafety,
    requestToggle(id,origin){
      if(!live)return {changed:false,reason:'session-disposed'};
      const result=commands.requestToggle(id,origin);
      if(result.changed){cache.clear();emit('switch-changed',result);}
      return result;
    },
    createLabTrainFixture,checkSpawn,
    parkLabFixture(train){
      assertStopped();if(!owns(train)||!trains.includes(train)||train.carObjs.length)throw new Error('Expected one owned stationary lab vehicle');
      trains.splice(trains.indexOf(train),1);train.point=train.journey.locate();detached.push(train);return train;
    },
    spawnLabFixture(request){
      const result=checkSpawn(request);
      if(!result.ok)return result;
      const train=createLabTrainFixture({id:request.id,edge:result.edge,s:result.s,sign:result.sign,vehicles:request.vehicles});
      return {...result,train};
    },
    preview(train,direction=1,distance=600){
      assertLive();if(!owns(train))throw new Error('Foreign Journey');
      return traceJourney(network,switchTopology,train.journey,direction,0,route,distance);
    },
    assessGuard(train,dt=1/60){
      assertLive();if(!owns(train))throw new Error('Foreign Journey');
      if(!known()||!validFleet())return {risk:'UNKNOWN',reason:'unknown-control',distance:0};
      if(!validMotion())return {risk:'UNKNOWN',reason:'invalid-motion',distance:0};
      return assessRailwayGuard(train,train.journey,route,dt,[...reservations.values()]);
    },
    occupancy(){return freezeData({sessionId:identity.sessionId,...state(),reservations:[...reservations.values()]});},
    reserve(owner,{edge,min,max} = {}){
      assertLive();if(!owns(owner))throw new Error('Foreign reservation owner');
      const e=Object.hasOwn(network.edges,edge)?network.edges[edge]:null;
      if(!e||![min,max].every(Number.isFinite)||min<0||max<min||max>e.length)throw new RangeError('Invalid reservation');
      const key=randomUUID();reservations.set(key,Object.freeze({edge,min,max,trainId:owner.id}));return key;
    },
    releaseReservation(key){assertLive();return reservations.delete(key);},
    // Only JSON diagnostic data can enter this cache, never live resources.
    cache:Object.freeze({set(key,value){assertLive();cache.set(key,freezeData(JSON.parse(JSON.stringify(value))));},
      get(key){assertLive();return cache.get(key);},get size(){return cache.size;}}),
    on(event,callback){
      assertLive();if(!['fixture-added','switch-changed'].includes(event)||typeof callback!=='function')throw new TypeError('Invalid session listener');
      const callbacks=listeners.get(event)??new Set();callbacks.add(callback);listeners.set(event,callbacks);
      return ()=>callbacks.delete(callback);
    },
    schedule(callback,delay){
      assertLive();if(typeof callback!=='function'||!Number.isFinite(delay)||delay<0||delay>2147483647)throw new TypeError('Invalid session timer');
      const timer=setTimeout(()=>{timers.delete(timer);if(live)callback();},delay);timers.add(timer);
      return ()=>{clearTimeout(timer);timers.delete(timer);};
    },
    trackCleanup(callback){assertLive();if(typeof callback!=='function')throw new TypeError('Invalid cleanup');cleanups.add(callback);return ()=>cleanups.delete(callback);},
    resources(){return {trains:trains.length,detached:detached.length,reservations:reservations.size,cache:cache.size,
      listeners:[...listeners.values()].reduce((n,s)=>n+s.size,0),timers:timers.size,cleanups:cleanups.size};},
    assertStopped,
    dispose(){
      if(!live)return;
      assertStopped();live=false; // Revoke callbacks and command entry points first.
      timers.forEach(clearTimeout);timers.clear();
      listeners.forEach(callbacks=>callbacks.clear());listeners.clear();cache.clear();reservations.clear();
      trains.length=0;detached.length=0;owned.clear();model=null;
      for(const cleanup of cleanups){try{cleanup();}catch(error){cleanupErrors.push(String(error.message??error));}}
      cleanups.clear();
    }
  });
  sessions.add(session);return session;
}

export function replaceRailwaySession(current,options) {
  if(!sessions.has(current))throw new TypeError('Not an R1C laboratory session');
  current.assertStopped();
  // Failed admission leaves the old context intact. Nothing is transferred.
  const next=createRailwaySession(options);
  current.dispose();return next;
}
