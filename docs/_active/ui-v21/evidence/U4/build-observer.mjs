// Isolated test observer, never installed in dist. No engine/scene substitutions.
import {build} from 'esbuild';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const hooks = `
import {createGuardedBell as observerBellFactory} from './src/guarded-stop-bell.js';
import {schemaSVG as observerSchemaSVG} from './src/next-switch-view.js';
window.__u3={THREE,camera,controls,nav,views,guardedStops,viewportOverlays,turnoutPicking,turnoutInteraction,trains,network,renderer,scene,renderVehicles,nextSwitchHUD,uiShell,routeHighlight,tick,schemaSVG:observerSchemaSVG};
window.__serienProfile={camera,controls,trains,network,renderer,scene,effects,
 stop(){cancelAnimationFrame(animationHandle);renderer.getContext().finish();},
 renderFixed(){paused=true;controls.enableDamping=false;controls.update();camera.position.set(1580,1150,1570);camera.zoom=1;camera.updateProjectionMatrix();controls.target.set(750,0,350);controls.update();last=performance.now();tick(last);cancelAnimationFrame(animationHandle);renderer.getContext().finish();}
};
window.__u4={sidebarUI,ui,getSwitchAssistance,switchSpecs,route,sun,getDay:()=>day};window.__s4={switchSpecs,route};
window.__s2={THREE,interaction:turnoutInteraction,picking:turnoutPicking};
window.__s6=guardedStops;window.__s6Tick=tick;window.__s6BellFactory=observerBellFactory;
`;
const profileHooks=process.argv.includes('--native-profile') ? hooks.replace(
 'stop(){cancelAnimationFrame(animationHandle);renderer.getContext().finish();},',
 'stop(){cancelAnimationFrame(animationHandle);window.__regressionNative=false;renderer.getContext().finish();},\n resume(){window.__regressionNative=true;last=performance.now();animationHandle=requestAnimationFrame(tick);},'
) : hooks;
await build({stdin:{contents:readFileSync('app.js','utf8')+profileHooks,resolveDir:process.cwd(),sourcefile:'app.js'},bundle:true,minify:false,format:'esm',outfile:resolve(process.argv[2])});
