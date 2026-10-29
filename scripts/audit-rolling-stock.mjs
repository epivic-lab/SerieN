import{buildStock,STOCK}from '../src/rolling-stock.js';
import{Box3,Vector3}from 'three';
import{readFileSync,writeFileSync,readdirSync}from 'node:fs';
const output=new URL('../docs/phase-4/',import.meta.url),native={},kenney={};
for(const kind of Object.keys(STOCK)){
 const g=buildStock(kind);let triangles=0,meshes=0;const geometries=new Set();
 g.traverse(o=>{if(o.isMesh){triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;meshes++;geometries.add(o.geometry);}});
 native[kind]={...STOCK[kind],triangles,meshes,straightBounds:new Box3().setFromObject(g).getSize(new Vector3()).toArray(),format:'procedural Three.js',textures:[],license:'original project geometry',animations:{axles:g.stockRig.wheels.length,articulatedBodies:g.stockRig.bogies.length,couplingRods:g.stockRig.rods.length,pistonRods:g.stockRig.pistons.length},orientation:'+X forward, Y up, wheels on 5.95mm rail head'};
 geometries.forEach(g=>g.dispose());
}
const assets=new URL('../assets/kenney/',import.meta.url);
for(const name of readdirSync(assets).filter(n=>n.endsWith('.glb'))){
 const b=readFileSync(new URL(name,assets)),g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString());let triangles=0;
 for(const m of g.meshes??[])for(const p of m.primitives)triangles+=g.accessors[p.indices??p.attributes.POSITION].count/3;
 kenney[name]={triangles,bytes:b.length,nodes:g.nodes.length,animations:g.animations?.length??0,license:'Kenney Train Kit 1.1 CC0',orientation:'GLB +Z remapped to scene +X; uniform fitting, not prototype scale',wheelAnimation:'unsupported: welded wheel sets with off-centre pivots, preserved without invented rotation'};
}
const png=readFileSync(new URL('Textures/colormap.png',assets));kenney.texture={path:'assets/kenney/Textures/colormap.png',width:png.readUInt32BE(16),height:png.readUInt32BE(20)};
for(const [name,data]of Object.entries({'native-audit':native,'kenney-audit':kenney}))writeFileSync(new URL(name+'.json',output),JSON.stringify(data,null,2)+'\n');
