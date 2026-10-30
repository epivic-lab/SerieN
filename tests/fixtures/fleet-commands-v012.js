// Historical command oracle from 618f538:app.js; test-only, not runtime.
import {layoutFor} from '../../src/railway-state.js';
import {couplingMatch} from '../../src/consist.js';
export function baselineCommands({trains,detached,route}) {
 let selected=0,didDetach=false,didAttach=false;const messages=[];
 const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n)),log=m=>messages.push(m),ui=()=>{};
 const trainDeck={sync(){}},nextSwitchHUD={refresh(){}};
function uncouple() {
  const t = trains[selected];
  if (Math.abs(t.velocity) > 0.1 || t.speed) {
    log("Stop the train before uncoupling.");
    return;
  }
  if (!t.cars) return;
  const point = t.journey.locate(t.journey.position - layoutFor(t).offsets.at(-1)), group = t.carObjs.pop();
  detached.push({ point, group });
  t.cars = t.carObjs.length;
  didDetach = true;
  ui();
  log("Wagon uncoupled and left on the track.");
}
function couple() {
  const t = trains[selected];
  if (t.speed || Math.abs(t.velocity) > 0.1) {
    log("Stop the train before coupling.");
    return;
  }
  if (t.cars >= 5) {
    log("Maximum train length: five wagons.");
    return;
  }
  const tail = t.journey.locate(t.journey.position - layoutFor(t).offsets.at(-1));
  const i = detached.findIndex(d=>{
    const candidate=layoutFor(t,[d.group]);
    const expected=t.journey.locate(t.journey.position-candidate.offsets.at(-1));
    return couplingMatch(expected,d.point);
  });
  if (i < 0) {
    log("No wagon near the rear of this train on the same track.");
    return;
  }
  if (!t.journey.ensure(t.journey.position - layoutFor(t, [detached[i].group]).tail, route)) {
    log("Not enough room.");
    return;
  }
  t.carObjs.push(detached.splice(i, 1)[0].group);
  t.cars = t.carObjs.length;
  didAttach = true;
  ui();
  log("Wagon coupled.");
}
function setTrainSpeed(id,value) {
  const t=trains[id];if(!t)return;
  t.speed=clamp(value,0,100);trainDeck?.sync();
}
function reverseTrain(id) {
  const t=trains[id];if(!t)return;
  t.dir*=-1;log(t.name+" reversed direction");trainDeck?.sync();nextSwitchHUD?.refresh(true);
}
function stopTrain(id) {
  const t=trains[id];if(!t)return;
  t.speed=t.velocity=0;ui();log(t.name+" stopped");
}
function stopAllTrains() {
  for(const t of trains)t.speed=t.velocity=0;
  ui();log("STOP ALL · every train stopped");
}
function toggleTrainLights(id) {
  const t=trains[id];if(!t)return;
  t.lights=!t.lights;ui();
}
return {uncouple,couple,setTrainSpeed,reverseTrain,stopTrain,stopAllTrains,toggleTrainLights,messages,select(id){selected=id;}};
}
