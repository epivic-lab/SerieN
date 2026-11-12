import {consistLayout} from './consist.js';
import {RecentConsoles,MAP_VIEWBOX,railwayMapPath,locomotivePoint,operatingState} from "./train-deck-state.js";
import {thumbnailKey,thumbnailURL,THUMBNAIL_FALLBACK} from "./locomotive-thumbnails.js";
import {speedometer, speedometerDefinitions} from './ui/speedometer.js';

let deckSequence=0;
function mountTrainDeck({host,tabs,network,getTrains,getSelected,isPaused,onSelect,onSpeed,onReverse,onStop,onLights,onUncouple,onCouple,onFocus}) {
  tabs.setAttribute('role','group');
  const recent=new RecentConsoles(3),cards=new Map(),selectors=new Map(),symbolId=`railway-miniature-${++deckSequence}`;
  const ns="http://www.w3.org/2000/svg",definitions=document.createElementNS(ns,"svg");
  definitions.classList.add("railwayDefinitions");definitions.setAttribute("aria-hidden","true");definitions.setAttribute("width","0");definitions.setAttribute("height","0");
  const defs=document.createElementNS(ns,"defs"),symbol=document.createElementNS(ns,"g"),path=document.createElementNS(ns,"path");
  symbol.id=symbolId;path.setAttribute("d",railwayMapPath(network));path.setAttribute("fill","none");path.setAttribute("stroke","#b9ccc1");path.setAttribute("stroke-width","5");path.setAttribute("stroke-linecap","round");path.setAttribute("stroke-linejoin","round");symbol.append(path);defs.append(symbol);definitions.append(defs);host.before(definitions);
  defs.insertAdjacentHTML('beforeend',speedometerDefinitions(symbolId));
  let disposed=false;
  const setText=(element,text)=>{if(element.textContent!==text)element.textContent=text;};
  function setThumbnail(img,train) {
    const key=thumbnailKey(train);
    if(img.dataset.thumbnailKey!==key){img.dataset.thumbnailKey=key;img.dataset.fallback="false";img.src=thumbnailURL(train);}
    img.alt=img.dataset.fallback==="true"?`Thumbnail unavailable for ${train.name}`:`Locomotive ${train.name}, three-quarter view`;
  }
  function prepareImage(img) {
    img.decoding="async";img.width=320;img.height=160;
    img.onerror=()=>{if(img.dataset.fallback!=="true"){img.dataset.fallback="true";img.src=THUMBNAIL_FALLBACK;img.alt="Locomotive thumbnail unavailable";}};
  }
  function makeCard(train) {
    const root=document.createElement("article");root.className="trainConsole";root.dataset.consoleTrain=train.id;root.setAttribute("aria-label",`Controls for ${train.name}`);
    root.classList.add('tr');
    root.innerHTML=`<div class="tri"><div class="trainActual">${speedometer(symbolId)}<output class="actualSpeed" aria-label="Actual speed"></output><meter class="sr-only" min="0" max="150" value="0" aria-label="Actual speed, layout units per second"></meter></div><div class="trainConsoleBody"><header class="trainConsoleHeading r"><button type="button" class="trainConsoleSelect nm"><i class="tg" aria-hidden="true"></i><img class="locomotiveThumbnail" draggable="false"><strong class="trainConsoleName"></strong></button><span class="trainConsoleState pl"></span><button type="button" class="railwayMiniMap"><svg viewBox="${MAP_VIEWBOX}" preserveAspectRatio="xMidYMid meet" role="img"><use href="#${symbolId}"/><circle class="trainMapGlow" r="34"/><circle class="trainMapMarker" r="17"/></svg></button></header><div class="trainConsoleMeta cap"><span class="trainConsoleDescription"></span><span class="trainConsoleCars"></span><span class="trainConsoleCars trainConsoleLength"></span></div><div class="trainConsoleSpeed row"><label><span class="sr-only">Throttle</span><input type="range" class="thr" min="0" max="100" step="1"><output class="pc"></output></label></div><div class="trainConsoleCommands bs">${[['reverse','rev','Reverse direction','Reverse'],['stop','stop','Stop this train','Stop'],['lights','lt','Toggle headlights','Lights'],['uncouple','unc','Uncouple the last wagon','Uncouple'],['couple','cpl','Couple the nearest wagon','Couple']].map(([command,icon,label,text])=>`<button type="button" class="bt d" data-command="${command}" title="${label}" aria-label="${label}"><svg class="ic" aria-hidden="true"><use href="./ui/assets/svg/serien-sprite.svg#i-${icon}"/></svg><span>${text}</span></button>`).join('')}</div></div></div><span class="trainConsoleRoute" hidden></span>`;
    const find=(s)=>root.querySelector(s),img=find("img"),slider=find("input"),map=find(".railwayMiniMap"),marker=find(".trainMapMarker"),glow=find(".trainMapGlow");
    prepareImage(img);
    const select=()=>onSelect(train.id);
    find(".trainConsoleSelect").onclick=select;
    img.onclick=select;
    slider.setAttribute("aria-label",`Throttle of ${train.name}`);
    slider.onpointerdown=select;
    slider.oninput=()=>{const value=Number(slider.value);onSelect(train.id);onSpeed(train.id,value);};
    for(const [action,callback] of Object.entries({reverse:onReverse,stop:onStop,lights:onLights,uncouple:onUncouple,couple:onCouple}))find(`[data-command="${action}"]`).onclick=()=>{onSelect(train.id);callback(train.id);};
    map.onclick=()=>{onSelect(train.id);onFocus(train.id);};
    return {root,img,slider,map,marker,glow,actual:find(".actualSpeed"),needle:find(".u5-needle"),gauge:find("meter"),name:find(".trainConsoleName"),state:find(".trainConsoleState"),output:find(".trainConsoleSpeed output"),cars:find(".trainConsoleCars"),length:find(".trainConsoleLength"),description:find(".trainConsoleDescription"),route:find(".trainConsoleRoute"),commands:Object.fromEntries([...root.querySelectorAll("[data-command]")].map((b)=>[b.dataset.command,b]))};
  }
  function releaseCard(card){
    card.img.onerror=null;card.root.querySelectorAll("button,img,input").forEach(e=>{e.onclick=null;e.oninput=null;e.onpointerdown=null;});card.root.remove();
  }
  function sync() {
    if(disposed)return;
    const trains=getTrains(),active=getSelected(),ids=trains.map((t)=>t.id),visible=ids;
    recent.sync(ids,active);
    host.style.setProperty("--console-count",String(Math.max(1,visible.length)));host.dataset.count=String(visible.length);
    // Clear active compatibility IDs before assigning them to another card.
    for(const card of cards.values())card.root.querySelectorAll("[id]").forEach((e)=>e.removeAttribute("id"));
    for(const [id,card] of cards)if(!visible.includes(id)){releaseCard(card);cards.delete(id);}
    for(const id of visible)if(!cards.has(id))cards.set(id,makeCard(trains.find((t)=>t.id===id)));
    const ordered=visible.map((id)=>cards.get(id).root);
    ordered.forEach((root,i)=>{if(host.children[i]!==root)host.insertBefore(root,host.children[i]??null);});
    for(const train of trains) {
      let selector=selectors.get(train.id);
      if(!selector){
        selector=document.createElement("button");selector.type="button";selector.className="tab";selector.dataset.train=train.id;
        selector.innerHTML='<img draggable="false" alt=""><span><strong></strong><small></small></span>';
        prepareImage(selector.querySelector("img"));selector.onclick=()=>onSelect(train.id);selectors.set(train.id,selector);tabs.append(selector);
      }
      selector.classList.toggle("active",train.id===active);selector.setAttribute("aria-pressed",String(train.id===active));setThumbnail(selector.querySelector("img"),train);setText(selector.querySelector("strong"),train.name);setText(selector.querySelector("small"),train.mode==="loop"?`LOOP ${train.loop+1}`:"FREIGHT YARD");
      const card=cards.get(train.id);if(!card)continue;
      const selected=train.id===active;
      card.root.classList.toggle("is-active",selected);card.root.setAttribute("aria-label",`Controls for ${train.name}`);
      card.root.classList.toggle('sel',selected);card.root.dataset.model=thumbnailKey(train);
      setThumbnail(card.img,train);setText(card.name,train.name);card.root.querySelector(".trainConsoleSelect").title=train.name;setText(card.description,train.desc);card.description.title=train.desc;setText(card.route,train.mode==="loop"?`LOOP ${train.loop+1}`:network.edges[train.section]?.role?.startsWith("runaround")?"RUNAROUND":"FREIGHT YARD");
      card.map.setAttribute("aria-label",`Focus camera on ${train.name}`);card.map.title=`Focus camera on ${train.name}`;card.map.querySelector("svg").setAttribute("aria-label",`Position of locomotive ${train.name} on the track plan`);
      card.slider.setAttribute("aria-label",`Throttle of ${train.name}`);
      if(Number(card.slider.value)!==train.speed)card.slider.value=String(train.speed);
      setText(card.output,`${train.speed}%`);setText(card.cars,`${train.cars} ${train.cars===1?"wagon":"wagons"}`);
      const vehicles=[train.group,...(train.carObjs??[])].filter(Boolean).map(o=>o.userData);
      const layout=consistLayout(vehicles),length=layout.tail+(vehicles[0]?.couplers?.front?.x??38);
      card.cars.title=`${train.cars} trailing vehicles · ${length.toFixed(1)} mm (1:160)`;
      setText(card.length,`${length.toFixed(0)} mm`);card.length.title=card.cars.title;
      card.commands.lights.classList.toggle("active",train.lights);card.commands.lights.setAttribute("aria-pressed",String(train.lights));
      card.commands.reverse.classList.toggle("active",train.dir<0);card.commands.reverse.setAttribute("aria-pressed",String(train.dir<0));
      if(selected){
        for(const [element,id] of [[card.name,"trainName"],[card.img,"trainIcon"],[card.description,"trainDescription"],[card.route,"trainRoute"],[card.slider,"speed"],[card.output,"speedNumber"],[card.cars,"cars"],...Object.entries(card.commands).map(([id,element])=>[element,id])])element.id=id;
      }
    }
    for(const [id,selector] of selectors)if(!ids.includes(id)){selector.querySelector("img").onerror=null;selector.onclick=null;selector.remove();selectors.delete(id);}
    update();
  }
  function update() {
    if(disposed)return;
    for(const train of getTrains()) {
      const card=cards.get(train.id);if(!card)continue;
      const point=locomotivePoint(train);
      if(!point){card.point=null;card.marker.setAttribute("visibility","hidden");card.glow.setAttribute("visibility","hidden");}
      else if(!card.point||card.point.x!==point.x||card.point.z!==point.z){for(const marker of [card.marker,card.glow]){marker.setAttribute("visibility","visible");marker.setAttribute("cx",String(point.x));marker.setAttribute("cy",String(point.z));}card.point=point;}
      const velocity=Math.abs(train.velocity??0);setText(card.actual,`${velocity.toFixed(1)} layout/s`);card.gauge.value=velocity;card.needle.setAttribute("transform",`rotate(${-120+Math.min(1,velocity/150)*240} 50 50)`);
      setText(card.state,operatingState(train,isPaused()));card.state.title=card.state.textContent;
      card.root.classList.toggle('is-running',velocity>0.05);card.root.classList.toggle('is-stopped',velocity<=0.05);
    }
  }
  function reveal(id){const card=cards.get(id);if(card&&host.scrollWidth>host.clientWidth){const a=card.root.getBoundingClientRect(),b=host.getBoundingClientRect();if(a.left<b.left)host.scrollLeft+=a.left-b.left;else if(a.right>b.right)host.scrollLeft+=a.right-b.right;}}
  // Layout changes must reveal the real selection without selecting or commanding again.
  const revealSelection=()=>{if(!disposed)reveal(getSelected());};
  const resizeObserver=new ResizeObserver(revealSelection);
  // Viewport transitions may move a snapped scroll position without changing
  // this host's width (rotation, browser capture/zoom). Keep the real selection
  // visible in that case too, without selecting or commanding it again.
  window.addEventListener('resize',revealSelection);
  sync();resizeObserver.observe(host);
  return {sync,update,select(id){recent.select(id,getTrains().map((t)=>t.id));sync();reveal(id);},get visibleIds(){return getTrains().map(t=>t.id);},get recentIds(){return [...recent.recent];},dispose(){disposed=true;resizeObserver.disconnect();window.removeEventListener('resize',revealSelection);for(const card of cards.values()){releaseCard(card);}for(const selector of selectors.values()){selector.querySelector("img").onerror=null;selector.onclick=null;selector.remove();}definitions.remove();cards.clear();selectors.clear();}};
}
export {mountTrainDeck};
