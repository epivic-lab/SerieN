// Cache is optional. Failure never replaces or bypasses the online access gate.
export async function prepareStaticCache() {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
  let timer;
  const listeners = new AbortController();
  const setup = async () => {
    await navigator.serviceWorker.register(new URL('./service-worker.js', import.meta.url), {scope:'./', updateViaCache:'none'});
    if (navigator.serviceWorker.controller) return;
    await navigator.serviceWorker.ready;
    if (navigator.serviceWorker.controller) return;
    await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, {once:true, signal:listeners.signal}));
  };
  try { await Promise.race([setup(), new Promise(resolve => {timer=setTimeout(resolve,10000);})]); }
  catch { /* Browser storage/network restrictions: continue with ordinary loading. */ }
  finally { clearTimeout(timer); listeners.abort(); }
}
