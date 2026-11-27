// Isolated L02-E motion: no application train, command, or permission mutation.
import {Journey,routing} from '../../src/simulation.js';
import {createPoseSolver,routePolyline} from './pose.mjs';
import {axlePlay,drawbarPose,shift} from './kinematics.mjs';
export function couplingOffset(angle,along,height) {
  if(![angle,along,height].every(Number.isFinite))throw new RangeError('Invalid crank');
  return {along:along*(Math.cos(angle)-1)-height*Math.sin(angle),
    height:along*Math.sin(angle)+height*(Math.cos(angle)-1)};
}
export class MotionLab {
  constructor(profile,rig,edge) {
    if(!profile.network.edges[edge])throw new RangeError('Unknown edge');
    this.rig=rig;this.profile=profile;this.choose=routing(profile.network,()=>false);
    this.journey=new Journey(profile.network,edge,profile.network.edges[edge].length/2);
    this.speed=0;this.odometer=0;this.solve=createPoseSolver(rig);
    this.front=128;this.tail=132; // Conservative bound around the L02-D geometry.
    if(!this.journey.reconcile(this.tail,this.front,this.choose))throw new Error('No complete initial footprint');
  }
  command(speed) {
    if(!Number.isFinite(speed)||Math.abs(speed)>80)throw new RangeError('Invalid lab speed');
    this.speed=speed;
  }
  step(dt) {
    if(!Number.isFinite(dt)||dt<0||dt>.2)throw new RangeError('Invalid step');
    const delta=this.speed*dt;
    if(delta && !this.journey.move(delta,this.tail,this.choose,this.front)){this.speed=0;return false;}
    this.odometer+=delta;return true;
  }
  snapshot() {
    const s=this.journey.position,track=routePolyline(this.journey),frames=this.solve(track,s),slides={};
    for(const [name,axle] of Object.entries(this.rig.axles)) {
      const along=axle.sMm-this.rig.frames[axle.parent].pivotMm[0];
      slides[name]=axlePlay(track,s+axle.sMm-(axle.parent.startsWith('tender_')?this.rig.kinematics.tenderSetbackMm:0),frames[axle.parent],along,this.rig.kinematics.axlePlayMm[axle.parent]??0).slide;
    }
    const pin=(key,name)=>shift(frames[name],this.rig.drawbarPinsMm[key]-this.rig.frames[name].pivotMm[0]);
    const drawbar=drawbarPose(pin('engine','engine_rear'),pin('tender','tender_body'),this.rig.kinematics.drawbar);
    const occupation=this.journey.segments.filter(e=>e.end>=s-this.tail&&e.start<=s+this.front).map(e=>({id:e.id,lo:Math.max(e.start,s-this.tail),hi:Math.min(e.end,s+this.front)}));
    return {station:s,odometer:this.odometer,speed:this.speed,frames,slides,drawbar,occupation};
  }
}
