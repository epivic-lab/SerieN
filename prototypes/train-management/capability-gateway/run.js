import {startGateway} from './gateway.js';
if(process.argv.length!==3||process.argv[2]!=='--local-prototype')throw Error('Local prototype only: pass --local-prototype');
const gateway=await startGateway();
console.log(`Isolated ephemeral prototype (no database): ${gateway.origin}`);
process.on('SIGINT',async()=>{await gateway.close();process.exit(0);});
