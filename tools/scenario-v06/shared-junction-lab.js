// R2A-F1 deterministic diagnosis. All motion and commands use the R2A lab.
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createDynamicLab,SHORT_LOCO,SHORT_CAR} from './dynamic-lab.js';
import {NORMAL_STATES} from './dynamic-validation.js';

export function adjacentLab(vehicles=[SHORT_LOCO,SHORT_CAR]) {
  const lab=createDynamicLab({profile:'v06',states:{...NORMAL_STATES,'V06-C13':true}});
  lab.spawn({target:'C',vehicles});lab.setSpeed(0,60);return lab;
}

export function approachSample(lab) {
  const snapshot=lab.snapshot(),{preview,state}=lab.observe();
  const site=lab.session.switchTopology.byControl.get('V06-C13');
  const front=snapshot.vehicles[0].front;
  const range=site.protectedRanges.find(r=>r.edge===front.edge);
  return {...snapshot,clearance:range?front.s-range.max:null,
    preview:{stop:preview.stop,uncertain:preview.uncertain,distance:preview.distance,
      encounters:preview.encounters.map(e=>({id:e.site.id,node:e.node,distance:e.distance,
        incoming:e.incoming,outgoing:e.outgoing})),boundary:preview.ranges.at(-1)},
    occupied:state.occupied,safety:lab.session.getSafety('V06-C13'),
    wxSafety:lab.session.getSafety('WX-A')};
}

export function diagnoseSharedJunction() {
  const lab=adjacentLab(),samples=[];let first=null,end=null;
  try {
    for(let tick=1;tick<=920;tick++) {
      lab.tick();
      if(lab.train.guard.intervened&&!first)first=approachSample(lab);
      if(first&&!lab.train.velocity&&!end)end=approachSample(lab);
      if(tick>=795&&tick<=900)samples.push(approachSample(lab));
    }
  } finally {lab.stop(0);lab.dispose();}
  const probes=[];
  // Each request starts from a new session and reruns every physical tick.
  for(const tick of [815,830,835,836,837,840,844,850,889])for(const origin of ['panel','device']) {
    const isolated=adjacentLab();
    try {
      while(isolated.ticks<tick)isolated.tick();
      const before=approachSample(isolated),result=isolated.toggle('V06-C13',origin);
      probes.push({tick,origin,before,result,after:approachSample(isolated)});
    } finally {isolated.stop(0);isolated.dispose();}
  }
  return {baseline:'7bf4f1e04aef3ad0bc64ed8fb8fd82e3cbc43003',dt:1/60,
    runtimeAdmission:false,states:{...NORMAL_STATES,'V06-C13':true},first,end,samples,probes};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const output=resolve(process.argv[2]??'work/r2a-f1');mkdirSync(output,{recursive:true});
  const result=diagnoseSharedJunction();
  writeFileSync(resolve(output,'adjacent-diagnostic.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({firstTick:result.first?.tick,stopTick:result.end?.tick,
    inset:result.first?.guard.protectionInset,clearance:result.end?.clearance,
    stopSafety:result.end?.safety,probes:result.probes.map(p=>({tick:p.tick,origin:p.origin,
      velocity:p.before.velocity,front:p.before.vehicles[0].front.s,clearance:p.before.clearance,
      safety:p.before.safety.kind,changed:p.result.changed,reason:p.result.reason}))},null,2));
}
