import {couplingMatch} from './consist.js';
import {layoutFor} from './railway-state.js';

/** Commands mutate the existing fleet/vehicle identities, never DOM or missions.
 * @param {{trains:import('./railway-types.js').Train[],
 * detached:import('./railway-types.js').DetachedVehicle[],route:Function}} context */
export function createFleetCommands({trains,detached,route}) {
  function setSpeed(id,value) {
    const train=trains[id];if(!train)return;
    if(!Number.isFinite(value))throw new RangeError("Speed must be finite");
    train.speed=Math.max(0,Math.min(100,value));return train;
  }
  function reverse(id) {
    const train=trains[id];if(!train)return;
    train.dir*=-1;return train;
  }
  function stop(id) {
    const train=trains[id];if(!train)return;
    train.speed=train.velocity=0;return train;
  }
  function stopAll() {for(const train of trains)train.speed=train.velocity=0;}
  function toggleLights(id) {
    const train=trains[id];if(!train)return;
    train.lights=!train.lights;return train;
  }
  /** @returns {import('./railway-types.js').ConsistCommandResult} */
  function uncouple(id) {
    const train=trains[id];
    if(Math.abs(train.velocity)>.1||train.speed)return {changed:false,message:'Stop the train before uncoupling.'};
    if(!train.cars)return {changed:false};
    const coordinate=train.journey.position-layoutFor(train).offsets.at(-1);
    const point=train.journey.locate(coordinate),group=train.carObjs.pop();
    const journey=Object.create(Object.getPrototypeOf(train.journey));
    Object.assign(journey,train.journey,{segments:train.journey.segments.map(s=>({...s})),position:coordinate});
    detached.push({point,group,journey});train.cars=train.carObjs.length;
    return {changed:true,kind:'uncoupled',group,message:'Wagon uncoupled and left on the track.'};
  }
  /** @returns {import('./railway-types.js').ConsistCommandResult} */
  function couple(id) {
    const train=trains[id];
    if(train.speed||Math.abs(train.velocity)>.1)return {changed:false,message:'Stop the train before coupling.'};
    if(train.cars>=5)return {changed:false,message:'Maximum train length: five wagons.'};
    const index=detached.findIndex(vehicle=>{
      const candidate=layoutFor(train,[vehicle.group]);
      const expected=train.journey.locate(train.journey.position-candidate.offsets.at(-1));
      return couplingMatch(expected,vehicle.point);
    });
    if(index<0)return {changed:false,message:'No wagon near the rear of this train on the same track.'};
    const segments=[...train.journey.segments],lastBlock=train.journey.lastBlock;
    if(!train.journey.ensure(train.journey.position-layoutFor(train,[detached[index].group]).tail,route)){train.journey.segments.splice(0,train.journey.segments.length,...segments);
      if(lastBlock===undefined)delete train.journey.lastBlock;else train.journey.lastBlock=lastBlock;
      return {changed:false,message:'Not enough room.'};}
    const group=detached.splice(index,1)[0].group;
    train.carObjs.push(group);train.cars=train.carObjs.length;
    return {changed:true,kind:'coupled',group,message:'Wagon coupled.'};
  }
  return {setSpeed,reverse,stop,stopAll,toggleLights,uncouple,couple};
}
