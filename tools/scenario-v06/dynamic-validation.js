import assert from 'node:assert/strict';
import {createDynamicLab,SHORT_LOCO,SHORT_CAR,DT} from './dynamic-lab.js';
import {circuitWitness} from './dynamic-oracle.js';

export const NORMAL_STATES=Object.freeze({'V06-C07':false,'V06-C12':false,'V06-C13':false,
  'V06-N07':false,'V06-N14':false,'WX-A':false,'WX-B':false});
const close=(a,b,tolerance=1e-7)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} != ${b}`);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const pose=p=>({edge:p.edge,s:p.s,x:p.x,z:p.z,angle:p.angle});

export function monitor(lab,name) {
  const witness=circuitWitness(name),initial=lab.snapshot();
  const origin=witness.coordinate(initial.point.edge,initial.point.s);
  const part=witness.segments.find(p=>p.id===initial.point.edge);
  const alignment=initial.history[0].sign/part.sign;
  let previous=initial,maxPositionError=0,maxJumpExcess=0,maxAngleError=0,maxHistory=1,previewChecks=0;
  const crossings=[],trajectory=[initial],hidden=new Set(),devices=new Set();
  function verify(current) {
    try {
      const coordinate=origin+alignment*current.odometer;
      close(current.travel-previous.travel,Math.abs(current.odometer-previous.odometer));
      close(current.position-initial.position,current.odometer);
      const joint=witness.crossings(origin+alignment*previous.odometer,coordinate);
      for(const row of joint)crossings.push({...row,tick:current.tick,travel:current.travel,velocity:current.velocity});
      if(current.point.edge!==previous.point.edge){
        assert.equal(joint.length,1,'one expected graph joint per tick');
        assert.equal(joint[0].from,previous.point.edge);assert.equal(joint[0].to,current.point.edge);
      } else assert.equal(joint.length,0,'no skipped edge');
      const check=(p,offset)=>{
        const expected=witness.point(coordinate-alignment*offset),error=distance(p,expected);
        maxPositionError=Math.max(maxPositionError,error);assert.ok(error<1e-7,'independent polyline pose');
        assert.equal(p.edge,expected.edge);close(p.s,expected.s);
      };
      current.vehicles.forEach((p,i)=>{
        check(p,p.offset);
        const couplers=[lab.train.group,...lab.train.carObjs][i].userData.couplers;
        check(p.front,p.offset-couplers.front.x);check(p.rear,p.offset-couplers.back.x);
        const angle=witness.point(coordinate-alignment*p.offset).tangent+(alignment<0?Math.PI:0);
        const angleError=Math.acos(Math.max(-1,Math.min(1,Math.cos(p.angle+angle))));
        maxAngleError=Math.max(maxAngleError,angleError);assert.ok(angleError<.06,'orientation follows polygonal tangent');
        const excess=distance(p,previous.vehicles[i])-Math.abs(current.odometer-previous.odometer);
        maxJumpExcess=Math.max(maxJumpExcess,excess);assert.ok(excess<1e-7,'no teleport');
        if(i)assert.ok(distance(p.front,current.vehicles[i-1].rear)<1e-7,'couplers meet on ribbon');
      });
      for(const h of current.history){
        const s=witness.segments.find(s=>s.id===h.id);assert.ok(s,'history stays on admitted loop');
        assert.equal(h.sign,alignment*s.sign,'no unintended orientation reversal');close(h.end-h.start,s.length);
      }
      for(let i=1;i<current.history.length;i++)close(current.history[i-1].end,current.history[i].start);
      maxHistory=Math.max(maxHistory,current.history.length);
      const edge=lab.session.network.edges[current.point.edge];
      if(edge.hiddenIntervalsMm?.some(([a,b])=>current.point.s>=a&&current.point.s<=b))hidden.add(edge.id);
      if(edge.switchId)devices.add(edge.switchId);
      if(current.tick%60===0||joint.length)trajectory.push(current);
      previous=current;return current;
    }catch(error){
      error.message+=`\nREPRO ${JSON.stringify({name,initial,previous,current})}`;throw error;
    }
  }
  function verifyPreview() {
    const s=lab.snapshot();
    if(witness.segments.find(p=>p.id===s.point.edge).unit)return;
    const before=JSON.stringify(lab.train.journey),observed=lab.observe().preview;
    const expected=witness.nextDevice(origin+alignment*s.odometer,alignment*s.dir);
    assert.equal(observed.next?.site.id,expected.id);close(observed.next.distance,expected.distance);
    assert.equal(observed.stop,'cycle');assert.equal(JSON.stringify(lab.train.journey),before);
    previewChecks++;
  }
  return {witness,initial,alignment,verify,verifyPreview,
    result:()=>({length:witness.length,origin,alignment,maxPositionError,maxJumpExcess,maxAngleError,
      maxHistory,previewChecks,hidden:[...hidden].sort(),devices:[...devices].sort(),crossings,trajectory})};
}

export function runLoopScenario(name,direction,vehicles=[SHORT_LOCO]) {
  const lab=createDynamicLab({profile:'v06',states:NORMAL_STATES});
  const spawn=lab.spawn({target:name,direction,vehicles}),m=monitor(lab,name);
  const publishedLengths={A:3468.164116,B:3260.781635,C:2933.790700};
  close(m.witness.length,publishedLengths[name],1e-6); // independent R01/R02 published measurements
  close(lab.session.spawnPlan.loops.find(l=>l.id===name).length,m.witness.length);
  const preview=lab.observe().preview;
  assert.equal(preview.stop,'cycle');assert.ok(preview.next,'Next Switch exists');
  assert.equal(lab.session.readiness().runtimeAdmission,false);
  lab.setSpeed(0,60);
  let previousVelocity=0,constantTicks=0;
  while(lab.train.journey.travel<m.witness.length){
    const s=m.verify(lab.tick());assert.ok(s.tick<10000,'bounded experiment');
    if(s.tick%60===0)m.verifyPreview();
    // Independent semi-implicit integration, constants copied from approved contract.
    const expected=direction*Math.min(90,Math.abs(previousVelocity)+45*DT);
    close(s.velocity,expected);assert.equal(s.guard.state,'SAFE');
    if(Math.abs(s.velocity)===90)constantTicks++;
    previousVelocity=s.velocity;
  }
  const end=lab.snapshot(),result=m.result(),residual=end.travel-result.length;
  assert.ok(residual>=0&&residual<1.5);assert.ok(distance(end.point,m.initial.point)<=residual+1e-7);
  assert.equal(result.crossings.length,m.witness.segments.length,'one complete closed sequence');
  assert.deepEqual(new Set(result.hidden),new Set(m.witness.segments.filter(s=>s.hidden.length).map(s=>s.id)));
  assert.ok(constantTicks>100);
  lab.setSpeed(0,0);const brakingStart=lab.snapshot();let brakingTicks=0;
  while(lab.train.velocity){const before=lab.train.velocity,s=m.verify(lab.tick());
    close(Math.abs(s.velocity),Math.max(0,Math.abs(before)-100*DT));assert.ok(++brakingTicks<100);}
  const stopped=lab.snapshot();for(let i=0;i<10;i++)m.verify(lab.tick());
  close(lab.snapshot().position,stopped.position);
  const report={name,direction,vehicles,spawn:{edge:spawn.edge,s:spawn.s,sign:spawn.sign,window:spawn.window,extent:spawn.extent},
    ...result,initial:pose(m.initial.point),lap:{tick:end.tick,distance:end.travel,odometer:end.odometer,
      velocity:end.velocity,position:pose(end.point),residual,returnError:distance(end.point,m.initial.point)},
    braking:{ticks:brakingTicks,startTick:brakingStart.tick,distance:stopped.travel-brakingStart.travel,
      velocity:stopped.velocity,stopTick:stopped.tick},constantTicks,runtimeAdmission:false};
  lab.stop(0);lab.dispose();return report;
}

export function runDynamics() {
  const lab=createDynamicLab({profile:'v06',states:NORMAL_STATES});lab.spawn({target:'C',vehicles:[SHORT_LOCO,SHORT_CAR]});
  const m=monitor(lab,'C'),phases=[];
  const run=n=>{for(let i=0;i<n;i++)m.verify(lab.tick());};
  lab.setSpeed(0,20);run(40);close(lab.train.velocity,30);phases.push({name:'accelerated',...lab.snapshot()});
  run(30);close(lab.train.velocity,30);
  lab.setSpeed(0,10);run(9);close(lab.train.velocity,15);phases.push({name:'decelerated',...lab.snapshot()});
  lab.stop(0);const stopped=lab.snapshot();run(10);close(lab.snapshot().position,stopped.position);phases.push({name:'STOP',...stopped});
  lab.reverse(0);lab.setSpeed(0,20);run(40);close(lab.train.velocity,-30);phases.push({name:'reverse-restart',...lab.snapshot()});
  lab.setSpeed(0,0);let ticks=0;while(lab.train.velocity){m.verify(lab.tick());assert.ok(++ticks<60);}
  phases.push({name:'controlled-stop',...lab.snapshot()});
  lab.stop(0);lab.reverse(0);lab.setSpeed(0,20);run(40);close(lab.train.velocity,30);
  phases.push({name:'forward-restart',...lab.snapshot()});lab.stop(0);
  const result={phases,...m.result()};lab.dispose();return result;
}

export function runProtectedStop(direction=1) {
  const lab=createDynamicLab({profile:'v06',states:NORMAL_STATES});
  lab.spawn({target:'C',direction,vehicles:[SHORT_LOCO,SHORT_CAR]});
  const control=direction>0?'V06-C13':'V06-C07';
  const m=monitor(lab,'C');assert.equal(lab.toggle(control).changed,true);
  const blocked=lab.observe().preview;assert.equal(blocked.stop,'misaligned');
  // Leading coupler's distance to the physical routing boundary, independent
  // of the guard's reported distance and additional 30mm protection inset.
  const extent=direction>0?22:lab.snapshot().layout.tail;
  const boundaryDistance=blocked.distance-extent;
  const stops=[];lab.setSpeed(0,60);let first=null;
  for(let n=0;n<10000;n++){
    const s=m.verify(lab.tick());
    assert.ok(s.travel<=boundaryDistance+1e-7,'never crosses rejected routing joint');
    if(s.guard.intervened&&!first)first=s;
    if(first&&(s.tick%5===0||!s.velocity))stops.push(s);
    if(first&&!s.velocity)break;
  }
  assert.ok(first,'guard must intervene');assert.equal(lab.train.velocity,0);
  assert.equal(lab.train.guard.reason,'misaligned');
  const end=lab.snapshot();for(let i=0;i<30;i++)m.verify(lab.tick());close(lab.snapshot().position,end.position);
  // Adjacent WX-A/C13 exposes an existing limitation: the guard can stop short
  // of the routing joint while still occupying C13's external 30mm operation
  // protection. Preserve that lock; correction is possible only after retreat.
  const stopSafety=lab.session.getSafety(control),retreat=[];
  if(stopSafety.blocked){
    assert.equal(stopSafety.kind,'occupied');assert.equal(lab.toggle(control).changed,false);
    lab.stop(0);lab.reverse(0);lab.setSpeed(0,20);
    let n=0;
    while(lab.session.getSafety(control).blocked){
      const s=m.verify(lab.tick());if(s.tick%10===0)retreat.push(s);assert.ok(++n<600,'bounded protected retreat');
    }
    lab.setSpeed(0,0);while(lab.train.velocity)m.verify(lab.tick());
    lab.stop(0);lab.reverse(0);
  }
  assert.equal(lab.session.getSafety(control).kind,'unlocked');
  const correction=lab.toggle(control,'device');assert.equal(correction.changed,true);
  assert.equal(lab.train.velocity,0); // correction does not start movement
  lab.setSpeed(0,20);for(let i=0;i<60;i++)m.verify(lab.tick());
  assert.ok(lab.train.velocity*direction>0);
  const report={direction,control,boundaryDistance,preview:{stop:blocked.stop,distance:blocked.distance,
    boundary:blocked.ranges.at(-1)},firstIntervention:first,stops,end,
    clearance:boundaryDistance-end.travel,stopSafety,retreat,correction,commands:lab.events,...m.result()};
  lab.stop(0);lab.dispose();return report;
}

export function runProtection() {
  const records=[];
  for(const name of ['C','A']){
    const lab=createDynamicLab({profile:'v06',states:NORMAL_STATES});lab.spawn({target:name});
    const before=Object.fromEntries(lab.session.switchSpecs.map(s=>[s.id,s.on]));
    const approached=new Set(),occupied=new Set();lab.setSpeed(0,60);
    const length=circuitWitness(name).length;
    while(lab.train.journey.travel<length){
      lab.tick();
      const preview=lab.observe().preview;
      for(const id of lab.session.registry.ids){
        const safety=lab.session.getSafety(id);
        const seen=safety.kind==='approaching'?approached:safety.kind==='occupied'?occupied:null;
        if(!seen||seen.has(id))continue;
        const snapshot=lab.snapshot(),result=lab.toggle(id,'panel');
        assert.equal(result.changed,false);assert.equal(result.reason,safety.kind);
        assert.deepEqual(Object.fromEntries(lab.session.switchSpecs.map(s=>[s.id,s.on])),before);
        assert.equal(lab.toggle(id,'device').changed,false,'consecutive surfaces re-read safety');
        seen.add(id);records.push({loop:name,control:id,kind:safety.kind,tick:lab.ticks,
          velocity:lab.train.velocity,point:snapshot.point,previewNext:preview.next?.site.id,result});
      }
    }
    lab.stop(0);lab.dispose();
  }
  const expected=['V06-C07','V06-C12','V06-C13','WX-A','WX-B'];
  for(const kind of ['approaching','occupied'])assert.deepEqual([...new Set(records.filter(r=>r.kind===kind).map(r=>r.control))].sort(),expected);
  return records;
}
