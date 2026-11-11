import {createGuardModal} from './guard-modal.js';
// Only DOM navigation and a pending intent. Railway and selection authority stay in app.
export function mountDock({host,tabs,button,getTrains,getSelected,onSelect,getGeneration,onReset}){
  const guard=createGuardModal({title:'Reset railway?',cancelLabel:'Cancel',confirmLabel:'Reset railway',titleId:'u5ResetTitle',guardClass:'u5-guard'});
  const region=host.closest('.u5-dock');
  const nav=document.createElement('div');nav.className='u5-carousel-nav';
  nav.innerHTML='<button type="button" aria-label="Previous train">←</button><span>Train Dock · All locomotives</span><button type="button" aria-label="Next train">→</button>';
  host.before(nav);
  function move(delta){const ids=getTrains().map(t=>t.id),i=ids.indexOf(getSelected());if(ids.length)onSelect(ids[(i+delta+ids.length)%ids.length]);}
  const previous=()=>move(-1),next=()=>move(1);
  const keys=e=>{if(e.target!==host&&!e.target.closest?.('#tabs'))return;
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
    e.preventDefault();
    const ids=getTrains().map(t=>t.id);
    if(e.key==='Home'||e.key==='End'){if(ids.length)onSelect(ids[e.key==='Home'?0:ids.length-1]);}
    else move(e.key==='ArrowLeft'?-1:1);
  };
  const request=()=>{
    const generation=getGeneration(),context=getTrains().slice();
    guard.request({origin:button,message:'Reset locomotives, switches and missions? Projects and Depot stay in this session; physical references become STALE.',
      valid:()=>getGeneration()===generation&&context.length===getTrains().length&&context.every((t,i)=>t===getTrains()[i]),confirm:onReset});
  };
  nav.firstElementChild.addEventListener('click',previous);nav.lastElementChild.addEventListener('click',next);
  region.addEventListener('keydown',keys);button.addEventListener('click',request);
  tabs.setAttribute('aria-label','Select any locomotive');
  return {dispose(){guard.dispose();button.removeEventListener('click',request);region.removeEventListener('keydown',keys);nav.firstElementChild.removeEventListener('click',previous);nav.lastElementChild.removeEventListener('click',next);nav.remove();}};
}
