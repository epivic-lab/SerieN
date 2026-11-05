import {prepare} from '../transaction-core/envelope.js';
const fields=(b,expected)=>{if(Object.keys(b).sort().join(',')!==expected.split(',').filter(Boolean).sort().join(','))throw Error('INVALID_REQUEST');};
const revision=(v,nullable=false)=>{if(nullable&&v===null)return null;if(typeof v!=='string'||!/^(0|[1-9][0-9]*)$/.test(v)||BigInt(v)>9223372036854775806n)throw Error('INVALID_REQUEST');return v;};
export async function transaction(client,principal,text,values) {
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL statement_timeout='4s'");await client.query("SET LOCAL lock_timeout='3s'");
    const r=await client.query(`SELECT session_user AS actor,pg_backend_pid() AS pid,(${text}) AS value`,values);
    if(r.rows[0].actor!==principal)throw Error('FORBIDDEN');
    await client.query('COMMIT'); // Never return a SELECT result before COMMIT acknowledgement.
    return r.rows[0];
  } catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}
}
export function dataQuery(p,b) {
  const w=p.workspaceId,l=p.layoutId;
  switch(p.operation) {
    case 'ReadHead':fields(b,'');return ['serien_capability.read_head($1,$2)',[w,l]];
    case 'ReadSnapshot':fields(b,'revision');return ['serien_capability.read_snapshot($1,$2,$3)',[w,l,revision(b.revision)]];
    case 'ListHistory':fields(b,'after,pageSize,through');return ['serien_capability.list_history($1,$2,$3,$4,$5)',[w,l,revision(b.after),revision(b.pageSize),revision(b.through,true)]];
    case 'ReadReceipt':fields(b,'requestId');return ['serien_capability.read_receipt($1,$2,$3)',[w,l,b.requestId]];
    case 'RecoverRevision':fields(b,'expectedRevision,sourceRevision');return ['serien_capability.recover_revision($1,$2,$3,$4,$5)',[w,l,revision(b.expectedRevision),revision(b.sourceRevision),p.request_id]];
    case 'SaveCheckpoint':{const e=prepare(JSON.stringify(b),p);if(b.operation!=='SaveCheckpoint')throw Error('INVALID_REQUEST');return ['serien_capability.save_checkpoint($1,$2,$3)',[p.request_id,e.wire,e.digest]];}
    default:throw Error('INVALID_REQUEST');
  }
}
