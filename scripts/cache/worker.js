/* Manifest is injected by build-cache.mjs. No Auth/API requests are cached. */
const manifest = __SERIEN_MANIFEST__;
const scope = new URL(self.registration.scope);
const cacheName = 'serien-static-v1-' + scope.pathname;
const entries = new Map(manifest.files.map(file => [new URL(file.path, scope).pathname, file]));
const keyFor = file => new URL('.serien-cache/' + file.sha256 + '/' + file.path, scope).href;
const inFlight = new Map();
async function readCache(key) {
  try { return await (await caches.open(cacheName)).match(key); } catch { return undefined; }
}
async function resource(file, required = false) {
  const key = keyFor(file), cached = await readCache(key);
  if (cached) return cached;
  if (inFlight.has(key)) return (await inFlight.get(key)).clone();
  const task = (async () => {
    const url = new URL(file.path, scope);
    url.searchParams.set('__serien_revision', file.sha256);
    const response = await fetch(url.href, {cache:'reload', credentials:'omit', redirect:'error'});
    if (response.status !== 200 || response.type === 'opaque') throw new Error('Static resource unavailable');
    const bytes = await response.arrayBuffer();
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), n => n.toString(16).padStart(2,'0')).join('');
    if (bytes.byteLength !== file.bytes || hash !== file.sha256) throw new Error('Static resource integrity mismatch');
    // Decompressed bytes require fresh headers, not a stale Content-Encoding/Length.
    const result = new Response(bytes, {headers:{'Content-Type':response.headers.get('Content-Type') || 'application/octet-stream'}});
    try { await (await caches.open(cacheName)).put(key, result.clone()); }
    catch (error) { if (required) throw error; }
    return result;
  })();
  inFlight.set(key, task);
  try { return (await task).clone(); } finally { inFlight.delete(key); }
}
self.addEventListener('install', event => {
  // No skipWaiting: an update cannot replace a running simulation's release.
  event.waitUntil((async () => {
    for (const file of manifest.files.filter(file => file.core)) await resource(file, true);
  })());
});
self.addEventListener('activate', event => event.waitUntil((async () => {
  // Activation waits for old controlled tabs to close. Keep unchanged content.
  try {
    const cache = await caches.open(cacheName), keep = new Set(manifest.files.map(keyFor));
    for (const key of await cache.keys()) if (!keep.has(key.url)) await cache.delete(key);
  } catch { /* Storage may be unavailable; verified network fetch remains usable. */ }
  await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || (request.headers.has('range') || request.headers.has('authorization')) || url.origin !== scope.origin) return;
  let file;
  if (request.mode === 'navigate' && (url.pathname === scope.pathname || url.pathname === scope.pathname + 'index.html')) {
    // Only the public shell, never OAuth parameters or authenticated responses.
    file = entries.get(scope.pathname + 'index.html');
  } else {
    if ([...url.searchParams.keys()].some(key => key !== 'v')) return;
    file = entries.get(url.pathname);
  }
  if (file) event.respondWith(resource(file));
});
