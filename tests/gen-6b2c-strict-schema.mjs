// Source schema stays immutable. JSON Schema "format" is only an annotation
// in the pinned Draft 2020-12; pg_jsonschema 0.3.3 does not assert UUID format.
// Strengthen ONLY the server-side derivative with exact UUID regex patterns.
import {readFileSync} from 'node:fs';
const s=JSON.parse(readFileSync(new URL('../src/persistence/state-schema.json',import.meta.url),'utf8'));
const uuidPattern='^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
let count=0;
function strengthen(v){
 if(!v||typeof v!=='object')return;
 if(Array.isArray(v)){v.forEach(strengthen);return;}
 if(v.format==='uuid'){
  if(v.pattern!==undefined)throw Error('Unexpected existing UUID regex in source');
  v.pattern=uuidPattern;count++;
 }
 for(const child of Object.values(v))strengthen(child);
}
strengthen(s);
if(count!==17)throw Error('Pinned schema changed: expected 17 UUID format nodes, got '+count);
process.stdout.write(JSON.stringify(s));
