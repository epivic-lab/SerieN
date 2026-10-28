import {RecentConsoles,MAP_VIEWBOX,railwayMapPath,locomotivePoint,operatingState} from "./train-deck-state.js";
import {thumbnailKey,thumbnailURL,THUMBNAIL_FALLBACK} from "./locomotive-thumbnails.js";

let deckSequence=0;
function mountTrainDeck({host,tabs,network,getTrains,getSelected,isPaused,onSelect,onSpeed,onReverse,onStop,onLights,onUncouple,onCouple,onFocus}) {
  const recent=new RecentConsoles(3),cards=new Map(),selectors=new Map(),symbolId=`railway-miniature-${++deckSequence}`;
  const ns="http://www.w3.org/2000/svg",definitions=document.createElementNS(ns,"svg");
  definitions.classList.add("railwayDefinitions");definitions.setAttribute("aria-hidden","true");definitions.setAttribute("width","0");definitions.setAttribute("height","0");
  const defs=document.createElementNS(ns,"defs"),symbol=document.createElementNS(ns,"g"),path=document.createElementNS(ns,"path");
  symbol.id=symbolId;path.setAttribute("d",railwayMapPath(network));path.setAttribute("fill","none");path.setAttribute("stroke","#b9ccc1");path.setAttribute("stroke-width","5");path.setAttribute("stroke-linecap","round");path.setAttribute("stroke-linejoin","round");symbol.append(path);defs.append(symbol);definitions.append(defs);host.before(definitions);
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
    root.innerHTML=`<header class="trainConsoleHeading"><button type="button" class="trainConsoleSelect"><strong class="trainConsoleName"></strong><span class="trainConsoleDescription"></span></button><div class="trainConsoleStatus"><span class="trainConsoleState"></span><span class="trainConsoleCars"></span></div></header><div class="trainConsoleVisuals"><img class="locomotiveThumbnail" draggable="false"><button type="button" class="railwayMiniMap"><svg viewBox="${MAP_VIEWBOX}" preserveAspectRatio="xMidYMid meet" role="img"><use href="#${symbolId}"/><circle class="trainMapGlow" r="34"/><circle class="trainMapMarker" r="17"/></svg></button></div><div class="trainConsoleSpeed"><label><span>Speed</span><input type="range" min="0" max="100" step="1"><output></output></label></div><div class="trainConsoleCommands"><button type="button" data-command="reverse" title="Reverse direction" aria-label="Reverse direction">⇄ <span>Reverse</span></button><button type="button" data-command="stop" title="Stop this train" aria-label="Stop this train">■ <span>Stop</span></button><button type="button" data-command="lights" title="Toggle headlights" aria-label="Toggle headlights">☼ <span>Lights</span></button><button type="button" data-command="uncouple" title="Uncouple the last wagon" aria-label="Uncouple the last wagon"><svg viewBox="0 0 28 18" aria-hidden="true"><path d="M9 12H6a4 4 0 010-8h5m8 0h3a4 4 0 010 8h-5M10 8h8M11 16h6"/></svg><span>Uncouple</span></button><button type="button" data-command="couple" title="Couple the nearest wagon" aria-label="Couple the nearest wagon"><svg viewBox="0 0 28 18" aria-hidden="true"><path d="M9 12H6a4 4 0 010-8h5m8 0h3a4 4 0 010 8h-5M10 8h8M11 16h6m-3-3v6"/></svg><span>Couple</span></button></div><span class="trainConsoleRoute" hidden></span>`;
    const find=(s)=>root.querySelector(s),img=find("img"),slider=find("input"),map=find(".railwayMiniMap"),marker=find(".trainMapMarker"),glow=find(".trainMapGlow");
    prepareImage(img);
    const select=()=>onSelect(train.id);
    find(".trainConsoleSelect").onclick=select;
    img.onclick=select;
    slider.setAttribute("aria-label",`Speed of ${train.name}`);
    slider.onpointerdown=select;
    slider.oninput=()=>{const value=Number(slider.value);onSelect(train.id);onSpeed(train.id,value);};
    for(const [action,callback] of Object.entries({reverse:onReverse,stop:onStop,lights:onLights,uncouple:onUncouple,couple:onCouple}))find(`[data-command="${action}"]`).onclick=()=>{onSelect(train.id);callback(train.id);};
    map.onclick=()=>{onSelect(train.id);onFocus(train.id);};
    return {root,img,slider,map,marker,glow,name:find(".trainConsoleName"),state:find(".trainConsoleState"),output:find("output"),cars:find(".trainConsoleCars"),description:find(".trainConsoleDescription"),route:find(".trainConsoleRoute"),commands:Object.fromEntries([...root.querySelectorAll("[data-command]")].map((b)=>[b.dataset.command,b]))};
  }
  function sync() {
    if(disposed)return;
    const trains=getTrains(),active=getSelected(),ids=trains.map((t)=>t.id),visible=recent.sync(ids,active);
    host.style.setProperty("--console-count",String(Math.max(1,visible.length)));host.dataset.count=String(visible.length);
    // Clear active compatibility IDs before assigning them to another card.
    for(const card of cards.values())card.root.querySelectorAll("[id]").forEach((e)=>e.removeAttribute("id"));
    for(const [id,card] of cards)if(!visible.includes(id)){card.root.remove();card.img.onerror=null;cards.delete(id);}
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
      setThumbnail(card.img,train);setText(card.name,train.name);setText(card.description,train.desc);card.description.title=train.desc;setText(card.route,train.mode==="loop"?`LOOP ${train.loop+1}`:network.edges[train.section]?.role?.startsWith("runaround")?"RUNAROUND":"FREIGHT YARD");
      card.map.setAttribute("aria-label",`Focus camera on ${train.name}`);card.map.title=`Focus camera on ${train.name}`;card.map.querySelector("svg").setAttribute("aria-label",`Position of locomotive ${train.name} on the track plan`);
      card.slider.setAttribute("aria-label",`Speed of ${train.name}`);
      if(Number(card.slider.value)!==train.speed)card.slider.value=String(train.speed);
      setText(card.output,`${train.speed}%`);setText(card.cars,`${train.cars} ${train.cars===1?"wagon":"wagons"}`);
      card.commands.lights.classList.toggle("active",train.lights);card.commands.lights.setAttribute("aria-pressed",String(train.lights));
      card.commands.reverse.classList.toggle("active",train.dir<0);card.commands.reverse.setAttribute("aria-pressed",String(train.dir<0));
      if(selected){
        for(const [element,id] of [[card.name,"trainName"],[card.img,"trainIcon"],[card.description,"trainDescription"],[card.route,"trainRoute"],[card.slider,"speed"],[card.output,"speedNumber"],[card.cars,"cars"],...Object.entries(card.commands).map(([id,element])=>[element,id])])element.id=id;
      }
    }
    for(const [id,selector] of selectors)if(!ids.includes(id)){selector.querySelector("img").onerror=null;selector.remove();selectors.delete(id);}
    update();
  }
  function update() {
    if(disposed)return;
    for(const train of getTrains()) {
      const card=cards.get(train.id);if(!card)continue;
      const point=locomotivePoint(train);
      if(!point){card.point=null;card.marker.setAttribute("visibility","hidden");card.glow.setAttribute("visibility","hidden");}
      else if(!card.point||card.point.x!==point.x||card.point.z!==point.z){for(const marker of [card.marker,card.glow]){marker.setAttribute("visibility","visible");marker.setAttribute("cx",String(point.x));marker.setAttribute("cy",String(point.z));}card.point=point;}
      setText(card.state,operatingState(train,isPaused()));
    }
  }
  sync();
  return {sync,update,select(id){recent.select(id,getTrains().map((t)=>t.id));sync();const card=cards.get(id);if(card&&host.scrollWidth>host.clientWidth){const a=card.root.getBoundingClientRect(),b=host.getBoundingClientRect();if(a.left<b.left)host.scrollLeft+=a.left-b.left;else if(a.right>b.right)host.scrollLeft+=a.right-b.right;}},get visibleIds(){return [...recent.slots];},get recentIds(){return [...recent.recent];},dispose(){disposed=true;for(const card of cards.values()){card.img.onerror=null;card.root.remove();}for(const selector of selectors.values()){selector.querySelector("img").onerror=null;selector.remove();}definitions.remove();cards.clear();selectors.clear();}};
}
export {mountTrainDeck};
