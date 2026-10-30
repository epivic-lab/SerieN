import * as THREE from 'three';
import {isTurnoutId} from './turnout-routes.js';

/** Identification is read-only. Priority is keyboard, panel, then device.
 * S3 can observe the same identity; S2 creates no visible 3D overlay. */
export function createTurnoutFocus(onChange=()=>{}) {
  const sources={keyboard:null,panel:null,device:null};let id=null,source=null;
  const refresh=()=>{
    const next=Object.keys(sources).find(key=>sources[key]!==null)??null,nextId=next?sources[next]:null;
    if(nextId!==id||next!==source){id=nextId;source=next;onChange(id,source);}
  };
  return {set(key,value){
    if(!Object.hasOwn(sources,key)||value!==null&&!isTurnoutId(value))return false;
    sources[key]=value;refresh();return true;
  },clear(){for(const key of Object.keys(sources))sources[key]=null;refresh();},
  get active(){return id;},get source(){return source;}};
}

/** Track the entire gesture, not just its final displacement: out-and-back
 * drags, multitouch, cancellation and unmatched releases cannot actuate. */
export function createPointerIntent() {
  const pointers=new Map();
  const finite=e=>Number.isFinite(e.pointerId)&&Number.isFinite(e.clientX)&&Number.isFinite(e.clientY);
  const moved=(p,e)=>!finite(e)||Math.hypot(e.clientX-p.x,e.clientY-p.y)>p.threshold;
  return {
    down(e){
      if(!finite(e))return;
      if(pointers.has(e.pointerId))pointers.get(e.pointerId).valid=false;
      pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,threshold:e.pointerType==='touch'?10:7,
        valid:e.button===0&&e.isPrimary!==false&&['mouse','touch','pen'].includes(e.pointerType)&&pointers.size===0});
      if(pointers.size>1)for(const p of pointers.values())p.valid=false;
    },
    move(e){const p=pointers.get(e.pointerId);if(p&&(moved(p,e)||e.pointerType==='mouse'&&e.buttons===0))p.valid=false;},
    up(e){const p=pointers.get(e.pointerId);pointers.delete(e.pointerId);return !!p&&p.valid&&!moved(p,e)&&e.button===0;},
    cancel(id){pointers.delete(id);},clear(){pointers.clear();},
    get active(){return pointers.size>0;},get ids(){return pointers.keys();}
  };
}

/** Own and dispose all new listeners/RAF work. Raycasting is event-driven and
 * coalesced; no new work is inserted into the railway/render frame loop. */
export function mountTurnoutInteraction({canvas,camera,scene,controls,picker,panel,controlIds,requestToggle,selectTrain}) {
  const doc=canvas.ownerDocument,win=doc.defaultView,disposers=[],intent=createPointerIntent(),captured=new Set();
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),last={x:0,y:0};
  const cells=[...panel.querySelectorAll('.switchCell')];
  let inside=false,frame=null,disposed=false,keyboardMode=false;
  const originalCursor=canvas.style.cursor;
  const focus=createTurnoutFocus(id=>{
    cells.forEach((cell,i)=>cell.classList.toggle('is-identified',controlIds[i]===id));
    if(id===null)delete canvas.dataset.turnoutId;else canvas.dataset.turnoutId=id;
    picker.root.userData.activeControl=id;
  });
  const listen=(target,type,fn,options)=>{
    target.addEventListener(type,fn,options);
    const capture=typeof options==='boolean'?options:options?.capture??false;
    disposers.push(()=>target.removeEventListener(type,fn,{capture}));
  };
  function hitAt(x,y) {
    const r=canvas.getBoundingClientRect();
    if(![x,y].every(Number.isFinite)||!r.width||!r.height||x<r.left||x>=r.right||y<r.top||y>=r.bottom)return null;
    const top=doc.elementFromPoint(x,y);
    if(top!==canvas)return null; // HUD, toolbar and other UI own their pixels.
    pointer.set((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1);
    camera.updateMatrixWorld();raycaster.setFromCamera(pointer,camera);
    return picker.pick(raycaster,scene);
  }
  function updateHover() {
    frame=null;if(disposed||!inside||intent.active||doc.hidden)return;
    const hit=hitAt(last.x,last.y);
    focus.set('device',hit?.kind==='turnout'?hit.id:null);
    canvas.style.cursor=hit?'pointer':originalCursor;
  }
  const schedule=()=>{if(!disposed&&inside&&!intent.active&&frame===null)frame=win.requestAnimationFrame(updateHover);};
  function clear() {
    for(const id of intent.ids)if(canvas.hasPointerCapture?.(id))canvas.releasePointerCapture(id);
    intent.clear();captured.clear();inside=false;focus.clear();canvas.style.cursor=originalCursor;
    if(frame!==null){win.cancelAnimationFrame(frame);frame=null;}
  }
  listen(doc,'keydown',e=>{if(e.key==='Tab')keyboardMode=true;});
  listen(doc,'pointerdown',()=>{keyboardMode=false;focus.set('keyboard',null);},true);
  cells.forEach((cell,i)=>{
    const id=controlIds[i];
    listen(cell,'pointerenter',e=>{if(e.pointerType!=='touch'){
      keyboardMode=false;focus.set('keyboard',null);focus.set('panel',id);
    }});
    listen(cell,'pointerleave',()=>focus.set('panel',null));
    listen(cell,'focusin',e=>{if(keyboardMode||e.target.matches(':focus-visible'))focus.set('keyboard',id);});
    listen(cell,'focusout',e=>{if(!cell.contains(e.relatedTarget))focus.set('keyboard',null);});
  });
  listen(canvas,'pointerdown',e=>{
    intent.down(e);focus.set('device',null);
    if(intent.active)canvas.setPointerCapture?.(e.pointerId);
  });
  listen(canvas,'pointermove',e=>{
    intent.move(e);last.x=e.clientX;last.y=e.clientY;
    if(e.pointerType!=='touch'){keyboardMode=false;focus.set('keyboard',null);inside=true;schedule();}
  });
  listen(canvas,'pointerup',e=>{
    // A capture request may be released before gotpointercapture is ever
    // dispatched. Treat that cancelled pending capture as an aborted gesture.
    const held=typeof canvas.setPointerCapture!=='function'||captured.has(e.pointerId);
    const valid=intent.up(e)&&held,hit=valid?hitAt(e.clientX,e.clientY):null;
    captured.delete(e.pointerId);
    if(hit?.kind==='turnout')requestToggle(hit.id,'device');
    else if(hit?.kind==='train')selectTrain(hit.id);
    if(e.pointerType!=='touch'){last.x=e.clientX;last.y=e.clientY;schedule();}
  });
  listen(canvas,'gotpointercapture',e=>captured.add(e.pointerId));
  const cancel=e=>{intent.cancel(e.pointerId);captured.delete(e.pointerId);focus.set('device',null);};
  listen(canvas,'pointercancel',cancel);listen(canvas,'lostpointercapture',cancel);
  listen(canvas,'pointerleave',()=>{inside=false;focus.set('device',null);canvas.style.cursor=originalCursor;});
  listen(canvas,'wheel',()=>{intent.clear();focus.set('device',null);},{passive:true});
  listen(win,'blur',clear);listen(doc,'visibilitychange',()=>{if(doc.hidden)clear();});
  listen(controls,'change',schedule);
  return {get active(){return focus.active;},get source(){return focus.source;},clear,
    dispose(){if(disposed)return;disposed=true;clear();disposers.splice(0).reverse().forEach(dispose=>dispose());}
  };
}
