import {TURNOUT_IDS,isTurnoutId} from './turnout-routes.js';

/** Presentation only. Selected paths are owned by S1; direction is a separate
 * observation, never a clearance or a restriction on reverse travel. */
export function turnoutArrowView(model,id,on,approaches=[],choose=null) {
  if(!isTurnoutId(id))throw new RangeError('Unknown arrow control');
  if(!Array.isArray(approaches))throw new TypeError('Invalid approaches');
  const local=model.read(id,on),directions=new Map();let uncertain=local.unknown;
  for(const a of approaches) {
    if(!isTurnoutId(a.controlId)||!Number.isFinite(a.distance)||a.distance<0)throw new RangeError('Invalid arrow approach');
    if(a.controlId!==id)continue;
    const entry=model.read(id,on,{incomingEdge:a.incomingEdge,incomingEnd:a.incomingEnd,choose});
    if(entry.unknown){uncertain=true;continue;}
    if(entry.approach?.status!=='ROUTABLE')continue;
    const route=entry.approach,signs=directions.get(route.edge)??new Set();signs.add(route.sign);directions.set(route.edge,signs);
  }
  return {controlId:id,state:local.state,unknown:uncertain,meaning:'SELECTED_ROUTE_NOT_CLEARANCE',
    paths:uncertain?[]:local.activePaths.map(path=>{const signs=directions.get(path.edge);
      return {path,sign:signs?.size===1?[...signs][0]:0,directionSource:signs?.size===1?'JOURNEY':'BIDIRECTIONAL'};})};
}
export {TURNOUT_IDS};
