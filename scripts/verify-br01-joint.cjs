// Run against the locally served repository. Requires Playwright and Chrome.
const {chromium}=require('playwright');
const {buildSync}=require('esbuild');
const fs=require('node:fs');
const dir='docs/_active/br01/evidence/BR01-B/';
const base=new URL(process.env.SERIEN_URL||'http://127.0.0.1:8193/');
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Loopback required');
const types=Object.fromEntries(fs.readFileSync('docs/_active/scenario-v06/evidence/R0/piece-matrix.csv','utf8')
  .trim().split('\n').slice(1).map(line=>line.split(',')).map(([id,,type])=>[Number(id),type]));
const source=fs.readFileSync('app.js','utf8');
const hook='if (new URLSearchParams(location.search).has("diagnostics")) window.__serienDiagnostics';
const frame='  effects.render(quality.profile === "cinema");';
if(!source.includes(hook)||!source.includes(frame))throw Error('Review probe placement');
const probe=`
const inspection=[buildBR01(br01Source,'engine',0),buildBR01(br01Source,'tender',0)];
const offsets=layoutFor(trains[0]).offsets;
const spawn=trains[0].journey;
const pieceTypes=${JSON.stringify(types)};
function poseInspection(j,at,d){
  inspection.forEach((g,i)=>{
    const s=at-offsets[i],p=j.locate(s);
    g.position.set(p.x,profile.railTop,p.z);g.rotation.y=p.angle;g.br01Pose(d,j,s,p);
  });
}
function poseCase(edge,fraction,d){
  const e=network.edges[edge],s=e.length*fraction;
  // A pose replay can use another legal turnout setting when the default
  // setting cannot provide the full ribbon. Never change the live switches.
  for(let mask=0;mask<(1<<controlOrder.length);mask++){
    const choose=mask===0?route:routing(network,id=>Boolean(mask & (1<<controlOrder.indexOf(id))));
    const j=new Journey(network,edge,s);
    if(!j.ensure(s-layoutFor(trains[0]).tail,choose)||!j.ensure(s+49,choose))continue;
    poseInspection(j,s,d);return true;
  }
  return false;
}
window.jointStudy=()=>{
  const samples=[],unavailable=[];
  const exactAt=spawn.position+89.25;
  const ref=Object.assign(Object.create(Object.getPrototypeOf(spawn)),spawn,{segments:spawn.segments.map(p=>({...p}))});
  if(!ref.ensure(exactAt+49,route))throw Error('Reference route');
  poseInspection(ref,exactAt,89.25);
  const reference={distance:89.25,pose:ref.locate(exactAt),...measureJoint(inspection,true)};
  let worst=null;
  for(const edge of Object.values(network.edges)){
    const type=pieceTypes[edge.sourcePiece];
    if(!type?.startsWith('R') && edge.id!=='V06-P006')continue;
    for(const sign of [1,-1])for(let i=0;i<=8;i++){
      const fraction=sign>0?i/8:1-i/8;
      const d=sign*i/8*edge.length;
      if(!poseCase(edge.id,fraction,d)){unavailable.push({edge:edge.id,fraction,sign});continue;}
      const item={edge:edge.id,type,fraction,sign,d,...measureJoint(inspection)};
      samples.push(item);
      if(!worst||worst.union.max<item.union.max)worst=item;
    }
  }
  if(!worst)throw Error('No valid curve samples');
  poseCase(worst.edge,worst.fraction,worst.d);
  worst.triangleIntersection=measureJoint(inspection,true).triangleIntersection;
  return {reference,samples,unavailable,worst};
};
window.jointInspection=(item)=>{
  if(!poseCase(item.edge,item.fraction,item.d))throw Error('Unreachable pose');
  const study=new THREE.Scene();study.background=new THREE.Color(0x353f47);study.environment=scene.environment;
  study.add(new THREE.AmbientLight(0xffffff,2));
  const light=new THREE.DirectionalLight(0xfff6e9,3);light.position.set(-20,100,60);study.add(light);
  for(const [i,g] of inspection.entries()){
    study.add(g);
    const {front,back}=g.userData.couplers,w=g.userData.stock.width/2;
    const points=[[front.x,w],[front.x,-w],[back.x,-w],[back.x,w]].map(([x,z])=>new THREE.Vector3(x,.4,z));
    g.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:i?0xffb64d:0x7cd7ff})));
  }
  window.jointScene=study;
  window.jointSubject=inspection[0];
};
window.jointLive=()=>{window.jointScene=null;window.jointSubject=trains[0].group;};
window.jointState=()=>{
  const t=trains[0],wheel=t.group.getObjectByName('axle_6_rader');
  return {d:t.odometer,v:t.velocity,dir:t.dir,edge:t.journey.locate().edge,angle:wheel?.parent.rotation.z,
    linkage:t.group.children[0].children.filter(n=>n.isMesh&&!n.name).map(n=>[n.position.x,n.position.y,n.rotation.z])};
};
`;
const camera=`if(window.jointSubject){
 const g=window.jointSubject,focus=new THREE.Vector3(-45,13,0);
 camera.position.copy(g.localToWorld(window.jointScene?new THREE.Vector3(-68,65,-78):new THREE.Vector3(-32,42,-150)));
 camera.lookAt(g.localToWorld(focus));
}
`;
const bundle=buildSync({stdin:{contents:"import {measureJoint} from './scripts/br01-joint-probe.js';\n"+source.replace(hook,probe+hook).replace(frame,camera+frame+'\nif(window.jointScene)renderer.render(window.jointScene,camera);'),resolveDir:process.cwd()},bundle:true,write:false,format:'esm'}).outputFiles[0].text;
async function run(){
 const browser=await chromium.launch({executablePath:process.env.CHROME_BIN,headless:true,args:['--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1320,height:870}});
  await page.route('**/auth-gate.js*',r=>r.fulfill({contentType:'text/javascript',body:"document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;await import('./dist/game.js');"}));
  await page.route('**/dist/game.js',r=>r.fulfill({body:bundle,contentType:'text/javascript'}));
  await page.goto(new URL('?diagnostics=1',base).href,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.jointState);
  const result=await page.evaluate(()=>jointStudy());
  const write=(name,data)=>fs.writeFileSync(dir+name,JSON.stringify(data,null,2)+'\n');
  write('samples.json',result);
  console.log('reference, worst, samples, unavailable:',result.reference.union,result.worst.edge,result.worst.union,result.samples.length,result.unavailable.length);
  await page.evaluate(item=>jointInspection(item),result.worst);
  await page.waitForTimeout(400);
  await page.locator('#view3d canvas').first().screenshot({path:dir+'joint.png'});
  await page.evaluate(()=>{
   jointLive();
   const canvas=document.querySelector('#view3d canvas'),stream=canvas.captureStream(20);
   const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8'}),chunks=[];
   window.jointMovie=new Promise(resolve=>{recorder.ondataavailable=e=>chunks.push(e.data);recorder.onstop=()=>{stream.getTracks().forEach(t=>t.stop());const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(new Blob(chunks));};});
   window.finishJointMovie=()=>recorder.stop();recorder.start();
  });
  const live=[],observe=async(label)=>live.push({label,...await page.evaluate(()=>jointState())});
  async function throttle(v){await page.locator('.trainConsole .thr').first().evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},v);}
  async function command(name){await page.locator('.trainConsole').first().locator('[data-command='+name+']').evaluate(e=>e.click());}
  await observe('start');await throttle(20);
  for(let i=0;i<6;i++){await page.waitForTimeout(500);await observe('forward');}
  await command('stop');await observe('stop');await page.waitForTimeout(650);await observe('dwell');
  await command('reverse');await observe('reverse at rest');await throttle(20);
  for(let i=0;i<6;i++){await page.waitForTimeout(500);await observe('reverse');}
  await command('stop');await observe('end');write('live.json',live);
  await page.evaluate(()=>finishJointMovie());
  fs.writeFileSync(dir+'joint.webm',Buffer.from(await page.evaluate(()=>jointMovie),'base64'));
  if(result.samples.some(x=>x.union.max>.05||x.bodies.some(b=>b.max>.05)))process.exitCode=1;
 }finally{await browser.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
