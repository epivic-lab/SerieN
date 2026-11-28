import {readFileSync,writeFileSync} from 'node:fs';
import {createValveGear} from './valve-gear-view.mjs';
const read=p=>JSON.parse(readFileSync(p,'utf8')),base='docs/_active/rolling-stock/evidence/';
const rig=read(base+'L02-D/prototype/rig.json'),calibration=read(base+'L02-F/quartering-rig.json'),sweep=read(base+'L02-D/sweep.json');
const gear=createValveGear(rig,calibration);
const poses=[{id:'straight',...sweep.straight},...[315,282,249].flatMap(radius=>['left','right'].map(side=>({id:'R'+radius+'-'+side,...sweep.arcs.find(a=>a.radius===radius)[side]}))),...Object.entries(sweep.byScenario).map(([id,v])=>({id:id+'-hinge-max',...v.worst.hingeDegrees}))];
const step=Number(process.argv[3]??5);if(!Number.isFinite(step)||step<1||step>360)throw new RangeError('Invalid phase step');
const cases=[];let templates;
for(const pose of poses)for(let angle=0;angle<360;angle+=step){
 const odometer=angle*Math.PI/180*rig.axles.engine_rear_axle_01.heightMm;
 const state={frames:pose.framePoses,slides:pose.axleSlides,odometer};
 const summary=gear.update(state);const meshes=gear.exportMeshes();
 if(!templates)templates=Object.fromEntries(Object.entries(meshes).map(([k,m])=>[k,{positions:m.positions,indices:m.indices}]));
 cases.push({id:pose.id,angle,odometer,frames:pose.framePoses,slides:pose.axleSlides,summary,meshes:Object.fromEntries(Object.entries(meshes).map(([k,m])=>[k,{matrices:m.matrices,labels:m.labels}]))});
}
writeFileSync(process.argv[2]??'/tmp/bigboy-mechanism-poses.json',JSON.stringify({step,templates,cases}));
console.log({poses:poses.length,step,cases:cases.length});
