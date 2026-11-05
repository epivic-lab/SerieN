import * as THREE from 'three';
import {captureState} from './capture.js';
import {stageState} from './hydrate.js';
import {createIdentities,assetKeys,catalog} from './identity.js';
import {assert} from './schema.js';
export function createLocalPersistence(host){
  const ids=createIdentities(),context={workspaceId:ids.uuid(),layoutId:ids.uuid()};
  let busy=false;
  const capture=()=>{assert(!busy,'restore in progress');return captureState(host.read(),ids,context);};
  async function hydrate(input){
    assert(!busy&&!host.read().pending,'restore/assets pending');
    const live=host.read(),previous={state:captureState(live,ids,context),trains:[...live.trains],detached:[...live.detached],groups:new Map([...live.trains.flatMap(t=>[t.group,...t.carObjs]),...live.detached.map(d=>d.group)].map(g=>[ids.id(g),g]))};
    busy=true;host.freeze();
    const parent=new THREE.Group(),verified=new Set();let staged;
    try {
      staged=await stageState(input,context,host.network,{
        validateView:host.validateView,
        async build(item,m,slot){
          const g=host.makeNative(item.nativeKind,slot,parent);
          try {
            const key=assetKeys[item.nativeKind];
            if(m.representation==='kenney'&&!verified.has(key)){
              const names={steam:'train-locomotive-a',diesel:'train-diesel-a',shunter:'train-diesel-box-a',lumber:'train-carriage-lumber',tank:'train-carriage-tank',box:'train-carriage-box'};
              const response=await fetch(new URL(`assets/kenney/${names[key]}.glb`,document.baseURI));assert(response.ok,'asset missing');
              const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await response.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('');
              assert(digest===catalog.assets[key],'asset checksum');verified.add(key);
            }
            const loaded=await host.trainAssetManager.attach(g,key,['steam','diesel','shunter'].includes(item.nativeKind),m.representation==='kenney');
            assert(loaded||m.representation==='native','asset unavailable');g.userData.persistenceAssetLoaded=loaded;return g;
          }catch(e){dispose(g);throw e;}
        },describe:g=>host.trainAssetManager.describe(g),dispose
      },ids);
      host.commit(staged,previous,()=>{
        host.trainAssetManager.commitOverrides(staged.state.ui.rollingModelMode==='kenney');
      });
      return {status:'READY_STOPPED',cloud:false};
    } catch(e){if(staged)for(const g of staged.groups.values())dispose(g);throw e;}
    finally {busy=false;host.thaw();}
  }
  function dispose(g){host.trainAssetManager.release(g);g.removeFromParent();g.traverse(o=>{if(o.isMesh)o.geometry.dispose();});}
  return Object.freeze({capture,hydrate,bindLocalContext(value){assert(!busy,'restore in progress');for(const k of ['workspaceId','layoutId'])assert(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value[k]),'local context UUID');Object.assign(context,{workspaceId:value.workspaceId,layoutId:value.layoutId});},get context(){return Object.freeze({...context});},get status(){return busy?'STAGING_ASSETS':'LOCAL_TEST';},cloudEnabled:false});
}
