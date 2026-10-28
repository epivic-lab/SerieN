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
    img.alt=img.dataset.fallback==="true"?`Miniatura di ${train.name} non disponibile`:`Locomotiva ${train.name}, vista a tre quarti`;
  }
  function prepareImage(img) {
    img.decoding="async";img.width=320;img.height=160;
    img.onerror=()=>{if(img.dataset.fallback!=="true"){img.dataset.fallback="true";img.src=THUMBNAIL_FALLBACK;img.alt="Miniatura del locomotore non disponibile";}};
  }
  function makeCard(train) {
    const root=document.createElement("article");root.className="trainConsole";root.dataset.consoleTrain=train.id;root.setAttribute("aria-label",`Consolle ${train.name}`);
    root.innerHTML=`<header class="trainConsoleHeading"><button type="button" class="trainConsoleSelect"><strong class="trainConsoleName"></strong></button><span class="trainConsoleState"></span></header><span class="trainConsoleDescription"></span><img class="locomotiveThumbnail" draggable="false"><button type="button" class="railwayMiniMap"><svg viewBox="${MAP_VIEWBOX}" preserveAspectRatio="xMidYMid meet" role="img"><use href="#${symbolId}"/><circle class="trainMapGlow" r="34"/><circle class="trainMapMarker" r="17"/></svg><span>Centra sul treno ↗</span></button><div class="trainConsoleSpeed"><label>Velocità <output></output><input type="range" min="0" max="100" step="1"></label></div><div class="trainConsoleCommands"><button type="button" data-command="reverse">⇄ <span>Direzione</span></button><button type="button" data-command="stop">■ <span>Arresta</span></button><button type="button" data-command="lights">☼ <span>Luci</span></button></div><footer class="trainConsoleCoupling"><span class="trainConsoleCars"></span><button type="button" data-command="uncouple">− Sgancia</button><button type="button" data-command="couple">+ Aggancia</button></footer><span class="trainConsoleRoute" hidden></span>`;
    const find=(s)=>root.querySelector(s),img=find("img"),slider=find("input"),map=find(".railwayMiniMap"),marker=find(".trainMapMarker"),glow=find(".trainMapGlow");
    prepareImage(img);
    const select=()=>onSelect(train.id);
    find(".trainConsoleSelect").onclick=select;
    img.onclick=select;
    slider.setAttribute("aria-label",`Velocità ${train.name}`);
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
      selector.classList.toggle("active",train.id===active);selector.setAttribute("aria-pressed",String(train.id===active));setThumbnail(selector.querySelector("img"),train);setText(selector.querySelector("strong"),train.name);setText(selector.querySelector("small"),train.mode==="loop"?`ANELLO ${train.loop+1}`:"FASCIO MERCI");
      const card=cards.get(train.id);if(!card)continue;
      const selected=train.id===active;
      card.root.classList.toggle("is-active",selected);card.root.setAttribute("aria-label",`Consolle ${train.name}`);
      setThumbnail(card.img,train);setText(card.name,train.name);setText(card.description,train.desc);setText(card.route,train.mode==="loop"?`ANELLO ${train.loop+1}`:network.edges[train.section]?.role?.startsWith("runaround")?"RUNAROUND LUNGO":"COMPARTO MERCI");
      card.map.setAttribute("aria-label",`Centra la camera su ${train.name}`);card.map.querySelector("svg").setAttribute("aria-label",`Posizione della locomotiva ${train.name} sul tracciato`);
      card.slider.setAttribute("aria-label",`Velocità ${train.name}`);
      if(Number(card.slider.value)!==train.speed)card.slider.value=String(train.speed);
      setText(card.output,`${train.speed}%`);setText(card.cars,`${train.cars} carri`);
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
