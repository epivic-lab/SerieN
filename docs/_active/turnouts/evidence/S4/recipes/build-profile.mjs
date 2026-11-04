// Temporary profiling bundle only. Never copied into the production dist file.
import {build} from 'esbuild';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(process.argv[2]??'.'),out=resolve(process.argv[3]??'/tmp/serien-profile.js');
const hooks=`window.__s4={Journey,arrows:turnoutArrows,model:turnoutModel,route,switchSpecs,trains,topology:switchTopology};window.__s3={glow:turnoutGlow,picking:turnoutPicking,interaction:turnoutInteraction,THREE,motionPreference};window.__s2={picking:turnoutPicking,interaction:turnoutInteraction,THREE};

window.__serienProfile={
 stop(){cancelAnimationFrame(animationHandle);renderer.getContext().finish();},
 resume(){last=performance.now();animationHandle=requestAnimationFrame(tick);},
 renderVehicles,advanceFleet,getSwitchAssistance,trainDeck,effects,renderer,scene,camera,controls,network,trains,detached,scenic,
 renderFixed(){paused=true;if(globalThis.__serienWindTime)__serienWindTime.value=0;controls.enableDamping=false;controls.update();camera.position.set(1580,1150,1570);camera.zoom=1;camera.updateProjectionMatrix();controls.target.set(750,0,350);controls.update();last=performance.now();tick(last);cancelAnimationFrame(animationHandle);renderer.getContext().finish();return renderer.domElement.toDataURL();},
 staticScene(){cancelAnimationFrame(animationHandle);for(const t of trains){scene.remove(t.group);for(const o of t.carObjs)scene.remove(o);}scene.remove(selectRing);renderer.getContext().finish();},
 longFleet(){for(const t of trains){while(t.carObjs.length<5){const o=freightWagon(t.carObjs.length);scene.add(o);t.carObjs.push(o);}t.cars=t.carObjs.length;}
 const t=trains[3];t.initial={loop:2,fraction:.72,cars:5};t.loop=2;trains.forEach(initializeJourney);renderVehicles();ui();}
};`;
await build({plugins:[{name:'profile-only-observers',setup(api){api.onLoad({filter:/(?:WebGLShaderCache|three\.module)\.js$/},async({path})=>({contents:readFileSync(path,'utf8').replace('this.materialCache = new Map();','this.materialCache = new Map();globalThis.__serienShaderCache=this;'),loader:'js'}));api.onLoad({filter:/[\\/]src[\\/](diorama|scenery)\.js$/},async({path})=>{let text=readFileSync(path,'utf8');text=text.replace('const windTime = { value: 0 };','const windTime = { value: 0 };globalThis.__serienWindTime=windTime;');text=text.replace('const env = pmrem.fromScene(room, 0.04);','const pmremStart=performance.now();const env = pmrem.fromScene(room, 0.04);globalThis.__serienPMREMMs=performance.now()-pmremStart;');return {contents:text,loader:'js'};});}}],stdin:{contents:readFileSync(resolve(root,'app.js'),'utf8')+hooks,resolveDir:root,sourcefile:'app.js'},bundle:true,format:'esm',minify:false,sourcemap:'inline',outfile:out});
console.log(out);
