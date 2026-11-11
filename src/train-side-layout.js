import {consistLayout} from './consist.js';

// Shared geometry for real ribbon projections and independent planned vehicles.
function sideLayout(id,name,items,manifest,planned=false){
  if(!items.length)return {id,name,planned,vehicles:[],length:0,dimensionY:15,viewBox:[-3,0,100,33]};
  const data=items.map(v=>v.data),layout=consistLayout(data),front=data[0].couplers?.front?.x??38;
  const vehicles=items.map((v,i)=>{
    const d=v.data,asset=manifest[v.key],origin=front+layout.offsets[i],reversed=v.orientation===-1;
    return {id:v.id,key:v.key,offset:layout.offsets[i],origin,orientation:reversed?'model-reversed':'model-forward',asset,
      frontAnchor:origin-(d.couplers?.front?.x??32),rearAnchor:origin-(d.couplers?.back?.x??-32),
      x:asset?origin+(reversed?asset.bounds.minX:-asset.bounds.maxX):null,width:asset?asset.bounds.maxX-asset.bounds.minX:0};
  });
  const length=front+layout.tail,top=Math.max(0,...vehicles.map(v=>v.asset?.bounds.maxY??0))+3;
  const bottom=Math.min(0,...vehicles.map(v=>v.asset?.bounds.minY??0));
  for(const v of vehicles)if(v.asset){v.y=top-v.asset.bounds.maxY;v.height=v.asset.bounds.maxY-v.asset.bounds.minY;}
  const left=Math.min(0,...vehicles.filter(v=>v.asset).map(v=>v.x))-3;
  const right=Math.max(length,...vehicles.filter(v=>v.asset).map(v=>v.x+v.width))+3;
  return {id,name,planned,vehicles,length,dimensionY:top-bottom+5,viewBox:[left,0,right-left,top-bottom+18]};
}
// Flatten Journey, never world yaw. R1 has no per-vehicle reversal field.
export function compositionSideLayout(train,manifest) {
  const items=[train.group,...train.carObjs].map((g,i)=>({id:g.uuid,data:g.userData,orientation:1,
    key:g.userData.assetDimensions?`kenney-${g.userData.assetDimensions.type}`:`native-${i===0?train.modelKey:g.userData.stock?.kind}`}));
  return sideLayout(train.id,train.name,items,manifest);
}
export function projectSideLayout(project,manifest){
  const items=project.vehicles.map(v=>{
    const asset=manifest[v.modelId];if(!asset)throw new RangeError('Unknown project side model');
    if(![1,-1].includes(v.orientation))throw new RangeError('Invalid planned orientation');
    const couplers=v.orientation===1?asset.couplers:{front:{x:-asset.couplers.back.x},back:{x:-asset.couplers.front.x}};
    return {id:v.id,key:v.modelId,orientation:v.orientation,data:{stock:{},couplers}};
  });
  return sideLayout(project.id,project.name,items,manifest,true);
}
