import {consistLayout} from './consist.js';

// Flatten the existing Journey ribbon, never the world yaw on curved track.
// renderVehicles places every group's local +X along that ribbon. There is no
// independent per-vehicle reversal field in R1, so no invented flip is applied.
export function compositionSideLayout(train,manifest) {
  const groups=[train.group,...train.carObjs],data=groups.map(g=>g.userData),layout=consistLayout(data);
  const front=data[0].couplers?.front?.x??38;
  const vehicles=groups.map((group,i)=>{
    const d=group.userData,key=d.assetDimensions?`kenney-${d.assetDimensions.type}`:`native-${i===0?train.modelKey:d.stock?.kind}`;
    const asset=manifest[key],origin=front+layout.offsets[i];
    return {id:group.uuid,key,offset:layout.offsets[i],origin,orientation:'model-forward',asset,
      frontAnchor:origin-(d.couplers?.front?.x??32),rearAnchor:origin-(d.couplers?.back?.x??-32),
      x:asset?origin-asset.bounds.maxX:null,width:asset?asset.bounds.maxX-asset.bounds.minX:0};
  });
  const length=front+layout.tail,top=Math.max(0,...vehicles.map(v=>v.asset?.bounds.maxY??0))+3;
  const bottom=Math.min(0,...vehicles.map(v=>v.asset?.bounds.minY??0));
  for(const v of vehicles)if(v.asset){v.y=top-v.asset.bounds.maxY;v.height=v.asset.bounds.maxY-v.asset.bounds.minY;}
  const left=Math.min(0,...vehicles.filter(v=>v.asset).map(v=>v.x))-3;
  const right=Math.max(length,...vehicles.filter(v=>v.asset).map(v=>v.x+v.width))+3;
  return {id:train.id,name:train.name,vehicles,length,dimensionY:top-bottom+5,viewBox:[left,0,right-left,top-bottom+18]};
}
