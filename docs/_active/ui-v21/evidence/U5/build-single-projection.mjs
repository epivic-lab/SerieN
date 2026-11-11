// Test observer only: genuine physical train projected alone in the UI, no engine mutation.
import {build} from 'esbuild';import {readFileSync} from 'node:fs';
const hooks=`
window.__singleProjection=()=>{const before=JSON.stringify(__serienDiagnostics.railwayState());
trainDeck.dispose();select(0);
trainDeck=mountTrainDeck({host:$("trainDeck"),tabs:$("tabs"),network,getTrains:()=>trains.filter(t=>t.id===0),getSelected:()=>selected,isPaused:()=>paused,
onSelect:select,onSpeed:setTrainSpeed,onReverse:reverseTrain,onStop:stopTrain,onLights:toggleTrainLights,onUncouple:uncouple,onCouple:couple,onFocus:id=>nav.focus(trains[id].journey.locate())});
return {unchanged:before===JSON.stringify(__serienDiagnostics.railwayState()),physicalFleet:trains.length,cards:document.querySelectorAll('.trainConsole').length};};`;
await build({stdin:{contents:readFileSync('app.js','utf8')+hooks,resolveDir:process.cwd(),sourcefile:'app.js'},bundle:true,minify:true,format:'esm',outfile:'work/u5-single-projection.js'});
