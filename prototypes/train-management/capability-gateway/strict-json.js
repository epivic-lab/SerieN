// Reject duplicate decoded keys (including escaped aliases), depth abuse and nonfinite numbers.
export function parseStrict(text) {
  let i=0;
  const ws=()=>{while(/[\x20\t\r\n]/.test(text[i]??'!'))i++;};
  function str(){const start=i++;while(i<text.length){const c=text[i++];if(c==='"')return JSON.parse(text.slice(start,i));if(c==='\\')i++;}throw Error('String');}
  function value(depth=0){
    if(depth>64)throw Error('Depth');ws();const c=text[i];
    if(c==='"')return str();
    if(c==='{'||c==='['){
      const object=c==='{',end=object?'}':']',keys=new Set();i++;ws();if(text[i]===end){i++;return;}
      while(true){if(object){ws();if(text[i]!=='"')throw Error('Key');const key=str();if(keys.has(key))throw Error('Duplicate');keys.add(key);ws();if(text[i++]!==':')throw Error('Colon');}
        value(depth+1);ws();if(text[i]===end){i++;return;}if(text[i++]!==',')throw Error('Comma');}
    }
    const m=text.slice(i).match(/^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/);
    if(!m)throw Error('Value');const v=JSON.parse(m[0]);if(typeof v==='number'&&!Number.isFinite(v))throw Error('Number');i+=m[0].length;
  }
  value();ws();if(i!==text.length)throw Error('Trailing');return JSON.parse(text);
}
