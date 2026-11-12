// A10: one global Space owner; native control activation remains native.
export function mountKeyboard({onStop}){
  const keydown=e=>{
    const target=e.target;
    if(e.code!=="Space"||e.defaultPrevented||e.repeat||e.altKey||e.ctrlKey||e.metaKey||
      target.closest?.('input,textarea,select,button,a,[contenteditable]:not([contenteditable="false"]),[role="button"],[role="slider"]')||
      document.querySelector('dialog[open],.modal:not([hidden])'))return;
    e.preventDefault();onStop();
  };
  window.addEventListener('keydown',keydown);
  return {dispose(){window.removeEventListener('keydown',keydown);}};
}
