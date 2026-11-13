// Node-only R2B1. One R1C session, one clock and one original fleet transaction.
import assert from 'node:assert/strict';
import {createRailwaySession} from './railway-session.js';
import {FixedClock,Journey} from '../../src/simulation.js';
import {stepRailway} from '../../src/railway-step.js';
import {createFleetCommands} from '../../src/fleet-commands.js';
import {layoutFor,vehiclePositions} from '../../src/railway-state.js';
import {vehiclesConflict} from '../../src/railway-conflicts.js';
import {labVehicles} from './session-spawn-plan.js';
import {checkHistory,checkPose,rectangle,polygonDistance,bodyIntervals} from './two-train-oracle.js';
export const DT=1/60;
export const LOCO=Object.freeze({length:40,width:16,front:22,rear:22});
export const CAR=Object.freeze({length:30,width:14,front:17,rear:17});
export const NORMAL=Object.freeze({'V06-C07':false,'V06-C12':false,'V06-C13':false,'V06-N07':false,'V06-N14':false,'WX-A':false,'WX-B':false});
export function trainSnapshot(t){const layout=layoutFor(t);return {id:t.id,position:t.journey.position,travel:t.journey.travel,odometer:t.odometer,dir:t.dir,speed:t.speed,requestedSpeed:t.requestedSpeed,velocity:t.velocity,point:t.journey.locate(),history:t.journey.segments.map(h=>({...h})),layout,guard:t.guard?{...t.guard}:null,vehicles:vehiclePositions(t).map((p,i)=>{const d=p.vehicle.userData;return {edge:p.edge,s:p.s,x:p.x,z:p.z,angle:p.angle,offset:layout.offsets[i],dimensions:{...d.stock,front:d.couplers.front.x,rear:-d.couplers.back.x},front:t.journey.locate(t.journey.position-layout.offsets[i]+d.couplers.front.x),rear:t.journey.locate(t.journey.position-layout.offsets[i]+d.couplers.back.x)};})};}
export function createTwoTrainLab({states=NORMAL}={}){const session=createRailwaySession({profile:'v06'});if(states!==null)session.configureLabStates(states);const clock=new FixedClock(DT),owned=new Map(),events=[];let ticks=0,transactions=0;
 const context=()=>({network:session.network,switchTopology:session.switchTopology,trains:session.trains,detached:session.detached,route:session.route,tracePoints:false,reservations:session.occupancy().reservations});
 function ready(pair=false){const r=session.readiness();if(!r.labReady)throw new Error(`Lab refused: ${r.reasons}`);assert.equal(r.runtimeAdmission,false);assert.equal(session.trains.length,owned.size,'owned fleet only');for(const t of session.trains)assert.equal(t.journey,owned.get(t.id),'owned Journey only');if(pair)assert.equal(owned.size,2,'two trains in the same transaction');}
 const commands=()=>createFleetCommands(context());
 function idCheck(id){ready();assert.ok(owned.has(id),'owned ID');}
 const snapshot=()=>{ready();return {tick:ticks,seconds:ticks*DT,transactions,trains:session.trains.map(trainSnapshot),states:Object.fromEntries(session.switchSpecs.map(s=>[s.id,s.on])),safety:Object.fromEntries(session.registry.ids.map(id=>[id,session.getSafety(id)])),occupied:session.occupancy().occupied,reservations:session.occupancy().reservations,runtimeAdmission:false};};
 return Object.freeze({session,events,get ticks(){return ticks;},get transactions(){return transactions;},
  spawn({id,target,edge,s,sign=1,direction=1,vehicles=[LOCO]}={}){ready();session.assertStopped();assert.equal(id,owned.size,'distinct contiguous IDs required by original fleet commands');assert.ok(id<2,'two trains only');assert.ok([-1,1].includes(direction));
   if(target){const c=session.spawnPlan.loops.find(l=>l.id===target)?.candidate;assert.ok(c,'approved circuit candidate');({edge,s,sign}=c);}
   const groups=labVehicles(vehicles),j=new Journey(session.network,edge,s);if(sign<0){j.segments[0].sign=-1;j.position=session.network.edges[edge].length-s;}assert.ok([-1,1].includes(sign));const candidate={id,journey:j,group:groups[0],carObjs:groups.slice(1),dir:direction,speed:0,requestedSpeed:0,velocity:0,odometer:0};
   const dims=layoutFor(candidate),front=groups[0].userData.couplers.front.x;assert.ok(j.position-dims.tail>0&&j.position+front<session.network.edges[edge].length,'whole consist strictly inside initial edge');const states=Object.fromEntries(session.switchSpecs.map(s=>[s.id,s.on])),snap=trainSnapshot(candidate);checkHistory(snap.history);for(const v of snap.vehicles){checkPose(v,snap.history,j.position-v.offset,states);checkPose(v.front,snap.history,j.position-v.offset+v.dimensions.front,states);checkPose(v.rear,snap.history,j.position-v.offset-v.dimensions.rear,states);}
   const ranges=bodyIntervals(snap),reserved=session.occupancy().reservations;assert.ok(!ranges.some(r=>reserved.some(q=>q.edge===r.edge&&r.min<=q.max&&q.min<=r.max)),'initial reservation separation');
   for(const a of vehiclePositions(candidate))for(const t of session.trains)for(const b of vehiclePositions(t)){assert.equal(vehiclesConflict(a,b),false,'original envelope admission');const da=snap.vehicles.find(v=>v.edge===a.edge&&v.s===a.s).dimensions,db=b.vehicle.userData;assert.ok(polygonDistance(rectangle(a,da),rectangle(b,{front:db.couplers.front.x,rear:-db.couplers.back.x,width:db.stock.width}))>1e-7,'independent envelope admission');}
   const train=session.createLabTrainFixture({id,edge,s,sign,vehicles});owned.set(id,train.journey);if(direction<0)commands().reverse(id);events.push({tick:ticks,type:'admission',id,edge,s,sign,direction,vehicles,verified:true,runtimeAdmission:false});return train;
  },
  setSpeed(id,value){idCheck(id);commands().setSpeed(id,value);events.push({tick:ticks,type:'speed',id,value});},
  stop(id){idCheck(id);commands().stop(id);events.push({tick:ticks,type:'STOP',id});},
  reverse(id){idCheck(id);assert.equal(session.trains[id].velocity,0);assert.equal(session.trains[id].speed,0);commands().reverse(id);events.push({tick:ticks,type:'reverse',id});},
  toggle(id,origin='panel'){ready();const before=session.getSafety(id),result=session.requestToggle(id,origin);events.push({tick:ticks,type:'switch',id,origin,before,result});return result;},
  tick(){ready(true);clock.update(DT,dt=>{ready(true);const result=stepRailway(context(),dt);assert.equal(result.length,2);transactions++;ticks++;});return snapshot();},snapshot,
  dispose(){for(const t of session.trains)commands().stop(t.id);session.dispose();}
 });}
