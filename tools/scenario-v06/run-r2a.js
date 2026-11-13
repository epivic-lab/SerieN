// Reproducible numerical evidence. No browser, network calls or runtime activation.
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {SHORT_LOCO,SHORT_CAR} from './dynamic-lab.js';
import {runLoopScenario,runDynamics,runProtectedStop,runProtection} from './dynamic-validation.js';

if(process.argv.includes('--adjacent-stop')){
  const r=runProtectedStop(1);
  console.log(JSON.stringify({case:'R2A-ADJ-01',direction:r.direction,control:r.control,
    preview:r.preview,boundaryDistance:r.boundaryDistance,firstIntervention:r.firstIntervention,
    end:r.end,clearance:r.clearance,stopSafety:r.stopSafety,retreat:r.retreat,
    commands:r.commands,correction:r.correction},null,2));
}else{
  const output=resolve(process.argv[2]??'work/r2a-evidence');mkdirSync(output,{recursive:true});
  const loops=['A','B','C'].flatMap(name=>[1,-1].map(dir=>runLoopScenario(name,dir)));
  const consists=[1,-1].map(dir=>runLoopScenario('C',dir,[SHORT_LOCO,SHORT_CAR,SHORT_CAR]));
  const dynamics=runDynamics(),protectedStops=[1,-1].map(runProtectedStop),protection=runProtection();
  const save=(name,value)=>writeFileSync(resolve(output,name),JSON.stringify(value,null,2)+'\n');
  save('trajectories.json',{loops,consists,dynamics,protectedStops,protection});
  const compact=({name,direction,length,lap,braking,hidden,devices,maxPositionError,maxJumpExcess,
    maxAngleError,maxHistory,previewChecks,crossings,constantTicks,spawn,vehicles})=>({name,direction,vehicles,spawn,length,lap,
    braking,hidden,devices,maxPositionError,maxJumpExcess,maxAngleError,maxHistory,previewChecks,
    crossings:crossings.length,constantTicks});
  const summary={status:'PASS_NUMERICAL_R2A_WITH_ADJACENT_OPERATION_LIMIT',seed:'none: deterministic 1/60 ticks',
    baseline:'b49320c6be4d9f149bb2c5473858c616925a5f6c',runtimeAdmission:false,
    loops:loops.map(compact),consists:consists.map(compact),
    dynamics:dynamics.phases.map(p=>({phase:p.name,tick:p.tick,velocity:p.velocity,travel:p.travel,point:p.point})),
    protectedStops:protectedStops.map(r=>({direction:r.direction,control:r.control,preview:r.preview,
      firstInterventionTick:r.firstIntervention.tick,firstVelocity:r.firstIntervention.velocity,
      stopTick:r.end.tick,distance:r.end.travel,clearance:r.clearance,velocity:r.end.velocity,
      stopSafety:r.stopSafety,retreatSamples:r.retreat.length,correction:r.correction})),protection,
    limitation:{id:'R2A-ADJ-01',control:'V06-C13',safeRoutingStop:true,
      operationProtectionRemainsOccupied:true,automaticRecoveryCertified:false,
      nextSwitchAtSharedNodeRequiresReview:true},
    excluded:['N07 manoeuvre','N16 terminal admission','yard','fourth train','simultaneous trains',
      'dynamic coupling','browser V06','physical envelopes','R2B']};
  save('summary.json',summary);console.log(JSON.stringify(summary,null,2));
}
