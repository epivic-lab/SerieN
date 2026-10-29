import canonical from "./canonical-layout.json" with {type:"json"};
import { clearance, forestSites } from "./landscape.js";
import { buildZoneLayout, FARM, GOODS_OFFICE, VINEYARD } from "./zone-layout.js";
import { STATION_SPEC } from "./station-building.js";
import { BRIDGE, bridgeAt } from "./structure-layout.js";

// Shared with the renderer: phase 0 catalogues existing buildings in place.
const LEGACY_BUILDINGS = [
  { id: "house-west", x: 280, z: 455, w: 75, d: 54, h: 48, style: 0, roof: 0 },
  { id: "house-central", x: 583, z: 449, w: 80, d: 57, h: 62, style: 1, roof: 0 },
  { id: "factory-east", x: 1033, z: 333, w: 125, d: 80, h: 52, style: 2, roof: 0, type: "factory" },
  { id: "factory-east-small", x: 1165, z: 338, w: 77, d: 58, h: 45, style: 3, roof: 1, type: "factory" },
  { id: "factory-west", x: 360, z: 390, w: 120, d: 68, h: 51, style: 2, roof: 1, type: "factory" },
  { id: "factory-north", x: 480, z: 440, w: 80, d: 55, h: 43, style: 2, roof: 0, type: "factory" }
];
const ZONES = [
  { id: "Z1", name: "Stazione", color: "#bc784c", polygons: [[[580,470],[925,470],[925,570],[580,570]]] },
  { id: "Z2", name: "Scalo e runaround", color: "#a58b50", polygons: [[[140,180],[480,140],[835,90],[1300,210],[1300,400],[140,400]]] },
  { id: "Z3", name: "Boschi e pendii", color: "#54866c", polygons: [[[80,120],[360,115],[530,300],[880,325],[930,470],[610,475],[145,470]]] },
  { id: "Z4", name: "Ponte e margine destro (senza galleria)", color: "#7c899e", polygons: [[[1260,100],[1480,100],[1480,550],[1240,550],[1190,390]],[[385,45],[448,45],[448,100],[385,100]]] },
  { id: "Z5", name: "Campagna sul retro", color: "#9a9d4b", polygons: [[[500,5],[1160,5],[1240,195],[900,230],[600,155]]] }
];
const SWITCH_LANDMARKS=canonical.controllers.map(({id,x,z})=>({id,x,z,radius:40}));
const EXISTING_PROP_GROUPS = [
  {id:"timber-stack",zone:"Z2",x:1106,z:304,w:120,d:30,h:20},
  {id:"water-tower",zone:"Z2",x:915,z:331,w:38,d:38,h:80},
  ...[[240,390,180],[1000,399,240],[480,385,180]].map(([x,z,w],i)=>({id:`stone-wall-${i}`,zone:"Z3",x:x+w/2,z,w,d:5,h:10}))
];
function insidePolygon(x, z, polygon) {
  let inside = false;
  for (let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
    const [ax,az]=polygon[i], [bx,bz]=polygon[j];
    if ((az>z)!==(bz>z) && x<(bx-ax)*(z-az)/(bz-az)+ax) inside=!inside;
  }
  return inside;
}
function footprintTrackDistance(b, network) {
  const xmin=b.x-b.w/2, xmax=b.x+b.w/2, zmin=b.z-b.d/2, zmax=b.z+b.d/2;
  let best=Infinity;
  const pointDistance=(p)=>Math.hypot(Math.max(xmin-p.x,0,p.x-xmax),Math.max(zmin-p.z,0,p.z-zmax));
  for(const edge of Object.values(network.edges))for(let i=1;i<edge.points.length;i++) {
    const a=edge.points[i-1],c=edge.points[i],dx=c.x-a.x,dz=c.z-a.z;
    best=Math.min(best,pointDistance(a),pointDistance(c));
    for(const x of [xmin,xmax])if(dx) {
      const t=(x-a.x)/dx,z=a.z+t*dz;
      if(t>=0 && t<=1 && z>=zmin && z<=zmax)return 0;
    }
    for(const z of [zmin,zmax])if(dz) {
      const t=(z-a.z)/dz,x=a.x+t*dx;
      if(t>=0 && t<=1 && x>=xmin && x<=xmax)return 0;
    }
    for(const x of [xmin,xmax])for(const z of [zmin,zmax]) {
      const t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));
      best=Math.min(best,Math.hypot(x-a.x-t*dx,z-a.z-t*dz));
    }
  }
  return best;
}
function createScenicPlan(network) {
  const buildings = [...LEGACY_BUILDINGS, { ...STATION_SPEC, id:"station" }, FARM, GOODS_OFFICE];
  const layout = buildZoneLayout(network, clearance(network, buildings.slice(0,7)));
  const mask = clearance(network, buildings);
  mask.reserved = (x,z) => bridgeAt(x,z) || layout.footprints.some((f) => f.kind==="reserve" && Math.abs(x-f.x)<=f.w/2 && Math.abs(z-f.z)<=f.d/2);
  const trees = forestSites(mask);
  const existingConflicts=buildings.map((b)=>({id:b.id,minTrackDistance:footprintTrackDistance(b,network),
    basis:"nominal footprint versus 18mm conservative track corridor; verify actual 3D envelope"})).filter((b)=>b.minTrackDistance<18);
  const object = (id,zone,anchor,footprint,extra={}) => ({id,zone,anchor,footprint,
    rotation:0,scaleN:"1:160",clearance:"verify full object envelope before placement",
    assetPath:null,materialVariant:"original procedural",lodPolicy:"existing quality profiles",
    nightLight:false,license:"original project geometry",status:"existing",...extra});
  const catalog = [
    ...buildings.map((b) => object(b.id==="station"?"Z1.01":b.id==="farmhouse"?"Z5.01":b.id==="goods-office"?"Z2.04":`existing.${b.id}`,
      b.id==="station"?"Z1":b.id==="farmhouse"?"Z5":"Z2",{x:b.x,z:b.z},{w:b.w,d:b.d,h:b.h},
      {nightLight:true, status:b.id==="farmhouse"?"phase 3; rear countryside":"existing"})),
    ...EXISTING_PROP_GROUPS.map((p)=>object(`existing.${p.id}`,p.zone,{x:p.x,z:p.z},{w:p.w,d:p.d,h:p.h})),
    object("Z1.02","Z1",{x:750,z:550},{w:270,d:18,h:4.5}),
    object("Z1.03","Z1",{x:750,z:551.5},{w:270,d:18,h:30},{nightLight:true}),
    object("Z4.04","Z4",{x:BRIDGE.x,z:BRIDGE.z},{w:44,d:28,h:22},{status:"existing; scenic location, not CAD certified"}),
    object("Z5.02","Z5",{x:VINEYARD.x,z:VINEYARD.z},{w:VINEYARD.w,d:VINEYARD.d},{status:"phase 3; rear countryside"}),
    ...layout.cargo.map((p) => object(`Z2.cargo.${p.id}`,"Z2",{x:p.x,z:p.z},{w:16,d:16},{rotation:p.rotation,materialVariant:p.type})),
    ...trees.map((t,i) => object(`Z3.tree.${i}`,"Z3",{x:t.x,z:t.z},{w:t.h*.8,d:t.h*.8,h:t.h},{rotation:t.rotation,materialVariant:t.pine?"conifer":t.species,lodPolicy:"instanced; volumetric crown high/cinema"})),
    ...Object.values(network.edges).filter(e=>e.role?.startsWith("runaround")||e.terminal).map(e=>object(`Z2.track.${e.id}`,"Z2",{edge:e.id},null,{status:"canonical railway; protected",clearance:"entire edge and connected switches"})),
    object("Z4.01","Z4",null,null,{status:"excluded by user: no tunnel",lodPolicy:null})
  ];
  // Indicative free centres for small props with radius <=5mm; NOT building lots.
  // 18mm track envelope +5mm prop radius +1mm margin; switches remain readable.
  const freeCells = [];
  for (let x=10;x<1500;x+=10) for(let z=10;z<700;z+=10) {
    if(mask.track(x,z)<24 || mask.building(x,z,10) || mask.road(x,z) || mask.reserved(x,z)
      || x>610 && x<890 && z>536 && z<565
      || SWITCH_LANDMARKS.some((s)=>Math.hypot(x-s.x,z-s.z)<s.radius+5)
      || EXISTING_PROP_GROUPS.some((p)=>Math.abs(x-p.x)<p.w/2+5 && Math.abs(z-p.z)<p.d/2+5)
      || trees.some((t)=>Math.hypot(x-t.x,z-t.z)<t.h*.4+5))continue;
    const zones=ZONES.filter((zone)=>zone.polygons.some((p)=>insidePolygon(x,z,p))).map((zone)=>zone.id);
    if(zones.length)freeCells.push({x,z,zones});
  }
  return {units:"layout mm",base:{w:1500,d:700},scale:"1:160",tunnel:false,
    coordinates:{scene:"X along base, Z toward visitor, Y up",briefToScene:"x=X; z=700-Y; y=Z"},
    zones:ZONES,switches:SWITCH_LANDMARKS,buildings,trees,catalog,freeCells,existingConflicts,
    freeCellRule:{step:10,maxPropRadius:5,minTrackDistance:24,switchRadius:45,note:"Candidate centres only; polygons are artistic regions, not buildable boundaries. Verify full swept stock, object footprint, small rocks/shrubs and pedestrian access locally."},
    pendingStops:layout.pendingStops,knownGaps:[
      "Export JMRI integrato: profili interni dei WX310 ricostruiti con provenienza documentata, da verificare sul pezzo fisico.",
      "Quattro terminali riconciliati: i respingenti sono sugli estremi reali, senza prolunghe. Lunghezze utili e fouling richiedono collaudo fisico.",
      "Il fabbricato ovest è stato spostato per liberare i binari del nuovo grafo; ruolo e accessi restano scenografici.",
      "Posizione del ponte e accesso al sottopasso sono scenografici e richiedono un riferimento misurato del plastico."
    ]};
}
export { LEGACY_BUILDINGS, ZONES, SWITCH_LANDMARKS, insidePolygon, footprintTrackDistance, createScenicPlan };
