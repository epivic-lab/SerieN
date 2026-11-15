const {chromium}=require('playwright');
const fs=require('node:fs'),dir='docs/_active/br01/evidence/BR01-A/';
// Run from the repository root against a loopback HTTP server. Playwright
// controls Chrome. The probe changes only the test camera and observes the
// actual WebGL transforms and accepted odometer. It never steps the clock.
const base=new URL(process.env.SERIEN_URL || 'http://127.0.0.1:8176/');
if(!['127.0.0.1','localhost','[::1]'].includes(base.hostname))throw Error('Loopback capture server required');
const {buildSync}=require('esbuild');
const app=fs.readFileSync('app.js','utf8');
const frameHook='  effects.render(quality.profile';
const diagHook='if (new URLSearchParams(location.search).has("diagnostics")) window.__serienDiagnostics';
if(!app.includes(frameHook)||!app.includes(diagHook))throw Error('Review capture hooks for this revision');
const cameraHook=`  if(window.__brFollow){
    const g=trains[selected].group;
    const mid=g.localToWorld(new THREE.Vector3(-17,13,0));
    camera.position.copy(g.localToWorld(new THREE.Vector3(-11,55,-235)));
    camera.lookAt(mid);
  }
`;
const probe=`window.__brFollow=true;
window.__brMeasure=()=>{const t=trains[selected],p=t.journey.locate();return {x:p.x,z:p.z,angle:p.angle,edge:p.edge,distance:t.odometer,velocity:t.velocity,speed:t.speed,guard:t.guard?.state,dir:t.dir,frame,now:performance.now(),render:{...renderer.info.render},memory:{...renderer.info.memory}};};
window.__brCapture=kind=>captureLocomotiveThumbnail(renderer,kind==='engine'?trains[0].group:trains[0].carObjs[0],scene.environment);
window.__brClearance=()=>{
 const t=trains[selected],vehicles=[t.group,...t.carObjs];
 const guards=vehicles.map(g=>({inverse:g.matrixWorld.clone().invert(),front:g.userData.couplers.front.x,back:g.userData.couplers.back.x,halfWidth:g.userData.stock.width/2}));
 const outside=(point,guard)=>{const p=point.clone().applyMatrix4(guard.inverse);return Math.max(0,p.x-guard.front,guard.back-p.x,Math.abs(p.z)-guard.halfWidth);};
 let maximum=0,example=null,count=0;const byPart={};
 for(const g of vehicles)g.traverse(node=>{
   if(!node.isMesh)return;
   const verts=node.geometry.attributes.position;
   for(let i=0;i<verts.count;i++){
     const p=new THREE.Vector3().fromBufferAttribute(verts,i).applyMatrix4(node.matrixWorld);
     const excess=Math.min(...guards.map(guard=>outside(p,guard)));
     if(excess>.05){count++;const name=node.name||'linkage';byPart[name]=Math.max(byPart[name]||0,excess);}
     if(excess>maximum){maximum=excess;example={mesh:node.name,point:p.toArray()};}
   }
 });
 return {measurement:'Maximum horizontal excess outside the union of actual vehicle rectangles (mm)',edge:t.journey.locate().edge,odometer:t.odometer,count,maximum,example,byPart};
};
`;
const content=app.replace(frameHook,cameraHook+frameHook).replace(diagHook,probe+'\n'+diagHook);
const bundle=buildSync({stdin:{contents:content,resolveDir:process.cwd()},bundle:true,write:false,format:'esm'}).outputFiles[0].text;
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROME_BIN,headless:true,args:['--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
try{const p=await b.newPage({viewport:{width:1320,height:870}});p.on('pageerror',e=>console.error(e.message));await p.route('**/auth-gate.js*',r=>r.fulfill({contentType:'text/javascript',body:"document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;await import('./dist/game.js');"}));await p.route('**/dist/game.js',r=>r.fulfill({body:bundle,contentType:'text/javascript'}));
await p.goto(new URL('?diagnostics=1',base).href,{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.__brMeasure);
await p.evaluate(()=>{const q=document.querySelector('#quality');q.value='low';q.dispatchEvent(new Event('change'));document.querySelector('#day').value=20;document.querySelector('#day').dispatchEvent(new Event('input'));});
const trace=[];
const observe=async(label)=>{const rec=await p.evaluate(()=>__brMeasure());trace.push({label,...rec});console.log(label,rec.distance,rec.velocity,rec.edge)};
await p.waitForTimeout(1000);
await p.locator('#view3d canvas').first().screenshot({path:dir+'on-track.png'});
await p.evaluate(()=>{let chunks=[];const canvas=document.querySelector('#view3d canvas');const record=new MediaRecorder(canvas.captureStream(20),{mimeType:'video/webm;codecs=vp8',videoBitsPerSecond:4000000});window.__video=new Promise(resolve=>{record.ondataavailable=e=>chunks.push(e.data);record.onstop=()=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(new Blob(chunks))}});window.__record=record;record.start()});
const throttle=async(value)=>p.evaluate(v=>{const e=document.querySelector('.trainConsole .thr');e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}))},value);
const command=async(cmd)=>p.locator('.trainConsole').first().locator('[data-command='+cmd+']').evaluate(e=>e.click());
await observe('start');await throttle(20);for(let i=0;i<6;i++){await p.waitForTimeout(550);await observe('forward')}
const measure=await p.evaluate(()=>__brClearance());
if(measure.maximum>.05){console.error('FAIL: rendered stock exceeds both railway envelopes',measure.maximum);process.exitCode=1;}
fs.writeFileSync(dir+'clearance-final.json',JSON.stringify(measure,null,2)+'\n');
await throttle(0);for(let i=0;i<4;i++){await p.waitForTimeout(500);await observe('brake')}
await command('stop');await observe('stop');await p.waitForTimeout(700);await observe('dwell');await command('reverse');await throttle(20);
for(let i=0;i<6;i++){await p.waitForTimeout(550);await observe('reverse')}await command('stop');await p.waitForTimeout(700);await observe('end');
await p.evaluate(()=>__record.stop());const video=await p.evaluate(()=>__video);fs.writeFileSync(dir+'motion.webm',Buffer.from(video.split(',')[1],'base64'));fs.writeFileSync(dir+'motion.json',JSON.stringify(trace,null,2)+'\n');
for(const kind of ['engine','tender']){const res=await p.evaluate(kind=>__brCapture(kind),kind);fs.writeFileSync('assets/br01/'+kind+'.png',Buffer.from(res.dataURL.split(',')[1],'base64'))}
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)})
