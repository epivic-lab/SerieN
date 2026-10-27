import * as THREE from "three";
import { schematicPaths, pathSection } from "./next-switch.js";

function distanceLabel(mm) {
  return mm >= 1000 ? `${(mm/1000).toLocaleString("it-IT",{maximumFractionDigits:2})} m` : `${Math.max(0,Math.round(mm))} mm`;
}
function routeRibbonGeometry(points, width, height=8.4) {
  const vertices=[];
  for(let i=1;i<points.length;i++) {
    const a=points[i-1],b=points[i],length=Math.hypot(b.x-a.x,b.z-a.z);
    if(length<1e-7)continue;
    const nx=-(b.z-a.z)/length*width/2,nz=(b.x-a.x)/length*width/2;
    const p=[a.x+nx,height,a.z+nz,a.x-nx,height,a.z-nz,b.x+nx,height,b.z+nz,
      a.x-nx,height,a.z-nz,b.x-nx,height,b.z-nz,b.x+nx,height,b.z+nz];
    vertices.push(...p);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));
  geometry.computeBoundingSphere();
  return geometry;
}
function createRouteHighlight(scene) {
  const root=new THREE.Group();root.name="Next Switch · itinerario previsto";
  root.userData.dynamic=true;root.visible=false;scene.add(root);
  const meshes=[
    new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshBasicMaterial({color:"#ff314c",transparent:true,opacity:.23,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false})),
    new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshBasicMaterial({color:"#ff4055",transparent:true,opacity:.95,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}))
  ];
  meshes.forEach((m)=>root.add(m));
  return {root,update(points,visible) {
    root.visible=visible && points.length>1;
    if(!root.visible)return;
    meshes.forEach((m,i)=>{m.geometry.dispose();m.geometry=routeRibbonGeometry(points,i?1.15:4);});
  },dispose(){root.removeFromParent();meshes.forEach((m)=>{m.geometry.dispose();m.material.dispose();});}};
}
function previewPoints(network,preview,horizon=Infinity) {
  const points=[];
  for(const range of preview.ranges) {
    const remaining=horizon-range.distance;
    if(remaining<=0)break;
    const length=Math.min(Math.abs(range.to-range.from),remaining);
    const section=pathSection(network.edges[range.edge],range.from,range.from+Math.sign(range.to-range.from)*length);
    if(points.length)section.shift();points.push(...section);
  }
  return points;
}
function schemaSVG(network,preview) {
  const data=schematicPaths(network,preview);
  if(!data.bounds)return "";
  const b=data.bounds, dx=Math.max(1,b.xmax-b.xmin),dz=Math.max(1,b.zmax-b.zmin);
  const line=(points)=>points.map((p)=>`${(16+(p.x-b.xmin)/dx*200).toFixed(2)},${(14+(p.z-b.zmin)/dz*64).toFixed(2)}`).join(" ");
  return `<svg viewBox="0 0 232 92" role="img" aria-label="Connessioni reali; itinerario previsto rosso, altri rami grigi"><defs><marker id="nextSwitchArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#ff5668"/></marker></defs>${data.base.map((p)=>`<polyline points="${line(p.points)}" fill="none" stroke="#829792" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`).join("")}${data.selected.map((p)=>`<polyline points="${line(p.points)}" fill="none" stroke="#ff5668" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round" marker-end="url(#nextSwitchArrow)"/>`).join("")}</svg>`;
}
function mountNextSwitchHUD({host,network,getState,now=()=>performance.now()}) {
  const panel=document.createElement("section");panel.className="nextSwitchHUD";panel.id="nextSwitchHUD";panel.setAttribute("aria-label","Next Switch HUD");
  panel.innerHTML=`<header class="nextSwitchHead"><span>⌁ NEXT SWITCH</span><span class="nextSwitchCompact"></span><button type="button" class="nextSwitchMinimize" aria-expanded="true" aria-controls="nextSwitchBody" aria-label="Minimizza assistente scambi">−</button></header><div id="nextSwitchBody"><div class="nextSwitchTrain"></div><h2 class="nextSwitchName" aria-live="polite"></h2><div class="nextSwitchDistance"></div><div class="nextSwitchScheme"></div><div class="nextSwitchPosition"></div><p class="nextSwitchDestination"></p><p class="nextSwitchWarning" role="status"></p></div>`;
  host.append(panel);
  const find=(cls)=>panel.querySelector(`.${cls}`),set=(cls,value)=>{const e=find(cls);if(e.textContent!==value)e.textContent=value;};
  const body=panel.querySelector("#nextSwitchBody"),minimize=find("nextSwitchMinimize");
  find("nextSwitchDistance").title="Distanza dal centro del veicolo di testa nel verso di marcia, in millimetri del plastico";
  let minimized=host.clientWidth<600,last=0,disposed=false,lastSchema="",latest=null;
  const renderMinimized=()=>{body.hidden=minimized;panel.classList.toggle("is-minimized",minimized);minimize.textContent=minimized?"＋":"−";minimize.setAttribute("aria-expanded",String(!minimized));minimize.setAttribute("aria-label",minimized?"Espandi assistente scambi":"Minimizza assistente scambi");};
  const onMinimize=()=>{minimized=!minimized;renderMinimized();};
  minimize.addEventListener("click",onMinimize);renderMinimized();
  function refresh(force=false) {
    if(disposed)return;
    const time=now();
    if(!force && time-last<200)return;
    last=time;latest=getState();
    const {preview,safety,trainName,inverting,controls}=latest;
    const next=preview.next,uncertain=preview.uncertain || preview.stop==="invalid" || !next && preview.stop==="limit";
    set("nextSwitchTrain",trainName);
    set("nextSwitchName",next?next.site.name:uncertain?"Percorso non determinabile":"Percorso libero da deviatoi");
    find("nextSwitchName").title=next?.site.controls.length>1?"Due comandi condividono questo punto nel tracciato simulato":"";
    set("nextSwitchCompact",next?distanceLabel(next.distance):uncertain?"?":"—");
    set("nextSwitchDistance",next?`${distanceLabel(next.distance)} · lungo binario` : preview.stop==="terminal"?`Fine binario a ${distanceLabel(preview.distance)}`:"");
    set("nextSwitchPosition",next?next.site.controls.map((id)=>`${id}: ${controls.find((s)=>s.id===id)?.on?"deviato":"diritto"}`).join(" · "):"");
    set("nextSwitchDestination",next?.destination?`Uscita prevista: ${next.destination}`:"Destinazione non determinata");
    const warnings=[];
    if(safety?.blocked)warnings.push(safety.message);
    if(uncertain)warnings.push(preview.stop==="history-conflict"?"Percorso memorizzato diverso dallo scambio: anteprima interrotta":"Dati insufficienti: anteprima interrotta");
    if(inverting)warnings.push("Frenata per inversione: mostrato il verso effettivo");
    set("nextSwitchWarning",warnings.join(". "));
    find("nextSwitchWarning").hidden=!warnings.length;
    panel.classList.toggle("has-warning",warnings.length>0);
    const svg=schemaSVG(network,preview);
    if(svg!==lastSchema){find("nextSwitchScheme").innerHTML=svg;lastSchema=svg;}

  }
  refresh(true);
  return {panel,refresh,dispose(){disposed=true;minimize.removeEventListener("click",onMinimize);panel.remove();},get snapshot(){return latest;}};
}
export { distanceLabel, routeRibbonGeometry, previewPoints, schemaSVG, createRouteHighlight, mountNextSwitchHUD };
