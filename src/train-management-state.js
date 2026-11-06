import {consistLayout} from './consist.js';

// Read-only projections. The simulator remains the sole owner of railway state.
export function vehicleView(group) {
  const data=group.userData, spec=data.assetDimensions??data.stock;
  return {
    id:group.uuid,
    name:data.assetDimensions ? `Kenney · ${data.assetDimensions.type??data.stock?.kind??'locomotive'}` : data.stock?.name??data.stock?.kind??'Diesel locomotive',
    kind:data.assetDimensions?.type??data.stock?.kind??'diesel',
    length:spec?.length??((data.couplers?.front.x??38)-(data.couplers?.back.x??-38)),
    width:spec?.width,
    imported:Boolean(data.assetDimensions)
  };
}
export function compositionView(train) {
  const groups=[train.group,...train.carObjs], vehicles=groups.map(vehicleView);
  return {id:train.id,name:train.name,description:train.desc,reverse:train.dir<0,vehicles,
    length:consistLayout(groups.map(g=>g.userData)).tail+(train.group.userData.couplers?.front?.x??38)};
}
export function detachedView(item) {
  return {...vehicleView(item.group),edge:item.point.edge,direction:item.point.dir??null};
}
