import {validateDocument,validateStaging} from './validate.js';
import {manifest,nativeManifest} from './identity.js';
import {assert,canonical} from './schema.js';
export async function stageState(input,context,network,builders,ids){
  const v=validateDocument(input,context,network),s=v.state,groups=new Map();
  try {
    builders.validateView?.(s.ui.camera);
    for(const item of s.items){
      const m=v.models.get(item.modelId),g=await builders.build(item,m,s.trains.find(t=>t.id===item.id)?.runtimeSlot??0);groups.set(item.id,g);
      const desc=builders.describe(g);
      assert(canonical(manifest(g,item.nativeKind,desc))===canonical(m),'effective geometry/catalog mismatch');
      assert(canonical(nativeManifest(g,item.nativeKind,desc))===canonical(v.models.get(item.nativeModelId)),'native geometry/catalog mismatch');
      g.userData.persistenceDisplayName=item.displayName;ids.bind(g,item.id);
    }
    const trains=s.trains.map(t=>{
      const c=v.consists.get(t.consistId),members=c.members.map(m=>groups.get(m.itemId));
      const guard=t.guard===null?undefined:{...t.guard,distance:t.guard.distance===null?Infinity:t.guard.distance};
      if(guard)for(const k of ['leadingExtent','protectionInset','probeDelta','probeKind'])if(guard[k]===null)delete guard[k];
      const initial={loop:t.resetSeed.loop,cars:t.resetSeed.cars};for(const k of ['fraction','edge','s'])if(t.resetSeed[k]!==null)initial[k]=t.resetSeed[k];
      const result={id:t.runtimeSlot,name:t.name,desc:t.description,nativeName:t.nativeName,nativeDescription:t.nativeDescription,modelKey:t.modelKey,group:members[0],carObjs:members.slice(1),cars:members.length-1,assetLoaded:members[0].userData.persistenceAssetLoaded??Boolean(members[0].userData.assetDimensions),journey:v.journeys.get(t.id),speed:t.speed,requestedSpeed:t.requestedSpeed,velocity:t.velocity,dir:t.dir,odometer:t.odometer,lights:t.lights,guard,persistenceName:c.name,...t.routeContext,initial};
      if(result.section===null)delete result.section;ids.bind(result,c.id);return result;
    });
    const detached=s.looseStock.map(d=>({group:groups.get(d.itemId),journey:v.journeys.get(d.itemId),point:v.journeys.get(d.itemId).locate(),animationDistanceMm:d.animationDistanceMm}));
    validateStaging(trains,detached);
    return {state:s,trains,detached,groups};
  } catch(error){for(const g of groups.values())builders.dispose(g);throw error;}
}
