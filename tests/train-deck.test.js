import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {RecentConsoles,MAP_VIEWBOX,railwayMapPath,locomotivePoint,operatingState} from "../src/train-deck-state.js";
import {thumbnailKey,thumbnailURL} from "../src/locomotive-thumbnails.js";
import {createNetwork,sample,loopPosition} from "../src/network.js";
import {Journey,routing} from "../src/simulation.js";

test("three recent consoles retain slots, replace the least recent, and handle smaller fleets",()=>{
  const deck=new RecentConsoles(),ids=Object.freeze([0,1,2,3,4]);
  assert.deepEqual(deck.sync([0,1,2],0),[0,1,2]);
  assert.deepEqual(deck.select(1,ids),[0,1,2]);
  assert.deepEqual(deck.select(3,ids),[0,1,3]);
  assert.deepEqual(deck.recent.slice(0,3),[3,1,0]);
  assert.deepEqual(deck.select(2,ids),[2,1,3]);
  assert.deepEqual(deck.select(4,ids),[2,4,3]);
  assert.deepEqual(deck.sync([4,2],4),[2,4]);
  assert.deepEqual(deck.sync([4],4),[4]);
  assert.deepEqual(deck.sync([],undefined),[]);
  assert.throws(()=>new RecentConsoles(0));
});
test("console selection and eviction do not modify any actual train Journey or controls",()=>{
  const n=createNetwork(),route=routing(n,()=>false),deck=new RecentConsoles();
  const trains=Array.from({length:5},(_,id)=>({id,speed:id*10,dir:1,journey:(()=>{const p=loopPosition(n,id%3,.4);return new Journey(n,p.edge,p.s);})()}));
  const before=JSON.stringify(trains);
  deck.sync(trains.map((t)=>t.id),0);
  [4,1,3,2,0,4].forEach((id)=>deck.select(id,trains.map((t)=>t.id)));
  assert.equal(JSON.stringify(trains),before);
  const hidden=trains.find((t)=>!deck.slots.includes(t.id)),old=hidden.journey.position;
  assert.ok(hidden.journey.move(50,0,route));
  deck.select(hidden.id,trains.map((t)=>t.id));
  assert.equal(hidden.journey.position,old+50);
  const {angle,...expected}=hidden.journey.locate();
  assert.deepEqual(locomotivePoint(hidden),expected);
});
test("minimap geometry uses every original railway point with one unmodified coordinate system",()=>{
  const n=createNetwork(),d=railwayMapPath(n);
  assert.equal(MAP_VIEWBOX,"0 0 1500 700");
  assert.equal((d.match(/M/g)??[]).length,75);
  for(const edge of Object.values(n.edges))for(const p of edge.points)assert.ok(d.includes(`${p.x},${p.z}`));
  for(const id of ["WX-A:up","WX-A:down","WX-B:up","WX-B:down","T40","T43","T50","T30","T37","T39"])assert.ok(d.includes(`M${n.edges[id].points[0].x},${n.edges[id].points[0].z}`));
});
test("independent markers follow locomotive centres through curves, crossovers and reversal",()=>{
  const n=createNetwork(),route=routing(n,(id)=>id==="WX-A");
  const trains=[0,1,2].map((id)=>({id,journey:new Journey(n,["T18","T5","T8"][id],100)}));
  let crossed=false;
  for(let tick=0;tick<650;tick++)for(const t of trains){
    assert.ok(t.journey.move(1,0,route));
    const p=locomotivePoint(t),exact=sample(n.edges[p.edge],p.s);
    assert.ok(Math.hypot(p.x-exact.x,p.z-exact.z)<1e-10);
    crossed ||= p.edge.startsWith("WX-A:");
  }
  assert.ok(crossed);
  const before=trains.map(locomotivePoint);
  for(const t of trains){assert.ok(t.journey.move(30,0,route));assert.ok(t.journey.move(-30,0,route));}
  trains.forEach((t,i)=>assert.ok(Math.hypot(locomotivePoint(t).x-before[i].x,locomotivePoint(t).z-before[i].z)<1e-8));
  assert.equal(locomotivePoint({}),null);
});
test("sidings and runaround markers use actual locomotive position rather than the tail",()=>{
  const n=createNetwork(),route=routing(n,()=>false);
  for(const edge of ["T50","T29","T40","T47","T43"]){
    const t={journey:new Journey(n,edge,100),cars:3};
    const before=locomotivePoint(t);
    assert.ok(t.journey.move(10,0,route));
    assert.equal(locomotivePoint(t).s,110);
    assert.ok(t.journey.move(-10,0,route));
    assert.deepEqual(locomotivePoint(t),before);
  }
});
test("thumbnail identity follows the actual visible model, including fallback after failed GLB loading",()=>{
  const t={id:0,modelKey:"diesel",group:{userData:{}}};
  assert.equal(thumbnailKey(t),"native-diesel");
  t.group.userData.assetDimensions={source:"Kenney CC0"};
  assert.equal(thumbnailKey(t),"kenney-diesel");
  assert.equal(thumbnailURL(t),"./assets/locomotive-thumbnails/kenney-diesel.png");
  delete t.group.userData.assetDimensions;
  assert.equal(thumbnailKey(t),"native-diesel");
  assert.equal(operatingState({velocity:0,speed:0}),"Fermo");
  assert.equal(operatingState({velocity:20,dir:-1}),"In marcia · retromarcia");
});
test("six distinct transparent thumbnails are tied to their real model sources",()=>{
  const root=new URL("../assets/locomotive-thumbnails/",import.meta.url);
  const manifest=JSON.parse(readFileSync(new URL("manifest.json",root))),hashes=new Set();
  for(const [key,entry] of Object.entries(manifest.captures)){
    const png=readFileSync(new URL(key+".png",root));
    assert.equal(png.subarray(1,4).toString(),"PNG");
    assert.equal(png.readUInt32BE(16),320);assert.equal(png.readUInt32BE(20),160);
    assert.equal(png[25],6); // RGBA, including transparent background.
    const hash=createHash("sha256").update(png).digest("hex");hashes.add(hash);
    assert.equal(hash,entry.imageSha256);
    assert.ok(entry.bounds.length>0 && entry.bounds.width>0 && entry.bounds.height>0);
    const source=readFileSync(new URL("../"+entry.source,import.meta.url));
    assert.equal(createHash("sha256").update(source).digest("hex"),entry.sourceSha256);
    if(entry.variant==="native"){
      const app=readFileSync(new URL("../app.js",import.meta.url),"utf8"),native=app.slice(app.indexOf("const railWheel ="),app.indexOf("const trains ="));
      assert.equal(createHash("sha256").update(native).update(source).digest("hex"),entry.nativeModelSha256);
    }
  }
  assert.equal(hashes.size,6);
});
