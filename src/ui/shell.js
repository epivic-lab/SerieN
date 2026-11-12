import {createUiSound} from './sfx.js';
import {createGuardModal} from './guard-modal.js';
export function mountShell({management,isPaused}){
 const $=id=>document.getElementById(id),disposers=[];let disposed=false,authorized=false,signingOut=false;
 const on=(e,type,fn,opts)=>{e.addEventListener(type,fn,opts);disposers.push(()=>e.removeEventListener(type,fn,opts));};
 const el=(tag,cls,text)=>{const e=document.createElement(tag);e.className=cls;if(text)e.textContent=text;return e;};
 const header=document.querySelector('.top');header.classList.add('u2-region','m','hd');document.querySelector('.app').classList.add('u2-frame','u2-region','st');
 const old=[...header.childNodes];old.forEach(n=>n.remove());const inner=el('div','mi'),plaque=el('div','plq');plaque.append(el('i','rvp l'),el('b','inl','SERIE N'),el('i','rvp r'));
 // U9-HDR: original frozen Claude .edp markup; decorative assets have no actions/name.
 const edition=el('div','edp');edition.innerHTML='<i class="scr l" aria-hidden="true"></i><i class="scr r" aria-hidden="true"></i><svg class="lf" aria-hidden="true" focusable="false"><use href="./ui/assets/svg/serien-sprite.svg#emb-maple"/></svg>';edition.append(el('span','','Autumn Railways'));
 const controls=el('nav','hc');controls.setAttribute('aria-label','Application controls');
 inner.append(plaque,edition,el('span','sp'),controls);header.append(inner);
 const tm=$('trainManagement');tm.className='bt d';tm.dataset.ctrl='CTRL-027';
 const button=(text,fn,ctrl)=>{const b=el('button','bt d',text);b.type='button';if(ctrl)b.dataset.ctrl=ctrl;on(b,'click',fn);return b;};
 const lamp=el('span','u2-running');controls.append(lamp);
 for(const id of ['homeView','planBtn','helpBtn']){const b=old.flatMap(n=>n.querySelectorAll?[...n.querySelectorAll('button')]:[]).find(n=>n.id===id);b.className='bt d';b.dataset.ctrl=id==='planBtn'?'CTRL-005':id==='helpBtn'?'CTRL-006':'CTRL-004';if(id==='homeView')b.classList.add('sr-only');controls.append(b);}
 const menu=document.createElement('dialog');menu.id='dlg';menu.className='u2-region u2-menu';menu.setAttribute('aria-labelledby','u2MenuTitle');menu.innerHTML='<div class="m"><div class="mi"><h2 id="u2MenuTitle">Menu</h2><div class="u2-settings"></div><p>Session only · projects and Depot are lost on reload.</p><div class="u2-actions"></div></div></div>';document.body.append(menu);
 let menuOrigin;const openMenu=origin=>{menuOrigin=origin;menu.showModal();menu.querySelector('select')?.focus();};const menuButton=button('Menu',()=>openMenu(menuButton));controls.append(menuButton);
 const settings=menu.querySelector('.u2-settings');
 // Keep the original select objects/IDs and change handlers. No optimistic state.
 for(const [id,title,ctrl] of [['quality','Graphics quality','CTRL-003'],['rollingModels','Models on the layout','CTRL-014']]){
  const select=id==='quality'?old.flatMap(n=>n.querySelectorAll?[...n.querySelectorAll('select')]:[]).find(n=>n.id===id):$(id);const label=el('label','u2-setting',title);select.dataset.ctrl=ctrl;label.append(select);settings.append(label);
 }
 tm.textContent='Train Management';settings.append(tm);
 settings.append(el('p','u2-note','Guarded-stop bell is controlled by the existing Bell control on the layout. UI sound does not mute the railway warning bell.'));
 const logout=old.flatMap(n=>n.querySelectorAll?[...n.querySelectorAll('button')]:[]).find(n=>n.id==='signOut');logout.textContent='Sign out';logout.className='bt d';logout.dataset.ctrl='CTRL-002';menu.querySelector('.u2-actions').append(logout);
 const exit=button('Exit to title · not available',()=>{});exit.disabled=true;exit.setAttribute('aria-describedby','u2ExitReason');menu.querySelector('.u2-actions').append(exit);const why=el('p','u2-note','A title screen is not available.');why.id='u2ExitReason';menu.querySelector('.mi').append(why);
 on(menu,'keydown',e=>{if(e.key==='Escape')e.stopPropagation();});
 const closeMenu=button('Close',()=>menu.close());menu.querySelector('.u2-actions').append(closeMenu);on(menu,'close',()=>{if(!disposed&&!signingOut)(menuOrigin||menuButton).focus();});on(menu,'click',e=>{if(e.target===menu)menu.close();});
 const guard=createGuardModal();const sound=createUiSound();const soundButton=button('Sound: Off',()=>{sound.toggle();soundButton.textContent=sound.enabled?'Sound: On':'Sound: Off';soundButton.setAttribute('aria-pressed',String(sound.enabled));});soundButton.setAttribute('aria-label','UI sound, independent from railway warning bell');soundButton.setAttribute('aria-pressed','false');controls.append(soundButton);on(header,'click',e=>{if(e.isTrusted&&e.target.closest('button'))sound.play();});on(menu,'click',e=>{if(e.isTrusted&&e.target.closest('button'))sound.play();});
 on(logout,'click',e=>{
  if(authorized){authorized=false;return;}
  e.preventDefault();e.stopImmediatePropagation();if(disposed||signingOut||guard.active)return;
  const summary=management.sessionSummary;
  const perform=()=>{if(disposed||signingOut)return;signingOut=true;authorized=true;logout.click();};
  if(!summary.hasSessionData){perform();return;}
  const fingerprint=JSON.stringify(summary);
  const parts=[summary.dirty?'an unconfirmed draft':null,summary.projects?`${summary.projects} confirmed project(s)`:null,summary.depot?`${summary.depot} Depot record(s)`:null].filter(Boolean);
  guard.request({origin:logout,message:`Signing out loses ${parts.join(', ')} from this session.`,valid:()=>!disposed&&fingerprint===JSON.stringify(management.sessionSummary),confirm:perform});
 },true);
 // Restyle real legacy Help/Plan nodes; original generation and handlers remain.
 for(const id of ['helpModal','planModal']){
  const modal=$(id);modal.classList.add('u2-region','u2-modal');modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');const title=modal.querySelector('h2');title.id=id+'Title';modal.setAttribute('aria-labelledby',title.id);const panel=modal.querySelector('.dialog');panel.id=id==='helpModal'?'hlD':'tpD';panel.classList.add('m');const content=el('div','mi');while(panel.firstChild)content.append(panel.firstChild);panel.append(content);modal.querySelectorAll('button').forEach(b=>b.classList.add('bt','d'));
  let origin=null;const observer=new MutationObserver(()=>{if(!modal.hidden){origin=document.activeElement;modal.querySelector('button')?.focus();}else if(origin?.isConnected)origin.focus();});observer.observe(modal,{attributes:true,attributeFilter:['hidden']});disposers.push(()=>observer.disconnect());
  on(modal,'keydown',e=>{if(e.key==='Tab')trap(e,modal);});
 }
 function trap(e,root){const nodes=[...root.querySelectorAll('button,a,select,input')].filter(n=>!n.disabled&&!n.hidden&&n.getClientRects().length);if(!nodes.length)return;const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
 const nav=el('nav','u2-region u2-mobile');nav.setAttribute('aria-label','Mobile application');const mobileMenu=button('Menu',()=>openMenu(mobileMenu));nav.append(button('Stock',()=>management.open(undefined,nav.querySelector('button')),'CTRL-027'),mobileMenu,button('Help',()=> $('helpBtn').click()),button('Track plan',()=> $('planBtn').click()));document.querySelector('.app').append(nav);
 return {update(){const proxy=$('u2RollingModels');if(proxy)proxy.value=$('rollingModels').value;const text=isPaused()?'Paused':'Running';if(lamp.textContent!==text)lamp.textContent=text;},dispose(){if(disposed)return;disposed=true;sound.dispose();guard.dispose();disposers.splice(0).forEach(fn=>fn());if(menu.open)menu.close();menu.remove();nav.remove();}};
}
