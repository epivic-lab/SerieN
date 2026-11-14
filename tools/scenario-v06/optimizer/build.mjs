// Offline only. npm ci --prefix tools/scenario-v06/optimizer; npm run build
// --prefix tools/scenario-v06/optimizer. No geometry/decoder dependency at runtime.
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {simplify,inspect,getBounds,dedup,prune} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const base=fileURLToPath(new URL('../../../assets/scenario-v06/',import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const lockBytes=await readFile(path.join(base,'asset-lock.json'));
if(hash(lockBytes)!=='9ede69547d5da2e35eef63d4051d610d13d0647feb9413750f5510172a127499')throw new Error('Original inventory changed');
const lock=JSON.parse(lockBytes),io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
const options={ratio:.05,error:.001,lockBorder:true};
const manifest={schema:'serien-v06-optimized-1',originalLockSha256:hash(lockBytes),
  toolchain:{gltfTransform:'4.2.1',meshoptimizer:'0.23.0'},options,files:[]};
await mkdir(path.join(base,'optimized'),{recursive:true});
const transforms=doc=>doc.getRoot().listNodes().map(n=>({name:n.getName(),matrix:n.getMatrix(),
  instances:n.getExtension('EXT_mesh_gpu_instancing')?.listAttributes().map(a=>({type:a.getType(),count:a.getCount(),sha256:hash(new Uint8Array(a.getArray().buffer,a.getArray().byteOffset,a.getArray().byteLength))}))??[]}));
const geometryStats=doc=>({triangles:inspect(doc).meshes.properties.reduce((n,m)=>n+m.glPrimitives,0),bounds:getBounds(doc.getRoot().listScenes()[0])});
for(const entry of lock.files.filter(f=>!f.path.includes('railway_visual')&&!f.path.includes('technical_reference'))) {
  const original=await readFile(path.join(base,entry.path));
  if(original.length!==entry.bytes||hash(original)!==entry.sha256)throw new Error('Original integrity: '+entry.path);
  const doc=await io.readBinary(original),before=geometryStats(doc),nodes=transforms(doc);
  const decorative=/vegetation|mountain_rocks|gardens_allotments/.test(entry.path);
  const policy={...options,error:decorative?(entry.path.includes('vegetation')?.002:.005):options.error,
    lockBorder:/\/(terrain|mountain|tunnels_portals|station_platform)\.glb$/.test(entry.path)};
  await doc.transform(simplify({simplifier:MeshoptSimplifier,...policy}),dedup(),prune());
  if(JSON.stringify(nodes)!==JSON.stringify(transforms(doc)))throw new Error('Transforms/instances changed: '+entry.path);
  const after=geometryStats(doc),bytes=await io.writeBinary(doc),output='optimized/'+path.basename(entry.path);
  // Bounds may contract slightly through simplification; never translate/scale.
  const boundsDeltaMm=Math.max(...before.bounds.min.map((v,i)=>Math.abs(v-after.bounds.min[i])*1000),...before.bounds.max.map((v,i)=>Math.abs(v-after.bounds.max[i])*1000));
  if(!Number.isFinite(boundsDeltaMm)||boundsDeltaMm>1)throw new Error('Bounds changed over 1mm: '+entry.path);
  await writeFile(path.join(base,output),bytes);
  manifest.files.push({path:output,bytes:bytes.length,sha256:hash(bytes),original:entry.path,originalSha256:entry.sha256,options:policy,before,after,boundsDeltaMm,transformsUnchanged:true});
  console.log(output,before.triangles,'→',after.triangles,'triangles;',original.length,'→',bytes.length,'bytes; bounds Δ',boundsDeltaMm,'mm');
}
await writeFile(path.join(base,'optimized-lock.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Optimized inventory SHA256',hash(await readFile(path.join(base,'optimized-lock.json'))));
