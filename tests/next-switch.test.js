import test from "node:test";
import assert from "node:assert/strict";
import { createNetwork } from "../src/network.js";
import { Journey, routing } from "../src/simulation.js";
import { createSwitchTopology, traceJourney, occupiedRanges, siteSafety, schematicPaths } from "../src/next-switch.js";
import { distanceLabel, previewPoints, routeRibbonGeometry, createRouteHighlight } from "../src/next-switch-view.js";
import * as THREE from "three";

const network=createNetwork();
const ids=["WX-A","WX-B","Y-IN","Y-2","Y-3","Y-R1","Y-R2","Y-4"];
const topology=createSwitchTopology(network,ids.map((id)=>({id,name:id})));
const router=(on=[])=>routing(network,(id)=>on.includes(id));
const preview=(edge,s,direction=1,on=[],offset=0)=>traceJourney(network,topology,new Journey(network,edge,s),direction,offset,router(on));

test("all eight existing controls map to real ports; yard compounds retain their actual valency",()=>{
  assert.equal(topology.byControl.size,8);
  assert.equal(topology.sites.length,6);
  assert.equal(topology.byControl.get("WX-A").nodes.length,4);
  assert.equal(topology.byControl.get("WX-B").nodes.length,4);
  assert.equal(topology.byControl.get("Y-3"),topology.byControl.get("Y-R1"));
  assert.equal(topology.byControl.get("Y-R2"),topology.byControl.get("Y-4"));
  assert.equal(topology.byControl.get("Y-3").paths.length,5);
  assert.equal(topology.byControl.get("Y-2").paths.length,3);
});
test("first switch is measured along each of the three loops in both directions",()=>{
  for(let lane=0;lane<3;lane++) {
    const forward=preview(`L${lane}-0`,10,1);
    assert.equal(forward.next.site.id,lane===2?"WX-B":"WX-A");
    assert.ok(Math.abs(forward.next.distance-(lane===2?412:52))<1e-8);
    const reverse=preview(`L${lane}-0`,10,-1);
    assert.equal(reverse.next.site.id,lane===0?"yard-entry":"WX-B");
    const expected=10+network.edges[`L${lane}-return`].length+12+(lane===0?298:0);
    assert.ok(Math.abs(reverse.next.distance-expected)<1e-8);
    const origin=network.edges[`L${lane}-0`].points[0];
    const target=network.nodes[reverse.next.node];
    assert.ok(target.length>2 && reverse.next.distance>2000);
    assert.ok(Number.isFinite(origin.x));
  }
});
test("both WX310 use the actual router for every entrance, state and direction",()=>{
  for(const id of ["WX-A","WX-B"])for(const node of topology.byControl.get(id).nodes) {
    const site=topology.byControl.get(id);
    for(const port of network.nodes[node].filter((p)=>!site.internal.includes(p.edge)))for(const active of [false,true]) {
      const edge=network.edges[port.edge],direction=port.end?1:-1,s=port.end?edge.length-5:5;
      const p=preview(edge.id,s,direction,active?[id]:[]);
      assert.equal(p.next.site.id,id);
      assert.ok(Math.abs(p.next.distance-5)<1e-8);
      const options=network.nodes[node].filter((c)=>c.edge!==edge.id);
      assert.deepEqual(p.next.outgoing,router(active?[id]:[])(edge.id,options,direction>0));
      assert.ok(p.next.destination?.startsWith("Anello"));
    }
  }
});
test("a train already inside any crossover diagonal reaches its real exit port",()=>{
  for(const id of ["XA0","XA1","XB1","XB2"])for(const direction of [-1,1]) {
    const edge=network.edges[id],p=preview(id,100,direction);
    assert.equal(p.next.site.id,edge.switchId);
    assert.ok(Math.abs(p.next.distance-(direction>0?edge.length-100:100))<1e-8);
    assert.ok(p.next.destination?.startsWith("Anello"));
  }
});
test("yard access, northern turnout, four sidings and both runaround branches are traversed",()=>{
  assert.equal(preview("L0-4",100,-1,["Y-IN"]).next.outgoing.edge,"lead");
  assert.equal(preview("L0-4",100,-1).next.outgoing.edge,"L0-3");
  assert.equal(preview("lead",60,1,["Y-2"]).next.outgoing.edge,"upper");
  assert.equal(preview("lead",60,1).next.outgoing.edge,"approach");
  const west=[[],["Y-R1"],["Y-3"],["Y-3","Y-R1"]];
  const expected=["runMain","lower","middle","middle"];
  west.forEach((state,i)=>{
    const p=preview("approach",20,1,state);
    assert.equal(p.next.site.id,"yard-west");
    assert.equal(p.next.outgoing.edge,expected[i]);
  });
  for(const edge of ["upper","middle","lower","right"]) {
    const forward=preview(edge,network.edges[edge].length-5,1);
    assert.equal(forward.next,null);assert.equal(forward.stop,"terminal");
    assert.ok(Math.abs(forward.distance-5)<1e-8);
    assert.ok(preview(edge,15,-1).next);
  }
  for(const edge of ["runMain","runAround"])for(const on of [[],["Y-4"]]) {
    const p=preview(edge,network.edges[edge].length-10,1,on);
    assert.equal(p.next.site.id,"yard-east");
    assert.equal(p.next.outgoing.edge,on.length?"right":edge==="runMain"?"runAround":"runMain");
    assert.equal(preview(edge,10,-1).next.site.id,"yard-west");
  }
  assert.equal(preview("right",30,-1,["Y-R2"]).next.outgoing.edge,"runAround");
  assert.equal(preview("right",30,-1).next.outgoing.edge,"runMain");
});
test("reverse origin follows the actual last wagon offset, including compact consists",()=>{
  const j=new Journey(network,"runMain",150);
  const a=traceJourney(network,topology,j,-1,90,router());
  const b=traceJourney(network,topology,j,-1,120,router());
  assert.equal(a.next.site.id,"yard-west");
  assert.ok(Math.abs(a.next.distance-60)<1e-8);
  assert.ok(Math.abs(b.next.distance-30)<1e-8);
});
test("preview never changes Journey; conflicting cached routing stops at the exact node",()=>{
  const j=new Journey(network,"L0-0",20),off=router();
  assert.ok(j.ensure(100,off));
  const before=JSON.stringify(j);
  const p=traceJourney(network,topology,j,1,0,router(["WX-A"]));
  assert.equal(JSON.stringify(j),before);
  assert.equal(p.stop,"history-conflict");assert.equal(p.uncertain,true);
  assert.equal(p.next.destination,null);
  assert.deepEqual(p.points.at(-1),{x:440,z:101});
  assert.ok(p.ranges.every((r)=>r.edge!=="XA0"));
});
test("unmapped junctions and missing routing data never invent destinations",()=>{
  const custom={...topology,byNode:new Map(topology.byNode)};
  custom.byNode.delete(network.edges["L0-0"].to);
  const j=new Journey(network,"L0-0",20);
  const p=traceJourney(network,custom,j,1,0,router());
  assert.equal(p.stop,"unmapped-junction");assert.equal(p.uncertain,true);assert.equal(p.next,null);
  const unknown=traceJourney(network,topology,j,1,0,()=>null);
  assert.equal(unknown.stop,"undetermined");assert.equal(unknown.next.destination,null);
});
test("all protected sites lock under occupying bodies; approach uses the stopping envelope",()=>{
  for(const site of topology.sites) {
    const r=site.protectedRanges[0];
    assert.equal(siteSafety(site,[{...r}],[]).kind,"occupied");
  }
  const site=topology.byControl.get("WX-A"),j=new Journey(network,"L0-0",30);
  const occupied=occupiedRanges(network,j,0,{front:{x:40},back:{x:-40}});
  assert.equal(siteSafety(site,occupied,[]).blocked,true);
  const approaching=[{velocity:150,leadingExtent:40,preview:{encounters:[{site,distance:200}]}}];
  assert.equal(siteSafety(site,[],approaching).kind,"approaching");
  approaching[0].preview.encounters[0].distance=500;
  assert.equal(siteSafety(site,[],approaching).blocked,false);
  approaching[0].velocity=0;approaching[0].preview.encounters[0].distance=10;
  assert.equal(siteSafety(site,[],approaching).blocked,false);
});
test("geometry and schematic use measured polylines without smoothing or source mutation",()=>{
  const before=JSON.stringify(network),p=preview("L0-0",20,1,["WX-A"]),schema=schematicPaths(network,p);
  assert.equal(schema.base.length,4);
  assert.ok(schema.selected.some((s)=>s.edge==="XA0"));
  const points=previewPoints(network,p,100);
  assert.deepEqual(previewPoints(network,p).at(-1),p.points.at(-1));
  assert.deepEqual(points[0],{x:398,z:101});
  const range=p.ranges.find((r)=>r.edge==="XA0");
  assert.ok(range);
  const geometry=routeRibbonGeometry(points,2);
  const a=geometry.attributes.position;
  assert.ok(a.array.every(Number.isFinite));
  assert.ok(Math.abs((a.getX(0)+a.getX(1))/2-points[0].x)<1e-5);
  assert.ok(Math.abs((a.getZ(0)+a.getZ(1))/2-points[0].z)<1e-5);
  assert.equal(a.getY(0),Math.fround(8.4));
  assert.equal(JSON.stringify(network),before);
  geometry.dispose();
  const scene=new THREE.Scene(),highlight=createRouteHighlight(scene);
  highlight.update(points,true);assert.equal(highlight.root.visible,true);
  highlight.update([],false);assert.equal(highlight.root.visible,false);
  highlight.dispose();assert.equal(scene.children.length,0);
  assert.equal(distanceLabel(1250),"1,25 m");
});
