import catalog from './catalog.json' with {type:'json'};
export {catalog};
const kinds=['steam','diesel','shunter','closed','open','tank','flat','coach'];
export const assetKeys={steam:'steam',diesel:'diesel',shunter:'shunter',closed:'box',open:'lumber',tank:'tank',flat:'lumber',coach:'box'};
export function modelId(kind,imported=false){return `00000000-0000-4000-8000-${String(kinds.indexOf(kind)+1+(imported?100:0)).padStart(12,'0')}`;}
export function manifest(group,kind,description){
  const imported=Boolean(group.userData.assetDimensions),explicit=Boolean(imported||group.userData.stock);
  return {id:modelId(kind,imported),revision:catalog.revision,runtimeKey:imported?assetKeys[kind]:kind,kind:['steam','diesel','shunter'].includes(kind)?'locomotive':'wagon',representation:imported?'kenney':'native',
    asset:imported?{id:modelId(kind,true),revision:catalog.revision,digest:catalog.assets[assetKeys[kind]]}:{id:modelId(kind),revision:catalog.revision,digest:catalog.revision},
    couplers:structuredClone(description?.couplers??group.userData.couplers??null),couplingMode:explicit?'explicit':'legacy64',legacyRearExtentMm:explicit?0:38};
}
export function nativeManifest(group,kind,description){return {...manifest(group,kind,description),id:modelId(kind),runtimeKey:kind,representation:'native',asset:{id:modelId(kind),revision:catalog.revision,digest:catalog.revision},couplers:structuredClone(description?.nativeCouplers??group.userData.couplers??null),couplingMode:group.userData.stock?'explicit':'legacy64',legacyRearExtentMm:group.userData.stock?0:38};}
export function createIdentities(uuid=()=>crypto.randomUUID()){
  const ids=new WeakMap();
  return {uuid,id(o){if(!ids.has(o))ids.set(o,uuid());return ids.get(o);},bind(o,id){ids.set(o,id);}};
}
