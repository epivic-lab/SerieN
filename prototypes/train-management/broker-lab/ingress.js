// No pg import, credentials, provisioning API or Docker mount. Runs under its own UID/network.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {LocalBudget} from '../history-access/protocol.js';
const budget=new LocalBudget({device:1000,workspace:2000,maxSubjects:1024});
const files={'/':new URL('./index.html',import.meta.url),'/client.js':new URL('./client.js',import.meta.url),'/protocol.js':new URL('../capability-gateway/protocol.js',import.meta.url),'/legacy-client.js':new URL('../integration-lab/client.js',import.meta.url)};
const server=http.createServer(async(req,res)=>{
 const send=(status,body,type='application/json')=>{if(res.destroyed)return;res.writeHead(status,{'content-type':type,'cache-control':'no-store','x-content-type-options':'nosniff','content-security-policy':"default-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'"});res.end(type==='application/json'?JSON.stringify(body):body);};
 try {
  const cfg=JSON.parse(await readFile('/public-config/origin.json','utf8'));
  if(req.headers.host!==new URL(cfg.origin).host||req.headers.origin&&req.headers.origin!==cfg.origin)throw Error('FORBIDDEN');
  if(req.method==='GET'&&files[req.url])return send(200,await readFile(files[req.url]),req.url==='/'?'text/html':'text/javascript');
  budget.take({workspaceId:'ingress',deviceId:req.socket.remoteAddress});
  if(req.method!=='POST'||!/^\/v1\/(pair|recover|rotate|workspaces\/[a-f0-9-]{36}\/layouts\/[a-f0-9-]{36}\/(ReadHead|ReadSnapshot|ListHistory|ReadReceipt|SaveCheckpoint|RecoverRevision))$/.test(req.url))return send(404,{error:'NOT_FOUND'});
  if(req.headers['content-type']!=='application/json')return send(400,{error:'INVALID_REQUEST'});
  let size=0;const chunks=[];for await(const c of req){size+=c.length;if(size>2097152)return send(413,{error:'PAYLOAD_TOO_LARGE'});chunks.push(c);}
  const wire=new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks));
  const target=http.request({socketPath:cfg.socket??process.env.LAB_SOCKET??'/ipc/broker.sock',path:'/request',method:'POST',headers:{'content-type':'application/json'}},reply=>{
   let total=0;const body=[];reply.on('data',c=>{total+=c.length;if(total>262144){target.destroy();send(413,{error:'RESPONSE_TOO_LARGE'});}else body.push(c);});reply.on('end',()=>{try{send(reply.statusCode,JSON.parse(Buffer.concat(body).toString()));}catch{send(503,{error:'RETRYABLE_UNAVAILABLE'});}});
  });
  target.on('error',()=>send(503,{error:'RETRYABLE_UNAVAILABLE'}));target.setTimeout(14000,()=>target.destroy());
  res.on('close',()=>{if(!res.writableEnded)target.destroy();});target.end(JSON.stringify({method:req.method,path:req.url,wire}));
 }catch(error){send(error.message==='FORBIDDEN'?403:error.message==='RATE_LIMITED'?429:503,{error:error.message==='FORBIDDEN'?'FORBIDDEN':error.message==='RATE_LIMITED'?'RATE_LIMITED':'RETRYABLE_UNAVAILABLE'});}
});
server.requestTimeout=15000;server.headersTimeout=5000;server.maxConnections=256;
server.listen(8080,'0.0.0.0',()=>process.stdout.write(JSON.stringify({event:'ready',uid:process.getuid()})+'\n'));
process.on('SIGTERM',()=>{server.closeAllConnections();server.close(()=>process.exit(0));});
