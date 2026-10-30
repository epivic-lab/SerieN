import {traceJourney} from './next-switch.js';
import {layoutFor} from './railway-state.js';

/** Read-only Journey observation, bounded to nearby moving trains. No route
 * reconstruction, history extension, occupation decision or command. */
export function turnoutArrowApproaches({network,topology,trains,choose,maxDistance=600}) {
  if(!Number.isFinite(maxDistance)||maxDistance<=0||maxDistance>2000)throw new RangeError('Invalid arrow lookahead');
  const result=[];
  for(const train of trains) {
    if(!Number.isFinite(train.velocity)||Math.abs(train.velocity)<=.1)continue;
    const direction=Math.sign(train.velocity),vehicles=[train.group,...train.carObjs],layout=layoutFor(train);
    const index=direction<0?vehicles.length-1:0,couplers=vehicles[index].userData.couplers;
    const extent=direction<0?-(couplers?.back?.x??-48):couplers?.front?.x??48;
    const preview=traceJourney(network,topology,train.journey,direction,layout.offsets[index],choose,maxDistance+extent,false);
    if(preview.uncertain)continue;
    for(const e of preview.encounters) {
      if(e.conflict||e.distance<extent||e.distance-extent>maxDistance||e.site.internal.includes(e.incoming))continue;
      const edge=network.edges[e.incoming];
      result.push({controlId:e.site.id,incomingEdge:edge.id,incomingEnd:edge.to===e.node?1:0,distance:e.distance-extent});
    }
  }
  return result;
}
