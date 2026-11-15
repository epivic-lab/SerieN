// A10: one global Space owner; native control activation remains native.
export function mountKeyboard({onStop, navigation, hasTrain = () => false}){
  const cameraTarget = target => target === document.body || target === document.documentElement ||
    target.matches?.('#view3d canvas,#viewFollow,[data-preset="follow"]');
  const modalOpen = () => document.querySelector('dialog[open],.modal:not([hidden])');
  const keydown=e=>{
    const target=e.target;
    if (navigation && e.key.startsWith("Arrow")) {
      if (e.defaultPrevented || e.isComposing || e.shiftKey || e.altKey || e.ctrlKey || e.metaKey ||
          !cameraTarget(target) || modalOpen() || !hasTrain()) return;
      if (navigation.pressArrow(e.key, e.repeat)) e.preventDefault();
      return;
    }
    if(e.code!=="Space"||e.defaultPrevented||e.repeat||e.altKey||e.ctrlKey||e.metaKey||
      target.closest?.('input,textarea,select,button,a,[contenteditable]:not([contenteditable="false"]),[role="button"],[role="slider"]')||
      document.querySelector('dialog[open],.modal:not([hidden])'))return;
    e.preventDefault();onStop();
  };
  const controller = new AbortController();
  const options = {signal: controller.signal};
  const clear = () => navigation?.clearArrows();
  window.addEventListener('keydown',keydown,options);
  window.addEventListener('keyup',event => navigation?.releaseArrow(event.key),options);
  window.addEventListener('blur',clear,options);
  window.addEventListener('pagehide',clear,options);
  document.addEventListener('visibilitychange',clear,options);
  document.addEventListener('focusin',clear,options);
  document.addEventListener('pointerdown',clear,options);
  return {dispose(){controller.abort();clear();}};
}
