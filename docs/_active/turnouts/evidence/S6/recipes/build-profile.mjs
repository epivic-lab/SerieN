import {execFileSync} from 'node:child_process';import{appendFileSync}from'node:fs';import{resolve}from'node:path';
const root=resolve(process.argv[2]??'.'),out=resolve(process.argv[3]??'/workspace/work/s6/profile.js');
execFileSync(process.execPath,[resolve(root,'docs/_active/turnouts/evidence/S4/recipes/build-profile.mjs'),root,out],{stdio:'inherit'});
appendFileSync(out,'\nwindow.__s6=guardedStops;window.__s6Tick=tick;window.__s6BellFactory=createGuardedBell;\n');
