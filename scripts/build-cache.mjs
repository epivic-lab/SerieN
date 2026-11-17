import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const hash = data => createHash('sha256').update(data).digest('hex');
const html = await readFile('index.html','utf8');
const core = new Set(['index.html','style.css','cache-client.js','auth-gate.js','auth-gate-core.js','dist/game.js',
  ...[...html.matchAll(/href="\.\/([^"?]+\.css)(?:\?[^" ]*)?"/g)].map(m=>m[1])]);
async function walk(dir) {
 const result=[];
 for(const entry of await readdir(dir,{withFileTypes:true})) {
  const path=dir+'/'+entry.name;
  if(entry.isDirectory()) result.push(...await walk(path));
  else if(/\.(glb|png|jpg|webp|svg|woff2)$/.test(path)) result.push(path);
 }
 return result;
}
const lock=JSON.parse(await readFile('assets/scenario-v06/asset-lock.json'));
const optimized=JSON.parse(await readFile('assets/scenario-v06/optimized-lock.json'));
const scene=lock.files.filter(f=>f.path!=='modules/railway_visual.glb').map(f=>
 'assets/scenario-v06/'+(f.path.includes('technical_reference')?f:optimized.files.find(o=>o.original===f.path&&o.originalSha256===f.sha256)).path);
const paths=new Set([...core,...scene,...['dataset.json','asset-lock.json','optimized-lock.json'].map(f=>'assets/scenario-v06/'+f),
 'docs/jmri-layout/minimap-canonical.svg',...await walk('ui/assets'),...await walk('ui/fonts'),
 ...await walk('assets/br01'),...await walk('assets/kenney'),...await walk('assets/locomotive-thumbnails'),...await walk('assets/rolling-stock-thumbnails')]);
const files=[];
for(const path of [...paths].sort()) {const bytes=await readFile(path);files.push({path,bytes:bytes.length,sha256:hash(bytes),core:core.has(path)});}
const manifest={version:hash(JSON.stringify(files)),files};
const source=await readFile('scripts/cache/worker.js','utf8');
await writeFile('dist/cache-manifest.json',JSON.stringify(manifest,null,2)+'\n');
await writeFile('dist/service-worker.js',source.replace('__SERIEN_MANIFEST__',JSON.stringify(manifest)));
console.log(`Cache manifest: ${files.length} files; ${files.filter(f=>f.core).length} shell resources; version ${manifest.version.slice(0,12)}`);
