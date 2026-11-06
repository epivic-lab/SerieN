// Generates a REAL 6B.1 capture document (not a handcrafted JSON stub).
// Synthetic owner/layout only; never reads cloud credentials.
import {createNetwork,loopPosition} from '../src/network.js';
import {Journey,routing} from '../src/simulation.js';
import {buildStock} from '../src/rolling-stock.js';
import {createIdentities} from '../src/persistence/identity.js';
import {captureState} from '../src/persistence/capture.js';
import {validateDocument,validateStaging} from '../src/persistence/validate.js';
import {createFleetCommands} from '../src/fleet-commands.js';
const network=createNetwork(), route=routing(network,()=>false);
const owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const context={workspaceId:owner,layoutId:owner};
const ids=createIdentities(()=>globalThis.crypto.randomUUID());
function stock(kind){const g=buildStock(kind);g.userData.persistenceKind=kind;return g;}
const trains=Array.from({length:3},(_,i)=>{
 const p=loopPosition(network,i,.5),journey=new Journey(network,p.edge,p.s);
 if(p.sign<0){journey.segments[0].sign=-1;journey.position=network.edges[p.edge].length-p.s;}
 journey.ensure(journey.position-300,route);journey.ensure(journey.position+50,route);
 return {id:i,name:'Steam',desc:'Study',nativeName:'Steam',nativeDescription:'Study',modelKey:'steam',
  group:stock('steam'),carObjs:[stock('closed'),stock('flat')],cars:2,journey,
  speed:i===1?0:20,requestedSpeed:37,velocity:i===1?0:12,dir:i%2?-1:1,odometer:-123,
  lights:i===1,loop:i%3,previousLane:i%3,mode:'loop',laps:0,
  initial:{loop:i%3,cars:2,fraction:.5}};
});
const host={
 trains,detached:[],pending:0,
 describe:g=>({couplers:g.userData.couplers,nativeCouplers:g.userData.couplers}),
 switches:Object.fromEntries(['WX-A','WX-B','Y-IN','Y-2','Y-3','Y-R1','Y-R2','Y-4'].map((k,i)=>[k,Boolean(i%2)])),
 time:{tickCount:123,stepSeconds:1/60,accumulatorSeconds:.003,wasPaused:false},
 missions:{selected:3,changes:8,transferred:true,visitedRunaround:true,didDetach:true,didAttach:false},
 ui:{selectedTrainId:1,consoleSlots:[0,1,2],recentTrainIds:[1,2,0],day:82,
 rollingModelMode:'native',qualityMode:'auto',
 camera:{preset:'manual',position:[600,800,1300],target:[750,0,350],zoom:1.2,fov:35},
 hudMinimized:true,bellMuted:true}
};
// Optional E1 fixture: a real detached wagon, produced by the R1 command.
// Default C/D fixture and its existing callers remain unchanged.
if(process.argv.includes('--with-loose')){
 const t=host.trains[0];t.speed=t.velocity=0;
 createFleetCommands({...host,route}).uncouple(0);
 if(host.detached.length!==1)throw Error('E1 fixture requires actual R1 detach');
 validateStaging(host.trains,host.detached);
}
const doc=captureState(host,ids,context);validateDocument(doc,context,network);
process.stdout.write(JSON.stringify(doc));
