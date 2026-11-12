// Test-only build. Run from the repository root; never replace dist/game.js.
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const {build}=createRequire(process.cwd()+'/package.json')('esbuild');
const source=readFileSync('app.js','utf8')+'\nimport {schemaSVG} from "./src/next-switch-view.js";\nwindow.__u3={THREE,scene,camera,renderer,controls,trains,network,nav,renderVehicles,nextSwitchHUD,schemaSVG,guardedStops,viewportOverlays};window.__u4={switchSpecs,network,getSwitchAssistance,route,ui,sidebarUI,sun,getDay:()=>day};window.__serienProfile={effects};';
await build({stdin:{contents:source,resolveDir:process.cwd(),sourcefile:'visual-parity-observer-entry.js'},bundle:true,minify:true,format:'esm',outfile:process.argv[2]||'/workspace/work/visual-parity/observer.js'});
