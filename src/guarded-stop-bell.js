/** One application audio coordinator. Never initializes audio without a gesture. */
export function createGuardedBell({createContext=()=>new AudioContext(),schedule=setInterval,cancel=clearInterval}={}){
 let context,timer,active=false,muted=false,disposed=false;const voices=new Set();
 function silence(){if(timer!==undefined){cancel(timer);timer=undefined;}for(const v of [...voices])v();}
 function strike(){if(!context||context.state!=='running'||!active||muted||disposed)return;
  const gain=context.createGain(),oscillators=[840,2113,3864].map(f=>{const o=context.createOscillator();o.type='sine';o.frequency.value=f;return o;});
  const cleanup=()=>{if(!voices.delete(cleanup))return;for(const o of oscillators){o.onended=null;try{o.stop();}catch{}o.disconnect();}gain.disconnect();};voices.add(cleanup);
  gain.gain.setValueAtTime(.00001,context.currentTime);gain.gain.exponentialRampToValueAtTime(.014,context.currentTime+.008);gain.gain.exponentialRampToValueAtTime(.00001,context.currentTime+.65);gain.connect(context.destination);
  oscillators.forEach((o,i)=>{o.connect(gain);if(i===0)o.onended=cleanup;o.start();o.stop(context.currentTime+.7);});
 }
 function sync(){if(!active||muted||disposed){silence();return;}if(context?.state==='running'&&timer===undefined){strike();timer=schedule(strike,1800);}}
 return {async unlock(){if(disposed)return;try{context??=createContext();await context.resume();sync();}catch{silence();}},setActive(value){active=Boolean(value);sync();},setMuted(value){muted=Boolean(value);sync();},get snapshot(){return {active,muted,initialized:Boolean(context),voices:voices.size,timer:timer!==undefined};},dispose(){if(disposed)return;disposed=true;silence();context?.close().catch(()=>{});}};
}
