// U2 coordinator: no store mutation, no conversion of synchronous discard/reset.
export function createGuardModal({title='Sign out?',cancelLabel='Keep session',confirmLabel='Sign out',titleId='u2GuardTitle',guardClass='u2-guard'}={}){
 const dialog=document.createElement('dialog');dialog.className=`u2-region ${guardClass}`;dialog.setAttribute('aria-labelledby','u2GuardTitle');
 dialog.innerHTML='<div class="m"><div class="mi"><h2 id="u2GuardTitle">Sign out?</h2><p data-message></p><div class="u2-actions"><button class="bt d" data-cancel>Keep session</button><button class="bt" data-confirm>Sign out</button></div></div></div>';
 dialog.querySelector('h2').id=titleId;dialog.setAttribute('aria-labelledby',titleId);dialog.querySelector('h2').textContent=title;dialog.querySelector('[data-cancel]').textContent=cancelLabel;dialog.querySelector('[data-confirm]').textContent=confirmLabel;
 document.body.append(dialog);let pending=null,disposed=false;
 function settle(yes){if(!pending)return;const item=pending;pending=null;if(dialog.open)dialog.close();const origin=item.origin?.isConnected?item.origin:item.fallbackOrigin;if(origin?.isConnected)origin.focus();if(yes&&!disposed){if(item.valid())item.confirm();else item.invalid?.();}}
 const topKey=e=>{if(e.key==='Escape')e.stopPropagation();};
 const cancel=()=>settle(false),confirm=()=>settle(true),onCancel=e=>{e.preventDefault();cancel();},back=e=>{if(e.target===dialog)cancel();};
 dialog.querySelector('[data-cancel]').addEventListener('click',cancel);dialog.querySelector('[data-confirm]').addEventListener('click',confirm);dialog.addEventListener('cancel',onCancel);dialog.addEventListener('keydown',topKey);dialog.addEventListener('click',back);
 return {request(item){if(disposed||pending)return false;pending=item;dialog.querySelector('[data-message]').textContent=item.message;dialog.showModal();dialog.querySelector('[data-cancel]').focus();return true;},get active(){return Boolean(pending);},cancel,dispose(){disposed=true;cancel();dialog.querySelector('[data-cancel]').removeEventListener('click',cancel);dialog.querySelector('[data-confirm]').removeEventListener('click',confirm);dialog.removeEventListener('cancel',onCancel);dialog.removeEventListener('keydown',topKey);dialog.removeEventListener('click',back);dialog.remove();}};
}
