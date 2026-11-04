// Trusted-server adapter only. No HTTP listener, DB credentials, or simulator import.
import { canonical, isUUID } from '../capability-gateway/protocol.js';
import { parseStrict } from '../capability-gateway/strict-json.js';
import { createHash } from 'node:crypto';
export function prepare(raw, context) {
  if (Buffer.byteLength(raw)>2*1024*1024) throw Error('PAYLOAD_TOO_LARGE');
  const e=parseStrict(raw);
  if (!context || e.workspaceId!==context.workspaceId || e.layoutId!==context.layoutId) throw Error('FORBIDDEN');
  if (!isUUID(e.workspaceId)||!isUUID(e.layoutId)||typeof e.expectedRevision!=='string'||!/^([0-9]|[1-9][0-9]+)$/.test(e.expectedRevision) || BigInt(e.expectedRevision)>9223372036854775806n) throw Error('INVALID_ENVELOPE');
  if (Object.keys(e).sort().join(',')!=='expectedRevision,layoutId,operation,recoverySourceRevision,state,workspaceId') throw Error('INVALID_ENVELOPE');
  if (!['SaveCheckpoint','RecoverRevision'].includes(e.operation)) throw Error('INVALID_OPERATION');
  if (e.operation==='SaveCheckpoint' ? e.recoverySourceRevision!==null : (typeof e.recoverySourceRevision!=='string'||!/^[1-9][0-9]*$/.test(e.recoverySourceRevision)||BigInt(e.recoverySourceRevision)>9223372036854775807n)) throw Error('INVALID_RECOVERY');
  const wire=canonical(e);
  return {wire,digest:createHash('sha256').update(wire).digest('hex')};
}
if (process.argv[1]===new URL(import.meta.url).pathname) {
  let raw=''; for await (const c of process.stdin) raw+=c;
  const ctx=JSON.parse(process.argv[2]);
  process.stdout.write(JSON.stringify(prepare(raw,ctx)));
}
