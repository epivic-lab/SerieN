// Shared browser/server wire encoding. JSON values only; sorted UTF-16 keys (JCS).
export const canonical = value => {
  if (typeof value === 'string' && !value.isWellFormed()) throw Error('Invalid Unicode');
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && Object.getPrototypeOf(value) === Object.prototype)
    return '{' + Object.keys(value).sort().map(k => canonical(k) + ':' + canonical(value[k])).join(',') + '}';
  throw Error('Invalid JSON value');
};
export const bytes = value => new TextEncoder().encode(canonical(value));
export const hex = value => [...new Uint8Array(value)].map(x => x.toString(16).padStart(2, '0')).join('');
export const digest = async value => hex(await crypto.subtle.digest('SHA-256', bytes(value)));
export const fingerprint = publicKey => digest(publicKey);
export const nonce = () => hex(crypto.getRandomValues(new Uint8Array(16)));
export const generateDevice = async () => {
  const keys = await crypto.subtle.generateKey({name:'ECDSA', namedCurve:'P-256'}, false, ['sign','verify']);
  return {privateKey:keys.privateKey, publicKey:await crypto.subtle.exportKey('jwk', keys.publicKey), deviceId:crypto.randomUUID()};
};
export async function signed(device, origin, method, path, workspaceId, layoutId, operation, body = {}, overrides = {}) {
  const proof = {domain:'SerieN-capability-v1',version:1,audience:origin,method,path,workspaceId,layoutId,
    operation,bodyDigest:await digest(body),deviceId:device.deviceId,keyId:device.deviceId,epoch:device.epoch ?? 1,
    request_id:crypto.randomUUID(),nonce:nonce(),issuedAt:Date.now(),...overrides};
  const signature = hex(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},device.privateKey,bytes(proof)));
  return {proof, signature, body};
}
