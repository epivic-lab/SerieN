import test from 'node:test';import assert from 'node:assert/strict';
import {createNetwork,loopPosition} from '../src/network.js';
import {Journey,routing} from '../src/simulation.js';
import {createSwitchTopology,traceJourney,occupiedRanges,siteSafety,schematicPaths} from '../src/next-switch.js';
import {distanceLabel,previewPoints,routeRibbonGeometry,createRouteHighlight} from '../src/next-switch-view.js';
import * as THREE from 'three';
const n=createNetwork(),topology=createSwitchTopology(n,n.controllers),route=(on=[])=>routing(n,id=>on.includes(id));
const preview=(id,s,direction=1,on=[],offset=0)=>traceJourney(n,topology,new Journey(n,id,s),direction,offset,route(on));
test('eight controls represent six distinct single turnouts and two complete crossover units',()=>{
  assert.equal(topology.sites.length,8);assert.equal(topology.byControl.size,8);
  assert.notEqual(topology.byControl.get('Y-3'),topology.byControl.get('Y-R1'));
  for(const c of n.controllers){const site=topology.byControl.get(c.id);assert.deepEqual(site.internal,c.internal);assert.equal(site.paths.length,c.kind==='cross'?4:2);}
});
test('each loop previews the first real switch by graph distance in either direction',()=>{
  for(let lane=0;lane<3;lane++)for(const direction of [-1,1]){
    const start=loopPosition(n,lane,.2),j=new Journey(n,start.edge,start.s),before=JSON.stringify(j),p=traceJourney(n,topology,j,direction,0,route());
    assert.ok(p.next&&p.next.distance>0);assert.equal(p.uncertain,false);assert.equal(p.stop,'cycle');assert.equal(JSON.stringify(j),before);
    assert.ok(p.next.distance<=n.mainLoops[lane].length);
    assert.ok(Math.abs(p.next.distance-p.ranges.filter(r=>r.distance<p.next.distance-1e-6).reduce((sum,r)=>sum+Math.abs(r.to-r.from),0))<1e-5);
  }
});
test('every WX entrance uses the real selection in both states, with exact five millimetre approach',()=>{
  for(const id of ['WX-A','WX-B']){const site=topology.byControl.get(id);
    for(const node of site.nodes)for(const port of n.nodes[node].filter(p=>!site.internal.includes(p.edge)))for(const on of [[],[id]]){
      const edge=n.edges[port.edge],p=preview(edge.id,port.end?edge.length-5:5,port.end?1:-1,on);
      assert.equal(p.next.site.id,id);assert.ok(Math.abs(p.next.distance-5)<1e-7);assert.ok(p.next.destination.startsWith('Anello'));
      const outgoing=n.edges[p.next.outgoing.edge];assert.equal(outgoing.requiredState,on.length===1);
    }
  }
});
test('four terminals are real end nodes; reverse preview and wagon offsets follow actual ribbon',()=>{
  for(const edge of Object.values(n.edges).filter(e=>e.terminal)){
    const terminalEnd=n.metadata.nodes[edge.to].terminal?1:0;
    const p=preview(edge.id,terminalEnd?edge.length-5:5,terminalEnd?1:-1);
    assert.equal(p.next,null);assert.equal(p.stop,'terminal');assert.ok(Math.abs(p.distance-5)<1e-7);
  }
  const j=new Journey(n,'T40',150),a=traceJourney(n,topology,j,-1,30,route()),b=traceJourney(n,topology,j,-1,60,route());
  assert.equal(a.next.site.id,'Y-R1');assert.ok(Math.abs(a.next.distance-b.next.distance-30)<1e-8);
});
test('yard topology identifies both accesses and runaround branch switch states rather than old five-way junctions',()=>{
  assert.equal(preview('TO3:AB',60,1,['Y-IN']).next.outgoing.edge,'TO0:AC');
  assert.equal(preview('T27',20,-1,['Y-3']).next.outgoing.edge,'TO3:AC');
  assert.equal(preview('T40',20,-1,['Y-R1']).next.outgoing,null,'misaligned branch cannot be trailed');
  assert.equal(preview('T43',20,-1,['Y-R1','Y-R2']).next.site.id,'Y-4');
});
test('cached route conflicts stop prediction; safe reconciliation makes the current selection authoritative',()=>{
  const j=new Journey(n,'T33',50);j.ensure(500,route());const before=JSON.stringify(j);
  const p=traceJourney(n,topology,j,1,0,route(['WX-B']));assert.equal(p.stop,'history-conflict');assert.equal(p.uncertain,true);assert.equal(JSON.stringify(j),before);
  j.reconcile(20,10,route(['WX-B']));const fresh=traceJourney(n,topology,j,1,0,route(['WX-B']));assert.notEqual(fresh.stop,'history-conflict');assert.equal(fresh.next.outgoing.edge,'WX-B:up');
});
test('missing mapping and unavailable routing never invent destinations',()=>{
  const custom={...topology,byNode:new Map(topology.byNode)};custom.byNode.delete(n.edges.T33.from);
  const p=traceJourney(n,custom,new Journey(n,'T33',10),-1,0,route());assert.equal(p.stop,'unmapped-junction');assert.equal(p.next,null);
  const unknown=preview('T47',30,-1);assert.equal(unknown.next.destination,null);assert.equal(unknown.stop,'misaligned');
});
test('occupied switch bodies, incident tracks and braking envelopes block unsafe commands',()=>{
  for(const site of topology.sites)assert.equal(siteSafety(site,[site.protectedRanges[0]],[]).kind,'occupied');
  const site=topology.byControl.get('WX-A'),j=new Journey(n,'T33',10);
  assert.equal(siteSafety(site,occupiedRanges(n,j,0,{front:{x:40},back:{x:-40}}),[]).blocked,true);
  const moving=[{velocity:150,leadingExtent:40,preview:{encounters:[{site,distance:200}]}}];assert.equal(siteSafety(site,[],moving).kind,'approaching');
  moving[0].preview.encounters[0].distance=500;assert.equal(siteSafety(site,[],moving).blocked,false);
});
test('schematic and temporary red ribbon derive exactly from canonical paths without mutating rails',()=>{
  const before=JSON.stringify(n),p=preview('T33',10,-1,['WX-A']),schema=schematicPaths(n,p);assert.equal(schema.base.length,4);assert.ok(schema.selected.some(s=>s.edge==='WX-A:up'));
  const points=previewPoints(n,p,500),g=routeRibbonGeometry(points,2);assert.ok(g.attributes.position.array.every(Number.isFinite));assert.equal(g.attributes.position.getY(0),Math.fround(8.4));g.dispose();
  const scene=new THREE.Scene(),highlight=createRouteHighlight(scene);highlight.update(points,true);assert.equal(highlight.root.visible,true);highlight.update([],false);assert.equal(highlight.root.visible,false);highlight.dispose();assert.equal(scene.children.length,0);
  assert.equal(JSON.stringify(n),before);assert.equal(distanceLabel(1250),'1,25 m');
});
