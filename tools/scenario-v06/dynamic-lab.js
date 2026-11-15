// R2A experiment, Node only. No runtime admission and no application bootstrap API.
import {createRailwaySession} from './railway-session.js';
import {FixedClock} from '../../src/simulation.js';
import {stepRailway} from '../../src/railway-step.js';
import {createFleetCommands} from '../../src/fleet-commands.js';
import {layoutFor,vehiclePositions,collectRailwayState} from '../../src/railway-state.js';

export const SHORT_LOCO=Object.freeze({length:40,width:16,front:22,rear:22});
export const SHORT_CAR=Object.freeze({length:30,width:14,front:17,rear:17});
export const DT=1/60;

export function createDynamicLab({profile,states}={}) {
  const session=createRailwaySession({profile});
  if(states!==undefined)session.configureLabStates(states);
  const clock=new FixedClock(DT),events=[];
  let train=null,journey=null,commands=null,ticks=0;
  const context=()=>({network:session.network,switchTopology:session.switchTopology,
    trains:session.trains,detached:session.detached,route:session.route,tracePoints:false,
    reservations:session.occupancy().reservations});
  function ready(requireTrain=true) {
    const r=session.readiness();
    if(!r.labReady)throw new Error(`Experiment refused: ${r.reasons.join(',')}`);
    if(requireTrain&&(!train||session.trains.length!==1||session.trains[0]!==train||train.journey!==journey))
      throw new Error('Experiment requires its single owned Journey');
    // This gate never interprets runtimeAdmission:false as permission to the app.
    if(r.runtimeAdmission!==false)throw new Error('Unexpected runtime admission');
  }
  function owned(id) {ready();if(id!==0)throw new RangeError('Foreign train ID');}
  function snapshot() {
    ready();
    const layout=layoutFor(train),vehicles=vehiclePositions(train);
    const positions=vehicles.map((p,i)=>({edge:p.edge,s:p.s,x:p.x,z:p.z,angle:p.angle,
      offset:layout.offsets[i],stock:{...p.vehicle.userData.stock},
      front:journey.locate(journey.position-layout.offsets[i]+p.vehicle.userData.couplers.front.x),
      rear:journey.locate(journey.position-layout.offsets[i]+p.vehicle.userData.couplers.back.x)}));
    return {tick:ticks,seconds:ticks*DT,position:journey.position,travel:journey.travel,
      odometer:train.odometer,dir:train.dir,speed:train.speed,requestedSpeed:train.requestedSpeed,
      velocity:train.velocity,point:journey.locate(),vehicles:positions,layout,
      history:journey.segments.map(s=>({...s})),guard:train.guard?{...train.guard}:null,
      switches:Object.fromEntries(session.switchSpecs.map(s=>[s.id,s.on]))};
  }
  return Object.freeze({session,events,get ticks(){return ticks;},get train(){return train;},
    spawn({target,direction=1,vehicles=[SHORT_LOCO]}={}) {
      ready(false);
      if(train||session.trains.length||session.detached.length)throw new Error('Single-train experiment only');
      if(![-1,1].includes(direction))throw new RangeError('Invalid direction');
      const result=session.spawnLabFixture({id:0,target,scope:'laboratory',vehicles});
      if(!result.ok)throw new Error(`Spawn refused: ${result.reason}`);
      train=result.train;journey=train.journey;commands=createFleetCommands(context());
      if(direction<0)commands.reverse(0);
      return result;
    },
    setSpeed(id,value){owned(id);return commands.setSpeed(id,value);},
    stop(id){owned(id);return commands.stop(id);},
    reverse(id){owned(id);session.assertStopped();return commands.reverse(id);},
    toggle(id,origin='panel'){
      // All experimental switch actions use the protected R1C/R1B command.
      const before=session.getSafety(id),result=session.requestToggle(id,origin),after=session.getSafety(id);
      events.push({tick:ticks,type:'switch-command',id,before,result,after});return result;
    },
    tick(){
      ready(); // UNKNOWN must prevent even entry to FixedClock / stepRailway.
      clock.update(DT,dt=>{ready();stepRailway(context(),dt);ticks++;});
      return snapshot();
    },
    snapshot,
    observe(){ready();return {guard:session.assessGuard(train,DT),
      preview:session.preview(train,train.dir,12000),state:collectRailwayState(context())};},
    dispose(){session.dispose();}
  });
}
