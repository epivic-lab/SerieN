import schema from './state-schema.json' with {type:'json'};
export const STATE_SCHEMA=schema;
export function fail(message){throw new Error(`Snapshot: ${message}`);}
export function assert(ok,message){if(!ok)fail(message);}
export function canonical(value){return JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);}
// The complete vocabulary used by the pinned 6A.1 schema. No coercion/defaults.
export function validateSchema(value,node=schema,path='$') {
  if(node.$ref)return validateSchema(value,schema.$defs[node.$ref.split('/').at(-1)],path);
  if(node.anyOf){assert(node.anyOf.some(n=>{try{validateSchema(value,n,path);return true;}catch{return false;}}),`${path}: anyOf`);return;}
  if('const' in node)assert(value===node.const,`${path}: const`);
  if(node.enum)assert(node.enum.includes(value),`${path}: enum`);
  if(node.type){const t=node.type;
    assert(t==='null'?value===null:t==='array'?Array.isArray(value):t==='object'?value!==null&&Object.getPrototypeOf(value)===Object.prototype:t==='integer'?Number.isSafeInteger(value):typeof value===t,`${path}: ${t}`);
  }
  if(typeof value==='number'){
    assert(Number.isFinite(value),`${path}: finite`);
    for(const [key,test] of [['minimum',v=>value>=v],['maximum',v=>value<=v],['exclusiveMinimum',v=>value>v],['exclusiveMaximum',v=>value<v]])if(key in node)assert(test(node[key]),`${path}: ${key}`);
  }
  if(typeof value==='string'){
    if(node.minLength!==undefined)assert([...value].length>=node.minLength,`${path}: minLength`);
    if(node.maxLength!==undefined)assert([...value].length<=node.maxLength,`${path}: maxLength`);
    if(node.pattern)assert(new RegExp(node.pattern).test(value),`${path}: pattern`);
    if(node.format==='uuid')assert(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value),`${path}: uuid`);
  }
  if(Array.isArray(value)){
    if(node.minItems!==undefined)assert(value.length>=node.minItems,`${path}: minItems`);
    if(node.maxItems!==undefined)assert(value.length<=node.maxItems,`${path}: maxItems`);
    if(node.uniqueItems)assert(new Set(value.map(v=>JSON.stringify(v))).size===value.length,`${path}: uniqueItems`);
    value.forEach((v,i)=>validateSchema(v,node.items,`${path}[${i}]`));
  } else if(value!==null&&typeof value==='object'){
    for(const key of node.required??[])assert(Object.hasOwn(value,key),`${path}.${key}: required`);
    for(const [key,v] of Object.entries(value)){
      assert(node.additionalProperties!==false||Object.hasOwn(node.properties??{},key),`${path}.${key}: unknown`);
      if(node.properties?.[key])validateSchema(v,node.properties[key],`${path}.${key}`);
    }
  }
  return value;
}
export function plainCopy(value){
  const seen=new Set();
  function copy(v){
    if(v===null||typeof v==='string'||typeof v==='boolean')return v;
    if(typeof v==='number'){assert(Number.isFinite(v),'nonfinite');return v;}
    assert(v&&typeof v==='object'&&!seen.has(v),'non JSON value/cycle');seen.add(v);
    assert(Array.isArray(v)||Object.getPrototypeOf(v)===Object.prototype,'DOM/class instance');
    if(Array.isArray(v))assert(Object.keys(v).length===v.length,'sparse/extended array');
    const out=Array.isArray(v)?v.map(copy):Object.fromEntries(Object.entries(v).map(([k,x])=>[k,copy(x)]));seen.delete(v);return out;
  }
  const out=copy(value);assert(new TextEncoder().encode(JSON.stringify(out)).length<=2*1024*1024,'payload >2MiB');return out;
}
