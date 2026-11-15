import {Vector3} from 'three';
import {BR01_GEAR} from '../src/br01-drawbar.js';
import {bodyContact,meshContact,meshSet} from './br01-intersection.js';
export function drawbarMeasure(groups,checkContacts=true){
 const [engine,tender]=groups;
 const pins=groups.map(g=>g.getObjectByName('drawgear pivot').getWorldPosition(new Vector3()));
 const eyes=groups.map(g=>g.getObjectByName('drawgear eye').getWorldPosition(new Vector3()));
 const endpoints=groups.map((g,i)=>g.br01Gear.member.localToWorld(new Vector3(i?BR01_GEAR.tongue:BR01_GEAR.sleeve,0,0)));
 const distance=pins[0].distanceTo(pins[1]),slide=distance-(BR01_GEAR.pitch+BR01_GEAR.enginePin-BR01_GEAR.tenderPin);
 const overlap=BR01_GEAR.sleeve+BR01_GEAR.tongue-distance;
 const result={slide,pinDistance:distance,overlap,eyeErrors:eyes.map((v,i)=>v.distanceTo(pins[i])),
   axisError:Math.abs(endpoints[0].distanceTo(endpoints[1])-overlap),
   insideStops:overlap>=BR01_GEAR.minOverlap&&overlap<=BR01_GEAR.maxOverlap};
 if(!checkContacts)return result;
 result.bodyHit=bodyContact(groups);
 const members=groups.map(g=>meshSet(g.br01Gear.member,()=>true));
 const fixed=groups.flatMap(g=>meshSet(g,m=>m.parent!==g.br01Gear.member));
 result.plateHit=meshContact(members[0],members[1])||meshContact(members[0],fixed);
 result.carriageHit=meshContact(members[1],fixed);
 const moving=groups.flatMap(g=>meshSet(g,m=>/^(truck_|axle_)/.test(m.name)));
 const hardware=groups.flatMap(g=>meshSet(g,m=>m.userData.drawgear));
 result.runningGearHit=meshContact(hardware,moving);
 result.oppositeMountHit=meshContact(meshSet(engine,m=>m.userData.drawgear),meshSet(tender,m=>!m.userData.drawgear))
  ||meshContact(meshSet(tender,m=>m.userData.drawgear),meshSet(engine,m=>!m.userData.drawgear));
 return result;
}
